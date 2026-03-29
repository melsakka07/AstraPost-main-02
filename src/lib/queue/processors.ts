import { readFile } from "fs/promises";
import path from "path";
import { Job, DelayedError, UnrecoverableError } from "bullmq";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import { type InferSelectModel, eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkMilestone } from "@/lib/gamification";
import { logger } from "@/lib/logger";
import { scheduleQueue, SCHEDULE_JOB_OPTIONS, type PublishPostPayload, type AnalyticsJobPayload } from "@/lib/queue/client";
import { posts, jobRuns, user, tweets, media, notifications, xAccounts } from "@/lib/schema";
import { refreshFollowersAndMetricsForRuns, updateTweetMetrics } from "@/lib/services/analytics";
import { sendPostFailureEmail } from "@/lib/services/email";
import { XApiService } from "@/lib/services/x-api";

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
          filePath === uploadsRoot ||
          filePath.startsWith(uploadsRoot + path.sep);
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
          await db
            .update(media)
            .set({ xMediaId: uploadedId })
            .where(eq(media.id, m.id));
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

      await db
        .update(tweets)
        .set({ xTweetId: postedId })
        .where(eq(tweets.id, tweetRow.id));
    }

    // 5. Atomically mark post published + record successful job run.
    // Combining these two writes in one transaction guarantees that the audit
    // record in job_runs is never missing when the post status is "published",
    // even if the process crashes immediately after the DB commit.
    await db.transaction(async (tx) => {
      await tx.update(posts)
        .set({
          status: "published",
          publishedAt: new Date(),
          failReason: null,
          lastErrorCode: null,
          lastErrorAt: null,
        })
        .where(eq(posts.id, postId));

      await tx.update(jobRuns)
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

    // True auth errors: expired/revoked token. Mark account inactive so the
    // scheduler skips it until the user reconnects with fresh credentials.
    const isAuthError =
      (error instanceof Error && error.message.includes("X Session expired")) ||
      code === 401;

    // 403 "not permitted" is a permanent app-level failure, NOT an auth error.
    // Root causes: missing tweet.write scope, Twitter Developer Free-tier plan
    // restriction on replies, or misconfigured app permissions. Reconnecting
    // won't help — the user needs to check their Twitter Developer Portal.
    // We mark the post as failed (not paused_needs_reconnect) so the Retry
    // button is available immediately and the account stays active.
    const isPermissionError =
      code === 403 && xApiDetail.toLowerCase().includes("not permitted");

    // 403 "duplicate content" means the tweet was already posted to X (e.g. the
    // process crashed after the API call but before the DB write). Retrying will
    // always get the same error, so we treat it as non-retryable immediately.
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

      await db.update(xAccounts).set({ isActive: false }).where(eq(xAccounts.id, post.xAccountId));
      await db.update(posts).set({ status: sql`'paused_needs_reconnect'::text::post_status` }).where(eq(posts.id, postId));

      if (job.token) {
        // Delay for 72 hours
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
            columns: { email: true }
        });
        if (userRecord?.email) {
            await sendPostFailureEmail(
                userRecord.email, 
                postId, 
                userHint || (error instanceof Error ? error.message : "Unknown error")
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
