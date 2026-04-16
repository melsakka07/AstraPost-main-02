import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { getBillingRedis } from "@/lib/billing-redis";
import { priceToPlan } from "@/lib/billing-utils";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkIpRateLimit, createIpRateLimitResponse } from "@/lib/rate-limiter";
import { planChangeLog, subscriptions, user } from "@/lib/schema";
import { stripe } from "@/lib/stripe";

type DbStatus = "active" | "past_due" | "cancelled" | "trialing";

/**
 * Maps a live Stripe subscription status string to our DB enum value.
 * Stripe uses American spelling ("canceled"); our enum uses British ("cancelled").
 * Statuses outside the enum (paused, incomplete, incomplete_expired, unpaid)
 * are collapsed to "past_due" — the dunning / grace-period flow handles them.
 */
function stripeStatusToDb(s: string): DbStatus {
  if (s === "canceled" || s === "cancelled") return "cancelled";
  if (s === "active" || s === "past_due" || s === "trialing") return s as DbStatus;
  return "past_due";
}

/**
 * GET /api/billing/status
 *
 * Returns the current user's subscription lifecycle data — plan, Stripe
 * subscription status, trial end date, next billing date, and cancellation
 * state. Consumed by the settings billing section and the post-checkout
 * success polling loop.
 *
 * Phase 4.5 — Sync Failsafe:
 * If the user has a stripeCustomerId, once per hour (per user, cached in Redis)
 * this endpoint fetches the live Stripe subscription and reconciles the DB if
 * the two have drifted apart (e.g. a webhook was missed during a server outage).
 */
