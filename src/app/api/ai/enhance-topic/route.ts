import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGES } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { recordAiUsage } from "@/lib/services/ai-quota";

const enhanceRequestSchema = z.object({
  topic: z.string().min(3).max(500),
});

function buildEnhancePrompt(language: string | null): string {
  const userLanguage = language || "en";
  const langLabel = LANGUAGES.find((l) => l.code === userLanguage)?.label || "English";
  const langInstruction =
    userLanguage === "ar"
      ? "IMPORTANT: Output ENTIRE response in Arabic (العربية). Use Modern Standard Arabic only."
      : `Output language: ${langLabel}.`;

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

    const modelId = process.env.OPENROUTER_MODEL_FREE ?? process.env.OPENROUTER_MODEL!;
    const model = openrouter(modelId);

    const result = await generateText({
      model,
      prompt: `${buildEnhancePrompt(dbUser.language)}\n\nTopic: ${parsed.data.topic}`,
      maxOutputTokens: 100,
      abortSignal: AbortSignal.timeout(15_000),
    });

    const enhanced = result.text.trim().replace(/^["']|["']$/g, "");

    if (!enhanced || enhanced.length < 3) {
      return ApiError.internal("Failed to enhance topic");
    }

    await recordAiUsage(
      session.user.id,
      "tools",
      result.usage?.totalTokens ?? 0,
      parsed.data.topic,
      enhanced,
      dbUser.language || "en"
    );

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
