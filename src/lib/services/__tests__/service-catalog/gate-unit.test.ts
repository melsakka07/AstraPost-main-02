import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type { PlanGateResult } from "@/lib/middleware/require-plan";
import { GATED_SERVICES, ALL_PLANS, type PlanType } from "./service-catalog.config";

// ─── Mock setup (hoisted — must run before module imports) ───────────────

const { mockFindFirst, mockSelect, mockCachedQuery } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockSelect: vi.fn(),
  mockCachedQuery: vi.fn(),
}));

vi.mock("@/lib/cache", () => ({
  cachedQuery: mockCachedQuery,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: { user: { findFirst: mockFindFirst } },
    select: mockSelect,
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoUpdate: vi.fn() })) })),
  },
}));

// Pass through cachedQuery to bypass Redis cache in tests
mockCachedQuery.mockImplementation((_key: string, fn: () => unknown) => fn());

// ─── Constants ────────────────────────────────────────────────────────────

const NOW = new Date();
const FUTURE = new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000);
const ANCIENT = new Date("2020-01-01");

// ─── Helpers ─────────────────────────────────────────────────────────────

function mockZeroCount() {
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: "0" }]),
    }),
  });
}

/**
 * Sets up the mock DB to return a user row matching the requested plan.
 * The gate functions call `getPlanContext(userId)` → `cachedQuery(...)` →
 * `db.query.user.findFirst(...)`. By setting `mockFindFirst`, we control
 * what plan the gate sees.
 */
function setPlanMock(plan: PlanType) {
  const base: Record<string, unknown> = {
    id: "test-user",
    planExpiresAt: null,
    createdAt: NOW,
  };

  switch (plan) {
    case "free":
      Object.assign(base, {
        plan: "free",
        trialEndsAt: null,
        // Use ancient createdAt so inferred trialEndsAt is in the past,
        // resulting in trialExpired:true (permanent free, not trial).
        createdAt: ANCIENT,
      });
      break;
    case "trial":
      Object.assign(base, {
        plan: "free",
        trialEndsAt: FUTURE,
      });
      break;
    case "pro_monthly":
      Object.assign(base, {
        plan: "pro_monthly",
        trialEndsAt: null,
      });
      break;
    case "pro_annual":
      Object.assign(base, {
        plan: "pro_annual",
        trialEndsAt: null,
      });
      break;
    case "agency":
      Object.assign(base, {
        plan: "agency",
        trialEndsAt: null,
      });
      break;
  }

  mockFindFirst.mockResolvedValue(base);
}

// ─── Gate extra-args map ──────────────────────────────────────────────────
// Most gates take (userId: string) only. A few require extra params.
// This map supplies those args so every gate can be called uniformly.

const GATE_EXTRA_ARGS: Record<string, unknown[]> = {
  // checkImageModelAccessDetailed(userId, model) — model is required
  checkImageModelAccessDetailed: ["nano-banana-2"],
  // checkPostLimitDetailed(userId, count = 1)      — default works
  // checkAccountLimitDetailed(userId, increment = 1) — default works
};

/**
 * Invokes a named gate function with the correct arguments.
 * Handles gates that require extra params beyond `userId`.
 */
async function callGate(
  gateName: string,
  userId: string,
  requirePlan: Record<string, (...args: unknown[]) => Promise<PlanGateResult>>
): Promise<PlanGateResult> {
  const fn = requirePlan[gateName];
  if (!fn) {
    throw new Error(`Gate function "${gateName}" not found in require-plan module`);
  }
  const extraArgs = GATE_EXTRA_ARGS[gateName] ?? [];
  return fn(userId, ...extraArgs);
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("Service Catalog — Plan Gate Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue(null);
    mockZeroCount();
  });

  // Dynamically import the module once for all tests in this describe block.
  // We use dynamic import because vitest must hoist vi.mock() calls before
  // the module under test is evaluated.
  let requirePlan: Record<string, (...args: unknown[]) => Promise<PlanGateResult>>;

  beforeAll(async () => {
    const mod = await import("@/lib/middleware/require-plan");
    requirePlan = mod as unknown as Record<string, (...args: unknown[]) => Promise<PlanGateResult>>;
  });

  describe.each(GATED_SERVICES)("$name (gate: $gate)", (service) => {
    // Create plan × expected-access test matrix
    const planCases = ALL_PLANS.map((p) => [p, service.access[p]] as const);

    it.each(planCases)("plan=%s → expected allowed=%s", async (plan, expected) => {
      setPlanMock(plan);

      const result = await callGate(service.gate!, "test-user", requirePlan);

      expect(result.allowed).toBe(expected);
    });
  });
});
