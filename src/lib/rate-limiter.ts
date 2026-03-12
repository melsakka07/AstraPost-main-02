
import IORedis from "ioredis";

export const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");

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
  }
};

export async function checkRateLimit(
  userId: string,
  plan: string, // Relaxed type
  type: "ai" | "ai_image" | "posts" | "media" | "auth" | "tweet_lookup"
): Promise<{ success: boolean; reset: number; remaining: number }> {
  
  // Normalize plan
  let role: "free" | "pro" | "agency" = "free";
  if (plan && plan.startsWith("pro")) role = "pro";
  if (plan && plan.startsWith("agency")) role = "agency";

  const config = RATE_LIMITS[role][type];
  const key = `ratelimit:${type}:${userId}`;
  
  const results = await redis
    .multi()
    .incr(key)
    .expire(key, config.window, "NX") // Set expiry only if key doesn't exist
    .exec();

  if (!results) {
      console.error("Redis rate limit error");
      return { success: true, remaining: 1, reset: Date.now() + 1000 };
  }
    
  const count = results[0]?.[1] as number;
  
  return {
    success: count <= config.limit,
    remaining: Math.max(0, config.limit - count),
    reset: Date.now() + (config.window * 1000) 
  };
}
