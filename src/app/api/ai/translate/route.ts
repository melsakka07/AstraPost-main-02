import { generateObject } from "ai";
import { z } from "zod";
import { getArabicInstructions } from "@/lib/ai/arabic-prompt";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { recordAiUsage } from "@/lib/services/ai-quota";

const requestSchema = z.object({
  tweets: z.array(z.string()).min(1).max(15),
  targetLanguage: LANGUAGE_ENUM,
});

const responseSchema = z.object({
  tweets: z.array(z.string().max(1000)),
});

export async function POST(req: Request) {
  try {
    const correlationId = getCorrelationId(req);
    const preamble = await aiPreamble();
    if (preamble instanceof Response) return preamble;
    const { session, model } = preamble;

    const json = await req.json();
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    const { tweets, targetLanguage } = parsed.data;

    const emptyTweets = tweets.filter((t) => !t.trim());
    if (emptyTweets.length > 0) {
      return ApiError.badRequest("Cannot translate empty tweets. Please add content first.");
    }

    const langInstruction = getArabicInstructions(targetLanguage);

    const prompt = `${langInstruction}

Constraints:
- Keep each translated tweet under 280 characters. If a translation would exceed 280 characters, split it into multiple shorter tweets to stay within the limit.
- Preserve meaning, tone, and style as closely as possible.
- Output at least as many tweets as the input (more is OK when splitting long translations).
- Keep numbering prefixes like "1/5" if the original tweet already has them, but do NOT add any new numbering or bracket labels.

Thread:
${tweets.map((t, i) => `--- Tweet ${i + 1} ---\n${t}`).join("\n\n")}`;

    const { object } = await generateObject({
      model,
      schema: responseSchema,
      prompt,
    });

    await recordAiUsage(session.user.id, "translate", 0, prompt, object, targetLanguage);

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
