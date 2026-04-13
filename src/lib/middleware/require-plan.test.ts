import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildPlanLimitPayload,
  createPlanLimitResponse,
  checkAccountLimitDetailed,
  checkPostLimitDetailed,
  checkAiQuotaDetailed,
  checkAgenticPostingAccessDetailed,
  checkLinkedinAccessDetailed,
  checkAnalyticsExportLimitDetailed,
  type PlanGateFailure,
} from "@/lib/middleware/require-plan";

const { mockFindFirst, mockSelect } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockSelect: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      user: {
        findFirst: mockFindFirst,
      },
    },
    select: mockSelect,
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
  },
}));

// Helper: future date (trial active)
const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
// Helper: past date (trial expired)
const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

// Selects that return 0 counts for quota checks
function mockZeroCount() {
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: 0 }]),
    }),
  });
}

describe("Trial System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockZeroCount();
  });

  it("trial user gets Pro feature access (agentic posting)", async () => {
    mockFindFirst.mockResolvedValue({
      plan: "free",
      trialEndsAt: futureDate,
      createdAt: new Date(),
    });
    const result = await checkAgenticPostingAccessDetailed("user-1");
    expect(result.allowed).toBe(true);
  });

  it("trial user is capped at 3 X accounts (Pro limit)", async () => {
    mockFindFirst.mockResolvedValue({
      plan: "free",
      trialEndsAt: futureDate,
      createdAt: new Date(),
    });
    // Simulate already having 3 accounts
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 3 }]),
      }),
    });
    const result = await checkAccountLimitDetailed("user-1", 1);
    expect(result.allowed).toBe(false);
  });

  it("trial user AI quota is capped at Pro limit (100)", async () => {
    mockFindFirst.mockResolvedValue({
      plan: "free",
      trialEndsAt: futureDate,
      createdAt: new Date(),
    });
    // Simulate 100 AI generations used
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 100 }]),
      }),
    });
    const result = await checkAiQuotaDetailed("user-1");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.limit).toBe(100);
    }
  });

  it("trial user CANNOT access LinkedIn (Agency-only)", async () => {
    mockFindFirst.mockResolvedValue({
      plan: "free",
      trialEndsAt: futureDate,
      createdAt: new Date(),
    });
    const result = await checkLinkedinAccessDetailed("user-1");
    expect(result.allowed).toBe(false);
  });

  it("trial user gets csv_pdf analytics export (not white_label_pdf)", async () => {
    mockFindFirst.mockResolvedValue({
      plan: "free",
      trialEndsAt: futureDate,
      createdAt: new Date(),
    });
    const result = await checkAnalyticsExportLimitDetailed("user-1");
    expect(result.allowed).toBe(true); // csv_pdf is allowed (not "none")
  });

  it("expired trial user is blocked from Pro features", async () => {
    mockFindFirst.mockResolvedValue({ plan: "free", trialEndsAt: pastDate, createdAt: new Date() });
    const result = await checkAgenticPostingAccessDetailed("user-1");
    expect(result.allowed).toBe(false);
  });

  it("expired trial user is capped at Free post limit (20)", async () => {
    mockFindFirst.mockResolvedValue({ plan: "free", trialEndsAt: pastDate, createdAt: new Date() });
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 20 }]),
      }),
    });
    const result = await checkPostLimitDetailed("user-1", 1);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.limit).toBe(20);
    }
  });

  it("paid Pro user can use agentic posting (unaffected by trial logic)", async () => {
    mockFindFirst.mockResolvedValue({
      plan: "pro_monthly",
      trialEndsAt: null,
      createdAt: new Date(),
    });
    const result = await checkAgenticPostingAccessDetailed("user-1");
    expect(result.allowed).toBe(true);
  });

  it("paid Agency user can access LinkedIn (unaffected by trial logic)", async () => {
    mockFindFirst.mockResolvedValue({ plan: "agency", trialEndsAt: null, createdAt: new Date() });
    const result = await checkLinkedinAccessDetailed("user-1");
    expect(result.allowed).toBe(true);
  });
});

