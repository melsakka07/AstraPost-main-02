import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";

// ── PATCH /api/admin/notifications/[id] ────────────────────────────────────────

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("write");
  if (rl) return rl;

  const { id: notificationId } = await params;

  if (!notificationId) {
    return ApiError.badRequest("Notification ID required");
  }

  const body = await request.json().catch(() => null);
  if (!body) return ApiError.badRequest("Invalid JSON body");

  const updateSchema = z.object({
    status: z.enum(["draft", "scheduled", "sent", "failed"]).optional(),
    scheduledFor: z.string().datetime().optional(),
  });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

  const { status, scheduledFor } = parsed.data;

  // Find the notification
  const [notif] = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .limit(1);

  if (!notif) {
    return ApiError.notFound("Notification");
  }

  // Update metadata
  const meta = (notif.metadata as any) ?? {};
  if (status) {
    meta.adminStatus = status;
  }
  if (scheduledFor) {
    meta.scheduledFor = new Date(scheduledFor).toISOString();
  }

  await db
    .update(notifications)
    .set({ metadata: meta })
    .where(eq(notifications.id, notificationId));

  await logAdminAction({
    adminId: auth.session.user.id,
    action: "announcement_update",
    targetType: "notification",
    targetId: notificationId,
    details: { status, scheduledFor },
  });

  return Response.json({ data: { id: notificationId, ...meta } });
}

// ── DELETE /api/admin/notifications/[id] ───────────────────────────────────────

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("write");
  if (rl) return rl;

  const { id: notificationId } = await params;

  if (!notificationId) {
    return ApiError.badRequest("Notification ID required");
  }

  // Find the notification
  const [notif] = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .limit(1);

  if (!notif) {
    return ApiError.notFound("Notification");
  }

  // Soft delete
  await db
    .update(notifications)
    .set({
      metadata: {
        ...(notif.metadata as any),
        deletedAt: new Date().toISOString(),
      },
    })
    .where(eq(notifications.id, notificationId));

  await logAdminAction({
    adminId: auth.session.user.id,
    action: "announcement_update",
    targetType: "notification",
    targetId: notificationId,
    details: { action: "delete" },
  });

  return Response.json({ success: true });
}
