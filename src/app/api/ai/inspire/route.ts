/**
 * AI Inspire API Endpoint
 * POST /api/ai/inspire
 *
 * AI-powered content adaptation from imported tweets
 */

import { NextRequest, NextResponse } from "next/server";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { and, eq, gte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlanLimits, normalizePlan } from "@/lib/plan-limits";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { aiGenerations } from "@/lib/schema";

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

const InspireLanguage = z.enum(["ar", "en"]);

const InspireRequestSchema = z.object({
  originalTweet: z.string().min(1).max(5000),
  threadContext: z.array(z.string().max(5000)).max(10).optional(),
  action: InspireAction,
  tone: InspireTone.optional(),
  language: InspireLanguage.default("ar"),
  userContext: z.string().max(1000).optional(),
});

// ============================================================================
// System Prompts for Each Action
// ============================================================================

const ACTION_SYSTEM_PROMPTS: Record<
  string,
  (tone?: string, language?: string, userContext?: string) => string
> = {
  rephrase: (tone, language, userContext) => `You are helping a user create original content inspired by an existing tweet.

IMPORTANT: Never plagiarize. Always produce substantially different text that adds new value, perspective, or creative expression. The output should be the user's own voice, not a copy.

Your task: Rephrase the original tweet in different words while preserving the core message.

${tone ? `Use a ${tone} tone.` : ""}
${language === "ar" ? "Respond in Arabic." : "Respond in English."}
${userContext ? `User context: ${userContext}` : ""}

Return ONLY the rephrased tweet text. No explanation or additional text.`,

  change_tone: (tone, language, userContext) => `You are helping a user adapt a tweet's tone while keeping the core message.

IMPORTANT: Never plagiarize. Always produce substantially different text that adds new value or perspective. The output should be the user's own voice.

Your task: Adapt the original tweet to a different tone.

${tone ? `Target tone: ${tone}.` : "Choose a different tone than the original."}
${language === "ar" ? "Respond in Arabic." : "Respond in English."}
${userContext ? `User context: ${userContext}` : ""}

Return ONLY the adapted tweet text. No explanation or additional text.`,

  expand_thread: (tone, language, userContext) => `You are helping a user expand a single tweet into an engaging thread.

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

  add_take: (tone, language, userContext) => `You are helping a user add their personal perspective to an existing tweet idea.

IMPORTANT: Never plagiarize. The output should include the user's unique opinion, experience, or insight that adds new value beyond the original.

Your task: Rewrite the tweet with the user's personal take/opinion injected.

${tone ? `Use a ${tone} tone.` : ""}
${language === "ar" ? "Respond in Arabic." : "Respond in English."}
${userContext ? `User's perspective to inject: ${userContext}` : ""}

Return ONLY the adapted tweet text. No explanation or additional text.`,

  translate: (_tone, language, userContext) => `You are helping a user translate a tweet while adapting cultural references appropriately.

IMPORTANT: This is NOT a literal translation. Adapt expressions, idioms, and cultural references to make sense in the target language.

Your task: Translate and culturally adapt the tweet.

${language === "ar" ? "Translate from English to Arabic, adapting idioms appropriately." : "Translate from Arabic to English, adapting idioms appropriately."}
${userContext ? `User context: ${userContext}` : ""}

Return ONLY the translated and adapted tweet text. No explanation or additional text.`,

  counter_point: (tone, language, userContext) => `You are helping a user create a respectful counter-argument or alternative viewpoint to an existing tweet.

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
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse and validate request
    const body = await req.json();
    const validationResult = InspireRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const {
      originalTweet,
      threadContext,
      action,
      tone,
      language,
      userContext,
    } = validationResult.data;

    // 3. Get user and plan info
    const userId = session.user.id;
    const userRecord = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const plan = normalizePlan(userRecord.plan);
    const planLimits = getPlanLimits(plan);

    // 4. Check if user can use inspiration feature
    if (!planLimits.canUseInspiration) {
      return NextResponse.json(
        { error: "Inspiration feature not available in your plan" },
        { status: 403 }
      );
    }

    // 5. Check AI rate limit
    const rateLimitResult = await checkRateLimit(userId, plan, "ai");
    if (!rateLimitResult.success) return createRateLimitResponse(rateLimitResult);

    // 6. Check AI quota (monthly limit)
    if (planLimits.aiGenerationsPerMonth > 0) {
      // -1 means unlimited
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const monthlyCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(aiGenerations)
        .where(
          and(
            eq(aiGenerations.userId, userId),
            gte(aiGenerations.createdAt, currentMonth)
          )
        );

      const aiUsed = monthlyCount[0]?.count || 0;

      if (aiUsed >= planLimits.aiGenerationsPerMonth) {
        return NextResponse.json(
          {
            error: "Monthly AI quota exceeded",
            limit: planLimits.aiGenerationsPerMonth,
            used: aiUsed,
          },
          { status: 403 }
        );
      }
    }

    // 7. Build the prompt
    const promptBuilder = ACTION_SYSTEM_PROMPTS[action];
    if (!promptBuilder) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }
    const systemPrompt = promptBuilder(tone, language, userContext);

    let userPrompt = `Original tweet:\n${originalTweet}`;

    if (threadContext && threadContext.length > 0) {
      userPrompt += `\n\nThread context (previous tweets/replies):\n${threadContext.join("\n\n")}`;
    }

    // 8. Generate AI response
    const { text } = await generateText({
      model: openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4o"),
      system: systemPrompt,
      prompt: userPrompt,
    });

    // 9. Parse response based on action
    let tweets: string[];

    if (action === "expand_thread") {
      // Thread tweets are separated by |||
      tweets = text.split("|||").map((t) => t.trim()).filter((t) => t.length > 0);
    } else {
      // Single tweet response
      tweets = [text.trim()];
    }

    // 10. Record usage in aiGenerations table
    await db.insert(aiGenerations).values({
      id: nanoid(),
      userId,
      type: "inspire",
      inputPrompt: systemPrompt + "\n\n" + userPrompt,
      outputContent: {
        action,
        tone,
        language,
        tweets,
      },
      createdAt: new Date(),
    });

    // 11. Return result
    return NextResponse.json({
      tweets,
      action,
    });
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
