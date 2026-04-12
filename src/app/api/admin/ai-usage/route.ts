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
    dateRange?: {
      from: string;
      to: string;
    };
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

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const rangeFrom = fromParam ? new Date(fromParam) : startOfMonth;
  const rangeTo = toParam ? new Date(toParam) : now;

  const [
    [totalGenerationsRow],
    [rangeGenerationsRow],
    [activeUsersInRangeRow],
    [tokensInRangeRow],
    topConsumersData,
    dailyTrendData,
    typeBreakdownData,
  ] = await Promise.all([
    db.select({ value: count(aiGenerations.id) }).from(aiGenerations),
    db
      .select({ value: count(aiGenerations.id) })
      .from(aiGenerations)
      .where(gte(aiGenerations.createdAt, rangeFrom)),
    db
      .select({ value: sql<number>`count(distinct ${aiGenerations.userId})` })
      .from(aiGenerations)
      .where(gte(aiGenerations.createdAt, rangeFrom)),
    db
      .select({ value: sql<number>`coalesce(sum(${aiGenerations.tokensUsed}), 0)` })
      .from(aiGenerations)
      .where(gte(aiGenerations.createdAt, rangeFrom)),
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
      .where(gte(aiGenerations.createdAt, rangeFrom))
      .groupBy(aiGenerations.userId, user.name, user.email)
      .orderBy(desc(sql`count(${aiGenerations.id})`))
      .limit(limit)
      .offset(offset),
    db
      .select({
        date: sql<string>`date(${aiGenerations.createdAt})`,
        count: sql<number>`count(${aiGenerations.id})`,
      })
      .from(aiGenerations)
      .where(gte(aiGenerations.createdAt, rangeFrom))
      .groupBy(sql`date(${aiGenerations.createdAt})`)
      .orderBy(sql`date(${aiGenerations.createdAt})`),
    db
      .select({
        type: aiGenerations.type,
        count: count(aiGenerations.id),
      })
      .from(aiGenerations)
      .groupBy(aiGenerations.type)
      .orderBy(desc(count(aiGenerations.id))),
  ]);

  const [topConsumersCountRow] = await db
    .select({
      value: sql<number>`count(distinct ${aiGenerations.userId})`,
    })
    .from(aiGenerations)
    .where(gte(aiGenerations.createdAt, rangeFrom));

  const totalTopConsumers = Number(topConsumersCountRow?.value ?? 0);
  const totalPages = Math.ceil(totalTopConsumers / limit);

  const responseData: AiUsageResponse = {
    data: {
      summary: {
        totalGenerations: Number(totalGenerationsRow?.value ?? 0),
        thisMonth: Number(rangeGenerationsRow?.value ?? 0),
        activeUsersThisMonth: Number(activeUsersInRangeRow?.value ?? 0),
        tokensThisMonth: Number(tokensInRangeRow?.value ?? 0),
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
      dateRange: {
        from: rangeFrom.toISOString(),
        to: rangeTo.toISOString(),
      },
    },
  };

  return Response.json(responseData);
}
