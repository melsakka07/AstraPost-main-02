import "server-only";

import { and, gte, lte, sql } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { aiGenerations } from "@/lib/schema";
import { sendEmail } from "@/lib/services/email";

const CRON_SECRET = process.env.CRON_SECRET;

// Conservative weighted average pricing estimate.
// Input:  $2  / 1M tokens
// Output: $8  / 1M tokens
// Simple average: $5 / 1M tokens (since `tokensUsed` aggregates both directions).
const COST_PER_1M_TOKENS = 5; // USD

function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

export async function GET(_req: Request) {
  const authHeader = _req.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return ApiError.unauthorized();
  }

  try {
    const { start, end } = getTodayRange();
    const dayLabel = start.toISOString().slice(0, 10); // YYYY-MM-DD

    const [result] = await db
      .select({ totalTokens: sql<number>`COALESCE(SUM(${aiGenerations.tokensUsed}), 0)` })
      .from(aiGenerations)
      .where(and(gte(aiGenerations.createdAt, start), lte(aiGenerations.createdAt, end)));

    const totalTokens = Number(result?.totalTokens ?? 0);
    const spend = (totalTokens / 1_000_000) * COST_PER_1M_TOKENS;
    const budget = Number(process.env.AI_DAILY_BUDGET_USD) || 50;
    const exceeded = spend > budget;

    // Always log the daily spend
    if (exceeded) {
      logger.warn("ai_daily_budget_exceeded", { spend, budget, date: dayLabel });
    } else {
      logger.info("ai_daily_budget_check", { spend, budget, date: dayLabel });
    }

    // Send alert email if budget exceeded
    if (exceeded) {
      const opsEmail = process.env.RESEND_OPS_EMAIL || process.env.RESEND_FROM_EMAIL;
      if (opsEmail) {
        await sendEmail({
          to: opsEmail,
          subject: `[AstraPost] AI Daily Budget Exceeded — ${dayLabel}`,
          text: [
            `AI spend for ${dayLabel} has exceeded the daily budget.`,
            "",
            `Spend: $${spend.toFixed(2)}`,
            `Budget: $${budget.toFixed(2)}`,
            `Total Tokens: ${totalTokens.toLocaleString()}`,
            "",
            "This is an automated alert from AstraPost AI Cost Monitor.",
          ].join("\n"),
          metadata: { type: "ai_cost_alarm", date: dayLabel, spend: spend.toFixed(2) },
        });
      }
    }

    return Response.json({
      spend: Math.round(spend * 100) / 100,
      budget,
      exceeded,
      date: dayLabel,
    });
  } catch (error) {
    logger.error("ai_cost_alarm_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to compute AI cost summary");
  }
}
