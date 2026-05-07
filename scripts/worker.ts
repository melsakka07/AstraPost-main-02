import "dotenv/config";
import { execSync } from "node:child_process";
import { Worker } from "bullmq";
import {
  connection,
  scheduleQueue,
  analyticsQueue,
  xTierRefreshQueue,
  tokenHealthQueue,
  pdfThreadQueue,
  youtubeThreadQueue,
  SCHEDULE_JOB_OPTIONS,
} from "@/lib/queue/client";
import {
  scheduleProcessor,
  analyticsProcessor,
  refreshXTiersProcessor,
  tokenHealthProcessor,
  pdfThreadProcessor,
  youtubeThreadProcessor,
} from "@/lib/queue/processors";
import "@/lib/env";
import { logger } from "@/lib/logger";
import { resolveYtDlpPath } from "@/lib/services/youtube";

logger.info("worker_started", {
  pid: process.pid,
  nodeEnv: process.env.NODE_ENV,
});

logger.info("worker_ready", {
  pid: process.pid,
  queues: [
    "schedule-queue",
    "analytics-queue",
    "x-tier-refresh-queue",
    "token-health-queue",
    "pdfThreadQueue",
    "youtubeThreadQueue",
  ],
});

const scheduleWorker = new Worker("schedule-queue", scheduleProcessor, {
  connection: connection as any,
  concurrency: 1, // CPU/Network-bound per-account lock: keep at 1 to prevent race conditions on single-use refresh tokens
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
  concurrency: 3, // I/O-bound (fetching stats): safe to run concurrently
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
  .catch((err) => logger.error("worker_schedule_failed", { error: err?.message ?? String(err) }));

// ── X Tier Refresh Worker ───────────────────────────────────────────────────
// Runs daily at 4 AM UTC to refresh X subscription tiers for all connected
// accounts whose cached tier data is stale (>24h old) or never fetched.
const xTierRefreshWorker = new Worker("x-tier-refresh-queue", refreshXTiersProcessor, {
  connection: connection as any,
  concurrency: 1, // API limits per app token: play it safe
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
  .catch((err) => logger.error("worker_schedule_failed", { error: err?.message ?? String(err) }));

// ── Token Health Check Worker ───────────────────────────────────────────────────
// Runs daily at 2 AM UTC to check for X account tokens expiring within 48 hours.
const tokenHealthWorker = new Worker("token-health-queue", tokenHealthProcessor, {
  connection: connection as any,
  concurrency: 1, // Runs once a day, no need for parallel execution
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
  .catch((err) => logger.error("worker_schedule_failed", { error: err?.message ?? String(err) }));

// ── PDF Thread Worker ────────────────────────────────────────────────────────
// Processes async PDF→Thread summarization jobs for PDFs with >30,000 chars.
// Concurrency is 1 to avoid overwhelming the AI API with multiple large
// chunked summarization workloads simultaneously.
const pdfThreadWorker = new Worker("pdfThreadQueue", pdfThreadProcessor, {
  connection: connection as any,
  concurrency: 1,
  lockDuration: 600_000, // 10 min — chunked summarization may take several minutes
});

pdfThreadWorker.on("completed", (job) => {
  logger.info("job_completed", {
    queue: "pdfThreadQueue",
    jobId: job.id,
  });
});

pdfThreadWorker.on("error", (err) => {
  logger.error("worker_error", {
    queue: "pdfThreadQueue",
    error: err.message,
  });
});

pdfThreadWorker.on("failed", (job, err) => {
  logger.error("job_failed", {
    queue: "pdfThreadQueue",
    jobId: job?.id ?? "unknown",
    jobDataId: job?.data?.jobId ?? "unknown",
    userId: job?.data?.userId ?? "unknown",
    correlationId: job?.data?.correlationId ?? null,
    error: err.message,
    attemptsMade: job?.attemptsMade ?? null,
  });
});

// ── YouTube Thread Worker ────────────────────────────────────────────────────
// Processes async YouTube→Thread jobs: download audio via yt-dlp,
// transcribe via Deepgram/Whisper, then generate a thread via OpenRouter.

// Healthcheck: verify yt-dlp is installed and functional before accepting jobs.
// Logs a single fatal error if the binary is missing or broken — the worker
// will still start but YouTube-to-Thread jobs will fail fast with a clear
// diagnostic instead of a cryptic ENOENT.
{
  const ytDlpPath = resolveYtDlpPath();
  try {
    const version = execSync(`"${ytDlpPath}" --version`, {
      encoding: "utf-8",
      timeout: 10_000,
    }).trim();
    logger.info("yt_dlp_healthcheck_passed", { path: ytDlpPath, version });
  } catch (err) {
    logger.error("yt_dlp_healthcheck_failed", {
      path: ytDlpPath,
      error: err instanceof Error ? err.message : String(err),
      action: "install_yt_dlp",
      hint: "Install yt-dlp: https://github.com/yt-dlp/yt-dlp#installation",
    });
  }
}

const youtubeThreadWorker = new Worker("youtubeThreadQueue", youtubeThreadProcessor, {
  connection: connection as any,
  concurrency: 1,
  lockDuration: 360_000, // 6 min for download + transcription + generation
});

youtubeThreadWorker.on("completed", (job) => {
  logger.info("job_completed", {
    queue: "youtubeThreadQueue",
    jobId: job.id,
  });
});

youtubeThreadWorker.on("error", (err) => {
  logger.error("worker_error", {
    queue: "youtubeThreadQueue",
    error: err.message,
  });
});

youtubeThreadWorker.on("failed", (job, err) => {
  logger.error("job_failed", {
    queue: "youtubeThreadQueue",
    jobId: job?.id ?? "unknown",
    jobDataId: job?.data?.jobId ?? "unknown",
    userId: job?.data?.userId ?? "unknown",
    correlationId: job?.data?.correlationId ?? null,
    error: err.message,
    attemptsMade: job?.attemptsMade ?? null,
  });
});

const shutdown = async (signal: string) => {
  logger.warn(`${signal}_received`, {
    pid: process.pid,
  });
  logger.info("worker_shutdown_start", { signal, pid: process.pid });
  await scheduleQueue.close();
  await analyticsQueue.close();
  await xTierRefreshQueue.close();
  await tokenHealthQueue.close();
  await pdfThreadQueue.close();
  await youtubeThreadQueue.close();
  await scheduleWorker.close();
  await analyticsWorker.close();
  await xTierRefreshWorker.close();
  await tokenHealthWorker.close();
  await pdfThreadWorker.close();
  await youtubeThreadWorker.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
