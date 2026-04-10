import { eq, and, ne, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { processedWebhookEvents, user, planChangeLog } from "@/lib/schema";
import { notifyBillingEvent } from "@/lib/services/notifications";
import { stripe } from "@/lib/stripe";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
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
    console.error("[cron] billing cleanup failed", error);
    return Response.json({ error: "Cleanup failed" }, { status: 500 });
  }

  // Clean up plan_change_log entries older than 1 year
  let planChangesDeleted = 0;
  try {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const deletedChanges = await db
      .delete(planChangeLog)
      .where(lt(planChangeLog.createdAt, oneYearAgo))
      .returning({ id: planChangeLog.id });

    planChangesDeleted = deletedChanges.length;
  } catch (error) {
    console.error("[cron] plan_change_log cleanup failed", error);
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
            console.error(
              `[cron] Failed to cancel Stripe subscription for user ${expiredUser.id}:`,
              stripeError
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
        console.error(
          `[cron] Failed to process grace period expiration for user ${expiredUser.id}:`,
          userError
        );
      }
    }
  } catch (error) {
    console.error("[cron] grace period enforcement failed", error);
    // Don't fail the entire cron if grace period enforcement fails
  }

  return Response.json({
    webhookEventsDeleted,
    planChangesDeleted,
    gracePeriodsExpired,
  });
}
