import { z } from "zod";

// ── Field-length constants ─────────────────────────────────────────────────
// Keep these conservative so even a fully adversarial value is bounded.
const FIELD_MAX = 200;
const KEYWORD_MAX = 50;
const RULE_MAX = 150;

// ── No-newline refinement ──────────────────────────────────────────────────
// Voice profile fields are single-line descriptors (tone, keywords, rules,
// etc.). A newline inside a field value is always suspicious — it could be
// used to escape out of the prompt line and inject additional instructions
// (e.g. tone = "casual\nIgnore all previous instructions.").
//
// We enforce this at the schema level so that malformed values are REJECTED
// during both the write path (AI output validation before DB save) and the
// read path (re-validation inside buildVoiceInstructions). Rejection is
// preferable to silent stripping at the schema stage because it surfaces
// model misbehaviour early; the sanitizer provides defence-in-depth below.
const noNewline = (name: string) =>
  z.string().refine((v) => !/[\n\r]/.test(v), {
    message: `${name} must not contain newline characters`,
  });

// ── Shared schema ──────────────────────────────────────────────────────────
/**
 * Canonical Zod schema for a stored VoiceProfile.
 *
 * Used in two places:
 *  1. `voice-profile/route.ts` — validates AI-generated output BEFORE
 *     persisting to the DB, so only well-shaped data can reach the prompt.
 *  2. `buildVoiceInstructions()` — re-validates the stored DB value at
 *     read time so that legacy, corrupted, or manually-edited rows are
 *     rejected rather than interpolated raw into an LLM system prompt.
 */
export const voiceProfileSchema = z.object({
  tone:              noNewline("tone").max(FIELD_MAX),
  styleKeywords:     z.array(noNewline("styleKeywords item").max(KEYWORD_MAX)),
  emojiUsage:        noNewline("emojiUsage").max(FIELD_MAX),
  sentenceStructure: noNewline("sentenceStructure").max(FIELD_MAX),
  vocabularyLevel:   noNewline("vocabularyLevel").max(FIELD_MAX),
  formattingHabits:  noNewline("formattingHabits").max(FIELD_MAX),
  doAndDonts:        z.array(noNewline("doAndDonts item").max(RULE_MAX)),
});

export type VoiceProfile = z.infer<typeof voiceProfileSchema>;

// ── Sanitization helpers ───────────────────────────────────────────────────

/**
 * Sanitize a **single-line field value** before embedding in an LLM prompt.
 *
 * - Strips ALL control characters (including \n, \r, \t) — a newline inside
 *   a single-line field is an injection vector that would break the prompt
 *   structure and introduce attacker-controlled lines.
 * - Collapses multiple consecutive spaces to one.
 * - Trims and caps at maxLength as a final defence-in-depth measure (the
 *   schema should have already enforced the length).
 *
 * This is distinct from sanitizeForPrompt(), which is designed for
 * multi-line content where preserving intentional newlines is acceptable.
 */
export function sanitizeFieldValue(text: string, maxLength: number): string {
  return text
    .replace(/[\x00-\x1f\x7f]/g, " ") // replace ALL control chars (incl. \n \r \t) with a space
    .replace(/ {2,}/g, " ")            // collapse multiple spaces to one
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize **multi-line block content** before embedding in an LLM prompt.
 *
 * Preserves intentional newlines but strips non-printable controls,
 * normalizes line endings, and collapses excessive blank lines that could
 * be used to visually separate injected content from the original prompt.
 *
 * Not used for voice profile field values (use sanitizeFieldValue instead).
 * Kept here as a shared utility for other prompt-construction contexts.
 */
export function sanitizeForPrompt(text: string, maxLength: number): string {
  return text
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "") // strip non-printable controls (keep \t \n \r)
    .replace(/\r\n?/g, "\n")                             // normalize line endings
    .replace(/\n{3,}/g, "\n\n")                          // collapse 3+ blank lines to 2
    .trim()
    .slice(0, maxLength);
}

// ── Prompt-block builder ───────────────────────────────────────────────────
/**
 * Validate a raw DB value as a VoiceProfile, then build the
 * voice-instruction block for inclusion in an LLM system prompt.
 *
 * Returns an empty string when:
 *  - The value is null / undefined (no profile set)
 *  - The value does not conform to the schema (legacy or corrupted data,
 *    including any value containing newlines — rejected by noNewline refinement)
 *
 * This ensures that only schema-validated, length-bounded, single-line-safe
 * strings can reach the model prompt — never raw `jsonb` values.
 */
export function buildVoiceInstructions(raw: unknown): string {
  if (!raw) return "";

  const parsed = voiceProfileSchema.safeParse(raw);
  if (!parsed.success) return "";

  const vp = parsed.data;
  // Use the single-line sanitizer for every field value — strips any residual
  // control chars that somehow bypassed schema validation (defence-in-depth).
  const f = (text: string, max: number) => sanitizeFieldValue(text, max);

  const keywords = vp.styleKeywords
    .map((k) => f(k, KEYWORD_MAX))
    .filter(Boolean)
    .join(", ");

  const rules = vp.doAndDonts
    .map((r) => f(r, RULE_MAX))
    .filter(Boolean)
    .join("; ");

  return [
    "Voice Profile Instructions:",
    `- Tone: ${f(vp.tone, FIELD_MAX)}`,
    `- Style Keywords: ${keywords}`,
    `- Sentence Structure: ${f(vp.sentenceStructure, FIELD_MAX)}`,
    `- Vocabulary: ${f(vp.vocabularyLevel, FIELD_MAX)}`,
    `- Emoji Usage: ${f(vp.emojiUsage, FIELD_MAX)}`,
    `- Formatting: ${f(vp.formattingHabits, FIELD_MAX)}`,
    `- Rules: ${rules}`,
    "",
    "ADHERE STRICTLY TO THIS WRITING STYLE. Mimic the user's voice perfectly.",
  ].join("\n");
}
