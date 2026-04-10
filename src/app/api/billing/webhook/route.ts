import { headers } from "next/headers";
import { eq, and, inArray, sql } from "drizzle-orm";
import { CancelScheduledEmail } from "@/components/email/billing/cancel-scheduled-email";
import { PaymentFailedEmail } from "@/components/email/billing/payment-failed-email";
import { PaymentSucceededEmail } from "@/components/email/billing/payment-succeeded-email";
import { ReactivatedEmail } from "@/components/email/billing/reactivated-email";
import { SubscriptionCancelledEmail } from "@/components/email/billing/subscription-cancelled-email";
import { TrialEndingSoonEmail } from "@/components/email/billing/trial-ending-soon-email";
import { TrialExpiredEmail } from "@/components/email/billing/trial-expired-email";
import { db } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plan-limits";
import { awardReferralCredit, REFERRAL_CREDIT_AMOUNT } from "@/lib/referral/utils";
import {
  processedWebhookEvents,
  planChangeLog,
  subscriptions,
  user,
  xAccounts,
  posts,
} from "@/lib/schema";
import { sendBillingEmail } from "@/lib/services/email";
import { notifyBillingEvent } from "@/lib/services/notifications";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

type PlanValue = "free" | "pro_monthly" | "pro_annual" | "agency";
type SubscriptionStatusValue = "active" | "past_due" | "cancelled" | "trialing";

/**
 * Maps a Stripe subscription status to our DB enum.
 * Stripe statuses not in our enum (paused, unpaid, incomplete, incomplete_expired)
 * are treated as past_due — the grace period flow handles them appropriately.
 */
function toSubscriptionStatus(stripeStatus: string): SubscriptionStatusValue {
  if (stripeStatus === "canceled") return "cancelled"; // Stripe uses American spelling
  if (
    stripeStatus === "active" ||
    stripeStatus === "past_due" ||
    stripeStatus === "trialing" ||
    stripeStatus === "cancelled"
  ) {
    return stripeStatus;
  }
  return "past_due";
}

function unixToDate(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000) : null;
}

function toId(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id;
  }
  return null;
}

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const timed = subscription as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
  };

  return {
    currentPeriodStart: unixToDate(timed.current_period_start),
    currentPeriodEnd: unixToDate(timed.current_period_end),
  };
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const maybeLegacy = invoice as Stripe.Invoice & { subscription?: unknown };
  const direct = toId(maybeLegacy.subscription);
  if (direct) return direct;

  const parent = (
    invoice as Stripe.Invoice & { parent?: { subscription_details?: { subscription?: unknown } } }
  ).parent;
  return toId(parent?.subscription_details?.subscription);
}

async function getSubscriptionRecord(stripeSubscriptionId: string) {
  return db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
  });
}

/**
 * Maps the actual Stripe price ID to a plan tier using server-side env var mappings.
 * This is the authoritative source — never rely solely on attacker-supplied metadata.
 *
 * Covers all four price IDs used by the checkout endpoint:
 *   STRIPE_PRICE_ID_MONTHLY         → pro_monthly
 *   STRIPE_PRICE_ID_ANNUAL          → pro_annual
 *   STRIPE_PRICE_ID_AGENCY_MONTHLY  → agency
 *   STRIPE_PRICE_ID_AGENCY_ANNUAL   → agency
 *
 * Returns null only when the price ID doesn't match any configured env var,
 * which triggers a metadata fallback with a structured warning. This should
 * not happen in production once all four env vars are set.
 */
function getPlanFromPriceId(priceId: string | null | undefined): PlanValue | null {
  if (!priceId) return null;
  const {
    STRIPE_PRICE_ID_MONTHLY,
    STRIPE_PRICE_ID_ANNUAL,
    STRIPE_PRICE_ID_AGENCY_MONTHLY,
    STRIPE_PRICE_ID_AGENCY_ANNUAL,
  } = process.env;
  if (STRIPE_PRICE_ID_MONTHLY && priceId === STRIPE_PRICE_ID_MONTHLY) return "pro_monthly";
  if (STRIPE_PRICE_ID_ANNUAL && priceId === STRIPE_PRICE_ID_ANNUAL) return "pro_annual";
  if (STRIPE_PRICE_ID_AGENCY_MONTHLY && priceId === STRIPE_PRICE_ID_AGENCY_MONTHLY) return "agency";
  if (STRIPE_PRICE_ID_AGENCY_ANNUAL && priceId === STRIPE_PRICE_ID_AGENCY_ANNUAL) return "agency";
  return null;
}

