import "server-only";

import { eq, and, gte, ne, sql, type ExtractTablesWithRelations } from "drizzle-orm";
import { type PgQueryResultHKT, type PgTransaction } from "drizzle-orm/pg-core";
import { cache } from "@/lib/cache";
import { db } from "@/lib/db";
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

export async function recordAiUsage(
  userId: string,
  type: (typeof aiGenerationTypeEnum.enumValues)[number],
  tokens: number = 0,
  input: string,
  output: unknown,
  language?: string,
  tx?: DbClient
) {
  const client = tx ?? db;
  await client.insert(aiGenerations).values({
    id: crypto.randomUUID(),
    userId,
    type,
    inputPrompt: input,
    outputContent: output,
    tokensUsed: tokens,
    language,
  });
  // Invalidate sidebar cache so usage reflects immediately after generation
  const now = new Date();
  const cacheKey =
    type === "image"
      ? `ai:image-usage:${userId}:${now.getFullYear()}-${now.getMonth()}`
      : `ai:usage:${userId}:${now.getFullYear()}-${now.getMonth()}`;
  await cache.delete(cacheKey).catch(() => void 0);
}
