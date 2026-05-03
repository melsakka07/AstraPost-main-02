import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { aiQuotaGrants } from "@/lib/schema";

const grantQuotaSchema = z.object({
  amount: z.number().int().min(1).max(10000),
  reason: z.string().min(1).max(500),
});

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const correlationId = getCorrelationId(req);

  try {
    const body = await req.json().catch(() => null);
    if (!body) return ApiError.badRequest("Invalid JSON body");

    const parsed = grantQuotaSchema.safeParse(body);
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { amount, reason } = parsed.data;
    const { userId } = await params;

    if (!userId) {
      return ApiError.badRequest("User ID required");
    }

    const grantId = crypto.randomUUID();

    await db.insert(aiQuotaGrants).values({
      id: grantId,
      userId,
      amount,
      remaining: amount,
      grantedBy: auth.session.user.id,
      reason,
      createdAt: new Date(),
    });

    logger.info("admin_grant_quota", {
      adminId: auth.session.user.id,
      targetUserId: userId,
      amount,
      reason,
      grantId,
      correlationId,
    });

    const res = Response.json({ success: true, grantId });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (err) {
    logger.error("admin_grant_quota_error", {
      error: err instanceof Error ? err.message : String(err),
      correlationId,
    });
    return ApiError.internal("Failed to grant quota");
  }
}
