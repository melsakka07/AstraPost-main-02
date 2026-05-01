import { count } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { analyticsQueue, scheduleQueue } from "@/lib/queue/client";
import { failedJobs } from "@/lib/schema";

const clearBodySchema = z.object({
  queue: z.enum(["schedule", "analytics", "dlq"]),
});

export async function POST(request: Request) {
  const correlationId = getCorrelationId(request);
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("destructive");
  if (rl) return rl;

  const body = await request.json().catch(() => null);
  if (!body) return ApiError.badRequest("Invalid JSON body");

  const parsed = clearBodySchema.safeParse(body);
  if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

  const { queue: queueName } = parsed.data;

  try {
    let cleared = 0;

    if (queueName === "dlq") {
      // Count before deleting since Drizzle delete() doesn't return rowCount
      const [countResult] = await db.select({ count: count() }).from(failedJobs);
      cleared = countResult?.count ?? 0;
      if (cleared > 0) {
        await db.delete(failedJobs);
      }
    } else {
      const queue = queueName === "schedule" ? scheduleQueue : analyticsQueue;

      // Drain removes waiting + delayed jobs
      await queue.drain();

      // Clean completed and failed jobs (grace=0 = immediate removal)
      const completedCleaned = await queue.clean(0, 0, "completed");
      const failedCleaned = await queue.clean(0, 0, "failed");

      // clean() returns the number of removed jobs per call, but may return undefined
      cleared = (completedCleaned?.length ?? 0) + (failedCleaned?.length ?? 0);
    }

    await logAdminAction({
      adminId: auth.session.user.id,
      action: "bulk_operation",
      targetType: "queue",
      targetId: queueName,
      details: { operation: "clear_queue", queue: queueName, count: cleared },
    });

    const res = Response.json({ data: { queue: queueName, cleared } });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("Failed to clear queue", { error, queue: queueName, correlationId });
    return ApiError.internal(`Failed to clear ${queueName} queue`);
  }
}
