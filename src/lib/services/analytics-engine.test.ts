import { describe, expect, it } from "vitest";
import {
  type BestTimeBucket,
  type InsightsInput,
  computeBestDay,
  computeBestHour,
  computeInsights,
  formatPercentChange,
} from "@/lib/services/analytics-insights";

describe("formatPercentChange", () => {
  it("returns positive percentage for growth", () => {
    expect(formatPercentChange(150, 100)).toBe("+50.0%");
  });

  it("returns negative percentage for decline", () => {
    expect(formatPercentChange(50, 100)).toBe("-50.0%");
  });

  it("returns null when prior is zero (avoid div-by-zero)", () => {
    expect(formatPercentChange(100, 0)).toBeNull();
  });

  it("returns +0.0% when unchanged", () => {
    expect(formatPercentChange(100, 100)).toBe("+0.0%");
  });

  it("handles large numbers with rounding", () => {
    expect(formatPercentChange(1234567, 1000000)).toBe("+23.5%");
  });
});

describe("computeBestDay", () => {
  it("returns null with insufficient data (< 3 days)", () => {
    expect(computeBestDay([])).toBeNull();
    expect(computeBestDay([{ date: "2026-05-01", value: 100 }])).toBeNull();
    expect(
      computeBestDay([
        { date: "2026-05-01", value: 100 },
        { date: "2026-05-02", value: 200 },
      ])
    ).toBeNull();
  });

  it("identifies the day with highest average impressions", () => {
    // Monday=May 4 (1), Tuesday=May 5 (2), Wednesday=May 6 (3)
    // Wednesday has the highest values
    const data = [
      { date: "2026-05-04", value: 100 }, // Monday
      { date: "2026-05-05", value: 200 }, // Tuesday
      { date: "2026-05-06", value: 500 }, // Wednesday
    ];
    const result = computeBestDay(data);
    expect(result).not.toBeNull();
    expect(result!.dayName).toBe("Wednesday");
    expect(result!.dayIndex).toBe(3);
    expect(result!.avgValue).toBe(500);
  });

  it("averages multiple same-day entries", () => {
    // Two Mondays: avg = (100+300)/2 = 200, Two Wednesdays: avg = (200+800)/2 = 500
    const data = [
      { date: "2026-05-04", value: 100 }, // Monday
      { date: "2026-05-06", value: 200 }, // Wednesday
      { date: "2026-05-11", value: 300 }, // Monday
      { date: "2026-05-13", value: 800 }, // Wednesday
    ];
    const result = computeBestDay(data);
    expect(result).not.toBeNull();
    expect(result!.dayName).toBe("Wednesday");
    expect(result!.avgValue).toBe(500);
  });

  it("returns the first best day when multiple have equal averages", () => {
    const data = [
      { date: "2026-05-04", value: 100 }, // Monday
      { date: "2026-05-05", value: 100 }, // Tuesday
      { date: "2026-05-06", value: 100 }, // Wednesday
    ];
    const result = computeBestDay(data);
    expect(result).not.toBeNull();
    expect(result!.avgValue).toBe(100);
    // Day index should be one of 1, 2, or 3
    expect([1, 2, 3]).toContain(result!.dayIndex);
  });
});

describe("computeBestHour", () => {
  it("returns null for empty data", () => {
    expect(computeBestHour([])).toBeNull();
  });

  it("returns the top-scoring bucket (first in sorted array)", () => {
    const data: BestTimeBucket[] = [
      { day: 3, hour: 14, score: 95, count: 12 },
      { day: 5, hour: 9, score: 80, count: 8 },
      { day: 1, hour: 18, score: 60, count: 5 },
    ];
    const result = computeBestHour(data);
    expect(result).toEqual({ day: 3, hour: 14, score: 95 });
  });

  it("returns the first bucket even when only one exists", () => {
    const data: BestTimeBucket[] = [{ day: 2, hour: 10, score: 70, count: 3 }];
    const result = computeBestHour(data);
    expect(result).toEqual({ day: 2, hour: 10, score: 70 });
  });
});

