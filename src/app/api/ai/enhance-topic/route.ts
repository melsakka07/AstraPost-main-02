import "server-only";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";
import { getArabicInstructions } from "@/lib/ai/arabic-prompt";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";

const enhanceRequestSchema = z.object({
  topic: z.string().min(3).max(500),
});

function buildEnhancePrompt(
  language: string | null,
  topic: string
): { system: string; prompt: string } {
  const userLanguage = language || "en";
  const langInstruction = getArabicInstructions(userLanguage);

  const system = `You are a social media topic refiner. Transform topic ideas into concise, compelling topic descriptions suitable as the starting point for a tweet or thread.

${langInstruction}

Rules:
- Keep it under 280 characters
- Preserve the core intent
- Make it specific and engaging
- Do NOT add hashtags

Return ONLY the enhanced topic text. No explanation, no quotes, no preamble.`;

  return { system, prompt: topic };
}

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);
  try {
    const preamble = await aiPreamble({ skipQuotaCheck: true });
    if (preamble instanceof Response) return preamble;
    const { session, dbUser } = preamble;

    const body = (await req.json()) as unknown;
    const parsed = enhanceRequestSchema.safeParse(body);
    if (!parsed.success) {
      return ApiError.badRequest("Topic must be between 3 and 500 characters");
    }

    const freeModel = process.env.OPENROUTER_MODEL_FREE;
    const primaryModel = process.env.OPENROUTER_MODEL!;

    // Topic refinement is a tiny task. Try the cheap free model first — but with
    // reasoning DISABLED: reasoning models (e.g. deepseek-*) otherwise spend the
    // entire output budget on hidden reasoning and return empty text. If the free
    // model still yields nothing usable, fall back in code to the reliable primary
    // model (an empty 200 isn't an error, so OpenRouter's native fallback can't
    // cover this case).
    const attempts: Array<{ modelId: string; reasoningOff: boolean }> = [];
    if (freeModel && freeModel !== primaryModel) {
      attempts.push({ modelId: freeModel, reasoningOff: true });
    }
    attempts.push({ modelId: primaryModel, reasoningOff: false });

    const { system, prompt } = buildEnhancePrompt(dbUser.language, parsed.data.topic);
    const t0 = performance.now();

    let enhanced = "";
    let usedModel = primaryModel;
    let tokensIn = 0;
    let tokensOut = 0;

    for (const attempt of attempts) {
      const model = openrouter(attempt.modelId, {
        ...(attempt.reasoningOff && { extraBody: { reasoning: { enabled: false } } }),
      });
      const result = await generateText({
        model,
        system,
        prompt,
        maxOutputTokens: 400,
        abortSignal: AbortSignal.timeout(15_000),
      });

      usedModel = attempt.modelId;
      tokensIn = result.usage?.inputTokens ?? 0;
      tokensOut = result.usage?.outputTokens ?? 0;

      const text = result.text.trim().replace(/^["']|["']$/g, "");
      if (text.length >= 3) {
        enhanced = text;
        break;
      }

      logger.warn("enhance_topic_empty_output", {
        correlationId,
        model: attempt.modelId,
        finishReason: result.finishReason,
        textLength: result.text.length,
        usage: result.usage,
      });
    }

    const latencyMs = Math.round(performance.now() - t0);

    if (!enhanced) {
      return ApiError.internal("Failed to enhance topic. Please try again.");
    }

    // Phase 2: uses new options-object signature
    await recordAiUsage({
      userId: session.user.id,
      type: "tools",
      model: usedModel,
      subFeature: "tools.generate",
      tokensIn,
      tokensOut,
      costEstimateCents: estimateCost(usedModel, tokensIn, tokensOut),
      promptVersion: "tools:v1",
      latencyMs,
      fallbackUsed: usedModel !== (freeModel ?? primaryModel),
      inputPrompt: parsed.data.topic,
      outputContent: enhanced,
      language: dbUser.language || "en",
    });

    const res = Response.json({ enhanced });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (err) {
    const error = err as Error;

    logger.error("enhance_topic_failed", {
      correlationId,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    });

    if (error.name === "AbortError") {
      return ApiError.internal("Enhancement timed out. Please try again.");
    }
    return ApiError.internal("Failed to enhance topic. Please try again.");
  }
}
