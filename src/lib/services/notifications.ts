import { db } from "@/lib/db";
import { notifications, notificationTypeEnum } from "@/lib/schema";

interface NotifyBillingEventInput {
  userId: string;
  type: (typeof notificationTypeEnum.enumValues)[number];
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export async function notifyBillingEvent(input: NotifyBillingEventInput) {
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    metadata: input.metadata || {},
  });
}
