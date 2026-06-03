import "server-only";

import { eq, and, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getUserPlanType } from "@/lib/middleware/require-plan";
import { getPlanLimits } from "@/lib/plan-limits";
import { aiGenerations, userImageCounters } from "@/lib/schema";
import { getMonthWindow } from "@/lib/utils/time";

interface ConsumeResult {
  allowed: boolean;
  used: number;
  limit: number;
  resetAt: Date;
}

/**
 * Atomically consume `weight` weighted image credits from the user's monthly
 * image-quota counter (`IMAGE_MODEL_COST` — nano-banana=1, pro=3, gpt-image-2=5).
 *
 * Mirrors `tryConsumeAiQuota` (text) but tracks `aiImagesPerMonth` instead of
 * `aiGenerationsPerMonth`, with NO admin-grant fallback (grants are text-only).
 *
 * Consumed at generation START and released on failure (see `releaseImageQuota`)
 * so concurrent and cost-weighted generations cannot exceed the plan budget —
 * fixing the old non-atomic, unweighted, record-at-completion behaviour.
 *
 * On first creation the counter is SEEDED from the count of image generations
 * already recorded in the current period, so users who generated images before
 * the counter existed do not get a fresh zero budget.
 *
 * @returns allowed: false when the user has exhausted their monthly image quota.
 */
export async function tryConsumeImageQuota(userId: string, weight = 1): Promise<ConsumeResult> {
  const { start, end } = getMonthWindow();

  const plan = await getUserPlanType(userId);
  const limits = getPlanLimits(plan);
  const planLimit = limits.aiImagesPerMonth;

  // Unlimited plans (Agency) bypass the counter entirely
  if (planLimit === -1) {
    return { allowed: true, used: 0, limit: -1, resetAt: end };
  }

  // Fast path: atomic consume using the current plan's limit
  const consumed = await atomicConsume(userId, weight, planLimit, start, end);
  if (consumed) return consumed;

  // Slow path: no row, stale period, or quota exhausted
  const existing = await db.query.userImageCounters.findFirst({
    where: eq(userImageCounters.userId, userId),
  });

  // Case 1: No counter row exists yet — create one (seeded from existing rows)
  if (!existing) {
    return createAndConsume(userId, weight, planLimit, start, end);
  }

  // Case 2: Period is stale — reset and try again
  if (existing.periodStart < start) {
    return resetAndConsume(userId, weight, planLimit, start, end);
  }

  // Case 3: Counter limit is stale (mid-month plan change) — update and retry
  if (existing.limit !== planLimit) {
    const refreshed = await refreshLimitAndConsume(userId, weight, planLimit, start, end);
    if (refreshed) return refreshed;
  }

  // Case 4: Quota exhausted in current period
  return { allowed: false, used: existing.used, limit: existing.limit, resetAt: end };
}

/**
 * Releases previously consumed image quota (on generation failure rollback or
 * a model fallback that lowered the cost). Decrements `used`, clamping at 0.
 * No-op (with a warning) if no counter row exists.
 */
export async function releaseImageQuota(userId: string, weight = 1): Promise<void> {
  if (weight <= 0) return;
  const [updated] = await db
    .update(userImageCounters)
    .set({
      used: sql`GREATEST(0, ${userImageCounters.used} - ${weight})`,
      updatedAt: new Date(),
    })
    .where(eq(userImageCounters.userId, userId))
    .returning({ userId: userImageCounters.userId });

  if (!updated) {
    logger.warn("releaseImageQuota: no counter row found", { userId, weight });
  }
}

// ── Internal helpers ────────────────────────────────────────────────────

