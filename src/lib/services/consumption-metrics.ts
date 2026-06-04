import "server-only";

import { and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiGenerations, userImageCounters } from "@/lib/schema";
import {
  type Provider,
  providerForGeneration,
  TRACKED_PROVIDERS,
} from "@/lib/services/provider-map";

// ── Public shapes ─────────────────────────────────────────────────────────────

export type ConsumptionRange = 1 | 7 | 30;

export interface ProviderConsumption {
  provider: Provider;
  calls: number;
  tokens: number;
  costCents: number;
}

export interface ModelConsumption {
  model: string;
  provider: Provider;
  calls: number;
  tokens: number;
  costCents: number;
}

export interface FeatureConsumption {
  feature: string;
  calls: number;
  costCents: number;
}

export interface DailyConsumption {
  date: string;
  calls: number;
  tokens: number;
  costCents: number;
}

export interface ConsumptionWindow {
  rangeDays: ConsumptionRange;
  totalCalls: number;
  totalTokens: number;
  totalCostCents: number;
  fallbackRate: number; // share of calls that used a model fallback (0–1)
  byProvider: ProviderConsumption[];
  byModel: ModelConsumption[];
  byFeature: FeatureConsumption[];
  daily: DailyConsumption[];
  imageQuota: { totalUsed: number; activeUsers: number };
}

// ── Raw query-result shapes (input to the pure fold) ──────────────────────────

export interface RawSummary {
  totalCalls: number;
  totalTokens: number;
  knownCostCents: number;
  fallbackCount: number;
}

export interface RawModelRow {
  model: string | null;
  type: string | null;
  calls: number;
  tokens: number;
  knownCostCents: number;
}

export interface RawFeatureRow {
  feature: string | null;
  calls: number;
  knownCostCents: number;
}

export interface RawDailyRow {
  date: string;
  calls: number;
  tokens: number;
  knownCostCents: number;
}

export interface RawImageQuota {
  totalUsed: number;
  activeUsers: number;
}

export interface FoldInput {
  rangeDays: ConsumptionRange;
  summary: RawSummary;
  modelRows: RawModelRow[];
  featureRows: RawFeatureRow[];
  dailyRows: RawDailyRow[];
  imageQuota: RawImageQuota;
}

/**
 * Pure aggregation/shaping logic. Kept separate from DB access so it can be
 * unit-tested without mocking Drizzle query chains.
 *
 * Cost is the recorded `cost_estimate_cents` summed per group — the exact same
 * definition `/admin/ai-cost` uses, so the two surfaces always reconcile. (If a
 * model is missing from `MODEL_PRICING`, its rows record 0 here, on `/admin/ai-cost`,
 * and in the daily-budget alarm alike — fix the pricing table, not this view.)
 */
