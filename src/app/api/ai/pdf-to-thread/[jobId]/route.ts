import "server-only";

import { eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getUserPlanType } from "@/lib/middleware/require-plan";
import { pdfThreadQueue } from "@/lib/queue/client";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { pdfThreadJobs } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

// ── GET: Return job status and result ───────────────────────────────────────

export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const correlationId = getCorrelationId(req);

  // Step 1: Auth
  const ctx = await getTeamContext();
  if (!ctx) {
    return ApiError.unauthorized();
  }

  // Step 2: Rate limit
  const plan = await getUserPlanType(ctx.currentTeamId);
  const rlResult = await checkRateLimit(ctx.currentTeamId, plan, "ai");
  if (!rlResult.success) return createRateLimitResponse(rlResult);

  const { jobId } = await params;

  try {
    // Step 3: Load job row
    const job = await db.query.pdfThreadJobs.findFirst({
      where: eq(pdfThreadJobs.id, jobId),
    });

    if (!job) {
      return ApiError.notFound("PDF job");
    }

    // Step 4: Ownership check
    if (job.userId !== ctx.session.user.id) {
      return ApiError.forbidden("You do not own this PDF job.");
    }

    // Step 5: Return status
    const res = Response.json({
      jobId: job.id,
      status: job.status,
      charCount: job.charCount,
      pageCount: job.pageCount,
      threadResult: job.threadResult,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error(
      `pdf_thread_status_error: ${(error instanceof Error ? error.message : String(error)).slice(0, 200)}`,
      {
        correlationId,
        jobId,
      }
    );
    return ApiError.internal("Failed to fetch PDF job status.");
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
    return ApiError.forbidden("Viewers cannot cancel PDF jobs");
  }

  // Step 3: Rate limit
  const plan = await getUserPlanType(ctx.currentTeamId);
  const rlResult = await checkRateLimit(ctx.currentTeamId, plan, "ai");
  if (!rlResult.success) return createRateLimitResponse(rlResult);

  const { jobId } = await params;

  try {
    // Step 4: Load job row
    const job = await db.query.pdfThreadJobs.findFirst({
      where: eq(pdfThreadJobs.id, jobId),
    });

    if (!job) {
      return ApiError.notFound("PDF job");
    }

    // Step 5: Ownership check
    if (job.userId !== ctx.session.user.id) {
      return ApiError.forbidden("You do not own this PDF job.");
    }

    // Step 6: Bail on terminal states
    if (job.status === "ready" || job.status === "failed") {
      return ApiError.badRequest(
        `Job is already in terminal status "${job.status}". Cannot cancel.`
      );
    }

    // Step 5: Mark as failed with user_cancelled reason
    await db
      .update(pdfThreadJobs)
      .set({
        status: "failed",
        error: "user_cancelled",
        updatedAt: new Date(),
      })
      .where(eq(pdfThreadJobs.id, jobId));

    // Step 6: Best-effort remove from BullMQ if still queued
    try {
      const bullJob = await pdfThreadQueue.getJob(jobId);
      if (bullJob) {
        await bullJob.remove();
        logger.info("pdf_thread_job_removed_from_queue", {
          correlationId,
          jobId,
          bullJobId: bullJob.id,
        });
      }
    } catch (queueErr) {
      logger.warn("pdf_thread_remove_from_queue_failed", {
        correlationId,
        jobId,
        error: queueErr instanceof Error ? queueErr.message : String(queueErr),
      });
    }

    logger.info("pdf_thread_job_cancelled", {
      correlationId,
      jobId,
      userId: ctx.currentTeamId,
    });

    const res = Response.json({ jobId, status: "failed", error: "user_cancelled" });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error(
      `pdf_thread_cancel_error: ${(error instanceof Error ? error.message : String(error)).slice(0, 200)}`,
      {
        correlationId,
        jobId,
      }
    );
    return ApiError.internal("Failed to cancel PDF job.");
  }
}
