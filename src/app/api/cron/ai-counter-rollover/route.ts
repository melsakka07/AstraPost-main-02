import "server-only";

import { lt, sql } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getPlanLimits } from "@/lib/plan-limits";
import { userAiCounters, user } from "@/lib/schema";
import { getMonthWindow } from "@/lib/utils/time";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(_req: Request) {
  const authHeader = _req.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return ApiError.unauthorized();
  }

  const { start } = getMonthWindow();

  let rolled = 0;

  try {
    // Fetch all stale counters
    const staleRows = await db
      .select({
        userId: userAiCounters.userId,
        used: userAiCounters.used,
        periodStart: userAiCounters.periodStart,
      })
      .from(userAiCounters)
      .where(lt(userAiCounters.periodStart, start));

    logger.info("ai_counter_rollover_started", {
      staleCount: staleRows.length,
      periodStart: start.toISOString(),
    });

    for (const row of staleRows) {
      try {
        // Fetch the user's current plan
        const dbUser = await db.query.user.findFirst({
          where: sql`${user.id} = ${row.userId}`,
          columns: { plan: true },
        });

        const limits = getPlanLimits(dbUser?.plan);
        const limit =
          limits.aiGenerationsPerMonth === Infinity
            ? 0 // Unlimited users don't need a counter, reset to 0
            : limits.aiGenerationsPerMonth;

        await db
          .update(userAiCounters)
          .set({
            used: 0,
            limit,
            periodStart: start,
            updatedAt: new Date(),
          })
          .where(sql`${userAiCounters.userId} = ${row.userId}`);

        rolled++;
      } catch (userError) {
        logger.error("ai_counter_rollover_user_failed", {
          userId: row.userId,
          error: userError instanceof Error ? userError.message : String(userError),
        });
        // Continue with other users — don't fail the entire batch
      }
    }

    logger.info("ai_counter_rollover_completed", { rolled });
  } catch (error) {
    logger.error("ai_counter_rollover_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("AI counter rollover failed");
  }

  return Response.json({ rolled });
}
