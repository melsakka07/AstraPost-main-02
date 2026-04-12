import { and, count, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";

// ── GET /api/admin/notifications/[id] ──────────────────────────────────────────

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  const { id: notificationId } = await params;

  if (!notificationId) {
    return ApiError.badRequest("Notification ID required");
  }

  if (notificationId === "stats") {
    return getStats();
  }

  const [notif] = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .limit(1);

  if (!notif) {
    return ApiError.notFound("Notification");
  }

  return Response.json({ data: notif });
}

async function getStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalResult] = await db
    .select({ total: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.type, "admin"),
        gte(notifications.createdAt, startOfMonth),
        sql`(${notifications.metadata}->>'deletedAt' IS NULL OR ${notifications.metadata}->>'deletedAt' = 'null')`
      )
    );

  const totalSentThisMonth = totalResult?.total ?? 0;

  const sentNotifications = await db
    .select({ metadata: notifications.metadata })
    .from(notifications)
    .where(
      and(
        eq(notifications.type, "admin"),
        sql`${notifications.metadata}->>'adminStatus' = 'sent'`,
        sql`(${notifications.metadata}->>'deletedAt' IS NULL OR ${notifications.metadata}->>'deletedAt' = 'null')`
      )
    );

  let totalDelivered = 0;
  let totalTargets = 0;
  let totalRead = 0;

  for (const n of sentNotifications) {
    const meta = (n.metadata as Record<string, unknown>) ?? {};
    const targetUserIds = (meta.targetUserIds as string[]) ?? [];
    const deliveredCount = (meta.deliveredCount as number) ?? 0;
    const readCount = (meta.readCount as number) ?? 0;

    totalTargets += targetUserIds.length;
    totalDelivered += deliveredCount;
    totalRead += readCount;
  }

  const avgDeliveryRate = totalTargets > 0 ? Math.round((totalDelivered / totalTargets) * 100) : 0;
  const avgReadRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;

  return Response.json({
    data: {
      totalSentThisMonth,
      avgDeliveryRate,
      avgReadRate,
    },
  });
}

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
