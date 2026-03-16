import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { scheduleQueue, SCHEDULE_JOB_OPTIONS } from "@/lib/queue/client";
import { posts } from "@/lib/schema";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const correlationId = getCorrelationId(req);
  logger.info("api_request", {
    route: "/api/posts/[postId]/retry",
    method: "POST",
    correlationId,
    userId: session.user.id,
  });

  const { postId } = await params;

  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, postId), eq(posts.userId, session.user.id)),
    with: {
      tweets: true,
    },
  });

  if (!post) return new NextResponse("Not found", { status: 404 });

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
  }

  await scheduleQueue.add(
    "publish-post",
    { postId, userId: session.user.id, correlationId },
    { delay: 0, jobId: postId, ...SCHEDULE_JOB_OPTIONS }
  );

  const res = NextResponse.json({ success: true });
  res.headers.set("x-correlation-id", correlationId);
  return res;
}
