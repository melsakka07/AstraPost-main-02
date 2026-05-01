import { eq, and, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { PipelineProgressEvent } from "@/lib/ai/agentic-types";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkAgenticPostingAccessDetailed } from "@/lib/middleware/require-plan";
import { agenticPosts, xAccounts } from "@/lib/schema";
import type { XSubscriptionTier } from "@/lib/schemas/common";
import { runAgenticPipeline } from "@/lib/services/agentic-pipeline";
import { XApiService } from "@/lib/services/x-api";

const TIER_STALENESS_MS = 24 * 60 * 60 * 1_000;

const requestSchema = z.object({
  topic: z.string().min(1).max(500),
  xAccountId: z.string().min(1),
  language: z.string().default("en"),
  preferences: z
    .object({
      tone: z.string().optional(),
      includeImages: z.boolean().optional(),
      audience: z.string().max(100).optional(),
    })
    .optional(),
});

export async function GET() {
  try {
    // 1. Auth + AI preamble — no feature gate: free users can view the page
    const preamble = await aiPreamble({ skipQuotaCheck: true });
    if (preamble instanceof Response) return preamble;
    const { session } = preamble;

    const latest = await db.query.agenticPosts.findFirst({
      where: (table, { eq, and, or }) =>
        and(
          eq(table.userId, session.user.id),
          or(
            eq(table.status, "generating"),
            eq(table.status, "ready"),
            eq(table.status, "needs_input")
          )
        ),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    if (!latest) return Response.json({ session: null });

    return Response.json({ session: latest });
  } catch (err) {
    logger.error("agentic_get_session_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return ApiError.internal();
  }
}

export async function DELETE() {
  try {
    const preamble = await aiPreamble({
      featureGate: checkAgenticPostingAccessDetailed,
      skipQuotaCheck: true,
    });
    if (preamble instanceof Response) return preamble;
    const { session } = preamble;

    await db
      .update(agenticPosts)
      .set({ status: "discarded" })
      .where(
        and(
          eq(agenticPosts.userId, session.user.id),
          or(
            eq(agenticPosts.status, "generating"),
            eq(agenticPosts.status, "ready"),
            eq(agenticPosts.status, "needs_input")
          )
        )
      );

    return new Response(null, { status: 204 });
  } catch (err) {
    logger.error("agentic_discard_session_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return ApiError.internal();
  }
}

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);

  try {
    // 1. Auth + AI preamble (rate limit, quota, model)
    const preamble = await aiPreamble({
      featureGate: checkAgenticPostingAccessDetailed,
    });
    if (preamble instanceof Response) return preamble;
    const { session, dbUser, checkModeration } = preamble;

    // 2. Validate request body
    const json = (await req.json()) as unknown;
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { topic, xAccountId, language: clientLanguage, preferences } = parsed.data;

    // Get language: prefer client-sent language, fall back to user's DB preference
    const userLanguage = clientLanguage || dbUser.language || "en";

    // 3. Verify xAccount ownership
    const account = await db.query.xAccounts.findFirst({
      where: and(eq(xAccounts.id, xAccountId), eq(xAccounts.userId, session.user.id)),
      columns: {
        id: true,
        xSubscriptionTier: true,
        xSubscriptionTierUpdatedAt: true,
      },
    });
    if (!account) return ApiError.notFound("X account");

    // 4. Refresh tier if stale
    let tier = (account.xSubscriptionTier ?? "None") as XSubscriptionTier;
    const updatedAt = account.xSubscriptionTierUpdatedAt;
    if (!updatedAt || Date.now() - updatedAt.getTime() > TIER_STALENESS_MS) {
      try {
        const freshTier = await XApiService.fetchXSubscriptionTier(xAccountId);
        tier = freshTier as XSubscriptionTier;
      } catch (err) {
        logger.warn("agentic_tier_refresh_failed", {
          accountId: xAccountId,
          error: err instanceof Error ? err.message : String(err),
          correlationId,
        });
      }
    }

    // 5. Create agentic_posts row with status "generating"
    const agenticPostId = nanoid();
    await db.insert(agenticPosts).values({
      id: agenticPostId,
      userId: session.user.id,
      xAccountId,
      topic,
      status: "generating",
      correlationId,
    });

    // 6. Stream SSE response
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: PipelineProgressEvent) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch {
            // Controller may be closed
          }
        };

        try {
          const agenticPost = await runAgenticPipeline({
            topic,
            xAccountId,
            xSubscriptionTier: tier,
            voiceProfile: dbUser.voiceProfile,
            language: userLanguage,
            userId: session.user.id,
            correlationId,
            agenticPostId,
            ...(preferences !== undefined && { preferences }),
            onProgress: sendEvent,
          });

          // 7. Update row to "ready"
          await db
            .update(agenticPosts)
            .set({
              status: "ready",
              researchBrief: agenticPost.research,
              contentPlan: agenticPost.plan,
              tweets: agenticPost.tweets,
              qualityScore: agenticPost.qualityScore,
              summary: agenticPost.summary,
            })
            .where(eq(agenticPosts.id, agenticPostId));

          // Phase 1 moderation: check the final assembled tweets
          const fullText =
            agenticPost.tweets?.map((t: { text?: string }) => t.text ?? "").join("\n") ?? "";
          const modResult = await checkModeration(fullText, agenticPostId);
          if (modResult) {
            logger.warn("moderation_flagged_stream", {
              userId: session.user.id,
              correlationId,
              mode: "agentic",
              agenticPostId,
              textLength: fullText.length,
            });
            sendEvent({
              step: "done",
              status: "complete",
              data: {
                moderationFlagged: true,
                message: "Content moderated — please rephrase your request",
                agenticPostId,
              },
            });
            controller.close();
            return;
          }

          sendEvent({ step: "done", status: "complete", data: agenticPost });
        } catch (err) {
          // Handle too-broad topic gracefully
          if (err instanceof Error && err.message === "TOPIC_TOO_BROAD") {
            await db
              .update(agenticPosts)
              .set({ status: "needs_input" })
              .where(eq(agenticPosts.id, agenticPostId))
              .catch(() => void 0);
            // The needs_input SSE event was already sent by the pipeline
            controller.close();
            return;
          }

          logger.error("agentic_pipeline_error", {
            error: err instanceof Error ? err.message : String(err),
            correlationId,
            agenticPostId,
          });

          await db
            .update(agenticPosts)
            .set({ status: "failed" })
            .where(eq(agenticPosts.id, agenticPostId))
            .catch(() => void 0);

          sendEvent({
            step: "done",
            status: "failed",
            data: { error: err instanceof Error ? err.message : "Pipeline failed" },
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Correlation-Id": correlationId,
      },
    });
  } catch (err) {
    logger.error("agentic_route_error", {
      error: err instanceof Error ? err.message : String(err),
      correlationId,
    });
    return ApiError.internal();
  }
}
