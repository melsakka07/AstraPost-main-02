import { cache } from "@/lib/cache";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { notifications, notificationTypeEnum } from "@/lib/schema";

interface NotifyBillingEventInput {
  userId: string;
  type: (typeof notificationTypeEnum.enumValues)[number];
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export async function notifyBillingEvent(payload: NotifyBillingEventInput) {
  const [notification] = await db
    .insert(notifications)
    .values({
      id: crypto.randomUUID(),
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      metadata: payload.metadata || {},
    })
    .returning();

  // Invalidate notification cache so polling endpoint returns fresh data
  await cache.delete(`notifications:${payload.userId}`);

  logger.info("notification_created", {
    userId: payload.userId,
    type: payload.type,
    notificationId: notification?.id,
  });
}
