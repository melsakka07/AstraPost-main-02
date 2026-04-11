import { headers } from "next/headers";
import { checkIpRateLimit } from "@/lib/rate-limiter";

/**
 * Admin API rate limit configuration.
 *
 * All admin endpoints are IP-rate-limited (admin sessions share a machine).
 * Destructive operations get tighter limits to limit blast radius.
 */
const ADMIN_RATE_LIMITS = {
  /** Read-only endpoints (GET) — 120 requests per minute */
  read: { limit: 120, windowSec: 60 },
  /** Write endpoints (POST/PATCH/PUT) — 30 requests per minute */
  write: { limit: 30, windowSec: 60 },
  /** Destructive endpoints (DELETE, ban, impersonate) — 10 requests per minute */
  destructive: { limit: 10, windowSec: 60 },
} as const;

export type AdminRateLimitTier = keyof typeof ADMIN_RATE_LIMITS;

/**
 * Checks admin rate limit for the current request IP.
 *
 * Uses IP-based limiting since admin sessions share a machine.
 * Returns null if the request is allowed, or a 429 Response if rate-limited.
 *
 * @example
 *   const rl = await checkAdminRateLimit("read");
 *   if (rl) return rl;
 */
export async function checkAdminRateLimit(tier: AdminRateLimitTier): Promise<Response | null> {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "unknown";

  const config = ADMIN_RATE_LIMITS[tier];
  const result = await checkIpRateLimit(ip, `admin:${tier}`, config.limit, config.windowSec);

  // null = Redis unavailable → fail open for admin
  if (result === null) return null;

  if (result.limited) {
    const retryAfter = result.retryAfter ?? config.windowSec;
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
      },
    });
  }

  return null;
}

/**
 * Returns the appropriate rate limit tier for an HTTP method.
 */
export function getAdminRateLimitTier(method: string): AdminRateLimitTier {
  if (method === "GET") return "read";
  if (method === "DELETE") return "destructive";
  // POST/PATCH/PUT → write by default
  return "write";
}
