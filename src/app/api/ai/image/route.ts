/**
 * AI Image Generation API Endpoint
 * POST /api/ai/image
 *
 * Generates AI images using multiple providers (Nano Banana 2, Banana Pro, Gemini Imagen 4)
 */

import { NextRequest } from "next/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, type LanguageModel } from "ai";
import { z } from "zod";
import { openrouterFallbackBody } from "@/lib/ai/openrouter-fallback";
import { sanitizeForPrompt } from "@/lib/ai/voice-profile";
import { withRetry } from "@/lib/ai/with-retry";
import { withTimeout } from "@/lib/ai/with-timeout";
import { ApiError } from "@/lib/api/errors";
import { checkIdempotency, cacheIdempotentResponse } from "@/lib/api/idempotency";
import { auth } from "@/lib/auth";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import {
  checkImageModelAccessDetailed,
  createPlanLimitResponse,
  getUserPlanType,
} from "@/lib/middleware/require-plan";
import { IMAGE_MODEL_COST } from "@/lib/plan-limits";
import { checkRateLimit, createRateLimitResponse, redis } from "@/lib/rate-limiter";
import {
  startImageGeneration,
  type ImageModel,
  type AspectRatio,
  type ImageStyle,
} from "@/lib/services/ai-image";
import { tryConsumeImageQuota, releaseImageQuota } from "@/lib/services/ai-image-quota-atomic";
import { estimateCost, recordAiUsage } from "@/lib/services/ai-quota";
import { RequestDedup } from "@/lib/services/request-dedup";

// ============================================================================
// Schema Validation
// ============================================================================

