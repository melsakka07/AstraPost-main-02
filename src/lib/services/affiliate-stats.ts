import { and, count, desc, eq, gte, inArray, isNotNull, ne, sql } from "drizzle-orm";
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
  const [clicksData, conversionsData] = await Promise.all([
    db
      .select({
        date: sql<string>`DATE(${affiliateClicks.clickedAt})`,
        clicks: count(affiliateClicks.id),
      })
      .from(affiliateClicks)
      .where(gte(affiliateClicks.clickedAt, startDate))
      .groupBy(sql`DATE(${affiliateClicks.clickedAt})`),

    db
      .select({
        date: sql<string>`DATE(${user.createdAt})`,
        conversions: count(user.id),
      })
      .from(user)
      .where(and(isNotNull(user.referredBy), ne(user.plan, "free"), gte(user.createdAt, startDate)))
      .groupBy(sql`DATE(${user.createdAt})`),
  ]);

  const convMap = new Map(conversionsData.map((d) => [d.date, d.conversions]));
  return clicksData.map((row) => ({
    date: row.date,
    clicks: row.clicks,
    conversions: convMap.get(row.date) ?? 0,
  }));
}

export async function getTopAffiliates(
  startDate: Date,
  limit: number = 20
): Promise<TopAffiliate[]> {
  const commissionCents = parseInt(process.env.AFFILIATE_COMMISSION_CENTS ?? "1000", 10);

  const topAffsRaw = await db
    .select({
      userId: affiliateLinks.userId,
      clicks: count(affiliateClicks.id),
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
    .orderBy(desc(count(affiliateClicks.id)))
    .limit(limit);

  const userIds = topAffsRaw.map((a) => a.userId);

  if (userIds.length === 0) return [];

  const [affiliateUsers, conversions] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, email: user.email, referralCode: user.referralCode })
      .from(user)
      .where(inArray(user.id, userIds)),
    db
      .select({ referredBy: user.referredBy, convCount: count(user.id) })
      .from(user)
      .where(
        and(
          inArray(user.referredBy as any, userIds),
          ne(user.plan, "free"),
          gte(user.createdAt, startDate)
        )
      )
      .groupBy(user.referredBy),
  ]);

  const userMap = new Map(affiliateUsers.map((u) => [u.id, u]));
  const convMap = new Map(conversions.map((c) => [c.referredBy!, c.convCount]));

  return topAffsRaw.map((aff) => {
    const aUser = userMap.get(aff.userId);
    const convs = convMap.get(aff.userId) ?? 0;
    const clicks = aff.clicks ?? 0;
    const conversionRate = clicks > 0 ? (convs / clicks) * 100 : 0;
    const earnings = convs * commissionCents;

    return {
      id: aff.userId,
      name: aUser?.name ?? "Unknown",
      email: aUser?.email ?? "",
      referralCode: aUser?.referralCode ?? "",
      clicksThisMonth: clicks,
      conversions: convs,
      conversionRate: Math.round(conversionRate * 100) / 100,
      earningsCents: earnings,
    };
  });
}
