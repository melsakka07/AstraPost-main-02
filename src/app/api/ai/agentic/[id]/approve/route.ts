import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { AgenticTweetsSchema } from "@/lib/ai/agentic-types";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { agenticPosts, posts, tweets, media } from "@/lib/schema";
import { recordAiUsage } from "@/lib/services/ai-quota";

const approveSchema = z.object({
  action: z.enum(["post_now", "schedule", "save_draft"]),
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  tweets: AgenticTweetsSchema.min(1),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const correlationId = getCorrelationId(req);
  const { id } = await params;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return ApiError.unauthorized();

    const json = (await req.json()) as unknown;
    const parsed = approveSchema.safeParse(json);
    if (!parsed.success) {
      logger.warn("agentic_approve_validation_failed", {
        id,
        correlationId,
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
      return ApiError.badRequest(parsed.error.issues);
    }

    const { action, scheduledAt, tweets: editedTweets } = parsed.data;

    if (action === "schedule" && !scheduledAt) {
      return ApiError.badRequest("scheduledAt is required when action is 'schedule'");
    }

    // Load and verify ownership + status
    const agenticPost = await db.query.agenticPosts.findFirst({
      where: and(eq(agenticPosts.id, id), eq(agenticPosts.userId, session.user.id)),
    });
    if (!agenticPost) return ApiError.notFound("Agentic post");
    if (agenticPost.status !== "ready") {
      return ApiError.badRequest(`Cannot approve a post with status '${agenticPost.status}'`);
    }

    // Determine post status
    const postStatus =
      action === "post_now" ? "scheduled" : action === "schedule" ? "scheduled" : "draft";

    const postId = nanoid();
    const scheduledAtDate =
      action === "schedule" && scheduledAt
        ? new Date(scheduledAt)
        : action === "post_now"
          ? new Date()
          : null;

    // Create posts + tweets + media in a transaction
    await db.transaction(async (tx) => {
      // Insert post
      await tx.insert(posts).values({
        id: postId,
        userId: session.user.id,
        xAccountId: agenticPost.xAccountId,
        status: postStatus,
        aiGenerated: true,
        ...(scheduledAtDate && { scheduledAt: scheduledAtDate }),
      });

      // Insert tweets — tweets.content is the column name (not body)
      const tweetRows = editedTweets.map((t, idx) => ({
        id: nanoid(),
        postId,
        position: t.position ?? idx + 1,
        content: [t.text, ...(t.hashtags ?? []).map((h) => `#${h}`)].join(" "),
      }));

      if (tweetRows.length > 0) {
        await tx.insert(tweets).values(tweetRows);
      }

      // Insert media for tweets with imageUrl
      // media columns: fileUrl, fileType, fileSize (not url/mimeType/source)
      const mediaRows = editedTweets
        .filter((t) => t.imageUrl != null)
        .map((t, idx) => {
          const matchingTweetRow =
            tweetRows.find((tr) => tr.position === (t.position ?? idx + 1)) ?? tweetRows[0];
          return {
            id: nanoid(),
            postId,
            userId: session.user.id,
            tweetId: matchingTweetRow?.id,
            fileUrl: t.imageUrl!,
            fileType: "image",
          };
        });

      if (mediaRows.length > 0) {
        await tx.insert(media).values(mediaRows);
      }

      // Update agentic_posts row
      const agenticStatus =
        action === "post_now" ? "posted" : action === "schedule" ? "scheduled" : "approved";

      await tx
        .update(agenticPosts)
        .set({ status: agenticStatus, postId })
        .where(eq(agenticPosts.id, id));
    });

    // Enqueue immediate publish job for post_now action.
    // Dynamic import avoids loading BullMQ/IORedis at module-init time, which
    // causes Next.js to fail resolving ioredis/built/utils and silently return
    // 404 for the entire route (module load failure ≠ handler error).
    if (action === "post_now") {
      try {
        const { scheduleQueue, SCHEDULE_JOB_OPTIONS } = await import("@/lib/queue/client");
        await scheduleQueue.add(
          "publish-post",
          { postId, userId: session.user.id, correlationId },
          SCHEDULE_JOB_OPTIONS
        );
      } catch (queueError) {
        logger.error("queue_enqueue_failed", {
          postId,
          agenticPostId: id,
          error: queueError instanceof Error ? queueError.message : String(queueError),
          correlationId,
        });
        // Post was already saved to DB (line 69-122), so return success but flag queue issue
        const res = Response.json({
          postId,
          action,
          queueWarning: "Post saved but not queued — may require manual publish",
        });
        res.headers.set("x-correlation-id", correlationId);
        return res;
      }
    }

    logger.info("agentic_approved", {
      agenticPostId: id,
      postId,
      action,
      correlationId,
    });

    // Record AI usage for the approval flow (non-blocking to avoid breaking the response)
    recordAiUsage(session.user.id, "agentic_approve", 0, "Approve action", null).catch((err) => {
      logger.error("failed_to_record_ai_usage", {
        error: err instanceof Error ? err.message : String(err),
        agenticPostId: id,
      });
    });
    return Response.json({ postId, action });
  } catch (err) {
    logger.error("agentic_approve_error", {
      error: err instanceof Error ? err.message : String(err),
      correlationId,
    });
    return ApiError.internal();
  }
}
