import { headers } from "next/headers";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { getArabicInstructions } from "@/lib/ai/arabic-prompt";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { LANGUAGE_ENUM } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/rate-limiter";
import {
  trendCategoryEnum,
  trendItemSchema,
  type TrendCategory,
  type TrendItem,
} from "@/lib/schemas/common";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";

// NOTE: A web-search-capable model produces significantly better results here.
// Configure OPENROUTER_MODEL_TRENDS to a model with online access via OpenRouter
// (e.g. perplexity/sonar or perplexity/sonar-pro).
// Without it, the fallback chain uses training data which may not reflect current trends.
const TRENDS_CACHE_TTL_SECONDS = 1800; // 30 minutes

function buildTrendsPrompt(category: TrendCategory, language: string): string {
  const categoryLabel = category === "all" ? "all categories" : category;
  const langInstruction = getArabicInstructions(language);

  return `You are a social media trends analyst. Research what is currently trending on X (Twitter) right now in the "${categoryLabel}" category.
${langInstruction}

Return EXACTLY 5 trending topics as a JSON array. For each topic, include:
- "title": the trending topic or hashtag name (as it appears on X)
- "description": a one-sentence explanation of why it's trending (15-25 words max)
- "postCount": estimated engagement level ("High", "Medium", or "Trending")
- "category": "${category}"
- "suggestedAngle": a one-sentence content angle a creator could use for a post about this trend

Focus on topics that are genuinely trending RIGHT NOW on X/Twitter, not general evergreen topics. Prioritize topics with high engagement and conversation volume.

Return ONLY valid JSON. No markdown, no explanation, no preamble.
Format: [{ "title": "...", "description": "...", "postCount": "...", "category": "...", "suggestedAngle": "..." }]`;
}

export async function GET(req: Request) {
  try {
    const correlationId = getCorrelationId(req);

    // ── Auth only (no rate-limit yet) ────────────────────────────────────────
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return ApiError.unauthorized();

    // ── Parse & validate category query param ─────────────────────────────────
    const { searchParams } = new URL(req.url);
    const rawCategory = searchParams.get("category") ?? "all";
    const categoryParsed = trendCategoryEnum.safeParse(rawCategory);
    if (!categoryParsed.success) {
      return ApiError.badRequest(
        `Invalid category. Must be one of: ${trendCategoryEnum.options.join(", ")}`
      );
    }
    const category = categoryParsed.data;

    // ── Redis cache check (BEFORE rate-limit) ────────────────────────────────
    // Cached responses skip the rate-limit entirely — they cost nothing.
    const cacheKey = `trends:${category}`;
    let cachedAt: string | null = null;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as {
          trends: TrendItem[];
          cachedAt: string;
          expiresAt: string;
        };
        logger.info("trends_cache_hit", { category, userId: session.user.id });
        const res = Response.json(parsed);
        res.headers.set("x-correlation-id", correlationId);
        return res;
      }
    } catch (cacheErr) {
      logger.warn("trends_cache_read_failed", {
        error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
        category,
      });
    }

    // ── Rate-limit + AI access check (only on cache miss → real AI call) ─────
    // Trends available to all users (Free users have canUseAi: true, skip quota)
    const preamble = await aiPreamble({
      skipQuotaCheck: true,
    });
    if (preamble instanceof Response) return preamble;
    const { dbUser } = preamble;

    // ── Parse & validate language query param (with dbUser.language fallback) ─
    const rawLanguage = searchParams.get("language") ?? dbUser.language ?? "en";
    const languageParsed = LANGUAGE_ENUM.safeParse(rawLanguage);
    if (!languageParsed.success) {
      return ApiError.badRequest(
        `Invalid language. Must be one of: ${LANGUAGE_ENUM.options.join(", ")}`
      );
    }
    const userLanguage = languageParsed.data;

    // ── AI call ──────────────────────────────────────────────────────────────
    logger.info("trends_fetch_start", { category, userId: session.user.id });

    const modelId =
      process.env.OPENROUTER_MODEL_TRENDS ??
      process.env.OPENROUTER_MODEL_FREE ??
      process.env.OPENROUTER_MODEL_AGENTIC ??
      process.env.OPENROUTER_MODEL!;
    const model = openrouter(modelId);

    const t0 = performance.now();
    const result = await generateText({
      model,
      prompt: buildTrendsPrompt(category, userLanguage),
      maxOutputTokens: 800,
      abortSignal: AbortSignal.timeout(60_000),
    });

    // ── Parse & validate response ────────────────────────────────────────────
    let trends: TrendItem[] = [];
    try {
      const jsonMatch =
        result.text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? result.text.match(/(\[[\s\S]*\])/);
      const raw = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : result.text;
      const parsed = JSON.parse(raw.trim()) as unknown;
      const validated = trendItemSchema.array().safeParse(parsed);
      if (validated.success) {
        trends = validated.data;
      } else {
        logger.warn("trends_validation_failed", { category, issues: validated.error.issues });
      }
    } catch (parseErr) {
      logger.warn("trends_parse_failed", {
        error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        category,
        rawText: result.text.slice(0, 200),
      });
    }

    // ── Cache result ──────────────────────────────────────────────────────────
    cachedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + TRENDS_CACHE_TTL_SECONDS * 1000).toISOString();
    const responsePayload = { trends, category, cachedAt, expiresAt };

    if (trends.length > 0) {
      try {
        await redis.setex(cacheKey, TRENDS_CACHE_TTL_SECONDS, JSON.stringify(responsePayload));
      } catch (cacheWriteErr) {
        logger.warn("trends_cache_write_failed", {
          error: cacheWriteErr instanceof Error ? cacheWriteErr.message : String(cacheWriteErr),
          category,
        });
      }
    }

    const latencyMs = Math.round(performance.now() - t0);
    await recordAiUsage({
      userId: session.user.id,
      type: "tools",
      model: modelId,
      subFeature: "trends.analyze",
      tokensIn: result.usage?.inputTokens ?? 0,
      tokensOut: result.usage?.outputTokens ?? 0,
      costEstimateCents: estimateCost(
        modelId,
        result.usage?.inputTokens ?? 0,
        result.usage?.outputTokens ?? 0
      ),
      promptVersion: "trends:v1",
      latencyMs,
      fallbackUsed: false,
      inputPrompt: buildTrendsPrompt(category, userLanguage),
      outputContent: JSON.stringify(trends),
      language: userLanguage,
    });

    logger.info("trends_fetch_done", { category, count: trends.length, userId: session.user.id });
    const res = Response.json(responsePayload);
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (err) {
    logger.error("trends_route_error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return ApiError.internal();
  }
}
