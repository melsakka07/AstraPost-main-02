import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { scheduleQueue } from "@/lib/queue/client";
import { posts } from "@/lib/schema";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const correlationId = getCorrelationId(req);
  logger.info("api_request", {
    route: "/api/posts/[postId]/reschedule",
    method: "POST",
    correlationId,
    userId: session.user.id,
  });

  const { postId } = await params;
  const body = await req.json().catch(() => null);
  const scheduledAt = body?.scheduledAt ? new Date(body.scheduledAt) : null;
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
  }

  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, postId), eq(posts.userId, session.user.id)),
  });

  if (!post) return new NextResponse("Not found", { status: 404 });

  if (post.status !== "scheduled") {
    return NextResponse.json(
      { error: "Only scheduled posts can be rescheduled." },
      { status: 400 }
    );
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
  }

  const delay = Math.max(0, scheduledAt.getTime() - Date.now());
  await scheduleQueue.add(
    "publish-post",
    { postId, userId: session.user.id, correlationId },
    {
      delay,
      jobId: postId,
      attempts: 5,
      backoff: { type: "exponential", delay: 60_000 },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  const res = NextResponse.json({ success: true });
  res.headers.set("x-correlation-id", correlationId);
  return res;
}
