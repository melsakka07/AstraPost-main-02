/**
 * AI Inspire API Endpoint
 * POST /api/ai/inspire
 *
 * AI-powered content adaptation from imported tweets
 */

import { generateText } from "ai";
import { z } from "zod";
import { buildInspirePrompts, parseInspireResponse } from "@/lib/ai/inspire-prompts";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { checkInspirationAccessDetailed } from "@/lib/middleware/require-plan";
import { recordAiUsage } from "@/lib/services/ai-quota";

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
    const { session, dbUser, model } = preamble;
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

    const { systemPrompt, userPrompt } = buildInspirePrompts(action, originalTweet, {
      ...(tone !== undefined && { tone }),
      language: userLanguage,
      ...(userContext !== undefined && { userContext }),
      ...(threadContext !== undefined && { threadContext }),
    });

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
    });

    const tweets = parseInspireResponse(action, text);

    await recordAiUsage(
      userId,
      "inspire",
      0,
      `${systemPrompt}\n\n${userPrompt}`,
      { action, tone, language: userLanguage, tweets },
      userLanguage
    );

    const res = Response.json({ tweets, action });
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
