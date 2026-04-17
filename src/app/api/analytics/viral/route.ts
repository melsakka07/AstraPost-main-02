/**
 * Viral Content Analyzer API Endpoint
 * GET /api/analytics/viral
 *
 * Analyzes user's top-performing content to identify viral patterns
 */

import { headers } from "next/headers";
import { desc, eq, and, gte } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { posts, tweetAnalytics, tweets } from "@/lib/schema";

export async function GET(req: Request) {
  try {
    // Authentication
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return ApiError.unauthorized();
    }

    const userId = session.user.id;
    const url = new URL(req.url);
    const daysParam = url.searchParams.get("days");
    const days = daysParam ? parseInt(daysParam) : 90;

    // Validate days parameter
    if (days < 7 || days > 365) {
      return ApiError.badRequest("Days must be between 7 and 365");
    }

    // 1. Fetch top-performing tweets
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const topTweets = await db
      .select({
        tweetId: tweets.id,
        content: tweets.content,
        publishedAt: posts.publishedAt,
        impressions: tweetAnalytics.impressions,
        likes: tweetAnalytics.likes,
        retweets: tweetAnalytics.retweets,
        replies: tweetAnalytics.replies,
        engagementRate: tweetAnalytics.engagementRate,
      })
      .from(tweetAnalytics)
      .innerJoin(tweets, eq(tweetAnalytics.tweetId, tweets.id))
      .innerJoin(posts, eq(tweets.postId, posts.id))
      .where(
        and(
          eq(posts.userId, userId),
          gte(posts.publishedAt, startDate),
          gte(tweetAnalytics.impressions, 100) // Minimum impressions for meaningful analysis
        )
      )
      .orderBy(desc(tweetAnalytics.engagementRate))
      .limit(50);

    if (topTweets.length === 0) {
      return Response.json({
        insufficientData: true,
        message: "Not enough tweet data to analyze. Publish more tweets to get insights.",
        analysis: null,
      });
    }

    // 2. Analyze patterns
    const analysis = await analyzeViralPatterns(topTweets, days);

    return Response.json({
      insufficientData: false,
      dataPoints: topTweets.length,
      periodDays: days,
      analysis,
    });
  } catch (error) {
    logger.error("Viral Analysis Error", { error });
    return ApiError.internal("Failed to analyze viral content");
  }
}

