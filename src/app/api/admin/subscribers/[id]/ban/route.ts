import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { session, user } from "@/lib/schema";

const banSchema = z.object({
  ban: z.boolean(), // true = ban, false = unban
});

// ── POST /api/admin/subscribers/[id]/ban ─────────────────────────────────────

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("destructive");
  if (rl) return rl;

  try {
    const { id } = await params;

    const body = await request.json().catch(() => null);
    if (!body) return ApiError.badRequest("Invalid JSON body");

    const parsed = banSchema.safeParse(body);
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { ban } = parsed.data;

    if (id === auth.session.user.id) {
      return ApiError.badRequest("Cannot ban your own account");
    }

    const [existing] = await db
      .select({
        id: user.id,
        deletedAt: user.deletedAt,
        bannedAt: user.bannedAt,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (!existing) return ApiError.notFound("Subscriber");
    if (existing.deletedAt) return ApiError.badRequest("Cannot ban a deleted subscriber");

    const now = new Date();

    await db.transaction(async (tx) => {
      if (ban) {
        await tx.update(user).set({ bannedAt: now, isSuspended: true }).where(eq(user.id, id));
      } else {
        await tx.update(user).set({ bannedAt: null, isSuspended: false }).where(eq(user.id, id));
      }

      await tx.delete(session).where(eq(session.userId, id));
    });

    logAdminAction({
      adminId: auth.session.user.id,
      action: ban ? "ban" : "unban",
      targetType: "user",
      targetId: id,
      details: { email: existing.email },
    });

    return Response.json({ success: true, banned: ban });
  } catch (err) {
    logger.error("[subscribers/ban] Error", { error: err });
    return ApiError.internal("Failed to update ban status");
  }
}
