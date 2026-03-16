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

const { mockDb, mockPostTweet, mockPostTweetReply, mockSetFn, mockInsertValuesFn } =
  vi.hoisted(() => {
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
        then: (
          resolve?: ((value: unknown) => unknown) | null,
          reject?: ((reason: unknown) => unknown) | null,
        ) => Promise.resolve(result).then(resolve ?? undefined, reject ?? undefined),
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
  });

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
  }> = {},
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
    tweets: [
      { id: "tw-1", content: "Hello world", position: 1, media: [], xTweetId: null },
    ],
    ...overrides,
  };
}

// Convenience: collect all values passed to .set() and .values() across the run.
function allSetValues() {
  return mockSetFn.mock.calls.map((c) => c[0] as Record<string, unknown>);
}
function allInsertValues() {
  return mockInsertValuesFn.mock.calls.map((c) => c[0] as Record<string, unknown>);
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
    mockDb.transaction.mockImplementation(
      async (fn: (tx: unknown) => unknown) => fn(mockDb),
    );
    // Restore the fully-chainable select builder for gamification helpers.
    function makeSelectBuilder(result: unknown[] = [{ count: 0 }]) {
      const builder: Record<string, unknown> & { then: PromiseLike<unknown>["then"] } = {
        from: () => builder,
        where: () => builder,
        orderBy: () => builder,
        limit: () => builder,
        offset: () => builder,
        then: (
          resolve?: ((value: unknown) => unknown) | null,
          reject?: ((reason: unknown) => unknown) | null,
        ) => Promise.resolve(result).then(resolve ?? undefined, reject ?? undefined),
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
      }),
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
      scheduleProcessor(makeJob({ attempts: 1, attemptsMade: 0 }) as any),
    ).rejects.toThrow();

    const failedUpdate = allSetValues().find((v) => v.status === "failed");
    expect(failedUpdate).toBeDefined();
  });

  it("inserts a jobRuns record with status 'failed' on X API error", async () => {
    mockDb.query.posts.findFirst.mockResolvedValue(makePost());
    mockPostTweet.mockRejectedValue(new Error("429 Too Many Requests"));

    await expect(
      scheduleProcessor(makeJob({ attempts: 1, attemptsMade: 0 }) as any),
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
    mockDb.query.posts.findFirst.mockResolvedValue(
      makePost({ xAccountId: null }),
    );

    await expect(scheduleProcessor(makeJob() as any)).rejects.toThrow();
    expect(mockPostTweet).not.toHaveBeenCalled();
  });
});
