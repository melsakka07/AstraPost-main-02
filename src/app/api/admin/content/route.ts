import { count, eq, and, gte, sql, desc } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { db } from "@/lib/db";
import { posts, tweets, tweetAnalytics, user } from "@/lib/schema";

// ── GET /api/admin/content ─────────────────────────────────────────────────────

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = 10;
    const offset = (page - 1) * limit;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel for performance
    const [
      // Summary stats
      [totalPostsRow],
      [publishedPostsRow],
      [scheduledPostsRow],
      [failedPostsRow],
      [postsThisWeekRow],
      [aiGeneratedRow],
      // Top performing posts (paginated)
      topPostsData,
      [{ totalCount: topPostsTotal } = { totalCount: 0 }],
      // Posting volume (last 30 days) - array of daily counts
      volumeData,
      // Failure reasons (last 30 days)
      failureReasonsData,
    ] = await Promise.all([
      // Summary queries
      db.select({ value: count(posts.id) }).from(posts),
      db
        .select({ value: count(posts.id) })
        .from(posts)
        .where(eq(posts.status, "published")),
      db
        .select({ value: count(posts.id) })
        .from(posts)
        .where(eq(posts.status, "scheduled")),
      db
        .select({ value: count(posts.id) })
        .from(posts)
        .where(eq(posts.status, "failed")),
      db
        .select({ value: count(posts.id) })
        .from(posts)
        .where(gte(posts.createdAt, sevenDaysAgo)),
      db
        .select({ value: count(posts.id) })
        .from(posts)
        .where(eq(posts.aiGenerated, true)),

      // Top performing posts - join posts -> tweets -> tweetAnalytics
      db
        .select({
          postId: posts.id,
          content: tweets.content,
          userName: user.name,
          userEmail: user.email,
          impressions: tweetAnalytics.impressions,
          likes: tweetAnalytics.likes,
          retweets: tweetAnalytics.retweets,
          engagementRate: tweetAnalytics.engagementRate,
          performanceScore: tweetAnalytics.performanceScore,
        })
        .from(posts)
        .innerJoin(tweets, eq(tweets.postId, posts.id))
        .innerJoin(tweetAnalytics, eq(tweetAnalytics.tweetId, tweets.id))
        .leftJoin(user, eq(user.id, posts.userId))
        .orderBy(desc(tweetAnalytics.impressions))
        .limit(limit)
        .offset(offset),

      // Get total count for pagination
      db
        .select({ totalCount: sql<number>`count(*)::int` })
        .from(posts)
        .innerJoin(tweets, eq(tweets.postId, posts.id))
        .innerJoin(tweetAnalytics, eq(tweetAnalytics.tweetId, tweets.id)),

      // Posting volume - last 30 days, grouped by day
      db
        .select({
          date: sql<string>`date(${posts.publishedAt})`,
          published: sql<number>`count(*) filter (where ${posts.status} = 'published')`,
          failed: sql<number>`count(*) filter (where ${posts.status} = 'failed')`,
        })
        .from(posts)
        .where(and(gte(posts.publishedAt, thirtyDaysAgo), sql`${posts.publishedAt} is not null`))
        .groupBy(sql`date(${posts.publishedAt})`)
        .orderBy(sql`date(${posts.publishedAt})`),

      // Failure reasons - last 30 days
      db
        .select({
          reason: sql<string>`coalesce(${posts.failReason}, 'Unknown')`,
          count: count(posts.id),
        })
        .from(posts)
        .where(and(eq(posts.status, "failed"), gte(posts.createdAt, thirtyDaysAgo)))
        .groupBy(sql`coalesce(${posts.failReason}, 'Unknown')`)
        .orderBy(desc(count(posts.id))),
    ]);

    const summary = {
      total: Number(totalPostsRow?.value ?? 0),
      published: Number(publishedPostsRow?.value ?? 0),
      scheduled: Number(scheduledPostsRow?.value ?? 0),
      failed: Number(failedPostsRow?.value ?? 0),
      thisWeek: Number(postsThisWeekRow?.value ?? 0),
      aiGenerated: Number(aiGeneratedRow?.value ?? 0),
    };

    // Format top posts for response
    const formattedTopPosts = topPostsData.map((post) => ({
      content: post.content?.slice(0, 100) ?? "",
      userName: post.userName ?? "Unknown",
      userEmail: post.userEmail ?? "",
      impressions: post.impressions ?? 0,
      likes: post.likes ?? 0,
      retweets: post.retweets ?? 0,
      engagementRate: post.engagementRate ?? "0.00",
      performanceScore: post.performanceScore ?? 0,
    }));

    const totalPages = Math.ceil((topPostsTotal ?? 0) / limit);

    return Response.json({
      data: {
        summary,
        topPosts: {
          data: formattedTopPosts,
          pagination: {
            page,
            limit,
            total: topPostsTotal ?? 0,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
        volume: volumeData.map((v) => ({
          date: v.date,
          published: v.published,
          failed: v.failed,
        })),
        failureReasons: failureReasonsData.map((f) => ({
          reason: f.reason,
          count: f.count,
        })),
      },
    });
  } catch (err) {
    console.error("[content] Error:", err);
    return new Response(JSON.stringify({ error: "Failed to load content analytics" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
