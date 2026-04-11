import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { notifications, user } from "@/lib/schema";

// ── Query params schema ───────────────────────────────────────────────────────

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(["draft", "scheduled", "sent", "failed"]).optional(),
});

// ── POST body schema ─────────────────────────────────────────────────────────

const createNotificationSchema = z.object({
  title: z.string().min(1).max(500),
  body: z.string().min(1).max(2000),
  targetType: z.enum(["all", "segment", "individual"]),
  targetSegment: z.string().optional(),
  targetUserIds: z.array(z.string()).optional(),
  scheduledFor: z.string().datetime().optional(),
  metadata: z.object({}).passthrough().optional(),
});

// ── GET /api/admin/notifications ───────────────────────────────────────────────

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  const { searchParams } = new URL(request.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

  const { limit, offset, status } = parsed.data;

  // Build WHERE conditions
  const conditions: any[] = [
    sql`(${notifications.metadata}->>'deletedAt' IS NULL OR ${notifications.metadata}->>'deletedAt' = 'null')`,
  ];

  if (status) {
    conditions.push(sql`${notifications.metadata}->>'adminStatus' = ${status}`);
  }

  const where = and(...(conditions as Parameters<typeof and>));

  // Count total
  const countResult = await db.select({ total: count() }).from(notifications).where(where);
  const total = countResult[0]?.total ?? 0;

  // Fetch notifications
  const rows = await db
    .select()
    .from(notifications)
    .where(where)
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  // Transform to admin notification format
  const notifs = rows.map((n) => {
    const meta = (n.metadata as any) ?? {};
    return {
      id: n.id,
      title: n.title ?? "",
      body: n.message ?? "",
      targetType: meta.targetType ?? "all",
      targetSegment: meta.targetSegment,
      targetUserIds: meta.targetUserIds,
      status: meta.adminStatus ?? "draft",
      sentAt: meta.sentAt,
      deliveredCount: meta.deliveredCount,
      readCount: meta.readCount,
      scheduledFor: meta.scheduledFor,
      createdBy: meta.createdBy ?? n.userId,
      createdAt: n.createdAt,
    };
  });

  return Response.json({
    data: notifs,
    pagination: { offset, limit, total: Number(total) },
  });
}

// ── POST /api/admin/notifications ──────────────────────────────────────────────

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("write");
  if (rl) return rl;

  const body = await request.json().catch(() => null);
  if (!body) return ApiError.badRequest("Invalid JSON body");

  const parsed = createNotificationSchema.safeParse(body);
  if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

  const {
    title,
    body: msgBody,
    targetType,
    targetSegment,
    targetUserIds,
    scheduledFor,
    metadata,
  } = parsed.data;

  const notificationId = nanoid();
  const now = new Date();
  const isScheduled = scheduledFor && new Date(scheduledFor) > now;

  // Determine target users based on targetType
  let actualTargetUserIds: string[] = [];

  if (targetType === "all") {
    const allUsers = await db.select({ id: user.id }).from(user);
    actualTargetUserIds = allUsers.map((u) => u.id);
  } else if (targetType === "segment") {
    // Support common segments
    if (targetSegment === "trial_users") {
      // trial_users: plan=pro_monthly AND trial active (trialEndsAt > now)
      const trialUsers = await db
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.plan, "pro_monthly"), gte(user.trialEndsAt, now)));
      actualTargetUserIds = trialUsers.map((u) => u.id);
    } else if (targetSegment === "inactive_90d") {
      // inactive_90d: last_login (from session) < 90 days ago
      // For simplicity, we'll check user.updatedAt
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const inactiveUsers = await db
        .select({ id: user.id })
        .from(user)
        .where(lte(user.updatedAt, ninetyDaysAgo));
      actualTargetUserIds = inactiveUsers.map((u) => u.id);
    } else {
      return ApiError.badRequest(`Unknown segment: ${targetSegment}`);
    }
  } else if (targetType === "individual") {
    if (!targetUserIds || targetUserIds.length === 0) {
      return ApiError.badRequest("targetUserIds required for individual targeting");
    }
    actualTargetUserIds = targetUserIds;
  }

  // Store admin notification metadata
  const adminMeta = {
    adminStatus: isScheduled ? "scheduled" : "sent",
    targetType,
    targetSegment,
    targetUserIds: actualTargetUserIds,
    createdBy: auth.session.user.id,
    ...(scheduledFor && { scheduledFor: new Date(scheduledFor).toISOString() }),
    ...metadata,
  };

  try {
    // For scheduled notifications in the future, we'd queue them via BullMQ
    // For now, we'll store them with status 'scheduled' and a separate cron can process them

    // Create notifications for each target user
    const notificationRows = actualTargetUserIds.map((userId) => ({
      id: `${notificationId}-${userId}`,
      userId,
      type: "admin",
      title,
      message: msgBody,
      isRead: false,
      metadata: adminMeta,
    }));

    // Insert all at once
    if (notificationRows.length > 0) {
      await db.insert(notifications).values(notificationRows);
    }

    // Log admin action
    await logAdminAction({
      adminId: auth.session.user.id,
      action: "announcement_update",
      targetType: "notification",
      targetId: notificationId,
      details: {
        title,
        targetType,
        targetSegment,
        userCount: actualTargetUserIds.length,
        scheduled: !!scheduledFor,
      },
    });

    return Response.json(
      {
        data: {
          id: notificationId,
          title,
          body: msgBody,
          targetType,
          targetSegment,
          targetUserIds: actualTargetUserIds,
          status: isScheduled ? "scheduled" : "sent",
          scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
          createdBy: auth.session.user.id,
          createdAt: now,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create notification:", error);
    return ApiError.internal("Failed to create notification");
  }
}
