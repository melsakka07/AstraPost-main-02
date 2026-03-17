import { headers } from "next/headers";
import { and, desc, eq, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  checkBestTimesAccessDetailed,
  createPlanLimitResponse,
} from "@/lib/middleware/require-plan";
import { posts, tweetAnalytics, tweets } from "@/lib/schema";

interface SlotScore {
  day: number;       // 0=Sun … 6=Sat
  hour: number;      // 0–23
  score: number;
  count: number;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function GET(_req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return new Response("Unauthorized", { status: 401 });

    const access = await checkBestTimesAccessDetailed(session.user.id);
    if (!access.allowed) return createPlanLimitResponse(access);

    // Fetch tweets published in the last 90 days with analytics
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const rows = await db
      .select({
        publishedAt: posts.publishedAt,
        engagementRate: tweetAnalytics.engagementRate,
        impressions: tweetAnalytics.impressions,
      })
      .from(tweetAnalytics)
      .innerJoin(tweets, eq(tweetAnalytics.tweetId, tweets.id))
      .innerJoin(posts, eq(tweets.postId, posts.id))
      .where(
        and(
          eq(posts.userId, session.user.id),
          gte(posts.publishedAt, cutoff)
        )
      )
      .orderBy(desc(posts.publishedAt))
      .limit(200);

    if (rows.length < 5) {
      return Response.json({
        insufficientData: true,
        message: "Not enough data yet. Publish more posts to unlock Best Time predictions.",
        slots: [],
      });
    }

    // Aggregate engagement by day-of-week + hour with recency bias
    // Posts in the last 30 days get 2× weight
    const recent30 = new Date();
    recent30.setDate(recent30.getDate() - 30);

    const slotMap = new Map<string, SlotScore>();

    for (const row of rows) {
      if (!row.publishedAt) continue;
      const date = new Date(row.publishedAt);
      const day = date.getDay();
      const hour = date.getHours();
      const key = `${day}-${hour}`;

      const weight = date >= recent30 ? 2 : 1;
      const engagement = Number(row.engagementRate ?? 0);

      const existing = slotMap.get(key) ?? { day, hour, score: 0, count: 0 };
      existing.score += engagement * weight;
      existing.count += 1;
      slotMap.set(key, existing);
    }

    // Normalize scores by count and sort descending
    const sorted = Array.from(slotMap.values())
      .map((s) => ({ ...s, avgScore: s.count > 0 ? s.score / s.count : 0 }))
      .sort((a, b) => b.avgScore - a.avgScore);

    // Return top 3 unique day-hour slots
    const top3 = sorted.slice(0, 3).map((s) => {
      const ampm = s.hour >= 12 ? "PM" : "AM";
      const displayHour = s.hour % 12 === 0 ? 12 : s.hour % 12;
      return {
        day: DAY_NAMES[s.day],
        hour: s.hour,
        label: `${DAY_NAMES[s.day]} at ${displayHour}:00 ${ampm}`,
        confidence: Math.min(100, Math.round((s.count / rows.length) * 100 * 3)),
        avgEngagement: Math.round(s.avgScore * 100) / 100,
      };
    });

    return Response.json({
      insufficientData: false,
      dataPoints: rows.length,
      slots: top3,
    });
  } catch (error) {
    console.error("Best time error:", error);
    return new Response(JSON.stringify({ error: "Failed to compute best times" }), {
      status: 500,
    });
  }
}
