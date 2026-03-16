/**
 * AI Image Generation API Endpoint
 * POST /api/ai/image
 *
 * Generates AI images using multiple providers (Nano Banana 2, Banana Pro, Gemini Imagen 4)
 */

import { NextRequest, NextResponse } from "next/server";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { sanitizeForPrompt } from "@/lib/ai/voice-profile";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlanLimits, normalizePlan } from "@/lib/plan-limits";
import { checkRateLimit, createRateLimitResponse, redis } from "@/lib/rate-limiter";
import { aiGenerations } from "@/lib/schema";
import {
  startImageGeneration,
  type ImageModel,
  type AspectRatio,
  type ImageStyle,
  validateModelForPlan,
} from "@/lib/services/ai-image";

// ============================================================================
// Schema Validation
// ============================================================================

const ImageGenRequestSchema = z.object({
  prompt: z.string().max(1000).optional(),
  tweetContent: z.string().max(5000).optional(),
  model: z.enum(["nano-banana-2", "nano-banana-pro"]).default("nano-banana-2"),
  aspectRatio: z.enum(["1:1", "16:9", "4:3", "9:16"]).default("1:1"),
  style: z.enum(["photorealistic", "illustration", "minimalist", "abstract", "infographic", "meme"]).optional(),
});

// ============================================================================
// Auto-Prompt Generation
// ============================================================================

/**
 * Generate an image prompt from tweet content using AI.
 *
 * User-supplied content is sanitized with `sanitizeForPrompt` before being
 * embedded in the LLM call. The `---` delimiters bound the user block so that
 * instruction-injection attempts cannot bleed into the surrounding prompt.
 */
async function generateImagePromptFromTweet(
  tweetContent: string
): Promise<string> {
  // Sanitize: strip non-printable controls, normalize line endings, collapse
  // excessive blank lines, and cap at 500 chars (the schema allows up to 5000
  // but we don't need more than that for prompt generation).
  const sanitized = sanitizeForPrompt(tweetContent, 500);

  try {
    const { text } = await generateText({
      model: openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4o"),
      system: `You are an expert at creating vivid, specific image prompts for social media content.
Generate a visual prompt that captures the essence of the post.
Keep the prompt under 200 words. Focus on visual elements, composition, mood, and style.
Do not include text overlays in the image unless specifically requested.
Return ONLY the image prompt, no explanation or additional text.`,
      prompt: `Generate an image prompt for the following social media post (respond with only the image prompt, nothing else):\n\n---\n${sanitized}\n---`,
    });

    return text.trim();
  } catch (error) {
    console.error("Failed to generate image prompt:", error);
    return `Visual representation of: ${sanitized.slice(0, 100)}`;
  }
}

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
    const validationResult = ImageGenRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { prompt, tweetContent, model, aspectRatio, style } =
      validationResult.data;

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

    // 4. Validate model availability for plan
    const modelValidation = validateModelForPlan(
      model as ImageModel,
      planLimits.availableImageModels
    );

    if (!modelValidation.valid) {
      console.log(`[AI Image] 403: Invalid model ${model} for plan ${plan}`);
      return NextResponse.json(
        { error: modelValidation.error },
        { status: 403 }
      );
    }

    // 5. Check rate limit
    const rateLimitResult = await checkRateLimit(userId, plan, "ai_image");
    if (!rateLimitResult.success) return createRateLimitResponse(rateLimitResult);

    // 6. Check AI image quota (monthly limit)
    if (planLimits.aiImagesPerMonth > 0) {
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
            eq(aiGenerations.type, "image"),
            gte(aiGenerations.createdAt, currentMonth)
          )
        );

      const imagesUsed = monthlyCount[0]?.count || 0;

      if (imagesUsed >= planLimits.aiImagesPerMonth) {
        console.log(`[AI Image] 403: Quota exceeded. Used: ${imagesUsed}, Limit: ${planLimits.aiImagesPerMonth}`);
        return NextResponse.json(
          {
            error: "Monthly AI image quota exceeded",
            limit: planLimits.aiImagesPerMonth,
            used: imagesUsed,
          },
          { status: 403 }
        );
      }
    }

    // 7. Generate or use provided prompt
    let finalPrompt = prompt;

    if (!finalPrompt && tweetContent) {
      // Auto-generate prompt from tweet content via OpenRouter (GPT-4o).
      // Record this LLM call in aiGenerations so it appears in the usage ledger
      // alongside the image generation it precedes — operators can see the true
      // AI cost per image request, and quota dashboards reflect both operations.
      finalPrompt = await generateImagePromptFromTweet(tweetContent);

      // Fire-and-forget DB record; errors here must not block the image flow.
      db.insert(aiGenerations).values({
        id: crypto.randomUUID(),
        userId,
        type: "image_prompt",
        inputPrompt: tweetContent.slice(0, 2000),
        tokensUsed: 0, // OpenRouter streaming does not expose token counts here
      }).catch((err: unknown) => {
        console.error("Failed to record image_prompt ai generation", err);
      });
    }

    if (!finalPrompt) {
      return NextResponse.json(
        { error: "Either prompt or tweetContent must be provided" },
        { status: 400 }
      );
    }

    // 8. Start image generation asynchronously (no polling — avoids serverless timeout).
    //    The client polls GET /api/ai/image/status?id=<predictionId> for the result.
    const genParams: {
      prompt: string;
      aspectRatio: AspectRatio;
      model: ImageModel;
      style?: ImageStyle;
    } = {
      prompt: finalPrompt,
      aspectRatio: aspectRatio as AspectRatio,
      model: model as ImageModel,
    };

    if (style) {
      genParams.style = style as ImageStyle;
    }

    const { predictionId } = await startImageGeneration(genParams);

    // 9. Cache prediction metadata in Redis (30 min TTL) so the status endpoint
    //    can verify ownership, reconstruct params, and record usage on completion.
    await redis.setex(
      `ai:img:pred:${predictionId}`,
      1800,
      JSON.stringify({ userId, model, finalPrompt, aspectRatio, style: style ?? null }),
    );

    // 10. Return prediction ID — client will poll for the result.
    return NextResponse.json({ predictionId, estimatedSeconds: 20 });
  } catch (error) {
    console.error("AI image generation error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate image",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

