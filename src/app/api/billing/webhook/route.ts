import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { subscriptions, user } from "@/lib/schema";
import { sendBillingEmail } from "@/lib/services/email";
import { notifyBillingEvent } from "@/lib/services/notifications";

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
  const plan = normalizeCheckoutPlan(session.metadata?.plan);
  const stripeCustomerId = toId(session.customer);

  if (!stripeSubscriptionId || !userId || !stripeCustomerId) {
    throw new Error(`checkout.session.completed missing required metadata: ${JSON.stringify({
      stripeSubscriptionId,
      userId,
      stripeCustomerId,
    })}`);
  }

  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const period = getSubscriptionPeriod(subscription as unknown as Stripe.Subscription);
  const firstItem = subscription.items.data[0];

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
    status: subscription.status,
    currentPeriodStart: period.currentPeriodStart,
    currentPeriodEnd: period.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    cancelledAt: unixToDate(subscription.canceled_at),
  }).onConflictDoUpdate({
    target: subscriptions.stripeSubscriptionId,
    set: {
      stripePriceId: firstItem?.price?.id || "",
      plan,
      status: subscription.status,
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
  await db.update(subscriptions).set({
    status: subscription.status,
    currentPeriodStart: period.currentPeriodStart,
    currentPeriodEnd: period.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    cancelledAt: unixToDate(subscription.canceled_at),
  }).where(eq(subscriptions.stripeSubscriptionId, subscription.id));
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
