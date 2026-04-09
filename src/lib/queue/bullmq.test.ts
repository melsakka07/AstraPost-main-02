import { describe, it, expect, vi, beforeEach } from "vitest";
import { scheduleProcessor } from "./processors";

// Use vi.hoisted to define mocks before vi.mock calls
const { mockDb, mockPostTweet, mockPostTweetReply, mockUploadMedia } = vi.hoisted(() => {
  // Chainable select builder that supports .from().where().orderBy().limit() etc.
  // Used by gamification helpers (checkMilestone) and quota checks inside the processor.
  function makeSelectBuilder(result: unknown[] = [{ count: 0 }]) {
    const builder: Record<string, unknown> & { then: PromiseLike<unknown>["then"] } = {
      from: () => builder,
      where: () => builder,
      orderBy: () => builder,
      limit: () => builder,
      offset: () => builder,
      then: ((
        resolve?: ((v: unknown) => unknown) | null,
        reject?: ((r: unknown) => unknown) | null
      ) =>
        Promise.resolve(result).then(
          resolve ?? undefined,
          reject ?? undefined
        )) as unknown as PromiseLike<unknown>["then"],
    };
    return builder;
  }

  const mockDb = {
    query: {
      posts: {
        findFirst: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => makeSelectBuilder()),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockDb)),
  };

  const mockPostTweet = vi.fn();
  const mockPostTweetReply = vi.fn();
  const mockUploadMedia = vi.fn();

  return { mockDb, mockPostTweet, mockPostTweetReply, mockUploadMedia };
});

// Mock dependencies
vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

vi.mock("@/lib/services/x-api", () => {
  return {
    XApiService: {
      getClientForAccountId: vi.fn(async () => ({
        postTweet: mockPostTweet,
        postTweetReply: mockPostTweetReply,
        uploadMedia: mockUploadMedia,
      })),
    },
  };
});

// Mock BullMQ and IORedis
vi.mock("bullmq", () => ({
  Queue: vi.fn(),
  Worker: vi.fn(function () {
    return { on: vi.fn() };
  }),
}));

vi.mock("ioredis", () => {
  return {
    default: vi.fn(),
  };
});

describe("Schedule Processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process a single scheduled tweet", async () => {
    const job = {
      id: "job1",
      queueName: "schedule-queue",
      opts: { attempts: 5 },
      attemptsMade: 0,
      data: { postId: "post1", userId: "user1" },
    };

    const mockPost = {
      id: "post1",
      userId: "user1",
      xAccountId: "acc1",
      status: "scheduled",
      xAccount: {
        accessToken: "token",
        refreshToken: "refresh",
      },
      tweets: [{ id: "tweetRow1", content: "Hello World", position: 1, media: [], xTweetId: null }],
    };

    mockDb.query.posts.findFirst.mockResolvedValue(mockPost);
    mockPostTweet.mockResolvedValue({ data: { id: "tweet1" } });

    await scheduleProcessor(job as any);

    expect(mockDb.query.posts.findFirst).toHaveBeenCalledWith(expect.anything());
    expect(mockPostTweet).toHaveBeenCalledWith("Hello World", []);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("should process a thread", async () => {
    const job = {
      id: "job2",
      queueName: "schedule-queue",
      opts: { attempts: 5 },
      attemptsMade: 0,
      data: { postId: "post2", userId: "user1" },
    };

    const mockPost = {
      id: "post2",
      userId: "user1",
      xAccountId: "acc1",
      status: "scheduled",
      xAccount: {
        accessToken: "token",
        refreshToken: "refresh",
      },
      tweets: [
        { id: "tweetRow1", content: "Tweet 1", position: 1, media: [], xTweetId: null },
        { id: "tweetRow2", content: "Tweet 2", position: 2, media: [], xTweetId: null },
      ],
    };

    mockDb.query.posts.findFirst.mockResolvedValue(mockPost);
    mockPostTweet.mockResolvedValue({ data: { id: "t1" } });
    mockPostTweetReply.mockResolvedValue({ data: { id: "t2" } });

    await scheduleProcessor(job as any);

    expect(mockPostTweet).toHaveBeenCalledWith("Tweet 1", []);
    expect(mockPostTweetReply).toHaveBeenCalledWith("Tweet 2", "t1", []);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("should skip if post is not scheduled", async () => {
    const job = {
      id: "job3",
      queueName: "schedule-queue",
      opts: { attempts: 5 },
      attemptsMade: 0,
      data: { postId: "post3", userId: "user1" },
    };

    const mockPost = {
      id: "post3",
      status: "draft", // Not scheduled
    };

    mockDb.query.posts.findFirst.mockResolvedValue(mockPost);

    await scheduleProcessor(job as any);

    expect(mockPostTweet).not.toHaveBeenCalled();
    expect(mockPostTweetReply).not.toHaveBeenCalled();
  });

  it("should handle errors and update status to failed", async () => {
    const job = {
      id: "job4",
      queueName: "schedule-queue",
      opts: { attempts: 2 },
      attemptsMade: 1,
      data: { postId: "post4", userId: "user1" },
    };

    const mockPost = {
      id: "post4",
      userId: "user1",
      xAccountId: "acc1",
      status: "scheduled",
      xAccount: { accessToken: "token" },
      tweets: [{ id: "tweetRow1", content: "Fail", media: [], xTweetId: null }],
    };

    mockDb.query.posts.findFirst.mockResolvedValue(mockPost);
    mockPostTweet.mockRejectedValue(new Error("API Error"));

    await expect(scheduleProcessor(job as any)).rejects.toThrow("API Error");

    expect(mockDb.update).toHaveBeenCalled(); // Should update status to failed
  });
});
