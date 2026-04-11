import { count, sql } from "drizzle-orm";
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

  const [[totalReferrersRow], [totalReferredRow], [totalCreditsRow], referredUsersStats] =
    await Promise.all([
      db
        .select({ value: count(user.id) })
        .from(user)
        .where(sql`${user.referralCode} IS NOT NULL`),

      db
        .select({ value: count(user.id) })
        .from(user)
        .where(sql`${user.referredBy} IS NOT NULL`),

      db.select({ value: sql<number>`coalesce(sum(${user.referralCredits}), 0)` }).from(user),

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

  const totalReferred = Number(totalReferredRow?.value ?? 0);
  const paidReferredUsers = referredUsersStats.filter(
    (u) => u.plan !== "free" || u.hasActiveSubscription
  ).length;
  const conversionRate =
    totalReferred > 0 ? Math.round((paidReferredUsers / totalReferred) * 100) : 0;

  const referrersWithCounts = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      referralCode: user.referralCode,
      totalCredits: user.referralCredits,
    })
    .from(user)
    .where(sql`${user.referralCode} IS NOT NULL`);

  const referrerIds = referrersWithCounts.map((r) => r.id);

  let referrersWithData: ReferrerRow[] = [];

  if (referrerIds.length > 0) {
    const referredCounts = await db
      .select({
        referrerId: user.referredBy,
        count: count(user.id),
      })
      .from(user)
      .where(sql`${user.referredBy} IS NOT NULL`)
      .groupBy(user.referredBy);

    const referredUserPlans = await db
      .select({
        referrerId: user.referredBy,
        userId: user.id,
        plan: user.plan,
        hasActiveSub: sql<boolean>`exists(
          select 1 from ${subscriptions}
          where ${subscriptions.userId} = ${user.id}
          and ${subscriptions.status} = 'active'
        )`,
      })
      .from(user)
      .where(sql`${user.referredBy} IS NOT NULL`);

    const convertedCounts = new Map<string, number>();
    for (const row of referredUserPlans) {
      if (row.referrerId && (row.plan !== "free" || row.hasActiveSub)) {
        convertedCounts.set(row.referrerId, (convertedCounts.get(row.referrerId) ?? 0) + 1);
      }
    }

    const countMap = new Map<string, number>();
    for (const row of referredCounts) {
      if (row.referrerId) {
        countMap.set(row.referrerId, row.count);
      }
    }

    referrersWithData = referrersWithCounts.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      referralCode: r.referralCode,
      referredCount: countMap.get(r.id) ?? 0,
      convertedCount: convertedCounts.get(r.id) ?? 0,
      totalCredits: r.totalCredits ?? 0,
    }));

    referrersWithData.sort((a, b) => b.referredCount - a.referredCount);
  }

  const total = referrersWithData.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const paginatedData = referrersWithData.slice(offset, offset + limit);

  const response: ReferralsResponse = {
    data: {
      summary: {
        totalReferrers: Number(totalReferrersRow?.value ?? 0),
        totalReferred,
        totalCreditsIssued: Number(totalCreditsRow?.value ?? 0),
        conversionRate,
      },
      topReferrers: {
        data: paginatedData,
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
