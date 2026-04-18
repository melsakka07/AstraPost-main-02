import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { scheduleQueue, SCHEDULE_JOB_OPTIONS } from "@/lib/queue/client";
import { posts, tweets, media } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

const postPatchActionEnum = z.enum([
  "approve",
  "reject",
  "schedule",
  "publish_now",
  "draft",
  "cancel",
]);
const postStatusEnum = z.enum([
  "draft",
  "scheduled",
  "published",
  "failed",
  "cancelled",
  "awaiting_approval",
  "paused_needs_reconnect",
]);

const postPatchSchema = z.object({
  action: postPatchActionEnum.optional(),
  status: postStatusEnum.optional(),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  reviewerNotes: z.string().max(500).optional(),
  tweets: z
    .array(
      z.object({
        content: z.string().min(1).max(10000),
        media: z
          .array(
            z.object({
              url: z.string().url(),
              fileType: z.string(),
              size: z.number(),
            })
          )
          .optional(),
      })
    )
    .max(25)
    .optional(),
});

/**
 * Shared ownership check used by GET, PATCH, and DELETE.
 * Caller must guard against undefined/null before invoking this.
 * Returns a 403 Response on failure, null on success.
 */
async function checkPostOwnership(
  post: {
    userId: string;
    xAccount: { userId: string } | null;
    linkedinAccount: { userId: string } | null;
  },
  ctx: { currentTeamId: string }
): Promise<Response | null> {
  const accountOwnerId = post.xAccount?.userId ?? post.linkedinAccount?.userId;

  if (accountOwnerId) {
    if (accountOwnerId !== ctx.currentTeamId) {
      return ApiError.forbidden("Forbidden");
    }
  } else {
    // Orphan post (draft without account) — require creator or team owner
    const session = await auth.api.getSession({ headers: await headers() });
    if (post.userId !== session?.user.id && ctx.currentTeamId !== session?.user.id) {
      return ApiError.forbidden("Forbidden");
    }
  }

  return null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const ctx = await getTeamContext();

  if (!ctx) {
    return ApiError.unauthorized();
  }

  const { postId } = await params;

  // Fetch post with account relations to verify ownership
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      xAccount: {
        columns: { userId: true },
      },
      linkedinAccount: {
        columns: { userId: true },
      },
      tweets: {
        orderBy: (tweets, { asc }) => [asc(tweets.position)],
        with: {
          media: true,
        },
      },
    },
  });

  if (!post) return ApiError.notFound("Post not found");
  const ownershipError = await checkPostOwnership(post, ctx);
  if (ownershipError) return ownershipError;

  return Response.json(post);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const correlationId = getCorrelationId(request);
  const ctx = await getTeamContext();

  if (!ctx) {
    return ApiError.unauthorized();
  }

  // Viewers cannot edit posts
  if (ctx.role === "viewer") {
    return ApiError.forbidden("Viewers cannot edit posts");
  }

  const { postId } = await params;
  const rawBody = await request.json();

  const parsed = postPatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return ApiError.badRequest(parsed.error.issues);
  }
  const body = parsed.data;

  // 1. Fetch post to verify ownership and current status
  const existingPost = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      xAccount: { columns: { userId: true } },
      linkedinAccount: { columns: { userId: true } },
    },
  });

  if (!existingPost) return ApiError.notFound("Post not found");
  const ownershipError = await checkPostOwnership(existingPost, ctx);
  if (ownershipError) return ownershipError;

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
        return ApiError.forbidden("Only admins can approve posts");
      }
      newStatus = "scheduled";
      const session = await auth.api.getSession({ headers: await headers() });
      approvedBy = session!.user.id;
      approvedAt = new Date();
      reviewerNotes = null; // Clear rejection notes if any
    } else if (body.action === "reject") {
      // Role check
      if (!ctx.isOwner && ctx.role !== "admin") {
        return ApiError.forbidden("Only admins can reject posts");
      }
      newStatus = "draft";
      reviewerNotes = body.reviewerNotes || "Rejected without reason";
    } else if (body.action === "schedule") {
      newStatus = "scheduled";
      if (body.scheduledAt) newScheduledAt = new Date(body.scheduledAt);
      else if (!newScheduledAt) return ApiError.badRequest("Scheduled date required");
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

  // Clear failure metadata when a failed post is being re-scheduled
  const isRecoveringFromFailure =
    (existingPost.status === "failed" || existingPost.status === "paused_needs_reconnect") &&
    newStatus === "scheduled";

  // 2. Update Post
  await db
    .update(posts)
    .set({
      scheduledAt: newScheduledAt,
      status: newStatus,
      updatedAt: new Date(),
      approvedBy,
      approvedAt,
      reviewerNotes,
      ...(isRecoveringFromFailure && {
        failReason: null,
        lastErrorCode: null,
        lastErrorAt: null,
      }),
    })
    .where(eq(posts.id, postId));

  // 3. Update Tweets (only if provided) — wrapped in a transaction so a
  //    failure mid-loop never leaves the post in a partial (tweetless) state.
  if (body.tweets) {
    const tweetUpdates = body.tweets;
    await db.transaction(async (tx) => {
      await tx.delete(tweets).where(eq(tweets.postId, postId));

      for (let i = 0; i < tweetUpdates.length; i++) {
        const t = tweetUpdates[i]!;
        const tweetId = crypto.randomUUID();

        await tx.insert(tweets).values({
          id: tweetId,
          postId: postId,
          content: t.content,
          position: i + 1,
        });

        if (t.media) {
          for (const m of t.media) {
            await tx.insert(media).values({
              id: crypto.randomUUID(),
              postId: postId,
              userId: existingPost.userId,
              tweetId: tweetId,
              fileUrl: m.url,
              fileType: m.fileType,
              fileSize: m.size,
            });
          }
        }
      }
    });
  }

  // 4. Handle Queue
  const needsReschedule =
    newStatus === "scheduled" &&
    (existingPost.status !== "scheduled" ||
      existingPost.scheduledAt?.getTime() !== newScheduledAt?.getTime() ||
      body.action === "publish_now" ||
      body.action === "approve"); // Approval triggers scheduling

  const needsUnschedule = existingPost.status === "scheduled" && newStatus !== "scheduled";

  try {
    if (needsUnschedule) {
      const job = await scheduleQueue.getJob(postId);
      if (job) await job.remove();
    }

    if (needsReschedule && newScheduledAt) {
      // Remove any existing job regardless of BullMQ state (waiting, active, or failed).
      // getJob() does not return failed-state jobs, so we use remove() directly.
      try {
        await scheduleQueue.remove(postId);
      } catch {
        // Safe to ignore — job may not exist
      }

      const delay = Math.max(0, newScheduledAt.getTime() - Date.now());
      await scheduleQueue.add(
        "publish-post",
        { postId, userId: ctx.currentTeamId },
        { delay, jobId: postId, ...SCHEDULE_JOB_OPTIONS }
      );
    }
  } catch (e) {
    logger.error("Queue operation failed", { error: e });
  }

  const res = Response.json({ success: true });
  res.headers.set("x-correlation-id", correlationId);
  return res;
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const correlationId = getCorrelationId(_request);
  const ctx = await getTeamContext();

  if (!ctx) {
    return ApiError.unauthorized();
  }

  // Viewers cannot delete posts
  if (ctx.role === "viewer") {
    return ApiError.forbidden("Viewers cannot delete posts");
  }

  const { postId } = await params;

  // 1. Fetch post to verify ownership
  const existingPost = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      xAccount: { columns: { userId: true } },
      linkedinAccount: { columns: { userId: true } },
    },
  });

  if (!existingPost) return ApiError.notFound("Post not found");
  const ownershipError = await checkPostOwnership(existingPost, ctx);
  if (ownershipError) return ownershipError;

  // 2. Remove from Queue if scheduled
  try {
    if (existingPost.status === "scheduled") {
      const job = await scheduleQueue.getJob(postId);
      if (job) await job.remove();
    }
  } catch (e) {
    logger.error("Queue removal failed", { error: e });
  }

  // 3. Delete from DB
  await db.delete(posts).where(eq(posts.id, postId));

  const res = Response.json({ success: true });
  res.headers.set("x-correlation-id", correlationId);
  return res;
}
