import { type AiLengthOptionId } from "@/lib/schemas/common";

/**
 * Length-specific AI system prompt guidance for single-post generation.
 *
 * Each function returns a prompt segment that gets injected into the AI
 * system/user prompt. The guidance changes both the character constraint
 * AND the writing style/structure — this is critical for output quality.
 */

const LENGTH_PROMPTS: Record<AiLengthOptionId, string> = {
  short: `LENGTH GUIDANCE — Short post (≤280 characters):
- Focus on ONE powerful idea, a hook that stops the scroll, punchy language.
- Aim for ~250 characters — the system enforces hard limits server-side, so you don't need to count.
- Style: concise, impactful, every word earns its place.
- Techniques: rhetorical questions, bold statements, numbered lists (1-3 items max), strategic line breaks.
- The output must be a single tweet, not a thread.`,

  medium: `LENGTH GUIDANCE — Medium post (281–1,000 characters):
- Focus on a developed take with clear structure — opening hook, developed middle, strong closer.
- Aim for 500–900 characters — the system enforces the 1,000-char limit server-side.
- Style: conversational authority, smooth paragraph transitions.
- Structure: 2-3 short paragraphs, or a hook → point → evidence → takeaway flow.
- Techniques: storytelling opening, data points, contrarian framing, end with a call-to-action or question.
- The output must be a single post, not a thread.`,

  long: `LENGTH GUIDANCE — Long post (1,001–2,000 characters):
- Focus on thought leadership, in-depth analysis, storytelling, detailed explainers.
- Aim for 1,200–1,800 characters — the system enforces the 2,000-char limit server-side.
- Style: authoritative yet accessible, clear section breaks using line breaks.
- Structure: hook paragraph → 2-3 developed points → conclusion with takeaway.
- Techniques: anecdotal opening, numbered insights, "Here's what most people miss:" patterns, end with a forward-looking statement or CTA.
- The output must be a single post, not a thread.`,
};

/**
 * Thread mode prompt (unchanged from existing behavior).
 * Each tweet ≤280 chars, numbered format.
 */
export const THREAD_MODE_PROMPT = `LENGTH GUIDANCE — Thread mode:
- Aim for ~250 characters per tweet. The system enforces hard limits server-side — no need to count.
- Do not include numbering (1/5, etc) in the tweet text.
- First tweet is a compelling hook.
- Smooth transitions between tweets.
- Last tweet summarizes or has a CTA.
- Make tweets engaging and viral-worthy.
- Ensure correct grammar and modern style.`;

/**
 * Returns the AI prompt guidance segment for the given length option.
 */
export function getLengthPrompt(lengthOption: AiLengthOptionId): string {
  return LENGTH_PROMPTS[lengthOption];
}

/**
 * Returns the max character count the AI must respect for a given length option.
 * Used for post-generation validation / truncation guard.
 */
export function getLengthMaxChars(lengthOption: AiLengthOptionId): number {
  switch (lengthOption) {
    case "short":
      return 280;
    case "medium":
      return 1_000;
    case "long":
      return 2_000;
  }
}
