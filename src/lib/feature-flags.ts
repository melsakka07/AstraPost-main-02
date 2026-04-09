import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { featureFlags } from "@/lib/schema";

// ── In-memory cache (60-second TTL) ──────────────────────────────────────────

const cache = new Map<string, { enabled: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

/**
 * Check if a feature flag is enabled.
 * Results are cached in-memory for 60 seconds per key.
 * Returns false when the flag does not exist or DB is unavailable.
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.enabled;
  }

  try {
    const [flag] = await db
      .select({ enabled: featureFlags.enabled })
      .from(featureFlags)
      .where(eq(featureFlags.key, key))
      .limit(1);

    const enabled = flag?.enabled ?? false;
    cache.set(key, { enabled, expiresAt: now + CACHE_TTL_MS });
    return enabled;
  } catch {
    // Fail open — do not block features if DB is momentarily unavailable
    return false;
  }
}

/**
 * Invalidate the in-memory cache for a specific key.
 * Call this after toggling a flag via the admin API.
 */
export function invalidateFeatureFlag(key: string): void {
  cache.delete(key);
}

// ── Default flags ─────────────────────────────────────────────────────────────

export const DEFAULT_FLAGS: Array<{ key: string; description: string; enabled: boolean }> = [
  {
    key: "ai_image_generation",
    description: "AI image generation via Replicate API",
    enabled: true,
  },
  {
    key: "instagram_publishing",
    description: "Instagram post publishing (coming soon)",
    enabled: false,
  },
  {
    key: "linkedin_publishing",
    description: "LinkedIn post publishing (coming soon)",
    enabled: false,
  },
  {
    key: "referral_program",
    description: "User referral program with reward credits",
    enabled: false,
  },
  {
    key: "team_collaboration",
    description: "Team workspaces and multi-user collaboration",
    enabled: true,
  },
  { key: "promo_codes", description: "Promo code entry at checkout", enabled: true },
];
