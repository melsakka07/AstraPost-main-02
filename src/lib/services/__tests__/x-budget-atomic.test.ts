import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  tryConsumeXBudget,
  releaseXBudget,
  recordXUsage,
  xPostCostMicro,
  hasUrl,
} from "../x-budget-atomic";

// ── Mock state (vi.hoisted before vi.mock) ──────────────────────────────
const { mockFindFirstCounter, mockUpdate, mockInsert, mockLogger } = vi.hoisted(() => ({
  mockFindFirstCounter: vi.fn(),
  mockUpdate: vi.fn(),
  mockInsert: vi.fn(),
  mockLogger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/logger", () => ({ logger: mockLogger }));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      teamXBudgetCounters: { findFirst: mockFindFirstCounter },
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

const monthStart = new Date("2026-05-01T00:00:00.000Z");
const monthEnd = new Date("2026-06-01T00:00:00.000Z");

vi.mock("@/lib/utils/time", () => ({
  getMonthWindow: vi.fn(() => ({ start: monthStart, end: monthEnd })),
}));

function mockAtomicConsumeSuccess(teamId: string, usedMicro: number, limitMicro: number) {
  mockUpdate.mockReturnValueOnce({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi
          .fn()
          .mockResolvedValue([{ teamId, usedMicro, limitMicro, periodStart: monthStart }]),
      }),
    }),
  });
}

function mockAtomicConsumeRejected() {
  mockUpdate.mockReturnValueOnce({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  });
}

describe("tryConsumeXBudget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirstCounter.mockResolvedValue(null);
    mockGetUserPlanType.mockResolvedValue("pro_monthly");
    mockGetPlanLimits.mockReturnValue({ xBudgetMicroPerMonth: 50000 });

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  it("allows consumption when under budget (fast path)", async () => {
    mockAtomicConsumeSuccess("team-1", 150, 50000);

    const result = await tryConsumeXBudget("team-1", 150);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(150);
    expect(result.limit).toBe(50000);
    expect(result.resetAt).toEqual(monthEnd);
  });

  it("rejects when atomic consume would exceed limit", async () => {
    mockAtomicConsumeRejected();
    mockFindFirstCounter.mockResolvedValue({
      teamId: "team-1",
      periodStart: monthStart,
      usedMicro: 50000,
      limitMicro: 50000,
    });

    const result = await tryConsumeXBudget("team-1", 2000);
    expect(result.allowed).toBe(false);
    expect(result.used).toBe(50000);
    expect(result.limit).toBe(50000);
  });

  it("creates a counter row on first call and consumes", async () => {
    mockAtomicConsumeRejected(); // fast path misses — no row
    mockFindFirstCounter.mockResolvedValueOnce(null); // slow-path existing lookup
    mockFindFirstCounter.mockResolvedValueOnce({
      teamId: "team-1",
      periodStart: monthStart,
      usedMicro: 0,
      limitMicro: 50000,
    }); // re-read after insert
    mockAtomicConsumeSuccess("team-1", 150, 50000);

    const result = await tryConsumeXBudget("team-1", 150);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(150);
  });

  it("resets counter when period is stale", async () => {
    mockAtomicConsumeRejected();
    mockFindFirstCounter.mockResolvedValue({
      teamId: "team-1",
      periodStart: new Date("2026-04-01T00:00:00.000Z"),
      usedMicro: 40000,
      limitMicro: 50000,
    });
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockResolvedValue([
              { teamId: "team-1", usedMicro: 150, limitMicro: 50000, periodStart: monthStart },
            ]),
        }),
      }),
    });

    const result = await tryConsumeXBudget("team-1", 150);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(150);
  });

  it("refreshes limit on mid-month plan change and consumes", async () => {
    mockAtomicConsumeRejected(); // fast path with stale (old) limit misses
    mockFindFirstCounter.mockResolvedValue({
      teamId: "team-1",
      periodStart: monthStart,
      usedMicro: 100,
      limitMicro: 8000, // stale free-tier limit
    });
    mockUpdate.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    });
    mockAtomicConsumeSuccess("team-1", 250, 50000);

    const result = await tryConsumeXBudget("team-1", 150);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(50000);
  });

  it("returns allowed immediately for unlimited (agency) plans", async () => {
    mockGetUserPlanType.mockResolvedValue("agency");
    mockGetPlanLimits.mockReturnValue({ xBudgetMicroPerMonth: -1 });

    const result = await tryConsumeXBudget("team-1", 2000);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(-1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("releaseXBudget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("decrements the usedMicro counter", async () => {
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ teamId: "team-1" }]),
        }),
      }),
    });

    await releaseXBudget("team-1", 150);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("is a no-op when costMicro <= 0", async () => {
    await releaseXBudget("team-1", 0);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("logs a warning when no counter row exists", async () => {
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await releaseXBudget("team-1", 150);
    expect(mockLogger.warn).toHaveBeenCalledWith("releaseXBudget: no counter row found", {
      teamId: "team-1",
      costMicro: 150,
    });
  });
});

describe("recordXUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirstCounter.mockResolvedValue(null);
    mockGetUserPlanType.mockResolvedValue("pro_monthly");
    mockGetPlanLimits.mockReturnValue({ xBudgetMicroPerMonth: 50000 });
    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("inserts a ledger row and runs the atomic consume", async () => {
    mockAtomicConsumeSuccess("team-1", 150, 50000);

    await recordXUsage("team-1", "post", { endpoint: "/2/tweets", correlationId: "corr-1" });

    expect(mockInsert).toHaveBeenCalled();
  });

  it("never throws when the ledger insert fails (fire-and-forget)", async () => {
    mockAtomicConsumeSuccess("team-1", 150, 50000);
    mockInsert.mockReturnValue({
      values: vi.fn().mockRejectedValue(new Error("db down")),
    });

    await expect(recordXUsage("team-1", "post")).resolves.toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "recordXUsage: ledger insert failed",
      expect.objectContaining({ teamId: "team-1", action: "post" })
    );
  });

  it("never throws when the budget consume fails", async () => {
    mockUpdate.mockImplementationOnce(() => {
      throw new Error("consume failed");
    });

    await expect(recordXUsage("team-1", "post")).resolves.toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "recordXUsage: budget consume failed (non-blocking)",
      expect.objectContaining({ teamId: "team-1", action: "post" })
    );
  });
});

describe("hasUrl", () => {
  it("detects https:// URLs", () => {
    expect(hasUrl("Check this out https://example.com")).toBe(true);
  });

  it("detects http:// URLs", () => {
    expect(hasUrl("Check this out http://example.com")).toBe(true);
  });

  it("detects t.co short links", () => {
    expect(hasUrl("Link: t.co/abc123")).toBe(true);
  });

  it("detects bare domains", () => {
    expect(hasUrl("Visit example.com today")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(hasUrl("Just a normal tweet with no links")).toBe(false);
  });
});

describe("xPostCostMicro", () => {
  it("returns 150 for plain content", () => {
    expect(xPostCostMicro("Hello world")).toBe(150);
  });

  it("returns 2000 for content with a URL", () => {
    expect(xPostCostMicro("Check out https://example.com")).toBe(2000);
  });
});
