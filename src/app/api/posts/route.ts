import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkPostLimitDetailed, createPlanLimitResponse } from "@/lib/middleware/require-plan";
import { scheduleQueue, SCHEDULE_JOB_OPTIONS } from "@/lib/queue/client";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { tweets, media, xAccounts, linkedinAccounts, instagramAccounts, user, posts } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";
import type { InferSelectModel } from "drizzle-orm";

type XAccountRow = InferSelectModel<typeof xAccounts>;
type LinkedInAccountRow = InferSelectModel<typeof linkedinAccounts>;
type InstagramAccountRow = InferSelectModel<typeof instagramAccounts>;
type PlatformAccount =
  | { id: string; platform: "twitter"; obj: XAccountRow }
  | { id: string; platform: "linkedin"; obj: LinkedInAccountRow }
  | { id: string; platform: "instagram"; obj: InstagramAccountRow };

const createPostSchema = z.object({
  tweets: z
    .array(
      z.object({
        content: z.string().min(1).max(3000), // min(1): blank tweets fail at publish; catch early
        media: z
          .array(
            z.object({
              url: z.string(),
              mimeType: z.string(),
              fileType: z.enum(["image", "video", "gif"]),
              size: z.number(),
            })
          )
          .optional(),
      })
    )
    .min(1),
  targetAccountIds: z.array(z.string()).optional(),
  scheduledAt: z.string().optional(), // ISO string
  recurrencePattern: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).optional(),
  recurrenceEndDate: z.string().optional(),
  action: z.enum(["draft", "schedule", "publish_now"]).default("draft"),
});

