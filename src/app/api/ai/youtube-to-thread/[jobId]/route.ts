import "server-only";

import { and, eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { youtubeThreadQueue } from "@/lib/queue/client";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { youtubeThreadJobs } from "@/lib/schema";
import { releaseAiQuota } from "@/lib/services/ai-quota-atomic";
import { getTeamContext } from "@/lib/team-context";

// ── GET: Return job status and result ───────────────────────────────────────

export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const correlationId = getCorrelationId(req);

  // Step 1: Auth
  const ctx = await getTeamContext();
  if (!ctx) {
    return ApiError.unauthorized();
  }

  // Status polling is read-only and a single client can poll every ~5s.
  // The "ai" rate limit (200/hr Pro) gets exhausted in ~17min of polling,
  // breaking long-running jobs. Skip rate limiting on GET — auth is enough.

  const { jobId } = await params;

  try {
    // Step 3: Load job row
    const job = await db.query.youtubeThreadJobs.findFirst({
      where: eq(youtubeThreadJobs.id, jobId),
    });

    if (!job) {
      return ApiError.notFound("YouTube thread job");
    }

    // Step 4: Ownership check
    if (job.userId !== ctx.session.user.id) {
      return ApiError.forbidden("You do not own this YouTube thread job.");
    }

    // Step 5: Return status
    const res = Response.json({
      jobId: job.id,
      status: job.status,
      youtubeVideoId: job.youtubeVideoId,
      provider: job.provider,
      language: job.language,
      tweetCount: job.tweetCount,
      durationSeconds: job.durationSeconds,
      threadResult: job.threadResult,
      error: job.error,
      errorCode: job.errorCode,
      transcript: job.status === "ready" ? job.transcript : undefined,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("youtube_thread_status_error", {
      correlationId,
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to fetch YouTube thread job status.");
  }
}

// ── DELETE: Cancel a queued or processing job ───────────────────────────────

export async function DELETE(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const correlationId = getCorrelationId(req);

  // Step 1: Auth
  const ctx = await getTeamContext();
  if (!ctx) {
    return ApiError.unauthorized();
  }

  // Step 2: Role check — viewers cannot mutate
  if (ctx.role === "viewer") {
    return ApiError.forbidden("Viewers cannot cancel YouTube thread jobs");
  }

  // Step 3: Rate limit
  const rlResult = await checkRateLimit(ctx.currentTeamId, ctx.session.user.id, "ai");
  if (!rlResult.success) return createRateLimitResponse(rlResult);

  const { jobId } = await params;

  try {
    // Step 4: Load job row
    const job = await db.query.youtubeThreadJobs.findFirst({
      where: eq(youtubeThreadJobs.id, jobId),
    });

    if (!job) {
      return ApiError.notFound("YouTube thread job");
    }

    // Step 5: Ownership check
    if (job.userId !== ctx.session.user.id) {
      return ApiError.forbidden("You do not own this YouTube thread job.");
    }

    // Step 6: Bail on terminal states
    if (job.status === "ready" || job.status === "failed") {
      return ApiError.badRequest(
        `Job is already in terminal status "${job.status}". Cannot cancel.`
      );
    }

    // Step 7: Atomic flip of quota_released — only the first caller succeeds.
    // Using WHERE quota_released = false makes this idempotent across retries/double-clicks.
    const flipped = await db
      .update(youtubeThreadJobs)
      .set({
        status: "failed",
        error: "user_cancelled",
        errorCode: "CANCELLED",
        quotaReleased: true,
        updatedAt: new Date(),
      })
      .where(and(eq(youtubeThreadJobs.id, jobId), eq(youtubeThreadJobs.quotaReleased, false)))
      .returning({ quotaConsumed: youtubeThreadJobs.quotaConsumed });

    // Step 7b: Release quota counter — only if we were the ones who flipped the flag
    if (flipped.length > 0) {
      try {
        await releaseAiQuota(ctx.session.user.id, flipped[0]!.quotaConsumed ?? 5);
      } catch (quotaErr) {
        logger.error("youtube_thread_release_quota_failed", {
          correlationId,
          jobId,
          error: quotaErr instanceof Error ? quotaErr.message : String(quotaErr),
        });
      }
    } else {
      // Already released — still ensure status is updated for terminal cancel path
      await db
        .update(youtubeThreadJobs)
        .set({
          status: "failed",
          error: "user_cancelled",
          errorCode: "CANCELLED",
          updatedAt: new Date(),
        })
        .where(eq(youtubeThreadJobs.id, jobId));
    }

    // Step 8: Best-effort remove from BullMQ if still queued
    try {
      const bullJob = await youtubeThreadQueue.getJob(jobId);
      if (bullJob) {
        await bullJob.remove();
        logger.info("youtube_thread_job_removed_from_queue", {
          correlationId,
          jobId,
          bullJobId: bullJob.id,
        });
      }
    } catch (queueErr) {
      logger.warn("youtube_thread_remove_from_queue_failed", {
        correlationId,
        jobId,
        error: queueErr instanceof Error ? queueErr.message : String(queueErr),
      });
    }

    logger.info("youtube_thread_job_cancelled", {
      correlationId,
      jobId,
      userId: ctx.currentTeamId,
    });

    const res = Response.json({ jobId, status: "failed", error: "user_cancelled" });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("youtube_thread_cancel_error", {
      correlationId,
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to cancel YouTube thread job.");
  }
}
