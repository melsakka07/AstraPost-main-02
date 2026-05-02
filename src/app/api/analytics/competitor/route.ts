import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject, type LanguageModel } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  checkAiLimitDetailed,
  checkAiQuotaDetailed,
  checkCompetitorAnalyzerAccessDetailed,
  createPlanLimitResponse,
} from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";
import { buildCompetitorAnalysisPrompt, fetchUserTweets } from "@/lib/services/competitor-analysis";
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

    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, ctx.currentTeamId),
      columns: { plan: true },
    });

    const rlResult = await checkRateLimit(ctx.currentTeamId, dbUser?.plan || "free", "ai");
    if (!rlResult.success) return createRateLimitResponse(rlResult);

    const access = await checkCompetitorAnalyzerAccessDetailed(ctx.currentTeamId);
    if (!access.allowed) return createPlanLimitResponse(access);

    const aiAccess = await checkAiLimitDetailed(ctx.currentTeamId);
    if (!aiAccess.allowed) return createPlanLimitResponse(aiAccess);

    const aiQuota = await checkAiQuotaDetailed(ctx.currentTeamId);
    if (!aiQuota.allowed) return createPlanLimitResponse(aiQuota);

    const json = await req.json();
    const result = requestSchema.safeParse(json);
    if (!result.success) {
      return ApiError.badRequest(result.error.issues);
    }

    const { username, language } = result.data;

    const twitterData = await fetchUserTweets(username);
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
    const model = openrouter(process.env.OPENROUTER_MODEL!, {
      provider: { data_collection: "deny" as const },
    }) as unknown as LanguageModel;

    const prompt = buildCompetitorAnalysisPrompt(username, twitterData.tweets, language);
    const modelId = process.env.OPENROUTER_MODEL!;

    const t0 = performance.now();
    const { object, usage } = await generateObject({
      model,
      schema: analysisSchema,
      prompt,
    });
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

    const res = Response.json({
      username,
      displayName: twitterData.user.name,
      followerCount: twitterData.user.public_metrics?.followers_count ?? 0,
      tweetCount: twitterData.tweets.length,
      analysis: object,
    });
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
