/**
 * AI Image Status API
 * GET /api/ai/image/status?id=<predictionId>
 *
 * Polls a single Replicate prediction. When the prediction succeeds:
 *   - Downloads the generated image
 *   - Uploads it to durable storage
 *   - Records usage in aiGenerations (idempotent via atomic Redis DEL)
 *   - Returns the stored URL + metadata
 *
 * The caller (ai-image-dialog) polls every 2 s until status is "succeeded"
 * or an error is returned.
 *
 * ## Fallback Logic
 *
 * This endpoint implements a robust, silent fallback mechanism to ensure a smooth
 * user experience when models fail:
 *
 * ### 1. Credit Protection
 * - Credits are NEVER consumed on failure
 * - The `aiGenerations` table is only written when status === "succeeded"
 * - This protects users from being charged for failed generations
 *
 * ### 2. Content Safety Checks (No Fallback)
 * - If the prediction fails due to content moderation, it is identified as a
 *   CONTENT_BLOCKED error
 * - Error patterns: safety, content.?polic, blocked, violat, forbidden, HARM, E002
 * - Action: Immediately returns a permanent error - no fallback is attempted
 * - User must adjust their prompt and try again
 *
 * ### 3. Automatic Model Fallback
 * - If the primary model (nano-banana-2) fails for any non-content reason:
 *   - Automatically and silently starts a new prediction using the backup model (nano-banana)
 *   - Updates Redis cache with the new model state
 *   - Returns { status: "fallback", predictionId: newPredictionId } to the client
 *   - The client seamlessly updates its internal tracking and continues polling
 * - User sees "Switching to backup model…" toast notification
 *
 * - If the secondary model (nano-banana-pro) fails for any non-content reason:
 *   - Same automatic fallback to nano-banana applies
 *   - Transparent to the user - no credit charged for the failed attempt
 *
 * ### 4. Transient Errors
 * - If the fallback also fails, or if the service is completely overloaded:
 *   - Returns SERVICE_UNAVAILABLE error with retryable: true
 *   - Error patterns: high.?demand, unavailable, rate.?limit, E003, ModelRateLimit,
 *     capacity, try.?again, busy, 503
 *   - User can retry the request later when the service is less busy
 *
 * ## Response Status Codes
 *
 * - `starting` / `processing`: Generation in progress, keep polling
 * - `succeeded`: Generation complete, returns imageUrl + metadata
 * - `fallback`: Primary/secondary failed, retrying with backup model
 * - `failed`: Generation failed with error details (check retryable flag)
 */

import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { cache } from "@/lib/cache";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkRateLimit, createRateLimitResponse, redis } from "@/lib/rate-limiter";
import { aiGenerations, user } from "@/lib/schema";
import {
  checkImagePrediction,
  downloadImage,
  getDimensionsFromAspectRatio,
  startImageGeneration,
  type AspectRatio,
  type ImageModel,
  type ImageStyle,
} from "@/lib/services/ai-image";
import { upload } from "@/lib/storage";

interface PredictionMeta {
  userId: string;
  model: ImageModel;
  finalPrompt: string;
  aspectRatio: AspectRatio;
  style: ImageStyle | null;
  firstPolledAt?: number;
}

