import { streamText, UIMessage, convertToModelMessages } from "ai";
import { z } from "zod";
import { JAILBREAK_GUARD, wrapUntrusted } from "@/lib/ai/untrusted";
import { formatVoiceProfile, voiceProfileSchema } from "@/lib/ai/voice-profile";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { checkIdempotency, cacheIdempotentResponse } from "@/lib/api/idempotency";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";
import { moderateOutput } from "@/lib/services/moderation";

// Zod schema for message validation
const messagePartSchema = z.object({
  type: z.string(),
  text: z.string().max(10000, "Message text too long").optional(),
});

const messageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(messagePartSchema).optional(),
  content: z.union([z.string(), z.array(messagePartSchema)]).optional(),
});

const chatRequestSchema = z.object({
  messages: z.array(messageSchema).max(100, "Too many messages"),
});

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);

  // Read idempotency key now but check it after aiPreamble resolves the user.
  // Chat uses a custom 409 response for SSE streams (can't replay from cache).
  const idempotencyKey = req.headers.get("x-idempotency-key");

  const preamble = await aiPreamble({ quotaWeight: 1, correlationId });
  if (preamble instanceof Response) return preamble;
  const { session, dbUser, model, releaseQuota } = preamble;

  // Chat-specific idempotency: short-circuit BEFORE streaming starts.
  // Uses x-idempotency-key (not correlationId) with a custom 409 response
  // because SSE streams cannot be replayed from cache.
  if (idempotencyKey) {
    const idemCheck = await checkIdempotency(session.user.id, idempotencyKey);
    if (idemCheck.cached) {
      // Release quota that preamble consumed before returning 409
      await releaseQuota();
      return Response.json(
        {
          error: "A generation is already in progress for this key.",
          code: "GENERATION_IN_PROGRESS",
        },
        { status: 409 }
      );
    }
    // Mark generation as in-progress to prevent concurrent starts.
    await cacheIdempotentResponse(
      session.user.id,
      idempotencyKey,
      200,
      JSON.stringify({ status: "generation_started" }),
      {}
    );
  }

  logger.info("chat_request", { correlationId, userId: session.user.id });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    // Release quota since aiPreamble already consumed it but request is invalid
    await releaseQuota();
    return ApiError.badRequest("Invalid JSON");
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    // Release quota since aiPreamble already consumed it but request is invalid
    await releaseQuota();
    return ApiError.badRequest(parsed.error.issues);
  }

  const { messages }: { messages: UIMessage[] } = parsed.data as { messages: UIMessage[] };

  // Resolve voice profile: validate raw DB value, format deterministically, wrap as untrusted
  const parsedVoice = voiceProfileSchema.safeParse(dbUser.voiceProfile ?? undefined);
  const voiceBlock = parsedVoice.success
    ? wrapUntrusted("VOICE PROFILE", formatVoiceProfile(parsedVoice.data))
    : "";

  const systemMessage = `You are AstraPost AI, a social media assistant for X (Twitter) creators in MENA. Help with content strategy, tweet writing, and best practices. Default to Arabic unless the user writes English. Refuse: hate speech, election misinfo, harassment, illegal content.
${voiceBlock}
${JAILBREAK_GUARD}`;

  try {
    // Prepend system message
    const modelMessages = convertToModelMessages(messages);
    const allMessages = [{ role: "system" as const, content: systemMessage }, ...modelMessages];

    const modelName = process.env.OPENROUTER_MODEL!;
    const t0 = performance.now();

    const result = streamText({
      model,
      messages: allMessages,
      onFinish: async ({ text, usage }) => {
        const latencyMs = Math.round(performance.now() - t0);
        // Record AI usage after stream completes (fire-and-forget)
        recordAiUsage({
          userId: session.user.id,
          type: "chat",
          model: modelName,
          subFeature: "chat.message",
          tokensIn: usage?.inputTokens ?? 0,
          tokensOut: usage?.outputTokens ?? 0,
          costEstimateCents: estimateCost(
            modelName,
            usage?.inputTokens ?? 0,
            usage?.outputTokens ?? 0
          ),
          promptVersion: "chat:v1",
          latencyMs,
          fallbackUsed: false,
          inputPrompt: `chat:${messages.length}-messages`,
          outputContent: null,
          language: "en",
        }).catch((err) => {
          logger.error("[chat] recordAiUsage error:", { error: err });
        });

        // Phase 1 moderation: check the completed stream text (can't block, but can log)
        if (text) {
          moderateOutput(text, session.user.id)
            .then((result) => {
              if (result.flagged) {
                logger.warn("moderation_flagged_chat", {
                  userId: session.user.id,
                  categories: result.categories,
                  textLength: text.length,
                });
              }
            })
            .catch((err) => {
              logger.error("[chat] moderation check error:", { error: err });
            });
        }
      },
    });

    return (
      result as unknown as { toUIMessageStreamResponse: () => Response }
    ).toUIMessageStreamResponse();
  } catch (err) {
    await releaseQuota().catch((releaseErr) => {
      logger.error("[chat] releaseQuota error:", { error: releaseErr });
    });
    logger.error("[chat] streamText error:", { error: err });
    return ApiError.serviceUnavailable("AI service unavailable. Please try again later.");
  }
}
