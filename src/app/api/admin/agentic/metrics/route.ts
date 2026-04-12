import { count, avg, eq } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { agenticPosts, tweets } from "@/lib/schema";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    const [totalSessions] = await db.select({ total: count() }).from(agenticPosts);

    const [completedSessions] = await db
      .select({ total: count() })
      .from(agenticPosts)
      .where(eq(agenticPosts.status, "completed"));

    const [avgQuality] = await db
      .select({ avg: avg(agenticPosts.qualityScore) })
      .from(agenticPosts)
      .where(eq(agenticPosts.status, "completed"));

    const [totalPosts] = await db
      .select({ total: count() })
      .from(tweets)
      .innerJoin(agenticPosts, eq(agenticPosts.postId, tweets.postId));

    const successRate =
      (totalSessions?.total ?? 0) > 0
        ? Math.round(((completedSessions?.total ?? 0) / (totalSessions?.total ?? 1)) * 100)
        : 0;

    return Response.json({
      data: {
        totalSessions: totalSessions?.total ?? 0,
        successRate,
        avgQualityScore: Math.round(Number(avgQuality?.avg ?? 0)),
        totalPostsGenerated: totalPosts?.total ?? 0,
      },
    });
  } catch (err) {
    console.error("[agentic/metrics] Error:", err);
    return ApiError.internal("Failed to load agentic metrics");
  }
}
