import "server-only";

import { sql, gte, and, desc, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { xApiUsageLog, teamXBudgetCounters, user } from "@/lib/schema";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DailyXSpend {
  date: string;
  costMicro: number;
  count: number;
}

export interface XActionBreakdown {
  action: string;
  costMicro: number;
  count: number;
  pct: number;
}

export interface TeamXSpend {
  teamId: string;
  email: string;
  usedMicro: number;
  limitMicro: number;
  pctUsed: number;
  plan: string | null;
}

export interface TopXSpender {
  teamId: string;
  email: string;
  costMicro: number;
  count: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Daily Spend Queries ────────────────────────────────────────────────────────

export async function getDailyXSpend(days: number): Promise<DailyXSpend[]> {
  const cutoff = daysAgo(days);

  try {
    const rows = await db
      .select({
        date: sql<string>`DATE(${xApiUsageLog.createdAt})`,
        costMicro: sql<number>`COALESCE(SUM(${xApiUsageLog.costMicro}), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(xApiUsageLog)
      .where(gte(xApiUsageLog.createdAt, cutoff))
      .groupBy(sql`DATE(${xApiUsageLog.createdAt})`)
      .orderBy(asc(sql`DATE(${xApiUsageLog.createdAt})`));

    return rows.map((r) => ({
      date: String(r.date).slice(0, 10),
      costMicro: Number(r.costMicro ?? 0),
      count: Number(r.count ?? 0),
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to fetch daily X spend: ${message.slice(0, 200)}`, { error, days });
    throw error;
  }
}

export async function getTodayXSpend(): Promise<number> {
  const startOfToday = today();

  try {
    const [row] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${xApiUsageLog.costMicro}), 0)`,
      })
      .from(xApiUsageLog)
      .where(gte(xApiUsageLog.createdAt, startOfToday));

    return Number(row?.total ?? 0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to fetch today X spend: ${message.slice(0, 200)}`, { error });
    throw error;
  }
}

export async function getTotalXSpend(days: number): Promise<number> {
  const cutoff = daysAgo(days);

  try {
    const [row] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${xApiUsageLog.costMicro}), 0)`,
      })
      .from(xApiUsageLog)
      .where(gte(xApiUsageLog.createdAt, cutoff));

    return Number(row?.total ?? 0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to fetch total X spend: ${message.slice(0, 200)}`, { error, days });
    throw error;
  }
}

// ── Action Breakdown ───────────────────────────────────────────────────────────

export async function getXActionBreakdown(days: number): Promise<XActionBreakdown[]> {
  const cutoff = daysAgo(days);

  try {
    const rows = await db
      .select({
        action: xApiUsageLog.action,
        costMicro: sql<number>`COALESCE(SUM(${xApiUsageLog.costMicro}), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(xApiUsageLog)
      .where(and(gte(xApiUsageLog.createdAt, cutoff), sql`${xApiUsageLog.action} IS NOT NULL`))
      .groupBy(xApiUsageLog.action)
      .orderBy(desc(sql`COALESCE(SUM(${xApiUsageLog.costMicro}), 0)`));

    const totalCost = rows.reduce((sum, r) => sum + Number(r.costMicro ?? 0), 0);

    return rows.map((r) => ({
      action: r.action ?? "Unknown",
      costMicro: Number(r.costMicro ?? 0),
      count: Number(r.count ?? 0),
      pct: totalCost > 0 ? Math.round((Number(r.costMicro ?? 0) / totalCost) * 10000) / 100 : 0,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to fetch X action breakdown: ${message.slice(0, 200)}`, { error, days });
    throw error;
  }
}

// ── Team Budget Summaries ──────────────────────────────────────────────────────

export async function getTeamXBudgetSummaries(): Promise<TeamXSpend[]> {
  try {
    const rows = await db
      .select({
        teamId: teamXBudgetCounters.teamId,
        email: user.email,
        usedMicro: teamXBudgetCounters.usedMicro,
        limitMicro: teamXBudgetCounters.limitMicro,
        plan: user.plan,
      })
      .from(teamXBudgetCounters)
      .innerJoin(user, eq(teamXBudgetCounters.teamId, user.id));

    return rows.map((r) => {
      const used = Number(r.usedMicro ?? 0);
      const limit = Number(r.limitMicro ?? 0);
      const pctUsed = limit === -1 ? 0 : limit > 0 ? Math.round((used / limit) * 10000) / 100 : 0;

      return {
        teamId: r.teamId,
        email: r.email ?? "Unknown",
        usedMicro: used,
        limitMicro: limit,
        pctUsed,
        plan: (r.plan as string) ?? null,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to fetch team X budget summaries: ${message.slice(0, 200)}`, { error });
    throw error;
  }
}

// ── Top Spenders ───────────────────────────────────────────────────────────────

export async function getTopXSpenders(days: number, limit: number = 10): Promise<TopXSpender[]> {
  const cutoff = daysAgo(days);

  try {
    const rows = await db
      .select({
        teamId: xApiUsageLog.teamId,
        email: user.email,
        costMicro: sql<number>`COALESCE(SUM(${xApiUsageLog.costMicro}), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(xApiUsageLog)
      .innerJoin(user, eq(xApiUsageLog.teamId, user.id))
      .where(gte(xApiUsageLog.createdAt, cutoff))
      .groupBy(xApiUsageLog.teamId, user.email)
      .orderBy(desc(sql`COALESCE(SUM(${xApiUsageLog.costMicro}), 0)`))
      .limit(limit);

    return rows.map((r) => ({
      teamId: r.teamId,
      email: r.email ?? "Unknown",
      costMicro: Number(r.costMicro ?? 0),
      count: Number(r.count ?? 0),
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to fetch top X spenders: ${message.slice(0, 200)}`, {
      error,
      days,
      limit,
    });
    throw error;
  }
}