describe("Multi-Account Limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockZeroCount();
  });

  it("Free user blocked at 2nd account (limit is 1)", async () => {
    // Use a createdAt date more than 14 days ago to ensure trial is expired
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 20);
    mockFindFirst.mockResolvedValue({ plan: "free", trialEndsAt: null, createdAt: oldDate });
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      }),
    });
    const result = await checkAccountLimitDetailed("user-1", 1);
    expect(result.allowed).toBe(false);
  });

  it("Pro user allowed up to 3 accounts", async () => {
    mockFindFirst.mockResolvedValue({
      plan: "pro_monthly",
      trialEndsAt: null,
      createdAt: new Date(),
    });
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 2 }]),
      }),
    });
    const result = await checkAccountLimitDetailed("user-1", 1);
    expect(result.allowed).toBe(true);
  });

  it("Pro user blocked at 4th account (limit is 3)", async () => {
    mockFindFirst.mockResolvedValue({
      plan: "pro_monthly",
      trialEndsAt: null,
      createdAt: new Date(),
    });
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 3 }]),
      }),
    });
    const result = await checkAccountLimitDetailed("user-1", 1);
    expect(result.allowed).toBe(false);
  });

  it("Agency user allowed up to 10 accounts", async () => {
    mockFindFirst.mockResolvedValue({ plan: "agency", trialEndsAt: null, createdAt: new Date() });
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 9 }]),
      }),
    });
    const result = await checkAccountLimitDetailed("user-1", 1);
    expect(result.allowed).toBe(true);
  });

  it("Agency user blocked at 11th account (limit is 10)", async () => {
    mockFindFirst.mockResolvedValue({ plan: "agency", trialEndsAt: null, createdAt: new Date() });
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 10 }]),
      }),
    });
    const result = await checkAccountLimitDetailed("user-1", 1);
    expect(result.allowed).toBe(false);
  });

  it("Pro Annual user allowed up to 4 accounts", async () => {
    mockFindFirst.mockResolvedValue({
      plan: "pro_annual",
      trialEndsAt: null,
      createdAt: new Date(),
    });
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 3 }]),
      }),
    });
    const result = await checkAccountLimitDetailed("user-1", 1);
    expect(result.allowed).toBe(true);
  });

  it("Pro Annual user blocked at 5th account (limit is 4)", async () => {
    mockFindFirst.mockResolvedValue({
      plan: "pro_annual",
      trialEndsAt: null,
      createdAt: new Date(),
    });
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 4 }]),
      }),
    });
    const result = await checkAccountLimitDetailed("user-1", 1);
    expect(result.allowed).toBe(false);
  });
});

describe("require-plan 402 payload", () => {
  const resetAt = new Date("2026-03-01T00:00:00.000Z");
  const failure: PlanGateFailure = {
    allowed: false,
    error: "quota_exceeded",
    feature: "ai_quota",
    message: "You have reached your monthly AI generation quota.",
    plan: "free",
    limit: 5,
    used: 5,
    suggestedPlan: "pro_monthly",
    trialActive: false,
    resetAt,
  };

  it("builds a detailed and stable 402 payload", () => {
    const payload = buildPlanLimitPayload(failure);

    expect(payload).toMatchObject({
      error: "quota_exceeded",
      code: "quota_exceeded",
      feature: "ai_quota",
      plan: "free",
      limit: 5,
      used: 5,
      remaining: 0,
      suggested_plan: "pro_monthly",
      upgrade_url: "/pricing",
      trial_active: false,
      reset_at: resetAt.toISOString(),
    });
  });

  it("returns HTTP 402 with JSON details", async () => {
    const response = createPlanLimitResponse(failure);
    const payload = (await response.json()) as ReturnType<typeof buildPlanLimitPayload>;

    expect(response.status).toBe(402);
    expect(payload.error).toBe("quota_exceeded");
    expect(payload.feature).toBe("ai_quota");
  });
});