export async function POST(req: Request) {
  try {
    const ctx = await getTeamContext();
    if (!ctx) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Role check: Viewers cannot create posts
    if (ctx.role === "viewer") {
      return new Response("Forbidden: Viewers cannot create posts", { status: 403 });
    }

    const dbUser = await db.query.user.findFirst({
        where: eq(user.id, ctx.currentTeamId),
        columns: { plan: true, requiresApproval: true }
    });
    
    // Rate limit check against the Team Owner's plan
    const rlResult = await checkRateLimit(ctx.currentTeamId, dbUser?.plan || "free", "posts");
    if (!rlResult.success) return createRateLimitResponse(rlResult);

    const correlationId = getCorrelationId(req);
    logger.info("api_request", {
      route: "/api/posts",
      method: "POST",
      correlationId,
      userId: ctx.currentTeamId, // Log against team owner
      actorId: ctx.isOwner ? undefined : ctx.session.user.id
    });

    const json = await req.json();
    const result = createPostSchema.safeParse(json);

    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: result.error }), { status: 400 });
    }

    const { tweets: tweetsData, scheduledAt, action, targetAccountIds, recurrencePattern, recurrenceEndDate } = result.data;

    const availableX = await db.query.xAccounts.findMany({
      where: and(eq(xAccounts.userId, ctx.currentTeamId), eq(xAccounts.isActive, true)),
    });
    const availableLi = await db.query.linkedinAccounts.findMany({
      where: and(eq(linkedinAccounts.userId, ctx.currentTeamId), eq(linkedinAccounts.isActive, true)),
    });
    const availableInsta = await db.query.instagramAccounts.findMany({
      where: and(eq(instagramAccounts.userId, ctx.currentTeamId), eq(instagramAccounts.isActive, true)),
    });

    const selectedAccounts: PlatformAccount[] = [];
    const rawIds = targetAccountIds || [];

    for (const idStr of rawIds) {
        if (idStr.startsWith("twitter:")) {
            const id = idStr.split(":")[1] || "";
            const acc = availableX.find(a => a.id === id);
            if (acc) selectedAccounts.push({ id, platform: 'twitter', obj: acc });
        } else if (idStr.startsWith("linkedin:")) {
            const id = idStr.split(":")[1] || "";
            const acc = availableLi.find(a => a.id === id);
            if (acc) selectedAccounts.push({ id, platform: 'linkedin', obj: acc });
        } else if (idStr.startsWith("instagram:")) {
            const id = idStr.split(":")[1] || "";
            const acc = availableInsta.find(a => a.id === id);
            if (acc) selectedAccounts.push({ id, platform: 'instagram', obj: acc });
        } else {
            // Fallback for legacy clients sending plain IDs (assumed Twitter)
            const acc = availableX.find(a => a.id === idStr);
            if (acc) selectedAccounts.push({ id: idStr, platform: 'twitter', obj: acc });
        }
    }

    // Default fallback if nothing valid selected
    if (selectedAccounts.length === 0) {
        if (availableX.length > 0) {
             const def = availableX.find(a => a.isDefault) || availableX[0];
             if (def) selectedAccounts.push({ id: def.id, platform: 'twitter', obj: def });
        } else if (availableLi.length > 0) {
             const def = availableLi[0];
             if (def) selectedAccounts.push({ id: def.id, platform: 'linkedin', obj: def });
        } else {
             return new Response(JSON.stringify({ error: "No connected accounts" }), { status: 400 });
        }
    }

    const idempotencyKey = req.headers.get("idempotency-key");
    if (idempotencyKey) {
      const keysToCheck = selectedAccounts.map((a) => `${idempotencyKey}:${a.platform}:${a.id}`);
      const existingPosts = await db.query.posts.findMany({
        where: inArray(posts.idempotencyKey, keysToCheck),
      });

      if (existingPosts.length > 0 && existingPosts[0]) {
        return Response.json({
          success: true,
          groupId: existingPosts[0].groupId,
          postIds: existingPosts.map((p) => p.id),
          idempotentReplay: true,
        });
      }
    }

    if (action !== "draft") {
      const postLimit = await checkPostLimitDetailed(ctx.currentTeamId, selectedAccounts.length);
      if (!postLimit.allowed) {
        return createPlanLimitResponse(postLimit);
      }
    }

    // Determine Status
    let status: "draft" | "scheduled" | "awaiting_approval" = "draft";
    let finalScheduledAt: Date | null = null;
    let requiresApproval = false;

    if (action === "schedule" || action === "publish_now") {
        if (action === "schedule" && !scheduledAt) {
            return new Response(JSON.stringify({ error: "Scheduled date is required for scheduling" }), { status: 400 });
        }
        
        // Approval Workflow Logic
        if (dbUser?.requiresApproval && !ctx.isOwner && ctx.role !== "admin") {
             // Editors require approval if enabled
             status = "awaiting_approval";
             requiresApproval = true;
        } else {
             status = "scheduled";
        }

        finalScheduledAt = action === "schedule" ? new Date(scheduledAt!) : new Date();
    } else {
        status = "draft";
    }

    // E16: Validate recurrence end date is within 1 year of the scheduled date (or now).
    // Prevents unbounded queue growth from recurrence patterns with no realistic horizon.
    if (recurrencePattern && recurrencePattern !== "none" && recurrenceEndDate) {
      const anchor = finalScheduledAt ?? new Date();
      const maxAllowedEndDate = new Date(anchor.getTime() + 365 * 24 * 60 * 60 * 1000);
      if (new Date(recurrenceEndDate) > maxAllowedEndDate) {
        return new Response(
          JSON.stringify({ error: "Recurrence end date cannot be more than 1 year from the scheduled date" }),
          { status: 400 }
        );
      }
    }

    const groupId = selectedAccounts.length > 1 ? crypto.randomUUID() : null;
    const createdPostIds: string[] = [];

    // Get actual user ID for authorship (use session already resolved by getTeamContext)
    const authorId = ctx.session.user.id;

    // --- Bulk-insert: pre-generate all IDs and collect rows before touching the DB ---
    // Replaces 3-level nested sequential awaits (worst case 780 round trips) with
    // 3 batched INSERT calls inside a single transaction.
    const postRows:  (typeof posts.$inferInsert)[]   = [];
    const tweetRows: (typeof tweets.$inferInsert)[]  = [];
    const mediaRows: (typeof media.$inferInsert)[]   = [];
    const queueJobs: { postId: string; delay: number }[] = [];

    const postType = tweetsData.length > 1 ? "thread" : undefined;

    for (const acc of selectedAccounts) {
      const postId = crypto.randomUUID();
      createdPostIds.push(postId);

      postRows.push({
        id: postId,
        userId: authorId,
        xAccountId: acc.platform === 'twitter' ? acc.id : null,
        linkedinAccountId: acc.platform === 'linkedin' ? acc.id : null,
        instagramAccountId: acc.platform === 'instagram' ? acc.id : null,
        platform: acc.platform,
        groupId,
        type: postType ?? (acc.platform === 'linkedin' ? 'linkedin_post' : 'tweet'),
        status,
        scheduledAt: finalScheduledAt,
        requiresApproval,
        recurrencePattern: recurrencePattern && recurrencePattern !== "none" ? recurrencePattern : null,
        recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
        idempotencyKey: idempotencyKey ? `${idempotencyKey}:${acc.platform}:${acc.id}` : null,
      });

      for (let i = 0; i < tweetsData.length; i++) {
        const tweetId = crypto.randomUUID();
        const t = tweetsData[i]!;

        tweetRows.push({ id: tweetId, postId, content: t.content, position: i + 1 });

        for (const m of (t.media ?? [])) {
          mediaRows.push({
            id: crypto.randomUUID(),
            postId,
            userId: authorId,
            tweetId,
            fileUrl: m.url,
            fileType: m.fileType,
            fileSize: m.size,
          });
        }
      }

      if (status === "scheduled") {
        queueJobs.push({ postId, delay: Math.max(0, finalScheduledAt!.getTime() - Date.now()) });
      }
    }

    // Single transaction: insert posts → tweets → media in 3 batched calls
    await db.transaction(async (tx) => {
      await tx.insert(posts).values(postRows);
      if (tweetRows.length > 0) await tx.insert(tweets).values(tweetRows);
      if (mediaRows.length > 0) await tx.insert(media).values(mediaRows);
    });

    // Enqueue all BullMQ jobs concurrently after the DB transaction commits
    if (queueJobs.length > 0) {
      await Promise.all(
        queueJobs.map(({ postId, delay }) =>
          scheduleQueue.add(
            "publish-post",
            { postId, userId: authorId, correlationId },
            { delay, jobId: postId, ...SCHEDULE_JOB_OPTIONS }
          )
        )
      );
    }

    const res = Response.json({ success: true, groupId, postIds: createdPostIds });
    res.headers.set("x-correlation-id", correlationId);
    return res;

  } catch (error) {
    console.error("Create Post Error:", error);
    return new Response(JSON.stringify({ error: "Failed to create post" }), { status: 500 });
  }
}
