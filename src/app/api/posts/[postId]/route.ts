import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scheduleQueue } from "@/lib/queue/client";
import { posts, tweets, media } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const ctx = await getTeamContext();
  
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;

  // Fetch post with xAccount relation to verify ownership
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      xAccount: {
        columns: { userId: true }
      },
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

  // Verify access:
  // 1. Post must belong to an X Account owned by the current team context
  if (post.xAccount.userId !== ctx.currentTeamId) {
     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(post);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const ctx = await getTeamContext();
  
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;
  const body = await request.json();

  // 1. Fetch post to verify ownership and current status
  const existingPost = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
        xAccount: { columns: { userId: true } }
    }
  });

  if (!existingPost) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Verify workspace access
  if (existingPost.xAccount.userId !== ctx.currentTeamId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Determine new status and scheduledAt
  let newStatus = existingPost.status;
  let newScheduledAt = existingPost.scheduledAt;
  let approvedBy = existingPost.approvedBy;
  let approvedAt = existingPost.approvedAt;
  let reviewerNotes = existingPost.reviewerNotes;

  if (body.action) {
      if (body.action === "approve") {
          // Role check
          if (!ctx.isOwner && ctx.role !== "admin") {
              return NextResponse.json({ error: "Only admins can approve posts" }, { status: 403 });
          }
          newStatus = "scheduled";
          const session = await auth.api.getSession({ headers: await headers() });
          approvedBy = session!.user.id;
          approvedAt = new Date();
          reviewerNotes = null; // Clear rejection notes if any
      } else if (body.action === "reject") {
          // Role check
          if (!ctx.isOwner && ctx.role !== "admin") {
              return NextResponse.json({ error: "Only admins can reject posts" }, { status: 403 });
          }
          newStatus = "draft";
          reviewerNotes = body.reviewerNotes || "Rejected without reason";
      } else if (body.action === "schedule") {
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
      approvedBy,
      approvedAt,
      reviewerNotes,
    })
    .where(eq(posts.id, postId));

  // 3. Update Tweets (only if provided)
  if (body.tweets && Array.isArray(body.tweets)) {
      await db.delete(tweets).where(eq(tweets.postId, postId));

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
                     fileUrl: m.url, 
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
      body.action === "publish_now" ||
      body.action === "approve" // Approval triggers scheduling
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
            { postId, userId: ctx.currentTeamId }, // Use team owner ID for the job
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
  }

  return NextResponse.json({ success: true });
}
