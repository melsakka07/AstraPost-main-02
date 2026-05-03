import "server-only";

import { headers } from "next/headers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { type LanguageModel } from "ai";
import { eq } from "drizzle-orm";
import { withRetry } from "@/lib/ai/with-retry";
import { withTimeout } from "@/lib/ai/with-timeout";
import { ApiError } from "@/lib/api/errors";
import { checkIdempotency, cacheIdempotentResponse } from "@/lib/api/idempotency";
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
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";
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
  /**
   * Correlation ID for distributed tracing. Passed through to OpenRouter
   * requests and included in telemetry. If not provided, one is generated.
   */
  correlationId?: string;
  /**
   * Prompt version identifier for A/B testing and cost attribution.
   * Stored on the ai_generations row for later analysis.
   */
  promptVersion?: string;
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
  /**
   * Phase 2 telemetry: records the AI generation with full telemetry context.
   *
   * Call this AFTER the generation completes. Captures the preamble's context
   * (userId, model, promptVersion) and merges it with the route's per-call data.
   * Handles cost estimation and fallback logging automatically.
   *
   * @example
   *   const start = Date.now();
   *   const result = await generateObject({ model, ... });
   *   await recordTelemetry({
   *     tokensIn: result.usage.promptTokens,
   *     tokensOut: result.usage.completionTokens,
   *     subFeature: "translate",
   *     latencyMs: Date.now() - start,
   *     inputPrompt: prompt,
   *     outputContent: result.object,
   *   });
   */
  /**
   * Cache a successful response for idempotent replay.
   * Routes call this after generation completes so that retries with the same
   * x-idempotency-key or correlation ID short-circuit inside aiPreamble.
   */
  cacheIdempotent: (status: number, body: string, headers: Record<string, string>) => Promise<void>;
  recordTelemetry: (extra: {
    tokensIn: number;
    tokensOut: number;
    subFeature: string;
    latencyMs: number;
    fallbackUsed?: boolean;
    inputPrompt?: string;
    outputContent?: unknown;
    language?: string;
  }) => Promise<void>;
  /**
   * Exponential-backoff retry helper (tries=2, baseMs=250).
   * Re-exported for convenience — routes receive it via preamble.
   */
  withRetry: typeof withRetry;
  /**
   * Promise timeout helper (default 45 s).
   * Re-exported for convenience — routes receive it via preamble.
   */
  withTimeout: typeof withTimeout;
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
 *
 * @example Phase 2 telemetry (correlation + prompt version + latency)
 *   const correlationId = getCorrelationId(req);
 *   const preamble = await aiPreamble({ correlationId, promptVersion: "v2" });
 *   if (preamble instanceof Response) return preamble;
 *   const { model, recordTelemetry } = preamble;
 *   const start = Date.now();
 *   const result = await generateObject({ model, ... });
 *   await recordTelemetry({
 *     tokensIn: result.usage.promptTokens,
 *     tokensOut: result.usage.completionTokens,
 *     subFeature: "translate",
 *     latencyMs: Date.now() - start,
 *   });
 */
export async function aiPreamble(
  opts: AiPreambleOptions = {}
): Promise<AiPreambleResult | Response> {
  const {
    featureGate,
    customAiAccess,
    skipQuotaCheck = false,
    quotaWeight = 1,
    correlationId = crypto.randomUUID(),
    promptVersion,
  } = opts;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { plan: true, voiceProfile: true, language: true },
  });

  // T9: Idempotency check — short-circuits duplicate AI generations.
  // Uses x-idempotency-key header if present, otherwise correlationId.
  const requestHeaders = await headers();
  const idempotencyKey = requestHeaders.get("x-idempotency-key") ?? correlationId;
  const idemCheck = await checkIdempotency(session.user.id, idempotencyKey);
  if (idemCheck.cached) return idemCheck.response;

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

  // B1: Anthropic prompt caching via providerOptions
  const isAnthropic = OPENROUTER_MODEL.startsWith("anthropic/");
  const providerOptions: Record<string, unknown> | undefined = isAnthropic
    ? { openrouter: { cacheControl: { type: "ephemeral" } } }
    : undefined;

  // T6: OpenRouter native fallback chain (handles 429s automatically)
  const extraBody: Record<string, unknown> | undefined = OPENROUTER_MODEL_FREE
    ? { models: [OPENROUTER_MODEL, OPENROUTER_MODEL_FREE], route: "fallback" }
    : undefined;

  // Phase 2: propagate correlation ID via headers and metadata to every OpenRouter request
  const openRouterSettings = {
    provider: { data_collection: "deny" as const },
    headers: { "x-correlation-id": correlationId },
    ...(providerOptions && { providerOptions }),
    ...(extraBody && { extraBody }),
  };

  const model = openrouter(OPENROUTER_MODEL, openRouterSettings) as unknown as LanguageModel;
  // fallbackModel removed — OpenRouter handles model switching natively via extraBody.models + route:fallback

  // Capture context for telemetry closure
  const modelName = OPENROUTER_MODEL;
  const userId = session.user.id;

  const recordTelemetry = async (extra: {
    tokensIn: number;
    tokensOut: number;
    subFeature: string;
    latencyMs: number;
    fallbackUsed?: boolean;
    inputPrompt?: string;
    outputContent?: unknown;
    language?: string;
  }) => {
    const costEstimateCents =
      extra.tokensIn > 0 || extra.tokensOut > 0
        ? Math.round(estimateCost(modelName, extra.tokensIn, extra.tokensOut))
        : undefined;

    await recordAiUsage({
      userId,
      type: extra.subFeature,
      model: modelName,
      subFeature: extra.subFeature,
      tokensIn: extra.tokensIn,
      tokensOut: extra.tokensOut,
      ...(costEstimateCents !== undefined && { costEstimateCents }),
      ...(promptVersion !== undefined && { promptVersion }),
      latencyMs: extra.latencyMs,
      ...(extra.fallbackUsed !== undefined && { fallbackUsed: extra.fallbackUsed }),
      ...(extra.inputPrompt !== undefined && { inputPrompt: extra.inputPrompt }),
      ...(extra.outputContent !== undefined && { outputContent: extra.outputContent }),
      ...(extra.language !== undefined && { language: extra.language }),
    });
  };

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
    fallbackModel: null,
    releaseQuota,
    consumed,
    cacheIdempotent: (status: number, body: string, headers: Record<string, string>) =>
      cacheIdempotentResponse(session.user.id, idempotencyKey, status, body, headers),
    checkModeration,
    recordTelemetry,
    withRetry,
    withTimeout,
  };
}
