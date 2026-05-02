import { headers } from "next/headers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, UIMessage, convertToModelMessages, type LanguageModel } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { JAILBREAK_GUARD, wrapUntrusted } from "@/lib/ai/untrusted";
import { formatVoiceProfile, voiceProfileSchema } from "@/lib/ai/voice-profile";
import { ApiError } from "@/lib/api/errors";
import { checkIdempotency, cacheIdempotentResponse } from "@/lib/api/idempotency";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  checkAiLimitDetailed,
  checkAiQuotaDetailed,
  createPlanLimitResponse,
} from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return ApiError.unauthorized();
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { plan: true, language: true, voiceProfile: true },
  });

  // Idempotency check — prevents duplicate stream starts for the same client key.
  // Chat responses are SSE streams that cannot be cached for replay, so we cache
  // a "generation started" marker. Duplicate requests receive 409 Conflict.
  const idempotencyKey = req.headers.get("x-idempotency-key");
  if (idempotencyKey) {
    const idemCheck = await checkIdempotency(session.user.id, idempotencyKey);
    if (idemCheck.cached) {
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

  const rlResult = await checkRateLimit(session.user.id, dbUser?.plan || "free", "ai");
  if (!rlResult.success) return createRateLimitResponse(rlResult);

  const aiAccess = await checkAiLimitDetailed(session.user.id);
  if (!aiAccess.allowed) {
    return createPlanLimitResponse(aiAccess);
  }

  const aiQuota = await checkAiQuotaDetailed(session.user.id);
  if (!aiQuota.allowed) {
    return createPlanLimitResponse(aiQuota);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiError.badRequest("Invalid JSON");
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return ApiError.badRequest(parsed.error.issues);
  }

  const { messages }: { messages: UIMessage[] } = parsed.data as { messages: UIMessage[] };

  // Resolve voice profile: validate raw DB value, format deterministically, wrap as untrusted
  const parsedVoice = voiceProfileSchema.safeParse(dbUser?.voiceProfile ?? undefined);
  const voiceBlock = parsedVoice.success
    ? wrapUntrusted("VOICE PROFILE", formatVoiceProfile(parsedVoice.data))
    : "";

  const systemMessage = `You are AstraPost AI, a social media assistant for X (Twitter) creators in MENA. Help with content strategy, tweet writing, and best practices. Default to Arabic unless the user writes English. Refuse: hate speech, election misinfo, harassment, illegal content.
${voiceBlock}
${JAILBREAK_GUARD}`;

  // Initialize OpenRouter with API key from environment
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return ApiError.internal("OpenRouter API key not configured");
  }

  const openrouter = createOpenRouter({ apiKey });

  try {
    // Prepend system message
    const modelMessages = convertToModelMessages(messages);
    const allMessages = [{ role: "system" as const, content: systemMessage }, ...modelMessages];

    const modelId = process.env.OPENROUTER_MODEL!;
    const t0 = performance.now();

    const result = streamText({
      model: openrouter(modelId, {
        provider: { data_collection: "deny" as const },
      }) as unknown as LanguageModel,
      messages: allMessages,
      onFinish: async ({ text, usage }) => {
        const latencyMs = Math.round(performance.now() - t0);
        // Record AI usage after stream completes (fire-and-forget)
        // Phase 2: uses new options-object signature
        recordAiUsage({
          userId: session.user.id,
          type: "chat",
          model: modelId,
          subFeature: "chat.message",
          tokensIn: usage?.inputTokens ?? 0,
          tokensOut: usage?.outputTokens ?? 0,
          costEstimateCents: estimateCost(
            modelId,
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
    logger.error("[chat] streamText error:", { error: err });
    return ApiError.serviceUnavailable("AI service unavailable. Please try again later.");
  }
}
