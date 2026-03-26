import IORedis from "ioredis";

/**
 * Lightweight Redis client for billing-specific caching (e.g. the sync-failsafe
 * cache in GET /api/billing/status). Kept separate from the BullMQ connection
 * so it can use a short command timeout — we never want a Redis hiccup to block
 * a billing status response.
 *
 * Returns null when REDIS_URL is not configured so callers can safely skip
 * the cache path in environments without Redis (e.g. some CI setups).
 */

let _client: IORedis | null = null;

export function getBillingRedis(): IORedis | null {
  if (!process.env.REDIS_URL) return null;
  if (_client) return _client;

  _client = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    commandTimeout: 2000,
    enableOfflineQueue: false,
    lazyConnect: false,
  });

  // Suppress unhandled-rejection noise — callers already use .catch(() => null).
  _client.on("error", (err: Error) => {
    console.error("[billing-redis] connection error:", err.message);
  });

  return _client;
}
