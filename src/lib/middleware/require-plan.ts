import { and, eq, gte, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getPlanLimits, normalizePlan, type PlanType } from "@/lib/plan-limits";
import { aiGenerations, posts, user, xAccounts } from "@/lib/schema";

export type GatedFeature = "ai_writer" | "ai_quota" | "scheduled_posts" | "x_accounts" | "analytics_export" | "viral_score" | "best_times" | "voice_profile" | "linkedin_access";
export type PlanErrorCode = "upgrade_required" | "quota_exceeded";

interface PlanContext {
  plan: PlanType;
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

function getMonthWindow() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const next = new Date(start);
  next.setMonth(start.getMonth() + 1);
  return { start, next };
}

function getSuggestedPlan(currentPlan: PlanType, feature: GatedFeature): PlanType {
  if (feature === "x_accounts" && (currentPlan === "pro_monthly" || currentPlan === "pro_annual")) {
    return "agency";
  }

  if (feature === "ai_quota" && (currentPlan === "pro_monthly" || currentPlan === "pro_annual")) {
    return "agency";
  }

  if (feature === "analytics_export" && (currentPlan === "pro_monthly" || currentPlan === "pro_annual")) {
    return "agency";
  }

  if (feature === "viral_score" && currentPlan === "free") {
    return "pro_monthly";
  }

  if (feature === "best_times" && currentPlan === "free") {
    return "pro_monthly";
  }

  if (feature === "voice_profile" && currentPlan === "free") {
    return "pro_monthly";
  }

  if (feature === "linkedin_access" && currentPlan !== "agency") {
    return "agency";
  }

  return "pro_monthly";
}

async function getPlanContext(userId: string): Promise<PlanContext> {
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { plan: true, trialEndsAt: true, createdAt: true },
  });

  const plan = normalizePlan(dbUser?.plan);
  let trialEndsAt = dbUser?.trialEndsAt ?? null;

  if (plan === "free" && !trialEndsAt && dbUser?.createdAt) {
    const inferredTrialEndsAt = new Date(dbUser.createdAt);
    inferredTrialEndsAt.setDate(inferredTrialEndsAt.getDate() + 14);
    trialEndsAt = inferredTrialEndsAt;

    await db
      .update(user)
      .set({ trialEndsAt: inferredTrialEndsAt })
      .where(and(eq(user.id, userId), isNull(user.trialEndsAt)));
  }

  const isTrialActive = plan === "free" && !!trialEndsAt && new Date() < trialEndsAt;

  return { plan, trialEndsAt, isTrialActive };
}

function buildFailure(params: Omit<PlanGateFailure, "allowed">): PlanGateFailure {
  return {
    allowed: false,
    ...params,
  };
}

export function buildPlanLimitPayload(result: PlanGateFailure) {
  const remaining = typeof result.limit === "number" ? Math.max(0, result.limit - result.used) : null;

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
  return new Response(JSON.stringify(buildPlanLimitPayload(result)), {
    status: 402,
    headers: { "Content-Type": "application/json" },
  });
}