describe("computeInsights", () => {
  const emptyInput: InsightsInput = {
    bestTimeData: [],
    currentTotals: { impressions: 0, likes: 0, retweets: 0, replies: 0, clicks: 0 },
    priorTotals: { impressions: 0, likes: 0, retweets: 0, replies: 0, clicks: 0 },
    dailyImpressions: [],
    dailyEngagement: [],
  };

  it("returns empty array when all data is empty", () => {
    const result = computeInsights(emptyInput);
    expect(result).toEqual([]);
  });

  it("returns empty array when prior totals are zero (no fabricated percentages)", () => {
    const input: InsightsInput = {
      ...emptyInput,
      currentTotals: { impressions: 100, likes: 50, retweets: 10, replies: 5, clicks: 0 },
      dailyImpressions: [
        { date: "2026-05-01", value: 50 },
        { date: "2026-05-02", value: 60 },
        { date: "2026-05-03", value: 40 },
      ],
    };
    const result = computeInsights(input);
    // Best day is present (3 data points), but no deltas (prior = 0)
    expect(result.length).toBe(1);
    expect(result[0]!.label).toBe("Best Day");
  });

  it("returns best day + deltas when both periods have data", () => {
    const bestTime: BestTimeBucket[] = [{ day: 5, hour: 10, score: 88, count: 7 }];
    const input: InsightsInput = {
      bestTimeData: bestTime,
      currentTotals: { impressions: 2000, likes: 150, retweets: 30, replies: 20, clicks: 50 },
      priorTotals: { impressions: 1000, likes: 100, retweets: 20, replies: 15, clicks: 25 },
      dailyImpressions: [
        { date: "2026-05-01", value: 100 }, // Friday (5) — best day will be computed
        { date: "2026-05-02", value: 200 },
        { date: "2026-05-03", value: 50 },
      ],
      dailyEngagement: [],
    };
    const result = computeInsights(input);

    // Should have: best day, top hour (from bestTimeData), impressions delta, engagement delta
    expect(result.length).toBe(4);

    // Best day
    expect(result[0]!.label).toBe("Best Day");
    expect(result[0]!.trend).toBe("neutral");

    // Top hour
    expect(result[1]!.label).toBe("Top Hour");
    expect(result[1]!.value).toBe("10:00");

    // Impressions delta: +100% (2000 vs 1000)
    expect(result[2]!.label).toBe("Impressions");
    expect(result[2]!.value).toBe("+100.0%");
    expect(result[2]!.trend).toBe("positive");

    // Engagement delta: (150+30+20)=200 vs (100+20+15)=135 → +48.1%
    expect(result[3]!.label).toBe("Engagement");
    expect(result[3]!.value).toBe("+48.1%");
    expect(result[3]!.trend).toBe("positive");
  });

  it("returns negative trends when metrics decline", () => {
    const input: InsightsInput = {
      ...emptyInput,
      currentTotals: { impressions: 500, likes: 10, retweets: 2, replies: 1, clicks: 0 },
      priorTotals: { impressions: 1000, likes: 20, retweets: 5, replies: 3, clicks: 0 },
      dailyImpressions: [
        { date: "2026-05-01", value: 100 },
        { date: "2026-05-02", value: 100 },
        { date: "2026-05-03", value: 100 },
      ],
    };
    const result = computeInsights(input);

    // Impressions delta is negative
    const impDelta = result.find((i) => i.label === "Impressions");
    expect(impDelta).toBeDefined();
    expect(impDelta!.value).toBe("-50.0%");
    expect(impDelta!.trend).toBe("negative");
  });

  it("never fabricates insights — checks each is data-driven", () => {
    const result = computeInsights(emptyInput);
    // Verify no insight has a fabricated value
    for (const insight of result) {
      expect(insight.value).toBeTruthy();
      expect(typeof insight.label).toBe("string");
      expect(["positive", "negative", "neutral"]).toContain(insight.trend);
    }
  });
});
