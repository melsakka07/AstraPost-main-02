import "server-only";

import { and, eq, gte, isNull, ne, sql } from "drizzle-orm";
import { cachedQuery } from "@/lib/cache";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  getPlanLimits,
  normalizePlan,
  TRIAL_EFFECTIVE_PLAN,
  IMAGE_MODEL_COST,
  type ImageModel,
  type PlanType,
  type ToolKey,
} from "@/lib/plan-limits";
import {
  aiGenerations,
  inspirationBookmarks,
  instagramAccounts,
  linkedinAccounts,
  planChangeLog,
  posts,
  teamInvitations,
  teamMembers,
  user,
  xAccounts,
} from "@/lib/schema";
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
  | "agentic_posting"
  | "affiliate_generator"
  | "tools"
  | "pdf_to_thread"
  | "youtube_to_thread"
  | "youtube_duration"
  | "thread_access"
  | "video_upload"
  | "instagram_accounts"
  | "linkedin_accounts"
  | "schedule_horizon"
  | "team_members";

export type PlanErrorCode = "upgrade_required" | "quota_exceeded";

interface PlanContext {
  plan: PlanType;
  effectivePlan: PlanType;
  trialEndsAt: Date | null;
  isTrialActive: boolean;
  /** True when the 14-day trial window has ended and the user is now on free */
  trialExpired: boolean;
}

export interface PlanGateFailure {
  allowed: false;
  error: PlanErrorCode;
  feature: GatedFeature;
  message: string;
  plan: PlanType;
  limit: number | null;
  used: number;
  suggestedPlan?: PlanType;
  trialActive: boolean;
  resetAt: Date | null;
}

interface PlanGateSuccess {
  allowed: true;
}

export type PlanGateResult = PlanGateSuccess | PlanGateFailure;

// Tracks users whose trial-expiry audit log has been written in this process.
// Avoids running a `findFirst` on every gated API call for expired-trial users
// (the cached `getPlanContext` result returns `trialExpired: true` indefinitely
// until cache invalidates). Resets per cold start; DB idempotency is the source
// of truth for the rare duplicate.
const trialExpiryLoggedThisProcess = new Set<string>();

async function getPlanContext(userId: string): Promise<PlanContext> {
  const result = await cachedQuery(
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

      if (effectivePlanBase === "free" && plan !== "free") {
        logger.warn("plan_context_expired_grace_period", {
          userId,
          storedPlan: plan,
          planExpiresAt: dbUser?.planExpiresAt?.toISOString() ?? null,
        });
      }

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
      const trialExpired = effectivePlanBase === "free" && !!trialEndsAt && now >= trialEndsAt;

      return { plan: effectivePlanBase, effectivePlan, trialEndsAt, isTrialActive, trialExpired };
    },
    5 * 60 // 5 minutes
  );

  // Fire-and-forget: write audit log when trial has expired (idempotent via
  // existence check). The in-process Set dedupes repeated lookups for the same
  // user — without it, every cached getPlanContext call for an expired-trial
  // user would re-run the findFirst query.
  if (result.trialExpired && !trialExpiryLoggedThisProcess.has(userId)) {
    void (async () => {
      try {
        const existing = await db.query.planChangeLog.findFirst({
          where: and(eq(planChangeLog.userId, userId), eq(planChangeLog.reason, "trial_expired")),
        });
        if (!existing) {
          await db.insert(planChangeLog).values({
            id: crypto.randomUUID(),
            userId,
            oldPlan: null, // trial is a synthetic plan, not a DB-stored plan
            newPlan: "free",
            reason: "trial_expired",
          });
        }
        trialExpiryLoggedThisProcess.add(userId);
      } catch (err) {
        logger.error("plan_context_trial_expiry_audit_failed", { userId, error: String(err) });
      }
    })();
  }

  return result;
}

function buildFailure(params: Omit<PlanGateFailure, "allowed">): PlanGateFailure {
  return { allowed: false, ...params };
}

