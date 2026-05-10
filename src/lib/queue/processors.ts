import "server-only";

import { readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { Job, DelayedError, UnrecoverableError } from "bullmq";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import { type InferSelectModel, eq, and, or, sql, isNotNull, isNull, lt } from "drizzle-orm";
import { z } from "zod";
import { INPUT_LIMITS } from "@/lib/ai/input-limits";
import { buildLanguageBlock } from "@/lib/ai/language";
import { redactPII } from "@/lib/ai/pii";
import { buildSummarizePrompt } from "@/lib/ai/summarize-prompts";
import { JAILBREAK_GUARD } from "@/lib/ai/untrusted";
import { db } from "@/lib/db";
import { checkMilestone } from "@/lib/gamification";
import { logger } from "@/lib/logger";
import {
  scheduleQueue,
  SCHEDULE_JOB_OPTIONS,
  type PublishPostPayload,
  type AnalyticsJobPayload,
  type RefreshXTiersJobPayload,
  type TokenHealthJobPayload,
  type PdfThreadJobPayload,
  type YoutubeThreadJobPayload,
} from "@/lib/queue/client";
import {
  posts,
  jobRuns,
  user,
  tweets,
  media,
  notifications,
  xAccounts,
  failedJobs,
  pdfThreadJobs,
  youtubeThreadJobs,
} from "@/lib/schema";
import type { XSubscriptionTier } from "@/lib/schemas/common";
import { pdfThreadOutputSchema } from "@/lib/schemas/pdf-to-thread";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";
import { releaseAiQuota } from "@/lib/services/ai-quota-atomic";
import { refreshFollowersAndMetricsForRuns, updateTweetMetrics } from "@/lib/services/analytics";
import {
  sendPostFailureEmail,
  sendTokenExpiringEmail,
  sendAccountDeactivatedEmail,
} from "@/lib/services/email";
import { moderateOutput } from "@/lib/services/moderation";
import { transcribe } from "@/lib/services/transcription";
import { XApiService } from "@/lib/services/x-api";
import { classifyRefreshError, getBackoffForFailures } from "@/lib/services/x-error";
import { canPostLongContent } from "@/lib/services/x-subscription";
import { extractAudio, getAudioMimeType } from "@/lib/services/youtube";

/** Shape of a post as loaded by the schedule processor (post + tweets + media). */
type FullPost = InferSelectModel<typeof posts> & {
  tweets: (InferSelectModel<typeof tweets> & {
    media: InferSelectModel<typeof media>[];
  })[];
  xAccount: InferSelectModel<typeof xAccounts> | null;
};

/** Max date into the future we will ever enqueue a recurrence job (1 year from now). */
const MAX_RECURRENCE_FUTURE_MS = 365 * 24 * 60 * 60 * 1000;

export const scheduleProcessor = async (job: Job<PublishPostPayload>) => {
  const { postId, userId, correlationId } = job.data;
  logger.info("schedule_job_started", {
    queue: job.queueName,
    jobId: job.id,
    postId,
    correlationId,
  });
  let post: FullPost | undefined;

  try {
    // 1. Fetch post and related tweets
    post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: {
        tweets: {
          orderBy: (tweets, { asc }) => [asc(tweets.position)],
          with: {
            media: true,
          },
        },
        xAccount: true,
      },
    });

    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    await db
      .insert(jobRuns)
      .values({
        id: crypto.randomUUID(),
        userId: post.userId,
        queueName: job.queueName,
        jobId: String(job.id),
        correlationId: correlationId || `${job.queueName}:${job.id}:${postId}`,
        postId,
        status: "running",
        attempts: job.opts?.attempts,
        attemptsMade: job.attemptsMade,
        startedAt: new Date(),
        finishedAt: null,
        error: null,
      })
      .onConflictDoUpdate({
        target: [jobRuns.queueName, jobRuns.jobId],
        set: {
          userId: post.userId,
          correlationId: correlationId || `${job.queueName}:${job.id}:${postId}`,
          postId,
          status: "running",
          attempts: job.opts?.attempts,
          attemptsMade: job.attemptsMade,
          startedAt: new Date(),
          finishedAt: null,
          error: null,
        },
      });

    if (post.status !== "scheduled" && post.status !== "paused_needs_reconnect") {
      logger.info("schedule_job_skipped", {
        queue: job.queueName,
        jobId: job.id,
        postId,
        correlationId,
        status: post.status,
      });
      return;
    }

    if (post.status === "paused_needs_reconnect") {
      if (!post.xAccount?.isActive) {
        logger.info("schedule_job_still_needs_reconnect", {
          queue: job.queueName,
          jobId: job.id,
          postId,
        });
        if (job.token) {
          // Delay by another hour to wait for reconnect
          await job.moveToDelayed(Date.now() + 60 * 60 * 1000, job.token);
          throw new DelayedError();
        }
        return;
      }
      // User has reconnected, change status back to scheduled visually or just proceed
      await db.update(posts).set({ status: "scheduled" }).where(eq(posts.id, postId));
    }

    const isDryRun = process.env.TWITTER_DRY_RUN === "1";

    if (!post.xAccountId) {
      throw new Error("Post has no associated X account");
    }
    const xAccountId = post.xAccountId;
    const xService = isDryRun
      ? {
          uploadMedia: async () => `dry_media_${crypto.randomUUID()}`,
          postTweet: async () => ({ data: { id: `dry_tweet_${crypto.randomUUID()}` } }),
          postTweetReply: async () => ({ data: { id: `dry_tweet_${crypto.randomUUID()}` } }),
        }
      : await XApiService.getClientForAccountId(xAccountId);

    if (!xService) {
      throw new Error("No connected X account");
    }

    // Pre-publish tier verification: check if content exceeds tier's character limit
    const accountTier = post.xAccount?.xSubscriptionTier as XSubscriptionTier | null;
    const maxAllowedChars = canPostLongContent(accountTier) ? 2_000 : 280;

    for (const tweetRow of post.tweets) {
      if (tweetRow.content.length > maxAllowedChars) {
        const tierLabel = accountTier ?? "None";
        const errorData = {
          code: "TIER_LIMIT_EXCEEDED",
          message: `Post exceeds ${maxAllowedChars} characters but the target X account (@${post.xAccount?.xUsername ?? "unknown"}) is on the ${tierLabel} tier. ${canPostLongContent(accountTier) ? "Posts longer than 2,000 characters are not supported." : "X Premium is required for posts longer than 280 characters."}`,
          postLength: tweetRow.content.length,
          accountTier: tierLabel,
          maxAllowed: maxAllowedChars,
        };

        logger.warn("schedule_job_tier_limit_exceeded", {
          queue: job.queueName,
          jobId: job.id,
          postId,
          correlationId,
          ...errorData,
        });

        await db
          .update(posts)
          .set({
            status: "failed",
            failReason: errorData.message,
            lastErrorCode: null,
            lastErrorAt: new Date(),
          })
          .where(eq(posts.id, postId));

        // Best-effort DB writes — wrapped so a failing insert cannot prevent
        // UnrecoverableError from being thrown (which would cause BullMQ retries).
        try {
          await db.insert(jobRuns).values({
            id: crypto.randomUUID(),
            userId: post.userId,
            queueName: job.queueName,
            jobId: String(job.id),
            correlationId: correlationId || `${job.queueName}:${job.id}:${postId}`,
            postId,
            status: "failed",
            attempts: job.opts?.attempts,
            attemptsMade: job.attemptsMade,
            startedAt: new Date(),
            finishedAt: new Date(),
            error: errorData.message,
          });
        } catch (insertErr) {
          logger.warn("tier_limit_job_run_insert_failed", {
            error: insertErr instanceof Error ? insertErr.message : String(insertErr),
            jobId: String(job.id),
            postId,
            correlationId,
          });
        }

        try {
          await db.insert(notifications).values({
            id: crypto.randomUUID(),
            userId: post.userId,
            type: "post_failed",
            title: "Post Too Long for X Account",
            message: errorData.message,
            metadata: errorData,
            isRead: false,
          });
        } catch (notifErr) {
          logger.warn("tier_limit_notification_insert_failed", {
            error: notifErr instanceof Error ? notifErr.message : String(notifErr),
            postId,
            correlationId,
          });
        }

        throw new UnrecoverableError(errorData.message);
      }
    }

    const loadMediaBuffer = async (fileUrl: string) => {
      if (fileUrl.startsWith("/")) {
        // Resolve the absolute path and assert it is within public/uploads/.
        // path.join() normalises ".." segments, so without this check a
        // DB record with fileUrl="/../../../etc/passwd" would read arbitrary
        // files from the server filesystem.
        const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
        // Strip leading slash so path.resolve doesn't treat fileUrl as an
        // absolute path (which would discard "public" on Windows).
        const filePath = path.resolve(process.cwd(), "public", fileUrl.replace(/^\//, ""));
        const withinUploads =
          filePath === uploadsRoot || filePath.startsWith(uploadsRoot + path.sep);
        if (!withinUploads) {
          throw new Error(
            `Path traversal detected: media URL "${fileUrl}" resolves outside uploads directory`
          );
        }
        return await readFile(filePath);
      }
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error("Failed to fetch media");
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    };

    const guessMimeType = (fileUrl: string, fileType: string | null) => {
      const ext = fileUrl.split("?")[0]!.split("#")[0]!.split(".").pop()?.toLowerCase();
      if (ext === "gif") return "image/gif";
      if (ext === "png") return "image/png";
      if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
      if (ext === "webp") return "image/webp";
      if (ext === "mp4") return "video/mp4";
      if (ext === "mov") return "video/quicktime";
      if (fileType === "gif") return "image/gif";
      if (fileType === "video") return "video/mp4";
      return "image/png";
    };

    // 3. Idempotent publish/resume (avoid duplicates on retries)
    if (post.tweets.length === 0) {
      throw new Error("Post has no tweets");
    }

    let lastTweetId: string | undefined;

    for (const tweetRow of post.tweets) {
      if (tweetRow.xTweetId) {
        lastTweetId = tweetRow.xTweetId;
        continue;
      }

      const mediaIds: string[] = [];
      for (const m of tweetRow.media) {
        if (!m.xMediaId) {
          const buffer = await loadMediaBuffer(m.fileUrl);
          const guessedMime = guessMimeType(m.fileUrl, m.fileType);
          const uploadedId = await xService.uploadMedia(buffer, guessedMime, {
            mediaCategory:
              m.fileType === "video"
                ? "tweet_video"
                : m.fileType === "gif"
                  ? "tweet_gif"
                  : "tweet_image",
          });
          await db.update(media).set({ xMediaId: uploadedId }).where(eq(media.id, m.id));
          mediaIds.push(uploadedId);
        } else {
          mediaIds.push(m.xMediaId);
        }
      }

      const result = lastTweetId
        ? await xService.postTweetReply(tweetRow.content, lastTweetId, mediaIds)
        : await xService.postTweet(tweetRow.content, mediaIds);

      const postedId = result.data.id;
      lastTweetId = postedId;

      await db.update(tweets).set({ xTweetId: postedId }).where(eq(tweets.id, tweetRow.id));
    }

    // 5. Atomically mark post published + record successful job run.
    // Combining these two writes in one transaction guarantees that the audit
    // record in job_runs is never missing when the post status is "published",
    // even if the process crashes immediately after the DB commit.
    await db.transaction(async (tx) => {
      await tx
        .update(posts)
        .set({
          status: "published",
          publishedAt: new Date(),
          failReason: null,
          lastErrorCode: null,
          lastErrorAt: null,
        })
        .where(eq(posts.id, postId));

      await tx
        .update(jobRuns)
        .set({
          status: "success",
          attempts: job.opts?.attempts,
          attemptsMade: job.attemptsMade,
          finishedAt: new Date(),
          error: null,
        })
        .where(and(eq(jobRuns.queueName, job.queueName), eq(jobRuns.jobId, String(job.id))));
    });

    // Check milestones (best-effort — failure here must not roll back the publish)
    await checkMilestone(post.userId, "post_published");

    // 6. Handle Recurrence
    if (post.recurrencePattern && post.scheduledAt) {
      let nextDate = new Date(post.scheduledAt);
      if (post.recurrencePattern === "daily") nextDate = addDays(nextDate, 1);
      else if (post.recurrencePattern === "weekly") nextDate = addWeeks(nextDate, 1);
      else if (post.recurrencePattern === "monthly") nextDate = addMonths(nextDate, 1);
      else if (post.recurrencePattern === "yearly") nextDate = addYears(nextDate, 1);

      const endDate = post.recurrenceEndDate ? new Date(post.recurrenceEndDate) : null;

      // Safety cap: never schedule recurrence more than 1 year into the future.
      // Prevents unbounded queue growth when no endDate is set or endDate is very far out.
      const maxFutureDate = new Date(Date.now() + MAX_RECURRENCE_FUTURE_MS);
      if (nextDate > maxFutureDate) {
        logger.warn("recurrence_cap_reached", {
          postId,
          nextDate,
          pattern: post.recurrencePattern,
          maxFutureDate,
        });
      } else if (!endDate || nextDate <= endDate) {
        const newPostId = crypto.randomUUID();

        // Bulk-insert recurrence: pre-generate all IDs, then insert in 3 batched calls
        // instead of N*M sequential round trips (up to 75 for a 15-tweet thread).
        const recurrenceTweetRows: (typeof tweets.$inferInsert)[] = [];
        const recurrenceMediaRows: (typeof media.$inferInsert)[] = [];

        for (const t of post.tweets) {
          const newTweetId = crypto.randomUUID();
          recurrenceTweetRows.push({
            id: newTweetId,
            postId: newPostId,
            content: t.content,
            position: t.position,
            mediaIds: t.mediaIds,
          });
          for (const m of t.media) {
            recurrenceMediaRows.push({
              id: crypto.randomUUID(),
              postId: newPostId,
              userId: post.userId,
              tweetId: newTweetId,
              fileUrl: m.fileUrl,
              fileType: m.fileType,
              fileSize: m.fileSize,
              xMediaId: m.xMediaId,
            });
          }
        }

        // Extract fields before async callbacks — TypeScript narrows past `if (!post)` throw
        // but control-flow analysis doesn't carry through async transaction callbacks.
        const postUserId = post.userId;
        const postXAccountId = post.xAccountId;
        const postGroupId = post.groupId;
        const postType = post.type;
        const postRecurrencePattern = post.recurrencePattern;
        const postRecurrenceEndDate = post.recurrenceEndDate;
        const postAiGenerated = post.aiGenerated;

        await db.transaction(async (tx) => {
          await tx.insert(posts).values({
            id: newPostId,
            userId: postUserId,
            xAccountId: postXAccountId,
            groupId: postGroupId,
            type: postType,
            status: "scheduled",
            scheduledAt: nextDate,
            recurrencePattern: postRecurrencePattern,
            recurrenceEndDate: postRecurrenceEndDate,
            aiGenerated: postAiGenerated,
          });
          if (recurrenceTweetRows.length > 0) await tx.insert(tweets).values(recurrenceTweetRows);
          if (recurrenceMediaRows.length > 0) await tx.insert(media).values(recurrenceMediaRows);
        });

        const delay = Math.max(0, nextDate.getTime() - Date.now());
        await scheduleQueue.add(
          "publish-post",
          { postId: newPostId, userId: post.userId, correlationId: `recurrence:${correlationId}` },
          { delay, jobId: newPostId, ...SCHEDULE_JOB_OPTIONS }
        );

        logger.info("recurrence_scheduled", { oldPostId: postId, newPostId, nextDate });
      }
    }

    logger.info("schedule_job_completed", {
      queue: job.queueName,
      jobId: job.id,
      postId,
      correlationId,
    });
  } catch (error) {
    const code = (error as any)?.code;
    // Extract the human-readable detail from the X API v2 error response.
    const xApiDetail: string =
      (error as any)?.data?.detail ||
      (error as any)?.data?.errors?.[0]?.message ||
      (error as any)?.data?.errors?.[0]?.detail ||
      "";

    const errorMsg = error instanceof Error ? error.message : String(error);

    // Circuit breaker is open — X API is degraded. Delay and retry.
    if (errorMsg.includes("X_CIRCUIT_OPEN")) {
      logger.warn("schedule_job_circuit_open", {
        queue: job.queueName,
        jobId: job.id,
        postId,
      });
      if (job.token) {
        await job.moveToDelayed(Date.now() + 5 * 60 * 1000, job.token);
        throw new DelayedError();
      }
      return;
    }

    // Token refresh was rate-limited — don't deactivate, back off with delay.
    if (errorMsg.includes("X_RATE_LIMITED") || errorMsg.includes("X_REFRESH_TRANSIENT")) {
      if (post?.xAccountId) {
        const account = await db.query.xAccounts.findFirst({
          where: eq(xAccounts.id, post.xAccountId),
          columns: { consecutiveRefreshFailures: true },
        });
        const consecutiveFailures = (account?.consecutiveRefreshFailures ?? 0) + 1;
        const failureType = errorMsg.includes("X_RATE_LIMITED") ? "rate_limited" : "transient";
        const backoff = getBackoffForFailures(failureType, consecutiveFailures);

        await db
          .update(xAccounts)
          .set({
            consecutiveRefreshFailures: consecutiveFailures,
            lastRefreshFailureAt: new Date(),
            refreshFailureReason: failureType,
          })
          .where(eq(xAccounts.id, post.xAccountId));

        logger.warn("schedule_job_token_refresh_transient", {
          queue: job.queueName,
          jobId: job.id,
          postId,
          xAccountId: post.xAccountId,
          failureType,
          consecutiveFailures,
          backoffMs: backoff,
        });

        if (job.token) {
          await job.moveToDelayed(Date.now() + (backoff as number), job.token);
          throw new DelayedError();
        }
      }
      return;
    }

    // True auth errors: expired/revoked token. Mark account inactive so the
    // scheduler skips it until the user reconnects with fresh credentials.
    const isAuthError =
      errorMsg.includes("X Session expired") ||
      errorMsg.includes("X_SESSION_EXPIRED") ||
      code === 401;

    // 403 "not permitted" is a permanent app-level failure, NOT an auth error.
    const isPermissionError = code === 403 && xApiDetail.toLowerCase().includes("not permitted");

    // 403 "duplicate content" means the tweet was already posted to X.
    const isDuplicateContent =
      code === 403 && xApiDetail.toLowerCase().includes("duplicate content");

    const userHint = isDuplicateContent
      ? "This tweet was already posted to X. It may have been published in a previous attempt but the status was not recorded."
      : isAuthError
        ? "X authorization expired. Please reconnect your X account."
        : isPermissionError
          ? "X rejected the post: your app lacks permission. Check that tweet.write (and replies) is enabled in your Twitter Developer Portal, or upgrade your developer plan."
          : code === 403
            ? "X authorization forbidden. Ensure your app has write access and reconnect your X account to grant tweet.write."
            : null;

    if (isAuthError && post?.xAccountId) {
      logger.warn("schedule_job_paused_needs_reconnect", {
        queue: job.queueName,
        jobId: job.id,
        postId,
        xAccountId: post.xAccountId,
      });

      await db
        .update(xAccounts)
        .set({
          isActive: false,
          consecutiveRefreshFailures: sql`consecutive_refresh_failures + 1`,
          lastRefreshFailureAt: new Date(),
          refreshFailureReason: "permanent",
        })
        .where(eq(xAccounts.id, post.xAccountId));

      await db
        .update(posts)
        .set({ status: sql`'paused_needs_reconnect'::text::post_status` })
        .where(eq(posts.id, postId));

      // Send deactivation email (non-blocking — failure does not affect job flow)
      try {
        const [userRecord] = await db
          .select({ email: user.email, language: user.language })
          .from(user)
          .where(eq(user.id, post.userId))
          .limit(1);

        if (userRecord?.email && post.xAccount) {
          await sendAccountDeactivatedEmail(
            userRecord.email,
            post.xAccount.xUsername,
            userRecord.language || "en"
          );
        }
      } catch (emailErr) {
        logger.warn("deactivation_email_failed", {
          jobId: job.id,
          postId,
          userId: post.userId,
          error: emailErr instanceof Error ? emailErr.message : "Unknown",
        });
      }

      if (job.token) {
        // Delay for 72 hours to give user time to reconnect
        await job.moveToDelayed(Date.now() + 72 * 60 * 60 * 1000, job.token);
        throw new DelayedError();
      }
      return;
    }

    const attempts = job.opts?.attempts;
    const attemptsMade = job.attemptsMade;
    const isFinalAttempt =
      isDuplicateContent || // always stop retrying for duplicate content
      (typeof attempts === "number" && typeof attemptsMade === "number"
        ? attemptsMade + 1 >= attempts
        : true);

    logger.error("schedule_job_failed", {
      queue: job.queueName,
      jobId: job.id,
      postId,
      correlationId,
      error: error instanceof Error ? error.message : "Unknown error",
      code: typeof code === "number" ? code : undefined,
      attempts,
      attemptsMade,
      final: isFinalAttempt,
    });

    const updateSet: {
      status: "failed" | "scheduled";
      failReason: string;
      lastErrorCode: number | null;
      lastErrorAt: Date;
      retryCount?: number;
    } = {
      status: isFinalAttempt ? "failed" : "scheduled",
      failReason: userHint || (error instanceof Error ? error.message : "Unknown error"),
      lastErrorCode: typeof code === "number" ? code : null,
      lastErrorAt: new Date(),
    };
    if (post) {
      updateSet.retryCount = (post.retryCount ?? 0) + 1;
    }

    await db.update(posts).set(updateSet).where(eq(posts.id, postId));

    if (post?.userId) {
      await db
        .insert(jobRuns)
        .values({
          id: crypto.randomUUID(),
          userId: post.userId,
          queueName: job.queueName,
          jobId: String(job.id),
          correlationId: correlationId || `${job.queueName}:${job.id}:${postId}`,
          postId,
          status: isFinalAttempt ? "failed" : "retrying",
          attempts,
          attemptsMade,
          startedAt: new Date(),
          finishedAt: isFinalAttempt ? new Date() : null,
          error: error instanceof Error ? error.message : "Unknown error",
        })
        .onConflictDoUpdate({
          target: [jobRuns.queueName, jobRuns.jobId],
          set: {
            status: isFinalAttempt ? "failed" : "retrying",
            attempts,
            attemptsMade,
            finishedAt: isFinalAttempt ? new Date() : null,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
    }

    const targetUserId = userId || post?.userId;
    if (isFinalAttempt && targetUserId) {
      // Insert into dead-letter queue for visibility and manual recovery
      try {
        await db.insert(failedJobs).values({
          id: crypto.randomUUID(),
          jobName: job.name,
          jobData: job.data as unknown as Record<string, unknown>,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          failureCount: attemptsMade + 1,
          correlationId: correlationId || `${job.queueName}:${job.id}:${postId}`,
          postId,
          userId: targetUserId,
          lastAttemptAt: new Date(),
        });
      } catch (dlqErr) {
        logger.error("failed_to_insert_dlq", {
          error: dlqErr instanceof Error ? dlqErr.message : String(dlqErr),
          jobId: String(job.id),
          postId,
        });
      }

      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: targetUserId,
        type: "post_failed",
        title: "Post Publishing Failed",
        message: `Your post failed to publish. ${userHint || (error instanceof Error ? error.message : "Unknown error")}`,
        metadata: { postId, error: error instanceof Error ? error.message : "Unknown error" },
        isRead: false,
      });

      // Send Email
      try {
        const userRecord = await db.query.user.findFirst({
          where: eq(user.id, targetUserId),
          columns: { email: true, language: true },
        });
        if (userRecord?.email) {
          await sendPostFailureEmail(
            userRecord.email,
            postId,
            userHint || (error instanceof Error ? error.message : "Unknown error"),
            userRecord.language || "en"
          );
        }
      } catch (emailError) {
        logger.error("failed_to_send_email", { error: emailError });
      }
    }

    // For duplicate content, tell BullMQ never to retry this job.
    if (isDuplicateContent) {
      throw new UnrecoverableError(userHint ?? "Duplicate tweet content");
    }
    throw error; // Let BullMQ handle retries if configured
  }
};

export const analyticsProcessor = async (job: Job<AnalyticsJobPayload>) => {
  const { correlationId, runIds } = job.data;
  logger.info("analytics_job_started", {
    queue: job.queueName,
    jobId: job.id,
    correlationId,
  });
  if (runIds && runIds.length > 0) {
    await refreshFollowersAndMetricsForRuns(runIds);
    logger.info("analytics_job_completed", {
      queue: job.queueName,
      jobId: job.id,
      correlationId,
      mode: "runs",
      runIdsCount: runIds.length,
    });
    return;
  }
  await updateTweetMetrics();
  logger.info("analytics_job_completed", {
    queue: job.queueName,
    jobId: job.id,
    correlationId,
    mode: "periodic",
  });
};

// ── X Tier Refresh Processor ──────────────────────────────────────────────────

/** Delay between consecutive X API calls to avoid rate-limiting. */
const TIER_REFRESH_BATCH_DELAY_MS = 500;

export const refreshXTiersProcessor = async (job: Job<RefreshXTiersJobPayload>) => {
  const { triggeredBy } = job.data;
  const correlationId = `x-tier-refresh:${triggeredBy}`;

  logger.info("x_tier_refresh_job_started", {
    queue: job.queueName,
    jobId: job.id,
    correlationId,
  });

  try {
    // Find active accounts where tier data is stale (>24h old) or never fetched.
    const staleAccounts = await db.query.xAccounts.findMany({
      where: and(
        eq(xAccounts.isActive, true),
        or(
          isNull(xAccounts.xSubscriptionTierUpdatedAt),
          lt(xAccounts.xSubscriptionTierUpdatedAt, sql`NOW() - INTERVAL '24 hours'`)
        )
      ),
    });

    if (staleAccounts.length === 0) {
      logger.info("x_tier_refresh_no_stale_accounts", { correlationId });
      return;
    }

    let refreshed = 0;
    let skipped = 0;
    let errors = 0;

    for (const account of staleAccounts) {
      const previousTier = (account.xSubscriptionTier ?? "None") as XSubscriptionTier;

      try {
        const freshTier = await XApiService.fetchXSubscriptionTier(account.id);
        refreshed++;

        const newTier = freshTier as XSubscriptionTier;
        if (freshTier !== previousTier) {
          logger.info("x_tier_changed", {
            accountId: account.id,
            xUsername: account.xUsername,
            previousTier,
            newTier,
          });

          // Detect downgrade (Premium → Free)
          const wasPremium = canPostLongContent(previousTier);
          const isNowFree = !canPostLongContent(newTier);

          if (wasPremium && isNowFree) {
            // Check for scheduled posts with content exceeding 280 chars
            const scheduledPosts = await db.query.posts.findMany({
              where: and(eq(posts.xAccountId, account.id), eq(posts.status, "scheduled")),
              with: { tweets: { columns: { content: true } } },
            });

            const oversized = scheduledPosts.filter((p) =>
              p.tweets.some((t) => t.content.length > 280)
            );

            if (oversized.length > 0) {
              try {
                await db.insert(notifications).values({
                  id: crypto.randomUUID(),
                  userId: account.userId,
                  type: "tier_downgrade_warning",
                  title: "X Premium Subscription Changed",
                  message: `Your X Premium subscription for @${account.xUsername} is no longer active. You have ${oversized.length} scheduled post${oversized.length > 1 ? "s" : ""} that exceed 280 characters — these will fail to publish. Please edit them or convert to threads.`,
                  metadata: {
                    xUsername: account.xUsername,
                    previousTier,
                    newTier,
                    oversizedCount: oversized.length,
                    postIds: oversized.map((p) => p.id),
                  },
                  isRead: false,
                });
              } catch (notifErr) {
                logger.warn("x_tier_downgrade_notification_failed", {
                  accountId: account.id,
                  error: notifErr instanceof Error ? notifErr.message : "Unknown",
                });
              }
            }
          }
        }
      } catch (err) {
        const code = (err as any)?.code;
        const message = err instanceof Error ? err.message : String(err);

        // Circuit open — skip this batch cycle, retry next scheduled run
        if (message.includes("X_CIRCUIT_OPEN")) {
          logger.warn("x_tier_refresh_circuit_open", { accountId: account.id });
          skipped++;
          break; // stop iterating, circuit blocks all X API calls
        }

        const failureType = classifyRefreshError(err);

        if (failureType === "permanent" || code === 403) {
          // 401 / permanent = token revoked, 403 via tier endpoint = token scope issue
          logger.warn("x_tier_refresh_account_auth_error", {
            accountId: account.id,
            xUsername: account.xUsername,
            failureType,
          });

          await db
            .update(xAccounts)
            .set({
              isActive: false,
              consecutiveRefreshFailures: sql`consecutive_refresh_failures + 1`,
              lastRefreshFailureAt: new Date(),
              refreshFailureReason: "permanent",
            })
            .where(eq(xAccounts.id, account.id));

          logger.warn("x_tier_refresh_account_deactivated", {
            accountId: account.id,
            xUsername: account.xUsername,
          });
          skipped++;
        } else {
          // Transient, rate-limited, or unknown — don't deactivate
          if (failureType === "transient" || failureType === "rate_limited") {
            await db
              .update(xAccounts)
              .set({
                consecutiveRefreshFailures: sql`consecutive_refresh_failures + 1`,
                lastRefreshFailureAt: new Date(),
                refreshFailureReason: failureType,
              })
              .where(eq(xAccounts.id, account.id));
          }
          logger.error("x_tier_refresh_account_error", {
            accountId: account.id,
            xUsername: account.xUsername,
            failureType,
            error: message,
          });
          errors++;
        }
      }

      // Small delay between accounts to avoid X API rate limits
      await new Promise((resolve) => setTimeout(resolve, TIER_REFRESH_BATCH_DELAY_MS));
    }

    logger.info("x_tier_refresh_job_completed", {
      queue: job.queueName,
      jobId: job.id,
      correlationId,
      summary: { total: staleAccounts.length, refreshed, skipped, errors },
    });
  } catch (err) {
    logger.error("x_tier_refresh_job_fatal", {
      correlationId,
      error: err instanceof Error ? err.message : "Unknown",
    });
    throw err;
  }
};

// ── Token Health Check Processor ─────────────────────────────────────────────────

/**
 * Checks X account token expiration dates and notifies users whose tokens
 * expire within 48 hours. Runs daily at 2 AM UTC.
 */
export const tokenHealthProcessor = async (job: Job<TokenHealthJobPayload>) => {
  const { correlationId } = job.data;
  const jobCorrelationId = correlationId || `token-health:${job.id}`;

  logger.info("token_health_job_started", {
    queue: job.queueName,
    jobId: job.id,
    correlationId: jobCorrelationId,
  });

  try {
    // Find accounts with tokens expiring within 48 hours
    const expiringSoon = await db.query.xAccounts.findMany({
      where: and(
        eq(xAccounts.isActive, true),
        isNotNull(xAccounts.tokenExpiresAt),
        lt(xAccounts.tokenExpiresAt, sql`NOW() + INTERVAL '48 hours'`)
      ),
    });

    if (expiringSoon.length === 0) {
      logger.info("token_health_no_expiring_tokens", { correlationId: jobCorrelationId });
      return;
    }

    logger.info("token_health_expiring_found", {
      correlationId: jobCorrelationId,
      count: expiringSoon.length,
    });

    let notificationsCreated = 0;
    let notificationErrors = 0;
    let emailsSent = 0;
    let emailErrors = 0;

    for (const account of expiringSoon) {
      const expiresAt = account.tokenExpiresAt;
      if (!expiresAt) continue;

      const hoursUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));

      // Always create in-app notification for expiring tokens
      try {
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          userId: account.userId,
          type: "token_expiring_soon",
          title: "X Account Token Expiring Soon",
          message: `Your X account @${account.xUsername} token will expire in ${hoursUntilExpiry} hour${hoursUntilExpiry === 1 ? "" : "s"}. Please reconnect your account in Settings to avoid scheduling interruptions.`,
          metadata: {
            xAccountId: account.id,
            xUsername: account.xUsername,
            tokenExpiresAt: expiresAt.toISOString(),
            hoursUntilExpiry,
          },
          isRead: false,
        });
        notificationsCreated++;

        logger.info("token_health_notification_created", {
          correlationId: jobCorrelationId,
          userId: account.userId,
          xUsername: account.xUsername,
          hoursUntilExpiry,
        });
      } catch (notifErr) {
        notificationErrors++;
        logger.warn("token_health_notification_failed", {
          correlationId: jobCorrelationId,
          userId: account.userId,
          xUsername: account.xUsername,
          error: notifErr instanceof Error ? notifErr.message : "Unknown",
        });
      }

      // Send proactive email when token expires within 24 hours
      if (hoursUntilExpiry <= 24) {
        try {
          const [userRecord] = await db
            .select({ email: user.email, language: user.language })
            .from(user)
            .where(eq(user.id, account.userId))
            .limit(1);

          if (userRecord?.email) {
            await sendTokenExpiringEmail(
              userRecord.email,
              account.xUsername,
              hoursUntilExpiry,
              userRecord.language || "en"
            );
            emailsSent++;
            logger.info("token_health_email_sent", {
              correlationId: jobCorrelationId,
              userId: account.userId,
              xUsername: account.xUsername,
              hoursUntilExpiry,
              email: userRecord.email,
            });
          }
        } catch (emailErr) {
          emailErrors++;
          logger.warn("token_health_email_failed", {
            correlationId: jobCorrelationId,
            userId: account.userId,
            xUsername: account.xUsername,
            error: emailErr instanceof Error ? emailErr.message : "Unknown",
          });
        }
      }
    }

    logger.info("token_health_job_completed", {
      queue: job.queueName,
      jobId: job.id,
      correlationId: jobCorrelationId,
      summary: {
        totalChecked: expiringSoon.length,
        notificationsCreated,
        notificationErrors,
        emailsSent,
        emailErrors,
      },
    });
  } catch (err) {
    logger.error("token_health_job_fatal", {
      correlationId: jobCorrelationId,
      error: err instanceof Error ? err.message : "Unknown",
    });
    throw err;
  }
};

