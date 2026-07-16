import twitter from "twitter-text";
import type { XSubscriptionTier } from "@/lib/schemas/common";
import { getMaxCharacterLimit, canPostLongContent } from "@/lib/services/x-subscription";

/**
 * Canonical tweet character-counting logic shared by the composer and every AI
 * surface that renders a tweet length/limit indicator.
 *
 * This module is the SINGLE source of truth for:
 *  - weighted length (X counts URLs/CJK/emoji differently than `String.length`)
 *  - the standard 280 limit and the tier-aware max (via `getMaxCharacterLimit`)
 *  - length-zone classification (short / medium / long) for premium single posts
 *  - over-limit color severity used to tint the counter
 *
 * Pure — no React, no DOM. Safe to import in node tests and on the server.
 */

/** X's standard per-tweet character limit for free accounts. */
export const STANDARD_TWEET_LIMIT = 280;

/** X Premium long-form character limit (via NoteTweet API). */
export const PREMIUM_TWEET_LIMIT = 25_000;

/** Upper bound of the "medium" length zone for premium single posts. */
export const MEDIUM_ZONE_LIMIT = 5_000;

/** Length zone for a premium single post, used to label/colour the counter. */
export type TweetLengthZone = "short" | "medium" | "long";

/** Severity of the counter relative to the active max — drives the counter colour. */
export type TweetCharSeverity = "ok" | "warning" | "over";

/**
 * Weighted character length as X computes it (URLs collapse to 23, CJK counts
 * double, etc.). Use this everywhere a tweet limit is enforced — never `.length`.
 */
export function getTweetWeightedLength(text: string): number {
  return twitter.parseTweet(text).weightedLength;
}

/**
 * The maximum character count allowed for a tweet in the given context.
 *
 * Free accounts: always 280 (thread or single). Premium accounts: up to
 * 25,000 (thread or single) — X Premium supports long-form posts in threads
 * via the NoteTweet API.
 */
export function getTweetMaxChars(
  tier: XSubscriptionTier | null | undefined,
  _isThreadMode: boolean
): number {
  return getMaxCharacterLimit(tier);
}

/**
 * Classifies the length zone of a premium single post. Returns `null` for
 * non-premium or thread tweets, which only ever have the single 280 boundary.
 */
export function getTweetLengthZone(
  charCount: number,
  isPremiumSinglePost: boolean
): TweetLengthZone | null {
  if (!isPremiumSinglePost) return null;
  if (charCount <= STANDARD_TWEET_LIMIT) return "short";
  if (charCount <= MEDIUM_ZONE_LIMIT) return "medium";
  return "long";
}

/**
 * Severity of the counter relative to a max limit.
 *
 * - `over`  — strictly above `max`
 * - `warning` — within `warnRatio` of the max (default 90%)
 * - `ok`    — comfortably under
 */
export function getTweetCharSeverity(
  charCount: number,
  max: number,
  warnRatio = 0.9
): TweetCharSeverity {
  if (charCount > max) return "over";
  if (charCount >= max * warnRatio) return "warning";
  return "ok";
}

export interface TweetCharCount {
  /** Weighted length of the text (or the caller-supplied precomputed count). */
  charCount: number;
  /** Active max for this context (thread cap or tier limit). */
  maxChars: number;
  /** `charCount > maxChars`. */
  isOverLimit: boolean;
  /** `charCount > 280` — useful even when the tier allows more, to flag thread-incompatible posts. */
  isOverStandardLimit: boolean;
  /** True when this is a non-thread post on a long-content tier. */
  isPremiumSinglePost: boolean;
  /** Length zone for premium single posts; `null` otherwise. */
  lengthZone: TweetLengthZone | null;
  /** Colour severity relative to the active max. */
  severity: TweetCharSeverity;
}

export interface ComputeTweetCharCountOptions {
  tier?: XSubscriptionTier | null | undefined;
  /** Threads share the tier limit (280 Free, 25K Premium). */
  isThreadMode?: boolean;
  /**
   * Pre-weighted count from the server/pipeline. When provided it is used as-is
   * instead of re-computing the weighted length from `text`.
   */
  precomputedCharCount?: number | undefined;
  /** Override the warning threshold ratio (default 90%). */
  warnRatio?: number | undefined;
}

/**
 * One-call computation of everything a tweet counter UI needs.
 */
export function computeTweetCharCount(
  text: string,
  options: ComputeTweetCharCountOptions = {}
): TweetCharCount {
  const { tier, isThreadMode = false, precomputedCharCount, warnRatio } = options;

  const charCount =
    precomputedCharCount !== undefined ? precomputedCharCount : getTweetWeightedLength(text);
  const maxChars = getTweetMaxChars(tier, isThreadMode);
  const isPremiumSinglePost = !isThreadMode && canPostLongContent(tier);

  return {
    charCount,
    maxChars,
    isOverLimit: charCount > maxChars,
    isOverStandardLimit: charCount > STANDARD_TWEET_LIMIT,
    isPremiumSinglePost,
    lengthZone: getTweetLengthZone(charCount, isPremiumSinglePost),
    severity: getTweetCharSeverity(charCount, maxChars, warnRatio),
  };
}
