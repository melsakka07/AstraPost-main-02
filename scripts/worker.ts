import "dotenv/config";
import { Worker } from "bullmq";
import { connection, scheduleQueue, analyticsQueue, SCHEDULE_JOB_OPTIONS } from "@/lib/queue/client";
import { scheduleProcessor, analyticsProcessor } from "@/lib/queue/processors";
import "@/lib/env";
import { logger } from "@/lib/logger";

logger.info("worker_started", {
  pid: process.pid,
  nodeEnv: process.env.NODE_ENV,
});

const scheduleWorker = new Worker(
  "schedule-queue",
  scheduleProcessor,
  { connection: connection as any }
);

scheduleWorker.on("completed", (job) => {
  logger.info("job_completed", {
    queue: "schedule-queue",
    jobId: job.id,
  });
});

scheduleWorker.on("failed", (job, err) => {
  // Log every failure (transient and permanent) for general observability.
  logger.error("job_failed", {
    queue: "schedule-queue",
    jobId: job?.id ?? "unknown",
    postId: job?.data?.postId ?? "unknown",
    userId: job?.data?.userId ?? "unknown",
    correlationId: job?.data?.correlationId ?? null,
    error: err.message,
    attemptsMade: job?.attemptsMade ?? null,
  });

  // ── DLQ alert ─────────────────────────────────────────────────────────────
  // Fires only when all configured retry attempts have been exhausted.
  //
  // The `job_permanently_failed` log key is intentionally distinct from the
  // transient `job_failed` key above.  Log aggregation tools (Datadog,
  // CloudWatch, Logtail, Axiom, Sentry, etc.) can create targeted high-priority
  // alerts on this key without noise from retryable failures.
  //
  // `maxAttempts` falls back to SCHEDULE_JOB_OPTIONS.attempts so the threshold
  // stays in sync if the job options ever change — no magic number here.
  const maxAttempts = job?.opts?.attempts ?? SCHEDULE_JOB_OPTIONS.attempts;
  if (job && job.attemptsMade >= maxAttempts) {
    logger.error("job_permanently_failed", {
      queue: "schedule-queue",
      jobId: job.id,
      postId: job.data.postId,
      userId: job.data.userId,
      correlationId: job.data.correlationId ?? null,
      error: err.message,
      attemptsMade: job.attemptsMade,
      maxAttempts,
      failedAt: new Date().toISOString(),
      // Surfaced as a structured field so alerting rules can include it in the
      // notification body without requiring a custom log parser.
      action: "manual_review_required",
    });
  }
});

const analyticsWorker = new Worker(
  "analytics-queue",
  analyticsProcessor,
  { connection: connection as any }
);

analyticsWorker.on("completed", (job) => {
  logger.info("job_completed", {
    queue: "analytics-queue",
    jobId: job.id,
  });
});

analyticsWorker.on("failed", (job, err) => {
  // Log every analytics failure for observability.
  logger.error("job_failed", {
    queue: "analytics-queue",
    jobId: job?.id ?? "unknown",
    correlationId: job?.data?.correlationId ?? null,
    error: err.message,
    attemptsMade: job?.attemptsMade ?? null,
  });

  // DLQ alert for analytics jobs — only fires when `attempts` is configured
  // and all have been exhausted.  Analytics repeatable jobs typically have no
  // `attempts` limit (they self-heal on the next scheduled run), so this guard
  // prevents false positives while still catching any explicitly-capped job.
  const maxAttempts = job?.opts?.attempts;
  if (job && maxAttempts !== undefined && maxAttempts > 0 && job.attemptsMade >= maxAttempts) {
    logger.error("job_permanently_failed", {
      queue: "analytics-queue",
      jobId: job.id,
      correlationId: job.data.correlationId ?? null,
      error: err.message,
      attemptsMade: job.attemptsMade,
      maxAttempts,
      failedAt: new Date().toISOString(),
      action: "manual_review_required",
    });
  }
});

// Init Repeatable Job
analyticsQueue.add("update-metrics", {}, {
    repeat: {
        every: 6 * 60 * 60 * 1000 // 6 hours
    },
    jobId: "analytics-job"
}).catch(console.error);

process.on("SIGTERM", async () => {
  logger.warn("sigterm_received", {
    pid: process.pid,
  });
  await scheduleQueue.close();
  await analyticsQueue.close();
  await scheduleWorker.close();
  await analyticsWorker.close();
  process.exit(0);
});
