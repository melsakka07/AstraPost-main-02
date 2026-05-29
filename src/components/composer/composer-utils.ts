import type { TweetDraft } from "./composer-types";

// Matches a leading "N/M " thread-numbering prefix (e.g. "1/5 ").
const NUMBERING_PREFIX = /^\s*\d+\/\d+\s+/g;

/**
 * Apply "N/M " thread-numbering prefixes to every draft. Strips any existing
 * prefix first, then truncates content so the prefixed string never exceeds the
 * 1000-char numbering cap.
 */
export function applyNumbering(drafts: TweetDraft[]): TweetDraft[] {
  const total = drafts.length;
  return drafts.map((t, idx) => {
    const prefix = `${idx + 1}/${total} `;
    const cleaned = t.content.replace(NUMBERING_PREFIX, "");
    const maxLen = 1000 - prefix.length;
    const next = cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
    return { ...t, content: `${prefix}${next}` };
  });
}

/** Remove any leading "N/M " thread-numbering prefix from every draft. */
export function removeNumbering(drafts: TweetDraft[]): TweetDraft[] {
  return drafts.map((t) => ({ ...t, content: t.content.replace(NUMBERING_PREFIX, "") }));
}

/** True when this is a multi-tweet thread and every tweet starts with "N/M ". */
export function isThreadNumbered(drafts: TweetDraft[]): boolean {
  return drafts.length > 1 && drafts.every((t) => /^\d+\/\d+\s/.test(t.content));
}

/**
 * Suggest a translation target language from content script:
 * Arabic-dominant → English, Latin-only → Arabic, otherwise the opposite of the
 * current content language.
 */
export function detectTranslateTarget(content: string, currentLanguage: string): string {
  const arabicChars = (content.match(/[؀-ۿ]/g) ?? []).length;
  const latinChars = (content.match(/[a-zA-Z]/g) ?? []).length;
  if (arabicChars > latinChars) return "en";
  if (arabicChars === 0 && latinChars > 0) return "ar";
  return currentLanguage === "ar" ? "en" : "ar";
}

/** Drop in-flight (uploading) media so reloads never restore ghost placeholders. */
export function serializeDraftsForSave(drafts: TweetDraft[]): TweetDraft[] {
  return drafts.map((t) => ({ ...t, media: t.media.filter((m) => !m.uploading) }));
}

/** True when any draft has trimmed text or attached media. */
export function draftsHaveContent(drafts: TweetDraft[]): boolean {
  return drafts.some((t) => t.content.trim().length > 0 || t.media.length > 0);
}