export async function GET() {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rlResult = await checkIpRateLimit(ip, "billing:status", 30, 60);
  if (rlResult?.limited) return createIpRateLimitResponse(rlResult.retryAfter ?? 60);

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: {
      plan: true,
      stripeCustomerId: true,
      trialEndsAt: true,
      planExpiresAt: true,
    },
  });

  if (!dbUser) return ApiError.notFound("User");

  // Fetch the most recent subscription record for lifecycle details.
  const [latestSub] = await db
    .select({
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      cancelledAt: subscriptions.cancelledAt,
      stripePriceId: subscriptions.stripePriceId,
      plan: subscriptions.plan,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, session.user.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  // ── Phase 4.5 — Sync Failsafe ────────────────────────────────────────────
  // Once per hour per user, compare the DB subscription state against the live
  // Stripe API. If they've drifted (missed webhook, server outage), reconcile
  // both the `subscriptions` row and `user.plan`. Non-fatal — on any Stripe or
  // Redis error we fall through and return the DB data as-is.
  //
  // Mutable booleans track in-memory reconciliation so the response below
  // reflects the corrected state without a second DB round-trip.
  let reconciledPlan: string | null = null;

  if (stripe && dbUser.stripeCustomerId && latestSub?.stripeSubscriptionId) {
    const redis = getBillingRedis();
    const cacheKey = `billing:synced:${session.user.id}`;
    const isCached = redis ? await redis.get(cacheKey).catch(() => null) : null;

    if (!isCached) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(latestSub.stripeSubscriptionId, {
          expand: ["items"],
        });

        const stripeStatus = stripeStatusToDb(stripeSub.status);
        const newCancelAtPeriodEnd = stripeSub.cancel_at_period_end;
        const newPriceId = stripeSub.items.data[0]?.price?.id ?? null;
        const newPlan = newPriceId ? priceToPlan(newPriceId) : null;

        const statusMismatch = stripeStatus !== latestSub.status;
        const cancelMismatch = newCancelAtPeriodEnd !== (latestSub.cancelAtPeriodEnd ?? false);
        const planMismatch = newPlan && newPlan !== "free" && newPlan !== latestSub.plan;

        if (statusMismatch || cancelMismatch || planMismatch) {
          logger.warn("[billing] sync-failsafe: DB drifted from Stripe, reconciling", {
            userId: session.user.id,
            stripeSubscriptionId: latestSub.stripeSubscriptionId,
            dbStatus: latestSub.status,
            stripeStatus,
            dbCancelAtPeriodEnd: latestSub.cancelAtPeriodEnd,
            stripeCancelAtPeriodEnd: newCancelAtPeriodEnd,
            dbPlan: latestSub.plan,
            stripePlan: newPlan,
          });

          await db.transaction(async (tx) => {
            // Reconcile the subscription row.
            await tx
              .update(subscriptions)
              .set({
                status: stripeStatus,
                cancelAtPeriodEnd: newCancelAtPeriodEnd,
                ...(newPlan && newPlan !== "free" && newPriceId
                  ? {
                      plan: newPlan as "free" | "pro_monthly" | "pro_annual" | "agency",
                      stripePriceId: newPriceId,
                    }
                  : {}),
              })
              .where(eq(subscriptions.stripeSubscriptionId, latestSub.stripeSubscriptionId));

            // Reconcile user.plan when the subscription was cancelled or plan changed.
            if (stripeStatus === "cancelled" && latestSub.status !== "cancelled") {
              await tx
                .update(user)
                .set({ plan: "free", planExpiresAt: null })
                .where(eq(user.id, session.user.id));
              await tx.insert(planChangeLog).values({
                id: crypto.randomUUID(),
                userId: session.user.id,
                oldPlan: latestSub.plan,
                newPlan: "free" as const,
                reason: "sync_failsafe_cancelled",
                stripeSubscriptionId: latestSub.stripeSubscriptionId,
              });
              reconciledPlan = "free";
            } else if (planMismatch && newPlan) {
              await tx
                .update(user)
                .set({
                  plan: newPlan as "free" | "pro_monthly" | "pro_annual" | "agency",
                  planExpiresAt: null,
                })
                .where(eq(user.id, session.user.id));
              await tx.insert(planChangeLog).values({
                id: crypto.randomUUID(),
                userId: session.user.id,
                oldPlan: latestSub.plan,
                newPlan: newPlan as "free" | "pro_monthly" | "pro_annual" | "agency",
                reason: "sync_failsafe_plan_change",
                stripeSubscriptionId: latestSub.stripeSubscriptionId,
              });
              reconciledPlan = newPlan;
            }
          });

          // Mutate in-memory so the response reflects the corrected values.
          latestSub.status = stripeStatus;
          latestSub.cancelAtPeriodEnd = newCancelAtPeriodEnd;
        }
      } catch (syncErr) {
        logger.error("[billing] sync-failsafe failed — returning cached DB state", {
          error: syncErr,
        });
      }

      // Cache the check for 1 hour regardless of whether a reconciliation was
      // needed — the goal is to bound Stripe API calls, not to skip syncing.
      if (redis) await redis.setex(cacheKey, 3600, "1").catch(() => {});
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const plan = reconciledPlan ?? dbUser.plan ?? "free";

  // Derive the effective status:
  // 1. If there's a subscription record, use its status.
  // 2. If the user is on a paid plan but has no subscription record, treat as "active"
  //    (edge case: manually granted plan).
  // 3. Otherwise "free".
  let status: string;
  if (latestSub?.status) {
    status = latestSub.status;
  } else if (plan !== "free") {
    status = "active";
  } else {
    status = "free";
  }

  return Response.json({
    plan,
    status,
    trialEndsAt: dbUser.trialEndsAt ? dbUser.trialEndsAt.toISOString() : null,
    planExpiresAt: dbUser.planExpiresAt ? dbUser.planExpiresAt.toISOString() : null,
    currentPeriodEnd: latestSub?.currentPeriodEnd ? latestSub.currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: latestSub?.cancelAtPeriodEnd ?? false,
    cancelledAt: latestSub?.cancelledAt ? latestSub.cancelledAt.toISOString() : null,
    stripeCustomerId: dbUser.stripeCustomerId ?? null,
  });
}
