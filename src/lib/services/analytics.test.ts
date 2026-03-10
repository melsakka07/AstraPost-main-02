import { describe, expect, it, vi, beforeEach } from "vitest";
import { updateTweetMetrics } from "./analytics";

const { mockFindMany, mockGetTweetsPublicMetrics, mockGetClientForAccountId } = vi.hoisted(() => {
  const mockFindMany = vi.fn();
  const mockGetTweetsPublicMetrics = vi.fn(async () => []);
  const mockGetClientForAccountId = vi.fn(async () => ({
    getTweetsPublicMetrics: mockGetTweetsPublicMetrics,
  }));
  return { mockFindMany, mockGetTweetsPublicMetrics, mockGetClientForAccountId };
});

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      tweets: {
        findMany: mockFindMany,
      },
    },
    transaction: vi.fn(),
  },
}));

vi.mock("@/lib/services/x-api", () => ({
  XApiService: {
    getClientForAccountId: mockGetClientForAccountId,
  },
}));

describe("analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scopes tweet metrics refresh by accountIds", async () => {
    const now = new Date();
    mockFindMany.mockResolvedValue([
      {
        id: "t1",
        xTweetId: "x1",
        createdAt: now,
        post: { status: "published", xAccountId: "acc1", xAccount: { id: "acc1" } },
      },
      {
        id: "t2",
        xTweetId: "x2",
        createdAt: now,
        post: { status: "published", xAccountId: "acc2", xAccount: { id: "acc2" } },
      },
    ]);

    await updateTweetMetrics({ accountIds: ["acc1"] });

    expect(mockGetClientForAccountId).toHaveBeenCalledTimes(1);
    expect(mockGetClientForAccountId).toHaveBeenCalledWith("acc1");
    expect(mockGetTweetsPublicMetrics).toHaveBeenCalledWith(["x1"]);
  });
});
