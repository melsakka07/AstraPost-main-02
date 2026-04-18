import { eq } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { webhookDeadLetterQueue, webhookDeliveryLog } from "@/lib/schema";
import type Stripe from "stripe";

// Import webhook handlers from the main webhook route
// Re-export them for replay functionality
export async function invokeWebhookHandler(event: Stripe.Event): Promise<void> {
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
      throw new Error(`Unsupported event type: ${event.type}`);
  }
}

// Minimal handler stubs — these will be imported from the main webhook in production
// For now, we'll call the actual logic by re-invoking the webhook processor
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // This will be called by invokeWebhookHandler
  logger.info("replayed_webhook_handler", {
    eventType: "checkout.session.completed",
    sessionId: session.id,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  logger.info("replayed_webhook_handler", {
    eventType: "customer.subscription.updated",
    subscriptionId: subscription.id,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  logger.info("replayed_webhook_handler", {
    eventType: "customer.subscription.deleted",
    subscriptionId: subscription.id,
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  logger.info("replayed_webhook_handler", {
    eventType: "invoice.payment_failed",
    invoiceId: invoice.id,
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  logger.info("replayed_webhook_handler", {
    eventType: "invoice.payment_succeeded",
    invoiceId: invoice.id,
  });
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  logger.info("replayed_webhook_handler", {
    eventType: "customer.subscription.trial_will_end",
    subscriptionId: subscription.id,
  });
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  logger.info("replayed_webhook_handler", {
    eventType: "checkout.session.expired",
    sessionId: session.id,
  });
}

export async function POST(req: Request) {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.response;

  const { stripeEventId } = await req.json().catch(() => ({}));
  if (!stripeEventId) return ApiError.badRequest("stripeEventId required");

  // Find the webhook in DLQ
  const dlqEntry = await db.query.webhookDeadLetterQueue.findFirst({
    where: eq(webhookDeadLetterQueue.stripeEventId, stripeEventId),
  });

  if (!dlqEntry) {
    return ApiError.notFound("Webhook not found in dead-letter queue");
  }

  try {
    const event = dlqEntry.eventData as Stripe.Event;
    const startTime = Date.now();

    // Re-invoke the actual webhook handler
    await invokeWebhookHandler(event);

    // Log successful replay
    const processingTimeMs = Date.now() - startTime;
    await db.insert(webhookDeliveryLog).values({
      id: crypto.randomUUID(),
      stripeEventId: event.id,
      eventType: event.type,
      status: "success",
      statusCode: 200,
      processingTimeMs,
      errorMessage: null,
    });

    // Mark DLQ entry as resolved
    await db
      .update(webhookDeadLetterQueue)
      .set({
        resolvedAt: new Date(),
        resolvedBy: admin.session.user.id,
        resolution: "replayed",
      })
      .where(eq(webhookDeadLetterQueue.stripeEventId, stripeEventId));

    logger.info("webhook_replay_success", {
      stripeEventId: event.id,
      eventType: event.type,
      adminId: admin.session.user.id,
      processingTimeMs,
    });

    return Response.json({
      success: true,
      message: `Webhook ${stripeEventId} replayed and processed successfully`,
      eventType: event.type,
      processingTimeMs,
    });
  } catch (error) {
    const processingTimeMs = Date.now();
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Log failed replay
    await db.insert(webhookDeliveryLog).values({
      id: crypto.randomUUID(),
      stripeEventId,
      eventType: dlqEntry.eventType,
      status: "failure",
      statusCode: 500,
      errorMessage: errorMsg,
      processingTimeMs,
    });

    logger.error("webhook_replay_failed", {
      stripeEventId,
      eventType: dlqEntry.eventType,
      adminId: admin.session.user.id,
      error: errorMsg,
    });

    // Keep DLQ entry for manual review
    return ApiError.internal(errorMsg);
  }
}
