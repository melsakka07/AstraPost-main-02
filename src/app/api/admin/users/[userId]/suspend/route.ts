import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

const suspendSchema = z.object({
  suspend: z.boolean(),
});

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("destructive");
  if (rl) return rl;

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

  await db.update(user).set({ isSuspended: suspend }).where(eq(user.id, userId));

  logAdminAction({
    adminId: auth.session.user.id,
    action: suspend ? "suspend" : "unsuspend",
    targetType: "user",
    targetId: userId,
  });

  return Response.json({ success: true });
}
