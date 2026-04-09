/**
 * AI Inspire API Endpoint
 * POST /api/ai/inspire
 *
 * AI-powered content adaptation from imported tweets
 */

import { NextRequest, NextResponse } from "next/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { LANGUAGE_ENUM_LIMITED } from "@/lib/constants";
import {
  checkAiLimitDetailed,
  checkAiQuotaDetailed,
  checkInspirationAccessDetailed,
  createPlanLimitResponse,
  getUserPlanType,
} from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { recordAiUsage } from "@/lib/services/ai-quota";

// ============================================================================
// Schema Validation
// ============================================================================

const InspireAction = z.enum([
  "rephrase",
  "change_tone",
  "expand_thread",
  "add_take",
  "translate",
  "counter_point",
]);

const InspireTone = z.enum([
  "professional",
  "casual",
  "humorous",
  "educational",
  "inspirational",
  "viral",
]);

const InspireRequestSchema = z.object({
  originalTweet: z.string().min(1).max(5000),
  threadContext: z.array(z.string().max(5000)).max(10).optional(),
  action: InspireAction,
  tone: InspireTone.optional(),
  language: LANGUAGE_ENUM_LIMITED.default("ar"),
  userContext: z.string().max(1000).optional(),
});

// ============================================================================
// System Prompts for Each Action
// ============================================================================

const ACTION_SYSTEM_PROMPTS: Record<
  string,
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
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Parse and validate request
    const body = await req.json();
    const validationResult = InspireRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { originalTweet, threadContext, action, tone, language, userContext } =
      validationResult.data;

    // 3. Plan checks — inspiration gate + rate limit (402 + upgrade_url on failure)
    const plan = await getUserPlanType(userId); // for rate-limit tier selection
    const inspirationAccess = await checkInspirationAccessDetailed(userId);
    if (!inspirationAccess.allowed) return createPlanLimitResponse(inspirationAccess);

    // 4. Rate limit
    const rateLimitResult = await checkRateLimit(userId, plan, "ai");
    if (!rateLimitResult.success) return createRateLimitResponse(rateLimitResult);

    // 5. AI access + quota checks (standardised 402 response with upgrade_url)
    const aiAccess = await checkAiLimitDetailed(userId);
    if (!aiAccess.allowed) return createPlanLimitResponse(aiAccess);

    const aiQuota = await checkAiQuotaDetailed(userId);
    if (!aiQuota.allowed) return createPlanLimitResponse(aiQuota);

    // 7. API key guard
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    // 8. Build the prompt
    const promptBuilder = ACTION_SYSTEM_PROMPTS[action];
    if (!promptBuilder) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    const systemPrompt = promptBuilder(tone, language, userContext);
    let userPrompt = `Original tweet:\n${originalTweet}`;
    if (threadContext && threadContext.length > 0) {
      userPrompt += `\n\nThread context (previous tweets/replies):\n${threadContext.join("\n\n")}`;
    }

    // 9. Generate AI response
    const openrouterProvider = createOpenRouter({ apiKey });
    const { text } = await generateText({
      model: openrouterProvider(process.env.OPENROUTER_MODEL!),
      system: systemPrompt,
      prompt: userPrompt,
    });

    // 10. Parse response based on action
    const tweets =
      action === "expand_thread"
        ? text
            .split("|||")
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
        : [text.trim()];

    // 11. Record usage (standardised path — previously inlined db.insert)
    await recordAiUsage(
      userId,
      "inspire",
      0,
      `${systemPrompt}\n\n${userPrompt}`,
      { action, tone, language, tweets },
      language
    );

    return NextResponse.json({ tweets, action });
  } catch (error) {
    console.error("AI inspire error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate inspired content",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
