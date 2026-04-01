import { headers } from "next/headers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { type LanguageModel } from "ai";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  checkAiLimitDetailed,
  checkAiQuotaDetailed,
  createPlanLimitResponse,
  type PlanGateResult,
} from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";

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
   * Skip the monthly quota check (checkAiQuotaDetailed).
   * Set true for the score route which doesn't record AI usage.
   */
  skipQuotaCheck?: boolean;
}

export type AiPreambleResult = {
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
  dbUser: { plan: string | null; voiceProfile: unknown };
  model: LanguageModel;
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
  const { featureGate, customAiAccess, skipQuotaCheck = false } = opts;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { plan: true, voiceProfile: true },
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

  if (!skipQuotaCheck) {
    const aiQuota = await checkAiQuotaDetailed(session.user.id);
    if (!aiQuota.allowed) return createPlanLimitResponse(aiQuota);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500 });
  }

  const openrouter = createOpenRouter({ apiKey });
  // Cast needed: OpenRouterChatLanguageModel satisfies LanguageModel at runtime but has
  // a minor type divergence in providerMetadata vs LanguageModelV2 interface.
  const model = openrouter(process.env.OPENROUTER_MODEL!) as unknown as LanguageModel;

  return {
    session,
    dbUser: dbUser ?? { plan: null, voiceProfile: null },
    model,
  };
}
