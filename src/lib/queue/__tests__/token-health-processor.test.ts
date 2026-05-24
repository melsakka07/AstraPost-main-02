import { Job } from "bullmq";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { tokenHealthProcessor } from "../processors";

process.env.POSTGRES_URL = "postgres://fake";

const {
  mockDbQueryXAccountsFindMany,
  mockDbInsertFn,
  mockDbSelectFn,
  mockDbUpdateSet,
  mockDbUpdateWhere,
  mockDbUpdateFn,
  mockSendTokenExpiringEmail,
} = vi.hoisted(() => {
  const mockDbQueryXAccountsFindMany = vi.fn();
  const mockDbInsertFn = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));
  const mockDbSelectFn = vi.fn();
  const mockDbUpdateWhere = vi.fn().mockResolvedValue(undefined);
  const mockDbUpdateSet = vi.fn(() => ({ where: mockDbUpdateWhere }));
  const mockDbUpdateFn = vi.fn(() => ({ set: mockDbUpdateSet }));
  const mockSendTokenExpiringEmail = vi.fn().mockResolvedValue(undefined);
  return {
    mockDbQueryXAccountsFindMany,
    mockDbInsertFn,
    mockDbSelectFn,
    mockDbUpdateSet,
    mockDbUpdateWhere,
    mockDbUpdateFn,
    mockSendTokenExpiringEmail,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      xAccounts: { findMany: mockDbQueryXAccountsFindMany },
    },
    insert: mockDbInsertFn,
    select: mockDbSelectFn,
    update: mockDbUpdateFn,
  },
}));

vi.mock("@/lib/services/email", () => ({
  sendTokenExpiringEmail: mockSendTokenExpiringEmail,
  sendAccountDeactivatedEmail: vi.fn().mockResolvedValue(undefined),
  sendPostFailureEmail: vi.fn().mockResolvedValue(undefined),
}));

function chainSelectFor({
  userEmail,
  userLanguage,
  atRiskCount,
  atRiskNext,
}: {
  userEmail: string;
  userLanguage: string;
  atRiskCount: number;
  atRiskNext: Date | null;
}) {
  // First select call: user lookup → returns [{ email, language }]
  // Second select call: at-risk posts aggregate → returns [{ c, next }]
  const userChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ email: userEmail, language: userLanguage }]),
  };
  const postsChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ c: atRiskCount, next: atRiskNext }]),
  };
  mockDbSelectFn.mockReturnValueOnce(userChain).mockReturnValueOnce(postsChain);
}

