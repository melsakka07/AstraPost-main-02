/**
 * AI Inspire API Endpoint
 * POST /api/ai/inspire
 *
 * AI-powered content adaptation from imported tweets
 */

import { generateText, generateObject } from "ai";
import { z } from "zod";
import { buildInspirePrompts, VERSION } from "@/lib/ai/inspire-prompts";
import { fitTweet } from "@/lib/ai/text-fit";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { checkInspirationAccessDetailed } from "@/lib/middleware/require-plan";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";

// ============================================================================
// Schema Validation
// ============================================================================

const InspireRequestSchema = z.object({
  originalTweet: z.string().min(1).max(5000),
  threadContext: z.array(z.string().max(5000)).max(10).optional(),
  action: z.enum([
    "rephrase",
    "change_tone",
    "expand_thread",
    "add_take",
    "translate",
    "counter_point",
  ]),
  tone: z
    .enum(["professional", "casual", "humorous", "educational", "inspirational", "viral"])
    .optional(),
  language: LANGUAGE_ENUM.default("ar"),
  userContext: z.string().max(1000).optional(),
});

const ThreadSchema = z.object({
  tweets: z
    .array(z.object({ text: z.string().max(280) }))
    .min(1)
    .max(25),
});

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);

  try {
    const preamble = await aiPreamble({
      featureGate: async (userId) => checkInspirationAccessDetailed(userId),
    });
    if (preamble instanceof Response) return preamble;
    const { session, dbUser, model, checkModeration } = preamble;
    const userId = session.user.id;

    const body = await req.json();
    const validationResult = InspireRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return ApiError.badRequest(validationResult.error.issues);
    }

    const {
      originalTweet,
      threadContext,
      action,
      tone,
      language: clientLanguage,
      userContext,
    } = validationResult.data;

    // Get language: prefer client-sent language, fall back to user's DB preference
    const userLanguage = clientLanguage || dbUser.language || "en";

    const { system, messages, redactions } = buildInspirePrompts(action, originalTweet, {
      ...(tone !== undefined && { tone }),
      language: userLanguage,
      ...(userContext !== undefined && { userContext }),
      ...(threadContext !== undefined && { threadContext }),
    });

    const modelId = process.env.OPENROUTER_MODEL!;
    const t0 = performance.now();

    let tweets: string[];
    let usage: Awaited<ReturnType<typeof generateText>>["usage"];

    if (action === "expand_thread") {
      const result = await generateObject({
        model,
        system,
        messages,
        schema: ThreadSchema,
      });
      tweets = result.object.tweets.map((t) => fitTweet(t.text));
      usage = result.usage;
    } else {
      const result = await generateText({
        model,
        system,
        prompt: messages[0]?.content ?? "",
      });
      tweets = [result.text.trim()];
      usage = result.usage;
    }

    const latencyMs = Math.round(performance.now() - t0);

    // Moderation check on generated content
    const modResult = await checkModeration(tweets.join("\n"));
    if (modResult) return modResult;

    // Phase 2: uses new options-object signature
    await recordAiUsage({
      userId,
      type: "inspire",
      model: modelId,
      subFeature: "inspire.expand",
      tokensIn: usage?.inputTokens ?? 0,
      tokensOut: usage?.outputTokens ?? 0,
      costEstimateCents: estimateCost(modelId, usage?.inputTokens ?? 0, usage?.outputTokens ?? 0),
      promptVersion: VERSION,
      latencyMs,
      fallbackUsed: false,
      inputPrompt: `${system}\n\n${messages.map((m) => m.content).join("\n\n")}`,
      outputContent: { action, tone, language: userLanguage, tweets },
      language: userLanguage,
    });

    const res = Response.json({ tweets, action, ...(redactions && { redactions }) });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("inspire_generation_failed", {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to generate inspired content");
  }
}
