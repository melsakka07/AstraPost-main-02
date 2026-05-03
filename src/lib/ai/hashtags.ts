import "server-only";

// ─── Banned hashtags (spam, follower-bait, engagement-bait) ────────────────────

export const BANNED_HASHTAGS: Set<string> = new Set([
  // English spam / follower-bait tags
  "follow4follow",
  "f4f",
  "followback",
  "l4l",
  "like4like",
  "followforfollow",
  "followme",
  "followtrain",
  "followparty",
  "follownow",
  "followmeback",
  "instafollow",
  "teamfollowback",
  "followall",
  "follows",
  "gainfollowers",
  "follow",
  "like",
  "likeforlike",
  "followback",
  "likes",
  "shoutout",
  "s4s",
  "follower",
  "gain",
  "followers",
  "pleasefollow",
  "followbacknow",
  "followbackalways",
  "followforfollowback",
  "ifollowback",
  "follow4followback",
  "tagsforlikes",
  "like4likes",
  "likeback",
  "likealways",
  "followspree",
  "followloop",
  "followchain",
  // Arabic spam / follower-bait tags
  "لايك",
  "متابعة",
  "متابعه",
  "فولو",
  "اعجبني",
  "تصويت",
  "متابعين",
  "متابع",
  "لايكات",
  "فالو",
  "فالوباك",
  "فولو_باك",
  "اعجبني_اعجبك",
  "متابعة_متابعة",
  "اعجاب",
  "تعليق",
  "تفاعل",
  // Generic engagement-bait (low-value, spammy)
  "rt",
  "retweet",
  "please",
  "plz",
  "pls",
  "trending",
  "viral",
  "explore",
  "explorepage",
]);

// ─── Arabic script detection ───────────────────────────────────────────────────

const ARABIC_SCRIPT_RE = /[؀-ۿ]/;

function isArabicScript(text: string): boolean {
  return ARABIC_SCRIPT_RE.test(text);
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Filters a list of hashtags by removing banned tags and deduplicating.
 *
 * Normalization applied:
 * - Adds missing `#` prefix
 * - Case-insensitive deduplication
 *
 * @param hashtags - Raw hashtag strings from AI generation
 * @returns        - Cleaned, deduplicated hashtag array
 */
export function filterHashtags(hashtags: string[]): string[] {
  const seen = new Set<string>();
  return hashtags
    .map((h) => {
      let normalized = h.trim();
      if (!normalized.startsWith("#")) normalized = `#${normalized}`;
      return normalized;
    })
    .filter((h) => {
      const tagOnly = h.slice(1).toLowerCase(); // strip # for comparison
      if (!tagOnly) return false;
      if (BANNED_HASHTAGS.has(tagOnly)) return false;
      if (seen.has(tagOnly)) return false;
      seen.add(tagOnly);
      return true;
    });
}

/**
 * Applies MENA-region bias to hashtag ordering for Arabic-language content.
 *
 * For Arabic language: prioritizes Arabic-script hashtags at the front of
 * the list, so they appear first in UI displays. Non-Arabic-script tags
 * follow after.
 *
 * For non-Arabic languages: returns the list unchanged.
 *
 * @param hashtags - Filtered hashtag array (after `filterHashtags`)
 * @param language - ISO 639-1 language code
 * @returns        - Reordered hashtag array
 */
export function menaBiasFilter(hashtags: string[], language: string): string[] {
  if (language !== "ar") return hashtags;

  const arabicScriptTags = hashtags.filter((h) => isArabicScript(h.slice(1)));
  const nonArabicTags = hashtags.filter((h) => !isArabicScript(h.slice(1)));

  // Boost Arabic-script tags to the front
  return [...arabicScriptTags, ...nonArabicTags];
}
