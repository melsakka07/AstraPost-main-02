import { eq } from "drizzle-orm";
import {
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
  handleTrialWillEnd,
  handleCheckoutExpired,
} from "@/app/api/billing/webhook/route";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { webhookDeadLetterQueue, webhookDeliveryLog } from "@/lib/schema";
import type Stripe from "stripe";

/**
 * Invokes the actual webhook handler for a given Stripe event.
 * This allows admins to replay failed webhooks through the same processing logic.
 */
async function invokeWebhookHandler(event: Stripe.Event): Promise<void> {
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

export async function POST(req: Request) {
  const admin = await requireAdminApi();
  if (!admin.ok) return admin.response;

  const rl = await checkAdminRateLimit("destructive");
  if (rl) return rl;

  const correlationId = getCorrelationId(req);

  const { stripeEventId } = await req.json().catch(() => ({}));
  if (!stripeEventId) return ApiError.badRequest("stripeEventId required");

  logger.info("webhook_replay_initiated", {
    stripeEventId,
    adminId: admin.session.user.id,
  });

  // Find the webhook in DLQ
  const dlqEntry = await db.query.webhookDeadLetterQueue.findFirst({
    where: eq(webhookDeadLetterQueue.stripeEventId, stripeEventId),
  });

  if (!dlqEntry) {
    logger.warn("webhook_replay_not_found", {
      stripeEventId,
      adminId: admin.session.user.id,
    });
    return ApiError.notFound("Webhook not found in dead-letter queue");
  }

  try {
    const event = dlqEntry.eventData as Stripe.Event;
    const startTime = Date.now();

    logger.info("webhook_replay_handler_invoking", {
      stripeEventId: event.id,
      eventType: event.type,
      adminId: admin.session.user.id,
    });

    // Re-invoke the actual webhook handler using the same processing logic
    // as the main webhook endpoint
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
      message: "Webhook successfully replayed and processed through actual handler",
    });

    await logAdminAction({
      adminId: admin.session.user.id,
      action: "webhook_replay",
      targetType: "webhook",
      targetId: stripeEventId,
      details: { eventType: event.type, processingTimeMs, resolution: "replayed" },
    });

    const res = Response.json({
      success: true,
      message: `Webhook ${stripeEventId} replayed and processed successfully`,
      eventType: event.type,
      processingTimeMs,
    });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    const processingTimeMs = Date.now();
    const errorMsg = error instanceof Error ? error.message : String(error);

    logger.error("webhook_replay_handler_failed", {
      stripeEventId,
      eventType: dlqEntry.eventType,
      adminId: admin.session.user.id,
      error: errorMsg,
      message: "Handler invocation failed during replay",
    });

    // Log failed replay attempt
    await db.insert(webhookDeliveryLog).values({
      id: crypto.randomUUID(),
      stripeEventId,
      eventType: dlqEntry.eventType,
      status: "failure",
      statusCode: 500,
      errorMessage: errorMsg,
      processingTimeMs,
    });

    // Keep DLQ entry for manual review
    return ApiError.internal(errorMsg);
  }
}
