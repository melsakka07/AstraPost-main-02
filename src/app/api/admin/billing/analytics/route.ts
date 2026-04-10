import { eq, and, sql, desc, gte, lt, count } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { planChangeLog, processedWebhookEvents, user } from "@/lib/schema";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return ApiError.badRequest(parsed.error.issues);
  const { page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  // 1. Plan distribution
  const planDistRows = await db
    .select({ plan: user.plan, count: count() })
    .from(user)
    .where(sql`${user.deletedAt} IS NULL`)
    .groupBy(user.plan);

  const planDistribution: Record<string, number> = {};
  for (const row of planDistRows) {
    if (row.plan !== null) {
      planDistribution[row.plan] = Number(row.count);
    }
  }

  // 2. Recent plan changes (paginated)
  const [changes, totalCountResult] = await Promise.all([
    db
      .select({
        id: planChangeLog.id,
        userId: planChangeLog.userId,
        oldPlan: planChangeLog.oldPlan,
        newPlan: planChangeLog.newPlan,
        reason: planChangeLog.reason,
        createdAt: planChangeLog.createdAt,
        userName: user.name,
        userEmail: user.email,
      })
      .from(planChangeLog)
      .leftJoin(user, eq(planChangeLog.userId, user.id))
      .orderBy(desc(planChangeLog.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(planChangeLog),
  ]);

  const totalChanges = Number(totalCountResult[0]?.total ?? 0);

  // 3. Churn rate (subscriptions deleted in last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [churnedRows, totalPaidRows] = await Promise.all([
    db
      .select({ count: count() })
      .from(planChangeLog)
      .where(
        and(
          eq(planChangeLog.reason, "subscription_deleted"),
          gte(planChangeLog.createdAt, thirtyDaysAgo)
        )
      ),
    db
      .select({ count: count() })
      .from(user)
      .where(and(sql`${user.deletedAt} IS NULL`, sql`${user.plan} != 'free'`)),
  ]);

  const churnedCount = Number(churnedRows[0]?.count ?? 0);
  const totalPaid = Number(totalPaidRows[0]?.count ?? 0);
  const churnRate = totalPaid > 0 ? (churnedCount / totalPaid) * 100 : 0;

  // 4. Grace period recovery rate
  // Count users who had payment_failed_grace_period followed by a plan change to paid within 7 days
  const graceFailedRows = await db
    .select({
      userId: planChangeLog.userId,
      failedAt: planChangeLog.createdAt,
    })
    .from(planChangeLog)
    .where(eq(planChangeLog.reason, "payment_failed_grace_period"))
    .orderBy(desc(planChangeLog.createdAt));

  let graceRecoveryCount = 0;
  for (const row of graceFailedRows) {
    const recoveryWindow = new Date(row.failedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const recovery = await db
      .select({ count: count() })
      .from(planChangeLog)
      .where(
        and(
          eq(planChangeLog.userId, row.userId),
          eq(planChangeLog.reason, "webhook_plan_change"),
          gte(planChangeLog.createdAt, row.failedAt),
          lt(planChangeLog.createdAt, recoveryWindow)
        )
      )
      .limit(1);

    if (Number(recovery[0]?.count ?? 0) > 0) graceRecoveryCount++;
  }

  const graceRecoveryRate =
    graceFailedRows.length > 0 ? (graceRecoveryCount / graceFailedRows.length) * 100 : 0;

  // 5. Failed webhooks (retry count > 0)
  const failedWebhooks = await db
    .select({
      id: processedWebhookEvents.id,
      stripeEventId: processedWebhookEvents.stripeEventId,
      eventType: processedWebhookEvents.eventType,
      retryCount: processedWebhookEvents.retryCount,
      errorMessage: processedWebhookEvents.errorMessage,
      processedAt: processedWebhookEvents.processedAt,
    })
    .from(processedWebhookEvents)
    .where(sql`${processedWebhookEvents.retryCount} > 0`)
    .orderBy(desc(processedWebhookEvents.retryCount))
    .limit(10);

  return Response.json({
    planDistribution,
    recentChanges: changes,
    pagination: {
      page,
      limit,
      total: totalChanges,
      totalPages: Math.ceil(totalChanges / limit),
    },
    metrics: {
      churnRate: Math.round(churnRate * 10) / 10,
      churnedCount,
      totalPaid,
      graceRecoveryRate: Math.round(graceRecoveryRate * 10) / 10,
      graceFailedCount: graceFailedRows.length,
      graceRecoveryCount,
    },
    failedWebhooks,
  });
}
