// Re-use the shared BullMQ connection rather than opening a second pool.
// Two independent IORedis instances against the same server doubled the
// connection count and used inconsistent retry behaviour. The BullMQ
// connection already sets maxRetriesPerRequest: null which is correct for
// both queuing and rate-limit operations.
import { logger } from "@/lib/logger";
import { connection as redis } from "@/lib/queue/client";
export { redis };

// Limits per user role
export const RATE_LIMITS = {
  free: {
    ai: { limit: 20, window: 3600 }, // 20 per hour
    ai_image: { limit: 10, window: 60 }, // 10 per minute
    posts: { limit: 100, window: 3600 },
    media: { limit: 20, window: 3600 },
    auth: { limit: 5, window: 900 }, // 5 per 15 mins
    tweet_lookup: { limit: 20, window: 3600 }, // 20 per hour
  },
  pro: {
    ai: { limit: 200, window: 3600 },
    ai_image: { limit: 30, window: 60 }, // 30 per minute
    posts: { limit: 500, window: 3600 },
    media: { limit: 100, window: 3600 },
    auth: { limit: 20, window: 900 },
    tweet_lookup: { limit: 100, window: 3600 }, // 100 per hour
  },
  agency: {
    ai: { limit: 1000, window: 3600 },
    ai_image: { limit: 60, window: 60 }, // 60 per minute
    posts: { limit: 2000, window: 3600 },
    media: { limit: 500, window: 3600 },
    auth: { limit: 50, window: 900 },
    tweet_lookup: { limit: 200, window: 3600 }, // 200 per hour
  },
};

/**
 * Endpoint types that incur direct API costs (OpenRouter, Replicate, Gemini).
 * These fail CLOSED when Redis is unavailable — better to return 503 than to
 * allow unbounded API charges during a Redis outage or targeted attack.
 *
 * Low-cost endpoints (posts, media) fail OPEN so users aren't blocked from
 * core scheduling functionality during a Redis outage.
 */
const COST_SENSITIVE_TYPES = new Set<string>(["ai", "ai_image", "tweet_lookup"]);

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
  /**
   * True when the rate-limit check failed due to a Redis connectivity error
   * rather than the user actually exceeding their quota.  Callers should
   * surface this as 503 Service Unavailable rather than 429 Too Many Requests
   * so monitoring tools can distinguish outage traffic from abuse traffic.
   */
  serviceError: boolean;
};

export async function checkRateLimit(
  userId: string,
  plan: string, // Relaxed type — normalised internally
  type: "ai" | "ai_image" | "posts" | "media" | "auth" | "tweet_lookup"
): Promise<RateLimitResult> {
  // Normalize plan
  let role: "free" | "pro" | "agency" = "free";
  if (plan && plan.startsWith("pro")) role = "pro";
  if (plan && plan.startsWith("agency")) role = "agency";

  const config = RATE_LIMITS[role][type];
  const key = `ratelimit:${type}:${userId}`;

  let results: [Error | null, unknown][] | null = null;
  try {
    results = await redis
      .multi()
      .incr(key)
      .expire(key, config.window, "NX") // Set expiry only if key doesn't exist
      .exec();
  } catch (err) {
    logger.error("rate_limit_redis_error", { type, userId, error: err });
    results = null;
  }

  if (results === null) {
    if (COST_SENSITIVE_TYPES.has(type)) {
      // Fail CLOSED on AI/cost endpoints — caller must return 503, not 429
      logger.error("rate_limit_redis_failure_cost_sensitive", { type, userId });
      return { success: false, remaining: 0, reset: Date.now() + 60_000, serviceError: true };
    }
    // Fail OPEN on low-cost endpoints (posts, media, auth)
    return { success: true, remaining: 1, reset: Date.now() + 1000, serviceError: false };
  }

  const count = results[0]?.[1] as number;

  return {
    success: count <= config.limit,
    remaining: Math.max(0, config.limit - count),
    reset: Date.now() + config.window * 1000,
    serviceError: false,
  };
}

/**
 * Builds the correct HTTP error response for a failed rate-limit check.
 *
 * - 503 Service Unavailable when `serviceError === true` (Redis is down and
 *   this is a cost-sensitive endpoint — the user has not exceeded their quota)
 * - 429 Too Many Requests otherwise (user has genuinely hit their limit)
 *
 * Always sets the `Retry-After` header so clients can back off correctly.
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));

  if (result.serviceError) {
    return new Response(
      JSON.stringify({ error: "Service temporarily unavailable. Please try again shortly." }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": retryAfter.toString(),
        },
      }
    );
  }

  return new Response(JSON.stringify({ error: "Too many requests", retryAfter }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": retryAfter.toString(),
    },
  });
}

/**
 * Builds a 429 response from the result of `checkIpRateLimit`.
 * Mirrors `createRateLimitResponse` for the IP-based limiter shape.
 */
export function createIpRateLimitResponse(retryAfter: number): Response {
  return new Response(JSON.stringify({ error: "Too many requests", retryAfter }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": retryAfter.toString(),
    },
  });
}

/**
 * IP-based rate limiter for low-cost endpoints (billing, auth).
 * Uses the shared BullMQ Redis connection.
 *
 * Returns null when Redis is unavailable (fail-open).
 * Returns { limited: true, retryAfter } when the limit is exceeded.
 * Returns { limited: false } when the request is allowed.
 */
export async function checkIpRateLimit(
  ip: string,
  key: string,
  limit: number,
  windowSec: number
): Promise<{ limited: boolean; retryAfter?: number } | null> {
  try {
    const fullKey = `rl:ip:${key}:${ip}`;
    const results = await redis.multi().incr(fullKey).expire(fullKey, windowSec, "NX").exec();

    const count = (results?.[0]?.[1] as number) ?? 0;
    if (count > limit) {
      return { limited: true, retryAfter: windowSec };
    }
    return { limited: false };
  } catch {
    // Fail open — don't block requests when Redis is down
    return null;
  }
}