export async function GET(req: NextRequest) {
  const correlationId = getCorrelationId(req);

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return ApiError.unauthorized();
  }

  const predictionId = req.nextUrl.searchParams.get("id");
  if (!predictionId) {
    return ApiError.badRequest("Missing prediction ID");
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { plan: true },
  });

  const rateLimit = await checkRateLimit(session.user.id, dbUser?.plan || "free", "ai_image");
  if (!rateLimit.success) return createRateLimitResponse(rateLimit);

  // Retrieve prediction metadata cached by the POST endpoint.
  const raw = await redis.get(`ai:img:pred:${predictionId}`);
  if (!raw) {
    return ApiError.notFound("Prediction not found or expired");
  }

  const meta: PredictionMeta = JSON.parse(raw);

  // Enforce ownership — only the user who created the prediction may poll it.
  if (meta.userId !== session.user.id) {
    return ApiError.forbidden("You do not have access to this prediction");
  }

  try {
    const prediction = await checkImagePrediction(predictionId);

    // Still running — tell the client to keep polling.
    if (prediction.status === "starting" || prediction.status === "processing") {
      if (meta.firstPolledAt === undefined) {
        // First poll for this prediction — record the start time.
        meta.firstPolledAt = Date.now();
        await redis.setex(`ai:img:pred:${predictionId}`, 1800, JSON.stringify(meta));
      } else if (Date.now() - meta.firstPolledAt > 90_000) {
        // Exceeded 90-second poll cap — abort the prediction to avoid hanging.
        await redis.del(`ai:img:pred:${predictionId}`);
        logger.warn("image_poll_timeout", {
          predictionId,
          elapsedMs: Date.now() - meta.firstPolledAt,
        });
        const res = Response.json(
          {
            error: "Image generation timed out. Your credits were not used.",
            code: "POLL_TIMEOUT",
            retryable: true,
          },
          { status: 422 }
        );
        res.headers.set("x-correlation-id", correlationId);
        return res;
      }

      const res = Response.json({ status: prediction.status });
      res.headers.set("x-correlation-id", correlationId);
      return res;
    }

    // Terminal failure — classify, then decide whether to fall back to the
    // other model or surface a structured error to the client.
    // Credits are NEVER consumed on failure — aiGenerations is only written on
    // "succeeded", so the user's image quota is always safe here.
    if (prediction.status === "failed" || prediction.status === "canceled") {
      const rawError = prediction.error ?? `Prediction ${prediction.status}`;

      // Permanent: prompt blocked by content-safety filters — no fallback.
      const isContentBlocked = /safety|content.?polic|blocked|violat|forbidden|HARM|E002/i.test(
        rawError
      );

      // Automatic model fallback: if the primary or secondary model fails for
      // any non-content-blocked reason, silently retry with the backup model (nano-banana).
      // The fallback is transparent to the user — no credit is charged for the
      // failed attempt, and the new prediction ID is returned so the client can
      // keep polling without interruption.
      if (
        (meta.model === "nano-banana-2" || meta.model === "nano-banana-pro") &&
        !isContentBlocked
      ) {
        await redis.del(`ai:img:pred:${predictionId}`);

        try {
          const fallback = await startImageGeneration({
            prompt: meta.finalPrompt,
            aspectRatio: meta.aspectRatio,
            model: "nano-banana" as ImageModel,
            ...(meta.style !== null && { style: meta.style }),
          });

          // Cache fallback metadata under the new prediction ID.
          // Reset firstPolledAt so the fallback gets a fresh 90 s poll window.
          const { firstPolledAt: _unused, ...metaRest } = meta;
          const fallbackMeta: PredictionMeta = {
            ...metaRest,
            model: "nano-banana" as ImageModel,
          };
          await redis.setex(
            `ai:img:pred:${fallback.predictionId}`,
            1800,
            JSON.stringify(fallbackMeta)
          );

          const res = Response.json({
            status: "fallback",
            predictionId: fallback.predictionId,
          });
          res.headers.set("x-correlation-id", correlationId);
          return res;
        } catch (fallbackErr) {
          // If the fallback prediction itself fails to start, fall through to
          // the normal error path so the user sees a meaningful message.
          logger.error("image_fallback_prediction_failed", {
            error: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr),
            predictionId,
          });
        }
      }

      // Remove the key now that we know we won't fall back.
      await redis.del(`ai:img:pred:${predictionId}`);

      // Transient: service overload / rate limit from the underlying model
      const isTransient =
        /high.?demand|unavailable|rate.?limit|E003|ModelRateLimit|capacity|try.?again|busy|503/i.test(
          rawError
        );

      const res = Response.json(
        {
          error: isTransient
            ? "The image service is temporarily busy due to high demand. Your credits were not used."
            : isContentBlocked
              ? "Your prompt was blocked by content safety filters. Try adjusting your description and generate again."
              : rawError,
          code: isTransient
            ? "SERVICE_UNAVAILABLE"
            : isContentBlocked
              ? "CONTENT_BLOCKED"
              : "GENERATION_FAILED",
          retryable: isTransient,
        },
        { status: 422 }
      );
      res.headers.set("x-correlation-id", correlationId);
      return res;
    }

    // status === "succeeded" ─────────────────────────────────────────────────

    if (!prediction.output) {
      await redis.del(`ai:img:pred:${predictionId}`);
      return ApiError.internal("No output returned from prediction");
    }

    const replicateUrl =
      typeof prediction.output === "string" ? prediction.output : prediction.output[0]!;

    const { width, height } = getDimensionsFromAspectRatio(meta.aspectRatio);

    // Download and upload to durable storage.
    let storedUrl = replicateUrl;
    try {
      const buffer = await downloadImage(replicateUrl);
      const filename = `ai-image-${nanoid()}.png`;
      const uploadResult = await upload(buffer, filename, "ai-images");
      if (uploadResult.url) storedUrl = uploadResult.url;
    } catch (uploadErr) {
      // Non-fatal: fall back to the ephemeral Replicate URL.
      logger.error("image_upload_failed_using_replicate_url", {
        error: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
        predictionId,
      });
    }

    // Atomic Redis DEL is used for idempotency: if two concurrent requests both
    // receive "succeeded", only the one that successfully deletes the key (DEL
    // returns 1) records usage.  The other returns the result without re-recording.
    const deleted = await redis.del(`ai:img:pred:${predictionId}`);
    if (deleted === 1) {
      await db.insert(aiGenerations).values({
        id: nanoid(),
        userId: meta.userId,
        type: "image",
        inputPrompt: meta.finalPrompt,
        outputContent: {
          predictionId,
          model: meta.model,
          aspectRatio: meta.aspectRatio,
          style: meta.style,
          imageUrl: storedUrl,
          width,
          height,
        },
        createdAt: new Date(),
      });
      // Invalidate sidebar image quota cache so the indicator updates immediately.
      const now = new Date();
      await cache
        .delete(`ai:image-usage:${meta.userId}:${now.getFullYear()}-${now.getMonth()}`)
        .catch(() => void 0);
    }

    const res = Response.json({
      status: "succeeded",
      imageUrl: storedUrl,
      width,
      height,
      model: meta.model,
      prompt: meta.finalPrompt,
    });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("image_status_check_failed", {
      error: error instanceof Error ? error.message : String(error),
      predictionId,
    });
    return ApiError.internal("Failed to check prediction status");
  }
}
