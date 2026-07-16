import "server-only";

import type { XSubscriptionTier } from "@/lib/schemas/common";
import { canPostLongContent } from "@/lib/services/x-subscription";

/**
 * Smart default tweet count based on content length and tier.
 *
 * - Free: fills 280-char tweets, capped at 15
 * - Premium: aims for readable ~1,500-char tweets, min 3, max 15
 *
 * @param contentLength - Length of the source content in characters.
 * @param tier - The user's X subscription tier, or null/undefined.
 * @returns A sensible default tweet count clamped to [3, 15] for Premium
 *          or [1, 15] for Free.
 */
export function defaultTweetCount(
  contentLength: number,
  tier: XSubscriptionTier | null | undefined
): number {
  if (!canPostLongContent(tier)) {
    return Math.min(15, Math.ceil(contentLength / 280));
  }
  return Math.min(15, Math.max(3, Math.ceil(contentLength / 1_500)));
}
