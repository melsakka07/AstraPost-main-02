import "server-only";

import { eq, and, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getUserPlanType } from "@/lib/middleware/require-plan";
import { getPlanLimits } from "@/lib/plan-limits";
import { teamXBudgetCounters, xApiUsageLog } from "@/lib/schema";
import { getMonthWindow } from "@/lib/utils/time";

export type XAction = "post" | "post_url" | "read_owned" | "read_third" | "user_lookup" | "trends";

/** Weighted cost per X action, in USD ×10⁴ ("ten-thousandths of a dollar"). See docs/claude/x-api-reference.md. */
export const X_ACTION_COST_MICRO: Record<XAction, number> = {
  post: 150, // $0.015 — POST /2/tweets, no URL
  post_url: 2000, // $0.20 — POST /2/tweets, URL detected in content
  read_owned: 10, // $0.001 — own analytics/mentions/timeline reads
  read_third: 50, // $0.005 — competitor/quotes/likers reads
  user_lookup: 100, // $0.010 — user lookup calls
  trends: 100, // $0.010 [SECONDARY] — /trends/by/woeid, placeholder pending reconciliation
};

interface ConsumeResult {
  allowed: boolean;
  used: number;
  limit: number;
  resetAt: Date;
}

const URL_PATTERN = /https?:\/\/|t\.co\//i;
// Reasonably broad bare-domain TLD list — not exhaustive, good enough to catch
// links pasted without a scheme (e.g. "example.com"). See open question below.
const BARE_DOMAIN_PATTERN =
  /\b[a-z0-9][a-z0-9-]*\.(com|net|org|io|ai|co|ly|me|app|dev|xyz|info|biz|gov|edu|sa|ae|eg)\b/i;

/**
 * Detects whether `content` contains a URL, which triggers X's higher
 * per-post charge (`post_url` vs `post`).
 *
 * Open question (plan §5/§9, unresolved): do quote-tweets (which reference
 * another post's URL) or media-only posts also trigger the URL price on X's
 * side? This function only detects URLs literally present in `content` —
 * the true charge shape for those cases will be settled empirically via the
 * `x_api_usage_log` ledger once live traffic is reconciled against X's
 * authoritative usage endpoint.
 */
export function hasUrl(content: string): boolean {
  return URL_PATTERN.test(content) || BARE_DOMAIN_PATTERN.test(content);
}

/** Weighted cost (USD ×10⁴) for posting `content` as a tweet. */
export function xPostCostMicro(content: string): number {
  return hasUrl(content) ? X_ACTION_COST_MICRO.post_url : X_ACTION_COST_MICRO.post;
}

/**
 * Atomically consumes `costMicro` from the team's monthly X-budget counter.
 *
 * Mirrors `tryConsumeImageQuota` (see `ai-image-quota-atomic.ts`): same
 * atomic UPDATE-guard pattern, same period-reset + mid-month plan-change +
 * seed-on-create handling, same unlimited-plan bypass.
 *
 * PHASE 1 (observe mode): the counter is kept real and accurate so Phase 3
 * can flip enforcement on later, but callers in this phase use the result
 * for bookkeeping only — `allowed: false` must NEVER be used to block or
 * skip the underlying X action. No caller in Phase 1 checks `.allowed`.
 */
export async function tryConsumeXBudget(teamId: string, costMicro: number): Promise<ConsumeResult> {
  const { start, end } = getMonthWindow();

  const plan = await getUserPlanType(teamId);
  const limits = getPlanLimits(plan);
  const planLimit = limits.xBudgetMicroPerMonth;

  // Unlimited plans (Agency) bypass the counter entirely
  if (planLimit === -1) {
    return { allowed: true, used: 0, limit: -1, resetAt: end };
  }

  // Fast path: atomic consume using the current plan's limit
  const consumed = await atomicConsume(teamId, costMicro, planLimit, start, end);
  if (consumed) return consumed;

  // Slow path: no row, stale period, or budget exhausted
  const existing = await db.query.teamXBudgetCounters.findFirst({
    where: eq(teamXBudgetCounters.teamId, teamId),
  });

  // Case 1: No counter row exists yet — create one
  if (!existing) {
    return createAndConsume(teamId, costMicro, planLimit, start, end);
  }

  // Case 2: Period is stale — reset and try again
  if (existing.periodStart < start) {
    return resetAndConsume(teamId, costMicro, planLimit, start, end);
  }

  // Case 3: Counter limit is stale (mid-month plan change) — update and retry
  if (existing.limitMicro !== planLimit) {
    const refreshed = await refreshLimitAndConsume(teamId, costMicro, planLimit, start, end);
    if (refreshed) return refreshed;
  }

  // Case 4: Budget exhausted in current period
  return { allowed: false, used: existing.usedMicro, limit: existing.limitMicro, resetAt: end };
}

/**
 * Releases previously consumed X budget (e.g. a publish job that failed
 * after the cost was pre-consumed). Decrements `usedMicro`, clamping at 0.
 * No-op (with a warning) if no counter row exists.
 */
