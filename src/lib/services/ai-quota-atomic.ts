import "server-only";

import { eq, and, gte, lt, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getUserPlanType } from "@/lib/middleware/require-plan";
import { getPlanLimits } from "@/lib/plan-limits";
import { userAiCounters, aiQuotaGrants } from "@/lib/schema";
import { getMonthWindow } from "@/lib/utils/time";

interface ConsumeResult {
  allowed: boolean;
  used: number;
  limit: number;
  resetAt: Date;
}

/**
 * Attempts to atomically consume `weight` units from the user's AI quota counter.
 *
 * Uses a single UPDATE ... WHERE used + weight <= limit to enforce the quota
 * without race conditions. On first call for a user (no counter row exists),
 * the row is auto-created with the current plan's limit. If the existing row's
 * period is stale (periodStart < start of current month), it is reset atomically.
 *
 * @returns allowed: false when the user has exhausted their monthly AI quota.
 */
export async function tryConsumeAiQuota(userId: string, weight = 1): Promise<ConsumeResult> {
  const { start, end } = getMonthWindow();

  // ── Fast path: atomic consume on existing, in-window counter ──────────
  const consumed = await atomicConsume(userId, weight, start, end);
  if (consumed) return consumed;

  // ── Slow path: no row, stale period, or quota exhausted ───────────────
  const existing = await db.query.userAiCounters.findFirst({
    where: eq(userAiCounters.userId, userId),
  });

  // Case 1: No counter row exists yet — create one
  if (!existing) {
    return createAndConsume(userId, weight, start, end);
  }

  // Case 2: Period is stale — reset and try again
  if (existing.periodStart < start) {
    return resetAndConsume(userId, weight, start, end);
  }

  // Case 3: Quota exhausted in current period — try admin-issued grants first
  const grantResult = await consumeFromGrants(userId, weight, end);
  if (grantResult) return grantResult;

  return { allowed: false, used: existing.used, limit: existing.limit, resetAt: end };
}

/**
 * Falls back to admin-issued quota grants when the base monthly quota is exhausted.
 *
 * Finds the oldest grant with remaining > 0 and atomically decrements it.
 * Returns null if no grant is available, allowing the caller to fall through
 * to the exhausted-quota response.
 */
async function consumeFromGrants(
  userId: string,
  weight: number,
  resetAt: Date
): Promise<ConsumeResult | null> {
  const grant = await db.query.aiQuotaGrants.findFirst({
    where: and(eq(aiQuotaGrants.userId, userId), gt(aiQuotaGrants.remaining, 0)),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
  if (!grant) return null;

  const consumed = Math.min(grant.remaining, weight);
  await db
    .update(aiQuotaGrants)
    .set({ remaining: sql`GREATEST(0, ${aiQuotaGrants.remaining} - ${consumed})` })
    .where(eq(aiQuotaGrants.id, grant.id));

  return { allowed: true, used: consumed, limit: -1, resetAt };
}

/**
 * Releases previously consumed quota (e.g., on generation failure rollback).
 * Decrements the used counter, clamping at 0. No-op if no counter row exists.
 */
export async function releaseAiQuota(userId: string, weight = 1): Promise<void> {
  const [updated] = await db
    .update(userAiCounters)
    .set({
      used: sql`GREATEST(0, ${userAiCounters.used} - ${weight})`,
      updatedAt: new Date(),
    })
    .where(eq(userAiCounters.userId, userId))
    .returning({ userId: userAiCounters.userId });

  if (!updated) {
    logger.warn("releaseAiQuota: no counter row found", { userId, weight });
  }
}

// ── Internal helpers ────────────────────────────────────────────────────

async function atomicConsume(
  userId: string,
  weight: number,
  periodStart: Date,
  resetAt: Date
): Promise<ConsumeResult | null> {
  const [row] = await db
    .update(userAiCounters)
    .set({
      used: sql`${userAiCounters.used} + ${weight}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userAiCounters.userId, userId),
        sql`${userAiCounters.used} + ${weight} <= ${userAiCounters.limit}`,
        gte(userAiCounters.periodStart, periodStart)
      )
    )
    .returning();

  if (!row) return null;

  return {
    allowed: true,
    used: row.used,
    limit: row.limit,
    resetAt,
  };
}

async function createAndConsume(
  userId: string,
  weight: number,
  periodStart: Date,
  resetAt: Date
): Promise<ConsumeResult> {
  const plan = await getUserPlanType(userId);
  const limits = getPlanLimits(plan);
  const planLimit = limits.aiGenerationsPerMonth;

  // Unlimited plans skip the counter entirely
  if (planLimit === Infinity) {
    return { allowed: true, used: 0, limit: -1, resetAt };
  }

  // Insert with ON CONFLICT DO NOTHING to handle concurrent first-call races.
  // The losing caller re-reads the row and retries the atomic consume below.
  await db
    .insert(userAiCounters)
    .values({
      userId,
      periodStart,
      used: 0,
      limit: planLimit,
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // Re-read to get the authoritative row (could be ours or a concurrent caller's)
  const created = await db.query.userAiCounters.findFirst({
    where: eq(userAiCounters.userId, userId),
  });

  if (!created) {
    // Should not happen, but bail safely
    logger.warn("createAndConsume: counter row disappeared after insert", { userId });
    return { allowed: false, used: planLimit, limit: planLimit, resetAt };
  }

  // Now attempt the atomic consume on the newly created row
  const consumed = await atomicConsume(userId, weight, periodStart, resetAt);
  if (consumed) return consumed;

  // If the atomic consume failed, it means another concurrent caller already
  // consumed the quota — our weight would push it over the limit
  return {
    allowed: false,
    used: created.used,
    limit: created.limit,
    resetAt,
  };
}

async function resetAndConsume(
  userId: string,
  weight: number,
  periodStart: Date,
  resetAt: Date
): Promise<ConsumeResult> {
  const plan = await getUserPlanType(userId);
  const limits = getPlanLimits(plan);
  const planLimit = limits.aiGenerationsPerMonth;

  if (planLimit === Infinity) {
    return { allowed: true, used: 0, limit: -1, resetAt };
  }

  const [updated] = await db
    .update(userAiCounters)
    .set({
      used: weight,
      limit: planLimit,
      periodStart,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userAiCounters.userId, userId),
        lt(userAiCounters.periodStart, periodStart) // only reset if still stale
      )
    )
    .returning();

  if (!updated) {
    // Another caller already reset this row. Retry atomic consume on the fresh row.
    const consumed = await atomicConsume(userId, weight, periodStart, resetAt);
    if (consumed) return consumed;

    const row = await db.query.userAiCounters.findFirst({
      where: eq(userAiCounters.userId, userId),
    });
    return {
      allowed: false,
      used: row?.used ?? planLimit,
      limit: row?.limit ?? planLimit,
      resetAt,
    };
  }

  return {
    allowed: true,
    used: weight,
    limit: planLimit,
    resetAt,
  };
}
