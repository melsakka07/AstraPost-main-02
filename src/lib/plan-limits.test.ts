import { describe, expect, it } from "vitest";
import { getPlanLimits, normalizePlan } from "@/lib/plan-limits";

describe("plan-limits", () => {
  it("returns enriched free-plan limits", () => {
    const freeLimits = getPlanLimits("free");

    expect(freeLimits.postsPerMonth).toBe(20);
    expect(freeLimits.aiGenerationsPerMonth).toBe(20);
    expect(freeLimits.maxXAccounts).toBe(1);
    expect(freeLimits.analyticsExport).toBe("none");
    expect(freeLimits.analyticsRetentionDays).toBe(7);
  });

  it("falls back to free for unknown plan identifiers", () => {
    expect(normalizePlan("enterprise")).toBe("free");
    expect(normalizePlan(undefined)).toBe("free");
  });
});