async function atomicConsume(
  userId: string,
  weight: number,
  currentLimit: number,
  periodStart: Date,
  resetAt: Date
): Promise<ConsumeResult | null> {
  const [row] = await db
    .update(userImageCounters)
    .set({
      used: sql`${userImageCounters.used} + ${weight}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userImageCounters.userId, userId),
        sql`${userImageCounters.used} + ${weight} <= ${currentLimit}`,
        gte(userImageCounters.periodStart, periodStart)
      )
    )
    .returning();

  if (!row) return null;

  return { allowed: true, used: row.used, limit: row.limit, resetAt };
}

/** Counts image generations already recorded in the current period. */
async function countExistingImages(userId: string, periodStart: Date): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.userId, userId),
        eq(aiGenerations.type, "image"),
        gte(aiGenerations.createdAt, periodStart)
      )
    );
  return Number(row?.count ?? 0);
}

async function createAndConsume(
  userId: string,
  weight: number,
  planLimit: number,
  periodStart: Date,
  resetAt: Date
): Promise<ConsumeResult> {
  // Seed `used` from images already recorded this period so existing usage is
  // not lost when the counter is first created (one image = 1 credit baseline).
  const seed = await countExistingImages(userId, periodStart);

  // Insert with ON CONFLICT DO NOTHING to handle concurrent first-call races.
  await db
    .insert(userImageCounters)
    .values({
      userId,
      periodStart,
      used: seed,
      limit: planLimit,
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // Re-read to get the authoritative row (could be ours or a concurrent caller's)
  const created = await db.query.userImageCounters.findFirst({
    where: eq(userImageCounters.userId, userId),
  });

  if (!created) {
    logger.warn("createAndConsume(image): counter row disappeared after insert", { userId });
    return { allowed: false, used: planLimit, limit: planLimit, resetAt };
  }

  const consumed = await atomicConsume(userId, weight, planLimit, periodStart, resetAt);
  if (consumed) return consumed;

  return { allowed: false, used: created.used, limit: created.limit, resetAt };
}

async function resetAndConsume(
  userId: string,
  weight: number,
  planLimit: number,
  periodStart: Date,
  resetAt: Date
): Promise<ConsumeResult> {
  const [updated] = await db
    .update(userImageCounters)
    .set({
      used: weight,
      limit: planLimit,
      periodStart,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userImageCounters.userId, userId),
        lt(userImageCounters.periodStart, periodStart) // only reset if still stale
      )
    )
    .returning();

  if (!updated) {
    // Another caller already reset this row. Retry atomic consume on the fresh row.
    const consumed = await atomicConsume(userId, weight, planLimit, periodStart, resetAt);
    if (consumed) return consumed;

    const row = await db.query.userImageCounters.findFirst({
      where: eq(userImageCounters.userId, userId),
    });
    return {
      allowed: false,
      used: row?.used ?? planLimit,
      limit: row?.limit ?? planLimit,
      resetAt,
    };
  }

  return { allowed: true, used: weight, limit: planLimit, resetAt };
}

async function refreshLimitAndConsume(
  userId: string,
  weight: number,
  currentLimit: number,
  periodStart: Date,
  resetAt: Date
): Promise<ConsumeResult | null> {
  await db
    .update(userImageCounters)
    .set({ limit: currentLimit, updatedAt: new Date() })
    .where(eq(userImageCounters.userId, userId));

  const retry = await atomicConsume(userId, weight, currentLimit, periodStart, resetAt);
  if (retry) return { ...retry, limit: currentLimit };
  return null;
}

/**
 * Returns the authoritative weighted image usage for the current period.
 * Reads the atomic counter when fresh; falls back to the period's recorded
 * image-row count before the counter is first created (or after a stale period).
 */
export async function getImageUsageUnits(userId: string): Promise<{ used: number; resetAt: Date }> {
  const { start, end } = getMonthWindow();
  const counter = await db.query.userImageCounters.findFirst({
    where: eq(userImageCounters.userId, userId),
  });
  if (counter && counter.periodStart >= start) {
    return { used: counter.used, resetAt: end };
  }
  // No fresh counter yet — derive from recorded rows (one image = 1 credit).
  const used = await countExistingImages(userId, start);
  return { used, resetAt: end };
}
