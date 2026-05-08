import "server-only";

import { logger } from "@/lib/logger";
import { redis } from "@/lib/rate-limiter";

// ── Constants ──────────────────────────────────────────────────────────────────

const CIRCUIT_PREFIX = "x:circuit:";

/** Number of consecutive permanent failures before the circuit opens. */
const DEFAULT_THRESHOLD = 5;

/** How long the circuit stays open before probing (milliseconds). */
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

// ── Helpers ────────────────────────────────────────────────────────────────────

function threshold(): number {
  const raw = process.env.X_CIRCUIT_THRESHOLD;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_THRESHOLD;
}

function timeoutMs(): number {
  const raw = process.env.X_CIRCUIT_TIMEOUT_MS;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_TIMEOUT_MS;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Check whether X API calls are allowed right now.
 *
 * Returns `{ allowed: false }` when the circuit is open (too many recent
 * failures).  Fails **open** when Redis is unavailable so a Redis outage
 * never blocks the worker from posting.
 */
export async function checkCircuit(): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const openKey = `${CIRCUIT_PREFIX}open`;
    const isOpen = await redis.get(openKey);
    if (isOpen) return { allowed: false, reason: "circuit_open" };
    return { allowed: true };
  } catch (err) {
    logger.warn("x_circuit_breaker_redis_unavailable", {
      error: err instanceof Error ? err.message : String(err),
      action: "failing_open",
    });
    return { allowed: true };
  }
}

/**
 * Record a permanent (non-retryable) failure against the circuit breaker.
 *
 * Once the failure count hits the threshold the circuit opens and
 * `checkCircuit()` starts returning `{ allowed: false }`.
 */
export async function recordPermanentFailure(): Promise<void> {
  const key = `${CIRCUIT_PREFIX}failures`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 10 * 60); // 10 min sliding window
    }
    if (count >= threshold()) {
      await redis.set(`${CIRCUIT_PREFIX}open`, "1", "EX", Math.ceil(timeoutMs() / 1000));
      logger.error("x_circuit_breaker_opened", {
        consecutiveFailures: count,
        threshold: threshold(),
        timeoutMs: timeoutMs(),
      });
    }
  } catch {
    // Swallow — circuit breaker failure must not cascade
  }
}

/**
 * Record a successful X API call.  If the circuit was open this moves it
 * back to closed so future calls proceed normally.
 */
export async function recordSuccess(): Promise<void> {
  try {
    const wasOpen = await redis.get(`${CIRCUIT_PREFIX}open`);
    if (wasOpen) {
      await redis.del(`${CIRCUIT_PREFIX}open`);
      await redis.del(`${CIRCUIT_PREFIX}failures`);
      logger.info("x_circuit_breaker_closed");
    } else {
      // Reset the failure window on any success so a single transient
      // burst doesn't prematurely open the circuit later.
      await redis.del(`${CIRCUIT_PREFIX}failures`);
    }
  } catch {
    // Swallow
  }
}