export async function checkAccountLimitDetailed(userId: string, increment = 1): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  if (context.isTrialActive) {
    return { allowed: true };
  }

  const limits = getPlanLimits(context.plan);
  if (limits.maxXAccounts === Infinity) {
    return { allowed: true };
  }

  const accountsCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(xAccounts)
    .where(and(eq(xAccounts.userId, userId), eq(xAccounts.isActive, true)));
  const used = Number(accountsCount[0]?.count ?? 0);

  if (used + increment <= limits.maxXAccounts) {
    return { allowed: true };
  }

  return buildFailure({
    error: "upgrade_required",
    feature: "x_accounts",
    message: "Your current plan has reached the connected X accounts limit.",
    plan: context.plan,
    limit: Number.isFinite(limits.maxXAccounts) ? limits.maxXAccounts : null,
    used,
    suggestedPlan: getSuggestedPlan(context.plan, "x_accounts"),
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
  if (context.isTrialActive) {
    return { allowed: true };
  }

  const limits = getPlanLimits(context.plan);
  if (limits.postsPerMonth === Infinity) {
    return { allowed: true };
  }

  const { start, next } = getMonthWindow();
  const postCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(and(eq(posts.userId, userId), ne(posts.status, "draft"), gte(posts.createdAt, start)));
  const used = Number(postCount[0]?.count ?? 0);

  if (used + count <= limits.postsPerMonth) {
    return { allowed: true };
  }

  return buildFailure({
    error: "upgrade_required",
    feature: "scheduled_posts",
    message: "You have reached your monthly scheduled posts limit for this plan.",
    plan: context.plan,
    limit: Number.isFinite(limits.postsPerMonth) ? limits.postsPerMonth : null,
    used,
    suggestedPlan: getSuggestedPlan(context.plan, "scheduled_posts"),
    trialActive: context.isTrialActive,
    resetAt: next,
  });
}

export async function checkPostLimit(userId: string, count: number = 1) {
  const result = await checkPostLimitDetailed(userId, count);
  return result.allowed;
}

export async function checkAiLimitDetailed(userId: string): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  if (context.isTrialActive) {
    return { allowed: true };
  }

  const limits = getPlanLimits(context.plan);
  if (limits.canUseAi) {
    return { allowed: true };
  }

  return buildFailure({
    error: "upgrade_required",
    feature: "ai_writer",
    message: "AI tools are not available on your current plan.",
    plan: context.plan,
    limit: Number.isFinite(limits.aiGenerationsPerMonth) ? limits.aiGenerationsPerMonth : null,
    used: 0,
    suggestedPlan: getSuggestedPlan(context.plan, "ai_writer"),
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
  if (context.isTrialActive) {
    return { allowed: true };
  }

  const limits = getPlanLimits(context.plan);
  if (limits.aiGenerationsPerMonth === Infinity) {
    return { allowed: true };
  }

  const { start, next } = getMonthWindow();
  const aiCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiGenerations)
    .where(and(eq(aiGenerations.userId, userId), gte(aiGenerations.createdAt, start)));
  const used = Number(aiCount[0]?.count ?? 0);

  if (used < limits.aiGenerationsPerMonth) {
    return { allowed: true };
  }

  return buildFailure({
    error: "quota_exceeded",
    feature: "ai_quota",
    message: "You have reached your monthly AI generation quota.",
    plan: context.plan,
    limit: Number.isFinite(limits.aiGenerationsPerMonth) ? limits.aiGenerationsPerMonth : null,
    used,
    suggestedPlan: getSuggestedPlan(context.plan, "ai_quota"),
    trialActive: context.isTrialActive,
    resetAt: next,
  });
}

export async function checkAnalyticsExportLimitDetailed(userId: string): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  if (context.isTrialActive) {
    return { allowed: true };
  }

  const limits = getPlanLimits(context.plan);
  if (limits.analyticsExport !== "none") {
    return { allowed: true };
  }

  return buildFailure({
    error: "upgrade_required",
    feature: "analytics_export",
    message: "Analytics export is not available on your current plan.",
    plan: context.plan,
    limit: 0,
    used: 1,
    suggestedPlan: getSuggestedPlan(context.plan, "analytics_export"),
    trialActive: context.isTrialActive,
    resetAt: null,
  });
}

export async function checkViralScoreAccessDetailed(userId: string): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  if (context.isTrialActive) {
    return { allowed: true };
  }

  const limits = getPlanLimits(context.plan);
  if (limits.canUseViralScore) {
    return { allowed: true };
  }

  return buildFailure({
    error: "upgrade_required",
    feature: "viral_score",
    message: "AI Viral Score is a Pro feature.",
    plan: context.plan,
    limit: 0,
    used: 1,
    suggestedPlan: getSuggestedPlan(context.plan, "viral_score"),
    trialActive: context.isTrialActive,
    resetAt: null,
  });
}

export async function checkBestTimesAccessDetailed(userId: string): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  if (context.isTrialActive) {
    return { allowed: true };
  }

  const limits = getPlanLimits(context.plan);
  if (limits.canViewBestTimes) {
    return { allowed: true };
  }

  return buildFailure({
    error: "upgrade_required",
    feature: "best_times",
    message: "Best Times to Post is a Pro feature.",
    plan: context.plan,
    limit: 0,
    used: 1,
    suggestedPlan: getSuggestedPlan(context.plan, "best_times"),
    trialActive: context.isTrialActive,
    resetAt: null,
  });
}

export async function checkVoiceProfileAccessDetailed(userId: string): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  if (context.isTrialActive) {
    return { allowed: true };
  }

  const limits = getPlanLimits(context.plan);
  if (limits.canUseVoiceProfile) {
    return { allowed: true };
  }

  return buildFailure({
    error: "upgrade_required",
    feature: "voice_profile",
    message: "AI Voice Profile is a Pro feature.",
    plan: context.plan,
    limit: 0,
    used: 1,
    suggestedPlan: getSuggestedPlan(context.plan, "voice_profile"),
    trialActive: context.isTrialActive,
    resetAt: null,
  });
}

export async function checkLinkedinAccessDetailed(userId: string): Promise<PlanGateResult> {
  const context = await getPlanContext(userId);
  if (context.isTrialActive) {
    return { allowed: true };
  }

  const limits = getPlanLimits(context.plan);
  if (limits.canUseLinkedin) {
    return { allowed: true };
  }

  return buildFailure({
    error: "upgrade_required",
    feature: "linkedin_access",
    message: "LinkedIn integration is an Agency plan feature.",
    plan: context.plan,
    limit: 0,
    used: 1,
    suggestedPlan: getSuggestedPlan(context.plan, "linkedin_access"),
    trialActive: context.isTrialActive,
    resetAt: null,
  });
}
