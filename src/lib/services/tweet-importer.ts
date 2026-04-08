/**
 * Tweet Importer Service
 * Imports tweets from X/Twitter URLs with full context retrieval
 */

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
// X API v2 Integration
// ============================================================================

/**
 * Get X API bearer token from environment
 */
function getXApiToken(): string {
  const token = process.env.TWITTER_BEARER_TOKEN || process.env.X_API_TOKEN;
  if (!token) {
    throw new Error(
      "Twitter/X API Bearer Token not configured. " +
      "Please set TWITTER_BEARER_TOKEN in your .env file. " +
      "Get it from: https://developer.twitter.com/en/portal/dashboard -> Your App -> Keys and Tokens -> Bearer Token"
    );
  }
  return token;
}

/**
 * Fetch a single tweet by ID using X API v2
 */
async function fetchTweet(tweetId: string): Promise<Tweet | null> {
  const token = getXApiToken();
  const url = `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=created_at,public_metrics,conversation_id,entities,attachments,author_id&expansions=author_id,attachments.media_keys,referenced_tweets.id&user.fields=verified,profile_image_url&media.fields=url,width,height,preview_image_url,type,variants`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    if (response.status === 429) {
      throw new Error("Rate limited by X API");
    }
    throw new Error(`X API error: ${response.status}`);
  }

  const data = await response.json();
  return parseTweetResponse(data);
}

/**
 * Parse X API v2 response into Tweet object
 */
function parseTweetResponse(data: any): Tweet | null {
  const tweetData = data.data;
  if (!tweetData) return null;

  const includes = data.includes || {};
  const users = includes.users || [];
  const media = includes.media || [];

  const authorData = users.find((u: any) => u.id === tweetData.author_id);
  if (!authorData) return null;

  const author: TweetAuthor = {
    id: authorData.id,
    name: authorData.name,
    username: authorData.username,
    avatarUrl: authorData.profile_image_url,
    verified: authorData.verified || false,
  };

  const tweetMedia: TweetMedia[] = [];
  if (tweetData.attachments?.media_keys) {
    for (const mediaKey of tweetData.attachments.media_keys) {
      const mediaData = media.find((m: any) => m.media_key === mediaKey);
      if (mediaData) {
        let bestUrl = mediaData.url || mediaData.preview_image_url;

        // For videos/gifs, try to find the best mp4 variant
        if ((mediaData.type === "video" || mediaData.type === "animated_gif") && mediaData.variants) {
          const mp4Variants = mediaData.variants.filter((v: any) => v.content_type === "video/mp4");
          if (mp4Variants.length > 0) {
            // Sort by highest bitrate first
            mp4Variants.sort((a: any, b: any) => (b.bit_rate || 0) - (a.bit_rate || 0));
            bestUrl = mp4Variants[0].url;
          }
        }

        tweetMedia.push({
          type: mediaData.type,
          url: bestUrl,
          thumbnailUrl: mediaData.preview_image_url,
          width: mediaData.width,
          height: mediaData.height,
        });
      }
    }
  }

  const metrics: TweetMetrics = {
    likes: tweetData.public_metrics?.like_count || 0,
    retweets: tweetData.public_metrics?.retweet_count || 0,
    replies: tweetData.public_metrics?.reply_count || 0,
    impressions: tweetData.public_metrics?.impression_count || 0,
  };

  return {
    id: tweetData.id,
    text: tweetData.text,
    author,
    createdAt: new Date(tweetData.created_at),
    media: tweetMedia,
    metrics,
  };
}

/**
 * Fetch conversation context (parent tweets and replies)
 */
async function fetchConversationContext(
  conversationId: string,
  originalTweetId: string
): Promise<{ parentTweets: Tweet[]; topReplies: Tweet[] }> {
  const token = getXApiToken();

  // Fetch conversation timeline
  const url = `https://api.twitter.com/2/tweets/search/recent?query=conversation_id:${conversationId}&max_results=20&tweet.fields=created_at,public_metrics,conversation_id,in_reply_to_user_id,author_id,entities&expansions=author_id&user.fields=verified,profile_image_url`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    // If context fetch fails, return empty arrays
    console.warn("Failed to fetch conversation context");
    return { parentTweets: [], topReplies: [] };
  }

  const data = await response.json();
  const tweets = data.data || [];
  const includes = data.includes || {};
  const users = includes.users || [];

  // Parse all tweets
  const mappedTweets = tweets
    .filter((t: any) => t.id !== originalTweetId)
    .map((t: any) => {
      const authorData = users.find((u: any) => u.id === t.author_id);
      if (!authorData) return null;

      return {
        id: t.id,
        text: t.text,
        author: {
          id: authorData.id,
          name: authorData.name,
          username: authorData.username,
          avatarUrl: authorData.profile_image_url,
          verified: authorData.verified || false,
        },
        createdAt: new Date(t.created_at),
        media: [],
        metrics: {
          likes: t.public_metrics?.like_count || 0,
          retweets: t.public_metrics?.retweet_count || 0,
          replies: t.public_metrics?.reply_count || 0,
          impressions: t.public_metrics?.impression_count || 0,
        },
      };
    });

  const parsedTweets: Tweet[] = mappedTweets.filter((t: Tweet | null): t is Tweet => t !== null);

  // Separate into parents (in-reply-to) and replies
  const parentTweets: Tweet[] = [];
  const topReplies: Tweet[] = [];

  for (const tweet of parsedTweets) {
    // Check if this tweet is a reply to another tweet in the conversation
    const isInReplyTo = tweets.some((t: any) => t.id === tweet.id && t.in_reply_to_user_id);

    if (isInReplyTo && tweet.createdAt < new Date()) {
      // This is likely a parent tweet (older)
      parentTweets.push(tweet);
    } else {
      // This is a reply
      topReplies.push(tweet);
    }
  }

  // Sort parents by date descending (newest first)
  parentTweets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Sort replies by likes (most popular first)
  topReplies.sort((a, b) => b.metrics.likes - a.metrics.likes);

  // Limit results
  return {
    parentTweets: parentTweets.slice(0, 5),
    topReplies: topReplies.slice(0, 10),
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
    console.warn("Failed to get cached tweet:", e);
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
    console.warn("Failed to cache tweet:", e);
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
    // Fetch the tweet
    const tweet = await fetchTweet(tweetId);

    if (!tweet) {
      return {
        error: "Tweet not found or private account",
        code: "TWEET_NOT_FOUND",
      };
    }

    // Fetch conversation context
    const { parentTweets, topReplies } = await fetchConversationContext(
      tweet.id,
      tweet.id
    );

    const result: ImportedTweetContext = {
      originalTweet: tweet,
      parentTweets,
      topReplies,
      conversationId: tweet.id,
    };

    // Cache the result
    await setCachedTweet(tweetId, result);

    return result;
  } catch (error) {
    console.error("Tweet import error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Rate limited")) {
        return {
          error: "Rate limited by X API. Please try again later.",
          code: "RATE_LIMITED",
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
