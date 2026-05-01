import "server-only";

import { headers } from "next/headers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { type LanguageModel } from "ai";
import { eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import {
  checkAiLimitDetailed,
  createPlanLimitResponse,
  type PlanGateResult,
} from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";
import { releaseAiQuota, tryConsumeAiQuota } from "@/lib/services/ai-quota-atomic";
import { moderateOutput } from "@/lib/services/moderation";

export interface AiPreambleOptions {
  /**
   * Extra feature gate run BEFORE the standard AI access checks.
   * Used by Pro-only routes: calendar, variants, summarize, reply, bio.
   */
  featureGate?: (userId: string) => Promise<PlanGateResult>;
  /**
   * Replace the standard checkAiLimitDetailed with a custom check.
   * The score route uses checkViralScoreAccessDetailed instead.
   */
  customAiAccess?: (userId: string) => Promise<PlanGateResult>;
  /**
   * Skip the monthly quota check (tryConsumeAiQuota).
   * Set true for the score route which doesn't record AI usage.
   */
  skipQuotaCheck?: boolean;
  /**
   * Weight multiplier for quota consumption. Agentic posting uses 5.
   * Default: 1.
   */
  quotaWeight?: number;
}

export type AiPreambleResult = {
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
  dbUser: { plan: string | null; voiceProfile: unknown; language: string | null };
  model: LanguageModel;
  fallbackModel: LanguageModel | null;
  /** Release quota previously consumed by this preamble. Call in route catch blocks on generation failure. */
  releaseQuota: () => Promise<void>;
  /** Quota consumption result. null when skipQuotaCheck is true. */
  consumed: { used: number; limit: number; resetAt: Date } | null;
  /**
   * Post-generation moderation check.
   * Routes call this after generation completes. Returns a 403 Response if the
   * output is flagged; returns void (undefined) if the output is clean.
   *
   * @param output       - The AI-generated text to check
   * @param generationId - Optional link to an aiGenerations row for traceability
   */
  checkModeration: (output: string, generationId?: string) => Promise<Response | void>;
};

/**
 * Standard AI route preamble shared by all 11 AI generation routes.
 *
 * Runs: auth → dbUser (plan + voiceProfile) → rate-limit →
 *       optional feature gate → AI access check → optional quota check →
 *       API key guard → model instantiation.
 *
 * Returns a Response on any failure — caller must return it immediately.
 * Returns AiPreambleResult on success.
 *
 * @example
 *   const preamble = await aiPreamble();
 *   if (preamble instanceof Response) return preamble;
 *   const { session, dbUser, model } = preamble;
 *
 * @example Score route (custom access check, no quota)
 *   const preamble = await aiPreamble({
 *     customAiAccess: checkViralScoreAccessDetailed,
 *     skipQuotaCheck: true,
 *   });
 *   if (preamble instanceof Response) return preamble;
 *
 * @example Pro-gated route (calendar, variants, summarize, reply, bio)
 *   const preamble = await aiPreamble({ featureGate: checkContentCalendarAccessDetailed });
 *   if (preamble instanceof Response) return preamble;
 */
export async function aiPreamble(
  opts: AiPreambleOptions = {}
): Promise<AiPreambleResult | Response> {
  const { featureGate, customAiAccess, skipQuotaCheck = false, quotaWeight = 1 } = opts;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { plan: true, voiceProfile: true, language: true },
  });

  const rlResult = await checkRateLimit(session.user.id, dbUser?.plan || "free", "ai");
  if (!rlResult.success) return createRateLimitResponse(rlResult);

  if (featureGate) {
    const access = await featureGate(session.user.id);
    if (!access.allowed) return createPlanLimitResponse(access);
  }

  const aiAccessFn = customAiAccess ?? checkAiLimitDetailed;
  const aiAccess = await aiAccessFn(session.user.id);
  if (!aiAccess.allowed) return createPlanLimitResponse(aiAccess);

  let consumed: { used: number; limit: number; resetAt: Date } | null = null;

  if (!skipQuotaCheck) {
    const quotaResult = await tryConsumeAiQuota(session.user.id, quotaWeight);
    if (!quotaResult.allowed) {
      return createPlanLimitResponse({
        allowed: false,
        error: "quota_exceeded",
        feature: "ai_quota",
        message: `You've used ${quotaResult.used}/${quotaResult.limit} AI generations this month. Upgrade to keep creating.`,
        plan: (dbUser?.plan as "free" | "pro_monthly" | "pro_annual" | "agency") ?? "free",
        limit: quotaResult.limit,
        used: quotaResult.used,
        suggestedPlan: "pro_monthly",
        trialActive: false,
        resetAt: quotaResult.resetAt,
      });
    }
    consumed = { used: quotaResult.used, limit: quotaResult.limit, resetAt: quotaResult.resetAt };
  }

  const releaseQuota = async () => {
    if (consumed) {
      await releaseAiQuota(session.user.id, quotaWeight);
    }
  };

  const { OPENROUTER_API_KEY, OPENROUTER_MODEL, OPENROUTER_MODEL_FREE } = getServerEnv();

  if (!OPENROUTER_API_KEY) {
    return ApiError.internal("AI service not configured");
  }

  const openrouter = createOpenRouter({ apiKey: OPENROUTER_API_KEY });
  // Cast needed: OpenRouterChatLanguageModel satisfies LanguageModel at runtime but has
  // a minor type divergence in providerMetadata vs LanguageModelV2 interface.
  const openRouterSettings = { provider: { data_collection: "deny" as const } };
  const model = openrouter(OPENROUTER_MODEL, openRouterSettings) as unknown as LanguageModel;
  const fallbackModel = OPENROUTER_MODEL_FREE
    ? (openrouter(OPENROUTER_MODEL_FREE, openRouterSettings) as unknown as LanguageModel)
    : null;

  const checkModeration = async (
    output: string,
    generationId?: string
  ): Promise<Response | void> => {
    const { flagged } = await moderateOutput(output, session.user.id, generationId);
    if (flagged) {
      return ApiError.forbidden(
        "Content moderation flagged this output. Please rephrase your request."
      );
    }
  };

  return {
    session,
    dbUser: dbUser ?? { plan: null, voiceProfile: null, language: null },
    model,
    fallbackModel,
    releaseQuota,
    consumed,
    checkModeration,
  };
}
