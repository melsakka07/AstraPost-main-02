import { generateObject } from "ai";
import { z } from "zod";
import { buildLanguageBlock } from "@/lib/ai/language";
import { wrapUntrusted } from "@/lib/ai/untrusted";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";

const requestSchema = z.object({
  tweets: z.array(z.string().max(5000)).min(1).max(15),
  targetLanguage: LANGUAGE_ENUM,
  mode: z.enum(["literal", "localized"]).default("localized"),
});

const responseSchema = z.object({
  tweets: z.array(z.string().max(1000)),
});

export async function POST(req: Request) {
  try {
    const correlationId = getCorrelationId(req);
    const preamble = await aiPreamble();
    if (preamble instanceof Response) return preamble;
    const { session, model, checkModeration } = preamble;

    const json = await req.json();
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    const { tweets, targetLanguage, mode } = parsed.data;

    const emptyTweets = tweets.filter((t) => !t.trim());
    if (emptyTweets.length > 0) {
      return ApiError.badRequest("Cannot translate empty tweets. Please add content first.");
    }

    const langBlock = buildLanguageBlock(targetLanguage, "translation");

    const modeInstruction =
      mode === "literal"
        ? "TRANSLATION MODE: Literal. Translate word-for-word. Preserve original phrasing, idioms, and structure exactly. Do NOT adapt or localize any expressions."
        : "TRANSLATION MODE: Localized. Adapt expressions, idioms, and cultural references to make sense in the target language. Preserve meaning, tone, and style as closely as possible.";

    const prompt = `${langBlock}

${modeInstruction}

Constraints:
- Keep each translated tweet under 280 characters. If a translation would exceed 280 characters, split it into multiple shorter tweets to stay within the limit.
- Output at least as many tweets as the input (more is OK when splitting long translations).
- Keep numbering prefixes like "1/5" if the original tweet already has them, but do NOT add any new numbering or bracket labels.

Thread:
${tweets.map((t, i) => `--- Tweet ${i + 1} ---\n${wrapUntrusted(`TWEET_${i + 1}`, t, 5_000)}`).join("\n\n")}`;

    const modelId = process.env.OPENROUTER_MODEL!;

    const t0 = performance.now();
    const { object, usage } = await generateObject({
      model,
      schema: responseSchema,
      prompt,
    });
    const latencyMs = Math.round(performance.now() - t0);

    // Moderation check on translated output
    const modResult = await checkModeration(object.tweets.join("\n"));
    if (modResult) return modResult;

    // Phase 2: uses new options-object signature
    await recordAiUsage({
      userId: session.user.id,
      type: "translate",
      model: modelId,
      subFeature: "translate.text",
      tokensIn: usage?.inputTokens ?? 0,
      tokensOut: usage?.outputTokens ?? 0,
      costEstimateCents: estimateCost(modelId, usage?.inputTokens ?? 0, usage?.outputTokens ?? 0),
      promptVersion: "translate:v2",
      latencyMs,
      fallbackUsed: false,
      inputPrompt: prompt,
      outputContent: object,
      language: targetLanguage,
    });

    const res = Response.json(object);
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("translation_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : "Translation failed";
    return ApiError.serviceUnavailable(message);
  }
}
