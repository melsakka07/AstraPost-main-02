/**
 * Centralized Arabic AI prompt helper.
 *
 * Replaces the duplicated inline `langInstruction` pattern that was scattered
 * across 15+ AI routes. Provides enhanced, culturally-aware Arabic instructions
 * for language quality, punctuation, numeral consistency, and tone guidance.
 */

const ARABIC_INSTRUCTIONS = [
  "IMPORTANT: Output the ENTIRE response in Modern Standard Arabic (العربية).",
  "Use Arabic punctuation marks: ، (comma), ؛ (semicolon), ؟ (question mark). Never use Latin punctuation in Arabic text.",
  "Use Western numerals (0–9) consistently throughout. Do not mix Eastern Arabic numerals (٠-٩).",
  "Avoid translations of English idioms; use natural Arabic equivalents. Reference MENA region context where relevant.",
] as const;

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