export function foldConsumption(input: FoldInput): ConsumptionWindow {
  const { rangeDays, summary, modelRows, featureRows, dailyRows, imageQuota } = input;

  const models: ModelConsumption[] = [];
  const providerAcc = new Map<Provider, ProviderConsumption>();
  for (const p of TRACKED_PROVIDERS) {
    providerAcc.set(p, { provider: p, calls: 0, tokens: 0, costCents: 0 });
  }

  // Merge rows by model string (a model can appear under multiple types).
  const modelAcc = new Map<string, ModelConsumption>();
  for (const row of modelRows) {
    const provider = providerForGeneration(row.type, row.model);
    const costCents = row.knownCostCents;
    const key = row.model ?? "unknown";
    const existing = modelAcc.get(key);
    if (existing) {
      existing.calls += row.calls;
      existing.tokens += row.tokens;
      existing.costCents += costCents;
    } else {
      modelAcc.set(key, { model: key, provider, calls: row.calls, tokens: row.tokens, costCents });
    }

    const pAcc = providerAcc.get(provider) ?? {
      provider,
      calls: 0,
      tokens: 0,
      costCents: 0,
    };
    pAcc.calls += row.calls;
    pAcc.tokens += row.tokens;
    pAcc.costCents += costCents;
    providerAcc.set(provider, pAcc);
  }

  for (const m of modelAcc.values()) models.push(m);
  models.sort((a, b) => b.costCents - a.costCents);

  const byProvider = [...providerAcc.values()].sort((a, b) => b.costCents - a.costCents);

  // Total cost = sum of resolved per-provider cost (keeps totals consistent
  // with the token fallback applied above).
  const totalCostCents = byProvider.reduce((sum, p) => sum + p.costCents, 0);

  const byFeature: FeatureConsumption[] = featureRows
    .map((r) => ({
      feature: r.feature ?? "unknown",
      calls: r.calls,
      costCents: r.knownCostCents,
    }))
    .sort((a, b) => b.costCents - a.costCents);

  const daily: DailyConsumption[] = dailyRows
    .map((r) => ({
      date: r.date,
      calls: r.calls,
      tokens: r.tokens,
      costCents: r.knownCostCents,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const fallbackRate = summary.totalCalls > 0 ? summary.fallbackCount / summary.totalCalls : 0;

  return {
    rangeDays,
    totalCalls: summary.totalCalls,
    totalTokens: summary.totalTokens,
    totalCostCents,
    fallbackRate,
    byProvider,
    byModel: models,
    byFeature,
    daily,
    imageQuota,
  };
}

// ── DB access ─────────────────────────────────────────────────────────────────

/**
 * Aggregates AI consumption (calls, tokens, cost) over the trailing `rangeDays`
 * window from `ai_generations`, plus a current-period image-quota snapshot from
 * `user_image_counters`. Read-only; sourced entirely from data we already store.
 */
export async function getConsumption(rangeDays: ConsumptionRange): Promise<ConsumptionWindow> {
  const now = new Date();
  const from = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  const inRange = and(gte(aiGenerations.createdAt, from), lte(aiGenerations.createdAt, now));

  const [summaryRows, modelRows, featureRows, dailyRows, imageQuotaRows] = await Promise.all([
    db
      .select({
        totalCalls: sql<number>`count(*)`,
        totalTokens: sql<number>`coalesce(sum(${aiGenerations.tokensUsed}), 0)`,
        knownCostCents: sql<number>`coalesce(sum(${aiGenerations.costEstimateCents}), 0)`,
        fallbackCount: sql<number>`coalesce(sum(case when ${aiGenerations.fallbackUsed} then 1 else 0 end), 0)`,
      })
      .from(aiGenerations)
      .where(inRange),
    db
      .select({
        model: aiGenerations.model,
        type: sql<string | null>`${aiGenerations.type}`,
        calls: sql<number>`count(*)`,
        tokens: sql<number>`coalesce(sum(${aiGenerations.tokensUsed}), 0)`,
        knownCostCents: sql<number>`coalesce(sum(${aiGenerations.costEstimateCents}), 0)`,
      })
      .from(aiGenerations)
      .where(inRange)
      .groupBy(aiGenerations.model, aiGenerations.type),
    db
      .select({
        feature: aiGenerations.subFeature,
        calls: sql<number>`count(*)`,
        knownCostCents: sql<number>`coalesce(sum(${aiGenerations.costEstimateCents}), 0)`,
      })
      .from(aiGenerations)
      .where(inRange)
      .groupBy(aiGenerations.subFeature),
    db
      .select({
        date: sql<string>`to_char(${aiGenerations.createdAt}, 'YYYY-MM-DD')`,
        calls: sql<number>`count(*)`,
        tokens: sql<number>`coalesce(sum(${aiGenerations.tokensUsed}), 0)`,
        knownCostCents: sql<number>`coalesce(sum(${aiGenerations.costEstimateCents}), 0)`,
      })
      .from(aiGenerations)
      .where(inRange)
      .groupBy(sql`to_char(${aiGenerations.createdAt}, 'YYYY-MM-DD')`),
    db
      .select({
        totalUsed: sql<number>`coalesce(sum(${userImageCounters.used}), 0)`,
        activeUsers: sql<number>`coalesce(sum(case when ${userImageCounters.used} > 0 then 1 else 0 end), 0)`,
      })
      .from(userImageCounters),
  ]);

  const summary = summaryRows[0];
  const imageQuota = imageQuotaRows[0];

  return foldConsumption({
    rangeDays,
    summary: {
      totalCalls: Number(summary?.totalCalls ?? 0),
      totalTokens: Number(summary?.totalTokens ?? 0),
      knownCostCents: Number(summary?.knownCostCents ?? 0),
      fallbackCount: Number(summary?.fallbackCount ?? 0),
    },
    modelRows: modelRows.map((r) => ({
      model: r.model,
      type: r.type,
      calls: Number(r.calls),
      tokens: Number(r.tokens),
      knownCostCents: Number(r.knownCostCents),
    })),
    featureRows: featureRows.map((r) => ({
      feature: r.feature,
      calls: Number(r.calls),
      knownCostCents: Number(r.knownCostCents),
    })),
    dailyRows: dailyRows.map((r) => ({
      date: r.date,
      calls: Number(r.calls),
      tokens: Number(r.tokens),
      knownCostCents: Number(r.knownCostCents),
    })),
    imageQuota: {
      totalUsed: Number(imageQuota?.totalUsed ?? 0),
      activeUsers: Number(imageQuota?.activeUsers ?? 0),
    },
  });
}
