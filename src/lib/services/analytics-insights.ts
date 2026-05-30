/**
 * Pure analytics insight computation — no DB access, no side effects.
 *
 * These functions operate on pre-fetched data and are safe to import in
 * any context (RSC, client components, node tests). The AnalyticsEngine
 * class in analytics-engine.ts handles DB queries and re-exports these
 * for convenience.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AnalyticsInsight {
  /** Short label for the insight card (e.g. "Best Day", "Top Hour") */
  label: string;
  /** The computed value (e.g. "Friday", "9 PM", "+23%") */
  value: string;
  /** Optional context sub-text (e.g. "avg engagement 4.2%", "vs prior period") */
  context?: string;
  /** Direction hint for styling: positive = good, negative = bad, neutral = info */
  trend: "positive" | "negative" | "neutral";
}

export interface BestTimeBucket {
  day: number; // 0-6 (Sun-Sat)
  hour: number; // 0-23
  score: number; // Normalized 0-100 score based on engagement
  count: number; // Number of posts in this bucket
}

export interface InsightsInput {
  /** Best-time-to-post buckets from AnalyticsEngine.getBestTimesToPost() */
  bestTimeData: BestTimeBucket[];
  /** Summed metric totals for the current period */
  currentTotals: {
    impressions: number;
    likes: number;
    retweets: number;
    replies: number;
    clicks: number;
  };
  /** Summed metric totals for the prior comparison period */
  priorTotals: {
    impressions: number;
    likes: number;
    retweets: number;
    replies: number;
    clicks: number;
  };
  /** Per-day impression data for best-day computation */
  dailyImpressions: Array<{ date: string; value: number }>;
  /** Per-day engagement rate data (unused today; reserved for future insights) */
  dailyEngagement: Array<{ date: string; value: number }>;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Pure Functions ─────────────────────────────────────────────────────────

/**
 * Format a percentage change string from two numeric totals.
 * Returns null when prior is zero (division by zero avoidance).
 */
export function formatPercentChange(current: number, prior: number): string | null {
  if (prior === 0) return null;
  const pct = ((current - prior) / prior) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/**
 * Derive the best day of week from daily impression data.
 * Returns null when there is insufficient data (fewer than 3 distinct days).
 * The returned value is the English day name; i18n translation happens in the UI layer.
 */
export function computeBestDay(
  dailyImpressions: Array<{ date: string; value: number }>
): { dayName: string; dayIndex: number; avgValue: number } | null {
  if (dailyImpressions.length < 3) return null;

  const dayBuckets = new Map<number, { sum: number; count: number }>();
  for (const dp of dailyImpressions) {
    const dayIndex = new Date(dp.date).getDay();
    const bucket = dayBuckets.get(dayIndex) ?? { sum: 0, count: 0 };
    bucket.sum += dp.value;
    bucket.count += 1;
    dayBuckets.set(dayIndex, bucket);
  }

  let bestDayIndex = -1;
  let bestAvg = -1;
  for (const [dayIndex, { sum, count }] of dayBuckets) {
    const avg = sum / count;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestDayIndex = dayIndex;
    }
  }

  if (bestDayIndex < 0) return null;
  return {
    dayName: DAY_NAMES[bestDayIndex]!,
    dayIndex: bestDayIndex,
    avgValue: Math.round(bestAvg),
  };
}

/**
 * Derive the best posting hour from BestTimeBucket data.
 * Returns the top-scoring bucket if data exists, null otherwise.
 */
export function computeBestHour(bestTimeData: BestTimeBucket[]): {
  day: number;
  hour: number;
  score: number;
} | null {
  if (bestTimeData.length === 0) return null;
  // bestTimeData is already sorted DESC by avgRate from the DB query
  const top = bestTimeData[0]!;
  return { day: top.day, hour: top.hour, score: top.score };
}

/**
 * Compute a set of actionable analytics insights from existing aggregates.
 * Pure function — no DB access, no side effects. All inputs are pre-computed.
 *
 * Returns 3-5 insights; fewer when data is sparse (returns empty array rather
 * than fabricating numbers).
 */
export function computeInsights(input: InsightsInput): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];

  // 1. Best day of week (from impressions data)
  const bestDay = computeBestDay(input.dailyImpressions);
  if (bestDay) {
    insights.push({
      label: "Best Day",
      value: bestDay.dayName,
      context: `avg ${bestDay.avgValue.toLocaleString()} impressions`,
      trend: "neutral",
    });
  }

  // 2. Best posting hour (from bestTimeData)
  const bestHour = computeBestHour(input.bestTimeData);
  if (bestHour) {
    const hourLabel = `${bestHour.hour}:00`;
    insights.push({
      label: "Top Hour",
      value: hourLabel,
      context: `score ${bestHour.score}/100`,
      trend: "positive",
    });
  }

  // 3. Impressions % vs prior period
  const impressionsDelta = formatPercentChange(
    input.currentTotals.impressions,
    input.priorTotals.impressions
  );
  if (impressionsDelta !== null) {
    const isUp = impressionsDelta.startsWith("+");
    insights.push({
      label: "Impressions",
      value: impressionsDelta,
      context: "vs prior period",
      trend: isUp ? "positive" : "negative",
    });
  }

  // 4. Engagement % vs prior period
  const currentEngagement =
    input.currentTotals.likes + input.currentTotals.retweets + input.currentTotals.replies;
  const priorEngagement =
    input.priorTotals.likes + input.priorTotals.retweets + input.priorTotals.replies;
  const engagementDelta = formatPercentChange(currentEngagement, priorEngagement);
  if (engagementDelta !== null) {
    const isUp = engagementDelta.startsWith("+");
    insights.push({
      label: "Engagement",
      value: engagementDelta,
      context: "vs prior period",
      trend: isUp ? "positive" : "negative",
    });
  }

  return insights;
}