export function buildPlanLimitPayload(
  result: PlanGateFailure,
  stats?: { threadsCreated: number; totalImpressions: number | null } | null
) {
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
    last30d_stats: stats ?? null,
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
 * Creates a 402 Plan Limit response enriched with the user's 30-day usage stats.
 *
 * Usage stats are queried asynchronously — if the query fails, stats are set to
 * null (graceful degradation). Use this when the frontend benefits from showing
 * the user their recent activity alongside the upgrade prompt.
 */
export async function createPlanLimitResponseWithStats(
  result: PlanGateFailure,
  userId: string
): Promise<Response> {
  let stats: { threadsCreated: number; totalImpressions: number | null } | null = null;
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [threadsRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiGenerations)
      .where(
        and(
          eq(aiGenerations.userId, userId),
          eq(aiGenerations.type, "thread"),
          gte(aiGenerations.createdAt, thirtyDaysAgo)
        )
      );
    // totalImpressions would come from tweet analytics — return null until
    // the analytics table exposes a per-user impressions aggregate
    stats = { threadsCreated: Number(threadsRow?.count ?? 0), totalImpressions: null };
  } catch {
    // graceful degradation — stats query is best-effort
  }
  const payload = buildPlanLimitPayload(result, stats);
  // eslint-disable-next-line no-restricted-syntax
  return new Response(JSON.stringify(payload), {
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
  return (await getPlanContext(userId)).effectivePlan;
}

// ─── Feature-tool gate factory ─────────────────────────────────────────────────
// All Pro/Agency feature flags follow the same pattern. The factory checks
// enabledTools.includes(toolKey) instead of individual boolean fields.

function makeFeatureGate(
  feature: GatedFeature,
  toolKey: ToolKey,
  message: string,
  suggestedPlan: PlanType = "pro_monthly"
): (userId: string) => Promise<PlanGateResult> {
  return async function checkDetailed(userId: string): Promise<PlanGateResult> {
    const context = await getPlanContext(userId);
    const limits = getPlanLimits(context.effectivePlan);
    if (limits.enabledTools.includes(toolKey)) return { allowed: true };
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
  const accountsCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(xAccounts)
    .where(eq(xAccounts.userId, userId));
  const used = Number(accountsCount[0]?.count ?? 0);

  if (used + increment <= limits.maxXAccounts) return { allowed: true };

  return buildFailure({
    error: "upgrade_required",
    feature: "x_accounts",
    message: "Connect more X accounts to manage multiple brands — available on Pro",
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

export async function checkInstagramAccountLimitDetailed(
  userId: string,
  increment = 1
): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  const limits = getPlanLimits(context.effectivePlan);
  const accountsCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(instagramAccounts)
    .where(eq(instagramAccounts.userId, userId));
  const used = Number(accountsCount[0]?.count ?? 0);

  if (used + increment <= limits.maxInstagramAccounts) return { allowed: true };

  return buildFailure({
    error: "upgrade_required",
    feature: "instagram_accounts",
    message: "Connect Instagram accounts to cross-post — available on Pro",
    plan: context.plan,
    limit: Number.isFinite(limits.maxInstagramAccounts) ? limits.maxInstagramAccounts : null,
    used,
    suggestedPlan: "pro_monthly",
    trialActive: context.isTrialActive,
    resetAt: null,
  });
}

export async function checkLinkedinAccountLimitDetailed(
  userId: string,
  increment = 1
): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  const limits = getPlanLimits(context.effectivePlan);
  const accountsCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(linkedinAccounts)
    .where(eq(linkedinAccounts.userId, userId));
  const used = Number(accountsCount[0]?.count ?? 0);

  if (used + increment <= limits.maxLinkedinAccounts) return { allowed: true };

  return buildFailure({
    error: "upgrade_required",
    feature: "linkedin_accounts",
    message:
      "Connect more LinkedIn accounts to manage multiple company pages — available on Agency",
    plan: context.plan,
    limit: Number.isFinite(limits.maxLinkedinAccounts) ? limits.maxLinkedinAccounts : null,
    used,
    suggestedPlan: "agency",
    trialActive: context.isTrialActive,
    resetAt: null,
  });
}

export async function checkTeamMemberLimitDetailed(userId: string): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  const limits = getPlanLimits(context.effectivePlan);

  if (limits.maxTeamMembers === null) {
    return buildFailure({
      error: "upgrade_required",
      feature: "team_members",
      message: "Team members are only available on the Agency plan.",
      plan: context.plan,
      limit: null,
      used: 0,
      suggestedPlan: "agency",
      trialActive: context.isTrialActive,
      resetAt: null,
    });
  }

  const membersCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, userId));

  const invitesCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(teamInvitations)
    .where(and(eq(teamInvitations.teamId, userId), eq(teamInvitations.status, "pending")));

  const used = Number(membersCount[0]?.count ?? 0) + Number(invitesCount[0]?.count ?? 0);

  if (used < limits.maxTeamMembers) return { allowed: true };

  return buildFailure({
    error: "upgrade_required",
    feature: "team_members",
    message: `You have reached the maximum of ${limits.maxTeamMembers} team members. Upgrade to add more.`,
    plan: context.plan,
    limit: limits.maxTeamMembers,
    used,
    suggestedPlan: "agency",
    trialActive: context.isTrialActive,
    resetAt: null,
  });
}

export async function checkScheduleHorizonDetailed(
  userId: string,
  scheduledAt: Date
): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  const limits = getPlanLimits(context.effectivePlan);
  if (!Number.isFinite(limits.maxScheduleHorizonDays)) return { allowed: true };

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + limits.maxScheduleHorizonDays);

  if (scheduledAt <= maxDate) return { allowed: true };

  return buildFailure({
    error: "upgrade_required",
    feature: "schedule_horizon",
    message: `Schedule up to ${limits.maxScheduleHorizonDays} days ahead — upgrade to Pro for 90-day scheduling.`,
    plan: context.plan,
    limit: limits.maxScheduleHorizonDays,
    used: Math.ceil((scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    suggestedPlan: "pro_monthly",
    trialActive: context.isTrialActive,
    resetAt: null,
  });
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
    message: "Scale your content output with more scheduled posts — available on Pro",
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
    message: "Unlock AI-powered content creation to grow your audience — available on Pro",
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
  if (limits.aiGenerationsPerMonth === -1) return { allowed: true };

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
    message: "Need more AI generations? Upgrade to Pro for unlimited creative power.",
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
    message: "Export detailed analytics to track your growth and prove ROI — available on Pro",
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
    message: `You've saved ${limits.maxInspirationBookmarks} inspirations — upgrade to Pro for unlimited bookmarks.`,
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
  "viral_score",
  "Predict your tweet's viral potential before posting — available on Pro"
);

export const checkBestTimesAccessDetailed = makeFeatureGate(
  "best_times",
  "best_times",
  "Schedule when your audience is most engaged — available on Pro"
);

export const checkVoiceProfileAccessDetailed = makeFeatureGate(
  "voice_profile",
  "voice_profile",
  "Let AI learn your unique writing style for authentic content — available on Pro"
);

export const checkLinkedinAccessDetailed = makeFeatureGate(
  "linkedin_access",
  "linkedin",
  "Manage LinkedIn alongside X from one dashboard — available on Agency",
  "agency"
);

export const checkContentCalendarAccessDetailed = makeFeatureGate(
  "content_calendar",
  "content_calendar",
  "Plan a month of content in seconds with AI Calendar — available on Pro"
);

export const checkUrlToThreadAccessDetailed = makeFeatureGate(
  "url_to_thread",
  "url_to_thread",
  "Turn any article into a compelling thread — available on Pro"
);

export const checkPdfToThreadAccessDetailed = makeFeatureGate(
  "pdf_to_thread",
  "pdf_to_thread",
  "Convert PDFs into compelling threads — available on Pro"
);

export const checkYoutubeToThreadAccessDetailed = makeFeatureGate(
  "youtube_to_thread",
  "youtube_to_thread",
  "Turn YouTube videos into X threads — available on Pro"
);

export async function checkYoutubeToThreadMonthlyDetailed(userId: string): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  const limits = getPlanLimits(context.effectivePlan);
  if (limits.youtubeToThreadMonthly === Infinity) return { allowed: true };

  const { start, end } = getMonthWindow();
  const ytCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.userId, userId),
        eq(aiGenerations.type, "youtube_to_thread"),
        gte(aiGenerations.createdAt, start)
      )
    );
  const used = Number(ytCount[0]?.count ?? 0);

  if (used < limits.youtubeToThreadMonthly) return { allowed: true };

  return buildFailure({
    error: "quota_exceeded",
    feature: "youtube_to_thread",
    message:
      "You've reached your monthly YouTube-to-Thread limit. Upgrade to Pro Annual or Agency for more.",
    plan: context.plan,
    limit: Number.isFinite(limits.youtubeToThreadMonthly) ? limits.youtubeToThreadMonthly : null,
    used,
    suggestedPlan: "pro_annual",
    trialActive: context.isTrialActive,
    resetAt: end,
  });
}

