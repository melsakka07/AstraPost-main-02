import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliateClicks, affiliateLinks, user } from "@/lib/schema";

export interface AffiliateSummaryStats {
  totalAffiliates: number;
  activeAffiliates: number;
  totalClicks: number;
  totalSignups: number;
  totalConversions: number;
  totalEarnings: number;
}

export interface ConversionFunnelStage {
  name: string;
  count: number;
  percentage: number;
}

export interface ConversionFunnel {
  linksGenerated: number;
  clicked: number;
  signedUp: number;
  converted: number;
}

export interface TrendDataPoint {
  date: string;
  clicks: number;
  conversions: number;
}

export interface TopAffiliate {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  clicksThisMonth: number;
  conversions: number;
  conversionRate: number;
  earningsCents: number;
}

export function getStartDate(period: "7d" | "30d" | "90d"): Date {
  const now = new Date();
  let daysAgo = 30;
  if (period === "7d") daysAgo = 7;
  if (period === "90d") daysAgo = 90;
  return new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

export async function getAffiliateSummaryStats(startDate: Date): Promise<AffiliateSummaryStats> {
  const commissionCents = parseInt(process.env.AFFILIATE_COMMISSION_CENTS ?? "1000", 10);

  const totalAffiliatesResult = await db
    .select({ total: sql<number>`count(distinct ${affiliateLinks.userId})` })
    .from(affiliateLinks);
  const totalAffiliates = Number(totalAffiliatesResult[0]?.total ?? 0);

  const activeAffiliatesResult = await db
    .select({
      total: sql<number>`count(distinct ${affiliateClicks.affiliateLinkId})`,
    })
    .from(affiliateClicks)
    .where(gte(affiliateClicks.clickedAt, startDate));

  const activeAffiliates = Number(activeAffiliatesResult[0]?.total ?? 0);

  const clicksResult = await db
    .select({ total: count() })
    .from(affiliateClicks)
    .where(gte(affiliateClicks.clickedAt, startDate));
  const totalClicks = Number(clicksResult[0]?.total ?? 0);

  const signupsResult = await db
    .select({ total: count() })
    .from(user)
    .where(and(sql`${user.referredBy} IS NOT NULL`, gte(user.createdAt, startDate)));
  const totalSignups = Number(signupsResult[0]?.total ?? 0);

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

  const totalEarnings = totalConversions * commissionCents;

  return {
    totalAffiliates,
    activeAffiliates,
    totalClicks,
    totalSignups,
    totalConversions,
    totalEarnings,
  };
}

export async function getConversionFunnel(startDate: Date): Promise<ConversionFunnelStage[]> {
  const linksGenerated = await db.select({ total: count() }).from(affiliateLinks);
  const linksCount = Number(linksGenerated[0]?.total ?? 0);

  const clicksResult = await db
    .select({ total: count() })
    .from(affiliateClicks)
    .where(gte(affiliateClicks.clickedAt, startDate));
  const clicked = Number(clicksResult[0]?.total ?? 0);

  const signupsResult = await db
    .select({ total: count() })
    .from(user)
    .where(and(sql`${user.referredBy} IS NOT NULL`, gte(user.createdAt, startDate)));
  const signedUp = Number(signupsResult[0]?.total ?? 0);

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
  const converted = Number(conversionsResult[0]?.total ?? 0);

  const stages: ConversionFunnelStage[] = [
    { name: "Links Generated", count: linksCount, percentage: 100 },
    {
      name: "Clicked",
      count: clicked,
      percentage: linksCount > 0 ? (clicked / linksCount) * 100 : 0,
    },
    {
      name: "Signed Up",
      count: signedUp,
      percentage: linksCount > 0 ? (signedUp / linksCount) * 100 : 0,
    },
    {
      name: "Converted",
      count: converted,
      percentage: linksCount > 0 ? (converted / linksCount) * 100 : 0,
    },
  ];

  return stages;
}

export async function getTrendsData(startDate: Date): Promise<TrendDataPoint[]> {
  const timeSeriesData = await db
    .select({
      date: sql<string>`DATE(${affiliateClicks.clickedAt})`,
      clicks: count(affiliateClicks.id),
    })
    .from(affiliateClicks)
    .where(gte(affiliateClicks.clickedAt, startDate))
    .groupBy(sql`DATE(${affiliateClicks.clickedAt})`)
    .orderBy(sql`DATE(${affiliateClicks.clickedAt})`);

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

  return timeSeriesMetrics;
}

export async function getTopAffiliates(
  startDate: Date,
  limit: number = 20
): Promise<TopAffiliate[]> {
  const commissionCents = parseInt(process.env.AFFILIATE_COMMISSION_CENTS ?? "1000", 10);

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
    .limit(limit);

  const topAffiliates = await Promise.all(
    topAffiliatesData.map(async (aff) => {
      const [userRow] = await db
        .select({ name: user.name, email: user.email, referralCode: user.referralCode })
        .from(user)
        .where(eq(user.id, aff.userId));

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
        id: aff.userId,
        name: userRow?.name ?? "Unknown",
        email: userRow?.email ?? "",
        referralCode: userRow?.referralCode ?? "",
        clicksThisMonth: clicks,
        conversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        earningsCents: earnings,
      };
    })
  );

  return topAffiliates;
}
