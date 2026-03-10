import "dotenv/config";
import { Worker } from "bullmq";
import { connection, scheduleQueue, analyticsQueue } from "@/lib/queue/client";
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
  logger.error("job_failed", {
    queue: "schedule-queue",
    jobId: job?.id || "unknown",
    error: err.message,
  });
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
  logger.error("job_failed", {
    queue: "analytics-queue",
    jobId: job?.id || "unknown",
    error: err.message,
  });
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
