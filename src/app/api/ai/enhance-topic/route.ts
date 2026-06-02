import "server-only";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";
import { getArabicInstructions } from "@/lib/ai/arabic-prompt";
import { openrouterFallbackBody } from "@/lib/ai/openrouter-fallback";
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
    const modelName = freeModel ?? primaryModel;
    // Native fallback: try the cheap free model first, fall back to the primary
    // model on 429/transient errors. Prevents a flaky free tier from 500ing.
    const fallbackBody = openrouterFallbackBody(freeModel, primaryModel);
    const model = openrouter(modelName, {
      ...(fallbackBody && { extraBody: fallbackBody }),
    });

    const t0 = performance.now();
    const { system, prompt } = buildEnhancePrompt(dbUser.language, parsed.data.topic);
    const result = await generateText({
      model,
      system,
      prompt,
      maxOutputTokens: 100,
      abortSignal: AbortSignal.timeout(15_000),
    });
    const latencyMs = Math.round(performance.now() - t0);

    const enhanced = result.text.trim().replace(/^["']|["']$/g, "");

    if (!enhanced || enhanced.length < 3) {
      return ApiError.internal("Failed to enhance topic");
    }

    // Phase 2: uses new options-object signature
    await recordAiUsage({
      userId: session.user.id,
      type: "tools",
      model: modelName,
      subFeature: "tools.generate",
      tokensIn: result.usage?.inputTokens ?? 0,
      tokensOut: result.usage?.outputTokens ?? 0,
      costEstimateCents: estimateCost(
        modelName,
        result.usage?.inputTokens ?? 0,
        result.usage?.outputTokens ?? 0
      ),
      promptVersion: "tools:v1",
      latencyMs,
      fallbackUsed: false,
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
