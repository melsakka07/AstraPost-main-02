import { describe, it, expect, vi, beforeEach } from "vitest";
import { tryConsumeImageQuota, releaseImageQuota } from "../ai-image-quota-atomic";

// ── Mock state (vi.hoisted before vi.mock) ──────────────────────────────
const { mockFindFirstCounter, mockSelect, mockUpdate, mockInsert, mockLogger } = vi.hoisted(() => ({
  mockFindFirstCounter: vi.fn(),
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockInsert: vi.fn(),
  mockLogger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/logger", () => ({ logger: mockLogger }));
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      userImageCounters: { findFirst: mockFindFirstCounter },
    },
    select: mockSelect,
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

function mockAtomicConsumeSuccess(userId: string, used: number, limit: number) {
  mockUpdate.mockReturnValueOnce({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ userId, used, limit, periodStart: monthStart }]),
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

// Seed-count query: db.select(...).from(...).where(...) → [{ count }]
function mockSeedCount(count: number) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count }]),
    }),
  });
}

describe("tryConsumeImageQuota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirstCounter.mockResolvedValue(null);
    mockGetUserPlanType.mockResolvedValue("pro_monthly");
    mockGetPlanLimits.mockReturnValue({ aiImagesPerMonth: 50 });

    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  it("allows consumption when under quota (fast path)", async () => {
    mockAtomicConsumeSuccess("user-1", 5, 50);

    const result = await tryConsumeImageQuota("user-1", 5);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(5);
    expect(result.limit).toBe(50);
    expect(result.resetAt).toEqual(monthEnd);
  });

  it("rejects when atomic consume would exceed limit", async () => {
    mockAtomicConsumeRejected();
    mockFindFirstCounter.mockResolvedValue({
      userId: "user-1",
      periodStart: monthStart,
      used: 50,
      limit: 50,
    });

    const result = await tryConsumeImageQuota("user-1", 5);
    expect(result.allowed).toBe(false);
    expect(result.used).toBe(50);
    expect(result.limit).toBe(50);
  });

  it("creates a seeded counter on first call and consumes", async () => {
    mockAtomicConsumeRejected(); // fast path misses — no row
    mockFindFirstCounter.mockResolvedValueOnce(null); // slow-path existing lookup
    mockSeedCount(3); // 3 images already recorded this period
    mockFindFirstCounter.mockResolvedValueOnce({
      userId: "user-1",
      periodStart: monthStart,
      used: 3,
      limit: 50,
    }); // re-read after insert
    mockAtomicConsumeSuccess("user-1", 4, 50); // 3 seed + 1 weight

    const result = await tryConsumeImageQuota("user-1", 1);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(4);
  });

  it("resets counter when period is stale", async () => {
    mockAtomicConsumeRejected();
    mockFindFirstCounter.mockResolvedValue({
      userId: "user-1",
      periodStart: new Date("2026-04-01T00:00:00.000Z"),
      used: 40,
      limit: 50,
    });
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockResolvedValue([{ userId: "user-1", used: 1, limit: 50, periodStart: monthStart }]),
        }),
      }),
    });

    const result = await tryConsumeImageQuota("user-1", 1);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(1);
  });

  it("consumes weighted credits for pro models", async () => {
    mockAtomicConsumeSuccess("user-1", 5, 50);

    const result = await tryConsumeImageQuota("user-1", 5); // gpt-image-2 weight
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(5);
  });

  it("returns allowed immediately for unlimited plans", async () => {
    mockGetUserPlanType.mockResolvedValue("agency");
    mockGetPlanLimits.mockReturnValue({ aiImagesPerMonth: -1 });

    const result = await tryConsumeImageQuota("user-1", 5);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(-1);
  });
});

describe("releaseImageQuota", () => {
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

    await releaseImageQuota("user-1", 3);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("is a no-op when weight <= 0", async () => {
    await releaseImageQuota("user-1", 0);
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

    await releaseImageQuota("user-1", 1);
    expect(mockLogger.warn).toHaveBeenCalledWith("releaseImageQuota: no counter row found", {
      userId: "user-1",
      weight: 1,
    });
  });
});
