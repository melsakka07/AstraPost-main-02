import "server-only";

import { and, eq, or, sql } from "drizzle-orm";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  checkYoutubeToThreadAccessDetailed,
  checkYoutubeToThreadMonthlyDetailed,
  createPlanLimitResponse,
} from "@/lib/middleware/require-plan";
import { youtubeThreadQueue, YOUTUBE_THREAD_JOB_OPTIONS } from "@/lib/queue/client";
import { youtubeThreadJobs } from "@/lib/schema";
import { youtubeToThreadRequestSchema } from "@/lib/schemas/youtube-to-thread";
import { validateYoutubeUrl, getVideoInfo } from "@/lib/services/youtube";

// ── POST: Create and enqueue a YouTube-to-thread job ───────────────────────

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);
  let jobId: string | null = null;
  let releaseQuota: () => Promise<void> = async () => {};

  try {
    // Step 1: Parse and validate body first (needed for preview mode)
    const json = await req.json();
    const parsed = youtubeToThreadRequestSchema.safeParse(json);
    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    const {
      youtubeUrl,
      provider,
      language,
      tweetCount,
      tone = "casual",
      previewOnly = false,
    } = parsed.data;

    // Step 2-5: Auth, rate limit, feature gate, quota (skip quota in preview mode)
    const preamble = await aiPreamble({
      featureGate: checkYoutubeToThreadAccessDetailed,
      quotaWeight: 5,
      correlationId,
      promptVersion: "youtube_to_thread:v1",
      skipQuotaCheck: previewOnly,
    });
    if (preamble instanceof Response) return preamble;
    const { session, releaseQuota: preambleReleaseQuota } = preamble;
    releaseQuota = preambleReleaseQuota;

    // Step 7: Validate YouTube URL
    const validation = validateYoutubeUrl(youtubeUrl);
    if (!validation.valid) {
      await releaseQuota();
      return ApiError.badRequest(validation.error ?? "Invalid YouTube URL");
    }

    const videoId = validation.videoId!;

    // Step 8: Get video info (rejects if duration > 5400s or < 30s, or video inaccessible)
    let videoInfo: Awaited<ReturnType<typeof getVideoInfo>>;
    try {
      videoInfo = await getVideoInfo(youtubeUrl);
    } catch (err) {
      await releaseQuota();
      const message = err instanceof Error ? err.message : String(err);
      logger.warn("youtube_to_thread_video_info_failed", {
        correlationId,
        youtubeUrl,
        error: message,
      });
      return ApiError.badRequest("Failed to access the video. Please check the URL and try again.");
    }

    if (previewOnly) {
      const previewRes = Response.json({
        status: "validated",
        videoTitle: videoInfo.title,
        durationSeconds: videoInfo.durationSeconds,
        thumbnailUrl: videoInfo.thumbnailUrl,
      });
      previewRes.headers.set("x-correlation-id", correlationId);
      return previewRes;
    }

    // Step 8a: Monthly count cap — prevents users from exceeding their tier's YouTube limit
    const monthlyCheck = await checkYoutubeToThreadMonthlyDetailed(session.user.id);
    if (!monthlyCheck.allowed) {
      await releaseQuota();
      return createPlanLimitResponse(monthlyCheck);
    }

    // Step 8b: Idempotency check — prevent double-submit for same video within 60s
    const existingJob = await db.query.youtubeThreadJobs.findFirst({
      where: and(
        eq(youtubeThreadJobs.userId, session.user.id),
        eq(youtubeThreadJobs.youtubeVideoId, videoId),
        or(
          eq(youtubeThreadJobs.status, "queued"),
          eq(youtubeThreadJobs.status, "downloading"),
          eq(youtubeThreadJobs.status, "transcribing"),
          eq(youtubeThreadJobs.status, "generating")
        ),
        sql`${youtubeThreadJobs.createdAt} > now() - interval '60 seconds'`
      ),
      columns: { id: true },
    });

    if (existingJob) {
      await releaseQuota();
      return Response.json(
        {
          error:
            "A job for this video is already in progress. Please wait for it to complete or cancel it first.",
          existingJobId: existingJob.id,
        },
        { status: 409 }
      );
    }

    // Step 9: Check provider API key is configured
    if (provider === "deepgram") {
      const env = getServerEnv();
      if (!env.YOUTUBE_DEEPGRAM_API_KEY) {
        await releaseQuota();
        return ApiError.serviceUnavailable("Deepgram is not configured. Please contact support.");
      }
    } else {
      const env = getServerEnv();
      if (!env.OPENAI_API_KEY) {
        await releaseQuota();
        return ApiError.serviceUnavailable(
          "Whisper (OpenAI) is not configured. Please contact support."
        );
      }
    }

    // Step 10: db.transaction() — insert new job row with status "queued"
    const newJobId = crypto.randomUUID();
    jobId = newJobId;

    await db.transaction(async (tx) => {
      await tx.insert(youtubeThreadJobs).values({
        id: newJobId,
        userId: session.user.id,
        correlationId,
        status: "queued",
        youtubeUrl,
        youtubeVideoId: videoId,
        provider,
        language,
        tone,
        tweetCount,
        durationSeconds: videoInfo.durationSeconds,
        quotaConsumed: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Step 11: Enqueue to BullMQ AFTER transaction commits (hard rule #13)
    await youtubeThreadQueue.add(
      "youtubeThread",
      { jobId, userId: session.user.id, correlationId },
      { jobId, ...YOUTUBE_THREAD_JOB_OPTIONS }
    );

    logger.info("youtube_thread_enqueued", {
      correlationId,
      jobId,
      userId: session.user.id,
      youtubeVideoId: videoId,
      provider,
      language,
      durationSeconds: videoInfo.durationSeconds,
    });

    // Step 12: Return
    const res = Response.json({
      jobId,
      status: "queued",
      videoTitle: videoInfo.title,
      durationSeconds: videoInfo.durationSeconds,
      thumbnailUrl: videoInfo.thumbnailUrl,
    });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    if (jobId) {
      await db
        .update(youtubeThreadJobs)
        .set({ quotaReleased: true, updatedAt: new Date() })
        .where(eq(youtubeThreadJobs.id, jobId));
    }
    try {
      await releaseQuota();
    } catch (quotaErr) {
      logger.error("youtube_thread_enqueue_release_quota_failed", {
        correlationId,
        jobId,
        error: quotaErr instanceof Error ? quotaErr.message : String(quotaErr),
      });
    }
    logger.error("youtube_thread_enqueue_error", {
      correlationId,
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to enqueue YouTube thread job.");
  }
}
