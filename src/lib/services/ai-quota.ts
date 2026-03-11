import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getPlanLimits } from "@/lib/plan-limits";
import { aiGenerations, user } from "@/lib/schema";

function getMonthlyWindow() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

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
  const { start, end } = getMonthlyWindow();

  const usage = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiGenerations)
    .where(and(eq(aiGenerations.userId, userId), gte(aiGenerations.createdAt, start)));

  const used = Number(usage[0]?.count ?? 0);
  const limit =
    limits.aiGenerationsPerMonth === Infinity ? null : limits.aiGenerationsPerMonth;

  return {
    used,
    limit,
    resetDate: end.toISOString(),
  };
}

export async function recordAiUsage(
  userId: string, 
  type: string, 
  tokens: number = 0,
  input: string,
  output: unknown,
  language?: string
) {
  await db.insert(aiGenerations).values({
    id: crypto.randomUUID(),
    userId,
    type,
    inputPrompt: input,
    outputContent: output,
    tokensUsed: tokens,
    language,
  });
}

export async function checkAiQuota(userId: string) {
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { plan: true, trialEndsAt: true }
  });

  if (dbUser?.plan === "free" && dbUser.trialEndsAt && new Date() < dbUser.trialEndsAt) {
      return true; 
  }

  const limits = getPlanLimits(dbUser?.plan);
  
  if (limits.aiGenerationsPerMonth === Infinity) return true;
  if (limits.aiGenerationsPerMonth === 0) return false;

  const { start } = getMonthlyWindow();

  const usage = await db.select({ count: sql<number>`count(*)` })
    .from(aiGenerations)
    .where(and(
      eq(aiGenerations.userId, userId),
      gte(aiGenerations.createdAt, start)
    ));

  return Number(usage[0]?.count ?? 0) < limits.aiGenerationsPerMonth;
}
