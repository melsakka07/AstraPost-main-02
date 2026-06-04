import { describe, expect, it, vi } from "vitest";
import { foldConsumption, type FoldInput } from "../consumption-metrics";

// consumption-metrics imports db (server-only); mock it so the pure fold logic
// can be tested in isolation without a DB. (vitest hoists vi.mock above imports.)
vi.mock("@/lib/db", () => ({ db: {} }));

function baseInput(overrides: Partial<FoldInput> = {}): FoldInput {
  return {
    rangeDays: 7,
    summary: { totalCalls: 0, totalTokens: 0, knownCostCents: 0, fallbackCount: 0 },
    modelRows: [],
    featureRows: [],
    dailyRows: [],
    imageQuota: { totalUsed: 0, activeUsers: 0 },
    ...overrides,
  };
}

describe("foldConsumption", () => {
  it("returns zeroed totals and zero-fills the three tracked providers for empty input", () => {
    const result = foldConsumption(baseInput());
    expect(result.totalCalls).toBe(0);
    expect(result.totalCostCents).toBe(0);
    expect(result.fallbackRate).toBe(0);
    expect(result.byProvider.map((p) => p.provider).sort()).toEqual([
      "openai",
      "openrouter",
      "replicate",
    ]);
    expect(result.byProvider.every((p) => p.calls === 0 && p.costCents === 0)).toBe(true);
  });

  it("rolls text and image rows up to the correct providers", () => {
    const result = foldConsumption(
      baseInput({
        summary: { totalCalls: 7, totalTokens: 3000, knownCostCents: 130, fallbackCount: 0 },
        modelRows: [
          {
            model: "anthropic/claude-sonnet-4-20250514",
            type: "thread",
            calls: 5,
            tokens: 3000,
            knownCostCents: 100,
          },
          {
            model: "nano-banana-pro",
            type: "image",
            calls: 2,
            tokens: 0,
            knownCostCents: 30,
          },
        ],
      })
    );

    const openrouter = result.byProvider.find((p) => p.provider === "openrouter");
    const replicate = result.byProvider.find((p) => p.provider === "replicate");
    expect(openrouter?.costCents).toBe(100);
    expect(openrouter?.calls).toBe(5);
    expect(replicate?.costCents).toBe(30);
    expect(replicate?.calls).toBe(2);
    expect(result.totalCostCents).toBe(130);
    // byProvider is sorted by cost descending
    expect(result.byProvider[0]?.provider).toBe("openrouter");
  });

  it("reports cost as the recorded estimate only — matching /admin/ai-cost (no token re-estimation)", () => {
    const result = foldConsumption(
      baseInput({
        summary: { totalCalls: 4, totalTokens: 1000, knownCostCents: 0, fallbackCount: 0 },
        modelRows: [
          {
            // An unpriced model (recorded cost 0) keeps cost 0 despite real tokens,
            // exactly as /admin/ai-cost and the daily-budget alarm report it.
            model: "deepseek/deepseek-v4-flash",
            type: "thread",
            calls: 4,
            tokens: 1000,
            knownCostCents: 0,
          },
        ],
      })
    );
    expect(result.byModel[0]?.costCents).toBe(0);
    expect(result.totalCostCents).toBe(0);
  });

  it("sums the recorded cost when rows have one", () => {
    const result = foldConsumption(
      baseInput({
        summary: { totalCalls: 3, totalTokens: 900, knownCostCents: 45, fallbackCount: 0 },
        modelRows: [
          {
            model: "openai/gpt-4o",
            type: "thread",
            calls: 3,
            tokens: 900,
            knownCostCents: 45,
          },
        ],
      })
    );
    expect(result.totalCostCents).toBe(45);
  });

  it("computes the fallback rate from the summary", () => {
    const result = foldConsumption(
      baseInput({
        summary: { totalCalls: 10, totalTokens: 0, knownCostCents: 0, fallbackCount: 3 },
      })
    );
    expect(result.fallbackRate).toBeCloseTo(0.3);
  });

  it("merges the same model across multiple types and sorts features/daily", () => {
    const result = foldConsumption(
      baseInput({
        featureRows: [
          { feature: "thread", calls: 2, knownCostCents: 10 },
          { feature: "bio_optimizer", calls: 5, knownCostCents: 80 },
        ],
        dailyRows: [
          { date: "2026-06-03", calls: 1, tokens: 10, knownCostCents: 5 },
          { date: "2026-06-01", calls: 2, tokens: 20, knownCostCents: 9 },
        ],
      })
    );
    // features sorted by cost desc
    expect(result.byFeature[0]?.feature).toBe("bio_optimizer");
    // daily sorted by date asc
    expect(result.daily[0]?.date).toBe("2026-06-01");
  });
});
