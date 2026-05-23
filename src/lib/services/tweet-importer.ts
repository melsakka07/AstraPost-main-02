/**
 * Tweet Importer Service
 * Imports tweets from X/Twitter URLs with full context retrieval
 */

import { logger } from "@/lib/logger";
import { redis } from "@/lib/rate-limiter";

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface TweetAuthor {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  verified: boolean;
}

export interface TweetMetrics {
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
}

export interface TweetMedia {
  type: "image" | "video" | "gif";
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

export interface Tweet {
  id: string;
  text: string;
  author: TweetAuthor;
  createdAt: Date;
  media: TweetMedia[];
  metrics: TweetMetrics;
}

export interface ImportedTweetContext {
  originalTweet: Tweet;
  parentTweets: Tweet[];
  topReplies: Tweet[];
  quotedTweet?: Tweet;
  conversationId: string;
}

export interface TweetLookupError {
  error: string;
  code: "TWEET_NOT_FOUND" | "PRIVATE_ACCOUNT" | "SUSPENDED_ACCOUNT" | "RATE_LIMITED" | "UNKNOWN";
}

// ============================================================================
// URL Parsing
// ============================================================================

/**
 * Extract tweet ID from various X/Twitter URL formats
 */
export function extractTweetId(url: string): string | null {
  const patterns = [
    /twitter\.com\/[\w]+\/status\/(\d+)/i,
    /x\.com\/[\w]+\/status\/(\d+)/i,
    /x\.com\/i\/web\/status\/(\d+)/i,
    /mobile\.twitter\.com\/[\w]+\/status\/(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Validate that a URL is a valid X/Twitter tweet URL
 */
export function isValidTweetUrl(url: string): boolean {
  return extractTweetId(url) !== null;
}

// ============================================================================
// Twitter Syndication Integration
// ============================================================================
// X API v2 lookup requires a paid Basic tier ($200/mo) and returns 402 on Free.
// We use the public syndication endpoint (same one Vercel's react-tweet uses):
// public, free, no auth. Trade-off: public metrics and conversation context
// are not available, so they degrade to zeros / empty arrays.

const SYNDICATION_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function syndicationToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

async function fetchTweetFromSyndication(tweetId: string): Promise<Tweet | null> {
  const token = syndicationToken(tweetId);
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${encodeURIComponent(tweetId)}&token=${encodeURIComponent(token)}&lang=en`;

  const response = await fetch(url, {
    headers: { "User-Agent": SYNDICATION_UA, Accept: "application/json" },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    if (response.status === 403) throw new Error("Private or protected account");
    if (response.status === 429) throw new Error("Rate limited by Twitter syndication");
    throw new Error(`Twitter syndication error: ${response.status}`);
  }

  const data = await response.json();
  if (!data || data.__typename === "TweetTombstone") return null;

  return parseSyndicationTweet(data);
}

function parseSyndicationTweet(raw: any): Tweet | null {
  if (!raw || !raw.id_str || !raw.user) return null;

  const u = raw.user;
  const author: TweetAuthor = {
    id: u.id_str,
    name: u.name,
    username: u.screen_name,
    avatarUrl: u.profile_image_url_https,
    verified: Boolean(u.verified || u.is_blue_verified),
  };

  const tweetMedia: TweetMedia[] = [];
  const mediaDetails = Array.isArray(raw.mediaDetails) ? raw.mediaDetails : [];
  for (const m of mediaDetails) {
    let bestUrl: string = m.media_url_https;
    const kind: "image" | "video" | "gif" =
      m.type === "video" ? "video" : m.type === "animated_gif" ? "gif" : "image";

    if ((m.type === "video" || m.type === "animated_gif") && m.video_info?.variants) {
      const mp4 = m.video_info.variants.filter((v: any) => v.content_type === "video/mp4");
      if (mp4.length > 0) {
        mp4.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
        bestUrl = mp4[0].url;
      }
    }

    tweetMedia.push({
      type: kind,
      url: bestUrl,
      thumbnailUrl: m.media_url_https,
      width: m.original_info?.width,
      height: m.original_info?.height,
    });
  }

  return {
    id: raw.id_str,
    text: raw.text ?? "",
    author,
    createdAt: new Date(raw.created_at),
    media: tweetMedia,
    metrics: { likes: 0, retweets: 0, replies: 0, impressions: 0 },
  };
}

/**
 * Check cache for previously fetched tweet
 */
async function getCachedTweet(tweetId: string): Promise<ImportedTweetContext | null> {
  try {
    const cached = await redis.get(`tweet_lookup:${tweetId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    logger.warn("tweet_cache_get_failed", { error: e instanceof Error ? e.message : String(e) });
  }
  return null;
}

/**
 * Cache fetched tweet data
 */
async function setCachedTweet(tweetId: string, data: ImportedTweetContext): Promise<void> {
  try {
    // Cache for 1 hour
    await redis.setex(`tweet_lookup:${tweetId}`, 3600, JSON.stringify(data));
  } catch (e) {
    logger.warn("tweet_cache_set_failed", { error: e instanceof Error ? e.message : String(e) });
  }
}

// ============================================================================
// Main Import Function
// ============================================================================

/**
 * Import a tweet from URL with full context
 */
export async function importTweet(
  tweetUrl: string
): Promise<ImportedTweetContext | TweetLookupError> {
  // Extract tweet ID
  const tweetId = extractTweetId(tweetUrl);
  if (!tweetId) {
    return {
      error: "Invalid tweet URL format",
      code: "UNKNOWN",
    };
  }

  // Check cache first
  const cached = await getCachedTweet(tweetId);
  if (cached) {
    return cached;
  }

  try {
    const tweet = await fetchTweetFromSyndication(tweetId);

    if (!tweet) {
      return {
        error: "Tweet not found or private account",
        code: "TWEET_NOT_FOUND",
      };
    }

    const result: ImportedTweetContext = {
      originalTweet: tweet,
      parentTweets: [],
      topReplies: [],
      conversationId: tweet.id,
    };

    // Cache the result
    await setCachedTweet(tweetId, result);

    return result;
  } catch (error) {
    logger.error("tweet_import_failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof Error) {
      if (error.message.includes("Rate limited")) {
        return {
          error: "Rate limited by X API. Please try again later.",
          code: "RATE_LIMITED",
        };
      }
      if (error.message.includes("Private or protected")) {
        return {
          error: "This tweet is from a private or protected account.",
          code: "PRIVATE_ACCOUNT",
        };
      }
    }

    return {
      error: "Failed to import tweet. Please try again.",
      code: "UNKNOWN",
    };
  }
}

/**
 * Import multiple tweets (for future use)
 */
export async function importTweets(
  tweetUrls: string[]
): Promise<Map<string, ImportedTweetContext | TweetLookupError>> {
  const results = new Map<string, ImportedTweetContext | TweetLookupError>();

  // Import tweets in parallel (limit to 5 at a time)
  const chunks = [];
  for (let i = 0; i < tweetUrls.length; i += 5) {
    chunks.push(tweetUrls.slice(i, i + 5));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(async (url) => {
        const result = await importTweet(url);
        return { url, result };
      })
    );

    for (const { url, result } of chunkResults) {
      results.set(url, result);
    }
  }

  return results;
}
