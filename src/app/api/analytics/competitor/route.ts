import { headers } from "next/headers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  checkAiLimitDetailed,
  checkAiQuotaDetailed,
  checkCompetitorAnalyzerAccessDetailed,
  createPlanLimitResponse,
} from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";
import { recordAiUsage } from "@/lib/services/ai-quota";

const requestSchema = z.object({
  username: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[A-Za-z0-9_]+$/, "Invalid X username"),
  language: z.enum(["ar", "en", "fr", "de", "es", "it", "pt", "tr", "ru", "hi"]).default("en"),
});

const analysisSchema = z.object({
  topTopics: z.array(z.string()),
  postingFrequency: z.string(),
  preferredContentTypes: z.array(z.string()),
  toneProfile: z.string(),
  topHashtags: z.array(z.string()),
  bestPostingTimes: z.string(),
  keyStrengths: z.array(z.string()),
  differentiationOpportunities: z.array(z.string()),
  summary: z.string(),
});

interface TwitterApiTweet {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    impression_count: number;
  };
}

type TwitterFetchResult =
  | {
      ok: true;
      tweets: TwitterApiTweet[];
      user: {
        name: string;
        username: string;
        public_metrics?: { tweet_count: number; followers_count: number };
      };
    }
  | { ok: false; status: number; message: string };

async function fetchUserTweets(username: string): Promise<TwitterFetchResult> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) return { ok: false, status: 503, message: "Twitter API not configured" };

  // Look up user ID first
  const userRes = await fetch(
    `https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics`,
    {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!userRes.ok) {
    if (userRes.status === 429)
      return {
        ok: false,
        status: 429,
        message: "Twitter API rate limit reached. Please wait a few minutes and try again.",
      };
    if (userRes.status === 401)
      return {
        ok: false,
        status: 503,
        message: "Twitter API authentication failed. Please check TWITTER_BEARER_TOKEN.",
      };
    if (userRes.status === 404)
      return {
        ok: false,
        status: 404,
        message: `Account @${username} not found. Please check the username.`,
      };
    return {
      ok: false,
      status: 422,
      message: `Could not look up @${username}. The account may be private or suspended.`,
    };
  }

  const userData = (await userRes.json()) as {
    data?: {
      id: string;
      name: string;
      username: string;
      public_metrics?: { tweet_count: number; followers_count: number };
    };
  };
  if (!userData.data) return { ok: false, status: 404, message: `Account @${username} not found.` };

  const userId = userData.data.id;

  // Fetch recent tweets
  const tweetsRes = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=100&tweet.fields=created_at,public_metrics&exclude=retweets,replies`,
    {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!tweetsRes.ok) {
    if (tweetsRes.status === 429)
      return {
        ok: false,
        status: 429,
        message: "Twitter API rate limit reached. Please wait a few minutes and try again.",
      };
    return { ok: false, status: 422, message: `Could not fetch tweets for @${username}.` };
  }

  const tweetsData = (await tweetsRes.json()) as { data?: TwitterApiTweet[] };
  return { ok: true, tweets: tweetsData.data ?? [], user: userData.data };
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return new Response("Unauthorized", { status: 401 });

    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { plan: true },
    });

    const rlResult = await checkRateLimit(session.user.id, dbUser?.plan || "free", "ai");
    if (!rlResult.success) return createRateLimitResponse(rlResult);

    const access = await checkCompetitorAnalyzerAccessDetailed(session.user.id);
    if (!access.allowed) return createPlanLimitResponse(access);

    const aiAccess = await checkAiLimitDetailed(session.user.id);
    if (!aiAccess.allowed) return createPlanLimitResponse(aiAccess);

    const aiQuota = await checkAiQuotaDetailed(session.user.id);
    if (!aiQuota.allowed) return createPlanLimitResponse(aiQuota);

    const json = await req.json();
    const result = requestSchema.safeParse(json);
    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: result.error }), {
        status: 400,
      });
    }

    const { username, language } = result.data;

    const twitterData = await fetchUserTweets(username);
    if (!twitterData.ok) {
      return new Response(JSON.stringify({ error: twitterData.message }), {
        status: twitterData.status,
      });
    }
    if (twitterData.tweets.length === 0) {
      return new Response(
        JSON.stringify({ error: `@${username} has no public tweets to analyze.` }),
        { status: 422 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500 });
    }

    // Build tweet digest (limit text to keep prompt manageable)
    const tweetDigest = twitterData.tweets
      .slice(0, 50)
      .map(
        (t, i) =>
          `[${i + 1}] ${t.text.slice(0, 200)} (likes:${t.public_metrics?.like_count ?? 0}, rt:${t.public_metrics?.retweet_count ?? 0})`
      )
      .join("\n");

    const openrouter = createOpenRouter({ apiKey });
    const model = openrouter(process.env.OPENROUTER_MODEL!);

    const prompt = `You are a social media strategist. Analyze the following ${twitterData.tweets.length} tweets from @${username} and provide a comprehensive competitor analysis.
Output language: ${language === "ar" ? "Arabic" : "English"}.

TWEETS:
${tweetDigest}

Based on these tweets, analyze:
- topTopics: main subjects/themes they tweet about (up to 10)
- postingFrequency: estimated posts per week based on tweet count
- preferredContentTypes: content formats used (threads, questions, quotes, statistics, tips, etc.)
- toneProfile: overall tone description (2-3 sentences)
- topHashtags: most frequently used hashtags (up to 10)
- bestPostingTimes: patterns in when they post (days/times if detectable)
- keyStrengths: what they do well (up to 5 points)
- differentiationOpportunities: gaps or angles you could use to stand out (up to 5 points)
- summary: concise 3-4 sentence strategic overview`;

    const { object, usage } = await generateObject({
      model,
      schema: analysisSchema,
      prompt,
    });

    await recordAiUsage(
      session.user.id,
      "competitor_analyzer",
      usage?.totalTokens ?? 0,
      prompt,
      object,
      language
    );

    return Response.json({
      username,
      displayName: twitterData.user.name,
      followerCount: twitterData.user.public_metrics?.followers_count ?? 0,
      tweetCount: twitterData.tweets.length,
      analysis: object,
    });
  } catch (error) {
    console.error("Competitor analysis error:", error);
    return new Response(JSON.stringify({ error: "Failed to analyze competitor" }), {
      status: 500,
    });
  }
}
