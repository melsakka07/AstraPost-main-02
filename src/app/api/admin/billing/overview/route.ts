import { and, count, eq, gte, lt, sql } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { db } from "@/lib/db";
import { subscriptions, user } from "@/lib/schema";

// Configurable plan prices — set via env vars for accurate MRR.
// Divide annual prices by 12 to get monthly equivalent.
function getPlanMonthlyCents(plan: string | null): number {
  switch (plan) {
    case "pro_monthly":
      return Math.round(parseFloat(process.env.DISPLAY_PRICE_PRO_MONTHLY ?? "0") * 100);
    case "pro_annual":
      return Math.round((parseFloat(process.env.DISPLAY_PRICE_PRO_ANNUAL ?? "0") / 12) * 100);
    case "agency":
      return Math.round(parseFloat(process.env.DISPLAY_PRICE_AGENCY_MONTHLY ?? "0") * 100);
    default:
      return 0;
  }
}

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = monthStart;

  // ── Subscription counts ────────────────────────────────────────────────────

  const [activeRows, cancelledThisMonth, cancelledLastMonth, trialRows] = await Promise.all([
    // Active (non-trialing, non-cancelled)
    db
      .select({ plan: subscriptions.plan, total: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"))
      .groupBy(subscriptions.plan),

    // Cancelled THIS month
    db
      .select({ total: count() })
      .from(subscriptions)
      .where(
        and(eq(subscriptions.status, "cancelled"), gte(subscriptions.cancelledAt, monthStart))
      ),

    // Cancelled LAST month (for comparison)
    db
      .select({ total: count() })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "cancelled"),
          gte(subscriptions.cancelledAt, lastMonthStart),
          lt(subscriptions.cancelledAt, lastMonthEnd)
        )
      ),

    // Trialing
    db.select({ total: count() }).from(subscriptions).where(eq(subscriptions.status, "trialing")),
  ]);

  // ── User counts ────────────────────────────────────────────────────────────

  const [totalUsers, newUsersThisMonth] = await Promise.all([
    db
      .select({ total: count() })
      .from(user)
      .where(sql`${user.deletedAt} IS NULL`),
    db
      .select({ total: count() })
      .from(user)
      .where(and(sql`${user.deletedAt} IS NULL`, gte(user.createdAt, monthStart))),
  ]);

  // ── MRR calculation ─────────────────────────────────────────────────────────
  // Sum monthly revenue from active subscriptions by plan.
  // Returns 0 if DISPLAY_PRICE_* env vars are not set.
  let mrrCents = 0;
  const planBreakdown: Record<string, { count: number; mrrCents: number }> = {};

  for (const row of activeRows) {
    const cnt = Number(row.total);
    const unitCents = getPlanMonthlyCents(row.plan);
    const totalCents = cnt * unitCents;
    mrrCents += totalCents;
    planBreakdown[row.plan] = { count: cnt, mrrCents: totalCents };
  }

  // ── Trial-to-paid conversion rate ─────────────────────────────────────────
  // Simple: active / (active + trialing) across all time
  const totalActiveCount = activeRows.reduce((sum, r) => sum + Number(r.total), 0);
  const totalTrialCount = Number(trialRows[0]?.total ?? 0);
  const conversionRate =
    totalActiveCount + totalTrialCount > 0
      ? Math.round((totalActiveCount / (totalActiveCount + totalTrialCount)) * 100)
      : 0;

  return Response.json({
    data: {
      mrr: {
        cents: mrrCents,
        // true if env vars are configured (non-zero)
        configured: Object.values(planBreakdown).some((v) => v.mrrCents > 0),
      },
      subscriptions: {
        active: totalActiveCount,
        trialing: totalTrialCount,
        cancelledThisMonth: Number(cancelledThisMonth[0]?.total ?? 0),
        cancelledLastMonth: Number(cancelledLastMonth[0]?.total ?? 0),
      },
      users: {
        total: Number(totalUsers[0]?.total ?? 0),
        newThisMonth: Number(newUsersThisMonth[0]?.total ?? 0),
      },
      planBreakdown,
      trialToPaidRate: conversionRate,
    },
  });
}
