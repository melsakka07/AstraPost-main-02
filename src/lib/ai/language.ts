import "server-only";

import { ARABIC_SOCIAL_STYLE, ARABIC_TRANSLATION_STYLE } from "@/lib/ai/arabic-prompt";
import { LANGUAGES } from "@/lib/constants";
import { logger } from "@/lib/logger";

// ─── Known language allow-list ─────────────────────────────────────────────────

const KNOWN_LANGUAGES: Set<string> = new Set(LANGUAGES.map((l) => l.code));

// ─── English-native blocks ─────────────────────────────────────────────────────

const ENGLISH_SOCIAL_BLOCK = `LANGUAGE: English
- Write ALL content in natural, idiomatic English appropriate for social media
- Use contemporary, conversational language that resonates on X (Twitter)
- Vary sentence length for rhythm — mix short punchy lines with longer sentences
- Avoid overly formal or academic phrasing unless the tone specifically calls for it`;

const ENGLISH_TRANSLATION_BLOCK = `LANGUAGE: English
- Translate into natural, idiomatic English
- Adapt cultural references to make sense in English-speaking contexts
- Preserve the original tone and intent, not just literal meaning`;

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Build a language-specific prompt block for AI generation or translation.
 *
 * For Arabic ("ar"): returns comprehensive style guidance sourced from
 * `arabic-prompt.ts` — the single source of Arabic style rules.
 *
 * For English and other known languages: returns an English-native block.
 * For unknown languages: logs a warning and falls back to English.
 *
 * @param language - ISO 639-1 language code (e.g., "ar", "en")
 * @param context  - "social" for content creation, "translation" for translation tasks
 * @returns        - A multi-line string suitable for injection into an AI system prompt
 */
export function buildLanguageBlock(language: string, context: "social" | "translation"): string {
  if (!KNOWN_LANGUAGES.has(language)) {
    logger.warn("unknown_language_in_ai_prompt", { language, context });
    return context === "social" ? ENGLISH_SOCIAL_BLOCK : ENGLISH_TRANSLATION_BLOCK;
  }

  if (language === "ar") {
    return context === "social" ? ARABIC_SOCIAL_STYLE : ARABIC_TRANSLATION_STYLE;
  }

  return context === "social" ? ENGLISH_SOCIAL_BLOCK : ENGLISH_TRANSLATION_BLOCK;
}
