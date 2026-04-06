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

/** Payload carried by every job on the X tier refresh queue. */
export interface RefreshXTiersJobPayload {
  triggeredBy: "scheduler"; // distinguishes from manual refreshes
}

export const xTierRefreshQueue = new Queue<RefreshXTiersJobPayload>("x-tier-refresh-queue", { connection: connection as any });

/** Job type name for the token health check job. */
export const TOKEN_HEALTH_JOB = "token-health-check" as const;

/** Payload carried by every job on the token health check queue. */
export interface TokenHealthJobPayload {
  correlationId?: string;
}

export const tokenHealthQueue = new Queue<TokenHealthJobPayload>("token-health-queue", { connection: connection as any });

/**
 * Shared BullMQ job options for all publish-post jobs.
 *
 * `removeOnComplete: { count, age }` retains the 1,000 most-recent completed
 * jobs for up to 24 hours in Redis. This provides a secondary audit trail that
 * survives a transient `job_runs` DB write failure, unlike `removeOnComplete: true`
 * which deletes the entry immediately when the processor returns.
 *
 * `removeOnFail: { age }` retains failed jobs for 7 days so the Jobs dashboard
 * can surface them for operator review, then prunes them automatically.
 * The previous `removeOnFail: false` kept failed jobs indefinitely — in a
 * production system with 5 retries × N users, this causes unbounded Redis
 * growth that can exhaust memory and take down the queue entirely.
 *
 * WARNING: X media IDs expire 24 h after upload.
 * Max total retry window (5 attempts, exponential from 60 s) is ~30 min —
 * well within 24 h. Do NOT increase `attempts` beyond ~8 without recalculating.
 */
export const SCHEDULE_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 60_000 },
  removeOnComplete: { count: 1_000, age: 86_400 } as const,
  removeOnFail: { age: 7 * 24 * 60 * 60 } as const, // 7-day TTL then prune
} as const;
