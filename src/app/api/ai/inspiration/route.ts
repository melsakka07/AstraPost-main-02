import { generateObject } from "ai";
import { z } from "zod";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/rate-limiter";
import { recordAiUsage } from "@/lib/services/ai-quota";

const CACHE_TTL = 6 * 60 * 60; // 6 hours

const inspirationSchema = z.object({
  topics: z.array(
    z.object({
      topic: z.string(),
      hook: z.string(),
    })
  ),
});

export async function GET(req: Request) {
  try {
    const correlationId = getCorrelationId(req);
    const preamble = await aiPreamble();
    if (preamble instanceof Response) return preamble;
    const { session, model } = preamble;

    const { searchParams } = new URL(req.url);
    const niche = searchParams.get("niche") || "Technology";
    const language = searchParams.get("language") || "en";

    const cacheKey = `inspiration:${language}:${niche.toLowerCase().replace(/\s+/g, "_")}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const res = Response.json(JSON.parse(cached));
        res.headers.set("x-correlation-id", correlationId);
        return res;
      }
    } catch (e) {
      logger.error("inspiration_redis_get_failed", {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    const prompt = `
      You are a social media trend analyst.
      Generate 5 trending or evergreen topic ideas for a "${niche}" niche content creator on X (Twitter).
      Language: ${language === "ar" ? "Arabic" : "English"}.

      For each topic, provide:
      1. The Topic (short title)
      2. A "Hook" (engaging first tweet/line) to start a thread.

      Constraints:
      - Topics should be distinct.
      - Hooks must be viral-worthy (curiosity gaps, strong statements).
    `;

    const { object } = await generateObject({
      model,
      schema: inspirationSchema,
      prompt,
    });

    try {
      await redis.set(cacheKey, JSON.stringify(object), "EX", CACHE_TTL);
    } catch (e) {
      logger.error("inspiration_redis_set_failed", {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    // Record AI usage (only for fresh generations, not cached responses)
    await recordAiUsage(
      session.user.id,
      "inspiration",
      0,
      `inspiration:${niche}:${language}`,
      object,
      language
    );

    const res = Response.json(object);
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("inspiration_generation_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to generate inspiration");
  }
}
