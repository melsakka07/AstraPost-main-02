export const VERSION = "inspire:v2";

import { redactPII } from "@/lib/ai/pii";
import { JAILBREAK_GUARD, wrapUntrusted } from "@/lib/ai/untrusted";

/**
 * Prompt builders for the AI Inspire feature.
 *
 * Each action has its own system-prompt factory. The user prompt is built
 * separately by `buildInspirePrompts`. Returns `{ system, messages }` for
 * Anthropic prompt-caching compatibility.
 *
 * PII is redacted from all user-provided content before embedding in prompts
 * to prevent personal data from being sent to third-party AI providers.
 *
 * All user-supplied content is wrapped with `<<<UNTRUSTED...UNTRUSTED>>>`
 * delimiters to defend against prompt injection attacks.
 */

export type InspireAction =
  | "rephrase"
  | "change_tone"
  | "expand_thread"
  | "add_take"
  | "translate"
  | "counter_point";

export type InspireTone =
  | "professional"
  | "casual"
  | "humorous"
  | "educational"
  | "inspirational"
  | "viral";

// ============================================================================
// System Prompt Builders
// ============================================================================

const ACTION_SYSTEM_PROMPTS: Record<
  InspireAction,
  (tone?: string, language?: string, userContext?: string) => string
> = {
  rephrase: (
    tone,
    language,
    userContext
  ) => `You are helping a user create original content inspired by an existing tweet.

IMPORTANT: Never plagiarize. Always produce substantially different text that adds new value, perspective, or creative expression. The output should be the user's own voice, not a copy.

Your task: Rephrase the original tweet in different words while preserving the core message.

${tone ? `Use a ${tone} tone.` : ""}
${language === "ar" ? "Respond in Arabic." : "Respond in English."}
${userContext ? `User context: ${userContext}` : ""}

Return ONLY the rephrased tweet text. No explanation or additional text.

${JAILBREAK_GUARD}`,

  change_tone: (
    tone,
    language,
    userContext
  ) => `You are helping a user adapt a tweet's tone while keeping the core message.

IMPORTANT: Never plagiarize. Always produce substantially different text that adds new value or perspective. The output should be the user's own voice.

Your task: Adapt the original tweet to a different tone.

${tone ? `Target tone: ${tone}.` : "Choose a different tone than the original."}
${language === "ar" ? "Respond in Arabic." : "Respond in English."}
${userContext ? `User context: ${userContext}` : ""}

Return ONLY the adapted tweet text. No explanation or additional text.

${JAILBREAK_GUARD}`,

  expand_thread: (
    tone,
    language,
    userContext
  ) => `You are helping a user expand a single tweet into an engaging thread.

IMPORTANT: Never plagiarize. Build upon the original idea with substantial new content, perspective, and value.

Your task: Turn the single tweet into a multi-tweet thread (3-5 tweets) that elaborates on the idea.

${tone ? `Use a ${tone} tone throughout.` : ""}
${language === "ar" ? "Respond in Arabic." : "Respond in English."}
${userContext ? `User context: ${userContext}` : ""}

Thread structure:
- Tweet 1: Hook/introduction (builds on original idea)
- Tweet 2-3: Main content with elaboration
- Final Tweet: Conclusion or CTA

${JAILBREAK_GUARD}`,

  add_take: (
    tone,
    language,
    userContext
  ) => `You are helping a user add their personal perspective to an existing tweet idea.

IMPORTANT: Never plagiarize. The output should include the user's unique opinion, experience, or insight that adds new value beyond the original.

Your task: Rewrite the tweet with the user's personal take/opinion injected.

${tone ? `Use a ${tone} tone.` : ""}
${language === "ar" ? "Respond in Arabic." : "Respond in English."}
${userContext ? `User's perspective to inject: ${userContext}` : ""}

Return ONLY the adapted tweet text. No explanation or additional text.

${JAILBREAK_GUARD}`,

  translate: (
    _tone,
    language,
    userContext
  ) => `You are helping a user translate a tweet while adapting cultural references appropriately.

IMPORTANT: This is NOT a literal translation. Adapt expressions, idioms, and cultural references to make sense in the target language.

Your task: Translate and culturally adapt the tweet.

${language === "ar" ? "Translate from English to Arabic, adapting idioms appropriately." : "Translate from Arabic to English, adapting idioms appropriately."}
${userContext ? `User context: ${userContext}` : ""}

Return ONLY the translated and adapted tweet text. No explanation or additional text.

${JAILBREAK_GUARD}`,

  counter_point: (
    tone,
    language,
    userContext
  ) => `You are helping a user create a respectful counter-argument or alternative viewpoint to an existing tweet.

IMPORTANT: Never plagiarize. The output should present a different perspective that adds value to the conversation. Be respectful and constructive.

Your task: Generate a respectful counter-argument or alternative viewpoint.

${tone ? `Use a ${tone} tone.` : ""}
${language === "ar" ? "Respond in Arabic." : "Respond in English."}
${userContext ? `User's perspective: ${userContext}` : ""}

Return ONLY the counter-argument tweet text. No explanation or additional text.

${JAILBREAK_GUARD}`,
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Builds the system and user messages for an inspire action.
 *
 * All user-supplied content is PII-redacted and wrapped in untrusted-content
 * delimiters to prevent prompt injection.
 *
 * @param action        - The inspire action to perform
 * @param originalTweet - The source tweet text
 * @param options       - Optional tone, language, userContext, threadContext
 * @returns             An object with `system`, `messages`, and optional `redactions`
 */
export function buildInspirePrompts(
  action: InspireAction,
  originalTweet: string,
  options: {
    tone?: InspireTone;
    language?: string;
    userContext?: string;
    threadContext?: string[];
  } = {}
): { system: string; messages: Array<{ role: "user"; content: string }>; redactions?: string[] } {
  // Redact PII from user-provided content before embedding in prompts
  const { cleaned: cleanTweet, redactions: tweetRedactions } = redactPII(originalTweet);
  const allRedactions = [...tweetRedactions];

  const rawContext = options.threadContext;
  let cleanThreadContext: string[] | undefined;
  if (rawContext && rawContext.length > 0) {
    cleanThreadContext = rawContext.map((t) => {
      const { cleaned, redactions } = redactPII(t);
      allRedactions.push(...redactions);
      return cleaned;
    });
  }

  const { tone, language, userContext } = options;

  const builder = ACTION_SYSTEM_PROMPTS[action];
  const system = builder(tone, language, userContext);

  // Wrap user-supplied content in untrusted delimiters for injection defence
  let userContent = wrapUntrusted("SOURCE TWEET", cleanTweet, 5_000);
  if (cleanThreadContext && cleanThreadContext.length > 0) {
    userContent += `\n\nThread context (previous tweets/replies):\n${cleanThreadContext.join("\n\n")}`;
  }

  return {
    system,
    messages: [{ role: "user", content: userContent }],
    ...(allRedactions.length > 0 && { redactions: allRedactions }),
  };
}
