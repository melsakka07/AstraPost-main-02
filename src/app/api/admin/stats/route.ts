import { count, eq, gte, and, sql, isNull } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { user, posts, aiGenerations, jobRuns } from "@/lib/schema";

// ── GET /api/admin/stats ──────────────────────────────────────────────────────

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      [totalUsersRow],
      [newUsers7dRow],
      [totalPostsPublishedRow],
      [postsPublished7dRow],
      [totalAiGenerationsRow],
      [aiGenerationsThisMonthRow],
      [activeAiUsersRow],
      [failedJobs24hRow],
      [successfulJobs24hRow],
    ] = await Promise.all([
      db
        .select({ value: count(user.id) })
        .from(user)
        .where(isNull(user.deletedAt)),
      db
        .select({ value: count(user.id) })
        .from(user)
        .where(and(isNull(user.deletedAt), gte(user.createdAt, sevenDaysAgo))),
      db
        .select({ value: count(posts.id) })
        .from(posts)
        .where(eq(posts.status, "published")),
      db
        .select({ value: count(posts.id) })
        .from(posts)
        .where(and(eq(posts.status, "published"), gte(posts.publishedAt, sevenDaysAgo))),
      db.select({ value: count(aiGenerations.id) }).from(aiGenerations),
      db
        .select({ value: count(aiGenerations.id) })
        .from(aiGenerations)
        .where(gte(aiGenerations.createdAt, startOfMonth)),
      // Active AI users = distinct users who ran AI in last 30 days
      db
        .select({ value: sql<number>`count(distinct ${aiGenerations.userId})` })
        .from(aiGenerations)
        .where(gte(aiGenerations.createdAt, thirtyDaysAgo)),
      db
        .select({ value: count(jobRuns.id) })
        .from(jobRuns)
        .where(and(eq(jobRuns.status, "failed"), gte(jobRuns.startedAt, oneDayAgo))),
      db
        .select({ value: count(jobRuns.id) })
        .from(jobRuns)
        .where(and(eq(jobRuns.status, "success"), gte(jobRuns.startedAt, oneDayAgo))),
    ]);

    return Response.json({
      data: {
        users: {
          total: Number(totalUsersRow?.value ?? 0),
          newLast7d: Number(newUsers7dRow?.value ?? 0),
        },
        posts: {
          totalPublished: Number(totalPostsPublishedRow?.value ?? 0),
          publishedLast7d: Number(postsPublished7dRow?.value ?? 0),
        },
        ai: {
          totalGenerations: Number(totalAiGenerationsRow?.value ?? 0),
          generationsThisMonth: Number(aiGenerationsThisMonthRow?.value ?? 0),
          activeUsersLast30d: Number(activeAiUsersRow?.value ?? 0),
        },
        jobs: {
          failedLast24h: Number(failedJobs24hRow?.value ?? 0),
          successfulLast24h: Number(successfulJobs24hRow?.value ?? 0),
        },
      },
    });
  } catch (err) {
    logger.error("[stats] Error", { error: err });
    return ApiError.internal("Failed to load admin stats");
  }
}
