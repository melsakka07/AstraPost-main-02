import { eq, and, gt, gte, sql } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { user, notifications } from "@/lib/schema";
import { sendTrialEndingSoonEmail } from "@/lib/services/email";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Scans for users whose synthetic trial (user.trialEndsAt) is ending in
 * 3 days or 1 day and sends an email + in-app notification.
 *
 * Runs daily. Each user receives at most two warnings: one at T-3 and one
 * at T-1. Deduped by checking for an existing "trial_expiring_soon"
 * notification created within the last 48 hours.
 *
 * Stripe-managed trials are handled separately by the billing webhook
 * (customer.subscription.trial_will_end). This cron handles the
 * free→trial→free synthetic trial flow driven by user.trialEndsAt.
 */
export async function POST(_req: Request) {
  const authHeader = _req.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return ApiError.unauthorized();
  }

  const now = new Date();
  let emailsSent = 0;
  let notificationsCreated = 0;
  let skipped = 0;

  try {
    // Find users whose trial ends in the T-3 window (60–84 hours from now)
    // or T-1 window (12–36 hours from now). Using overlapping windows ensures
    // one daily run covers both buckets without missing edge cases.
    const t1Start = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const t1End = new Date(now.getTime() + 36 * 60 * 60 * 1000);
    const t3Start = new Date(now.getTime() + 60 * 60 * 60 * 1000);
    const t3End = new Date(now.getTime() + 84 * 60 * 60 * 1000);

    const expiringUsers = await db.query.user.findMany({
      where: and(
        eq(user.plan, "free"), // only synthetic-trial users (stored plan is free)
        gt(user.trialEndsAt, now), // trial still active
        sql`(${user.trialEndsAt} >= ${t1Start.toISOString()} AND ${user.trialEndsAt} <= ${t1End.toISOString()})
             OR (${user.trialEndsAt} >= ${t3Start.toISOString()} AND ${user.trialEndsAt} <= ${t3End.toISOString()})`
      ),
      columns: { id: true, email: true, name: true, language: true, trialEndsAt: true },
    });

    logger.info("trial_expiry_warning_scan", {
      count: expiringUsers.length,
      t1Window: `${t1Start.toISOString()}..${t1End.toISOString()}`,
      t3Window: `${t3Start.toISOString()}..${t3End.toISOString()}`,
    });

    for (const u of expiringUsers) {
      try {
        // Dedup: skip if already notified in the last 48 hours
        const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        const existingNotif = await db.query.notifications.findFirst({
          where: and(
            eq(notifications.userId, u.id),
            eq(notifications.type, "trial_expiring_soon"),
            gte(notifications.createdAt, twoDaysAgo)
          ),
        });

        if (existingNotif) {
          skipped++;
          continue;
        }

        const trialEndsAt = u.trialEndsAt!;
        const hoursUntilExpiry = Math.floor(
          (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60)
        );
        const daysLeft = Math.ceil(hoursUntilExpiry / 24);

        // In-app notification
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          userId: u.id,
          type: "trial_expiring_soon",
          title: `Your trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
          message: `Your 14-day AstraPost Pro trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Upgrade now to keep your Pro features — unlimited posts, AI tools, and more.`,
          metadata: {
            trialEndsAt: trialEndsAt.toISOString(),
            daysLeft,
            hoursUntilExpiry,
          },
          isRead: false,
        });
        notificationsCreated++;

        // Email notification (best-effort)
        if (u.email) {
          try {
            await sendTrialEndingSoonEmail(u.email, u.name || "there", u.language || "en");
            emailsSent++;
          } catch (emailErr) {
            logger.warn("trial_expiry_email_failed", {
              userId: u.id,
              error: emailErr instanceof Error ? emailErr.message : String(emailErr),
            });
          }
        }
      } catch (userErr) {
        logger.warn("trial_expiry_user_process_failed", {
          userId: u.id,
          error: userErr instanceof Error ? userErr.message : String(userErr),
        });
      }
    }

    logger.info("trial_expiry_warning_completed", {
      scanned: expiringUsers.length,
      notificationsCreated,
      emailsSent,
      skipped,
    });

    return Response.json({
      scanned: expiringUsers.length,
      notificationsCreated,
      emailsSent,
      skipped,
    });
  } catch (error) {
    logger.error("[cron] trial expiry warning failed", { error });
    return ApiError.internal("Trial expiry warning failed");
  }
}
