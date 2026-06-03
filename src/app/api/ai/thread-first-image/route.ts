/**
 * Thread First-Tweet Image Endpoint
 * POST /api/ai/thread-first-image
 *
 * Generates an editorial 16:9 image via Replicate nano-banana-2 for the first tweet
 * of a PDF-to-Thread or YouTube-to-Thread output. Called from the client after the
 * thread text is ready, before navigating to the Composer.
 *
 * Image quota is enforced atomically via tryConsumeImageQuota (consumed up-front,
 * released on failure). Usage is recorded inside generateAgenticImage — do NOT
 * double-record.
 *
 * Does not use aiPreamble(): this is an image-only route (Replicate, not OpenRouter).
 * Auth, rate-limit, and quota gates are wired manually to avoid charging a text-generation
 * quota slot or instantiating an unused LanguageModel.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import {
  checkPdfToThreadAccessDetailed,
  checkYoutubeToThreadAccessDetailed,
  createPlanLimitResponse,
  getUserPlanType,
} from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { generateAgenticImage } from "@/lib/services/ai-image";
import { tryConsumeImageQuota, releaseImageQuota } from "@/lib/services/ai-image-quota-atomic";
import { getTeamContext } from "@/lib/team-context";

const ThreadFirstImageSchema = z.object({
  prompt: z.string().min(5).max(600),
  source: z.enum(["pdf-to-thread", "youtube-to-thread"]),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const ctx = await getTeamContext();
    if (!ctx) return new Response("Unauthorized", { status: 401 });

    // 2. Role check — reject viewers
    if (ctx.role === "viewer") {
      return ApiError.forbidden("Viewers cannot generate images");
    }

    // 3. Correlation ID
    const correlationId = getCorrelationId(req);
    const userId = ctx.currentTeamId;

    logger.info("thread_first_image_request", { correlationId, userId });

    // 4. Parse + validate
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return ApiError.badRequest("Invalid JSON body");
    }

    const parsed = ThreadFirstImageSchema.safeParse(body);
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { prompt, source } = parsed.data;

    // 5. Rate limit (cheapest check first — runs before any DB queries)
    const plan = await getUserPlanType(userId);
    const rl = await checkRateLimit(userId, plan, "ai_image");
    if (!rl.success) return createRateLimitResponse(rl);

    // 6. Source-specific feature gate — both features require Pro
    if (source === "pdf-to-thread") {
      const access = await checkPdfToThreadAccessDetailed(userId);
      if (!access.allowed) return createPlanLimitResponse(access);
    } else {
      const access = await checkYoutubeToThreadAccessDetailed(userId);
      if (!access.allowed) return createPlanLimitResponse(access);
    }

    // 7. Monthly image quota — ATOMIC, consumed up-front (editorial nano-banana = weight 1).
    const imageQuota = await tryConsumeImageQuota(userId, 1);
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

    // 8. Generate image
    // Usage is recorded inside generateAgenticImage — do NOT double-record.
    const result = await generateAgenticImage({
      userId,
      prompt,
      style: "editorial",
      aspectRatio: "16:9",
    });

    if ("error" in result) {
      // Release the up-front consumption — the generation failed.
      await releaseImageQuota(userId, 1).catch(() => void 0);
      logger.error("thread_first_image_generation_failed", {
        error: result.error,
        userId,
        correlationId,
        source,
      });
      return ApiError.internal("Failed to generate image for first tweet");
    }

    // 9. Return — 16:9 yields 1344×768 (see getDimensionsFromAspectRatio)
    const res = Response.json({ url: result.url, width: 1344, height: 768 });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("thread_first_image_unexpected_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to generate image");
  }
}
