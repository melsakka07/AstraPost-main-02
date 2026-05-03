/**
 * Centralized Arabic AI prompt helper — single source of Arabic style guidance.
 *
 * Replaces the duplicated inline `langInstruction` pattern that was scattered
 * across 15+ AI routes. Provides enhanced, culturally-aware Arabic instructions
 * for language quality, punctuation, numeral consistency, and tone guidance.
 *
 * All Arabic prompt text in the codebase should originate from this module.
 * Other modules (language.ts, prompt builders) import the style blocks from here.
 */

const ARABIC_INSTRUCTIONS = [
  "IMPORTANT: Output the ENTIRE response in Modern Standard Arabic (العربية).",
  "Use Arabic punctuation marks: ، (comma), ؛ (semicolon), ؟ (question mark). Never use Latin punctuation in Arabic text.",
  "Use Western numerals (0–9) consistently throughout. Do not mix Eastern Arabic numerals (٠-٩).",
  "Avoid translations of English idioms; use natural Arabic equivalents. Reference MENA region context where relevant.",
] as const;

/** Comprehensive Arabic style block for social media content creation. */
export const ARABIC_SOCIAL_STYLE = [
  "LANGUAGE: Arabic (العربية)",
  "- Write ALL content natively in Modern Standard Arabic (فصحى معاصرة) or appropriate dialect for social media",
  "- Do NOT translate from English — think and write directly in Arabic",
  "- Use Arabic punctuation marks: ، (comma), ؛ (semicolon), ؟ (question mark). Never use Latin punctuation in Arabic text.",
  "- Use Western numerals (0–9) consistently. Do not mix Eastern Arabic numerals (٠-٩).",
  "- Avoid translations of English idioms; use natural Arabic equivalents",
  "- Reference MENA region context and culture where relevant",
  "- Use Arabic-native expressions, idioms, and cultural references relevant to the MENA region",
  "- Hashtags: mix Arabic hashtags (with # prefix) and relevant English hashtags",
  "- JSON keys MUST remain in English — only the content values should be in Arabic",
].join("\n");

/** Arabic style block for translation tasks (culturally adapted, not literal). */
export const ARABIC_TRANSLATION_STYLE = [
  "LANGUAGE: Arabic (العربية)",
  "- Translate into natural, culturally-adapted Arabic",
  "- Use Modern Standard Arabic (فصحى معاصرة) with natural phrasing suitable for the target audience",
  "- Adapt idioms and cultural references to Arabic equivalents",
  "- Do NOT produce literal word-for-word translations",
  "- Preserve the original tone and intent",
  "- Use Arabic punctuation marks: ، (comma), ؛ (semicolon), ؟ (question mark)",
  "- Use Western numerals (0–9) consistently",
].join("\n");

const ARABIC_TONE_MAP: Record<string, string> = {
  professional: "احترافي",
  casual: "غير رسمي",
  educational: "تعليمي",
  inspirational: "ملهم",
  humorous: "فكاهي",
  viral: "منتشر",
  controversial: "جدلي",
};

/**
 * Returns language-specific prompt instructions.
 *
 * For Arabic ("ar"): returns an enhanced multi-line block with punctuation,
 * numeral, cultural context, and language rules.
 *
 * For all other languages: returns "Language: English."
 */
export function getArabicInstructions(language: string): string {
  if (language === "ar") {
    return ARABIC_INSTRUCTIONS.join("\n");
  }

  return "Language: English.";
}

/**
 * Returns Arabic-specific tone guidance.
 *
 * Maps English tone names to their Arabic equivalents with natural phrasing
 * suitable for X (Twitter) content. Falls back to the raw tone string if
 * no mapping is defined.
 *
 * Usage (in routes with a tone parameter):
 * ```ts
 * const toneGuidance = userLanguage === "ar"
 *   ? getArabicToneGuidance(tone)
 *   : `Tone: ${tone}.`;
 * ```
 */
export function getArabicToneGuidance(tone: string): string {
  const arabicTone = ARABIC_TONE_MAP[tone] ?? tone;
  return `النبرة: ${arabicTone}. اكتب بأسلوب ${arabicTone} يتناسب مع الجمهور العربي في منصة إكس (تويتر).`;
}
