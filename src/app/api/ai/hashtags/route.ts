import { generateObject } from "ai";
import { z } from "zod";
import { getArabicInstructions } from "@/lib/ai/arabic-prompt";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";

const hashtagRequestSchema = z.object({
  content: z.string().min(1),
  language: LANGUAGE_ENUM,
});

const hashtagResponseSchema = z.object({
  hashtags: z.array(z.string()),
});

export async function POST(req: Request) {
  try {
    const correlationId = getCorrelationId(req);
    const preamble = await aiPreamble();
    if (preamble instanceof Response) return preamble;
    const { session, dbUser, model, checkModeration } = preamble;

    const json = await req.json();
    const result = hashtagRequestSchema.safeParse(json);

    if (!result.success) {
      return ApiError.badRequest(result.error.issues);
    }

    const { content, language: clientLanguage } = result.data;

    // Get language: prefer client-sent language, fall back to user's DB preference
    const userLanguage = clientLanguage || dbUser.language || "en";
    const langInstruction = getArabicInstructions(userLanguage);

    const prompt = `
      You are a social media growth expert for X (Twitter).
      Suggest 5-10 highly relevant and trending hashtags for the following tweet content.
      ${langInstruction}

      Content:
      "${content}"

      Constraints:
      - Mix broad hashtags and niche ones.
      - Return only the hashtags in an array.
      - Do not include the # symbol in the string values if the schema doesn't require it, but here we want the full tag e.g. "#growth".
    `;

    const modelId = process.env.OPENROUTER_MODEL!;

    const t0 = performance.now();
    const { object, usage } = await generateObject({
      model,
      schema: hashtagResponseSchema,
      prompt,
    });
    const latencyMs = Math.round(performance.now() - t0);

    // Moderation check on generated hashtags
    const modResult = await checkModeration(object.hashtags.join(" "));
    if (modResult) return modResult;

    // Phase 2: uses new options-object signature
    await recordAiUsage({
      userId: session.user.id,
      type: "hashtags",
      model: modelId,
      subFeature: "hashtags.generate",
      tokensIn: usage?.inputTokens ?? 0,
      tokensOut: usage?.outputTokens ?? 0,
      costEstimateCents: estimateCost(modelId, usage?.inputTokens ?? 0, usage?.outputTokens ?? 0),
      promptVersion: "hashtags:v1",
      latencyMs,
      fallbackUsed: false,
      inputPrompt: prompt,
      outputContent: object,
      language: userLanguage,
    });

    const res = Response.json(object);
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("hashtag_generation_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to generate hashtags");
  }
}