const ImageGenRequestSchema = z.object({
  prompt: z.string().max(1000).optional(),
  tweetContent: z.string().max(5000).optional(),
  model: z
    .enum(["nano-banana-2", "nano-banana-pro", "nano-banana", "gpt-image-2"])
    .default("nano-banana-2"),
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
interface ImagePromptResult {
  prompt: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
}

async function generateImagePromptFromTweet(tweetContent: string): Promise<ImagePromptResult> {
  // Sanitize: strip non-printable controls, normalize line endings, collapse
  // excessive blank lines, and cap at 500 chars (the schema allows up to 5000
  // but we don't need more than that for prompt generation).
  const sanitized = sanitizeForPrompt(tweetContent, 500);
  const aiModel = process.env.OPENROUTER_MODEL ?? "unknown";

  try {
    const openrouterProvider = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY || "" });

    if (!process.env.OPENROUTER_MODEL) {
      throw new Error("OPENROUTER_MODEL environment variable is not configured");
    }
    const fallbackBody = openrouterFallbackBody(aiModel, process.env.OPENROUTER_MODEL_FREE);

    // Note: Image prompts should always be in English for better visual generation
    // regardless of the user's language preference. The generated images will be
    // visual representations that work across languages.
    const result = await withRetry(() =>
      withTimeout(
        generateText({
          model: openrouterProvider(aiModel, {
            provider: { data_collection: "deny" as const },
            ...(fallbackBody && { extraBody: fallbackBody }),
          }) as unknown as LanguageModel,
          system: `You are an expert at creating vivid, specific image prompts for social media content.
Generate a visual prompt that captures the essence of the post.
Keep the prompt under 200 words. Focus on visual elements, composition, mood, and style.
Do not include text overlays in the image unless specifically requested.
Return ONLY the image prompt, no explanation or additional text.`,
          prompt: `Generate an image prompt for the following social media post (respond with only the image prompt, nothing else):\n\n---\n${sanitized}\n---`,
        }),
        45_000
      )
    );

    return {
      prompt: result.text.trim(),
      tokensIn: result.usage?.inputTokens ?? 0,
      tokensOut: result.usage?.outputTokens ?? 0,
      model: aiModel,
    };
  } catch (error) {
    logger.error("image_prompt_generation_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      prompt: `Visual representation of: ${sanitized.slice(0, 100)}`,
      tokensIn: 0,
      tokensOut: 0,
      model: aiModel,
    };
  }
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  // Tracks weighted image credits consumed in this request so they can be
  // released if generation fails to start (see catch block).
  let consumedUserId: string | null = null;
  let consumedWeight = 0;

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

    // Idempotency check — prevents double-starting predictions for the same client key.
    const idempotencyKey = req.headers.get("x-idempotency-key") || correlationId;
    const idemCheck = await checkIdempotency(userId, idempotencyKey);
    if (idemCheck.cached) return idemCheck.response;

    const dedupKey = RequestDedup.generateKey(userId, "ai_image", validationResult.data);
    const cachedResult = await RequestDedup.check<{
      predictionId: string;
      estimatedSeconds: number;
    }>(dedupKey);

    if (cachedResult) {
      logger.info("dedup_cache_hit", {
        userId,
        endpoint: "/api/ai/image",
        correlationId,
      });
      const res = Response.json(cachedResult);
      res.headers.set("x-correlation-id", correlationId);
      return res;
    }

    // 4. Plan checks — model gate + monthly image quota (standard 402 + upgrade_url on failure)
    const plan = await getUserPlanType(userId); // for rate-limit tier selection
    const modelAccess = await checkImageModelAccessDetailed(userId, model as ImageModel);
    if (!modelAccess.allowed) return createPlanLimitResponse(modelAccess);

    // 5. Rate limit
    const rateLimitResult = await checkRateLimit(userId, plan, "ai_image");
    if (!rateLimitResult.success) return createRateLimitResponse(rateLimitResult);

    // 6. Monthly image quota — ATOMIC, weighted by model cost, consumed up-front.
    //    Released below if startImageGeneration throws, and in the status route
    //    on terminal failure / cost-lowering fallback. Prevents the old
    //    non-atomic, unweighted, record-at-completion overage.
    const weight = IMAGE_MODEL_COST[model as ImageModel];
    const imageQuota = await tryConsumeImageQuota(userId, weight);
    if (!imageQuota.allowed) {
      return createPlanLimitResponse({
        allowed: false,
        error: "quota_exceeded",
        feature: "ai_quota",
        message:
          "Create more AI images this month to keep your feed visually engaging — upgrade to Pro",
        plan,
        limit: imageQuota.limit,
        used: imageQuota.used,
        suggestedPlan: "pro_monthly",
        trialActive: false,
        resetAt: imageQuota.resetAt,
      });
    }
    consumedUserId = userId;
    consumedWeight = weight;

    // 7. Generate or use provided prompt
    let finalPrompt = prompt;

    if (!finalPrompt && tweetContent) {
      // Auto-generate prompt from tweet content via OpenRouter.
      // Record this LLM call in aiGenerations so it appears in the usage ledger
      // alongside the image generation it precedes — operators can see the true
      // AI cost per image request, and quota dashboards reflect both operations.
      const promptResult = await generateImagePromptFromTweet(tweetContent);
      finalPrompt = promptResult.prompt;

      // Fire-and-forget usage record; errors here must not block the image flow.
      // Captures real token usage + model so the auxiliary LLM cost is no longer
      // invisible in the ledger (was hardcoded to 0).
      recordAiUsage({
        userId,
        type: "image_prompt",
        model: promptResult.model,
        subFeature: "image.prompt_gen",
        tokensIn: promptResult.tokensIn,
        tokensOut: promptResult.tokensOut,
        costEstimateCents: Math.round(
          estimateCost(promptResult.model, promptResult.tokensIn, promptResult.tokensOut)
        ),
        inputPrompt: tweetContent.slice(0, 2000),
      }).catch((err: unknown) => {
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
      JSON.stringify({
        userId,
        model,
        finalPrompt,
        aspectRatio,
        style: style ?? null,
        consumedWeight: weight,
      })
    );

    // Quota responsibility handed off to the status route (which releases on
    // failure / fallback). Clear local tracking so the catch block below — which
    // only fires on a throw — does not double-release after a started prediction.
    consumedWeight = 0;
    consumedUserId = null;

    // 10. Return prediction ID — client will poll for the result.
    const result = { predictionId, estimatedSeconds: 20 };
    await RequestDedup.cache(dedupKey, result, 60);

    // Cache successful response for idempotent replay.
    await cacheIdempotentResponse(userId, idempotencyKey, 200, JSON.stringify(result), {
      "x-correlation-id": correlationId,
      "content-type": "application/json",
    });

    const res = Response.json(result);
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    // Release image quota if it was consumed but the prediction never started.
    if (consumedUserId && consumedWeight > 0) {
      await releaseImageQuota(consumedUserId, consumedWeight).catch(() => void 0);
    }

    logger.error("image_generation_failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return ApiError.internal("Failed to generate image");
  }
}
