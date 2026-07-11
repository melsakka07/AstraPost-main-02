import "server-only";

import { timingSafeEqual } from "node:crypto";
import { and, gte, lte, sql, eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { xApiUsageLog, teamXBudgetCounters, user } from "@/lib/schema";
import { sendEmail } from "@/lib/services/email";

const CRON_SECRET = process.env.CRON_SECRET;

function verifyCronSecret(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  if (!CRON_SECRET || !authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  const secretBuf = Buffer.from(CRON_SECRET);
  const tokenBuf = Buffer.from(token);
  return tokenBuf.length === secretBuf.length && timingSafeEqual(tokenBuf, secretBuf);
}

function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

export async function GET(_req: Request) {
  if (!verifyCronSecret(_req)) {
    return ApiError.unauthorized();
  }

  try {
    const { start, end } = getTodayRange();
    const dayLabel = start.toISOString().slice(0, 10); // YYYY-MM-DD

    // Today's total X API spend in micro (USD x10^4)
    const [summary] = await db
      .select({
        totalMicro: sql<number>`COALESCE(SUM(${xApiUsageLog.costMicro}), 0)`,
        totalRows: sql<number>`COUNT(*)`,
      })
      .from(xApiUsageLog)
      .where(and(gte(xApiUsageLog.createdAt, start), lte(xApiUsageLog.createdAt, end)));

    const todaySpendMicro = Number(summary?.totalMicro ?? 0);
    const totalRows = Number(summary?.totalRows ?? 0);

    // Teams approaching or exceeding their monthly X budget (>= 80% used)
    const teamsAtRisk = await db
      .select({
        teamId: teamXBudgetCounters.teamId,
        email: user.email,
        usedMicro: teamXBudgetCounters.usedMicro,
        limitMicro: teamXBudgetCounters.limitMicro,
      })
      .from(teamXBudgetCounters)
      .innerJoin(user, eq(teamXBudgetCounters.teamId, user.id))
      .where(
        and(
          gte(teamXBudgetCounters.usedMicro, 1),
          sql`${teamXBudgetCounters.limitMicro} != -1`,
          sql`(${teamXBudgetCounters.usedMicro} * 100 / NULLIF(${teamXBudgetCounters.limitMicro}, 1)) >= 80`
        )
      );

    const spend = todaySpendMicro / 10000;
    const budget = Number(process.env.X_DAILY_BUDGET_USD) || 10;
    const exceeded = spend > budget || teamsAtRisk.length > 0;

    // Always log the daily spend
    if (exceeded) {
      logger.warn("x_daily_budget_exceeded", {
        spend: Math.round(spend * 10000) / 10000,
        budget,
        date: dayLabel,
        todaySpendMicro,
        totalRows,
        teamsAtRiskCount: teamsAtRisk.length,
      });
    } else {
      logger.info("x_daily_budget_check", {
        spend: Math.round(spend * 10000) / 10000,
        budget,
        date: dayLabel,
        todaySpendMicro,
        totalRows,
        teamsAtRiskCount: teamsAtRisk.length,
      });
    }

    // Send alert email if budget exceeded or teams at risk
    if (exceeded) {
      const opsEmail = process.env.RESEND_OPS_EMAIL || process.env.RESEND_FROM_EMAIL;
      if (opsEmail) {
        const teamsAtRiskLines = teamsAtRisk
          .map((t) => {
            const used = Number(t.usedMicro ?? 0);
            const limit = Number(t.limitMicro ?? 1);
            const pct = Math.round((used / limit) * 10000) / 100;
            return `  ${t.email ?? "Unknown"}: ${used.toLocaleString()} / ${limit.toLocaleString()} micro (${pct}%)`;
          })
          .join("\n");

        try {
          await sendEmail({
            to: opsEmail,
            subject: `[AstraPost] X API Budget Alert — ${dayLabel}`,
            text: [
              `X API spend for ${dayLabel} requires attention.`,
              "",
              `Today's Spend: $${spend.toFixed(4)}`,
              `Daily Budget: $${budget.toFixed(2)}`,
              `Total Requests: ${totalRows}`,
              teamsAtRisk.length > 0
                ? `\nTeams at >=80% of monthly X budget:\n${teamsAtRiskLines}`
                : "",
              "",
              "This is an automated alert from AstraPost X API Cost Monitor.",
            ].join("\n"),
            metadata: {
              type: "x_cost_alarm",
              date: dayLabel,
              spend: spend.toFixed(4),
            },
          });
        } catch (emailErr) {
          logger.error("x_cost_alarm_email_failed", {
            date: dayLabel,
            error: emailErr instanceof Error ? emailErr.message : String(emailErr),
          });
        }
      }
    }

    return Response.json({
      spend: Math.round(spend * 10000) / 10000,
      budget,
      exceeded,
      date: dayLabel,
      todaySpendMicro,
      totalRequests: totalRows,
      teamsAtRisk: teamsAtRisk.map((t) => ({
        teamId: t.teamId,
        email: t.email ?? "Unknown",
        usedMicro: Number(t.usedMicro ?? 0),
        limitMicro: Number(t.limitMicro ?? 0),
        pctUsed:
          Number(t.limitMicro ?? 0) > 0
            ? Math.round((Number(t.usedMicro ?? 0) / Number(t.limitMicro ?? 0)) * 10000) / 100
            : 0,
      })),
    });
  } catch (error) {
    logger.error("x_cost_alarm_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to compute X API cost summary");
  }
}
