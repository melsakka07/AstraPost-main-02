import "server-only";

import { sql, gte, and, desc, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { aiGenerations, user } from "@/lib/schema";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DailyCost {
  date: string;
  cost: number;
  count: number;
}

export interface TopSpender {
  userId: string;
  name: string;
  cost: number;
  count: number;
}

export interface FeatureCost {
  subFeature: string;
  cost: number;
  count: number;
  avgCost: number;
}

export interface ModelMix {
  model: string;
  count: number;
  percentage: number;
}

export interface RouteLatency {
  subFeature: string;
  count: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface ModelLatency {
  model: string;
  count: number;
  p50: number;
  p95: number;
}

export interface FallbackRateResult {
  count: number;
  fallbackCount: number;
  percentage: number;
}

export interface FeedbackByVersion {
  promptVersion: string;
  positive: number;
  negative: number;
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

// ── Cost Queries ───────────────────────────────────────────────────────────────

export async function getDailyCost(days: number): Promise<DailyCost[]> {
  const cutoff = daysAgo(days);

  try {
    const rows = await db
      .select({
        date: sql<string>`DATE(${aiGenerations.createdAt})`,
        cost: sql<number>`COALESCE(SUM(${aiGenerations.costEstimateCents}), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(aiGenerations)
      .where(gte(aiGenerations.createdAt, cutoff))
      .groupBy(sql`DATE(${aiGenerations.createdAt})`)
      .orderBy(asc(sql`DATE(${aiGenerations.createdAt})`));

    return rows.map((r) => ({
      date: String(r.date).slice(0, 10),
      cost: Number(r.cost ?? 0),
      count: Number(r.count ?? 0),
    }));
  } catch (error) {
    logger.error("Failed to fetch daily cost", { error, days });
    return [];
  }
}

export async function getTotalCost(days: number): Promise<number> {
  const cutoff = daysAgo(days);

  try {
    const [row] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${aiGenerations.costEstimateCents}), 0)`,
      })
      .from(aiGenerations)
      .where(gte(aiGenerations.createdAt, cutoff));

    return Number(row?.total ?? 0);
  } catch (error) {
    logger.error("Failed to fetch total cost", { error, days });
    return 0;
  }
}

export async function getTodayCost(): Promise<number> {
  const startOfToday = today();

  try {
    const [row] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${aiGenerations.costEstimateCents}), 0)`,
      })
      .from(aiGenerations)
      .where(gte(aiGenerations.createdAt, startOfToday));

    return Number(row?.total ?? 0);
  } catch (error) {
    logger.error("Failed to fetch today cost", { error });
    return 0;
  }
}

export async function getTopSpenders(days: number, limit: number = 10): Promise<TopSpender[]> {
  const cutoff = daysAgo(days);

  try {
    const rows = await db
      .select({
        userId: aiGenerations.userId,
        name: user.name,
        cost: sql<number>`COALESCE(SUM(${aiGenerations.costEstimateCents}), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(aiGenerations)
      .innerJoin(user, eq(aiGenerations.userId, user.id))
      .where(gte(aiGenerations.createdAt, cutoff))
      .groupBy(aiGenerations.userId, user.name)
      .orderBy(desc(sql`cost`))
      .limit(limit);

    return rows.map((r) => ({
      userId: r.userId,
      name: r.name ?? "Unknown",
      cost: Number(r.cost ?? 0),
      count: Number(r.count ?? 0),
    }));
  } catch (error) {
    logger.error("Failed to fetch top spenders", { error, days, limit });
    return [];
  }
}

export async function getCostByFeature(days: number): Promise<FeatureCost[]> {
  const cutoff = daysAgo(days);

  try {
    const rows = await db
      .select({
        subFeature: aiGenerations.subFeature,
        cost: sql<number>`COALESCE(SUM(${aiGenerations.costEstimateCents}), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(aiGenerations)
      .where(
        and(gte(aiGenerations.createdAt, cutoff), sql`${aiGenerations.subFeature} IS NOT NULL`)
      )
      .groupBy(aiGenerations.subFeature)
      .orderBy(desc(sql`cost`));

    return rows.map((r) => ({
      subFeature: r.subFeature ?? "Unknown",
      cost: Number(r.cost ?? 0),
      count: Number(r.count ?? 0),
      avgCost: Number(r.count ?? 0) > 0 ? Number(r.cost ?? 0) / Number(r.count ?? 0) : 0,
    }));
  } catch (error) {
    logger.error("Failed to fetch cost by feature", { error, days });
    return [];
  }
}

export async function getModelMix(days: number): Promise<ModelMix[]> {
  const cutoff = daysAgo(days);

  try {
    const rows = await db
      .select({
        model: aiGenerations.model,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(aiGenerations)
      .where(and(gte(aiGenerations.createdAt, cutoff), sql`${aiGenerations.model} IS NOT NULL`))
      .groupBy(aiGenerations.model)
      .orderBy(desc(sql`count`));

    const totalCount = rows.reduce((sum, r) => sum + Number(r.count ?? 0), 0);

    return rows.map((r) => ({
      model: r.model ?? "Unknown",
      count: Number(r.count ?? 0),
      percentage: totalCount > 0 ? Math.round((Number(r.count ?? 0) / totalCount) * 100) : 0,
    }));
  } catch (error) {
    logger.error("Failed to fetch model mix", { error, days });
    return [];
  }
}

// ── Latency / SLO Queries ─────────────────────────────────────────────────────

export async function getLatencyByRoute(days: number): Promise<RouteLatency[]> {
  const cutoff = daysAgo(days);

  try {
    const result = await db.execute(sql`
      SELECT
        sub_feature,
        COUNT(*)::int AS count,
        ROUND(COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms), 0))::int AS p50,
        ROUND(COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 0))::int AS p95,
        ROUND(COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms), 0))::int AS p99
      FROM ai_generations
      WHERE created_at >= ${cutoff.toISOString()}
        AND latency_ms IS NOT NULL
        AND sub_feature IS NOT NULL
      GROUP BY sub_feature
      ORDER BY count DESC
    `);

    const rows = result as unknown as {
      rows: Array<{ sub_feature: string; count: number; p50: number; p95: number; p99: number }>;
    };

    return rows.rows.map((r) => ({
      subFeature: r.sub_feature ?? "Unknown",
      count: Number(r.count),
      p50: Number(r.p50),
      p95: Number(r.p95),
      p99: Number(r.p99),
    }));
  } catch (error) {
    logger.error("Failed to fetch latency by route", { error, days });
    return [];
  }
}

export async function getLatencyByModel(days: number): Promise<ModelLatency[]> {
  const cutoff = daysAgo(days);

  try {
    const result = await db.execute(sql`
      SELECT
        model,
        COUNT(*)::int AS count,
        ROUND(COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms), 0))::int AS p50,
        ROUND(COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms), 0))::int AS p95
      FROM ai_generations
      WHERE created_at >= ${cutoff.toISOString()}
        AND latency_ms IS NOT NULL
        AND model IS NOT NULL
      GROUP BY model
      ORDER BY count DESC
    `);

    const rows = result as unknown as {
      rows: Array<{ model: string; count: number; p50: number; p95: number }>;
    };

    return rows.rows.map((r) => ({
      model: r.model ?? "Unknown",
      count: Number(r.count),
      p50: Number(r.p50),
      p95: Number(r.p95),
    }));
  } catch (error) {
    logger.error("Failed to fetch latency by model", { error, days });
    return [];
  }
}

export async function getFallbackRate(days: number): Promise<FallbackRateResult> {
  const cutoff = daysAgo(days);

  try {
    const [row] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
        fallbackCount: sql<number>`COALESCE(SUM(CASE WHEN ${aiGenerations.fallbackUsed} THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(aiGenerations)
      .where(gte(aiGenerations.createdAt, cutoff));

    const total = Number(row?.count ?? 0);
    const fallback = Number(row?.fallbackCount ?? 0);

    return {
      count: total,
      fallbackCount: fallback,
      percentage: total > 0 ? Math.round((fallback / total) * 10000) / 100 : 0,
    };
  } catch (error) {
    logger.error("Failed to fetch fallback rate", { error, days });
    return { count: 0, fallbackCount: 0, percentage: 0 };
  }
}

export async function getFeedbackByVersion(days: number): Promise<FeedbackByVersion[]> {
  const cutoff = daysAgo(days);

  try {
    const rows = await db
      .select({
        promptVersion: aiGenerations.promptVersion,
        positive: sql<number>`COALESCE(SUM(CASE WHEN ${aiGenerations.feedback} = 'positive' THEN 1 ELSE 0 END), 0)::int`,
        negative: sql<number>`COALESCE(SUM(CASE WHEN ${aiGenerations.feedback} = 'negative' THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(aiGenerations)
      .where(
        and(
          gte(aiGenerations.createdAt, cutoff),
          sql`${aiGenerations.promptVersion} IS NOT NULL`,
          sql`${aiGenerations.feedback} IS NOT NULL`
        )
      )
      .groupBy(aiGenerations.promptVersion)
      .orderBy(desc(sql`positive + negative`));

    return rows.map((r) => ({
      promptVersion: r.promptVersion ?? "Unknown",
      positive: Number(r.positive ?? 0),
      negative: Number(r.negative ?? 0),
    }));
  } catch (error) {
    logger.error("Failed to fetch feedback by version", { error, days });
    return [];
  }
}
