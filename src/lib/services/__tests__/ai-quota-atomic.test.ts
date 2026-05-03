import { describe, it, expect, vi, beforeEach } from "vitest";
import { tryConsumeAiQuota, releaseAiQuota } from "../ai-quota-atomic";

// ── Mock state (vi.hoisted before vi.mock) ──────────────────────────────
const { mockFindFirstCounter, mockFindFirstGrant, mockUpdate, mockInsert, mockLogger } = vi.hoisted(
  () => ({
    mockFindFirstCounter: vi.fn(),
    mockFindFirstGrant: vi.fn(),
    mockUpdate: vi.fn(),
    mockInsert: vi.fn(),
    mockLogger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
  })
);

vi.mock("@/lib/logger", () => ({ logger: mockLogger }));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      userAiCounters: { findFirst: mockFindFirstCounter },
      aiQuotaGrants: { findFirst: mockFindFirstGrant },
    },
    update: mockUpdate,
    insert: mockInsert,
  },
}));

const { mockGetUserPlanType, mockGetPlanLimits } = vi.hoisted(() => ({
  mockGetUserPlanType: vi.fn(),
  mockGetPlanLimits: vi.fn(),
}));

vi.mock("@/lib/middleware/require-plan", () => ({
  getUserPlanType: mockGetUserPlanType,
}));

vi.mock("@/lib/plan-limits", () => ({
  getPlanLimits: mockGetPlanLimits,
}));

// ── Helpers ─────────────────────────────────────────────────────────────

const monthStart = new Date("2026-05-01T00:00:00.000Z");
const monthEnd = new Date("2026-06-01T00:00:00.000Z");

vi.mock("@/lib/utils/time", () => ({
  getMonthWindow: vi.fn(() => ({ start: monthStart, end: monthEnd })),
}));

function mockAtomicConsumeSuccess(userId: string, used: number, limit: number) {
  // Simulate the UPDATE ... RETURNING path in atomicConsume
  mockUpdate.mockReturnValueOnce({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ userId, used, limit, periodStart: monthStart }]),
      }),
    }),
  });
}

function mockAtomicConsumeRejected() {
  // Simulate UPDATE returning empty (quota exhausted)
  mockUpdate.mockReturnValueOnce({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  });
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("tryConsumeAiQuota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirstCounter.mockResolvedValue(null);
    mockFindFirstGrant.mockResolvedValue(null);
    mockGetUserPlanType.mockResolvedValue("pro_monthly");
    mockGetPlanLimits.mockReturnValue({ aiGenerationsPerMonth: 150 });

    // Default mock for insert
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  // ── Fast path: existing counter, in-window ────────────────────────────
  it("allows consumption when under quota (fast path)", async () => {
    mockAtomicConsumeSuccess("user-1", 45, 150);

    const result = await tryConsumeAiQuota("user-1", 1);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(45);
    expect(result.limit).toBe(150);
    expect(result.resetAt).toEqual(monthEnd);
  });

  it("rejects when atomic consume would exceed limit", async () => {
    mockAtomicConsumeRejected();

    // Existing counter at limit
    mockFindFirstCounter.mockResolvedValue({
      userId: "user-1",
      periodStart: monthStart,
      used: 150,
      limit: 150,
    });

    // No grants available
    mockFindFirstGrant.mockResolvedValue(null);

    const result = await tryConsumeAiQuota("user-1", 1);
    expect(result.allowed).toBe(false);
    expect(result.used).toBe(150);
    expect(result.limit).toBe(150);
  });

  // ── Slow path: no counter row yet ─────────────────────────────────────
  it("creates counter on first-ever call and consumes", async () => {
    mockAtomicConsumeRejected(); // Fast path misses — no row
    mockFindFirstCounter.mockResolvedValue(null); // No existing row

    // After insert, re-read returns the new counter row
    mockFindFirstCounter.mockResolvedValueOnce(null); // first re-read in createAndConsume
    mockFindFirstCounter.mockResolvedValueOnce({
      // second re-read after insert
      userId: "user-1",
      periodStart: monthStart,
      used: 0,
      limit: 150,
    });

    // Atomic consume on new row succeeds
    mockAtomicConsumeSuccess("user-1", 1, 150);

    // Insert mock
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const result = await tryConsumeAiQuota("user-1", 1);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(1);
  });

  // ── Stale period ──────────────────────────────────────────────────────
  it("resets counter when period is stale", async () => {
    mockAtomicConsumeRejected(); // Fast path misses

    const oldPeriod = new Date("2026-04-01T00:00:00.000Z");
    mockFindFirstCounter.mockResolvedValue({
      userId: "user-1",
      periodStart: oldPeriod,
      used: 120,
      limit: 150,
    });

    // Reset succeeds
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockResolvedValue([
              { userId: "user-1", used: 1, limit: 150, periodStart: monthStart },
            ]),
        }),
      }),
    });

    const result = await tryConsumeAiQuota("user-1", 1);
    expect(result.allowed).toBe(true);
  });

  // ── Grant fallback ────────────────────────────────────────────────────
  it("falls back to admin grants when base quota exhausted", async () => {
    mockAtomicConsumeRejected();
    mockFindFirstCounter.mockResolvedValue({
      userId: "user-1",
      periodStart: monthStart,
      used: 150,
      limit: 150,
    });

    mockFindFirstGrant.mockResolvedValue({
      id: "grant-1",
      userId: "user-1",
      amount: 50,
      remaining: 50,
      grantedBy: "admin-1",
      reason: "support override",
      createdAt: new Date(),
    });

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined), // grant decrement
      }),
    });

    const result = await tryConsumeAiQuota("user-1", 1);
    expect(result.allowed).toBe(true);
  });

  it("returns not-allowed when both base quota and grants exhausted", async () => {
    mockAtomicConsumeRejected();
    mockFindFirstCounter.mockResolvedValue({
      userId: "user-1",
      periodStart: monthStart,
      used: 150,
      limit: 150,
    });
    mockFindFirstGrant.mockResolvedValue(null); // No grants

    const result = await tryConsumeAiQuota("user-1", 5);
    expect(result.allowed).toBe(false);
  });

  // ── Weighted consumption ──────────────────────────────────────────────
  it("consumes multiple units when weight > 1", async () => {
    mockAtomicConsumeSuccess("user-1", 5, 150);

    const result = await tryConsumeAiQuota("user-1", 5);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(5);
  });

  // ── Unlimited plans ───────────────────────────────────────────────────
  it("returns allowed immediately for unlimited plans", async () => {
    mockGetUserPlanType.mockResolvedValue("agency");
    mockGetPlanLimits.mockReturnValue({ aiGenerationsPerMonth: Infinity });

    mockAtomicConsumeRejected();
    mockFindFirstCounter.mockResolvedValue(null); // No counter, triggers createAndConsume

    const result = await tryConsumeAiQuota("user-1", 5);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(-1); // unlimited signal
  });
});

describe("releaseAiQuota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("decrements the used counter", async () => {
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ userId: "user-1" }]),
        }),
      }),
    });

    await releaseAiQuota("user-1", 1);
    // Should not throw
  });

  it("logs a warning when no counter row exists", async () => {
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await releaseAiQuota("user-1", 1);
    expect(mockLogger.warn).toHaveBeenCalledWith("releaseAiQuota: no counter row found", {
      userId: "user-1",
      weight: 1,
    });
  });
});
