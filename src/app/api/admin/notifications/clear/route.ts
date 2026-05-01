import { count, isNull } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { notifications } from "@/lib/schema";

export async function POST(request: Request) {
  const correlationId = getCorrelationId(request);
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("destructive");
  if (rl) return rl;

  try {
    // Count before clearing
    const [countResult] = await db
      .select({ total: count() })
      .from(notifications)
      .where(isNull(notifications.deletedAt));

    const total = countResult?.total ?? 0;

    if (total === 0) {
      const res = Response.json({ data: { cleared: 0 } });
      res.headers.set("x-correlation-id", correlationId);
      return res;
    }

    // Soft-delete all non-deleted notifications
    await db
      .update(notifications)
      .set({ deletedAt: new Date() })
      .where(isNull(notifications.deletedAt));

    await logAdminAction({
      adminId: auth.session.user.id,
      action: "bulk_operation",
      targetType: "notification",
      details: { operation: "clear_all", count: total },
    });

    const res = Response.json({ data: { cleared: total } });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("Failed to clear notifications", { error, correlationId });
    return ApiError.internal("Failed to clear notifications");
  }
}
