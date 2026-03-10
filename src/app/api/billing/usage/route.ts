import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq, and, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlanLimits } from "@/lib/plan-limits";
import { user, posts, xAccounts, aiGenerations } from "@/lib/schema";

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

  const limits = getPlanLimits(dbUser.plan);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [postsCount, accountsCount, aiCount] = await Promise.all([
    // Monthly posts
    db.select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(and(
        eq(posts.userId, session.user.id),
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

  return NextResponse.json({
    plan: dbUser.plan,
    limits,
    usage,
  });
}
