import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getPlanLimits } from "@/lib/plan-limits";
import { posts, user, xAccounts } from "@/lib/schema";

export async function checkAccountLimit(userId: string) {
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { plan: true, trialEndsAt: true }
  });

  if (dbUser?.plan === "free" && dbUser.trialEndsAt && new Date() < dbUser.trialEndsAt) {
      return true; // Trial active, unlimited accounts
  }

  const limits = getPlanLimits(dbUser?.plan);
  
  if (limits.maxXAccounts === Infinity) return true;

  const accountsCount = await db.select({ count: sql<number>`count(*)` })
    .from(xAccounts)
    .where(and(eq(xAccounts.userId, userId), eq(xAccounts.isActive, true)));

  return Number(accountsCount[0]?.count ?? 0) < limits.maxXAccounts;
}

export async function checkPostLimit(userId: string, count: number = 1) {
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { plan: true, trialEndsAt: true }
  });
  
  // Trial Bypass
  if (dbUser?.plan === "free" && dbUser.trialEndsAt && new Date() < dbUser.trialEndsAt) {
      return true; // Trial active, unlimited posts
  }

  const limits = getPlanLimits(dbUser?.plan);
  
  if (limits.postsPerMonth === Infinity) return true;
  
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const postCount = await db.select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(and(
      eq(posts.userId, userId),
      gte(posts.createdAt, startOfMonth)
    ));
    
  return Number(postCount[0]?.count ?? 0) + count <= limits.postsPerMonth;
}

export async function checkAiLimit(userId: string) {
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { plan: true, trialEndsAt: true }
  });
  
  if (dbUser?.plan === "free" && dbUser.trialEndsAt && new Date() < dbUser.trialEndsAt) {
      return true; // Trial active, can use AI
  }

  const limits = getPlanLimits(dbUser?.plan);
  
  return limits.canUseAi;
}
