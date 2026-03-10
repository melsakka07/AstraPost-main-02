import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const scheduleQueue = new Queue("schedule-queue", { connection: connection as any });
export const analyticsQueue = new Queue("analytics-queue", { connection: connection as any });
