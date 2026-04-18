import { and, isNotNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { session } from "@/lib/schema";

/**
 * Cleans up expired impersonation sessions.
 * Impersonation sessions expire after 30 minutes for security.
 * This cron job runs periodically to delete stale records.
 */
export async function GET(req: Request) {
  // Verify cron secret
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (cronSecret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Delete impersonation sessions older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const result = await db
      .delete(session)
      .where(
        and(
          isNotNull(session.impersonatedBy), // only impersonation sessions
          lt(session.impersonationStartedAt, thirtyMinutesAgo)
        )
      )
      .returning({ id: session.id });

    logger.info("impersonation_cleanup_completed", {
      expiredSessionsDeleted: result.length,
    });

    return Response.json({
      success: true,
      message: `Deleted ${result.length} expired impersonation sessions`,
    });
  } catch (error) {
    logger.error("impersonation_cleanup_failed", { error });
    return new Response("Cleanup failed", { status: 500 });
  }
}
