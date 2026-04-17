import { eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { scheduleQueue, SCHEDULE_JOB_OPTIONS } from "@/lib/queue/client";
import { posts } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

export async function POST(req: Request, { params }: { params: Promise<{ postId: string }> }) {
  const ctx = await getTeamContext();
  if (!ctx) return ApiError.unauthorized();
  if (ctx.role === "viewer") return ApiError.forbidden("Viewers cannot reschedule posts");

  const correlationId = getCorrelationId(req);
  logger.info("api_request", {
    route: "/api/posts/[postId]/reschedule",
    method: "POST",
    correlationId,
    userId: ctx.session.user.id,
  });

  const { postId } = await params;
  const body = await req.json().catch(() => null);
  const scheduledAt = body?.scheduledAt ? new Date(body.scheduledAt) : null;
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return ApiError.badRequest("Invalid scheduledAt");
  }

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      xAccount: { columns: { userId: true } },
    },
  });

  if (!post) return ApiError.notFound();

  // Verify ownership via team context — supports both personal and team workspaces
  const accountOwnerId = post.xAccount?.userId ?? post.userId;
  if (accountOwnerId !== ctx.currentTeamId) {
    return ApiError.forbidden("Forbidden");
  }

  if (post.status !== "scheduled") {
    return ApiError.badRequest("Only scheduled posts can be rescheduled.");
  }

  await db
    .update(posts)
    .set({
      scheduledAt,
      failReason: null,
      lastErrorCode: null,
      lastErrorAt: null,
    })
    .where(eq(posts.id, postId));

  try {
    await scheduleQueue.remove(postId);
  } catch {
    // Safe to ignore — job may not exist in the queue
  }

  const delay = Math.max(0, scheduledAt.getTime() - Date.now());
  await scheduleQueue.add(
    "publish-post",
    { postId, userId: ctx.session.user.id, correlationId },
    { delay, jobId: postId, ...SCHEDULE_JOB_OPTIONS }
  );

  const res = Response.json({ success: true });
  res.headers.set("x-correlation-id", correlationId);
  return res;
}
