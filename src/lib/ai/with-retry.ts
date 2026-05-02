// ============================================================================
// Exponential-backoff retry helper for AI model calls.
//
// Usage:
//   const result = await withRetry(() => generateObject({ model, ... }));
//
// Defaults: 2 tries, 250 ms base delay (250 ms on first retry).
// ============================================================================

import { logger } from "@/lib/logger";

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { tries?: number; baseMs?: number } = {}
): Promise<T> {
  const { tries = 2, baseMs = 250 } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < tries - 1) {
        const delay = baseMs * Math.pow(2, attempt);
        logger.warn("AI call failed, retrying", {
          attempt: attempt + 1,
          maxTries: tries,
          delayMs: delay,
          error: String(error),
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
