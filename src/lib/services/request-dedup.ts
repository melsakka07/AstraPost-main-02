import { createHash } from "crypto";
import { connection as redis } from "@/lib/queue/client";

/**
 * Deduplication service using Redis.
 *
 * Pattern: Before expensive operation, check if identical request is in-flight.
 * If so, return cached response. If not, execute operation and cache result.
 *
 * Use case: Prevent duplicate AI generations when user double-clicks.
 */
export class RequestDedup {
  private static readonly DEDUP_WINDOW_SECONDS = 60; // 60-second dedup window

  /**
   * Generate a deterministic hash of request for dedup key.
   * Hash = userId + endpoint + body hash
   */
  static generateKey(userId: string, endpoint: string, body: Record<string, unknown>): string {
    const bodyHash = createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 16);

    return `dedup:${userId}:${endpoint}:${bodyHash}`;
  }

  /**
   * Check if an identical request is already being processed.
   * Returns: cached result or null
   */
  static async check<T = any>(key: string): Promise<T | null> {
    const cached = await redis.get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Mark request as in-progress and cache result when complete.
   * Call after executing the expensive operation.
   */
  static async cache<T>(
    key: string,
    result: T,
    ttlSeconds: number = this.DEDUP_WINDOW_SECONDS
  ): Promise<void> {
    await redis.setex(key, ttlSeconds, JSON.stringify(result));
  }

  /**
   * Invalidate a dedup result (e.g., if operation failed and should retry).
   */
  static async invalidate(key: string): Promise<void> {
    await redis.del(key);
  }
}
