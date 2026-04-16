import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { user, session } from "@/lib/schema";

const suspendSchema = z.object({
  suspend: z.boolean(),
});

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("destructive");
  if (rl) return rl;

  try {
    const body = await req.json().catch(() => null);
    if (!body) return ApiError.badRequest("Invalid JSON body");

    const parsed = suspendSchema.safeParse(body);
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { suspend } = parsed.data;
    const { userId } = await params;

    if (!userId) {
      return ApiError.badRequest("User ID required");
    }

    // Prevent suspending self
    if (userId === auth.session.user.id) {
      return ApiError.badRequest("Cannot suspend yourself");
    }

    const [targetUser] = await db.select().from(user).where(eq(user.id, userId)).limit(1);

    if (!targetUser) {
      return ApiError.notFound("User");
    }

    await db.update(user).set({ isSuspended: suspend }).where(eq(user.id, userId));

    // If suspending, invalidate all sessions
    if (suspend) {
      await db.delete(session).where(eq(session.userId, userId));
    }

    logAdminAction({
      adminId: auth.session.user.id,
      action: suspend ? "suspend" : "unsuspend",
      targetType: "user",
      targetId: userId,
      details: { email: targetUser.email },
    });

    return Response.json({ success: true });
  } catch (err) {
    logger.error("[suspend] Error", { error: err });
    return ApiError.internal("Failed to update suspension status");
  }
}
