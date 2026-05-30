/**
 * Accepted X/Twitter status-URL shapes for the inspiration importer. Matches
 * the four forms the importer supports: twitter.com, x.com, x.com/i/web, and
 * mobile.twitter.com. Behavior is identical to the inline patterns it replaced.
 */
export const TWEET_URL_PATTERNS: readonly RegExp[] = [
  /twitter\.com\/[\w]+\/status\/(\d+)/i,
  /x\.com\/[\w]+\/status\/(\d+)/i,
  /x\.com\/i\/web\/status\/(\d+)/i,
  /mobile\.twitter\.com\/[\w]+\/status\/(\d+)/i,
];

/** True when `url` is one of the accepted X/Twitter status-URL shapes. */
export function isValidTweetUrl(url: string): boolean {
  return TWEET_URL_PATTERNS.some((pattern) => pattern.test(url));
}
