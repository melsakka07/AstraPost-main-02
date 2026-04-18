import { and, eq, gte, isNull, ne, sql } from "drizzle-orm";
import { cachedQuery } from "@/lib/cache";
import { db } from "@/lib/db";
import {
  getPlanLimits,
  normalizePlan,
  TRIAL_EFFECTIVE_PLAN,
  type ImageModel,
  type PlanLimits,
  type PlanType,
} from "@/lib/plan-limits";
import { aiGenerations, inspirationBookmarks, posts, user, xAccounts } from "@/lib/schema";
import { getMonthWindow } from "@/lib/utils/time";

export type GatedFeature =
  | "ai_writer"
  | "ai_quota"
  | "scheduled_posts"
  | "x_accounts"
  | "analytics_export"
  | "viral_score"
  | "best_times"
  | "voice_profile"
  | "linkedin_access"
  | "content_calendar"
  | "url_to_thread"
  | "variant_generator"
  | "competitor_analyzer"
  | "reply_generator"
  | "bio_optimizer"
  | "inspiration_bookmarks"
  | "ai_image_model"
  | "inspiration"
  | "agentic_posting";

export type PlanErrorCode = "upgrade_required" | "quota_exceeded";

interface PlanContext {
  plan: PlanType;
  effectivePlan: PlanType;
  trialEndsAt: Date | null;
  isTrialActive: boolean;
}

export interface PlanGateFailure {
  allowed: false;
  error: PlanErrorCode;
  feature: GatedFeature;
  message: string;
  plan: PlanType;
  limit: number | null;
  used: number;
  suggestedPlan: PlanType;
  trialActive: boolean;
  resetAt: Date | null;
}

interface PlanGateSuccess {
  allowed: true;
}

export type PlanGateResult = PlanGateSuccess | PlanGateFailure;

async function getPlanContext(userId: string): Promise<PlanContext> {
  return cachedQuery(
    `plan:${userId}`,
    async () => {
      const dbUser = await db.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { plan: true, trialEndsAt: true, createdAt: true, planExpiresAt: true },
      });

      const plan = normalizePlan(dbUser?.plan);
      let trialEndsAt = dbUser?.trialEndsAt ?? null;

      // Grace period enforcement: if planExpiresAt has passed, treat as free
      const now = new Date();
      const effectivePlanBase = dbUser?.planExpiresAt && dbUser.planExpiresAt < now ? "free" : plan;

      if (plan === "free" && !trialEndsAt && dbUser?.createdAt) {
        const inferredTrialEndsAt = new Date(dbUser.createdAt);
        inferredTrialEndsAt.setDate(inferredTrialEndsAt.getDate() + 14);
        trialEndsAt = inferredTrialEndsAt;

        await db
          .update(user)
          .set({ trialEndsAt: inferredTrialEndsAt })
          .where(and(eq(user.id, userId), isNull(user.trialEndsAt)));
      }

      const isTrialActive = effectivePlanBase === "free" && !!trialEndsAt && now < trialEndsAt;
      const effectivePlan = isTrialActive ? TRIAL_EFFECTIVE_PLAN : effectivePlanBase;

      return { plan: effectivePlanBase, effectivePlan, trialEndsAt, isTrialActive };
    },
    5 * 60 // 5 minutes
  );
}

function buildFailure(params: Omit<PlanGateFailure, "allowed">): PlanGateFailure {
  return { allowed: false, ...params };
}

export function buildPlanLimitPayload(result: PlanGateFailure) {
  const remaining =
    typeof result.limit === "number" ? Math.max(0, result.limit - result.used) : null;

  return {
    error: result.error,
    code: result.error,
    feature: result.feature,
    message: result.message,
    plan: result.plan,
    limit: result.limit,
    used: result.used,
    remaining,
    upgrade_url: "/pricing",
    suggested_plan: result.suggestedPlan,
    trial_active: result.trialActive,
    reset_at: result.resetAt ? result.resetAt.toISOString() : null,
  };
}

