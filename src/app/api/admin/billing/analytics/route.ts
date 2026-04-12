import { eq, and, sql, desc, count, gte, gt, lt, lte, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { PRICING } from "@/lib/pricing";
import { planChangeLog, processedWebhookEvents, user } from "@/lib/schema";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);
    const { page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    // 1. Plan distribution
    const planDistRows = await db
      .select({ plan: user.plan, count: count() })
      .from(user)
      .where(isNull(user.deletedAt))
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
        .where(and(isNull(user.deletedAt), ne(user.plan, "free"))),
    ]);

    const churnedCount = Number(churnedRows[0]?.count ?? 0);
    const totalPaid = Number(totalPaidRows[0]?.count ?? 0);
    const churnRate = totalPaid > 0 ? (churnedCount / totalPaid) * 100 : 0;

    // 4. Grace period recovery rate
    // Count users who had payment_failed_grace_period followed by a plan change to paid within 7 days
    // Use a single query with EXISTS subquery to avoid N+1 problem
    const graceMetrics = await db
      .select({
        userId: planChangeLog.userId,
        failedAt: planChangeLog.createdAt,
        recovered: sql<boolean>`EXISTS(
          SELECT 1 FROM ${planChangeLog} AS recovery
          WHERE recovery.user_id = ${planChangeLog.userId}
          AND recovery.reason = 'webhook_plan_change'
          AND recovery.created_at >= ${planChangeLog.createdAt}
          AND recovery.created_at < (${planChangeLog.createdAt} + INTERVAL '7 days')
          LIMIT 1
        )`,
      })
      .from(planChangeLog)
      .where(eq(planChangeLog.reason, "payment_failed_grace_period"))
      .orderBy(desc(planChangeLog.createdAt));

    const graceFailedRows = graceMetrics;
    const graceRecoveryCount = graceMetrics.filter((m) => m.recovered).length;

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
      .where(gt(processedWebhookEvents.retryCount, 0))
      .orderBy(desc(processedWebhookEvents.retryCount))
      .limit(10);

    // 6. MRR Trends (12 months)
    const mrrTrends = await calculateMRRTrends();

    // 7. LTV Estimates
    const ltvEstimates = calculateLTVEstimates();

    // 8. Cohort Retention Data
    const cohortData = await calculateCohortRetention();

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
      mrrTrends,
      ltvEstimates,
      cohortData,
    });
  } catch (err) {
    console.error("[billing/analytics] Error:", err);
    return ApiError.internal("Failed to load billing analytics");
  }
}

/**
 * Calculate MRR (Monthly Recurring Revenue) trends for the last 12 months.
 * For each month, sums up the pricing of all active paid plans.
 */
async function calculateMRRTrends(): Promise<
  Array<{
    month: string;
    mrr: number;
    proMonthly: number;
    proAnnual: number;
    agency: number;
  }>
> {
  const trends = [];
  const now = new Date();

  // Generate dates for the last 12 months
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

    const monthLabel = monthDate.toISOString().substring(0, 7); // YYYY-MM

    // For each plan, count users active during this month
    const planCounts = await db
      .select({ plan: user.plan, count: count() })
      .from(user)
      .where(and(isNull(user.deletedAt), ne(user.plan, "free"), lt(user.createdAt, monthEnd)))
      .groupBy(user.plan);

    let mrr = 0;
    let proMonthly = 0;
    let proAnnual = 0;
    let agency = 0;

    for (const row of planCounts) {
      const plan = row.plan as string | null;
      const userCount = Number(row.count);

      if (!plan || plan === "free") continue;

      // Get monthly price in cents
      let monthlyPrice = 0;
      if (plan === "pro_monthly") {
        monthlyPrice = PRICING.pro_monthly.monthlyPrice;
        proMonthly += userCount * monthlyPrice;
      } else if (plan === "pro_annual") {
        // Annual users: divide their annual price by 12 for monthly contribution
        monthlyPrice = (PRICING.pro_annual.annualPrice ?? 0) / 12;
        proAnnual += userCount * monthlyPrice;
      } else if (plan === "agency" || plan === "agency_monthly" || plan === "agency_annual") {
        // Handle agency plans (in DB as "agency", but could be extended later)
        if (plan === "agency" || plan === "agency_monthly") {
          monthlyPrice = PRICING.agency_monthly.monthlyPrice;
        } else if (plan === "agency_annual") {
          monthlyPrice = (PRICING.agency_annual.annualPrice ?? 0) / 12;
        }
        agency += userCount * monthlyPrice;
      }

      mrr += userCount * monthlyPrice;
    }

    trends.push({
      month: monthLabel,
      mrr: Math.round(mrr), // in cents
      proMonthly: Math.round(proMonthly),
      proAnnual: Math.round(proAnnual),
      agency: Math.round(agency),
    });
  }

  return trends;
}

