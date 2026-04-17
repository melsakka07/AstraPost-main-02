import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { and, desc, eq, gte } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tweetAnalytics, tweetAnalyticsSnapshots, tweets } from "@/lib/schema";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return ApiError.unauthorized();
  }

  const { id } = await params;

  // Verify ownership via tweet -> post -> user
  const tweet = await db.query.tweets.findFirst({
    where: eq(tweets.id, id),
    with: {
      post: true,
    },
  });

  if (!tweet || tweet.post.userId !== session.user.id) {
    return ApiError.notFound();
  }

  // Fetch current metrics
  const current = await db.query.tweetAnalytics.findFirst({
    where: eq(tweetAnalytics.tweetId, id),
  });

  // Fetch history (last 30 days)
  const history = await db.query.tweetAnalyticsSnapshots.findMany({
    where: and(
      eq(tweetAnalyticsSnapshots.tweetId, id),
      gte(tweetAnalyticsSnapshots.fetchedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    ),
    orderBy: [desc(tweetAnalyticsSnapshots.fetchedAt)],
  });

  // Sort history ascending for charts
  const historyAsc = [...history].sort((a, b) => a.fetchedAt.getTime() - b.fetchedAt.getTime());

  return Response.json({
    current: current || null,
    history: historyAsc,
  });
}
