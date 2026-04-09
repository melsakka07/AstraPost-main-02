/**
 * Integration tests for scheduleProcessor — schedule → publish flow.
 *
 * Focuses on observable side-effects:
 *   • posts table updated to "published" on success
 *   • jobRuns record inserted with status "completed"
 *   • posts table updated to "failed" when the X API rejects
 *   • Early exit (no X API call) when post is not in "scheduled" state
 *   • Correct reply chaining for multi-tweet threads
 *   • Throws on post-not-found so BullMQ records the failure
 *   • Throws on null xAccountId
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { scheduleProcessor } from "./processors";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
// vi.hoisted ensures these symbols are available before any module import.

const { mockDb, mockPostTweet, mockPostTweetReply, mockSetFn, mockInsertValuesFn } = vi.hoisted(
  () => {
    // Captured arg collectors — use vi.fn so .mock.calls is available.
    const mockSetFn = vi.fn(() => ({ where: vi.fn() }));
    const mockInsertValuesFn = vi.fn(() => ({ onConflictDoUpdate: vi.fn() }));

    // Fully-chainable select builder that simulates Drizzle's lazy-promise API.
    // Supports all the query builder methods called by gamification / analytics
    // helpers inside the processor's success path (from, where, orderBy, etc.).
    function makeSelectBuilder(result: unknown[] = [{ count: 0 }]) {
      const builder: Record<string, unknown> & { then: PromiseLike<unknown>["then"] } = {
        from: () => builder,
        where: () => builder,
        orderBy: () => builder,
        limit: () => builder,
        offset: () => builder,
        // Thenable: lets `await builder` work without wrapping in Promise.resolve().
        then: ((
          resolve?: ((value: unknown) => unknown) | null,
          reject?: ((reason: unknown) => unknown) | null
        ) =>
          Promise.resolve(result).then(
            resolve ?? undefined,
            reject ?? undefined
          )) as unknown as PromiseLike<unknown>["then"],
      };
      return builder;
    }
    const selectFn = vi.fn(() => makeSelectBuilder());

    const mockDb = {
      query: {
        posts: { findFirst: vi.fn() },
        user: { findFirst: vi.fn() },
      },
      select: selectFn,
      update: vi.fn(() => ({ set: mockSetFn })),
      insert: vi.fn(() => ({ values: mockInsertValuesFn })),
      transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(mockDb)),
    };

    const mockPostTweet = vi.fn();
    const mockPostTweetReply = vi.fn();

    return { mockDb, mockPostTweet, mockPostTweetReply, mockSetFn, mockInsertValuesFn };
  }
);

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/services/x-api", () => ({
  XApiService: {
    getClientForAccountId: vi.fn(async () => ({
      postTweet: mockPostTweet,
      postTweetReply: mockPostTweetReply,
      uploadMedia: vi.fn(),
    })),
  },
}));

vi.mock("bullmq", () => ({
  Queue: vi.fn(),
  Worker: vi.fn(function () {
    return { on: vi.fn() };
  }),
}));

vi.mock("ioredis", () => ({ default: vi.fn() }));

// Mock the queue client so scheduleQueue.add doesn't throw when the recurrence
// code path is reached (e.g. when recurrencePattern is set on the post).
vi.mock("@/lib/queue/client", () => ({
  scheduleQueue: { add: vi.fn().mockResolvedValue({}) },
  analyticsQueue: { add: vi.fn().mockResolvedValue({}) },
  connection: {},
  SCHEDULE_JOB_OPTIONS: {},
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeJob(
  overrides: Partial<{
    postId: string;
    userId: string;
    attempts: number;
    attemptsMade: number;
  }> = {}
) {
  return {
    id: "job-1",
    queueName: "schedule-queue",
    opts: { attempts: overrides.attempts ?? 5 },
    attemptsMade: overrides.attemptsMade ?? 0,
    data: {
      postId: overrides.postId ?? "post-1",
      userId: overrides.userId ?? "user-1",
    },
  };
}

function makePost(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "post-1",
    userId: "user-1",
    xAccountId: "acc-1",
    status: "scheduled",
    recurrencePattern: "none",
    recurrenceEndDate: null,
    linkedinAccountId: null,
    instagramAccountId: null,
    scheduledAt: new Date(),
    xAccount: null,
    tweets: [{ id: "tw-1", content: "Hello world", position: 1, media: [], xTweetId: null }],
    ...overrides,
  };
}

// Convenience: collect all values passed to .set() and .values() across the run.
function allSetValues() {
  return mockSetFn.mock.calls.map((c) => (c as unknown[])[0] as Record<string, unknown>);
}
function allInsertValues() {
  return mockInsertValuesFn.mock.calls.map((c) => (c as unknown[])[0] as Record<string, unknown>);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("scheduleProcessor — integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore chainable mock implementations after clearAllMocks resets them.
    mockDb.update.mockImplementation(() => ({ set: mockSetFn }));
    mockDb.insert.mockImplementation(() => ({ values: mockInsertValuesFn }));
    mockSetFn.mockImplementation(() => ({ where: vi.fn() }));
    mockInsertValuesFn.mockImplementation(() => ({ onConflictDoUpdate: vi.fn() }));
    mockDb.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(mockDb));
    // Restore the fully-chainable select builder for gamification helpers.
    function makeSelectBuilder(result: unknown[] = [{ count: 0 }]) {
      const builder: Record<string, unknown> & { then: PromiseLike<unknown>["then"] } = {
        from: () => builder,
        where: () => builder,
        orderBy: () => builder,
        limit: () => builder,
        offset: () => builder,
        then: ((
          resolve?: ((value: unknown) => unknown) | null,
          reject?: ((reason: unknown) => unknown) | null
        ) =>
          Promise.resolve(result).then(
            resolve ?? undefined,
            reject ?? undefined
          )) as unknown as PromiseLike<unknown>["then"],
      };
      return builder;
    }
    mockDb.select.mockImplementation(() => makeSelectBuilder());
    mockDb.query.user.findFirst.mockResolvedValue({ id: "user-1" });
  });

  // ── Happy path ──────────────────────────────────────────────────────────

  it("sets post status to 'published' after successful tweet", async () => {
    mockDb.query.posts.findFirst.mockResolvedValue(makePost());
    mockPostTweet.mockResolvedValue({ data: { id: "x-tweet-1" } });

    await scheduleProcessor(makeJob() as any);

    const publishedUpdate = allSetValues().find((v) => v.status === "published");
    expect(publishedUpdate).toBeDefined();
  });

  it("inserts a jobRuns 'running' record and then updates it to 'success'", async () => {
    mockDb.query.posts.findFirst.mockResolvedValue(makePost());
    mockPostTweet.mockResolvedValue({ data: { id: "x-tweet-1" } });

    await scheduleProcessor(makeJob() as any);

    // The processor inserts a jobRun as "running" at the start …
    const jobRunInsert = allInsertValues().find((v) => v.status === "running");
    expect(jobRunInsert).toBeDefined();
    expect(jobRunInsert?.postId).toBe("post-1");

    // … then updates it to "success" once publishing completes.
    const jobRunSuccess = allSetValues().find((v) => v.status === "success");
    expect(jobRunSuccess).toBeDefined();
  });

  it("publishes all tweets in a thread with correct reply chaining", async () => {
    mockDb.query.posts.findFirst.mockResolvedValue(
      makePost({
        tweets: [
          { id: "tw-1", content: "First", position: 1, media: [], xTweetId: null },
          { id: "tw-2", content: "Second", position: 2, media: [], xTweetId: null },
          { id: "tw-3", content: "Third", position: 3, media: [], xTweetId: null },
        ],
      })
    );
    mockPostTweet.mockResolvedValue({ data: { id: "x-1" } });
    mockPostTweetReply.mockResolvedValue({ data: { id: "x-2" } });

    await scheduleProcessor(makeJob() as any);

    expect(mockPostTweet).toHaveBeenCalledWith("First", []);
    expect(mockPostTweetReply).toHaveBeenNthCalledWith(1, "Second", "x-1", []);
    expect(mockPostTweetReply).toHaveBeenNthCalledWith(2, "Third", "x-2", []);
  });

  // ── Failure path ────────────────────────────────────────────────────────

  it("sets post status to 'failed' when the X API rejects", async () => {
    mockDb.query.posts.findFirst.mockResolvedValue(makePost());
    mockPostTweet.mockRejectedValue(new Error("403 Forbidden"));

    await expect(
      scheduleProcessor(makeJob({ attempts: 1, attemptsMade: 0 }) as any)
    ).rejects.toThrow();

    const failedUpdate = allSetValues().find((v) => v.status === "failed");
    expect(failedUpdate).toBeDefined();
  });

  it("inserts a jobRuns record with status 'failed' on X API error", async () => {
    mockDb.query.posts.findFirst.mockResolvedValue(makePost());
    mockPostTweet.mockRejectedValue(new Error("429 Too Many Requests"));

    await expect(
      scheduleProcessor(makeJob({ attempts: 1, attemptsMade: 0 }) as any)
    ).rejects.toThrow();

    const jobRunInsert = allInsertValues().find((v) => v.status === "failed");
    expect(jobRunInsert).toBeDefined();
  });

  // ── Guard conditions ────────────────────────────────────────────────────

  it("exits without calling the X API when post is not in 'scheduled' status", async () => {
    mockDb.query.posts.findFirst.mockResolvedValue(makePost({ status: "draft" }));

    await scheduleProcessor(makeJob() as any);

    expect(mockPostTweet).not.toHaveBeenCalled();
  });

  it("throws when the post is not found (so BullMQ records the failure)", async () => {
    mockDb.query.posts.findFirst.mockResolvedValue(undefined);

    await expect(scheduleProcessor(makeJob() as any)).rejects.toThrow();
    expect(mockPostTweet).not.toHaveBeenCalled();
  });

  it("throws when xAccountId is null", async () => {
    mockDb.query.posts.findFirst.mockResolvedValue(makePost({ xAccountId: null }));

    await expect(scheduleProcessor(makeJob() as any)).rejects.toThrow();
    expect(mockPostTweet).not.toHaveBeenCalled();
  });

  // ── Permanent-failure (all retries exhausted) ────────────────────────────

  it("sets post status to 'failed' (not 'scheduled') on the final retry attempt", async () => {
    // attempts=3, attemptsMade=2 → this is attempt 3 of 3 → isFinalAttempt = true
    mockDb.query.posts.findFirst.mockResolvedValue(makePost());
    mockPostTweet.mockRejectedValue(new Error("X API permanently unavailable"));

    await expect(
      scheduleProcessor(makeJob({ attempts: 3, attemptsMade: 2 }) as any)
    ).rejects.toThrow();

    const setValues = allSetValues();
    const failedUpdate = setValues.find((v) => v.status === "failed");
    expect(failedUpdate).toBeDefined();
    // Must NOT be set back to "scheduled" on a final attempt.
    const scheduledUpdate = setValues.find((v) => v.status === "scheduled");
    expect(scheduledUpdate).toBeUndefined();
  });

  it("keeps post status as 'scheduled' on a non-final retry attempt", async () => {
    // attempts=5, attemptsMade=1 → attempt 2 of 5 → isFinalAttempt = false
    mockDb.query.posts.findFirst.mockResolvedValue(makePost());
    mockPostTweet.mockRejectedValue(new Error("X API transient error"));

    await expect(
      scheduleProcessor(makeJob({ attempts: 5, attemptsMade: 1 }) as any)
    ).rejects.toThrow();

    const setValues = allSetValues();
    const scheduledUpdate = setValues.find((v) => v.status === "scheduled");
    expect(scheduledUpdate).toBeDefined();
    // Must NOT flip to permanently failed on a retryable attempt.
    const failedUpdate = setValues.find((v) => v.status === "failed");
    expect(failedUpdate).toBeUndefined();
  });

  it("inserts a jobRuns record with status 'retrying' on a non-final attempt", async () => {
    mockDb.query.posts.findFirst.mockResolvedValue(makePost());
    mockPostTweet.mockRejectedValue(new Error("Temporary failure"));

    await expect(
      scheduleProcessor(makeJob({ attempts: 5, attemptsMade: 0 }) as any)
    ).rejects.toThrow();

    const insertedValues = allInsertValues();
    const retryingRecord = insertedValues.find((v) => v.status === "retrying");
    expect(retryingRecord).toBeDefined();
  });

  it("inserts a notification on the final failed attempt", async () => {
    mockDb.query.posts.findFirst.mockResolvedValue(makePost());
    mockDb.query.user.findFirst.mockResolvedValue({ email: "user@example.com" });
    mockPostTweet.mockRejectedValue(new Error("Permanent X API error"));

    await expect(
      scheduleProcessor(makeJob({ attempts: 1, attemptsMade: 0 }) as any)
    ).rejects.toThrow();

    const insertedValues = allInsertValues();
    const notificationRecord = insertedValues.find((v) => v.type === "post_failed");
    expect(notificationRecord).toBeDefined();
    expect(notificationRecord?.title).toBe("Post Publishing Failed");
  });

  it("does NOT insert a notification on a non-final retry attempt", async () => {
    mockDb.query.posts.findFirst.mockResolvedValue(makePost());
    mockPostTweet.mockRejectedValue(new Error("Transient failure"));

    await expect(
      scheduleProcessor(makeJob({ attempts: 5, attemptsMade: 0 }) as any)
    ).rejects.toThrow();

    const insertedValues = allInsertValues();
    const notificationRecord = insertedValues.find((v) => v.type === "post_failed");
    expect(notificationRecord).toBeUndefined();
  });

  it("deactivates account and pauses post on X 401 errors (no throw when no token)", async () => {
    mockDb.query.posts.findFirst.mockResolvedValue(makePost());
    const authError = Object.assign(new Error("Unauthorized"), { code: 401 });
    mockPostTweet.mockRejectedValue(authError);

    // 401 with no job.token → graceful return, NOT a throw.
    // The processor sets the account inactive and the post to paused_needs_reconnect,
    // then returns instead of throwing (DelayedError path requires job.token).
    await scheduleProcessor(makeJob({ attempts: 1, attemptsMade: 0 }) as any);

    const setValues = allSetValues();
    // X account must be deactivated
    expect(setValues.some((v) => v.isActive === false)).toBe(true);
    // Post must NOT be marked "failed" — it is paused pending reconnection
    expect(setValues.some((v) => v.status === "failed")).toBe(false);
  });

  it("skips already-published tweets (idempotency on retry)", async () => {
    // The second tweet already has an xTweetId — simulate a retry where the
    // first tweet was published but the process crashed before updating the DB.
    mockDb.query.posts.findFirst.mockResolvedValue(
      makePost({
        tweets: [
          {
            id: "tw-1",
            content: "Already posted",
            position: 1,
            media: [],
            xTweetId: "existing-x-id",
          },
          { id: "tw-2", content: "New tweet", position: 2, media: [], xTweetId: null },
        ],
      })
    );
    mockPostTweetReply.mockResolvedValue({ data: { id: "new-x-id" } });

    await scheduleProcessor(makeJob() as any);

    // postTweet must NOT be called because tw-1 already has an xTweetId.
    expect(mockPostTweet).not.toHaveBeenCalled();
    // postTweetReply IS called for tw-2, replying to the existing x tweet.
    expect(mockPostTweetReply).toHaveBeenCalledWith("New tweet", "existing-x-id", []);
  });

  // ── Pre-publish tier verification ────────────────────────────────────────

  it("fails with TIER_LIMIT_EXCEEDED when Free tier account has content > 280 chars", async () => {
    const longContent = "a".repeat(300);
    mockDb.query.posts.findFirst.mockResolvedValue(
      makePost({
        tweets: [{ id: "tw-1", content: longContent, position: 1, media: [], xTweetId: null }],
        xAccount: { xSubscriptionTier: "None", xUsername: "freeuser" },
      })
    );

    await expect(
      scheduleProcessor(makeJob({ attempts: 1, attemptsMade: 0 }) as any)
    ).rejects.toThrow();

    const setValues = allSetValues();
    const failedUpdate = setValues.find((v) => v.status === "failed");
    expect(failedUpdate).toBeDefined();
    expect(failedUpdate?.failReason).toContain("280 characters");

    const insertedValues = allInsertValues();
    const notificationRecord = insertedValues.find((v) => v.type === "post_failed");
    expect(notificationRecord).toBeDefined();
    expect(notificationRecord?.title).toBe("Post Too Long for X Account");

    expect(mockPostTweet).not.toHaveBeenCalled();
  });

  it("fails with TIER_LIMIT_EXCEEDED when Premium tier account has content > 2000 chars", async () => {
    const longContent = "a".repeat(2100);
    mockDb.query.posts.findFirst.mockResolvedValue(
      makePost({
        tweets: [{ id: "tw-1", content: longContent, position: 1, media: [], xTweetId: null }],
        xAccount: { xSubscriptionTier: "Premium", xUsername: "premiumuser" },
      })
    );

    await expect(
      scheduleProcessor(makeJob({ attempts: 1, attemptsMade: 0 }) as any)
    ).rejects.toThrow();

    const setValues = allSetValues();
    const failedUpdate = setValues.find((v) => v.status === "failed");
    expect(failedUpdate).toBeDefined();
    expect(failedUpdate?.failReason).toContain("2,000 characters");

    expect(mockPostTweet).not.toHaveBeenCalled();
  });

  it("allows Premium tier account to post content between 281-2000 chars", async () => {
    const mediumContent = "a".repeat(500);
    mockDb.query.posts.findFirst.mockResolvedValue(
      makePost({
        tweets: [{ id: "tw-1", content: mediumContent, position: 1, media: [], xTweetId: null }],
        xAccount: { xSubscriptionTier: "Premium", xUsername: "premiumuser" },
      })
    );
    mockPostTweet.mockResolvedValue({ data: { id: "x-tweet-1" } });

    await scheduleProcessor(makeJob() as any);

    expect(mockPostTweet).toHaveBeenCalledWith(mediumContent, []);

    const setValues = allSetValues();
    const publishedUpdate = setValues.find((v) => v.status === "published");
    expect(publishedUpdate).toBeDefined();
  });

  it("allows Free tier account to post content <= 280 chars", async () => {
    const shortContent = "a".repeat(280);
    mockDb.query.posts.findFirst.mockResolvedValue(
      makePost({
        tweets: [{ id: "tw-1", content: shortContent, position: 1, media: [], xTweetId: null }],
        xAccount: { xSubscriptionTier: "None", xUsername: "freeuser" },
      })
    );
    mockPostTweet.mockResolvedValue({ data: { id: "x-tweet-1" } });

    await scheduleProcessor(makeJob() as any);

    expect(mockPostTweet).toHaveBeenCalledWith(shortContent, []);

    const setValues = allSetValues();
    const publishedUpdate = setValues.find((v) => v.status === "published");
    expect(publishedUpdate).toBeDefined();
  });

  it("allows Basic tier account to post long content", async () => {
    const longContent = "a".repeat(1500);
    mockDb.query.posts.findFirst.mockResolvedValue(
      makePost({
        tweets: [{ id: "tw-1", content: longContent, position: 1, media: [], xTweetId: null }],
        xAccount: { xSubscriptionTier: "Basic", xUsername: "basicuser" },
      })
    );
    mockPostTweet.mockResolvedValue({ data: { id: "x-tweet-1" } });

    await scheduleProcessor(makeJob() as any);

    expect(mockPostTweet).toHaveBeenCalledWith(longContent, []);

    const setValues = allSetValues();
    const publishedUpdate = setValues.find((v) => v.status === "published");
    expect(publishedUpdate).toBeDefined();
  });

  it("handles null tier as Free tier (280 char limit)", async () => {
    const longContent = "a".repeat(300);
    mockDb.query.posts.findFirst.mockResolvedValue(
      makePost({
        tweets: [{ id: "tw-1", content: longContent, position: 1, media: [], xTweetId: null }],
        xAccount: { xSubscriptionTier: null, xUsername: "unknownuser" },
      })
    );

    await expect(
      scheduleProcessor(makeJob({ attempts: 1, attemptsMade: 0 }) as any)
    ).rejects.toThrow();

    const setValues = allSetValues();
    const failedUpdate = setValues.find((v) => v.status === "failed");
    expect(failedUpdate).toBeDefined();
    expect(failedUpdate?.failReason).toContain("280 characters");

    expect(mockPostTweet).not.toHaveBeenCalled();
  });
});