/**
 * Calculate Lifetime Value (LTV) estimates for each plan.
 * LTV = Monthly Price × Average Customer Lifetime (12 months baseline)
 */
function calculateLTVEstimates(): Record<
  string,
  {
    plan: string;
    monthlyPrice: number;
    avgMonths: number;
    ltv: number;
  }
> {
  return {
    pro_monthly: {
      plan: "Pro Monthly",
      monthlyPrice: PRICING.pro_monthly.monthlyPrice,
      avgMonths: 12, // Baseline: 12-month average lifetime
      ltv: Math.round(PRICING.pro_monthly.monthlyPrice * 12),
    },
    pro_annual: {
      plan: "Pro Annual",
      monthlyPrice: (PRICING.pro_annual.annualPrice ?? 0) / 12,
      avgMonths: 12,
      ltv: PRICING.pro_annual.annualPrice ?? 0, // Full annual price
    },
    agency_monthly: {
      plan: "Agency Monthly",
      monthlyPrice: PRICING.agency_monthly.monthlyPrice,
      avgMonths: 18, // Longer average lifetime for agency plans
      ltv: Math.round(PRICING.agency_monthly.monthlyPrice * 18),
    },
    agency_annual: {
      plan: "Agency Annual",
      monthlyPrice: (PRICING.agency_annual.annualPrice ?? 0) / 12,
      avgMonths: 18,
      ltv: Math.round((PRICING.agency_annual.annualPrice ?? 0) * 1.5), // 1.5 years
    },
  };
}

/**
 * Calculate cohort retention analysis.
 * Groups users by signup month and tracks what percentage are still on paid plans.
 */
async function calculateCohortRetention(): Promise<
  Array<{
    cohort: string;
    totalUsers: number;
    month0: number; // % still on paid at signup month
    month1: number; // % still on paid in month 1 after
    month2: number;
    month3: number;
    month6: number;
  }>
> {
  // Get all users grouped by signup month
  const cohorts = await db
    .select({
      cohortMonth: sql<string>`DATE_TRUNC('month', ${user.createdAt})::text`,
      totalCount: count(),
    })
    .from(user)
    .where(isNull(user.deletedAt))
    .groupBy(sql`DATE_TRUNC('month', ${user.createdAt})`)
    .orderBy(sql`DATE_TRUNC('month', ${user.createdAt}) DESC`)
    .limit(6);

  const cohortData: Array<{
    cohort: string;
    totalUsers: number;
    month0: number;
    month1: number;
    month2: number;
    month3: number;
    month6: number;
  }> = [];

  for (const cohort of cohorts) {
    const cohortDate = new Date(cohort.cohortMonth);
    const cohortMonth = cohortDate.toISOString().substring(0, 7); // YYYY-MM
    const totalUsers = Number(cohort.totalCount);

    // For this cohort, count how many are on paid plans at various months
    const checkPoints = [0, 1, 2, 3, 6];
    const retentionByMonth: Record<number, number> = {};

    for (const monthOffset of checkPoints) {
      const checkDate = new Date(cohortDate);
      checkDate.setMonth(checkDate.getMonth() + monthOffset);

      const paidUsersAtMonth = await db
        .select({ count: count() })
        .from(user)
        .where(
          and(
            sql`DATE_TRUNC('month', ${user.createdAt})::text = ${cohort.cohortMonth}`,
            isNull(user.deletedAt),
            ne(user.plan, "free"),
            lte(user.createdAt, checkDate)
          )
        );

      const paidCount = Number(paidUsersAtMonth[0]?.count ?? 0);
      retentionByMonth[monthOffset] = Math.round((paidCount / totalUsers) * 100);
    }

    cohortData.push({
      cohort: cohortMonth,
      totalUsers,
      month0: retentionByMonth[0] ?? 0,
      month1: retentionByMonth[1] ?? 0,
      month2: retentionByMonth[2] ?? 0,
      month3: retentionByMonth[3] ?? 0,
      month6: retentionByMonth[6] ?? 0,
    });
  }

  return cohortData;
}