export function createPlanLimitResponse(result: PlanGateFailure) {
  // eslint-disable-next-line no-restricted-syntax
  return new Response(JSON.stringify(buildPlanLimitPayload(result)), {
    status: 402,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Returns the normalised plan type for a given user.
 * Use when a non-gate caller (e.g. rate-limiter tier selection) needs the plan
 * string without triggering a full plan-limit gate response.
 */
export async function getUserPlanType(userId: string): Promise<PlanType> {
  return (await getPlanContext(userId)).plan;
}

// ─── Boolean-flag feature gate factory ────────────────────────────────────────
// The 10 Pro/Agency boolean feature flags all follow the exact same check
// pattern.  Rather than duplicating 8 lines per function, the factory generates
// them from a declarative config.

type BooleanPlanLimitKey = {
  [K in keyof PlanLimits]: PlanLimits[K] extends boolean ? K : never;
}[keyof PlanLimits];

function makeFeatureGate(
  feature: GatedFeature,
  limitFlag: BooleanPlanLimitKey,
  message: string,
  suggestedPlan: PlanType = "pro_monthly"
): (userId: string) => Promise<PlanGateResult> {
  return async function checkDetailed(userId: string): Promise<PlanGateResult> {
    const context = await getPlanContext(userId);
    const limits = getPlanLimits(context.effectivePlan);
    if (limits[limitFlag]) return { allowed: true };
    return buildFailure({
      error: "upgrade_required",
      feature,
      message,
      plan: context.plan,
      limit: 0,
      used: 1,
      suggestedPlan,
      trialActive: context.isTrialActive,
      resetAt: null,
    });
  };
}

// ─── Account & post quota gates (custom logic) ────────────────────────────────

export async function checkAccountLimitDetailed(
  userId: string,
  increment = 1
): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  const limits = getPlanLimits(context.effectivePlan);
  if (limits.maxXAccounts === Infinity) return { allowed: true };

  const accountsCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(xAccounts)
    .where(eq(xAccounts.userId, userId));
  const used = Number(accountsCount[0]?.count ?? 0);

  if (used + increment <= limits.maxXAccounts) return { allowed: true };

  return buildFailure({
    error: "upgrade_required",
    feature: "x_accounts",
    message: "Your current plan has reached the connected X accounts limit.",
    plan: context.plan,
    limit: Number.isFinite(limits.maxXAccounts) ? limits.maxXAccounts : null,
    used,
    suggestedPlan: "pro_monthly",
    trialActive: context.isTrialActive,
    resetAt: null,
  });
}

export async function checkAccountLimit(userId: string) {
  const result = await checkAccountLimitDetailed(userId);
  return result.allowed;
}

export async function checkPostLimitDetailed(userId: string, count = 1): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  const limits = getPlanLimits(context.effectivePlan);
  if (limits.postsPerMonth === Infinity) return { allowed: true };

  const { start, end } = getMonthWindow();
  const postCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(and(eq(posts.userId, userId), ne(posts.status, "draft"), gte(posts.createdAt, start)));
  const used = Number(postCount[0]?.count ?? 0);

  if (used + count <= limits.postsPerMonth) return { allowed: true };

  return buildFailure({
    error: "upgrade_required",
    feature: "scheduled_posts",
    message: "You have reached your monthly scheduled posts limit for this plan.",
    plan: context.plan,
    limit: Number.isFinite(limits.postsPerMonth) ? limits.postsPerMonth : null,
    used,
    suggestedPlan: "pro_monthly",
    trialActive: context.isTrialActive,
    resetAt: end,
  });
}

export async function checkPostLimit(userId: string, count: number = 1) {
  const result = await checkPostLimitDetailed(userId, count);
  return result.allowed;
}

export async function checkAiLimitDetailed(userId: string): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  const limits = getPlanLimits(context.effectivePlan);
  if (limits.canUseAi) return { allowed: true };

  return buildFailure({
    error: "upgrade_required",
    feature: "ai_writer",
    message: "AI tools are not available on your current plan.",
    plan: context.plan,
    limit: Number.isFinite(limits.aiGenerationsPerMonth) ? limits.aiGenerationsPerMonth : null,
    used: 0,
    suggestedPlan: "pro_monthly",
    trialActive: context.isTrialActive,
    resetAt: null,
  });
}

export async function checkAiLimit(userId: string) {
  const result = await checkAiLimitDetailed(userId);
  return result.allowed;
}

export async function checkAiQuotaDetailed(userId: string): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  const limits = getPlanLimits(context.effectivePlan);
  if (limits.aiGenerationsPerMonth === Infinity) return { allowed: true };

  const { start, end } = getMonthWindow();
  const aiCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.userId, userId),
        ne(aiGenerations.type, "image"),
        gte(aiGenerations.createdAt, start)
      )
    );
  const used = Number(aiCount[0]?.count ?? 0);

  if (used < limits.aiGenerationsPerMonth) return { allowed: true };

  return buildFailure({
    error: "quota_exceeded",
    feature: "ai_quota",
    message: "You have reached your monthly AI generation quota.",
    plan: context.plan,
    limit: Number.isFinite(limits.aiGenerationsPerMonth) ? limits.aiGenerationsPerMonth : null,
    used,
    suggestedPlan: "pro_monthly",
    trialActive: context.isTrialActive,
    resetAt: end,
  });
}

export async function checkAnalyticsExportLimitDetailed(userId: string): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  const limits = getPlanLimits(context.effectivePlan);
  if (limits.analyticsExport !== "none") return { allowed: true };

  return buildFailure({
    error: "upgrade_required",
    feature: "analytics_export",
    message: "Analytics export is not available on your current plan.",
    plan: context.plan,
    limit: 0,
    used: 1,
    suggestedPlan: "pro_monthly",
    trialActive: context.isTrialActive,
    resetAt: null,
  });
}

// ─── Bookmark quota gate (D-17) ───────────────────────────────────────────────