export async function checkYoutubeVideoDurationDetailed(
  userId: string,
  durationSeconds: number
): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  const limits = getPlanLimits(context.effectivePlan);

  // free/trial have maxYoutubeVideoDurationSeconds === 0; they are blocked upstream by the
  // feature access gate (youtube_to_thread). No need to surface a duration error here.
  if (limits.maxYoutubeVideoDurationSeconds === 0) return { allowed: true };

  if (durationSeconds <= limits.maxYoutubeVideoDurationSeconds) return { allowed: true };

  const maxMinutes = Math.floor(limits.maxYoutubeVideoDurationSeconds / 60);
  const isAlreadyMax = context.effectivePlan === "agency";

  return buildFailure({
    error: "upgrade_required",
    feature: "youtube_duration",
    message: isAlreadyMax
      ? `Videos cannot exceed ${maxMinutes} minutes. Please shorten your video and try again.`
      : `Videos longer than ${maxMinutes} minutes require an Agency plan.`,
    plan: context.plan,
    limit: limits.maxYoutubeVideoDurationSeconds,
    used: durationSeconds,
    ...(!isAlreadyMax && { suggestedPlan: "agency" as const }),
    trialActive: context.isTrialActive,
    resetAt: null,
  });
}

export const checkVariantGeneratorAccessDetailed = makeFeatureGate(
  "variant_generator",
  "variant_generator",
  "Test multiple versions of your tweet to find what resonates — available on Pro"
);

