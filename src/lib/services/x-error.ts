/**
 * Classifies token refresh / X API errors so callers can pick the right
 * response strategy instead of treating every failure as permanent.
 *
 * ## Classification
 * | HTTP / throw               | Result          | Meaning                        |
 * |-----------------------------|-----------------|--------------------------------|
 * | 401, X_SESSION_EXPIRED      | `"permanent"`   | Token revoked / expired        |
 * | 429, X_RATE_LIMITED         | `"rate_limited"`| X is throttling us             |
 * | 5xx, network (ECONN, ETIMEDOUT, DNS) | `"transient"` | Temporary infra issue |
 * | Everything else             | `null`          | Unknown — treat conservatively |
 *
 * ## Backoff strategy
 * - **permanent** → `"deactivate"` (account must be reconnected)
 * - **rate_limited** → 15 min × consecutive failures (cap 8x → 2 h)
 * - **transient** → exponential: 1m → 5m → 15m → 1h → 2h caps
 * - **null** → fallback to transient backoff from 1m
 */

export type TokenRefreshError = "permanent" | "transient" | "rate_limited";

/**
 * Classify a caught error from the X API or token refresh into a broad
 * category so callers know whether to deactivate, back off, or retry soon.
 */
export function classifyRefreshError(error: unknown): TokenRefreshError | null {
  const code = (error as Record<string, unknown>)?.code as number | undefined;
  const message = error instanceof Error ? error.message : String(error);

  // Permanent: 401 means the token is revoked or expired irrecoverably
  if (code === 401 || message.includes("X_SESSION_EXPIRED")) return "permanent";

  // Rate limited by X
  if (code === 429 || message.includes("X_RATE_LIMITED")) return "rate_limited";

  // Transient: server-side or network issues
  if (code !== undefined && code >= 500 && code < 600) return "transient";
  if (/fetch failed|ECONN|ETIMEDOUT|ENOTFOUND|ECONNRESET|ENETUNREACH/i.test(message))
    return "transient";

  return null;
}

/**
 * Returns the delay in milliseconds before the next retry, or `"deactivate"`
 * when the token is permanently invalid.
 */
export function getBackoffForFailures(
  failureType: TokenRefreshError | null,
  consecutiveFailures: number
): number | "deactivate" {
  if (failureType === "permanent") return "deactivate";

  const count = Math.max(1, consecutiveFailures);

  if (failureType === "rate_limited") {
    // Start at 15 min, double each subsequent failure, cap at ~2 hours
    const baseMs = 15 * 60 * 1000;
    return baseMs * Math.min(count, 8);
  }

  // Transient (or unknown): exponential 1m → 5m → 15m → 1h → 2h (cap)
  const delays = [60_000, 300_000, 900_000, 3_600_000, 7_200_000];
  return delays[Math.min(count - 1, delays.length - 1)] ?? 7_200_000;
}
