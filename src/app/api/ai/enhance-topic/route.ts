import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";
import { getArabicInstructions } from "@/lib/ai/arabic-prompt";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";

const enhanceRequestSchema = z.object({
  topic: z.string().min(3).max(500),
});

function buildEnhancePrompt(language: string | null): string {
  const userLanguage = language || "en";
  const langInstruction = getArabicInstructions(userLanguage);

  return `You are a social media topic refiner. Take the following topic idea and transform it into a concise, compelling topic description suitable as the starting point for a tweet or thread.

${langInstruction}

Rules:
- Keep it under 280 characters
- Preserve the core intent
- Make it specific and engaging
- Do NOT add hashtags

Return ONLY the enhanced topic text. No explanation, no quotes, no preamble.`;
}

export async function POST(req: Request) {
  try {
    const correlationId = getCorrelationId(req);
    const preamble = await aiPreamble({ skipQuotaCheck: true });
    if (preamble instanceof Response) return preamble;
    const { session, dbUser } = preamble;

    const body = (await req.json()) as unknown;
    const parsed = enhanceRequestSchema.safeParse(body);
    if (!parsed.success) {
      return ApiError.badRequest("Topic must be between 3 and 500 characters");
    }

    const modelName = process.env.OPENROUTER_MODEL_FREE ?? process.env.OPENROUTER_MODEL!;
    const model = openrouter(modelName);

    const t0 = performance.now();
    const result = await generateText({
      model,
      prompt: `${buildEnhancePrompt(dbUser.language)}\n\nTopic: ${parsed.data.topic}`,
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
    if ((err as Error).name === "AbortError") {
      return ApiError.internal("Enhancement timed out. Please try again.");
    }
    return ApiError.internal();
  }
}