export async function releaseXBudget(teamId: string, costMicro: number): Promise<void> {
  if (costMicro <= 0) return;
  const [updated] = await db
    .update(teamXBudgetCounters)
    .set({
      usedMicro: sql`GREATEST(0, ${teamXBudgetCounters.usedMicro} - ${costMicro})`,
      updatedAt: new Date(),
    })
    .where(eq(teamXBudgetCounters.teamId, teamId))
    .returning({ teamId: teamXBudgetCounters.teamId });

  if (!updated) {
    logger.warn("releaseXBudget: no counter row found", { teamId, costMicro });
  }
}

/**
 * Records one metered X API call in the append-only ledger for observability
 * and reconciliation (plan §8). Fire-and-forget: a ledger insert failure
 * must never break the caller's actual X action, so failures are logged and
 * swallowed rather than thrown.
 *
 * PHASE 1: always inserts, and also runs the atomic consume (see
 * `tryConsumeXBudget`) so the counter stays accurate — but never blocks.
 */
export async function recordXUsage(
  teamId: string,
  action: XAction,
  opts?: { endpoint?: string; correlationId?: string }
): Promise<void> {
  const costMicro = X_ACTION_COST_MICRO[action];

  try {
    await tryConsumeXBudget(teamId, costMicro);
  } catch (err) {
    logger.warn("recordXUsage: budget consume failed (non-blocking)", {
      teamId,
      action,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    await db.insert(xApiUsageLog).values({
      teamId,
      action,
      costMicro,
      ...(opts?.endpoint !== undefined && { endpoint: opts.endpoint }),
      ...(opts?.correlationId !== undefined && { correlationId: opts.correlationId }),
    });
  } catch (err) {
    logger.warn("recordXUsage: ledger insert failed", {
      teamId,
      action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ── Internal helpers ────────────────────────────────────────────────────

async function atomicConsume(
  teamId: string,
  costMicro: number,
  currentLimit: number,
  periodStart: Date,
  resetAt: Date
): Promise<ConsumeResult | null> {
  const [row] = await db
    .update(teamXBudgetCounters)
    .set({
      usedMicro: sql`${teamXBudgetCounters.usedMicro} + ${costMicro}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(teamXBudgetCounters.teamId, teamId),
        sql`${teamXBudgetCounters.usedMicro} + ${costMicro} <= ${currentLimit}`,
        gte(teamXBudgetCounters.periodStart, periodStart)
      )
    )
    .returning();

  if (!row) return null;

  return { allowed: true, used: row.usedMicro, limit: row.limitMicro, resetAt };
}

async function createAndConsume(
  teamId: string,
  costMicro: number,
  planLimit: number,
  periodStart: Date,
  resetAt: Date
): Promise<ConsumeResult> {
  // Insert with ON CONFLICT DO NOTHING to handle concurrent first-call races.
  await db
    .insert(teamXBudgetCounters)
    .values({
      teamId,
      periodStart,
      usedMicro: 0,
      limitMicro: planLimit,
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  // Re-read to get the authoritative row (could be ours or a concurrent caller's)
  const created = await db.query.teamXBudgetCounters.findFirst({
    where: eq(teamXBudgetCounters.teamId, teamId),
  });

  if (!created) {
    logger.warn("createAndConsume(xBudget): counter row disappeared after insert", { teamId });
    return { allowed: false, used: planLimit, limit: planLimit, resetAt };
  }

  const consumed = await atomicConsume(teamId, costMicro, planLimit, periodStart, resetAt);
  if (consumed) return consumed;

  return { allowed: false, used: created.usedMicro, limit: created.limitMicro, resetAt };
}

async function resetAndConsume(
  teamId: string,
  costMicro: number,
  planLimit: number,
  periodStart: Date,
  resetAt: Date
): Promise<ConsumeResult> {
  const [updated] = await db
    .update(teamXBudgetCounters)
    .set({
      usedMicro: costMicro,
      limitMicro: planLimit,
      periodStart,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(teamXBudgetCounters.teamId, teamId),
        lt(teamXBudgetCounters.periodStart, periodStart) // only reset if still stale
      )
    )
    .returning();

  if (!updated) {
    // Another caller already reset this row. Retry atomic consume on the fresh row.
    const consumed = await atomicConsume(teamId, costMicro, planLimit, periodStart, resetAt);
    if (consumed) return consumed;

    const row = await db.query.teamXBudgetCounters.findFirst({
      where: eq(teamXBudgetCounters.teamId, teamId),
    });
    return {
      allowed: false,
      used: row?.usedMicro ?? planLimit,
      limit: row?.limitMicro ?? planLimit,
      resetAt,
    };
  }

  return { allowed: true, used: costMicro, limit: planLimit, resetAt };
}

async function refreshLimitAndConsume(
  teamId: string,
  costMicro: number,
  currentLimit: number,
  periodStart: Date,
  resetAt: Date
): Promise<ConsumeResult | null> {
  await db
    .update(teamXBudgetCounters)
    .set({ limitMicro: currentLimit, updatedAt: new Date() })
    .where(eq(teamXBudgetCounters.teamId, teamId));

  const retry = await atomicConsume(teamId, costMicro, currentLimit, periodStart, resetAt);
  if (retry) return { ...retry, limit: currentLimit };
  return null;
}
