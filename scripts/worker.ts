import "dotenv/config";
import { Worker } from "bullmq";
import {
  connection,
  scheduleQueue,
  analyticsQueue,
  xTierRefreshQueue,
  tokenHealthQueue,
  SCHEDULE_JOB_OPTIONS,
} from "@/lib/queue/client";
import {
  scheduleProcessor,
  analyticsProcessor,
  refreshXTiersProcessor,
  tokenHealthProcessor,
} from "@/lib/queue/processors";
import "@/lib/env";
import { logger } from "@/lib/logger";

logger.info("worker_started", {
  pid: process.pid,
  nodeEnv: process.env.NODE_ENV,
});

console.log(
  `\n✅ [Worker] Started successfully (PID: ${process.pid}).\n⏳ Waiting for jobs in 'schedule-queue', 'analytics-queue', 'x-tier-refresh-queue', and 'token-health-queue'...\nPress Ctrl+C to exit.\n`
);

const scheduleWorker = new Worker("schedule-queue", scheduleProcessor, {
  connection: connection as any,
  lockDuration: 360_000, // 6 min — must exceed SCHEDULE_JOB_OPTIONS.timeout (2 min)
});

scheduleWorker.on("completed", (job) => {
  logger.info("job_completed", {
    queue: "schedule-queue",
    jobId: job.id,
  });
});

scheduleWorker.on("error", (err) => {
  logger.error("worker_error", {
    queue: "schedule-queue",
    error: err.message,
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

const analyticsWorker = new Worker("analytics-queue", analyticsProcessor, {
  connection: connection as any,
  lockDuration: 360_000, // 6 min — must exceed ANALYTICS_JOB_OPTIONS.timeout (5 min)
});

analyticsWorker.on("completed", (job) => {
  logger.info("job_completed", {
    queue: "analytics-queue",
    jobId: job.id,
  });
});

analyticsWorker.on("error", (err) => {
  logger.error("worker_error", {
    queue: "analytics-queue",
    error: err.message,
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
analyticsQueue
  .add(
    "update-metrics",
    {},
    {
      repeat: {
        every: 6 * 60 * 60 * 1000, // 6 hours
      },
      jobId: "analytics-job",
    }
  )
  .catch(console.error);

// ── X Tier Refresh Worker ───────────────────────────────────────────────────
// Runs daily at 4 AM UTC to refresh X subscription tiers for all connected
// accounts whose cached tier data is stale (>24h old) or never fetched.
const xTierRefreshWorker = new Worker("x-tier-refresh-queue", refreshXTiersProcessor, {
  connection: connection as any,
  lockDuration: 120_000, // 2 min — must exceed TIER_REFRESH_JOB_OPTIONS.timeout (1 min)
});

xTierRefreshWorker.on("completed", (job) => {
  logger.info("job_completed", {
    queue: "x-tier-refresh-queue",
    jobId: job.id,
  });
});

xTierRefreshWorker.on("error", (err) => {
  logger.error("worker_error", {
    queue: "x-tier-refresh-queue",
    error: err.message,
  });
});

xTierRefreshWorker.on("failed", (job, err) => {
  logger.error("job_failed", {
    queue: "x-tier-refresh-queue",
    jobId: job?.id ?? "unknown",
    error: err.message,
  });
});

// Schedule daily tier refresh at 4 AM UTC — low-traffic window.
xTierRefreshQueue
  .add(
    "refresh-x-tiers",
    { triggeredBy: "scheduler" },
    {
      repeat: { pattern: "0 4 * * *" }, // 4:00 AM UTC daily
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 20 },
    }
  )
  .catch(console.error);

// ── Token Health Check Worker ───────────────────────────────────────────────────
// Runs daily at 2 AM UTC to check for X account tokens expiring within 48 hours.
const tokenHealthWorker = new Worker("token-health-queue", tokenHealthProcessor, {
  connection: connection as any,
  lockDuration: 120_000, // 2 min — token health check should complete well within this
});

tokenHealthWorker.on("completed", (job) => {
  logger.info("job_completed", {
    queue: "token-health-queue",
    jobId: job.id,
  });
});

tokenHealthWorker.on("error", (err) => {
  logger.error("worker_error", {
    queue: "token-health-queue",
    error: err.message,
  });
});

tokenHealthWorker.on("failed", (job, err) => {
  logger.error("job_failed", {
    queue: "token-health-queue",
    jobId: job?.id ?? "unknown",
    error: err.message,
  });
});

// Schedule daily token health check at 2 AM UTC — before tier refresh.
tokenHealthQueue
  .add(
    "token-health-check",
    {},
    {
      repeat: { pattern: "0 2 * * *" }, // 2:00 AM UTC daily
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 20 },
    }
  )
  .catch(console.error);

const shutdown = async (signal: string) => {
  logger.warn(`${signal}_received`, {
    pid: process.pid,
  });
  console.log(`\n🛑 [Worker] Shutting down gracefully (${signal})...`);
  await scheduleQueue.close();
  await analyticsQueue.close();
  await xTierRefreshQueue.close();
  await tokenHealthQueue.close();
  await scheduleWorker.close();
  await analyticsWorker.close();
  await xTierRefreshWorker.close();
  await tokenHealthWorker.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
