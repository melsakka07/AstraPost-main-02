import "server-only";

import { timingSafeEqual } from "node:crypto";
import { and, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { PLAN_LIMITS } from "@/lib/plan-limits";
import { aiGenerations, user } from "@/lib/schema";

const CRON_SECRET = process.env.CRON_SECRET;

function verifyCronSecret(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  if (!CRON_SECRET || !authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  const secretBuf = Buffer.from(CRON_SECRET);
  const tokenBuf = Buffer.from(token);
  return tokenBuf.length === secretBuf.length && timingSafeEqual(tokenBuf, secretBuf);
}

export async function POST(req: Request) {
  if (!verifyCronSecret(req)) {
    return ApiError.unauthorized();
  }

  const results: Record<string, number> = {};
  let totalDeleted = 0;

  try {
    // Trial users are stored with plan = "free" but get the trial retention
    // window (90 days, not free's 7 days) while their trial is active. Iterate
    // ("free", "trial", "pro_monthly", "pro_annual", "agency") — the "free"
    // branch filters out active-trial users, and the "trial" branch picks them
    // up with the correct retention window.
    const buckets = ["free", "trial", "pro_monthly", "pro_annual", "agency"] as const;
    const now = new Date();

    for (const plan of buckets) {
      const limits = PLAN_LIMITS[plan];

      // Skip plans with infinite analytics retention
      if (limits.analyticsRetentionDays === Infinity) {
        results[plan] = 0;
        continue;
      }

      const retentionMs = limits.analyticsRetentionDays * 24 * 60 * 60 * 1000;
      const cutoff = new Date(Date.now() - retentionMs);

      // Fetch users for this bucket. Trial = stored plan "free" with an active
      // trial window; Free = stored plan "free" with no/expired trial.
      const usersOnPlan =
        plan === "trial"
          ? await db
              .select({ id: user.id })
              .from(user)
              .where(and(eq(user.plan, "free"), gte(user.trialEndsAt, now)))
          : plan === "free"
            ? await db
                .select({ id: user.id })
                .from(user)
                .where(
                  and(
                    eq(user.plan, "free"),
                    or(isNull(user.trialEndsAt), lt(user.trialEndsAt, now))
                  )
                )
            : await db.select({ id: user.id }).from(user).where(eq(user.plan, plan));

      if (usersOnPlan.length === 0) {
        results[plan] = 0;
        continue;
      }

      const userIds = usersOnPlan.map((u) => u.id);

      // Delete AI generation records older than the retention window
      const deleted = await db
        .delete(aiGenerations)
        .where(and(inArray(aiGenerations.userId, userIds), lt(aiGenerations.createdAt, cutoff)))
        .returning({ id: aiGenerations.id });

      results[plan] = deleted.length;
      totalDeleted += deleted.length;

      logger.info("analytics_cleanup_plan_completed", {
        plan,
        deletedCount: deleted.length,
        userCount: usersOnPlan.length,
        retentionDays: limits.analyticsRetentionDays,
        cutoffDate: cutoff.toISOString(),
      });
    }

    logger.info("analytics_cleanup_finished", {
      totalDeleted,
      planBreakdown: results,
    });
  } catch (error) {
    logger.error("analytics_cleanup_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Analytics cleanup failed");
  }

  return Response.json({ deleted: results, totalDeleted });
}
