import { headers } from "next/headers";
import { Readable } from "stream";
import { renderToStream } from "@react-pdf/renderer";
import { and, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { AnalyticsPdfDocument } from "@/components/analytics/pdf-document";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  checkAnalyticsExportLimitDetailed,
  createPlanLimitResponse,
} from "@/lib/middleware/require-plan";
import { getPlanLimits } from "@/lib/plan-limits";
import { posts, tweetAnalytics, tweets, user } from "@/lib/schema";

const exportSchema = z.object({
  format: z.enum(["csv", "pdf"]).default("csv"),
  range: z.enum(["7d", "30d", "90d", "365d"]).default("30d"),
});

function toCsvValue(value: string | number) {
  const stringValue = String(value);
  if (!/[",\n]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replaceAll('"', '""')}"`;
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const userLocale =
    session?.user && "language" in session.user ? (session.user as any).language : "en";

  const exportGate = await checkAnalyticsExportLimitDetailed(session.user.id);
  if (!exportGate.allowed) {
    return createPlanLimitResponse(exportGate);
  }

  const url = new URL(req.url);
  const parsed = exportSchema.safeParse({
    format: url.searchParams.get("format") ?? "csv",
    range: url.searchParams.get("range") ?? "30d",
  });

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid export request" }), { status: 400 });
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { plan: true },
  });

  const limits = getPlanLimits(dbUser?.plan);
  const requestedDays = Number.parseInt(parsed.data.range.replace("d", ""), 10);
  const retentionDays = Math.max(1, limits.analyticsRetentionDays);
  const effectiveDays = Math.min(requestedDays, retentionDays);
  const since = new Date(Date.now() - effectiveDays * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      fetchedAt: tweetAnalytics.fetchedAt,
      xTweetId: tweetAnalytics.xTweetId,
      content: tweets.content,
      impressions: tweetAnalytics.impressions,
      likes: tweetAnalytics.likes,
      retweets: tweetAnalytics.retweets,
      replies: tweetAnalytics.replies,
      linkClicks: tweetAnalytics.linkClicks,
      engagementRate: tweetAnalytics.engagementRate,
    })
    .from(tweetAnalytics)
    .innerJoin(tweets, eq(tweetAnalytics.tweetId, tweets.id))
    .innerJoin(posts, eq(tweets.postId, posts.id))
    .where(and(eq(posts.userId, session.user.id), gte(tweetAnalytics.fetchedAt, since)))
    .orderBy(desc(tweetAnalytics.fetchedAt))
    .limit(5_000);

  const filename = `analytics-export-${new Date().toISOString().slice(0, 10)}`;

  if (parsed.data.format === "pdf") {
    // Calculate totals for the PDF summary
    const totals = rows.reduce(
      (acc, row) => ({
        impressions: acc.impressions + (row.impressions || 0),
        likes: acc.likes + (row.likes || 0),
        retweets: acc.retweets + (row.retweets || 0),
        replies: acc.replies + (row.replies || 0),
        linkClicks: acc.linkClicks + (row.linkClicks || 0),
      }),
      { impressions: 0, likes: 0, retweets: 0, replies: 0, linkClicks: 0 }
    );

    // Get top 10 tweets for the PDF
    const topTweets = [...rows]
      .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))
      .slice(0, 10)
      .map((row) => ({
        content: row.content,
        impressions: row.impressions || 0,
        likes: row.likes || 0,
        retweets: row.retweets || 0,
        replies: row.replies || 0,
        fetchedAt: row.fetchedAt,
      }));

    const pdfData = {
      range: parsed.data.range,
      totals,
      topTweets,
    };

    const stream = await renderToStream(
      <AnalyticsPdfDocument data={pdfData} userLocale={userLocale} />
    );

    // Cast stream to Readable because renderToStream returns NodeJS.ReadableStream
    // but Readable.toWeb expects stream.Readable (which is compatible but TS complains)
    const webStream = Readable.toWeb(stream as Readable);

    return new Response(webStream as ReadableStream, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  }

  // CSV Generation
  const header = [
    "fetched_at",
    "x_tweet_id",
    "content",
    "impressions",
    "likes",
    "retweets",
    "replies",
    "link_clicks",
    "engagement_rate",
  ];

  const csv = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.fetchedAt.toISOString(),
        row.xTweetId,
        row.content,
        row.impressions ?? 0,
        row.likes ?? 0,
        row.retweets ?? 0,
        row.replies ?? 0,
        row.linkClicks ?? 0,
        row.engagementRate ?? "0.00",
      ]
        .map(toCsvValue)
        .join(",")
    ),
  ].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}.csv"`,
      "cache-control": "no-store",
    },
  });
}
