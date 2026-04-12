import { sql, isNotNull, desc } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
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
    const offset = (page - 1) * limit;

    const [totalUsers, referralSummaries, topReferrers] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(user)
        .then((r) => r[0]?.count ?? 0),
      db
        .select({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          referredBy: user.referredBy,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(isNotNull(user.referredBy))
        .orderBy(desc(user.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({
          referrerId: user.id,
          referrerName: user.name,
          referrerEmail: user.email,
          referralCount: sql<number>`count(*)`.as("referralCount"),
          conversionCount:
            sql<number>`sum(case when ${user.plan} = 'paid_monthly' or ${user.plan} = 'paid_yearly' then 1 else 0 end)`.as(
              "conversionCount"
            ),
        })
        .from(user)
        .groupBy(user.id, user.name, user.email)
        .orderBy(desc(sql`count(*)`))
        .limit(10),
    ]);

    return Response.json({
      data: referralSummaries,
      topReferrers,
      pagination: { page, limit, total: totalUsers, totalPages: Math.ceil(totalUsers / limit) },
    });
  } catch (err) {
    console.error("[referrals] Error:", err);
    return ApiError.internal("Failed to load referral analytics");
  }
}
