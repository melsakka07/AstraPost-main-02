import "server-only";

import { and, gte, lte, sql, isNotNull, isNull } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { aiGenerations } from "@/lib/schema";
import { estimateCost, MODEL_PRICING } from "@/lib/services/ai-quota";
import { sendEmail } from "@/lib/services/email";

const CRON_SECRET = process.env.CRON_SECRET;

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

    // Phase 2: prefer cost_estimate_cents for rows that have it;
    // fall back to token-based estimation for rows where cost is null.
    // Also fetch per-model breakdown for richer alert detail.
    const [summary] = await db
      .select({
        totalTokens: sql<number>`COALESCE(SUM(${aiGenerations.tokensUsed}), 0)`,
        knownCostCents: sql<number>`COALESCE(SUM(${aiGenerations.costEstimateCents}), 0)`,
        rowsWithCost: sql<number>`COUNT(${aiGenerations.costEstimateCents})`,
        totalRows: sql<number>`COUNT(*)`,
      })
      .from(aiGenerations)
      .where(and(gte(aiGenerations.createdAt, start), lte(aiGenerations.createdAt, end)));

    const totalTokens = Number(summary?.totalTokens ?? 0);
    const knownCostCents = Number(summary?.knownCostCents ?? 0);
    const rowsWithCost = Number(summary?.rowsWithCost ?? 0);
    const totalRows = Number(summary?.totalRows ?? 0);

    // Fetch per-model breakdown for richer alerting
    const modelBreakdown = await db
      .select({
        model: aiGenerations.model,
        tokensUsed: sql<number>`COALESCE(SUM(${aiGenerations.tokensUsed}), 0)`,
        costCents: sql<number>`COALESCE(SUM(${aiGenerations.costEstimateCents}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(aiGenerations)
      .where(
        and(
          gte(aiGenerations.createdAt, start),
          lte(aiGenerations.createdAt, end),
          isNotNull(aiGenerations.model)
        )
      )
      .groupBy(aiGenerations.model);

    // Estimate cost for rows missing cost_estimate_cents
    let estimatedCentsFromTokens = 0;
    if (rowsWithCost < totalRows) {
      // Fetch token breakdown for rows WITH model but WITHOUT cost estimate
      const unestimated = await db
        .select({
          model: aiGenerations.model,
          tokensUsed: sql<number>`COALESCE(SUM(${aiGenerations.tokensUsed}), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(aiGenerations)
        .where(
          and(
            gte(aiGenerations.createdAt, start),
            lte(aiGenerations.createdAt, end),
            isNull(aiGenerations.costEstimateCents),
            isNotNull(aiGenerations.model)
          )
        )
        .groupBy(aiGenerations.model);

      for (const row of unestimated) {
        const model = row.model ?? "unknown";
        // For unknown model, use a conservative $3/1M average
        if (model in MODEL_PRICING) {
          // Tokens are already combined; assume 40/60 split input/output as heuristic
          const tokens = Number(row.tokensUsed ?? 0);
          const tokensIn = Math.round(tokens * 0.4);
          const tokensOut = Math.round(tokens * 0.6);
          estimatedCentsFromTokens += estimateCost(model, tokensIn, tokensOut) * 100;
        } else {
          // Conservative flat estimate for unknown models: $5/1M tokens
          estimatedCentsFromTokens += (Number(row.tokensUsed ?? 0) / 1_000_000) * 5 * 100;
        }
      }
    }

    const totalCostCents = knownCostCents + estimatedCentsFromTokens;
    const spend = totalCostCents / 100;
    const budget = Number(process.env.AI_DAILY_BUDGET_USD) || 50;
    const exceeded = spend > budget;

    // Always log the daily spend
    if (exceeded) {
      logger.warn("ai_daily_budget_exceeded", {
        spend: Math.round(spend * 100) / 100,
        budget,
        date: dayLabel,
        knownCostCents,
        estimatedCentsFromTokens: Math.round(estimatedCentsFromTokens),
      });
    } else {
      logger.info("ai_daily_budget_check", {
        spend: Math.round(spend * 100) / 100,
        budget,
        date: dayLabel,
        totalTokens,
        modelCount: modelBreakdown.length,
      });
    }

    // Send alert email if budget exceeded
    if (exceeded) {
      const opsEmail = process.env.RESEND_OPS_EMAIL || process.env.RESEND_FROM_EMAIL;
      if (opsEmail) {
        const breakdownLines = modelBreakdown
          .map(
            (m) =>
              `  ${m.model ?? "unknown"}: ${m.count} calls, ${(m.tokensUsed ?? 0).toLocaleString()} tokens, $${((Number(m.costCents) ?? 0) / 100).toFixed(2)}`
          )
          .join("\n");

        await sendEmail({
          to: opsEmail,
          subject: `[AstraPost] AI Daily Budget Exceeded — ${dayLabel}`,
          text: [
            `AI spend for ${dayLabel} has exceeded the daily budget.`,
            "",
            `Spend: $${spend.toFixed(2)}`,
            `Budget: $${budget.toFixed(2)}`,
            `Total Tokens: ${totalTokens.toLocaleString()}`,
            `Total Generations: ${totalRows}`,
            rowsWithCost < totalRows
              ? `Note: ${totalRows - rowsWithCost} rows estimated from token counts (cost not yet recorded).`
              : "",
            "",
            "Per-model breakdown:",
            breakdownLines || "  (no model data available)",
            "",
            "This is an automated alert from AstraPost AI Cost Monitor.",
          ].join("\n"),
          metadata: {
            type: "ai_cost_alarm",
            date: dayLabel,
            spend: spend.toFixed(2),
          },
        });
      }
    }

    return Response.json({
      spend: Math.round(spend * 100) / 100,
      budget,
      exceeded,
      date: dayLabel,
      totalTokens,
      totalGenerations: totalRows,
      knownCostCents,
      estimatedCentsFromTokens: Math.round(estimatedCentsFromTokens),
      models: modelBreakdown.map((m) => ({
        model: m.model,
        tokensUsed: Number(m.tokensUsed ?? 0),
        costCents: Number(m.costCents ?? 0),
        count: Number(m.count ?? 0),
      })),
    });
  } catch (error) {
    logger.error("ai_cost_alarm_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to compute AI cost summary");
  }
}
