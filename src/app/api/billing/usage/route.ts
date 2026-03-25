import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq, and, gte, ne, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlanLimits, normalizePlan } from "@/lib/plan-limits";
import { user, posts, xAccounts, aiGenerations } from "@/lib/schema";
import { getMonthWindow } from "@/lib/utils/time";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Display-only read: getPlanLimits is used here to return plan metadata and
  // usage percentages to the billing dashboard. No gating decision is made.
  // Intentional exception to CLAUDE.md §16 — no enforcement side effects.
  const plan = normalizePlan(dbUser.plan);
  const limits = getPlanLimits(plan);
  const { start: startOfMonth } = getMonthWindow();

  const [postsCount, accountsCount, aiCount] = await Promise.all([
    // Monthly posts
    db.select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(and(
        eq(posts.userId, session.user.id),
        ne(posts.status, "draft"),
        gte(posts.createdAt, startOfMonth)
      )),
    
    // Connected accounts
    db.select({ count: sql<number>`count(*)` })
      .from(xAccounts)
      .where(and(eq(xAccounts.userId, session.user.id), eq(xAccounts.isActive, true))),

    // Monthly AI generations
    db.select({ count: sql<number>`count(*)` })
      .from(aiGenerations)
      .where(and(
        eq(aiGenerations.userId, session.user.id),
        gte(aiGenerations.createdAt, startOfMonth)
      ))
  ]);

  const usage = {
    posts: Number(postsCount[0]?.count ?? 0),
    accounts: Number(accountsCount[0]?.count ?? 0),
    ai: Number(aiCount[0]?.count ?? 0),
  };

  const serializableLimits = {
    postsPerMonth: Number.isFinite(limits.postsPerMonth) ? limits.postsPerMonth : null,
    maxXAccounts: Number.isFinite(limits.maxXAccounts) ? limits.maxXAccounts : null,
    aiGenerationsPerMonth: Number.isFinite(limits.aiGenerationsPerMonth) ? limits.aiGenerationsPerMonth : null,
  };

  return NextResponse.json({
    plan,
    limits: serializableLimits,
    usage,
  });
}
