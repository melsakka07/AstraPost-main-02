import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";

const enhanceRequestSchema = z.object({
  topic: z.string().min(3).max(500),
});

const ENHANCE_PROMPT = `You are a social media topic refiner. Take the following topic idea and transform it into a concise, compelling topic description suitable as the starting point for a tweet or thread.

Rules:
- Keep it under 280 characters
- Preserve the core intent
- Make it specific and engaging
- Do NOT add hashtags

Return ONLY the enhanced topic text. No explanation, no quotes, no preamble.`;

export async function POST(req: Request) {
  try {
    const preamble = await aiPreamble({ skipQuotaCheck: true });
    if (preamble instanceof Response) return preamble;

    const body = (await req.json()) as unknown;
    const parsed = enhanceRequestSchema.safeParse(body);
    if (!parsed.success) {
      return ApiError.badRequest("Topic must be between 3 and 500 characters");
    }

    const modelId = process.env.OPENROUTER_MODEL_FREE ?? process.env.OPENROUTER_MODEL!;
    const model = openrouter(modelId);

    const result = await generateText({
      model,
      prompt: `${ENHANCE_PROMPT}\n\nTopic: ${parsed.data.topic}`,
      maxOutputTokens: 100,
      abortSignal: AbortSignal.timeout(15_000),
    });

    const enhanced = result.text.trim().replace(/^["']|["']$/g, "");

    if (!enhanced || enhanced.length < 3) {
      return ApiError.internal("Failed to enhance topic");
    }

    return Response.json({ enhanced });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return ApiError.internal("Enhancement timed out. Please try again.");
    }
    return ApiError.internal();
  }
}
