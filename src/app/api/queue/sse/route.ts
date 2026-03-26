import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

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
  const ctx = await getTeamContext();
  if (!ctx) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const sinceParam = url.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 2 * 60 * 1000);

  const changed = await db.query.posts.findMany({
    where: and(
      eq(posts.userId, ctx.currentTeamId),
      inArray(posts.status, ["published", "failed"]),
      gt(posts.updatedAt, since)
    ),
    columns: { id: true, status: true, failReason: true },
  });

  return Response.json({ events: changed, serverTime: new Date().toISOString() });
}
