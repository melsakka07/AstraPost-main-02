import { eq } from "drizzle-orm";
import { cachedQuery, cache } from "@/lib/cache";
import { db } from "@/lib/db";
import { featureFlags } from "@/lib/schema";

/**
 * Check if a feature flag is enabled.
 * Results are cached in Redis for 10 minutes per key.
 * Returns false when the flag does not exist or DB is unavailable.
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  try {
    return await cachedQuery(
      `feature:${key}`,
      async () => {
        const [flag] = await db
          .select({ enabled: featureFlags.enabled })
          .from(featureFlags)
          .where(eq(featureFlags.key, key))
          .limit(1);
        return flag?.enabled ?? false;
      },
      10 * 60 // 10 minutes
    );
  } catch {
    // Fail open — do not block features if DB is momentarily unavailable
    return false;
  }
}

/**
 * Invalidate the Redis cache for a specific key.
 * Call this after toggling a flag via the admin API.
 */
export async function invalidateFeatureFlag(key: string): Promise<void> {
  await cache.delete(`feature:${key}`);
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
    enabled: true,
  },
  {
    key: "team_collaboration",
    description: "Team workspaces and multi-user collaboration",
    enabled: true,
  },
  { key: "promo_codes", description: "Promo code entry at checkout", enabled: true },
];
