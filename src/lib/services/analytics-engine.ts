import { db } from "@/lib/db";
import { posts, tweetAnalytics, tweets } from "@/lib/schema";
import { and, asc, eq, gte, isNotNull } from "drizzle-orm";

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
   */
  static async getBestTimesToPost(userId: string): Promise<BestTimeBucket[]> {
    // 1. Fetch posts with analytics from the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const postPerformance = await db
      .select({
        publishedAt: posts.publishedAt,
        impressions: tweetAnalytics.impressions,
        engagementRate: tweetAnalytics.engagementRate,
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
      );

    if (postPerformance.length < 5) {
      return []; // Not enough data
    }

    // 2. Aggregate by (Day, Hour)
    const buckets = new Map<string, { totalRate: number; count: number }>();

    for (const post of postPerformance) {
      if (!post.publishedAt) continue;
      const date = new Date(post.publishedAt);
      const day = date.getDay();
      const hour = date.getHours();
      const key = `${day}-${hour}`;

      const current = buckets.get(key) || { totalRate: 0, count: 0 };
      // Parse engagement rate string to float
      const rate = parseFloat(post.engagementRate?.toString() || "0");
      
      buckets.set(key, {
        totalRate: current.totalRate + rate,
        count: current.count + 1
      });
    }

    // 3. Calculate Average Score
    const result: BestTimeBucket[] = [];
    let maxScore = 0;

    buckets.forEach((val, key) => {
      const [day = 0, hour = 0] = key.split("-").map(Number);
      const avgRate = val.totalRate / val.count;
      // Weight by count slightly to favor consistent performance? 
      // For now, just raw engagement rate average.
      result.push({
        day,
        hour,
        score: avgRate,
        count: val.count
      });
      if (avgRate > maxScore) maxScore = avgRate;
    });

    // 4. Normalize Scores 0-100
    if (maxScore > 0) {
      return result.map(r => ({
        ...r,
        score: Math.round((r.score / maxScore) * 100)
      })).sort((a, b) => b.score - a.score);
    }

    return result;
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
            rate: tweetAnalytics.engagementRate
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

    return trends.map(t => ({
        date: t.date?.toISOString().split('T')[0],
        value: parseFloat(t.rate?.toString() || "0")
    }));
  }
}
