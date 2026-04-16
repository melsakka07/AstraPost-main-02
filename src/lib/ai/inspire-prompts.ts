/**
 * Prompt builders for the AI Inspire feature.
 *
 * Each action has its own system-prompt factory that accepts optional tone,
 * language, and user-context parameters. The user prompt is built separately
 * by `buildInspireUserPrompt`.
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

export interface InspirePrompts {
  systemPrompt: string;
  userPrompt: string;
}

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

Return ONLY the rephrased tweet text. No explanation or additional text.`,

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

Return ONLY the adapted tweet text. No explanation or additional text.`,

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

Return ONLY the thread tweets, one per line, separated by |||.
Example: First tweet hook...|||Second tweet...|||Third tweet...`,

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

Return ONLY the adapted tweet text. No explanation or additional text.`,

  translate: (
    _tone,
    language,
    userContext
  ) => `You are helping a user translate a tweet while adapting cultural references appropriately.

IMPORTANT: This is NOT a literal translation. Adapt expressions, idioms, and cultural references to make sense in the target language.

Your task: Translate and culturally adapt the tweet.

${language === "ar" ? "Translate from English to Arabic, adapting idioms appropriately." : "Translate from Arabic to English, adapting idioms appropriately."}
${userContext ? `User context: ${userContext}` : ""}

Return ONLY the translated and adapted tweet text. No explanation or additional text.`,

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

Return ONLY the counter-argument tweet text. No explanation or additional text.`,
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Builds the system and user prompts for an inspire action.
 *
 * @param action      - The inspire action to perform
 * @param originalTweet - The source tweet text
 * @param options     - Optional tone, language, userContext, and threadContext
 * @returns           An object with `systemPrompt` and `userPrompt` strings
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
): InspirePrompts {
  const { tone, language, userContext, threadContext } = options;
  const builder = ACTION_SYSTEM_PROMPTS[action];
  const systemPrompt = builder(tone, language, userContext);

  let userPrompt = `Original tweet:\n${originalTweet}`;
  if (threadContext && threadContext.length > 0) {
    userPrompt += `\n\nThread context (previous tweets/replies):\n${threadContext.join("\n\n")}`;
  }

  return { systemPrompt, userPrompt };
}

/**
 * Parses the raw AI text output into an array of tweet strings.
 * For `expand_thread` actions the response uses ||| as a delimiter;
 * all other actions produce a single tweet.
 */
export function parseInspireResponse(action: InspireAction, text: string): string[] {
  if (action === "expand_thread") {
    return text
      .split("|||")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }
  return [text.trim()];
}
