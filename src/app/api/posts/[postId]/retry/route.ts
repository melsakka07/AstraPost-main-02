import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { scheduleQueue, SCHEDULE_JOB_OPTIONS } from "@/lib/queue/client";
import { posts } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const ctx = await getTeamContext();
  if (!ctx) return new NextResponse("Unauthorized", { status: 401 });

  const correlationId = getCorrelationId(req);
  logger.info("api_request", {
    route: "/api/posts/[postId]/retry",
    method: "POST",
    correlationId,
    userId: ctx.session.user.id,
  });

  const { postId } = await params;

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      tweets: true,
      xAccount: { columns: { userId: true } },
    },
  });

  if (!post) return new NextResponse("Not found", { status: 404 });

  // Verify ownership via team context — supports both personal and team workspaces
  const accountOwnerId = post.xAccount?.userId ?? post.userId;
  if (accountOwnerId !== ctx.currentTeamId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (post.status !== "failed") {
    return NextResponse.json(
      { error: "Only failed posts can be retried." },
      { status: 400 }
    );
  }

  await db
    .update(posts)
    .set({
      status: "scheduled",
      scheduledAt: new Date(),
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

  await scheduleQueue.add(
    "publish-post",
    { postId, userId: ctx.session.user.id, correlationId },
    { delay: 0, jobId: postId, ...SCHEDULE_JOB_OPTIONS }
  );

  const res = NextResponse.json({ success: true });
  res.headers.set("x-correlation-id", correlationId);
  return res;
}
