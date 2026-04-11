import { count, eq, gte, sql, desc } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { db } from "@/lib/db";
import { aiGenerations, user } from "@/lib/schema";

// ── GET /api/admin/ai-usage ─────────────────────────────────────────────────────

interface AiUsageResponse {
  data: {
    summary: {
      totalGenerations: number;
      thisMonth: number;
      activeUsersThisMonth: number;
      tokensThisMonth: number;
    };
    topConsumers: {
      data: Array<{
        userId: string;
        userName: string | null;
        userEmail: string | null;
        generationCount: number;
        totalTokens: number;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
    dailyTrend: Array<{ date: string; count: number }>;
    typeBreakdown: Array<{ type: string | null; count: number }>;
  };
}

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 10));
  const offset = (page - 1) * limit;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Run all queries in parallel for performance
  const [
    // Summary stats
    [totalGenerationsRow],
    [thisMonthGenerationsRow],
    [activeUsersThisMonthRow],
    [tokensThisMonthRow],

    // Top consumers (paginated)
    topConsumersData,

    // Daily trend (last 30 days)
    dailyTrendData,

    // Type breakdown
    typeBreakdownData,
  ] = await Promise.all([
    // Summary: total generations all-time
    db.select({ value: count(aiGenerations.id) }).from(aiGenerations),

    // Summary: generations this month
    db
      .select({ value: count(aiGenerations.id) })
      .from(aiGenerations)
      .where(gte(aiGenerations.createdAt, startOfMonth)),

    // Summary: active users this month (distinct userId)
    db
      .select({ value: sql<number>`count(distinct ${aiGenerations.userId})` })
      .from(aiGenerations)
      .where(gte(aiGenerations.createdAt, startOfMonth)),

    // Summary: total tokens used this month
    db
      .select({ value: sql<number>`coalesce(sum(${aiGenerations.tokensUsed}), 0)` })
      .from(aiGenerations)
      .where(gte(aiGenerations.createdAt, startOfMonth)),

    // Top consumers: users with most generations this month
    db
      .select({
        userId: aiGenerations.userId,
        userName: user.name,
        userEmail: user.email,
        generationCount: sql<number>`count(${aiGenerations.id})`,
        totalTokens: sql<number>`coalesce(sum(${aiGenerations.tokensUsed}), 0)`,
      })
      .from(aiGenerations)
      .leftJoin(user, eq(aiGenerations.userId, user.id))
      .where(gte(aiGenerations.createdAt, startOfMonth))
      .groupBy(aiGenerations.userId, user.name, user.email)
      .orderBy(desc(sql`count(${aiGenerations.id})`))
      .limit(limit)
      .offset(offset),

    // Daily trend: generations per day for last 30 days
    db
      .select({
        date: sql<string>`date(${aiGenerations.createdAt})`,
        count: sql<number>`count(${aiGenerations.id})`,
      })
      .from(aiGenerations)
      .where(gte(aiGenerations.createdAt, thirtyDaysAgo))
      .groupBy(sql`date(${aiGenerations.createdAt})`)
      .orderBy(sql`date(${aiGenerations.createdAt})`),

    // Type breakdown: count by generation type
    db
      .select({
        type: aiGenerations.type,
        count: count(aiGenerations.id),
      })
      .from(aiGenerations)
      .groupBy(aiGenerations.type)
      .orderBy(desc(count(aiGenerations.id))),
  ]);

  // Get total count for pagination
  const [topConsumersCountRow] = await db
    .select({
      value: sql<number>`count(distinct ${aiGenerations.userId})`,
    })
    .from(aiGenerations)
    .where(gte(aiGenerations.createdAt, startOfMonth));

  const totalTopConsumers = Number(topConsumersCountRow?.value ?? 0);
  const totalPages = Math.ceil(totalTopConsumers / limit);

  const responseData: AiUsageResponse = {
    data: {
      summary: {
        totalGenerations: Number(totalGenerationsRow?.value ?? 0),
        thisMonth: Number(thisMonthGenerationsRow?.value ?? 0),
        activeUsersThisMonth: Number(activeUsersThisMonthRow?.value ?? 0),
        tokensThisMonth: Number(tokensThisMonthRow?.value ?? 0),
      },
      topConsumers: {
        data: topConsumersData.map((row) => ({
          userId: row.userId,
          userName: row.userName ?? null,
          userEmail: row.userEmail ?? null,
          generationCount: Number(row.generationCount),
          totalTokens: Number(row.totalTokens),
        })),
        pagination: {
          page,
          limit,
          total: totalTopConsumers,
          totalPages,
        },
      },
      dailyTrend: dailyTrendData.map((row) => ({
        date: row.date,
        count: Number(row.count),
      })),
      typeBreakdown: typeBreakdownData.map((row) => ({
        type: row.type,
        count: Number(row.count),
      })),
    },
  };

  return Response.json(responseData);
}
