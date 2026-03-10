import { readFile } from "fs/promises";
import path from "path";
import { Job } from "bullmq";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { jobRuns, media, posts, tweets } from "@/lib/schema";
import { refreshFollowersAndMetricsForRuns, updateTweetMetrics } from "@/lib/services/analytics";
import { XApiService } from "@/lib/services/x-api";

export const scheduleProcessor = async (job: Job) => {
  const { postId } = job.data;
  const correlationId = (job.data as any)?.correlationId as string | undefined;
  logger.info("schedule_job_started", {
    queue: job.queueName,
    jobId: job.id,
    postId,
    correlationId,
  });
  let post: any;

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
        attempts: (job.opts as any)?.attempts,
        attemptsMade: (job as any)?.attemptsMade,
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
          attempts: (job.opts as any)?.attempts,
          attemptsMade: (job as any)?.attemptsMade,
          startedAt: new Date(),
          finishedAt: null,
          error: null,
        },
      });

    if (post.status !== "scheduled") {
      logger.info("schedule_job_skipped", {
        queue: job.queueName,
        jobId: job.id,
        postId,
      correlationId,
        status: post.status,
      });
      return;
    }

    const isDryRun = process.env.TWITTER_DRY_RUN === "1";

    const xService = isDryRun
      ? {
          uploadMedia: async () => `dry_media_${crypto.randomUUID()}`,
          postTweet: async () => ({ data: { id: `dry_tweet_${crypto.randomUUID()}` } }),
          postTweetReply: async () => ({ data: { id: `dry_tweet_${crypto.randomUUID()}` } }),
        }
      : await XApiService.getClientForAccountId(post.xAccountId);

    if (!xService) {
      throw new Error("No connected X account");
    }

    const loadMediaBuffer = async (fileUrl: string) => {
      if (fileUrl.startsWith("/")) {
        const filePath = path.join(process.cwd(), "public", fileUrl);
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

    // 5. Update post status to published
    await db.update(posts)
      .set({ 
        status: "published", 
        publishedAt: new Date(),
        failReason: null,
        lastErrorCode: null,
        lastErrorAt: null,
      })
      .where(eq(posts.id, postId));

    await db
      .update(jobRuns)
      .set({
        status: "success",
        attempts: (job.opts as any)?.attempts,
        attemptsMade: (job as any)?.attemptsMade,
        finishedAt: new Date(),
        error: null,
      })
      .where(and(eq(jobRuns.queueName, job.queueName), eq(jobRuns.jobId, String(job.id))));

    logger.info("schedule_job_completed", {
      queue: job.queueName,
      jobId: job.id,
      postId,
      correlationId,
    });

  } catch (error) {
    const code = (error as any)?.code;
    const userHint =
      code === 401
        ? "X authorization expired. Please reconnect your X account."
        : code === 403
          ? "X authorization forbidden. Ensure your app has write access and reconnect your X account to grant tweet.write."
          : null;

    const attempts = (job.opts as any)?.attempts as number | undefined;
    const attemptsMade = (job as any)?.attemptsMade as number | undefined;
    const isFinalAttempt =
      typeof attempts === "number" && typeof attemptsMade === "number"
        ? attemptsMade + 1 >= attempts
        : true;

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
    
    const updateSet: Record<string, any> = {
      status: isFinalAttempt ? "failed" : "scheduled",
      failReason: userHint || (error instanceof Error ? error.message : "Unknown error"),
      lastErrorCode: typeof code === "number" ? code : null,
      lastErrorAt: new Date(),
    };
    if (post) {
      updateSet.retryCount = (post.retryCount || 0) + 1;
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
    
    throw error; // Let BullMQ handle retries if configured
  }
};

export const analyticsProcessor = async (job: Job) => {
    const correlationId = (job.data as any)?.correlationId as string | undefined;
    logger.info("analytics_job_started", {
      queue: job.queueName,
      jobId: job.id,
      correlationId,
    });
    const runIds = (job.data as any)?.runIds as string[] | undefined;
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
