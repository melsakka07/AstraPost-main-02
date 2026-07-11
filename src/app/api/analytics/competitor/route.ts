import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import { openrouterFallbackBody } from "@/lib/ai/openrouter-fallback";
import { withRetry } from "@/lib/ai/with-retry";
import { withTimeout } from "@/lib/ai/with-timeout";
import { ApiError } from "@/lib/api/errors";
import { checkIdempotency, cacheIdempotentResponse } from "@/lib/api/idempotency";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import {
  checkAiLimitDetailed,
  checkCompetitorAnalyzerAccessDetailed,
  createPlanLimitResponse,
  getUserPlanType,
} from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";
import { tryConsumeAiQuota, releaseAiQuota } from "@/lib/services/ai-quota-atomic";
import { buildCompetitorAnalysisPrompt, fetchUserTweets } from "@/lib/services/competitor-analysis";
import { recordXUsage } from "@/lib/services/x-budget-atomic";
import { getTeamContext } from "@/lib/team-context";

const requestSchema = z.object({
  username: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[A-Za-z0-9_]+$/, "Invalid X username"),
  language: z.enum(["ar", "en", "fr", "de", "es", "it", "pt", "tr", "ru", "hi"]).default("en"),
});

const analysisSchema = z.object({
  topTopics: z.array(z.string()),
  postingFrequency: z.string(),
  preferredContentTypes: z.array(z.string()),
  toneProfile: z.string(),
  topHashtags: z.array(z.string()),
  bestPostingTimes: z.string(),
  keyStrengths: z.array(z.string()),
  differentiationOpportunities: z.array(z.string()),
  summary: z.string(),
});

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);

  try {
    const ctx = await getTeamContext();
    if (!ctx) return ApiError.unauthorized();

    // Idempotency check — prevents duplicate analyses for the same client key.
    const idempotencyKey = req.headers.get("x-idempotency-key") || correlationId;
    const idemCheck = await checkIdempotency(ctx.currentTeamId, idempotencyKey);
    if (idemCheck.cached) return idemCheck.response;

    const planType = await getUserPlanType(ctx.currentTeamId);
    const rlResult = await checkRateLimit(ctx.currentTeamId, planType, "ai");
    if (!rlResult.success) return createRateLimitResponse(rlResult);

    const access = await checkCompetitorAnalyzerAccessDetailed(ctx.currentTeamId);
    if (!access.allowed) return createPlanLimitResponse(access);

    const aiAccess = await checkAiLimitDetailed(ctx.currentTeamId);
    if (!aiAccess.allowed) return createPlanLimitResponse(aiAccess);

    const json = await req.json();
    const result = requestSchema.safeParse(json);
    if (!result.success) {
      return ApiError.badRequest(result.error.issues);
    }

    const { username, language } = result.data;

    const twitterData = await fetchUserTweets(username);
    // fetchUserTweets makes 2 X calls: user lookup then tweets-by-user (both
    // third-party reads of a non-owned account).
    await recordXUsage(ctx.currentTeamId, "user_lookup", {
      endpoint: "/2/users/by/username/:username",
      correlationId,
    });
    if (twitterData.ok) {
      await recordXUsage(ctx.currentTeamId, "read_third", {
        endpoint: "/2/users/:id/tweets",
        correlationId,
      });
    }
    if (!twitterData.ok) {
      if (twitterData.status === 404) {
        return ApiError.notFound(twitterData.message);
      } else if (twitterData.status === 422) {
        return ApiError.badRequest(twitterData.message);
      } else if (twitterData.status === 429) {
        return ApiError.serviceUnavailable("Rate limited by Twitter API. Please try again later.");
      } else {
        return ApiError.serviceUnavailable(twitterData.message);
      }
    }

    if (twitterData.tweets.length === 0) {
      return ApiError.badRequest(`@${username} has no public tweets to analyze.`);
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return ApiError.internal("AI service not configured");
    }

    const openrouter = createOpenRouter({ apiKey });
    const fallbackBody = openrouterFallbackBody(
      process.env.OPENROUTER_MODEL!,
      process.env.OPENROUTER_MODEL_FREE
    );
    const model = openrouter(process.env.OPENROUTER_MODEL!, {
      provider: { data_collection: "deny" as const },
      ...(fallbackBody && { extraBody: fallbackBody }),
    }) as unknown as LanguageModel;

    const prompt = buildCompetitorAnalysisPrompt(username, twitterData.tweets, language);
    const modelId = process.env.OPENROUTER_MODEL!;

    // Atomic quota consumption — closes the race condition between concurrent
    // analyses where two requests could both pass a non-atomic check. Consumed
    // here (after external API success) so username typos don't burn credits.
    const quotaResult = await tryConsumeAiQuota(ctx.currentTeamId, 1);
    if (!quotaResult.allowed) {
      return createPlanLimitResponse({
        allowed: false,
        error: "quota_exceeded",
        feature: "ai_quota",
        message: `You've used ${quotaResult.used}/${quotaResult.limit} AI generations this month.`,
        plan: planType,
        limit: quotaResult.limit,
        used: quotaResult.used,
        suggestedPlan: "pro_monthly",
        trialActive: false,
        resetAt: quotaResult.resetAt,
      });
    }

    const t0 = performance.now();
    let object;
    let usage;
    try {
      ({ object, usage } = await withRetry(() =>
        withTimeout(
          generateObject({
            model,
            schema: analysisSchema,
            prompt,
          })
        )
      ));
    } catch (err) {
      releaseAiQuota(ctx.currentTeamId, 1).catch((releaseErr) => {
        logger.error("competitor_release_quota_error", { error: releaseErr });
      });
      throw err;
    }
    const latencyMs = Math.round(performance.now() - t0);

    // Phase 2: uses new options-object signature
    await recordAiUsage({
      userId: ctx.currentTeamId,
      type: "competitor_analyzer",
      model: modelId,
      subFeature: "competitor.analyze",
      tokensIn: usage?.inputTokens ?? 0,
      tokensOut: usage?.outputTokens ?? 0,
      costEstimateCents: estimateCost(modelId, usage?.inputTokens ?? 0, usage?.outputTokens ?? 0),
      promptVersion: "competitor:v1",
      latencyMs,
      fallbackUsed: false,
      inputPrompt: prompt,
      outputContent: object,
      language,
    });

    const body = {
      username,
      displayName: twitterData.user.name,
      followerCount: twitterData.user.public_metrics?.followers_count ?? 0,
      tweetCount: twitterData.tweets.length,
      analysis: object,
    };

    // Cache successful response for idempotent replay.
    await cacheIdempotentResponse(ctx.currentTeamId, idempotencyKey, 200, JSON.stringify(body), {
      "x-correlation-id": correlationId,
      "content-type": "application/json",
    });

    const res = Response.json(body);
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("competitor_analysis_error", {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to analyze competitor");
  }
}
