import { sql, isNotNull, desc, count, sum } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { user } from "@/lib/schema";
import { paginationSchema } from "@/lib/schemas/common";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = paginationSchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);
    const { page, limit } = parsed.data;

    const [
      totalReferrersResult,
      totalReferredResult,
      totalCreditsResult,
      conversionsResult,
      topReferrers,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(user)
        .where(isNotNull(user.referralCode))
        .then((r) => r[0]?.count ?? 0),
      db
        .select({ count: count() })
        .from(user)
        .where(isNotNull(user.referredBy))
        .then((r) => r[0]?.count ?? 0),
      db
        .select({ total: sum(user.referralCredits) })
        .from(user)
        .then((r) => r[0]?.total ?? 0),
      db
        .select({
          count: count(),
        })
        .from(user)
        .where(
          sql`${user.referredBy} IS NOT NULL AND (${user.plan} = 'pro_monthly' OR ${user.plan} = 'pro_annual' OR ${user.plan} = 'agency')`
        )
        .then((r) => r[0]?.count ?? 0),
      db
        .select({
          referrerId: user.id,
          referrerName: user.name,
          referrerEmail: user.email,
          referralCode: user.referralCode,
          referralCount: sql<number>`count(*)`.as("referralCount"),
          conversionCount:
            sql<number>`sum(case when ${user.plan} = 'pro_monthly' or ${user.plan} = 'pro_annual' or ${user.plan} = 'agency' then 1 else 0 end)`.as(
              "conversionCount"
            ),
          totalCredits: user.referralCredits,
        })
        .from(user)
        .where(isNotNull(user.referralCode))
        .groupBy(user.id, user.name, user.email, user.referralCode, user.referralCredits)
        .orderBy(desc(sql`count(*)`))
        .limit(10),
    ]);

    const totalReferred = Number(totalReferredResult);
    const conversions = Number(conversionsResult);
    const conversionRate = totalReferred > 0 ? Math.round((conversions / totalReferred) * 100) : 0;

    const summary = {
      totalReferrers: Number(totalReferrersResult),
      totalReferred,
      totalCreditsIssued: Number(totalCreditsResult),
      conversionRate,
    };

    const topReferrersData = topReferrers.map((r) => ({
      id: r.referrerId,
      name: r.referrerName ?? "Unknown",
      email: r.referrerEmail ?? "",
      referralCode: r.referralCode,
      referredCount: Number(r.referralCount),
      convertedCount: Number(r.conversionCount),
      totalCredits: r.totalCredits ?? 0,
    }));

    return Response.json({
      data: {
        summary,
        topReferrers: {
          data: topReferrersData,
          pagination: {
            page,
            limit,
            total: summary.totalReferrers,
            totalPages: Math.ceil(summary.totalReferrers / limit),
          },
        },
      },
    });
  } catch (err) {
    logger.error("[referrals] Error", { error: err });
    return ApiError.internal("Failed to load referral analytics");
  }
}
