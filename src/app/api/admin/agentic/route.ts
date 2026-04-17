import { and, desc, eq, ilike, count, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { agenticPosts, tweets } from "@/lib/schema";

// ── Query params schema ───────────────────────────────────────────────────────

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(["pending", "running", "completed", "failed"]).optional(),
  topic: z.string().max(200).optional(),
});

// ── GET /api/admin/agentic ──────────────────────────────────────────────────────

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { limit, offset, status, topic } = parsed.data;

    // Build WHERE conditions
    const conditions: (SQL | undefined)[] = [];

    if (status) {
      // Map UI status to DB status
      const statusMap: Record<string, string> = {
        completed: "completed",
        failed: "failed",
        pending: "generating",
        running: "processing",
      };
      const dbStatus = statusMap[status] ?? status;

      conditions.push(eq(agenticPosts.status, dbStatus));
    }

    if (topic) {
      conditions.push(ilike(agenticPosts.topic, `%${topic}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total
    const countResult = await db.select({ total: count() }).from(agenticPosts).where(where);
    const total = countResult[0]?.total ?? 0;

    // Fetch sessions with tweet counts via aggregation JOIN
    const sessionsPaginated = await db
      .select({
        id: agenticPosts.id,
        topic: agenticPosts.topic,
        status: agenticPosts.status,
        qualityScore: agenticPosts.qualityScore,
        startedAt: agenticPosts.createdAt,
        completedAt: agenticPosts.updatedAt,
        postsGenerated: sql<number>`cast(count(distinct ${tweets.id}) as int)`,
      })
      .from(agenticPosts)
      .leftJoin(tweets, eq(agenticPosts.postId, tweets.postId))
      .where(where)
      .groupBy(
        agenticPosts.id,
        agenticPosts.topic,
        agenticPosts.status,
        agenticPosts.qualityScore,
        agenticPosts.createdAt,
        agenticPosts.updatedAt
      )
      .orderBy(desc(agenticPosts.createdAt))
      .limit(limit)
      .offset(offset);

    const enriched = sessionsPaginated.map((session) => ({
      ...session,
      qualityScore: session.qualityScore ?? 0,
    }));

    // Calculate successRate
    const allSessionsCount = await db.select({ total: count() }).from(agenticPosts);
    const completedCount = await db
      .select({ total: count() })
      .from(agenticPosts)
      .where(eq(agenticPosts.status, "completed"));

    const successRate =
      (allSessionsCount[0]?.total ?? 0 > 0)
        ? Math.round(((completedCount[0]?.total ?? 0) / (allSessionsCount[0]?.total ?? 0)) * 100)
        : 0;

    return Response.json({
      data: {
        totalSessions: Number(total),
        successRate,
        sessions: enriched,
        pagination: { offset, limit, total: Number(total) },
      },
    });
  } catch (err) {
    logger.error("[agentic] Error", { error: err });
    return ApiError.internal("Failed to load agentic sessions");
  }
}
