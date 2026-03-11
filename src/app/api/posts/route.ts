
import { headers } from "next/headers";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkPostLimitDetailed, createPlanLimitResponse } from "@/lib/middleware/require-plan";
import { scheduleQueue } from "@/lib/queue/client";
import { checkRateLimit } from "@/lib/rate-limiter";
import { tweets, media, xAccounts, account, user, posts } from "@/lib/schema";
import { decryptToken, encryptToken } from "@/lib/security/token-encryption";
import { getTeamContext } from "@/lib/team-context";

const createPostSchema = z.object({
  tweets: z
    .array(
      z.object({
        content: z.string().max(280),
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
  targetXAccountIds: z.array(z.string()).optional(),
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
    const { success, reset } = await checkRateLimit(ctx.currentTeamId, dbUser?.plan || "free", "posts");
    if (!success) {
        return new Response(JSON.stringify({ 
            error: "Too many requests", 
            retryAfter: Math.ceil((reset - Date.now()) / 1000) 
        }), { 
            status: 429,
            headers: { "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString() }
        });
    }

    const correlationId = getCorrelationId(req);
    logger.info("api_request", {
      route: "/api/posts",
      method: "POST",
      correlationId,
      userId: ctx.currentTeamId, // Log against team owner
      actorId: ctx.isOwner ? undefined : (await auth.api.getSession({ headers: await headers() }))?.user.id
    });

    const json = await req.json();
    const result = createPostSchema.safeParse(json);

    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: result.error }), { status: 400 });
    }

    const { tweets: tweetsData, scheduledAt, action, targetXAccountIds, recurrencePattern, recurrenceEndDate } = result.data;

    // Only sync accounts if we are the owner operating on our own workspace
    if (ctx.isOwner) {
      const session = await auth.api.getSession({ headers: await headers() });
      if (session) {
        const linkedAccounts = await db.query.account.findMany({
          where: and(eq(account.userId, session.user.id), eq(account.providerId, "twitter")),
        });

        for (const la of linkedAccounts) {
          if (!la.accessToken) continue;
          const existing = await db.query.xAccounts.findFirst({
            where: eq(xAccounts.xUserId, la.accountId),
          });

          if (!existing) {
            await db.insert(xAccounts).values({
              id: crypto.randomUUID(),
              userId: session.user.id,
              xUserId: la.accountId,
              xUsername: session.user.name || "twitter_user",
              xDisplayName: session.user.name || session.user.name || "Twitter User",
              xAvatarUrl: session.user.image,
              accessToken: encryptToken(la.accessToken),
              refreshTokenEnc: la.refreshToken ? encryptToken(la.refreshToken) : null,
              refreshToken: null,
              tokenExpiresAt: la.accessTokenExpiresAt,
              isActive: true,
            });
          } else {
            // Update logic...
             const accessTokenChanged = decryptToken(existing.accessToken) !== la.accessToken;
             const refreshTokenChanged =
               (existing.refreshToken || null) !== (la.refreshToken || null) ||
               (Boolean(la.refreshToken) && !existing.refreshTokenEnc);
             const expiresChanged =
               (existing.tokenExpiresAt?.getTime() || null) !==
               (la.accessTokenExpiresAt?.getTime() || null);
     
             if (accessTokenChanged || refreshTokenChanged || expiresChanged) {
               await db
                 .update(xAccounts)
                 .set({
                   accessToken: encryptToken(la.accessToken),
                   refreshTokenEnc: la.refreshToken ? encryptToken(la.refreshToken) : existing.refreshTokenEnc,
                   refreshToken: null,
                   tokenExpiresAt: la.accessTokenExpiresAt,
                   isActive: true,
                   updatedAt: new Date(),
                 })
                 .where(eq(xAccounts.id, existing.id));
             }
          }
        }
      }
    }

    const availableAccounts = await db.query.xAccounts.findMany({
      where: and(eq(xAccounts.userId, ctx.currentTeamId), eq(xAccounts.isActive, true)),
    });

    if (availableAccounts.length === 0) {
      return new Response(JSON.stringify({ error: "No connected X account" }), { status: 400 });
    }

    const selectedIds =
      targetXAccountIds && targetXAccountIds.length > 0
        ? targetXAccountIds
        : (() => {
            const defaults = availableAccounts.filter((a) => a.isDefault).map((a) => a.id);
            return defaults.length > 0 ? defaults : [availableAccounts[0]!.id];
          })();

    const selectedAccounts = availableAccounts.filter((a) => selectedIds.includes(a.id));
    if (selectedAccounts.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid target X accounts" }), { status: 400 });
    }

    const idempotencyKey = req.headers.get("idempotency-key");
    if (idempotencyKey) {
      const keysToCheck = selectedAccounts.map((a) => `${idempotencyKey}:${a.id}`);
      const existingPosts = await db.query.posts.findMany({
        where: inArray(posts.idempotencyKey, keysToCheck),
      });

      if (existingPosts.length > 0) {
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
    let status = "draft";
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

    const groupId = selectedAccounts.length > 1 ? crypto.randomUUID() : null;
    const createdPostIds: string[] = [];
    
    // Get actual user ID for authorship
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }
    const authorId = session.user.id;

    for (const acc of selectedAccounts) {
      const postId = crypto.randomUUID();
      createdPostIds.push(postId);

      await db.insert(posts).values({
        id: postId,
        userId: authorId, // Author is the logged in user
        xAccountId: acc.id, // Account belongs to team owner
        groupId,
        type: tweetsData.length > 1 ? "thread" : "tweet",
        status: status,
        scheduledAt: finalScheduledAt,
        requiresApproval: requiresApproval,
        recurrencePattern: recurrencePattern && recurrencePattern !== "none" ? recurrencePattern : null,
        recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
        idempotencyKey: idempotencyKey ? `${idempotencyKey}:${acc.id}` : null,
      });

      for (let i = 0; i < tweetsData.length; i++) {
        const tweetId = crypto.randomUUID();
        const t = tweetsData[i]!;

        await db.insert(tweets).values({
          id: tweetId,
          postId,
          content: t.content,
          position: i + 1,
        });

        const mediaItems = t.media || [];
        for (const m of mediaItems) {
          await db.insert(media).values({
            id: crypto.randomUUID(),
            postId,
            tweetId,
            fileUrl: m.url,
            fileType: m.fileType,
            fileSize: m.size,
          });
        }
      }

      if (status === "scheduled") {
        const delay = finalScheduledAt!.getTime() - Date.now();
        await scheduleQueue.add(
          "publish-post",
          { postId, userId: session.user.id, correlationId },
          {
            delay: Math.max(0, delay),
            jobId: postId,
            attempts: 5,
            backoff: { type: "exponential", delay: 60_000 },
            removeOnComplete: true,
            removeOnFail: false,
          }
        );
      }
    }

    const res = Response.json({ success: true, groupId, postIds: createdPostIds });
    res.headers.set("x-correlation-id", correlationId);
    return res;

  } catch (error) {
    console.error("Create Post Error:", error);
    return new Response(JSON.stringify({ error: "Failed to create post" }), { status: 500 });
  }
}
