import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  checkInboxReplyAccessDetailed,
  createPlanLimitResponse,
} from "@/lib/middleware/require-plan";
import { inboxItems } from "@/lib/schema";
import { markAsReplied } from "@/lib/services/inbox";
import { XApiService } from "@/lib/services/x-api";
import { recordXUsage, xPostCostMicro } from "@/lib/services/x-budget-atomic";
import { getTeamContext } from "@/lib/team-context";

// ── POST /api/inbox/[id]/reply — Post a manual reply to an engagement

type RouteContext = {
  params: Promise<{ id: string }>;
};

const replySchema = z.object({
  text: z.string().min(1).max(280),
});

export async function POST(req: Request, context: RouteContext) {
  try {
    // 1. Auth
    const ctx = await getTeamContext();
    if (!ctx) {
      return ApiError.unauthorized();
    }

    // 2. Role check — viewers cannot reply
    if (ctx.role === "viewer") {
      return ApiError.forbidden("Viewers cannot post replies");
    }

    // 3. Correlation ID
    const correlationId = getCorrelationId(req);
    logger.info("api_request", {
      route: "/api/inbox/[id]/reply",
      method: "POST",
      correlationId,
      userId: ctx.currentTeamId,
      actorId: ctx.isOwner ? undefined : ctx.session.user.id,
    });

    // 4. Parse + validate body
    const json = await req.json();
    const parsed = replySchema.safeParse(json);
    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    // 5. Plan gate — inbox reply is Pro-gated
    const gate = await checkInboxReplyAccessDetailed(ctx.currentTeamId);
    if (!gate.allowed) {
      return createPlanLimitResponse(gate);
    }

    // 6. Parse params
    const { id } = await context.params;

    // 7. Load inbox item and verify ownership
    const item = await db.query.inboxItems.findFirst({
      where: and(eq(inboxItems.id, id), eq(inboxItems.userId, ctx.currentTeamId)),
      columns: {
        id: true,
        xAccountId: true,
        yourTweetId: true,
        sourceTweetId: true,
      },
    });

    if (!item) {
      return ApiError.notFound("Inbox item not found");
    }

    // Determine the tweet to reply to: prefer yourTweetId (your tweet that was engaged with),
    // fall back to sourceTweetId (the engagement tweet itself — for mentions)
    const replyToTweetId = item.yourTweetId ?? item.sourceTweetId;

    // 8. Get X API client and post reply
    const client = await XApiService.getClientForAccountId(item.xAccountId);
    if (!client) {
      logger.error("inbox_reply_no_client", { xAccountId: item.xAccountId, inboxItemId: id });
      return ApiError.internal("Could not connect to X API. Please reconnect your X account.");
    }

    const replyResult = await client.postTweetReply(parsed.data.text, replyToTweetId);

    const replyCostMicro = xPostCostMicro(parsed.data.text);
    await recordXUsage(ctx.currentTeamId, replyCostMicro === 2000 ? "post_url" : "post", {
      endpoint: "/2/tweets",
      correlationId,
    });

    const repliedAt = new Date().toISOString();

    // 9. Mark item as replied (not AI-assisted)
    await markAsReplied(item.id, ctx.currentTeamId, false);

    // 10. Return
    const res = Response.json({
      success: true,
      replyTweetId: replyResult?.data?.id ?? null,
      repliedAt,
    });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("inbox_reply_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to post reply");
  }
}
