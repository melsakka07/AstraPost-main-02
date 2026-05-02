import "server-only";

import { eq, and, gte, ne, sql, type ExtractTablesWithRelations } from "drizzle-orm";
import { type PgQueryResultHKT, type PgTransaction } from "drizzle-orm/pg-core";
import { cache } from "@/lib/cache";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getPlanLimits } from "@/lib/plan-limits";
import { aiGenerations, aiGenerationTypeEnum, user } from "@/lib/schema";
import type * as schema from "@/lib/schema";
import { getMonthWindow } from "@/lib/utils/time";

type DbClient =
  | typeof db
  | PgTransaction<PgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

export interface MonthlyAiUsage {
  used: number;
  limit: number | null;
  resetDate: string;
}

/**
 * Approximate pricing in cents per 1,000 tokens.
 * For cost estimation when the provider does not return a precise cost.
 */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "anthropic/claude-sonnet-4-20250514": { input: 0.3, output: 0.6 },
  "anthropic/claude-opus-4-20250514": { input: 1.5, output: 3.0 },
  "google/gemini-2.5-pro": { input: 0.125, output: 0.5 },
  "google/gemini-2.5-flash": { input: 0.015, output: 0.06 },
  "openai/gpt-4o": { input: 0.25, output: 1.0 },
  "openai/o4-mini": { input: 0.015, output: 0.06 },
  "meta-llama/llama-4-maverick": { input: 0.02, output: 0.03 },
};

/**
 * Estimates the cost in cents for a given model and token counts.
 * Returns 0 if the model is not in the pricing table.
 */
export function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (
    Math.round(((tokensIn / 1000) * pricing.input + (tokensOut / 1000) * pricing.output) * 100) /
    100
  );
}

export interface RecordAiUsageOptions {
  userId: string;
  type: string;
  model: string;
  subFeature: string;
  tokensIn: number;
  tokensOut: number;
  costEstimateCents?: number;
  promptVersion?: string;
  latencyMs?: number;
  fallbackUsed?: boolean;
  inputPrompt?: string;
  outputContent?: unknown;
  language?: string;
  tx?: DbClient;
}

export async function getMonthlyAiUsage(userId: string): Promise<MonthlyAiUsage> {
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { plan: true },
  });

  const limits = getPlanLimits(dbUser?.plan);
  const { start, end } = getMonthWindow();

  const usage = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.userId, userId),
        ne(aiGenerations.type, "image"),
        gte(aiGenerations.createdAt, start)
      )
    );

  const used = Number(usage[0]?.count ?? 0);
  const limit = limits.aiGenerationsPerMonth === Infinity ? null : limits.aiGenerationsPerMonth;

  return {
    used,
    limit,
    resetDate: end.toISOString(),
  };
}

export async function getMonthlyImageUsage(userId: string): Promise<MonthlyAiUsage> {
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { plan: true },
  });

  const limits = getPlanLimits(dbUser?.plan);
  const { start, end } = getMonthWindow();

  const usage = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.userId, userId),
        eq(aiGenerations.type, "image"),
        gte(aiGenerations.createdAt, start)
      )
    );

  const used = Number(usage[0]?.count ?? 0);
  const limit = limits.aiImagesPerMonth === -1 ? null : limits.aiImagesPerMonth;

  return {
    used,
    limit,
    resetDate: end.toISOString(),
  };
}

/**
 * Records an AI generation with full Phase 2 telemetry.
 *
 * Accepts either the new options-object pattern OR the legacy positional args
 * for backward compatibility with existing route handlers that haven't been
 * migrated yet.
 *
 * @example New style (Phase 2)
 *   await recordAiUsage({
 *     userId: session.user.id,
 *     type: "translate",
 *     model: "anthropic/claude-sonnet-4-20250514",
 *     subFeature: "translate",
 *     tokensIn: 150,
 *     tokensOut: 200,
 *     latencyMs: 1234,
 *     promptVersion: "v2",
 *   });
 *
 * @example Legacy style (still supported)
 *   await recordAiUsage(userId, "translate", 0, prompt, output, language);
 */
export async function recordAiUsage(
  optsOrUserId: RecordAiUsageOptions | string,
  type?: string,
  tokens?: number,
  input?: string,
  output?: unknown,
  language?: string,
  tx?: DbClient
): Promise<void> {
  let opts: RecordAiUsageOptions;

  // Detect call style: if first arg is a string, it's the legacy positional form
  if (typeof optsOrUserId === "string") {
    opts = {
      userId: optsOrUserId,
      type: type!,
      model: "unknown",
      subFeature: type!,
      tokensIn: 0,
      tokensOut: tokens ?? 0,
      ...(input !== undefined && { inputPrompt: input }),
      ...(output !== undefined && { outputContent: output }),
      ...(language !== undefined && { language }),
      ...(tx !== undefined && { tx }),
    };
  } else {
    opts = optsOrUserId;
  }

  const client = opts.tx ?? db;
  await client.insert(aiGenerations).values({
    id: crypto.randomUUID(),
    userId: opts.userId,
    type: opts.type as (typeof aiGenerationTypeEnum.enumValues)[number],
    model: opts.model,
    subFeature: opts.subFeature,
    inputPrompt: opts.inputPrompt,
    outputContent: opts.outputContent,
    tokensUsed: opts.tokensIn + opts.tokensOut,
    costEstimateCents: opts.costEstimateCents,
    promptVersion: opts.promptVersion,
    latencyMs: opts.latencyMs,
    fallbackUsed: opts.fallbackUsed ?? false,
    language: opts.language,
  });

  // Invalidate sidebar cache so usage reflects immediately after generation
  const now = new Date();
  const cacheKey =
    opts.type === "image"
      ? `ai:image-usage:${opts.userId}:${now.getFullYear()}-${now.getMonth()}`
      : `ai:usage:${opts.userId}:${now.getFullYear()}-${now.getMonth()}`;
  await cache.delete(cacheKey).catch(() => void 0);

  if (opts.fallbackUsed) {
    logger.warn("ai.fallback", {
      userId: opts.userId,
      type: opts.type,
      requestedModel: opts.model,
      subFeature: opts.subFeature,
      latencyMs: opts.latencyMs,
    });
  }
}
