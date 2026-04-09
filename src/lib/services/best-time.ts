import { AnalyticsEngine } from "./analytics-engine";

export interface TimeSlot {
  day: number; // 0=Sun, 6=Sat
  hour: number; // 0-23
  score: number; // 0-100 normalized engagement score
}

const FALLBACK_TIMES: TimeSlot[] = [
  { day: 0, hour: 20, score: 80 }, // Sun 8PM
  { day: 2, hour: 9, score: 75 }, // Tue 9AM
  { day: 4, hour: 19, score: 70 }, // Thu 7PM
];

/**
 * Returns the top 3 best posting time slots for a user.
 *
 * Delegates to AnalyticsEngine.getBestTimesToPost() which uses a SQL-level
 * GROUP BY with normalized AVG engagement rate — the same data source used
 * by the Best Time heatmap on the analytics dashboard. Both surfaces now
 * share a single algorithm, eliminating the previous divergence between
 * raw engagement-count scoring (old getBestTimes) and rate-normalized
 * scoring (AnalyticsEngine).
 *
 * Returns hardcoded fallback slots when insufficient data (<5 posts).
 */
export async function getBestTimes(userId: string): Promise<TimeSlot[]> {
  const buckets = await AnalyticsEngine.getBestTimesToPost(userId);

  if (buckets.length === 0) {
    return FALLBACK_TIMES;
  }

  return buckets.slice(0, 3).map(({ day, hour, score }) => ({ day, hour, score }));
}
