import { generateObject } from "ai";
import { z } from "zod";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM, LANGUAGES } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { checkVariantGeneratorAccessDetailed } from "@/lib/middleware/require-plan";
import { recordAiUsage } from "@/lib/services/ai-quota";
import { RequestDedup } from "@/lib/services/request-dedup";

const requestSchema = z.object({
  tweet: z.string().min(1).max(1000),
  language: LANGUAGE_ENUM.default("en"),
});

const variantSchema = z.object({
  variants: z.array(
    z.object({
      text: z.string().max(1100),
      angle: z.enum(["emotional", "factual", "question", "story", "list"]),
      rationale: z.string().max(200),
    })
  ),
});

export async function POST(req: Request) {
  try {
    const correlationId = getCorrelationId(req);
    const preamble = await aiPreamble({ featureGate: checkVariantGeneratorAccessDetailed });
    if (preamble instanceof Response) return preamble;
    const { session, dbUser, model } = preamble;

    const json = await req.json();
    const result = requestSchema.safeParse(json);
    if (!result.success) {
      return ApiError.badRequest(result.error.issues);
    }

    const { tweet, language: clientLanguage } = result.data;

    // Get language: prefer client-sent language, fall back to user's DB preference
    const userLanguage = clientLanguage || dbUser.language || "en";

    // ── Deduplication check ──────────────────────────────────────────────
    const dedupKey = RequestDedup.generateKey(session.user.id, "ai_variants", result.data);
    const cachedResult = await RequestDedup.check<any>(dedupKey);

    if (cachedResult) {
      logger.info("dedup_cache_hit", {
        userId: session.user.id,
        endpoint: "/api/ai/variants",
        correlationId,
      });
      const res = Response.json(cachedResult);
      res.headers.set("x-correlation-id", correlationId);
      return res;
    }

    const langInstruction =
      userLanguage === "ar"
        ? "IMPORTANT: Output ENTIRE response in Arabic (العربية). Use Modern Standard Arabic only."
        : `Language: ${LANGUAGES.find((l) => l.code === userLanguage)?.label || "English"}.`;

    const prompt = `You are an expert social media copywriter.
Given the following tweet, generate exactly 3 alternative versions using different angles.
${langInstruction}

ORIGINAL TWEET:
${tweet}

Generate exactly 3 variants:
1. emotional — appeals to feelings, personal story, or empathy
2. factual — data-driven, numbers, specific claims
3. question — turns the message into an engaging question or hook

For each variant:
- text: the rewritten tweet (under 280 chars ideal, hard max 800 chars)
- angle: one of emotional / factual / question / story / list
- rationale: 1 sentence explaining why this angle works (under 200 chars)`;

    const { object, usage } = await generateObject({
      model,
      schema: variantSchema,
      prompt,
    });

    await recordAiUsage(
      session.user.id,
      "variant_generator",
      usage?.totalTokens ?? 0,
      prompt,
      object,
      userLanguage
    );

    const sanitized = {
      variants: object.variants.map((v) => ({
        ...v,
        text: v.text.length > 1000 ? v.text.slice(0, 997) + "..." : v.text,
      })),
    };

    // ── Cache result for dedup window ────────────────────────────────────
    await RequestDedup.cache(dedupKey, sanitized, 60);

    const res = Response.json(sanitized);
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("variant_generation_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to generate variants");
  }
}
