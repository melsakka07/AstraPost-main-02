import type { XSubscriptionTier } from "@/lib/schemas/common";

/**
 * Determines if the given subscription tier allows long-form posts (25,000 characters).
 *
 * - Basic, Premium, and PremiumPlus tiers support long posts
 * - None (free) tier is limited to 280 characters
 *
 * @param tier - The user's X subscription tier, or null/undefined
 * @returns true if the tier supports long posts, false otherwise
 */
export function canPostLongContent(tier: XSubscriptionTier | null | undefined): boolean {
  return tier === "Basic" || tier === "Premium" || tier === "PremiumPlus";
}

/**
 * Returns the maximum character limit for posts based on the subscription tier.
 *
 * - Basic, Premium, PremiumPlus: 25,000 characters
 * - None (free) or null: 280 characters
 *
 * @param tier - The user's X subscription tier, or null/undefined
 * @returns The maximum character limit (25,000 or 280)
 */
export function getMaxCharacterLimit(tier: XSubscriptionTier | null | undefined): number {
  return canPostLongContent(tier) ? 25_000 : 280;
}

/**
 * Returns a human-readable label for the subscription tier.
 *
 * @param tier - The user's X subscription tier, or null/undefined
 * @returns A display label for the tier
 */
export function getTierLabel(tier: XSubscriptionTier | null | undefined): string {
  switch (tier) {
    case "Basic":
      return "X Basic";
    case "Premium":
      return "X Premium";
    case "PremiumPlus":
      return "X Premium+";
    case "None":
    case null:
    case undefined:
    default:
      return "Free X account";
  }
}
