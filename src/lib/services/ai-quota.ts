import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getPlanLimits } from "@/lib/plan-limits";
import { aiGenerations, user } from "@/lib/schema";

export async function recordAiUsage(
  userId: string, 
  type: string, 
  tokens: number = 0,
  input: string,
  output: any
) {
  await db.insert(aiGenerations).values({
    id: crypto.randomUUID(),
    userId,
    type,
    inputPrompt: input,
    outputContent: output,
    tokensUsed: tokens,
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

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usage = await db.select({ count: sql<number>`count(*)` })
    .from(aiGenerations)
    .where(and(
      eq(aiGenerations.userId, userId),
      gte(aiGenerations.createdAt, startOfMonth)
    ));

  return Number(usage[0]?.count ?? 0) < limits.aiGenerationsPerMonth;
}
