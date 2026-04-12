import { and, count, eq, gte, sql } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

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