export async function checkBookmarkLimitDetailed(userId: string): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  const limits = getPlanLimits(context.effectivePlan);

  // maxInspirationBookmarks === -1 means unlimited
  if (limits.maxInspirationBookmarks < 0) return { allowed: true };

  const { end } = getMonthWindow();
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inspirationBookmarks)
    .where(eq(inspirationBookmarks.userId, userId));
  const used = Number(countResult[0]?.count ?? 0);

  if (used < limits.maxInspirationBookmarks) return { allowed: true };

  return buildFailure({
    error: "upgrade_required",
    feature: "inspiration_bookmarks",
    message: `You have reached your bookmark limit of ${limits.maxInspirationBookmarks}. Upgrade to save unlimited inspirations.`,
    plan: context.plan,
    limit: limits.maxInspirationBookmarks,
    used,
    suggestedPlan: "pro_monthly",
    trialActive: context.isTrialActive,
    resetAt: end,
  });
}

// ─── Boolean feature gates (generated via factory) ───────────────────────────

export const checkViralScoreAccessDetailed = makeFeatureGate(
  "viral_score",
  "canUseViralScore",
  "AI Viral Score is a Pro feature."
);

export const checkBestTimesAccessDetailed = makeFeatureGate(
  "best_times",
  "canViewBestTimes",
  "Best Times to Post is a Pro feature."
);

export const checkVoiceProfileAccessDetailed = makeFeatureGate(
  "voice_profile",
  "canUseVoiceProfile",
  "AI Voice Profile is a Pro feature."
);

export const checkLinkedinAccessDetailed = makeFeatureGate(
  "linkedin_access",
  "canUseLinkedin",
  "LinkedIn integration is an Agency plan feature.",
  "agency"
);

export const checkContentCalendarAccessDetailed = makeFeatureGate(
  "content_calendar",
  "canUseContentCalendar",
  "AI Content Calendar is a Pro feature."
);

export const checkUrlToThreadAccessDetailed = makeFeatureGate(
  "url_to_thread",
  "canUseUrlToThread",
  "URL → Thread Converter is a Pro feature."
);

export const checkVariantGeneratorAccessDetailed = makeFeatureGate(
  "variant_generator",
  "canUseVariantGenerator",
  "A/B Variant Generator is a Pro feature."
);

export const checkCompetitorAnalyzerAccessDetailed = makeFeatureGate(
  "competitor_analyzer",
  "canUseCompetitorAnalyzer",
  "Competitor Analyzer is a Pro feature."
);

export const checkReplyGeneratorAccessDetailed = makeFeatureGate(
  "reply_generator",
  "canUseReplyGenerator",
  "Reply Suggester is a Pro feature."
);

export const checkBioOptimizerAccessDetailed = makeFeatureGate(
  "bio_optimizer",
  "canUseBioOptimizer",
  "AI Bio Optimizer is a Pro feature."
);

export const checkInspirationAccessDetailed = makeFeatureGate(
  "inspiration",
  "canUseInspiration",
  "Inspiration feature is not available on your plan."
);

export const checkAgenticPostingAccessDetailed = makeFeatureGate(
  "agentic_posting",
  "canUseAgenticPosting",
  "Agentic Posting is a Pro feature."
);

// ─── Image-specific gates ──────────────────────────────────────────────────────

/**
 * Gates access to a specific AI image model.
 * Each plan exposes a subset of `availableImageModels`; Pro+ unlock nano-banana-pro.
 * Returns 402 + upgrade_url when the requested model is not on the user's plan.
 */
export async function checkImageModelAccessDetailed(
  userId: string,
  model: ImageModel
): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  const limits = getPlanLimits(context.effectivePlan);
  if (limits.availableImageModels.includes(model)) return { allowed: true };
  return buildFailure({
    error: "upgrade_required",
    feature: "ai_image_model",
    message: `The ${model} model is not available on your current plan.`,
    plan: context.plan,
    limit: 0,
    used: 1,
    suggestedPlan: "pro_monthly",
    trialActive: context.isTrialActive,
    resetAt: null,
  });
}

/**
 * Gates the monthly AI image generation quota.
 * -1 in `aiImagesPerMonth` means unlimited (Agency plan).
 * Returns 402 + upgrade_url + reset_at when the quota is exhausted.
 */
export async function checkAiImageQuotaDetailed(userId: string): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  const limits = getPlanLimits(context.effectivePlan);
  if (limits.aiImagesPerMonth === -1) return { allowed: true }; // unlimited

  const { start, end } = getMonthWindow();
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.userId, userId),
        eq(aiGenerations.type, "image"),
        gte(aiGenerations.createdAt, start)
      )
    );
  const used = Number(countResult[0]?.count ?? 0);

  if (used < limits.aiImagesPerMonth) return { allowed: true };

  return buildFailure({
    error: "quota_exceeded",
    feature: "ai_quota",
    message: "You have reached your monthly AI image quota.",
    plan: context.plan,
    limit: limits.aiImagesPerMonth,
    used,
    suggestedPlan: "pro_monthly",
    trialActive: context.isTrialActive,
    resetAt: end,
  });
}
