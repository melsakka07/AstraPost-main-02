import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkPostLimit } from "@/lib/middleware/require-plan";
import { scheduleQueue } from "@/lib/queue/client";
import { checkRateLimit } from "@/lib/rate-limiter";
import { tweets, media, xAccounts, account, user, posts } from "@/lib/schema";
import { decryptToken, encryptToken } from "@/lib/security/token-encryption";

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
  action: z.enum(["draft", "schedule", "publish_now"]).default("draft"),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const dbUser = await db.query.user.findFirst({
        where: eq(user.id, session.user.id),
        columns: { plan: true }
    });
    
    const { success, reset } = await checkRateLimit(session.user.id, dbUser?.plan || "free", "posts");
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
      userId: session.user.id,
    });

    const json = await req.json();
    const result = createPostSchema.safeParse(json);

    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: result.error }), { status: 400 });
    }

    const { tweets: tweetsData, scheduledAt, action, targetXAccountIds } = result.data;

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
            })
            .where(eq(xAccounts.id, existing.id));
        }
      }
    }

    const availableAccounts = await db.query.xAccounts.findMany({
      where: and(eq(xAccounts.userId, session.user.id), eq(xAccounts.isActive, true)),
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

    const canPost = await checkPostLimit(session.user.id, selectedAccounts.length);
    if (!canPost) {
        return new Response(JSON.stringify({ error: "upgrade_required" }), { status: 402 });
    }

    // Determine Status
    let status = "draft";
    let finalScheduledAt: Date | null = null;

    if (action === "schedule") {
        if (!scheduledAt) {
            return new Response(JSON.stringify({ error: "Scheduled date is required for scheduling" }), { status: 400 });
        }
        status = "scheduled";
        finalScheduledAt = new Date(scheduledAt);
    } else if (action === "publish_now") {
        status = "scheduled"; // Use scheduled status for worker to pick it up immediately
        finalScheduledAt = new Date(); // Schedule for now
    } else {
        status = "draft";
    }

    const groupId = selectedAccounts.length > 1 ? crypto.randomUUID() : null;
    const createdPostIds: string[] = [];

    for (const acc of selectedAccounts) {
      const postId = crypto.randomUUID();
      createdPostIds.push(postId);

      await db.insert(posts).values({
        id: postId,
        userId: session.user.id,
        xAccountId: acc.id,
        groupId,
        type: tweetsData.length > 1 ? "thread" : "tweet",
        status: status,
        scheduledAt: finalScheduledAt,
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
