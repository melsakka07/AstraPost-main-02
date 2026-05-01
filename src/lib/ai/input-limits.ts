/**
 * AI input token budget caps.
 *
 * These constants define the maximum character length for user-provided inputs
 * that are embedded into LLM prompts. Truncating before prompt construction
 * prevents excessive token consumption and reduces cost.
 */

export const INPUT_LIMITS = {
  topic: 1_000, // chars
  userContext: 2_000,
  voiceProfile: 2_000,
  productTitle: 200,
  summarizeBody: 30_000,
  competitorTweet: 600,
  inspireSource: 1_500,
} as const;

/**
 * Truncate a string to `max` characters if it exceeds the limit.
 * Returns the original string when within bounds.
 */
export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}
