import { headers } from "next/headers";
import { eq, and, gte, ne, sql } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizePlan } from "@/lib/plan-limits";
import { user, posts, xAccounts, aiGenerations } from "@/lib/schema";
import { getPlanMetadata } from "@/lib/services/plan-metadata";
import { getMonthWindow } from "@/lib/utils/time";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return ApiError.unauthorized();
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  if (!dbUser) {
    return ApiError.notFound("User not found");
  }

  // Display-only read: getPlanMetadata is used here to return plan metadata and
  // usage percentages to the billing dashboard. No gating decision is made.
  // Intentional exception to CLAUDE.md §16 — no enforcement side effects.
  const plan = normalizePlan(dbUser.plan);
  const limits = getPlanMetadata(plan);
  const { start: startOfMonth } = getMonthWindow();

  const [postsCount, accountsCount, aiCount, aiImagesCount] = await Promise.all([
    // Monthly posts
    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(
        and(
          eq(posts.userId, session.user.id),
          ne(posts.status, "draft"),
          gte(posts.createdAt, startOfMonth)
        )
      ),

    // Connected accounts
    db
      .select({ count: sql<number>`count(*)` })
      .from(xAccounts)
      .where(and(eq(xAccounts.userId, session.user.id), eq(xAccounts.isActive, true))),

    // Monthly AI text generations (excluding images — images tracked separately)
    db
      .select({ count: sql<number>`count(*)` })
      .from(aiGenerations)
      .where(
        and(
          eq(aiGenerations.userId, session.user.id),
          ne(aiGenerations.type, "image"),
          gte(aiGenerations.createdAt, startOfMonth)
        )
      ),

    // Monthly AI image generations
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiGenerations)
      .where(
        and(
          eq(aiGenerations.userId, session.user.id),
          eq(aiGenerations.type, "image"),
          gte(aiGenerations.createdAt, startOfMonth)
        )
      ),
  ]);

  const usage = {
    posts: Number(postsCount[0]?.count ?? 0),
    accounts: Number(accountsCount[0]?.count ?? 0),
    ai: Number(aiCount[0]?.count ?? 0),
    aiImages: Number(aiImagesCount[0]?.count ?? 0),
  };

  const serializableLimits = {
    postsPerMonth: Number.isFinite(limits.postsPerMonth) ? limits.postsPerMonth : null,
    maxXAccounts: Number.isFinite(limits.maxXAccounts) ? limits.maxXAccounts : null,
    aiGenerationsPerMonth: Number.isFinite(limits.aiGenerationsPerMonth)
      ? limits.aiGenerationsPerMonth
      : null,
    aiImagesPerMonth: limits.aiImagesPerMonth === -1 ? null : limits.aiImagesPerMonth,
  };

  return Response.json({
    plan,
    limits: serializableLimits,
    usage,
  });
}
