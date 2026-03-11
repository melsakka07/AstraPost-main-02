import { describe, expect, it, vi } from "vitest";
import {
  buildPlanLimitPayload,
  createPlanLimitResponse,
  type PlanGateFailure,
} from "@/lib/middleware/require-plan";

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      user: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(),
  },
}));

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
