import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scheduleQueue } from "@/lib/queue/client";
import { posts, tweets, media } from "@/lib/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;

  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, postId), eq(posts.userId, session.user.id)),
    with: {
      tweets: {
        orderBy: (tweets, { asc }) => [asc(tweets.position)],
        with: {
          media: true
        }
      }
    }
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json(post);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;
  const body = await request.json();

  // 1. Verify ownership
  const existingPost = await db.query.posts.findFirst({
    where: and(eq(posts.id, postId), eq(posts.userId, session.user.id))
  });

  if (!existingPost) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Determine new status and scheduledAt
  let newStatus = existingPost.status;
  let newScheduledAt = existingPost.scheduledAt;

  if (body.action) {
      if (body.action === "schedule") {
          newStatus = "scheduled";
          if (body.scheduledAt) newScheduledAt = new Date(body.scheduledAt);
          else if (!newScheduledAt) return NextResponse.json({ error: "Scheduled date required" }, { status: 400 });
      } else if (body.action === "publish_now") {
          newStatus = "scheduled"; 
          newScheduledAt = new Date();
      } else if (body.action === "draft") {
          newStatus = "draft";
          newScheduledAt = null;
      } else if (body.action === "cancel") {
          newStatus = "cancelled";
          // Keep scheduledAt for record or clear it? Let's clear it to be safe against accidental rescheduling
          // actually, if we want to "reschedule" a cancelled post, we might want the old date. 
          // But "cancelled" implies it won't go out. 
          // Let's leave scheduledAt as is, or set to null. 
          // If I set to null, I need to make sure I don't break anything.
      }
  } else if (body.status) {
      newStatus = body.status;
      if (body.scheduledAt) newScheduledAt = new Date(body.scheduledAt);
  }
  
  // If scheduledAt is passed but action is not explicit, assume update
  if (body.scheduledAt) {
      newScheduledAt = new Date(body.scheduledAt);
  }

  // 2. Update Post
  await db.update(posts)
    .set({
      xAccountId: body.targetXAccountIds ? body.targetXAccountIds[0] : existingPost.xAccountId,
      scheduledAt: newScheduledAt,
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, postId));

  // 3. Update Tweets
  if (body.tweets && Array.isArray(body.tweets)) {
      // Delete existing tweets (cascade deletes media and analytics usually, but let's check schema)
      // tweets -> posts cascade delete. But here we are deleting tweets.
      // tweets table: postId references posts.id with cascade.
      // But we are keeping post, deleting tweets.
      // media -> tweetId references tweets.id with cascade.
      // So deleting tweets should delete media.
      await db.delete(tweets).where(eq(tweets.postId, postId));

      // Create new tweets
      for (let i = 0; i < body.tweets.length; i++) {
        const t = body.tweets[i];
        const tweetId = crypto.randomUUID();
        
        await db.insert(tweets).values({
            id: tweetId,
            postId: postId,
            content: t.content,
            position: i + 1,
        });

        if (t.media && Array.isArray(t.media)) {
             for (const m of t.media) {
                 await db.insert(media).values({
                     id: crypto.randomUUID(),
                     postId: postId,
                     tweetId: tweetId,
                     fileUrl: m.url, // Assuming composer sends 'url' not 'fileUrl'
                     fileType: m.fileType,
                     fileSize: m.size,
                 });
             }
        }
      }
  }

  // 4. Handle Queue
  const needsReschedule = newStatus === "scheduled" && (
      existingPost.status !== "scheduled" || 
      (existingPost.scheduledAt?.getTime() !== newScheduledAt?.getTime()) ||
      body.action === "publish_now" // Always reschedule if publish_now to be safe
  );
  
  const needsUnschedule = existingPost.status === "scheduled" && newStatus !== "scheduled";

  try {
    if (needsUnschedule) {
        const job = await scheduleQueue.getJob(postId);
        if (job) await job.remove();
    }

    if (needsReschedule && newScheduledAt) {
        // Remove old job if exists
        const job = await scheduleQueue.getJob(postId);
        if (job) await job.remove();

        const delay = Math.max(0, newScheduledAt.getTime() - Date.now());
        await scheduleQueue.add(
            "publish-post",
            { postId, userId: session.user.id },
            {
                delay,
                jobId: postId,
                attempts: 5,
                backoff: { type: "exponential", delay: 60_000 },
                removeOnComplete: true,
                removeOnFail: false,
            }
        );
    }
  } catch (e) {
      console.error("Queue operation failed", e);
      // Don't fail the request, but log it.
  }

  return NextResponse.json({ success: true });
}
