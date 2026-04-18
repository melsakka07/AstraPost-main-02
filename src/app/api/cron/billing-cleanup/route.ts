import { eq, and, ne, lt } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { cache } from "@/lib/cache";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { processedWebhookEvents, user, planChangeLog } from "@/lib/schema";
import { notifyBillingEvent } from "@/lib/services/notifications";
import { stripe } from "@/lib/stripe";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return ApiError.unauthorized();
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  let webhookEventsDeleted = 0;
  let gracePeriodsExpired = 0;

  // Clean up processed webhook events older than 90 days
  try {
    const deleted = await db
      .delete(processedWebhookEvents)
      .where(lt(processedWebhookEvents.processedAt, ninetyDaysAgo))
      .returning({ id: processedWebhookEvents.id });

    webhookEventsDeleted = deleted.length;
  } catch (error) {
    logger.error("[cron] billing cleanup failed", { error });
    return ApiError.internal("Cleanup failed");
  }

  // Clean up plan_change_log entries older than configured retention period
  // Default: 7 years, configurable via PLAN_CHANGE_LOG_RETENTION_YEARS env var
  let planChangesDeleted = 0;
  try {
    const retentionYears = parseInt(process.env.PLAN_CHANGE_LOG_RETENTION_YEARS || "7", 10);
    const retentionMs = retentionYears * 365 * 24 * 60 * 60 * 1000;
    const retentionCutoff = new Date(Date.now() - retentionMs);

    logger.info("plan_change_log_cleanup_started", {
      retentionYears,
      retentionMs,
      cutoffDate: retentionCutoff.toISOString(),
    });

    const deletedChanges = await db
      .delete(planChangeLog)
      .where(lt(planChangeLog.createdAt, retentionCutoff))
      .returning({ id: planChangeLog.id });

    planChangesDeleted = deletedChanges.length;
    logger.info("plan_change_log_cleanup_completed", {
      deletedCount: planChangesDeleted,
      retentionYears,
    });
  } catch (error) {
    logger.error("[cron] plan_change_log cleanup failed", { error });
  }

  // Enforce grace period expiration
  try {
    const now = new Date();

    // Find users whose grace period has expired
    const expiredUsers = await db
      .select({
        id: user.id,
        plan: user.plan,
        stripeCustomerId: user.stripeCustomerId,
      })
      .from(user)
      .where(and(lt(user.planExpiresAt, now), ne(user.plan, "free")));

    for (const expiredUser of expiredUsers) {
      try {
        // Update user to free plan and log the change in a transaction
        await db.transaction(async (tx) => {
          await tx
            .update(user)
            .set({
              plan: "free",
              planExpiresAt: null,
            })
            .where(eq(user.id, expiredUser.id));

          await tx.insert(planChangeLog).values({
            id: crypto.randomUUID(),
            userId: expiredUser.id,
            oldPlan: expiredUser.plan,
            newPlan: "free",
            reason: "grace_period_expired",
            createdAt: new Date(),
          });
        });

        await cache.delete(`plan:${expiredUser.id}`);

        // Best-effort: cancel active Stripe subscriptions
        if (expiredUser.stripeCustomerId && stripe) {
          try {
            const subscriptions = await stripe.subscriptions.list({
              customer: expiredUser.stripeCustomerId,
              status: "active",
            });

            for (const subscription of subscriptions.data) {
              await stripe.subscriptions.cancel(subscription.id);
            }
          } catch (stripeError) {
            logger.error(
              `[cron] Failed to cancel Stripe subscription for user ${expiredUser.id}:`,
              { error: stripeError }
            );
          }
        }

        // Send notification
        await notifyBillingEvent({
          userId: expiredUser.id,
          type: "billing_grace_period_expired",
          title: "Grace period expired",
          message: "Your grace period has ended and your plan has been downgraded to Free.",
          metadata: {
            oldPlan: expiredUser.plan,
            newPlan: "free",
          },
        });

        gracePeriodsExpired++;
      } catch (userError) {
        logger.error(
          `[cron] Failed to process grace period expiration for user ${expiredUser.id}:`,
          { error: userError }
        );
      }
    }
  } catch (error) {
    logger.error("[cron] grace period enforcement failed", { error });
    // Don't fail the entire cron if grace period enforcement fails
  }

  return Response.json({
    webhookEventsDeleted,
    planChangesDeleted,
    gracePeriodsExpired,
  });
}