describe("tokenHealthProcessor — refresh-failure-based trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbInsertFn.mockImplementation(() => ({ values: vi.fn().mockResolvedValue(undefined) }));
    mockDbUpdateWhere.mockResolvedValue(undefined);
    mockSendTokenExpiringEmail.mockResolvedValue(undefined);
  });

  const job = {
    id: "job-123",
    queueName: "token-health-queue",
    data: { correlationId: "corr-123" },
  } as unknown as Job;

  it("does nothing when no candidates", async () => {
    mockDbQueryXAccountsFindMany.mockResolvedValue([]);
    await tokenHealthProcessor(job);
    expect(mockDbQueryXAccountsFindMany).toHaveBeenCalled();
    expect(mockSendTokenExpiringEmail).not.toHaveBeenCalled();
    expect(mockDbInsertFn).not.toHaveBeenCalled();
  });

  it("fires level-1 email when consecutiveRefreshFailures === 1 (first failure)", async () => {
    mockDbQueryXAccountsFindMany.mockResolvedValue([
      {
        id: "acc-1",
        userId: "user-1",
        xUsername: "alice",
        consecutiveRefreshFailures: 1,
        lastNotifiedFailureCount: null,
      },
    ]);
    chainSelectFor({
      userEmail: "alice@example.com",
      userLanguage: "en",
      atRiskCount: 3,
      atRiskNext: new Date("2026-06-01T10:00:00Z"),
    });

    await tokenHealthProcessor(job);

    expect(mockSendTokenExpiringEmail).toHaveBeenCalledTimes(1);
    const call = mockSendTokenExpiringEmail.mock.calls[0]!;
    const [to, xUsername, level, atRiskPosts, locale] = call;
    expect(to).toBe("alice@example.com");
    expect(xUsername).toBe("alice");
    expect(level).toBe(1);
    expect(atRiskPosts.count).toBe(3);
    expect(locale).toBe("en");

    // De-dup update: lastNotifiedFailureCount = 1
    expect(mockDbUpdateFn).toHaveBeenCalled();
    expect(mockDbUpdateSet).toHaveBeenCalledWith({ lastNotifiedFailureCount: 1 });
  });

  it("fires level-2 email when consecutiveRefreshFailures >= 3", async () => {
    mockDbQueryXAccountsFindMany.mockResolvedValue([
      {
        id: "acc-1",
        userId: "user-1",
        xUsername: "bob",
        consecutiveRefreshFailures: 4,
        lastNotifiedFailureCount: 1,
      },
    ]);
    chainSelectFor({
      userEmail: "bob@example.com",
      userLanguage: "ar",
      atRiskCount: 0,
      atRiskNext: null,
    });

    await tokenHealthProcessor(job);

    expect(mockSendTokenExpiringEmail).toHaveBeenCalledTimes(1);
    const call = mockSendTokenExpiringEmail.mock.calls[0]!;
    const [, , level, , locale] = call;
    expect(level).toBe(2);
    expect(locale).toBe("ar");
    expect(mockDbUpdateSet).toHaveBeenCalledWith({ lastNotifiedFailureCount: 4 });
  });

  it("skips count===2 (breathing-room gap)", async () => {
    mockDbQueryXAccountsFindMany.mockResolvedValue([
      {
        id: "acc-1",
        userId: "user-1",
        xUsername: "carol",
        consecutiveRefreshFailures: 2,
        lastNotifiedFailureCount: 1,
      },
    ]);

    await tokenHealthProcessor(job);

    expect(mockSendTokenExpiringEmail).not.toHaveBeenCalled();
    expect(mockDbInsertFn).not.toHaveBeenCalled();
    // No update either — de-dup state preserved so when count escalates to 3 we still fire.
    expect(mockDbUpdateSet).not.toHaveBeenCalled();
  });

  it("does not update lastNotifiedFailureCount when email send throws", async () => {
    mockDbQueryXAccountsFindMany.mockResolvedValue([
      {
        id: "acc-1",
        userId: "user-1",
        xUsername: "dave",
        consecutiveRefreshFailures: 1,
        lastNotifiedFailureCount: null,
      },
    ]);
    chainSelectFor({
      userEmail: "dave@example.com",
      userLanguage: "en",
      atRiskCount: 0,
      atRiskNext: null,
    });
    mockSendTokenExpiringEmail.mockRejectedValueOnce(new Error("Resend rejected"));

    await tokenHealthProcessor(job);

    expect(mockSendTokenExpiringEmail).toHaveBeenCalledTimes(1);
    // Notification insert still happens (independent of email outcome).
    expect(mockDbInsertFn).toHaveBeenCalledTimes(1);
    // But lastNotifiedFailureCount stays unchanged so next cron retries.
    expect(mockDbUpdateSet).not.toHaveBeenCalled();
  });

  it("continues processing other accounts when one notification insert fails", async () => {
    mockDbQueryXAccountsFindMany.mockResolvedValue([
      {
        id: "acc-1",
        userId: "user-1",
        xUsername: "user1",
        consecutiveRefreshFailures: 1,
        lastNotifiedFailureCount: null,
      },
      {
        id: "acc-2",
        userId: "user-2",
        xUsername: "user2",
        consecutiveRefreshFailures: 1,
        lastNotifiedFailureCount: null,
      },
    ]);
    chainSelectFor({
      userEmail: "user1@example.com",
      userLanguage: "en",
      atRiskCount: 0,
      atRiskNext: null,
    });
    chainSelectFor({
      userEmail: "user2@example.com",
      userLanguage: "en",
      atRiskCount: 0,
      atRiskNext: null,
    });
    const mockValues = vi
      .fn()
      .mockRejectedValueOnce(new Error("DB Error"))
      .mockResolvedValueOnce(undefined);
    mockDbInsertFn.mockReturnValue({ values: mockValues });

    await tokenHealthProcessor(job);

    expect(mockValues).toHaveBeenCalledTimes(2);
    // Both emails attempted even after notification insert failure
    expect(mockSendTokenExpiringEmail).toHaveBeenCalledTimes(2);
  });
});
