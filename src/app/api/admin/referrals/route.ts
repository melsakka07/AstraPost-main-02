import { count, sql, desc } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { db } from "@/lib/db";
import { user, subscriptions } from "@/lib/schema";

// ── GET /api/admin/referrals ─────────────────────────────────────────────────────

interface ReferralSummary {
  totalReferrers: number;
  totalReferred: number;
  totalCreditsIssued: number;
  conversionRate: number;
}

interface ReferrerRow {
  id: string;
  name: string;
  email: string;
  referralCode: string | null;
  referredCount: number;
  convertedCount: number;
  totalCredits: number;
}

interface ReferralsResponse {
  data: {
    summary: ReferralSummary;
    topReferrers: {
      data: ReferrerRow[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  };
}

export async function GET(req: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 10));
  // Summary stats queries
  const [[totalReferrersRow], [totalReferredRow], [totalCreditsRow], referredUsersStats] =
    await Promise.all([
      // Total users with a referral code (potential referrers)
      db
        .select({ value: count(user.id) })
        .from(user)
        .where(sql`${user.referralCode} IS NOT NULL`),

      // Total users who were referred (referredBy IS NOT NULL)
      db
        .select({ value: count(user.id) })
        .from(user)
        .where(sql`${user.referredBy} IS NOT NULL`),

      // Total referral credits issued across all users
      db.select({ value: sql<number>`coalesce(sum(${user.referralCredits}), 0)` }).from(user),

      // Referred users with their plan/subscription info for conversion calculation
      db
        .select({
          userId: user.id,
          plan: user.plan,
          hasActiveSubscription: sql<boolean>`exists(
          select 1 from ${subscriptions}
          where ${subscriptions.userId} = ${user.id}
          and ${subscriptions.status} = 'active'
        )`,
        })
        .from(user)
        .where(sql`${user.referredBy} IS NOT NULL`),
    ]);

  // Calculate conversion rate
  // "paid" means plan is not 'free' OR they have an active subscription
  const totalReferred = Number(totalReferredRow?.value ?? 0);
  const paidReferredUsers = referredUsersStats.filter(
    (u) => u.plan !== "free" || u.hasActiveSubscription
  ).length;
  const conversionRate =
    totalReferred > 0 ? Math.round((paidReferredUsers / totalReferred) * 100) : 0;

  // Top referrers query with pagination
  // We need to count how many users each referrer referred and how many converted
  const referrersQuery = db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      referralCode: user.referralCode,
      referredCount: sql<number>`(
        select count(*)
        from ${user} as referred
        where referred.referred_by = ${user.id}
      )`.as("referred_count"),
      convertedCount: sql<number>`(
        select count(*)
        from ${user} as referred
        left join ${subscriptions} as sub on sub.user_id = referred.id
        where referred.referred_by = ${user.id}
        and (referred.plan != 'free' or sub.status = 'active')
      )`.as("converted_count"),
      totalCredits: user.referralCredits,
    })
    .from(user)
    .where(sql`${user.referralCode} IS NOT NULL`)
    .orderBy(desc(sql`referred_count`))
    .limit(limit + 1); // Fetch one extra to determine if there's a next page

  const referrers = await referrersQuery;

  // Pagination: check if we have more results
  const hasMore = referrers.length > limit;
  const data = hasMore ? referrers.slice(0, limit) : referrers;
  const total = hasMore ? page * limit + 1 : (page - 1) * limit + referrers.length;
  const totalPages = Math.ceil(total / limit);

  const response: ReferralsResponse = {
    data: {
      summary: {
        totalReferrers: Number(totalReferrersRow?.value ?? 0),
        totalReferred,
        totalCreditsIssued: Number(totalCreditsRow?.value ?? 0),
        conversionRate,
      },
      topReferrers: {
        data: data as ReferrerRow[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    },
  };

  return Response.json(response);
}
