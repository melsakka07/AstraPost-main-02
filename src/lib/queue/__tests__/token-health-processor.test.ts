import { Job } from "bullmq";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { tokenHealthProcessor } from "../processors";

process.env.POSTGRES_URL = "postgres://fake";

const { mockDbQueryXAccountsFindMany, mockDbInsertFn } = vi.hoisted(() => {
  const mockDbQueryXAccountsFindMany = vi.fn();
  const mockDbInsertFn = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));

  return {
    mockDbQueryXAccountsFindMany,
    mockDbInsertFn,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      xAccounts: { findMany: mockDbQueryXAccountsFindMany },
    },
    insert: mockDbInsertFn,
  },
}));

describe("tokenHealthProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when no tokens are expiring", async () => {
    mockDbQueryXAccountsFindMany.mockResolvedValue([]);

    const job = {
      id: "job-123",
      queueName: "token-health-queue",
      data: { correlationId: "corr-123" },
    } as unknown as Job;

    await tokenHealthProcessor(job);

    expect(mockDbQueryXAccountsFindMany).toHaveBeenCalled();
    expect(mockDbInsertFn).not.toHaveBeenCalled();
  });

  it("creates notifications for expiring tokens", async () => {
    // Mock an account expiring in ~24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    mockDbQueryXAccountsFindMany.mockResolvedValue([
      {
        id: "acc-123",
        userId: "user-123",
        xUsername: "testuser",
        tokenExpiresAt: expiresAt,
      },
    ]);

    const job = {
      id: "job-123",
      queueName: "token-health-queue",
      data: { correlationId: "corr-123" },
    } as unknown as Job;

    await tokenHealthProcessor(job);

    expect(mockDbQueryXAccountsFindMany).toHaveBeenCalled();
    expect(mockDbInsertFn).toHaveBeenCalledTimes(1);

    // Check if the insert was called with the correct notification payload shape
    const mockInsertCalls = (mockDbInsertFn as any).mock.results[0].value.values.mock.calls;
    const notificationPayload = mockInsertCalls[0][0];

    expect(notificationPayload.userId).toBe("user-123");
    expect(notificationPayload.type).toBe("token_expiring_soon");
    expect(notificationPayload.message).toContain("@testuser");
    expect(notificationPayload.metadata.xAccountId).toBe("acc-123");
    expect(notificationPayload.metadata.hoursUntilExpiry).toBeCloseTo(24, -1);
  });

  it("continues processing if one notification insert fails", async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    mockDbQueryXAccountsFindMany.mockResolvedValue([
      { id: "acc-1", userId: "user-1", xUsername: "user1", tokenExpiresAt: expiresAt },
      { id: "acc-2", userId: "user-2", xUsername: "user2", tokenExpiresAt: expiresAt },
    ]);

    // Make the first insert throw an error, but the second succeed
    const mockValues = vi
      .fn()
      .mockRejectedValueOnce(new Error("DB Error"))
      .mockResolvedValueOnce(undefined);

    mockDbInsertFn.mockReturnValue({ values: mockValues });

    const job = {
      id: "job-123",
      queueName: "token-health-queue",
      data: { correlationId: "corr-123" },
    } as unknown as Job;

    await tokenHealthProcessor(job);

    // Both should have been attempted
    expect(mockValues).toHaveBeenCalledTimes(2);
  });
});