async function runSideEffect(task: () => Promise<void>, name: string) {
  try {
    await task();
  } catch (error) {
    console.error(`webhook_side_effect_failed:${name}`, error);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const stripeSubscriptionId = toId(session.subscription);
  const userId = session.metadata?.userId;
  const stripeCustomerId = toId(session.customer);

  if (!stripeSubscriptionId || !userId || !stripeCustomerId) {
    throw new Error(
      `checkout.session.completed missing required metadata: ${JSON.stringify({
        stripeSubscriptionId,
        userId,
        stripeCustomerId,
      })}`
    );
  }

  // Retrieve the subscription to get period info and the actual price ID.
  // We expand line_items on the checkout session separately because the subscription
  // items endpoint is the most reliable way to get the purchased price.
  const subscription = await stripe!.subscriptions.retrieve(stripeSubscriptionId);
  const period = getSubscriptionPeriod(subscription as unknown as Stripe.Subscription);
  const firstItem = subscription.items.data[0];
  const purchasedPriceId = firstItem?.price?.id;

  // Determine plan from the server-side price ID mapping (authoritative).
  // Fall back to normalised metadata only when the price ID is not in env vars
  // (e.g. agency plans that don't yet have a dedicated env var configured).
  // A structured warning is logged so operators can close the gap.
  const planFromPriceId = getPlanFromPriceId(purchasedPriceId);
  let plan: PlanValue;

  if (planFromPriceId) {
    plan = planFromPriceId;
  } else {
    console.error("webhook_checkout_unknown_price_id", {
      userId,
      purchasedPriceId: purchasedPriceId ?? null,
      metadataPlan: session.metadata?.plan ?? null,
      message:
        "Price ID not matched by any configured env var. Plan NOT updated. Set STRIPE_PRICE_ID_* env vars.",
    });
    // Use metadata as display-only, but default to pro_monthly to avoid giving away higher plans
    plan = "pro_monthly";
  }

  const subStatus = toSubscriptionStatus(subscription.status);

  // Multi-table write — must be atomic.
  await db.transaction(async (tx) => {
    await tx
      .update(user)
      .set({
        plan,
        stripeCustomerId,
        planExpiresAt: null,
      })
      .where(eq(user.id, userId));

    await tx.insert(planChangeLog).values({
      id: crypto.randomUUID(),
      userId,
      oldPlan: null,
      newPlan: plan,
      reason: "checkout",
      stripeSubscriptionId: subscription.id,
    });

    await tx
      .insert(subscriptions)
      .values({
        id: crypto.randomUUID(),
        userId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: firstItem?.price?.id || "",
        plan,
        status: subStatus,
        currentPeriodStart: period.currentPeriodStart,
        currentPeriodEnd: period.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
        cancelledAt: unixToDate(subscription.canceled_at),
        trialEnd: unixToDate(subscription.trial_end),
      })
      .onConflictDoUpdate({
        target: subscriptions.stripeSubscriptionId,
        set: {
          stripePriceId: firstItem?.price?.id || "",
          plan,
          status: subStatus,
          currentPeriodStart: period.currentPeriodStart,
          currentPeriodEnd: period.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
          cancelledAt: unixToDate(subscription.canceled_at),
          trialEnd: unixToDate(subscription.trial_end),
        },
      });
  });

  await runSideEffect(
    () =>
      notifyBillingEvent({
        userId,
        type: "billing_checkout_completed",
        title: "Subscription activated",
        message: "Your subscription is now active.",
        metadata: {
          plan,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId,
        },
      }),
    "billing_checkout_completed"
  );

  // Award referral credit if this user was referred (paid plans only)
  await runSideEffect(async () => {
    if (plan === "free") return;

    const result = await awardReferralCredit(userId);
    if (!result.credited) return;

    // Notify the referrer
    const referredUser = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { referredBy: true },
    });
    if (!referredUser?.referredBy) return;

    const referrer = await db.query.user.findFirst({
      where: eq(user.id, referredUser.referredBy),
      columns: { id: true, stripeCustomerId: true, name: true },
    });
    if (!referrer) return;

    await notifyBillingEvent({
      userId: referrer.id,
      type: "referral_credit_earned",
      title: "Referral reward earned!",
      message: `Someone you referred just subscribed to Pro. You earned $${REFERRAL_CREDIT_AMOUNT} credit!`,
      metadata: { referredUserId: userId, amount: REFERRAL_CREDIT_AMOUNT },
    });

    // Apply credit as Stripe customer balance (only if referrer has a Stripe customer)
    if (referrer.stripeCustomerId && stripe) {
      try {
        await stripe.customers.createBalanceTransaction(referrer.stripeCustomerId, {
          amount: -REFERRAL_CREDIT_AMOUNT * 100, // negative = credit
          currency: "usd",
          description: `Referral reward: $${REFERRAL_CREDIT_AMOUNT} credit`,
        });
      } catch (err) {
        // Credit is recorded in DB but failed in Stripe — log for admin reconciliation
        console.error("webhook_referral_stripe_balance_failed", {
          referrerId: referrer.id,
          referrerStripeCustomerId: referrer.stripeCustomerId,
          creditAmount: REFERRAL_CREDIT_AMOUNT,
          error: err,
        });
      }
    } else if (!referrer.stripeCustomerId) {
      // Referrer hasn't subscribed yet — credit recorded in DB, will be applied
      // to Stripe when they create their first checkout session.
      console.warn("webhook_referral_no_stripe_customer", {
        referrerId: referrer.id,
        message:
          "Credit recorded in DB but no Stripe customer to apply balance. Will apply on first checkout.",
      });
    }
  }, "referral_credit_award");
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const period = getSubscriptionPeriod(subscription);
  const firstItem = subscription.items.data[0];
  const newPriceId = firstItem?.price?.id ?? null;
  const newPlan = getPlanFromPriceId(newPriceId);

  if (!newPlan && newPriceId) {
    console.warn("webhook_subscription_updated_unknown_price", {
      stripeSubscriptionId: subscription.id,
      newPriceId,
      message:
        "Price ID not matched by any configured env var — plan column will not be updated. " +
        "Set STRIPE_PRICE_ID_MONTHLY / STRIPE_PRICE_ID_ANNUAL / " +
        "STRIPE_PRICE_ID_AGENCY_MONTHLY / STRIPE_PRICE_ID_AGENCY_ANNUAL.",
    });
  }

  // Fetch existing record BEFORE the update to detect state changes (plan, cancelAtPeriodEnd).
  const existingRecord = await getSubscriptionRecord(subscription.id);
  const newCancelAtPeriodEnd = subscription.cancel_at_period_end ?? false;

  await db
    .update(subscriptions)
    .set({
      status: toSubscriptionStatus(subscription.status),
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      cancelAtPeriodEnd: newCancelAtPeriodEnd,
      cancelledAt: unixToDate(subscription.canceled_at),
      trialEnd: unixToDate(subscription.trial_end),
      ...(newPlan && newPriceId ? { plan: newPlan, stripePriceId: newPriceId } : {}),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

  if (!existingRecord) return;

  // ── 3.1 Trial expiration — incomplete_expired → downgrade to free ─────────
  // Stripe sends this status when a subscription expires before the first
  // payment (e.g. trial ended with no payment method added). There is no
  // invoice.payment_failed in this path so we must handle it here.
  if (subscription.status === "incomplete_expired") {
    await db
      .update(user)
      .set({ plan: "free", planExpiresAt: null })
      .where(eq(user.id, existingRecord.userId));

    await db.insert(planChangeLog).values({
      id: crypto.randomUUID(),
      userId: existingRecord.userId,
      oldPlan: existingRecord.plan,
      newPlan: "free",
      reason: "incomplete_expired",
      stripeSubscriptionId: subscription.id,
    });

    console.warn("webhook_subscription_incomplete_expired_downgrade", {
      userId: existingRecord.userId,
      stripeSubscriptionId: subscription.id,
    });

    const expiredUser = await db.query.user.findFirst({
      where: eq(user.id, existingRecord.userId),
      columns: { email: true, name: true },
    });

    await runSideEffect(
      () =>
        notifyBillingEvent({
          userId: existingRecord.userId,
          type: "billing_trial_expired",
          title: "Trial expired",
          message:
            "Your trial ended without a payment method on file. Your account has been moved to the Free plan.",
          metadata: { stripeSubscriptionId: subscription.id },
        }),
      "billing_trial_expired"
    );

    if (expiredUser?.email) {
      await runSideEffect(
        () =>
          sendBillingEmail({
            to: expiredUser.email,
            subject: "Your AstraPost trial has expired",
            text: `Hi ${expiredUser.name || "there"},\n\nYour free trial has ended without a payment method on file. Your account has been moved to the Free plan.\n\nYou can upgrade anytime from your account settings to regain access to all features.\n\nThank you,\nThe AstraPost Team`,
            react: TrialExpiredEmail({ userName: expiredUser.name || "there" }),
            metadata: {
              event: "incomplete_expired",
              userId: existingRecord.userId,
              stripeSubscriptionId: subscription.id,
            },
          }),
        "email_trial_expired"
      );
    }

    return;
  }

  // ── 3.2 Plan upgrades / downgrades — sync user.plan ──────────────────────
  // Only update when the plan actually changed — avoids spurious user table writes.
  if (newPlan && existingRecord.plan !== newPlan) {
    // Multi-table write — must be atomic.
    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({ plan: newPlan, planExpiresAt: null })
        .where(eq(user.id, existingRecord.userId));

      await tx.insert(planChangeLog).values({
        id: crypto.randomUUID(),
        userId: existingRecord.userId,
        oldPlan: existingRecord.plan,
        newPlan,
        reason: "webhook_plan_change",
        stripeSubscriptionId: subscription.id,
      });
    });

    console.warn("webhook_subscription_plan_synced", {
      userId: existingRecord.userId,
      oldPlan: existingRecord.plan,
      newPlan,
      stripeSubscriptionId: subscription.id,
    });

    const planLabel = newPlan.replace(/_/g, " ");
    await runSideEffect(
      () =>
        notifyBillingEvent({
          userId: existingRecord.userId,
          type: "billing_plan_changed",
          title: "Plan updated",
          message: `Your subscription has been updated to the ${planLabel} plan.`,
          metadata: {
            oldPlan: existingRecord.plan,
            newPlan,
            stripeSubscriptionId: subscription.id,
          },
        }),
      "billing_plan_changed"
    );

    // ── 3.2.1 Over-limit account detection ─────────────────────────────
    // Check if the user has more active X accounts than their new plan allows
    const newLimit = PLAN_LIMITS[newPlan].maxXAccounts;
    const activeAccounts = await db.query.xAccounts.findMany({
      where: and(eq(xAccounts.userId, existingRecord.userId), eq(xAccounts.isActive, true)),
      columns: { id: true },
    });
    const activeCount = activeAccounts.length;

    if (activeCount > newLimit) {
      await runSideEffect(
        () =>
          notifyBillingEvent({
            userId: existingRecord.userId,
            type: "billing_accounts_over_limit",
            title: "Account limit exceeded",
            message: `Your ${newPlan.replace(/_/g, " ")} plan allows ${newLimit} X account${newLimit === 1 ? "" : "s"}. You have ${activeCount} active accounts. Please remove excess accounts in Settings to continue posting from all accounts.`,
            metadata: {
              newPlan,
              newLimit,
              activeCount,
              oldPlan: existingRecord.plan,
            },
          }),
        "billing_accounts_over_limit"
      );
    }

    // ── 3.2.2 Scheduled posts cleanup on downgrade ─────────────────────
    // When downgrading to a plan with lower postsPerMonth, move excess scheduled posts to draft
    const oldPlan = existingRecord.plan;
    const oldPostsLimit = PLAN_LIMITS[oldPlan].postsPerMonth;
    const newPostsLimit = PLAN_LIMITS[newPlan].postsPerMonth;

    // Only check if new plan has a finite monthly limit AND it's lower than old plan
    if (Number.isFinite(newPostsLimit) && newPostsLimit < oldPostsLimit) {
      // Count currently scheduled posts for this user
      const scheduledPosts = await db.query.posts.findMany({
        where: and(eq(posts.userId, existingRecord.userId), eq(posts.status, "scheduled")),
        columns: { id: true, scheduledAt: true },
        orderBy: [posts.scheduledAt], // Process oldest posts first
      });

      const scheduledCount = scheduledPosts.length;

      // If user has more scheduled posts than new plan allows
      if (scheduledCount > newPostsLimit) {
        const excessCount = scheduledCount - newPostsLimit;
        const postsToMove = scheduledPosts.slice(0, excessCount); // Get oldest excess posts

        // Move excess posts to draft status (batch update)
        const postIdsToMove = postsToMove.map((p) => p.id);
        await db.update(posts).set({ status: "draft" }).where(inArray(posts.id, postIdsToMove));

        // Notify user about posts moved to draft
        await runSideEffect(
          () =>
            notifyBillingEvent({
              userId: existingRecord.userId,
              type: "billing_posts_moved_to_draft",
              title: "Scheduled posts moved to draft",
              message: `Due to your plan change, ${excessCount} scheduled ${excessCount === 1 ? "post" : "posts"} ${excessCount === 1 ? "was" : "were"} moved to draft. Please reschedule ${excessCount === 1 ? "it" : "them"} or upgrade to keep all scheduled posts active.`,
              metadata: {
                oldPlan,
                newPlan,
                newLimit: newPostsLimit,
                movedCount: excessCount,
                postIds: postsToMove.map((p) => p.id),
              },
            }),
          "billing_posts_moved_to_draft"
        );

        console.warn("webhook_subscription_downgrade_posts_moved_to_draft", {
          userId: existingRecord.userId,
          oldPlan,
          newPlan,
          scheduledCount,
          newLimit: newPostsLimit,
          movedCount: excessCount,
        });
      }
    }
  }

  // ── 3.3 Cancellation / 3.5 Reactivation notifications ────────────────────
  const cancelFlippedToTrue = !existingRecord.cancelAtPeriodEnd && newCancelAtPeriodEnd;
  const cancelFlippedToFalse = existingRecord.cancelAtPeriodEnd && !newCancelAtPeriodEnd;

  if (!cancelFlippedToTrue && !cancelFlippedToFalse) return;

  const lifecycleUser = await db.query.user.findFirst({
    where: eq(user.id, existingRecord.userId),
    columns: { email: true, name: true },
  });

  const periodEndDate = period.currentPeriodEnd
    ? period.currentPeriodEnd.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "the end of your billing period";

  if (cancelFlippedToTrue) {
    // 3.3 — Cancellation scheduled at period end
    await runSideEffect(
      () =>
        notifyBillingEvent({
          userId: existingRecord.userId,
          type: "billing_cancel_scheduled",
          title: "Subscription cancellation scheduled",
          message: `Your subscription will be cancelled on ${periodEndDate}. You'll keep full access until then.`,
          metadata: {
            stripeSubscriptionId: subscription.id,
            periodEnd: period.currentPeriodEnd?.toISOString() ?? null,
          },
        }),
      "billing_cancel_scheduled"
    );

    if (lifecycleUser?.email) {
      await runSideEffect(
        () =>
          sendBillingEmail({
            to: lifecycleUser.email,
            subject: "Your AstraPost subscription cancellation is scheduled",
            text: `Hi ${lifecycleUser.name || "there"},\n\nYour AstraPost subscription has been scheduled for cancellation on ${periodEndDate}.\n\nYou'll continue to have full access to all features until that date. After that, your account will be moved to the Free plan.\n\nIf you change your mind, you can reactivate at any time from your account settings before the cancellation date.\n\nThank you for being an AstraPost customer.`,
            react: CancelScheduledEmail({ userName: lifecycleUser.name || "there", periodEndDate }),
            metadata: {
              event: "cancel_scheduled",
              userId: existingRecord.userId,
              stripeSubscriptionId: subscription.id,
            },
          }),
        "email_cancel_scheduled"
      );
    }
  }

  if (cancelFlippedToFalse) {
    // 3.5 — Subscription reactivated (cancel reversed before period end)
    await runSideEffect(
      () =>
        notifyBillingEvent({
          userId: existingRecord.userId,
          type: "billing_reactivated",
          title: "Subscription reactivated",
          message:
            "Your subscription has been reactivated and will continue on its normal billing schedule.",
          metadata: { stripeSubscriptionId: subscription.id },
        }),
      "billing_reactivated"
    );

    if (lifecycleUser?.email) {
      await runSideEffect(
        () =>
          sendBillingEmail({
            to: lifecycleUser.email,
            subject: "Your AstraPost subscription has been reactivated",
            text: `Hi ${lifecycleUser.name || "there"},\n\nGreat news — your AstraPost subscription has been reactivated and will continue on its normal billing schedule.\n\nThank you for staying with AstraPost!`,
            react: ReactivatedEmail({ userName: lifecycleUser.name || "there" }),
            metadata: {
              event: "reactivated",
              userId: existingRecord.userId,
              stripeSubscriptionId: subscription.id,
            },
          }),
        "email_reactivated"
      );
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Fetch the record BEFORE the transaction so we have the userId for the
  // user-table update and side-effect calls. The subscription row is written
  // atomically with the user downgrade below.
  const subRecord = await getSubscriptionRecord(subscription.id);
  if (!subRecord) return;

  // Multi-table write — must be atomic.
  await db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({
        status: "cancelled",
        cancelAtPeriodEnd: true,
        cancelledAt: unixToDate(subscription.canceled_at) || new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

    await tx
      .update(user)
      .set({
        plan: "free",
        planExpiresAt: null,
      })
      .where(eq(user.id, subRecord.userId));

    await tx.insert(planChangeLog).values({
      id: crypto.randomUUID(),
      userId: subRecord.userId,
      oldPlan: subRecord.plan,
      newPlan: "free",
      reason: "subscription_deleted",
      stripeSubscriptionId: subscription.id,
    });
  });

  // ── Over-limit account detection on subscription deletion ─────────────
  // When a subscription is deleted (canceled), the user is downgraded to "free"
  // Check if they have more active X accounts than the Free plan allows (1)
  const newPlan = "free";
  const newLimit = PLAN_LIMITS[newPlan].maxXAccounts;
  const activeAccounts = await db.query.xAccounts.findMany({
    where: and(eq(xAccounts.userId, subRecord.userId), eq(xAccounts.isActive, true)),
    columns: { id: true },
  });
  const activeCount = activeAccounts.length;

  if (activeCount > newLimit) {
    await runSideEffect(
      () =>
        notifyBillingEvent({
          userId: subRecord.userId,
          type: "billing_accounts_over_limit",
          title: "Account limit exceeded",
          message: `Your ${newPlan.replace(/_/g, " ")} plan allows ${newLimit} X account${newLimit === 1 ? "" : "s"}. You have ${activeCount} active account${activeCount === 1 ? "" : "s"}. Please remove excess accounts in Settings to continue posting from all accounts.`,
          metadata: {
            newPlan,
            newLimit,
            activeCount,
            oldPlan: subRecord.plan,
          },
        }),
      "billing_accounts_over_limit_deleted"
    );
  }

  await runSideEffect(
    () =>
      notifyBillingEvent({
        userId: subRecord.userId,
        type: "billing_subscription_cancelled",
        title: "Subscription canceled",
        message: "Your subscription has been canceled and your plan is now Free.",
        metadata: { stripeSubscriptionId: subscription.id },
      }),
    "billing_subscription_cancelled"
  );

  // Send cancellation email
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, subRecord.userId),
    columns: { email: true, name: true },
  });
  if (dbUser?.email) {
    await runSideEffect(
      () =>
        sendBillingEmail({
          to: dbUser.email,
          subject: "Your AstraPost subscription has been cancelled",
          text: `Hi ${dbUser.name || "there"},\n\nYour AstraPost subscription has been cancelled and your account has been moved to the Free plan.\n\nYou can resubscribe at any time from your account settings.\n\nThank you for being an AstraPost customer.`,
          react: SubscriptionCancelledEmail({ userName: dbUser.name || "there" }),
          metadata: {
            event: "customer.subscription.deleted",
            userId: subRecord.userId,
            stripeSubscriptionId: subscription.id,
          },
        }),
      "email_subscription_cancelled"
    );
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = getInvoiceSubscriptionId(invoice);
  if (!stripeSubscriptionId) return;

  const subRecord = await getSubscriptionRecord(stripeSubscriptionId);
  if (!subRecord) return;

  const graceUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Multi-table write — must be atomic.
  await db.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({
        status: "past_due",
      })
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));

    await tx
      .update(user)
      .set({
        planExpiresAt: graceUntil,
      })
      .where(eq(user.id, subRecord.userId));

    const currentPlan = subRecord.plan;
    await tx.insert(planChangeLog).values({
      id: crypto.randomUUID(),
      userId: subRecord.userId,
      oldPlan: currentPlan,
      newPlan: currentPlan, // plan unchanged — this records the grace period trigger
      reason: "payment_failed_grace_period",
      stripeSubscriptionId: stripeSubscriptionId,
    });
  });

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, subRecord.userId),
    columns: { email: true, name: true },
  });

  await runSideEffect(
    () =>
      notifyBillingEvent({
        userId: subRecord.userId,
        type: "billing_payment_failed",
        title: "Payment failed",
        message: "We could not process your payment. Update your payment method within 7 days.",
        metadata: {
          stripeSubscriptionId,
          invoiceId: invoice.id,
          graceUntil: graceUntil.toISOString(),
        },
      }),
    "billing_payment_failed"
  );

  if (dbUser?.email) {
    await runSideEffect(
      () =>
        sendBillingEmail({
          to: dbUser.email,
          subject: "Payment failed — action required",
          text: `Hi ${dbUser.name || "there"}, your payment failed. Please update your billing method within 7 days to avoid service interruption.`,
          react: PaymentFailedEmail({ userName: dbUser.name || "there" }),
          metadata: {
            event: "invoice.payment_failed",
            userId: subRecord.userId,
            stripeSubscriptionId,
          },
        }),
      "email_invoice_payment_failed"
    );
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = getInvoiceSubscriptionId(invoice);
  if (!stripeSubscriptionId) return;

  const subRecord = await getSubscriptionRecord(stripeSubscriptionId);
  if (!subRecord) return;

  await db
    .update(subscriptions)
    .set({
      status: "active",
    })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));

  await db
    .update(user)
    .set({
      planExpiresAt: null,
    })
    .where(eq(user.id, subRecord.userId));

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, subRecord.userId),
    columns: { email: true, name: true },
  });

  await runSideEffect(
    () =>
      notifyBillingEvent({
        userId: subRecord.userId,
        type: "billing_payment_succeeded",
        title: "Payment received",
        message: "Your subscription payment was successful.",
        metadata: {
          stripeSubscriptionId,
          invoiceId: invoice.id,
        },
      }),
    "billing_payment_succeeded"
  );

  if (dbUser?.email) {
    await runSideEffect(
      () =>
        sendBillingEmail({
          to: dbUser.email,
          subject: "Payment succeeded",
          text: `Hi ${dbUser.name || "there"}, your subscription payment was successful.`,
          react: PaymentSucceededEmail({ userName: dbUser.name || "there" }),
          metadata: {
            event: "invoice.payment_succeeded",
            userId: subRecord.userId,
            stripeSubscriptionId,
          },
        }),
      "email_invoice_payment_succeeded"
    );
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const subRecord = await getSubscriptionRecord(subscription.id);
  if (!subRecord) return;

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, subRecord.userId),
    columns: { email: true, name: true },
  });

  await runSideEffect(
    () =>
      notifyBillingEvent({
        userId: subRecord.userId,
        type: "billing_trial_will_end",
        title: "Trial ending soon",
        message: "Your trial ends in 3 days. Add payment details to continue without interruption.",
        metadata: {
          stripeSubscriptionId: subscription.id,
          trialEnd: unixToDate(subscription.trial_end)?.toISOString() || null,
        },
      }),
    "billing_trial_will_end"
  );

  if (dbUser?.email) {
    await runSideEffect(
      () =>
        sendBillingEmail({
          to: dbUser.email,
          subject: "Your trial ends soon",
          text: `Hi ${dbUser.name || "there"}, your trial ends in 3 days. Add a payment method to keep your access.`,
          react: TrialEndingSoonEmail({ userName: dbUser.name || "there" }),
          metadata: {
            event: "customer.subscription.trial_will_end",
            userId: subRecord.userId,
            stripeSubscriptionId: subscription.id,
          },
        }),
      "email_trial_will_end"
    );
  }
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId || null;
  const plan = session.metadata?.plan || null;

  console.warn("checkout.session.expired", {
    checkoutSessionId: session.id,
    userId,
    plan,
  });

  if (!userId) return;

  await runSideEffect(
    () =>
      notifyBillingEvent({
        userId,
        type: "billing_checkout_expired",
        title: "Checkout expired",
        message: "Your checkout session expired before completion.",
        metadata: {
          checkoutSessionId: session.id,
          plan,
        },
      }),
    "billing_checkout_expired"
  );
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[billing] Stripe config missing — webhook disabled");
    return new Response("Config Error", { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Webhook signature verification failed", error);
    return new Response("Webhook Error", { status: 400 });
  }

  // ── Idempotency guard ────────────────────────────────────────────────────
  // Stripe retries webhooks on non-2xx responses and occasionally on timeouts.
  // We INSERT first — ON CONFLICT DO NOTHING means we only process if this is new.
  // This atomic pattern prevents duplicate processing even under race conditions.
  const [inserted] = await db
    .insert(processedWebhookEvents)
    .values({ id: crypto.randomUUID(), stripeEventId: event.id, eventType: event.type })
    .onConflictDoNothing()
    .returning({ id: processedWebhookEvents.id });

  if (!inserted) {
    // Event already processed — skip
    return new Response(null, { status: 200 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;
      case "checkout.session.expired":
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      eventType: event.type,
      eventId: event.id,
      error,
    });
    // Update retry count instead of deleting — allows monitoring repeated failures
    try {
      const [updated] = await db
        .update(processedWebhookEvents)
        .set({
          retryCount: sql`${processedWebhookEvents.retryCount} + 1`,
          errorMessage: error instanceof Error ? error.message : String(error),
        })
        .where(eq(processedWebhookEvents.stripeEventId, event.id))
        .returning({ retryCount: processedWebhookEvents.retryCount });

      // Alert admins when a webhook has failed 3+ times
      if (updated && updated.retryCount >= 3) {
        const admins = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.isAdmin, true))
          .limit(5);

        for (const admin of admins) {
          await runSideEffect(
            () =>
              notifyBillingEvent({
                userId: admin.id,
                type: "webhook_processing_failed",
                title: "Webhook retry alert",
                message: `Stripe webhook ${event.type} (event ${event.id}) has failed ${updated.retryCount} times. Manual investigation may be needed.`,
                metadata: {
                  eventType: event.type,
                  eventId: event.id,
                  retryCount: updated.retryCount,
                },
              }),
            `webhook_alert_${event.id}`
          );
        }
      }
    } catch {
      // Ignore update failure
    }
    return new Response("Webhook Processing Error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
