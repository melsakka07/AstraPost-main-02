import { and, eq, gt, inArray } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { posts } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

const POLL_TIMEOUT_MS = 7000;

type TimeoutResult<T> = { status: "ok"; value: T } | { status: "timed_out" } | { status: "error" };

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<TimeoutResult<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<TimeoutResult<T>>((resolve) => {
    timeoutId = setTimeout(() => resolve({ status: "timed_out" }), timeoutMs);
  });
  const resultPromise = promise
    .then((value) => ({ status: "ok", value }) as TimeoutResult<T>)
    .catch(() => ({ status: "error" }) as TimeoutResult<T>);
  const result = await Promise.race([resultPromise, timeoutPromise]);
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  return result;
}

/**
 * Polling endpoint — replaces the previous SSE/BullMQ QueueEvents approach.
 *
 * SSE on Vercel serverless held a Redis connection open for 300 s (the function
 * timeout), which caused Upstash connection exhaustion and repeated "Task timed
 * out" errors in logs.  Polling is simpler and serverless-friendly:
 *   - No persistent Redis connection
 *   - No BullMQ dependency at the HTTP layer
 *   - Client polls every 10 s instead of holding a socket open
 *
 * GET /api/queue/sse?since=<ISO timestamp>
 *
 * Returns posts that transitioned to "published" or "failed" since `since`.
 * The `since` param defaults to 2 minutes ago when omitted (first poll safety net).
 */
export async function GET(req: Request) {
  const ctxResult = await withTimeout(getTeamContext(), POLL_TIMEOUT_MS);
  if (ctxResult.status === "timed_out" || ctxResult.status === "error") {
    logger.warn("queue_sse_context_timeout");
    return Response.json({ events: [], serverTime: new Date().toISOString() });
  }
  const ctx = ctxResult.value;
  if (!ctx) {
    return ApiError.unauthorized();
  }

  const url = new URL(req.url);
  const sinceParam = url.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 2 * 60 * 1000);
  if (Number.isNaN(since.getTime())) {
    return ApiError.badRequest("Invalid since timestamp");
  }
  const serverTime = new Date().toISOString();

  const changedResult = await withTimeout(
    db.query.posts.findMany({
      where: and(
        eq(posts.userId, ctx.currentTeamId),
        inArray(posts.status, ["published", "failed"]),
        gt(posts.updatedAt, since)
      ),
      columns: { id: true, status: true, failReason: true },
    }),
    POLL_TIMEOUT_MS
  );

  if (changedResult.status !== "ok") {
    logger.warn("queue_sse_query_timeout", { teamId: ctx.currentTeamId });
    return Response.json({ events: [], serverTime, degraded: true });
  }

  return Response.json({ events: changedResult.value, serverTime });
}
