import { eq, and, isNotNull, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts, tweetAnalytics, tweets } from "@/lib/schema";

export interface TimeSlot {
  day: number; // 0=Sun, 6=Sat
  hour: number; // 0-23
  score: number;
}

export async function getBestTimes(userId: string): Promise<TimeSlot[]> {
  try {
    const results = await db
      .select({
        day: sql<number>`extract(dow from ${posts.publishedAt})`.as("day"),
        hour: sql<number>`extract(hour from ${posts.publishedAt})`.as("hour"),
        totalEngagement: sql<number>`sum(${tweetAnalytics.likes} + ${tweetAnalytics.retweets} + ${tweetAnalytics.replies})`,
        count: sql<number>`count(*)`
      })
      .from(tweetAnalytics)
      .innerJoin(tweets, eq(tweetAnalytics.tweetId, tweets.id))
      .innerJoin(posts, eq(tweets.postId, posts.id))
      .where(and(eq(posts.userId, userId), isNotNull(posts.publishedAt)))
      .groupBy(sql`extract(dow from ${posts.publishedAt})`, sql`extract(hour from ${posts.publishedAt})`)
      .orderBy(desc(sql`sum(${tweetAnalytics.likes} + ${tweetAnalytics.retweets} + ${tweetAnalytics.replies}) / count(*)`))
      .limit(3);

    if (results.length === 0) {
      return [
        { day: 0, hour: 20, score: 80 }, // Sun 8PM
        { day: 2, hour: 9, score: 75 },  // Tue 9AM
        { day: 4, hour: 19, score: 70 }, // Thu 7PM
      ];
    }

    return results.map(r => ({
      day: Number(r.day),
      hour: Number(r.hour),
      score: Math.round(Number(r.totalEngagement) / Number(r.count))
    }));
  } catch (error) {
    console.error("Error fetching best times:", error);
    // Fallback on error
    return [
      { day: 0, hour: 20, score: 80 },
      { day: 2, hour: 9, score: 75 },
      { day: 4, hour: 19, score: 70 },
    ];
  }
}
