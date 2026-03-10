
import IORedis from "ioredis";

export const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");

// Limits per user role
export const RATE_LIMITS = {
  free: {
    ai: { limit: 20, window: 3600 }, // 20 per hour
    posts: { limit: 100, window: 3600 },
    media: { limit: 20, window: 3600 },
    auth: { limit: 5, window: 900 }, // 5 per 15 mins
  },
  pro: {
    ai: { limit: 200, window: 3600 },
    posts: { limit: 500, window: 3600 },
    media: { limit: 100, window: 3600 },
    auth: { limit: 20, window: 900 },
  },
  agency: {
    ai: { limit: 1000, window: 3600 },
    posts: { limit: 2000, window: 3600 },
    media: { limit: 500, window: 3600 },
    auth: { limit: 50, window: 900 },
  }
};

export async function checkRateLimit(
  userId: string, 
  plan: string, // Relaxed type
  type: "ai" | "posts" | "media" | "auth"
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
