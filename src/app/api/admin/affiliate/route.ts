import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { affiliateClicks, affiliateLinks, user } from "@/lib/schema";

// ── Query params schema ───────────────────────────────────────────────────────

const querySchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).default("30d"),
});

// ── GET /api/admin/affiliate ─────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApi();
    if (!auth.ok) return auth.response;

    const rl = await checkAdminRateLimit("read");
    if (rl) return rl;

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { period } = parsed.data;

    // Calculate date range
    const now = new Date();
    let daysAgo = 30;
    if (period === "7d") daysAgo = 7;
    if (period === "90d") daysAgo = 90;
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Get commission from env or default to $10 (1000 cents)
    const commissionCents = parseInt(process.env.AFFILIATE_COMMISSION_CENTS ?? "1000", 10);

    // Count total affiliates (users with affiliate links)
    const totalAffiliatesResult = await db
      .select({ total: sql<number>`count(distinct ${affiliateLinks.userId})` })
      .from(affiliateLinks);
    const totalAffiliates = Number(totalAffiliatesResult[0]?.total ?? 0);

    // Count active affiliates (with clicks in period)
    const activeAffiliatesResult = await db
      .select({
        total: sql<number>`count(distinct ${affiliateClicks.affiliateLinkId})`,
      })
      .from(affiliateClicks)
      .where(gte(affiliateClicks.clickedAt, startDate));

    const activeAffiliates = Number(activeAffiliatesResult[0]?.total ?? 0);

    // Count total clicks in period
    const clicksResult = await db
      .select({ total: count() })
      .from(affiliateClicks)
      .where(gte(affiliateClicks.clickedAt, startDate));
    const totalClicks = Number(clicksResult[0]?.total ?? 0);

    // Count signups referred in period (users with referredBy set and createdAt in range)
    const signupsResult = await db
      .select({ total: count() })
      .from(user)
      .where(and(sql`${user.referredBy} IS NOT NULL`, gte(user.createdAt, startDate)));
    const totalSignups = Number(signupsResult[0]?.total ?? 0);

    // Count conversions: users with referredBy set and plan != 'free' created in period
    const conversionsResult = await db
      .select({ total: count() })
      .from(user)
      .where(
        and(
          sql`${user.referredBy} IS NOT NULL`,
          sql`${user.plan} != 'free'`,
          gte(user.createdAt, startDate)
        )
      );
    const totalConversions = Number(conversionsResult[0]?.total ?? 0);

    // Calculate total earnings
    const totalEarnings = totalConversions * commissionCents;

    // Get top affiliates: join with user, count clicks, count conversions
    const topAffiliatesData = await db
      .select({
        userId: affiliateLinks.userId,
        clicks: sql<number>`count(${affiliateClicks.id})`,
      })
      .from(affiliateLinks)
      .leftJoin(
        affiliateClicks,
        and(
          eq(affiliateClicks.affiliateLinkId, affiliateLinks.id),
          gte(affiliateClicks.clickedAt, startDate)
        )
      )
      .groupBy(affiliateLinks.userId)
      .orderBy(desc(sql<number>`count(${affiliateClicks.id})`))
      .limit(20);

    // Enrich with user data and conversion counts
    const topAffiliates = await Promise.all(
      topAffiliatesData.map(async (aff) => {
        const [userRow] = await db
          .select({ name: user.name, email: user.email, referralCode: user.referralCode })
          .from(user)
          .where(eq(user.id, aff.userId));

        // Count conversions for this user (referrals who paid)
        const conversionsForAff = await db
          .select({ total: count() })
          .from(user)
          .where(
            and(
              eq(user.referredBy, aff.userId),
              sql`${user.plan} != 'free'`,
              gte(user.createdAt, startDate)
            )
          );

        const conversions = Number(conversionsForAff[0]?.total ?? 0);
        const clicks = aff.clicks ?? 0;
        const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
        const earnings = conversions * commissionCents;

        return {
          userId: aff.userId,
          username: userRow?.name ?? "Unknown",
          email: userRow?.email ?? "",
          referralCode: userRow?.referralCode ?? "",
          clicks,
          conversions,
          conversionRate: Math.round(conversionRate * 100) / 100,
          earnings,
        };
      })
    );

    // Conversion funnel
    const linksGenerated = await db.select({ total: count() }).from(affiliateLinks);
    const clicked = totalClicks;
    const signedUp = totalSignups;
    const converted = totalConversions;

    // Time series metrics (daily aggregates over period)
    const timeSeriesData = await db
      .select({
        date: sql<string>`DATE(${affiliateClicks.clickedAt})`,
        clicks: count(affiliateClicks.id),
      })
      .from(affiliateClicks)
      .where(gte(affiliateClicks.clickedAt, startDate))
      .groupBy(sql`DATE(${affiliateClicks.clickedAt})`)
      .orderBy(sql`DATE(${affiliateClicks.clickedAt})`);

    // For each day in time series, calculate conversions
    const timeSeriesMetrics = await Promise.all(
      timeSeriesData.map(async (day) => {
        const convForDay = await db
          .select({ total: count() })
          .from(user)
          .where(
            and(
              sql`${user.referredBy} IS NOT NULL`,
              sql`${user.plan} != 'free'`,
              sql`DATE(${user.createdAt}) = ${day.date}`
            )
          );

        return {
          date: day.date,
          clicks: day.clicks ?? 0,
          conversions: Number(convForDay[0]?.total ?? 0),
        };
      })
    );

    return Response.json({
      data: {
        summary: {
          totalAffiliates,
          activeAffiliates,
          totalClicks,
          totalSignups,
          totalEarnings,
        },
        topAffiliates,
        conversionFunnel: {
          linksGenerated: Number(linksGenerated[0]?.total ?? 0),
          clicked,
          signedUp,
          converted,
        },
        timeSeriesMetrics,
      },
    });
  } catch (err) {
    logger.error("[affiliate] Error", { error: err });
    return ApiError.internal("Failed to load affiliate analytics");
  }
}