// ── PDF Thread Processor ───────────────────────────────────────────────────────

/**
 * Splits a long text into chunks that respect paragraph boundaries where possible.
 * Tries to break at double-newline (paragraph), then single newline, then sentence-end.
 */
function chunkText(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining);
      break;
    }
    const slice = remaining.slice(0, maxChars);
    const lastPara = slice.lastIndexOf("\n\n");
    const breakPoint = lastPara > maxChars * 0.5 ? lastPara : slice.lastIndexOf("\n");
    const splitAt = breakPoint > 0 ? breakPoint : slice.lastIndexOf(".");
    const end = splitAt > 0 ? splitAt + 1 : maxChars;
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }
  return chunks.filter((c) => c.length > 0);
}

export const pdfThreadProcessor = async (job: Job<PdfThreadJobPayload>) => {
  const { jobId, userId, correlationId } = job.data;
  logger.info("pdf_thread_job_start", { jobId, userId, correlationId });

  const [row] = await db.select().from(pdfThreadJobs).where(eq(pdfThreadJobs.id, jobId));
  if (!row || row.status !== "queued") {
    logger.warn("pdf_thread_job_skipped", { jobId, status: row?.status });
    return;
  }

  await db
    .update(pdfThreadJobs)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(pdfThreadJobs.id, jobId));

  const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! });
  const modelId = process.env.OPENROUTER_MODEL_PDF_TO_THREAD ?? process.env.OPENROUTER_MODEL!;
  const model = openrouter(modelId);
  const startTs = Date.now();

  try {
    const rawText = row.extractedText;
    if (!rawText || rawText.length < 200) {
      throw new Error("No extractable text found for job");
    }

    // PII redaction before any LLM call
    const { cleaned: text, redactions } = redactPII(rawText);
    if (redactions.length > 0) {
      logger.info("pii_redacted_async", { jobId, userId, redactions });
    }

    // Phase 1: Chunk the text
    const chunks = chunkText(text, INPUT_LIMITS.pdfReportChunk);

    // Phase 2: Summarize each chunk — accumulate token usage
    const partialSummaries: string[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    for (const chunk of chunks) {
      const partialPrompt = buildSummarizePrompt({
        variant: "report",
        language: row.language as "ar" | "en",
        tone: row.tone,
        tweetCount: Math.min(5, row.tweetCount),
        title: `Section of: ${row.fileName}`,
        body: chunk,
        bodyMaxChars: INPUT_LIMITS.pdfReportChunk,
      });

      const { object: partial, usage: chunkUsage } = await generateObject({
        model,
        schema: pdfThreadOutputSchema,
        prompt: partialPrompt,
      });
      partialSummaries.push(partial.tweets.join("\n"));
      totalInputTokens += chunkUsage?.inputTokens ?? 0;
      totalOutputTokens += chunkUsage?.outputTokens ?? 0;
    }

    // Phase 3: Combine partial summaries into final thread
    const combined = partialSummaries.join("\n\n---\n\n");
    const finalPrompt = buildSummarizePrompt({
      variant: "report",
      language: row.language as "ar" | "en",
      tone: row.tone,
      tweetCount: row.tweetCount,
      title: row.fileName,
      body: combined,
      bodyMaxChars: INPUT_LIMITS.pdfReportBody,
    });

    const { object: result, usage } = await generateObject({
      model,
      schema: pdfThreadOutputSchema,
      prompt: finalPrompt,
    });
    totalInputTokens += usage?.inputTokens ?? 0;
    totalOutputTokens += usage?.outputTokens ?? 0;

    // Phase 4: Moderation check — fail hard on flagged content (consistent with sync path)
    const tweetsText = result.tweets.join("\n");
    const { flagged } = await moderateOutput(tweetsText, userId, undefined);
    if (flagged) {
      await db
        .update(pdfThreadJobs)
        .set({
          status: "failed",
          error: "Content moderation flagged the generated thread.",
          updatedAt: new Date(),
        })
        .where(eq(pdfThreadJobs.id, jobId));

      logger.warn("pdf_thread_moderation_flagged", { jobId, userId });
      return;
    }

    // Phase 5: Persist result
    await db
      .update(pdfThreadJobs)
      .set({
        status: "ready",
        threadResult: {
          tweets: result.tweets.map((t: string) => ({ text: t, charCount: t.length })),
          title: result.title,
          sourceLanguage: result.sourceLanguage as "ar" | "en",
        },
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pdfThreadJobs.id, jobId));

    // Phase 6: Record AI usage (includes chunk + combine tokens)
    await recordAiUsage({
      userId,
      type: "pdf_to_thread",
      model: modelId,
      subFeature: "async_chunked",
      tokensIn: totalInputTokens,
      tokensOut: totalOutputTokens,
      costEstimateCents: estimateCost(modelId, totalInputTokens, totalOutputTokens),
      promptVersion: "pdf_to_thread:v1",
      latencyMs: Date.now() - startTs,
      language: row.language,
    });

    logger.info("pdf_thread_job_completed", { jobId, userId, tweetCount: result.tweets.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("pdf_thread_job_failed", { jobId, error: msg });
    await db
      .update(pdfThreadJobs)
      .set({
        status: "failed",
        error: msg,
        updatedAt: new Date(),
      })
      .where(eq(pdfThreadJobs.id, jobId));
    // Quota was consumed at enqueue time — release it on permanent failure.
    // BullMQ will re-throw for retries; quota release is idempotent (counter
    // won't go below 0) so it's safe to call on every attempt.
    try {
      await releaseAiQuota(userId, 5);
    } catch (quotaErr) {
      logger.error("pdf_thread_release_quota_failed", {
        jobId,
        error: quotaErr instanceof Error ? quotaErr.message : String(quotaErr),
      });
    }
    throw err; // BullMQ retry via attempts config
  }
};

// ── YouTube error classification ────────────────────────────────────────────

const YOUTUBE_ERROR_CLASSIFIERS: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /private/i, code: "VIDEO_PRIVATE" },
  { pattern: /age[ -]?(restrict|gate)/i, code: "VIDEO_AGE_GATED" },
  { pattern: /(live stream|is live|live video)/i, code: "VIDEO_LIVE" },
  { pattern: /too long/i, code: "VIDEO_TOO_LONG" },
  { pattern: /too short/i, code: "VIDEO_TOO_LONG" },
  { pattern: /no audio/i, code: "VIDEO_NO_AUDIO" },
  { pattern: /(transcri|speech.?(to.?text|recogn))/i, code: "TRANSCRIPTION_FAILED" },
  { pattern: /moderation/i, code: "MODERATION_FLAGGED" },
  { pattern: /(flagged|inappropriate|policy)/i, code: "MODERATION_FLAGGED" },
  { pattern: /(openrouter|provider|model|llm|gateway)/i, code: "PROVIDER_ERROR" },
  { pattern: /user_cancelled/i, code: "CANCELLED" },
];

