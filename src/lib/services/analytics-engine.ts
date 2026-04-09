import { and, asc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, tweetAnalytics, tweets } from "@/lib/schema";

export type BestTimeBucket = {
  day: number; // 0-6 (Sun-Sat)
  hour: number; // 0-23
  score: number; // Normalized 0-100 score based on engagement
  count: number; // Number of posts in this bucket
};

export class AnalyticsEngine {
  /**
   * Calculates the best time to post based on historical performance.
   * Currently uses Twitter data as the primary source.
   *
   * Aggregation is performed entirely in SQL (GROUP BY day-of-week + hour,
   * AVG engagement rate, COUNT). The result is bounded at 168 rows regardless
   * of history depth — previously all matching rows were fetched into JS memory
   * and aggregated there, which scaled unboundedly for high-volume accounts.
   */
  static async getBestTimesToPost(userId: string): Promise<BestTimeBucket[]> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Push GROUP BY (day-of-week, hour) + AVG + COUNT into the database.
    // ::float8 ensures the pg driver returns a native JS number rather than
    // the Postgres `numeric` type which the driver serialises as a string.
    // LIMIT 168 = 24 hours × 7 days — the theoretical maximum of distinct
    // time buckets, so it never silently drops valid data.
    const rows = await db
      .select({
        day: sql<number>`EXTRACT(DOW FROM ${posts.publishedAt})::int`,
        hour: sql<number>`EXTRACT(HOUR FROM ${posts.publishedAt})::int`,
        avgRate: sql<number>`AVG(${tweetAnalytics.engagementRate}::float8)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(tweetAnalytics)
      .innerJoin(tweets, eq(tweetAnalytics.tweetId, tweets.id))
      .innerJoin(posts, eq(tweets.postId, posts.id))
      .where(
        and(
          eq(posts.userId, userId),
          gte(posts.publishedAt, ninetyDaysAgo),
          isNotNull(posts.publishedAt),
          // Filter out posts with very low impressions to avoid skewing data
          gte(tweetAnalytics.impressions, 10)
        )
      )
      .groupBy(
        sql`EXTRACT(DOW FROM ${posts.publishedAt})`,
        sql`EXTRACT(HOUR FROM ${posts.publishedAt})`
      )
      .orderBy(sql`AVG(${tweetAnalytics.engagementRate}::float8) DESC`)
      .limit(168); // 24h × 7 days = max distinct buckets

    // Preserve original threshold: require at least 5 underlying data points
    // across all buckets before returning recommendations.
    const totalDataPoints = rows.reduce((sum, r) => sum + Number(r.count), 0);
    if (totalDataPoints < 5) {
      return []; // Not enough data
    }

    // Rows are already sorted DESC by avgRate, so rows[0] holds the maximum.
    // One-pass normalisation — no second scan needed.
    const maxRate = Number(rows[0]?.avgRate ?? 0);
    if (maxRate <= 0) return [];

    return rows.map((r) => ({
      day: r.day,
      hour: r.hour,
      score: Math.round((Number(r.avgRate) / maxRate) * 100),
      count: Number(r.count),
    }));
  }

  /**
   * Calculates overall engagement rate trend for the user.
   */
  static async getEngagementTrends(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // This is simplified. Ideally we want daily snapshots of avg engagement.
    // For now, we'll plot individual post engagement rates over time.

    const trends = await db
      .select({
        date: posts.publishedAt,
        rate: tweetAnalytics.engagementRate,
      })
      .from(tweetAnalytics)
      .innerJoin(tweets, eq(tweetAnalytics.tweetId, tweets.id))
      .innerJoin(posts, eq(tweets.postId, posts.id))
      .where(
        and(
          eq(posts.userId, userId),
          gte(posts.publishedAt, startDate),
          isNotNull(posts.publishedAt)
        )
      )
      .orderBy(asc(posts.publishedAt));

    return trends.map((t) => ({
      date: t.date?.toISOString().split("T")[0],
      value: parseFloat(t.rate?.toString() || "0"),
    }));
  }
}