// Helper function to analyze patterns from top tweets
async function analyzeViralPatterns(tweets: any[], periodDays: number) {
  // 2.1 Extract hashtags and count their performance
  const hashtagPerformance = new Map<string, { totalEngagement: number; count: number }>();

  // 2.2 Extract keywords (2+ word phrases) and count their performance
  const keywordPerformance = new Map<string, { totalEngagement: number; count: number }>();

  // 2.3 Analyze tweet length performance
  const lengthPerformance = {
    short: { total: 0, count: 0 }, // < 100 chars
    medium: { total: 0, count: 0 }, // 100-200 chars
    long: { total: 0, count: 0 }, // > 200 chars
  };

  // 2.4 Analyze posting time performance
  const dayPerformance = new Map<number, { total: number; count: number }>();
  const hourPerformance = new Map<number, { total: number; count: number }>();

  // 2.5 Analyze content types (questions, stats, quotes, etc.)
  const contentTypePerformance = new Map<string, { total: 0; count: 0 }>();

  for (const tweet of tweets) {
    const engagement = parseFloat(tweet.engagementRate?.toString() || "0");
    const text = (tweet as any).content || "";

    // Extract hashtags
    const hashtagMatches = text.match(/#[\w\u0590-\u05FF]+/g) || [];
    for (const tag of hashtagMatches) {
      const current = hashtagPerformance.get(tag) || { totalEngagement: 0, count: 0 };
      hashtagPerformance.set(tag, {
        totalEngagement: current.totalEngagement + engagement,
        count: current.count + 1,
      });
    }

    // Extract keywords (2+ letter words, excluding hashtags/mentions)
    const words = text
      .toLowerCase()
      .replace(/#[\w\u0590-\u05FF]+/g, "")
      .replace(/@[\w]+/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[^\w\s\u0590-\u05FF]/g, " ")
      .split(/\s+/)
      .filter((w: string) => w.length >= 3);

    // Extract 2-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      const current = keywordPerformance.get(phrase) || { totalEngagement: 0, count: 0 };
      keywordPerformance.set(phrase, {
        totalEngagement: current.totalEngagement + engagement,
        count: current.count + 1,
      });
    }

    // Analyze length
    if (text.length < 100) {
      lengthPerformance.short.total += engagement;
      lengthPerformance.short.count += 1;
    } else if (text.length <= 200) {
      lengthPerformance.medium.total += engagement;
      lengthPerformance.medium.count += 1;
    } else {
      lengthPerformance.long.total += engagement;
      lengthPerformance.long.count += 1;
    }

    // Analyze posting time
    if (tweet.publishedAt) {
      const date = new Date(tweet.publishedAt);
      const day = date.getDay();
      const hour = date.getHours();

      const currentDay = dayPerformance.get(day) ?? { total: 0, count: 0 };
      dayPerformance.set(day, {
        total: currentDay.total + engagement,
        count: currentDay.count + 1,
      });

      const currentHour = hourPerformance.get(hour) ?? { total: 0, count: 0 };
      hourPerformance.set(hour, {
        total: currentHour.total + engagement,
        count: currentHour.count + 1,
      });
    }

    // Detect content types
    if (text.includes("?")) {
      updateMap(contentTypePerformance, "question", engagement);
    }
    if (text.includes("http") || text.includes("://")) {
      updateMap(contentTypePerformance, "link", engagement);
    }
    if (text.match(/["\u00ab\u00bb\u201c\u201d]/)) {
      updateMap(contentTypePerformance, "quote", engagement);
    }
    if (/\d+%|\d+ percent|\d+\/\d+/.test(text)) {
      updateMap(contentTypePerformance, "statistic", engagement);
    }
    if (/\n\n/.test(text)) {
      updateMap(contentTypePerformance, "thread", engagement);
    }
    // Default
    if (!text.includes("?") && !text.includes("http") && !/\n\n/.test(text)) {
      updateMap(contentTypePerformance, "plain_text", engagement);
    }
  }

  // Calculate averages and rankings
  const topHashtags = Array.from(hashtagPerformance.entries())
    .filter(([_, data]) => data.count >= 2) // Must appear in at least 2 tweets
    .map(([tag, data]) => ({
      tag,
      avgEngagement: data.totalEngagement / data.count,
      count: data.count,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 10);

  const topKeywords = Array.from(keywordPerformance.entries())
    .filter(([_, data]) => data.count >= 2)
    .map(([keyword, data]) => ({
      keyword,
      avgEngagement: data.totalEngagement / data.count,
      count: data.count,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 10);

  // Calculate length performance
  const lengthInsights = [
    {
      category: "Short (<100 chars)",
      avg: lengthPerformance.short.total / lengthPerformance.short.count,
      count: lengthPerformance.short.count,
    },
    {
      category: "Medium (100-200)",
      avg: lengthPerformance.medium.total / lengthPerformance.medium.count,
      count: lengthPerformance.medium.count,
    },
    {
      category: "Long (>200 chars)",
      avg: lengthPerformance.long.total / lengthPerformance.long.count,
      count: lengthPerformance.long.count,
    },
  ]
    .filter((l) => l.count > 0)
    .sort((a, b) => b.avg - a.avg);

  // Calculate best posting times
  const bestDays = Array.from(dayPerformance.entries())
    .map(([day, data]) => ({
      day: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day],
      avgEngagement: data.total / data.count,
      count: data.count,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 3);

  const bestHours = Array.from(hourPerformance.entries())
    .map(([hour, data]) => ({
      hour: `${hour}:00`,
      avgEngagement: data.total / data.count,
      count: data.count,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 5);

  // Calculate content type performance
  const contentTypeInsights = Array.from(contentTypePerformance.entries())
    .map(([type, data]) => ({
      type,
      avgEngagement: data.total / data.count,
      count: data.count,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  // Calculate overall stats
  const avgEngagement =
    tweets.reduce((sum, t) => sum + parseFloat(t.engagementRate?.toString() || "0"), 0) /
    tweets.length;
  const topEngagement = Math.max(
    ...tweets.map((t) => parseFloat(t.engagementRate?.toString() || "0"))
  );
  const totalImpressions = tweets.reduce(
    (sum, t) => sum + parseInt(t.impressions?.toString() || "0"),
    0
  );

  // Generate actionable insights
  const insights = generateInsights({
    topHashtags,
    topKeywords,
    lengthInsights,
    bestDays,
    bestHours,
    contentTypeInsights,
    avgEngagement,
    tweets,
  });

  return {
    overall: {
      avgEngagement: Math.round(avgEngagement * 100) / 100,
      topEngagement: Math.round(topEngagement * 100) / 100,
      totalImpressions,
      tweetsAnalyzed: tweets.length,
      periodDays,
    },
    hashtags: topHashtags,
    keywords: topKeywords,
    length: lengthInsights,
    bestDays,
    bestHours,
    contentTypes: contentTypeInsights,
    insights,
  };
}

function updateMap(map: Map<string, { total: number; count: number }>, key: string, value: number) {
  const current = map.get(key) || { total: 0, count: 0 };
  map.set(key, { total: current.total + value, count: current.count + 1 });
}

function generateInsights(data: any): string[] {
  const insights: string[] = [];

  // Length insights
  if (data.lengthInsights.length > 0) {
    const bestLength = data.lengthInsights[0];
    insights.push(
      `Your **${bestLength.category}** tweets perform ${Math.round((bestLength.avg / data.overall.avgEngagement - 1) * 100)}% above average.`
    );
  }

  // Day insights
  if (data.bestDays.length > 0) {
    const bestDay = data.bestDays[0];
    insights.push(
      `**${bestDay.day}** is your best posting day with ${Math.round(bestDay.avgEngagement * 100)}% avg engagement.`
    );
  }

  // Hour insights
  if (data.bestHours.length > 0) {
    insights.push(
      `Best posting hours: ${data.bestHours
        .slice(0, 3)
        .map((h: any) => h.hour)
        .join(", ")}`
    );
  }

  // Content type insights
  if (data.contentTypes.length > 0) {
    const bestType = data.contentTypes[0];
    insights.push(
      `**${bestType.type.charAt(0).toUpperCase() + bestType.type.slice(1)}** content gets ${Math.round((bestType.avgEngagement / data.overall.avgEngagement - 1) * 100)}% more engagement.`
    );
  }

  // Hashtag insights
  if (data.hashtags.length > 0) {
    insights.push(
      `Top performing hashtag: **${data.hashtags[0].tag}** (${data.hashtags[0].count} uses)`
    );
  }

  // Keyword insights
  if (data.keywords.length > 0) {
    insights.push(
      `Popular themes: ${data.keywords
        .slice(0, 3)
        .map((k: any) => `"${k.keyword}"`)
        .join(", ")}`
    );
  }

  return insights;
}
