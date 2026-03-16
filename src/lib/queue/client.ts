import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

/** Payload carried by every "publish-post" job on the schedule queue. */
export interface PublishPostPayload {
  postId: string;
  userId: string;
  correlationId?: string;
}

/** Payload carried by every job on the analytics queue. */
export interface AnalyticsJobPayload {
  correlationId?: string;
  /** When present, refresh metrics only for these job-run IDs instead of all tweets. */
  runIds?: string[];
}

export const scheduleQueue = new Queue<PublishPostPayload>("schedule-queue", { connection: connection as any });
export const analyticsQueue = new Queue<AnalyticsJobPayload>("analytics-queue", { connection: connection as any });

/**
 * Shared BullMQ job options for all publish-post jobs.
 *
 * `removeOnComplete: { count, age }` retains the 1,000 most-recent completed
 * jobs for up to 24 hours in Redis. This provides a secondary audit trail that
 * survives a transient `job_runs` DB write failure, unlike `removeOnComplete: true`
 * which deletes the entry immediately when the processor returns.
 *
 * `removeOnFail: false` keeps failed jobs in Redis indefinitely so the Jobs
 * dashboard can surface them and operators can inspect / re-queue them.
 */
export const SCHEDULE_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 60_000 },
  removeOnComplete: { count: 1_000, age: 86_400 } as const,
  removeOnFail: false,
} as const;