function classifyYoutubeError(msg: string): string {
  for (const { pattern, code } of YOUTUBE_ERROR_CLASSIFIERS) {
    if (pattern.test(msg)) return code;
  }
  return "UNKNOWN";
}

const TONE_LABELS: Record<string, string> = {
  professional: "concise and professional",
  educational: "informative and educational",
  casual: "natural and conversational",
  formal: "formal and authoritative",
  enthusiastic: "energetic and enthusiastic",
};

// ── YouTube Thread Processor ─────────────────────────────────────────────────

export const youtubeThreadProcessor = async (job: Job<YoutubeThreadJobPayload>) => {
  const { jobId, userId, correlationId } = job.data;
  logger.info("youtube_thread_job_start", { jobId, userId, correlationId });

  const [row] = await db.select().from(youtubeThreadJobs).where(eq(youtubeThreadJobs.id, jobId));
  if (!row || row.status !== "queued") {
    logger.warn("youtube_thread_job_skipped", { jobId, status: row?.status });
    return;
  }

  const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! });
  const modelId = process.env.OPENROUTER_MODEL_YOUTUBE_TO_THREAD ?? process.env.OPENROUTER_MODEL!;
  const model = openrouter(modelId);
  const startTs = Date.now();

  // Temp file path for downloaded audio
  const tempDir = tmpdir();
  const audioExt = row.provider === "deepgram" ? "m4a" : "mp3";
  const audioPath = path.join(tempDir, `yt-${jobId}.${audioExt}`);
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  try {
    // ── Branch: title-only generation (oEmbed fallback, no duration) ──────

    if (row.durationVerified === false) {
      logger.info("youtube_thread_title_only", { jobId, title: row.videoTitle });

      await db
        .update(youtubeThreadJobs)
        .set({ status: "generating", updatedAt: new Date() })
        .where(eq(youtubeThreadJobs.id, jobId));

      const langBlock = buildLanguageBlock(row.language, "social");
      const title = row.videoTitle ?? "Untitled YouTube Video";

      const dynamicYoutubeThreadOutputSchema = z.object({
        tweets: z.array(z.string()),
        title: z.string(),
      });

      const { object: rawResult, usage } = await generateObject({
        model,
        schema: dynamicYoutubeThreadOutputSchema,
        system:
          `You are a social media expert who creates engaging X (Twitter) threads from YouTube video titles.\n\n` +
          `REQUIREMENTS:\n` +
          `- Write EXACTLY ${row.tweetCount} tweets (no more, no less)\n` +
          `- Each tweet MUST be 280 characters or less\n` +
          `- Make the thread engaging and easy to read\n` +
          `- Use a ${TONE_LABELS[row.tone ?? "casual"]} tone\n` +
          `- The first tweet should hook the reader with the video title\n` +
          `- Expand on what the video likely covers based on the title\n` +
          `- The last tweet should include a call-to-action or takeaway\n` +
          `- Do NOT mention that you haven't watched the video\n\n` +
          `${langBlock}\n\n` +
          `${JAILBREAK_GUARD}`,
        prompt: `YouTube video title: "${title}"\n\nCreate a thread based on this title. Infer what the video likely covers from the title and expand on those topics.`,
      });

      totalInputTokens = usage?.inputTokens ?? 0;
      totalOutputTokens = usage?.outputTokens ?? 0;

      const trimmedTweets = rawResult.tweets
        .map((t: string) => (t.length > 280 ? t.slice(0, 280) : t))
        .filter((t: string) => t.trim().length > 0)
        .slice(0, row.tweetCount);

      if (trimmedTweets.length === 0) {
        throw new Error("Model returned no tweets");
      }

      const result = { tweets: trimmedTweets, title: rawResult.title };

      // Moderation check
      const tweetsText = result.tweets.join("\n");
      const { flagged } = await moderateOutput(tweetsText, userId, undefined);
      if (flagged) {
        await db
          .update(youtubeThreadJobs)
          .set({
            status: "failed",
            error: "Content moderation flagged the generated thread.",
            errorCode: "MODERATION_FLAGGED",
            updatedAt: new Date(),
          })
          .where(eq(youtubeThreadJobs.id, jobId));
        logger.warn("youtube_thread_moderation_flagged", { jobId, userId });
        return;
      }

      // Persist result
      const persisted = await db
        .update(youtubeThreadJobs)
        .set({
          status: "ready",
          threadResult: {
            tweets: result.tweets.map((t: string) => ({ text: t, charCount: t.length })),
            title: result.title,
            videoUrl: row.youtubeUrl,
          },
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(youtubeThreadJobs.id, jobId),
            or(eq(youtubeThreadJobs.status, "queued"), eq(youtubeThreadJobs.status, "generating"))
          )
        )
        .returning({ id: youtubeThreadJobs.id });

      if (persisted.length === 0) {
        logger.info("youtube_thread_aborted_pre_persist", { jobId });
        return;
      }

      await recordAiUsage({
        userId,
        type: "youtube_to_thread",
        model: modelId,
        subFeature: "youtube_to_thread",
        tokensIn: totalInputTokens,
        tokensOut: totalOutputTokens,
        costEstimateCents: estimateCost(modelId, totalInputTokens, totalOutputTokens),
        promptVersion: "youtube_to_thread:v2",
        latencyMs: Date.now() - startTs,
        language: row.language,
      });

      logger.info("youtube_thread_job_completed", {
        jobId,
        userId,
        tweetCount: result.tweets.length,
        mode: "title_only",
      });
      return;
    }

    // ── Full pipeline: audio download + transcription + thread generation ──

    // Phase 1: Download audio
    await db
      .update(youtubeThreadJobs)
      .set({ status: "downloading", updatedAt: new Date() })
      .where(eq(youtubeThreadJobs.id, jobId));

    logger.info("youtube_thread_downloading", { jobId, url: row.youtubeUrl });
    await extractAudio(row.youtubeUrl, audioPath);
    const mimeType = getAudioMimeType(audioPath);

    // Phase 2: Transcribe
    await db
      .update(youtubeThreadJobs)
      .set({ status: "transcribing", updatedAt: new Date() })
      .where(eq(youtubeThreadJobs.id, jobId));

    logger.info("youtube_thread_transcribing", { jobId, provider: row.provider });
    const audioBuffer = await readFile(audioPath);
    const transcription = await transcribe(audioBuffer, row.provider, mimeType);

    // Cancellation guard
    const [postTranscribe] = await db
      .select({ status: youtubeThreadJobs.status })
      .from(youtubeThreadJobs)
      .where(eq(youtubeThreadJobs.id, jobId));
    if (postTranscribe?.status === "failed" || postTranscribe?.status === "ready") {
      logger.info("youtube_thread_aborted_post_transcribe", {
        jobId,
        status: postTranscribe.status,
      });
      return;
    }

    const updatedDuration =
      transcription.durationSeconds > 0
        ? Math.round(transcription.durationSeconds)
        : row.durationSeconds;

    await db
      .update(youtubeThreadJobs)
      .set({
        transcript: transcription.transcript,
        ...(updatedDuration !== null && updatedDuration !== undefined
          ? { durationSeconds: updatedDuration }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(youtubeThreadJobs.id, jobId));

    await recordAiUsage({
      userId,
      type: "transcription",
      model: row.provider === "deepgram" ? "deepgram/base" : "whisper-1",
      subFeature: row.provider,
      tokensIn: 0,
      tokensOut: 0,
      costEstimateCents: transcription.costEstimateCents,
      promptVersion: "youtube_to_thread:v1",
      latencyMs: Date.now() - startTs,
      language: row.language,
    });

    // Phase 3: Generate thread via OpenRouter
    await db
      .update(youtubeThreadJobs)
      .set({ status: "generating", updatedAt: new Date() })
      .where(eq(youtubeThreadJobs.id, jobId));

    const langBlock = buildLanguageBlock(row.language, "social");

    const dynamicYoutubeThreadOutputSchema = z.object({
      tweets: z.array(z.string()),
      title: z.string(),
    });

    const { object: rawResult, usage } = await generateObject({
      model,
      schema: dynamicYoutubeThreadOutputSchema,
      system:
        `You are a social media expert who converts video transcripts into engaging X (Twitter) threads.\n\n` +
        `REQUIREMENTS:\n` +
        `- Write EXACTLY ${row.tweetCount} tweets (no more, no less)\n` +
        `- Each tweet MUST be 280 characters or less\n` +
        `- Make the thread engaging and easy to read\n` +
        `- Use a ${TONE_LABELS[row.tone ?? "casual"]} tone\n` +
        `- Break down complex ideas into digestible tweets\n` +
        `- The first tweet should hook the reader\n` +
        `- The last tweet should include a call-to-action or takeaway\n\n` +
        `${langBlock}\n\n` +
        `${JAILBREAK_GUARD}`,
      prompt: `Video transcript:\n\n${transcription.transcript}`,
    });

    totalInputTokens = usage?.inputTokens ?? 0;
    totalOutputTokens = usage?.outputTokens ?? 0;

    // Enforce the exact tweet count + 280-char cap that the schema no longer
    // expresses (see note above on the Bedrock minItems limitation).
    const trimmedTweets = rawResult.tweets
      .map((t: string) => (t.length > 280 ? t.slice(0, 280) : t))
      .filter((t: string) => t.trim().length > 0)
      .slice(0, row.tweetCount);

    if (trimmedTweets.length === 0) {
      throw new Error("Model returned no tweets");
    }

    const result = { tweets: trimmedTweets, title: rawResult.title };

    // Phase 4: Moderation check
    const tweetsText = result.tweets.join("\n");
    const { flagged } = await moderateOutput(tweetsText, userId, undefined);
    if (flagged) {
      await db
        .update(youtubeThreadJobs)
        .set({
          status: "failed",
          error: "Content moderation flagged the generated thread.",
          errorCode: "MODERATION_FLAGGED",
          updatedAt: new Date(),
        })
        .where(eq(youtubeThreadJobs.id, jobId));

      logger.warn("youtube_thread_moderation_flagged", { jobId, userId });
      return;
    }

    // Phase 5: Persist result — atomic upgrade only if not already cancelled.
    // Using WHERE status IN (queued, downloading, transcribing, generating) means
    // a concurrent DELETE that flipped status to "failed" wins and we skip the upgrade.
    const persisted = await db
      .update(youtubeThreadJobs)
      .set({
        status: "ready",
        threadResult: {
          tweets: result.tweets.map((t: string) => ({ text: t, charCount: t.length })),
          title: result.title,
          videoUrl: row.youtubeUrl,
        },
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(youtubeThreadJobs.id, jobId),
          or(
            eq(youtubeThreadJobs.status, "queued"),
            eq(youtubeThreadJobs.status, "downloading"),
            eq(youtubeThreadJobs.status, "transcribing"),
            eq(youtubeThreadJobs.status, "generating")
          )
        )
      )
      .returning({ id: youtubeThreadJobs.id });

    if (persisted.length === 0) {
      logger.info("youtube_thread_aborted_pre_persist", { jobId });
      return;
    }

    // Phase 6: Record AI usage
    await recordAiUsage({
      userId,
      type: "youtube_to_thread",
      model: modelId,
      subFeature: "youtube_to_thread",
      tokensIn: totalInputTokens,
      tokensOut: totalOutputTokens,
      costEstimateCents: estimateCost(modelId, totalInputTokens, totalOutputTokens),
      promptVersion: "youtube_to_thread:v1",
      latencyMs: Date.now() - startTs,
      language: row.language,
    });

    logger.info("youtube_thread_job_completed", {
      jobId,
      userId,
      tweetCount: result.tweets.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const errAny = err as { cause?: unknown; responseBody?: unknown; data?: unknown };
    logger.error("youtube_thread_job_failed", {
      jobId,
      error: msg,
      modelId,
      name: err instanceof Error ? err.name : undefined,
      cause:
        errAny.cause instanceof Error
          ? `${errAny.cause.name}: ${errAny.cause.message}`
          : errAny.cause !== undefined
            ? String(errAny.cause).slice(0, 1000)
            : undefined,
      responseBody:
        typeof errAny.responseBody === "string" ? errAny.responseBody.slice(0, 1000) : undefined,
      data: errAny.data ? JSON.stringify(errAny.data).slice(0, 1000) : undefined,
    });

    const maxAttempts = job.opts?.attempts ?? 1;
    const isLastAttempt = (job.attemptsMade ?? 0) + 1 >= maxAttempts;

    if (isLastAttempt) {
      // ── Title-only fallback on last attempt ──────────────────────────
      const title = row.videoTitle;
      if (title) {
        try {
          logger.info("youtube_thread_title_only_fallback", { jobId, title });
          await db
            .update(youtubeThreadJobs)
            .set({ status: "generating", updatedAt: new Date() })
            .where(eq(youtubeThreadJobs.id, jobId));

          const langBlock = buildLanguageBlock(row.language, "social");

          const dynamicYoutubeThreadOutputSchema = z.object({
            tweets: z.array(z.string()),
            title: z.string(),
          });

          const { object: rawResult, usage: fallbackUsage } = await generateObject({
            model,
            schema: dynamicYoutubeThreadOutputSchema,
            system:
              `You are a social media expert who creates engaging X (Twitter) threads from YouTube video titles.\n\n` +
              `REQUIREMENTS:\n` +
              `- Write EXACTLY ${row.tweetCount} tweets (no more, no less)\n` +
              `- Each tweet MUST be 280 characters or less\n` +
              `- Make the thread engaging and easy to read\n` +
              `- Use a ${TONE_LABELS[row.tone ?? "casual"]} tone\n` +
              `- The first tweet should hook the reader with the video title\n` +
              `- Expand on what the video likely covers based on the title\n` +
              `- The last tweet should include a call-to-action or takeaway\n` +
              `- Do NOT mention that you haven't watched the video\n\n` +
              `${langBlock}\n\n` +
              `${JAILBREAK_GUARD}`,
            prompt: `YouTube video title: "${title}"\n\nCreate a thread based on this title. Infer what the video likely covers from the title and expand on those topics.`,
          });

          const fallbackInputTokens = fallbackUsage?.inputTokens ?? 0;
          const fallbackOutputTokens = fallbackUsage?.outputTokens ?? 0;

          const trimmedTweets = rawResult.tweets
            .map((t: string) => (t.length > 280 ? t.slice(0, 280) : t))
            .filter((t: string) => t.trim().length > 0)
            .slice(0, row.tweetCount);

          if (trimmedTweets.length > 0) {
            const result = { tweets: trimmedTweets, title: rawResult.title };

            const tweetsText = result.tweets.join("\n");
            const { flagged } = await moderateOutput(tweetsText, userId, undefined);
            if (flagged) {
              await db
                .update(youtubeThreadJobs)
                .set({
                  status: "failed",
                  error: "Content moderation flagged the generated thread.",
                  errorCode: "MODERATION_FLAGGED",
                  updatedAt: new Date(),
                })
                .where(eq(youtubeThreadJobs.id, jobId));
              logger.warn("youtube_thread_moderation_flagged", { jobId, userId });
              return;
            }

            const persisted = await db
              .update(youtubeThreadJobs)
              .set({
                status: "ready",
                threadResult: {
                  tweets: result.tweets.map((t: string) => ({ text: t, charCount: t.length })),
                  title: result.title,
                  videoUrl: row.youtubeUrl,
                },
                completedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(youtubeThreadJobs.id, jobId),
                  or(
                    eq(youtubeThreadJobs.status, "queued"),
                    eq(youtubeThreadJobs.status, "downloading"),
                    eq(youtubeThreadJobs.status, "transcribing"),
                    eq(youtubeThreadJobs.status, "generating")
                  )
                )
              )
              .returning({ id: youtubeThreadJobs.id });

            if (persisted.length > 0) {
              await recordAiUsage({
                userId,
                type: "youtube_to_thread",
                model: modelId,
                subFeature: "youtube_to_thread",
                tokensIn: fallbackInputTokens,
                tokensOut: fallbackOutputTokens,
                costEstimateCents: estimateCost(modelId, fallbackInputTokens, fallbackOutputTokens),
                promptVersion: "youtube_to_thread:v2",
                latencyMs: Date.now() - startTs,
                language: row.language,
              });

              // Release quota — fallback consumed less but original quota was 5
              try {
                await releaseAiQuota(userId, 5);
              } catch {
                // best effort
              }

              logger.info("youtube_thread_job_completed", {
                jobId,
                userId,
                tweetCount: result.tweets.length,
                mode: "title_only_fallback",
              });
              return;
            }
          }
        } catch (fallbackErr) {
          logger.error("youtube_thread_title_only_fallback_failed", {
            jobId,
            error: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr),
          });
        }
      }

      // ── Terminal failure ─────────────────────────────────────────────
      const ec = classifyYoutubeError(msg);
      const flipped = await db
        .update(youtubeThreadJobs)
        .set({
          status: "failed",
          error: msg,
          errorCode: ec,
          quotaReleased: true,
          updatedAt: new Date(),
        })
        .where(and(eq(youtubeThreadJobs.id, jobId), eq(youtubeThreadJobs.quotaReleased, false)))
        .returning({ quotaConsumed: youtubeThreadJobs.quotaConsumed });

      if (flipped.length > 0) {
        try {
          await releaseAiQuota(userId, flipped[0]!.quotaConsumed ?? 5);
        } catch (quotaErr) {
          logger.error("youtube_thread_release_quota_failed", {
            jobId,
            error: quotaErr instanceof Error ? quotaErr.message : String(quotaErr),
          });
        }
      } else {
        await db
          .update(youtubeThreadJobs)
          .set({ status: "failed", error: msg, errorCode: ec, updatedAt: new Date() })
          .where(eq(youtubeThreadJobs.id, jobId));
      }
    } else {
      // Retry pending — reset to "queued" so the retry guard passes
      await db
        .update(youtubeThreadJobs)
        .set({ status: "queued", error: msg, updatedAt: new Date() })
        .where(eq(youtubeThreadJobs.id, jobId));
    }
    throw err;
  } finally {
    // Clean up temp audio file
    try {
      await unlink(audioPath);
    } catch {
      // File may not exist if download failed — safe to ignore
    }
  }
};
