import { lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { webhookDeliveryLog } from "@/lib/schema";

export async function GET(req: Request) {
  // Verify cron secret
  const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (cronSecret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Delete delivery logs older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await db
      .delete(webhookDeliveryLog)
      .where(lt(webhookDeliveryLog.processedAt, thirtyDaysAgo))
      .returning({ id: webhookDeliveryLog.id });

    logger.info("webhook_cleanup_completed", {
      deletedCount: result.length,
    });

    return Response.json({
      success: true,
      message: `Deleted ${result.length} delivery logs older than 30 days`,
    });
  } catch (error) {
    logger.error("webhook_cleanup_failed", { error });
    return new Response("Cleanup failed", { status: 500 });
  }
}
