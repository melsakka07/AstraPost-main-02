import "server-only";

// ============================================================================
// Redis-based idempotency for POST /api/ai/* routes.
//
// Prevents duplicate AI generations when a client retries the same request.
// Keys expire after 5 minutes (TTL = 300 s).
//
// Usage:
//   const idemKey = `${correlationId}`;
//   const cached = await checkIdempotency(userId, idemKey);
//   if (cached.cached) return cached.response;
//   // ... generate ...
//   await cacheIdempotentResponse(userId, idemKey, 200, body, headers);
// ============================================================================

import { connection } from "@/lib/queue/client";

const IDEMPOTENCY_PREFIX = "ai:idem:";
const TTL_SECONDS = 300;

interface CachedPayload {
  status: number;
  body: string;
  headers: Record<string, string>;
}

export async function checkIdempotency(
  userId: string,
  key: string
): Promise<{ cached: true; response: Response } | { cached: false }> {
  const redisKey = `${IDEMPOTENCY_PREFIX}${userId}:${key}`;
  const cached = await connection.get(redisKey);

  if (!cached) return { cached: false };

  try {
    const parsed = JSON.parse(cached) as CachedPayload;
    return {
      cached: true,
      response: new Response(parsed.body, {
        status: parsed.status,
        headers: parsed.headers,
      }),
    };
  } catch {
    return { cached: false };
  }
}

export async function cacheIdempotentResponse(
  userId: string,
  key: string,
  status: number,
  body: string,
  headers: Record<string, string>
): Promise<void> {
  const redisKey = `${IDEMPOTENCY_PREFIX}${userId}:${key}`;
  const payload: CachedPayload = { status, body, headers };
  await connection.setex(redisKey, TTL_SECONDS, JSON.stringify(payload));
}