export const checkCompetitorAnalyzerAccessDetailed = makeFeatureGate(
  "competitor_analyzer",
  "competitor_analyzer",
  "See what's working for your competitors and adapt — available on Pro"
);

export const checkReplyGeneratorAccessDetailed = makeFeatureGate(
  "reply_generator",
  "reply_generator",
  "Never miss an engagement opportunity with smart reply suggestions — available on Pro"
);

export const checkBioOptimizerAccessDetailed = makeFeatureGate(
  "bio_optimizer",
  "bio_optimizer",
  "Craft a bio that converts visitors into followers — available on Pro"
);

export const checkInspirationAccessDetailed = makeFeatureGate(
  "inspiration",
  "inspiration",
  "Inspiration is not available on your current plan."
);

export const checkAgenticPostingAccessDetailed = makeFeatureGate(
  "agentic_posting",
  "agentic_posting",
  "Let AI research, write, and optimize a complete thread automatically — available on Pro"
);

export const checkAffiliateGeneratorAccessDetailed = makeFeatureGate(
  "affiliate_generator",
  "affiliate_generator",
  "Turn any product link into a high-converting tweet — available on Pro"
);

export const checkToolsAccessDetailed = makeFeatureGate(
  "tools",
  "tools",
  "AI writing tools help you craft better hooks, CTAs, and rewrites — available on Pro"
);

export const checkThreadAccessDetailed = makeFeatureGate(
  "thread_access",
  "schedule_threads",
  "Schedule multi-tweet threads to tell longer stories — available on Pro"
);

export const checkVideoUploadAccessDetailed = makeFeatureGate(
  "video_upload",
  "upload_video_gif",
  "Upload video and GIF content for richer engagement — available on Pro"
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
    message: `Generate high-quality images with ${model} for eye-catching posts — available on Pro`,
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
export async function checkAiImageQuotaDetailed(
  userId: string,
  model?: ImageModel
): Promise<PlanGateResult> {
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

  // Weight by model cost: pro models consume more quota credits per generation.
  // When no model is passed, assume cost = 1 for backward compatibility.
  const weight = model ? IMAGE_MODEL_COST[model] : 1;

  if (used + weight <= limits.aiImagesPerMonth) return { allowed: true };

  return buildFailure({
    error: "quota_exceeded",
    feature: "ai_quota",
    message:
      "Create more AI images this month to keep your feed visually engaging — upgrade to Pro",
    plan: context.plan,
    limit: limits.aiImagesPerMonth,
    used,
    suggestedPlan: "pro_monthly",
    trialActive: context.isTrialActive,
    resetAt: end,
  });
}
