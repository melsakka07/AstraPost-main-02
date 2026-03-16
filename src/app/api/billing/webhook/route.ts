import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { processedWebhookEvents, subscriptions, user } from "@/lib/schema";
import { sendBillingEmail } from "@/lib/services/email";
import { notifyBillingEvent } from "@/lib/services/notifications";

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

  const parent = (invoice as Stripe.Invoice & { parent?: { subscription_details?: { subscription?: unknown } } }).parent;
  return toId(parent?.subscription_details?.subscription);
}

async function getSubscriptionRecord(stripeSubscriptionId: string) {
  return db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
  });
}

function normalizeCheckoutPlan(plan: string | undefined) {
  if (!plan) return "pro_monthly";
  if (plan === "agency_monthly" || plan === "agency_annual") return "agency";
  if (plan === "pro_monthly" || plan === "pro_annual" || plan === "agency") return plan;
  return "pro_monthly";
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
  if (STRIPE_PRICE_ID_MONTHLY        && priceId === STRIPE_PRICE_ID_MONTHLY)        return "pro_monthly";
  if (STRIPE_PRICE_ID_ANNUAL         && priceId === STRIPE_PRICE_ID_ANNUAL)         return "pro_annual";
  if (STRIPE_PRICE_ID_AGENCY_MONTHLY && priceId === STRIPE_PRICE_ID_AGENCY_MONTHLY) return "agency";
  if (STRIPE_PRICE_ID_AGENCY_ANNUAL  && priceId === STRIPE_PRICE_ID_AGENCY_ANNUAL)  return "agency";
  return null;
}

async function runSideEffect(task: () => Promise<void>, name: string) {
  try {
    await task();
  } catch (error) {
    console.error(`webhook_side_effect_failed:${name}`, error);
  }
}

async function handleCheckoutCompleted(stripe: Stripe, session: Stripe.Checkout.Session) {
  const stripeSubscriptionId = toId(session.subscription);
  const userId = session.metadata?.userId;
  const stripeCustomerId = toId(session.customer);

  if (!stripeSubscriptionId || !userId || !stripeCustomerId) {
    throw new Error(`checkout.session.completed missing required metadata: ${JSON.stringify({
      stripeSubscriptionId,
      userId,
      stripeCustomerId,
    })}`);
  }

  // Retrieve the subscription to get period info and the actual price ID.
  // We expand line_items on the checkout session separately because the subscription
  // items endpoint is the most reliable way to get the purchased price.
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
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
    const metadataPlan = normalizeCheckoutPlan(session.metadata?.plan);
    console.warn("webhook_checkout_plan_metadata_fallback", {
      userId,
      purchasedPriceId: purchasedPriceId ?? null,
      metadataPlan,
      message:
        "Price ID not matched by any configured env var — falling back to session metadata. " +
        "Set STRIPE_PRICE_ID_MONTHLY, STRIPE_PRICE_ID_ANNUAL, " +
        "STRIPE_PRICE_ID_AGENCY_MONTHLY, and STRIPE_PRICE_ID_AGENCY_ANNUAL to eliminate this warning.",
    });
    plan = metadataPlan as PlanValue;
  }

  const subStatus = toSubscriptionStatus(subscription.status);

  await db.update(user).set({
    plan,
    stripeCustomerId,
    planExpiresAt: null,
  }).where(eq(user.id, userId));

  await db.insert(subscriptions).values({
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
  }).onConflictDoUpdate({
    target: subscriptions.stripeSubscriptionId,
    set: {
      stripePriceId: firstItem?.price?.id || "",
      plan,
      status: subStatus,
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      cancelledAt: unixToDate(subscription.canceled_at),
    },
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

  // Fetch existing record BEFORE the update to capture the previous plan for change detection.
  const existingRecord = await getSubscriptionRecord(subscription.id);

  await db
    .update(subscriptions)
    .set({
      status: toSubscriptionStatus(subscription.status),
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      cancelledAt: unixToDate(subscription.canceled_at),
      ...(newPlan && newPriceId ? { plan: newPlan, stripePriceId: newPriceId } : {}),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

  // Sync user.plan only when the plan actually changed — avoids spurious user table writes.
  if (!newPlan || !existingRecord || existingRecord.plan === newPlan) return;

  await db
    .update(user)
    .set({ plan: newPlan, planExpiresAt: null })
    .where(eq(user.id, existingRecord.userId));

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
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await db.update(subscriptions).set({
    status: "cancelled",
    cancelAtPeriodEnd: true,
    cancelledAt: unixToDate(subscription.canceled_at) || new Date(),
  }).where(eq(subscriptions.stripeSubscriptionId, subscription.id));

  const subRecord = await getSubscriptionRecord(subscription.id);
  if (!subRecord) return;

  await db.update(user).set({
    plan: "free",
    planExpiresAt: null,
  }).where(eq(user.id, subRecord.userId));

  await runSideEffect(
    () =>
      notifyBillingEvent({
        userId: subRecord.userId,
        type: "billing_subscription_cancelled",
        title: "Subscription canceled",
        message: "Your subscription has been canceled and your plan is now Free.",
        metadata: {
          stripeSubscriptionId: subscription.id,
        },
      }),
    "billing_subscription_cancelled"
  );
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = getInvoiceSubscriptionId(invoice);
  if (!stripeSubscriptionId) return;

  const subRecord = await getSubscriptionRecord(stripeSubscriptionId);
  if (!subRecord) return;

  const graceUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.update(subscriptions).set({
    status: "past_due",
  }).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));

  await db.update(user).set({
    planExpiresAt: graceUntil,
  }).where(eq(user.id, subRecord.userId));

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

  await db.update(subscriptions).set({
    status: "active",
  }).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));

  await db.update(user).set({
    planExpiresAt: null,
  }).where(eq(user.id, subRecord.userId));

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

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Stripe config missing");
    return new Response("Config Error", { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Webhook signature verification failed", error);
    return new Response("Webhook Error", { status: 400 });
  }

  // ── Idempotency guard ────────────────────────────────────────────────────
  // Stripe retries webhooks on non-2xx responses and occasionally on timeouts.
  // We skip processing and return 200 immediately if we have already recorded
  // this event ID — preventing duplicate billing emails and notifications.
  const alreadyProcessed = await db.query.processedWebhookEvents.findFirst({
    where: eq(processedWebhookEvents.stripeEventId, event.id),
    columns: { id: true },
  });
  if (alreadyProcessed) {
    return new Response(null, { status: 200 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(stripe, event.data.object as Stripe.Checkout.Session);
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

    // Record the event as successfully processed.
    // This insert is intentionally placed AFTER the switch so that any
    // processing failure (thrown exception) leaves the event unrecorded,
    // allowing Stripe's retry to re-attempt it.
    await db.insert(processedWebhookEvents).values({
      id: crypto.randomUUID(),
      stripeEventId: event.id,
    });
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      eventType: event.type,
      eventId: event.id,
      error,
    });
    return new Response("Webhook Processing Error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
