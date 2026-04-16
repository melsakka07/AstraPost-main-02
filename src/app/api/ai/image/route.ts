/**
 * AI Image Generation API Endpoint
 * POST /api/ai/image
 *
 * Generates AI images using multiple providers (Nano Banana 2, Banana Pro, Gemini Imagen 4)
 */

import { NextRequest } from "next/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";
import { sanitizeForPrompt } from "@/lib/ai/voice-profile";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  checkAiImageQuotaDetailed,
  checkImageModelAccessDetailed,
  createPlanLimitResponse,
  getUserPlanType,
} from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse, redis } from "@/lib/rate-limiter";
import { aiGenerations } from "@/lib/schema";
import {
  startImageGeneration,
  type ImageModel,
  type AspectRatio,
  type ImageStyle,
} from "@/lib/services/ai-image";

// ============================================================================
// Schema Validation
// ============================================================================

const ImageGenRequestSchema = z.object({
  prompt: z.string().max(1000).optional(),
  tweetContent: z.string().max(5000).optional(),
  model: z
    .enum([
      process.env.REPLICATE_MODEL_FAST!,
      process.env.REPLICATE_MODEL_PRO!,
      process.env.REPLICATE_MODEL_FALLBACK!,
    ])
    .default(process.env.REPLICATE_MODEL_FAST!),
  aspectRatio: z.enum(["1:1", "16:9", "4:3", "9:16"]).default("1:1"),
  style: z
    .enum(["photorealistic", "illustration", "minimalist", "abstract", "infographic", "meme"])
    .optional(),
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
async function generateImagePromptFromTweet(tweetContent: string): Promise<string> {
  // Sanitize: strip non-printable controls, normalize line endings, collapse
  // excessive blank lines, and cap at 500 chars (the schema allows up to 5000
  // but we don't need more than that for prompt generation).
  const sanitized = sanitizeForPrompt(tweetContent, 500);

  try {
    const openrouterProvider = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY || "" });

    if (!process.env.OPENROUTER_MODEL) {
      throw new Error("OPENROUTER_MODEL environment variable is not configured");
    }

    const { text } = await generateText({
      model: openrouterProvider(process.env.OPENROUTER_MODEL),
      system: `You are an expert at creating vivid, specific image prompts for social media content.
Generate a visual prompt that captures the essence of the post.
Keep the prompt under 200 words. Focus on visual elements, composition, mood, and style.
Do not include text overlays in the image unless specifically requested.
Return ONLY the image prompt, no explanation or additional text.`,
      prompt: `Generate an image prompt for the following social media post (respond with only the image prompt, nothing else):\n\n---\n${sanitized}\n---`,
    });

    return text.trim();
  } catch (error) {
    logger.error("image_prompt_generation_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return `Visual representation of: ${sanitized.slice(0, 100)}`;
  }
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const correlationId = getCorrelationId(req);

    // 1. Authentication
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return ApiError.unauthorized();
    }

    // 2. Parse and validate request
    const body = await req.json();
    const validationResult = ImageGenRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return ApiError.badRequest(validationResult.error.issues);
    }

    const { prompt, tweetContent, model, aspectRatio, style } = validationResult.data;

    // 3. Auth identity
    const userId = session.user.id;

    // 4. Plan checks — model gate + monthly image quota (standard 402 + upgrade_url on failure)
    const plan = await getUserPlanType(userId); // for rate-limit tier selection
    const modelAccess = await checkImageModelAccessDetailed(userId, model as ImageModel);
    if (!modelAccess.allowed) return createPlanLimitResponse(modelAccess);

    // 5. Rate limit
    const rateLimitResult = await checkRateLimit(userId, plan, "ai_image");
    if (!rateLimitResult.success) return createRateLimitResponse(rateLimitResult);

    // 6. Monthly image quota
    const imageQuota = await checkAiImageQuotaDetailed(userId);
    if (!imageQuota.allowed) return createPlanLimitResponse(imageQuota);

    // 7. Generate or use provided prompt
    let finalPrompt = prompt;

    if (!finalPrompt && tweetContent) {
      // Auto-generate prompt from tweet content via OpenRouter (GPT-4o).
      // Record this LLM call in aiGenerations so it appears in the usage ledger
      // alongside the image generation it precedes — operators can see the true
      // AI cost per image request, and quota dashboards reflect both operations.
      finalPrompt = await generateImagePromptFromTweet(tweetContent);

      // Fire-and-forget DB record; errors here must not block the image flow.
      db.insert(aiGenerations)
        .values({
          id: crypto.randomUUID(),
          userId,
          type: "image_prompt",
          inputPrompt: tweetContent.slice(0, 2000),
          tokensUsed: 0, // OpenRouter streaming does not expose token counts here
        })
        .catch((err: unknown) => {
          logger.error("image_prompt_usage_record_failed", {
            error: err instanceof Error ? err.message : String(err),
            userId,
          });
        });
    }

    if (!finalPrompt) {
      return ApiError.badRequest("Either prompt or tweetContent must be provided");
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
      JSON.stringify({ userId, model, finalPrompt, aspectRatio, style: style ?? null })
    );

    // 10. Return prediction ID — client will poll for the result.
    const res = Response.json({ predictionId, estimatedSeconds: 20 });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("image_generation_failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return ApiError.internal("Failed to generate image");
  }
}
