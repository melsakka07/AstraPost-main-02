/**
 * team-cookie.ts
 *
 * Provides tamper-proof team-context cookies by HMAC-SHA256-signing the
 * teamId value with BETTER_AUTH_SECRET.  The signature binds the teamId to
 * the current user's ID, so a signed cookie from user A cannot be replayed
 * as user B (even if exfiltrated).
 *
 * Cookie format:  <teamId>.<hmacHex>
 *
 * Absence of a valid cookie → server falls back to the personal workspace.
 * Invalid / tampered cookie → treated as absent, warning logged.
 */
import { createHmac, timingSafeEqual } from "crypto";

/** The HttpOnly cookie name used for team context. */
export const TEAM_COOKIE_NAME = "team-ctx";

/** Max-age for the signed team cookie (1 year, matches previous behaviour). */
export const TEAM_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// ── Internal helpers ──────────────────────────────────────────────────────

function getSecret(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not configured");
  return Buffer.from(secret, "utf8");
}

/** HMAC-SHA256 over the canonical `userId:teamId` message. */
function computeHmac(userId: string, teamId: string): string {
  return createHmac("sha256", getSecret()).update(`${userId}:${teamId}`).digest("hex");
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Returns a signed cookie value `${teamId}.${hmacHex}` bound to `userId`.
 * Only call this on the server (needs `BETTER_AUTH_SECRET`).
 */
export function signTeamCookie(userId: string, teamId: string): string {
  const mac = computeHmac(userId, teamId);
  return `${teamId}.${mac}`;
}

/**
 * Verifies a signed cookie value and returns the embedded teamId.
 * Returns `null` if the value is absent, malformed, or the signature is
 * invalid — callers should treat null as "use personal workspace".
 *
 * Uses `timingSafeEqual` to prevent timing-oracle attacks on the HMAC.
 */
export function verifyTeamCookie(cookieValue: string, userId: string): string | null {
  // Expect exactly one dot separator
  const dotIdx = cookieValue.indexOf(".");
  if (dotIdx === -1) return null;

  const teamId = cookieValue.slice(0, dotIdx);
  const receivedMac = cookieValue.slice(dotIdx + 1);

  if (!teamId || !receivedMac) return null;

  const expectedMac = computeHmac(userId, teamId);

  try {
    // Decode both as hex buffers — if receivedMac is not valid hex, from() produces
    // a zero-length buffer which will fail the length check below.
    const receivedBuf = Buffer.from(receivedMac, "hex");
    const expectedBuf = Buffer.from(expectedMac, "hex");

    // Length check must come first; timingSafeEqual throws on mismatched lengths
    if (receivedBuf.length === 0 || receivedBuf.length !== expectedBuf.length) {
      return null;
    }

    if (!timingSafeEqual(receivedBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  return teamId;
}
