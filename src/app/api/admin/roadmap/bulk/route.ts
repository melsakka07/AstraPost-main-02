import { inArray } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { feedback } from "@/lib/schema";

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one ID is required"),
  status: z.enum(["approved", "rejected"]),
});

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("write");
  if (rl) return rl;

  try {
    const body = await request.json().catch(() => null);
    const result = bulkUpdateSchema.safeParse(body);

    if (!result.success) {
      return ApiError.badRequest(result.error.issues);
    }

    const { ids, status } = result.data;

    await db
      .update(feedback)
      .set({
        status,
        reviewedAt: new Date(),
      })
      .where(inArray(feedback.id, ids));

    logAdminAction({
      adminId: auth.session.user.id,
      action: "bulk_operation",
      targetType: "feedback",
      details: { status, count: ids.length, ids },
    });

    return Response.json({ success: true, updatedCount: ids.length });
  } catch (err) {
    logger.error("[roadmap/bulk] Error", { error: err });
    return ApiError.internal("Failed to update feedback items");
  }
}
