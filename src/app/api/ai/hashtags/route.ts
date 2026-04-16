import { generateObject } from "ai";
import { z } from "zod";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM, LANGUAGES } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { recordAiUsage } from "@/lib/services/ai-quota";

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
    const { session, model } = preamble;

    const json = await req.json();
    const result = hashtagRequestSchema.safeParse(json);

    if (!result.success) {
      return ApiError.badRequest(result.error.issues);
    }

    const { content, language } = result.data;

    const prompt = `
      You are a social media growth expert for X (Twitter).
      Suggest 5-10 highly relevant and trending hashtags for the following tweet content.
      Language: ${LANGUAGES.find((l) => l.code === language)?.label || "English"}.

      Content:
      "${content}"

      Constraints:
      - If language is Arabic, prioritize hashtags popular in MENA.
      - If other language, prioritize hashtags popular in that region.
      - Mix broad hashtags and niche ones.
      - Return only the hashtags in an array.
      - Do not include the # symbol in the string values if the schema doesn't require it, but here we want the full tag e.g. "#growth".
    `;

    const { object } = await generateObject({
      model,
      schema: hashtagResponseSchema,
      prompt,
    });

    await recordAiUsage(
      session.user.id,
      "tools", // using "tools" type for now
      0,
      prompt,
      JSON.stringify(object),
      language
    );

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
