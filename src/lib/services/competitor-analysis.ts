import { wrapUntrusted } from "@/lib/ai/untrusted";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface TwitterApiTweet {
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

export type TwitterFetchResult =
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

// ============================================================================
// Twitter Data Fetching
// ============================================================================

/**
 * Fetches the most recent public tweets (up to 100) for the given X/Twitter
 * username using the Twitter v2 API bearer-token auth.
 *
 * Returns a discriminated union — callers must check `result.ok` and map the
 * `status` codes to appropriate HTTP responses.
 */
export async function fetchUserTweets(username: string): Promise<TwitterFetchResult> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    logger.warn("competitor_analysis_no_bearer_token", { username });
    return { ok: false, status: 503, message: "Twitter API not configured" };
  }

  // Look up user ID first
  const userRes = await fetch(
    `https://api.twitter.com/2/users/by/username/${username}?user.fields=public_metrics`,
    {
      headers: { Authorization: `Bearer ${bearerToken}` },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!userRes.ok) {
    if (userRes.status === 429) {
      return {
        ok: false,
        status: 429,
        message: "Twitter API rate limit reached. Please wait a few minutes and try again.",
      };
    }
    if (userRes.status === 401) {
      return {
        ok: false,
        status: 503,
        message: "Twitter API authentication failed. Please check TWITTER_BEARER_TOKEN.",
      };
    }
    if (userRes.status === 404) {
      return {
        ok: false,
        status: 404,
        message: `Account @${username} not found. Please check the username.`,
      };
    }
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
  if (!userData.data) {
    return { ok: false, status: 404, message: `Account @${username} not found.` };
  }

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
    if (tweetsRes.status === 429) {
      return {
        ok: false,
        status: 429,
        message: "Twitter API rate limit reached. Please wait a few minutes and try again.",
      };
    }
    return { ok: false, status: 422, message: `Could not fetch tweets for @${username}.` };
  }

  const tweetsData = (await tweetsRes.json()) as { data?: TwitterApiTweet[] };

  logger.info("competitor_tweets_fetched", {
    username,
    count: tweetsData.data?.length ?? 0,
  });

  return { ok: true, tweets: tweetsData.data ?? [], user: userData.data };
}

// ============================================================================
// Prompt Building
// ============================================================================

/**
 * Builds the analysis prompt string from a set of fetched tweets.
 * Limits to the first 50 tweets and truncates each to 200 characters to keep
 * the prompt within a manageable size.
 */
export function buildCompetitorAnalysisPrompt(
  username: string,
  tweets: TwitterApiTweet[],
  language: string
): string {
  const tweetDigest = tweets
    .slice(0, 50)
    .map(
      (t, i) =>
        `[${i + 1}] ${t.text.slice(0, 200)} (likes:${t.public_metrics?.like_count ?? 0}, rt:${t.public_metrics?.retweet_count ?? 0})`
    )
    .join("\n");

  return `You are a social media strategist. Analyze the following ${tweets.length} tweets from @${username} and provide a comprehensive competitor analysis.
Output language: ${language === "ar" ? "Arabic" : "English"}.
${wrapUntrusted("COMPETITOR TWEETS", tweetDigest, 30_000)}

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
}
