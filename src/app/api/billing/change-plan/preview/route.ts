import { headers } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizePlan, type PlanType, type ToolKey } from "@/lib/plan-limits";
import {
  getMonthlyPrice,
  getAnnualPrice,
  formatPriceWithInterval,
  formatPrice,
  type PricingTier,
} from "@/lib/pricing";
import { posts, user, xAccounts } from "@/lib/schema";
import { getPlanMetadata } from "@/lib/services/plan-metadata";

const CHANGE_PLAN_OPTIONS = [
  "free",
  "pro_monthly",
  "pro_annual",
  "agency_monthly",
  "agency_annual",
] as const;
const changePlanSchema = z.object({
  plan: z.enum(CHANGE_PLAN_OPTIONS),
});

interface PreviewResponse {
  currentPlan: string;
  targetPlan: string;
  effectiveDate: string;
  proratedCredit: string | null;
  newMonthlyPrice: string | null;
  featuresLost: string[];
  featuresGained: string[];
  overLimits: {
    xAccounts?: { current: number; newLimit: number; action: string };
    scheduledPosts?: { current: number; newLimit: number; action: string };
  };
}

/**
 * Preview endpoint for plan changes.
 * Shows what will change before the user confirms.
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  const json = await req.json();
  const result = changePlanSchema.safeParse(json);
  if (!result.success) {
    return ApiError.badRequest(result.error.issues);
  }

  const { plan: targetPlan } = result.data;

  // Get current user plan
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { plan: true, stripeCustomerId: true },
  });

  if (!dbUser) {
    return ApiError.unauthorized();
  }

  const currentPlan = normalizePlan(dbUser.plan);

  // Free users can't use change-plan - they need checkout
  if (currentPlan === "free" && targetPlan !== "free") {
    return ApiError.conflict("Please use the checkout flow to start a subscription.");
  }

  // Normalize plan names for limit lookups
  // agency_monthly/agency_annual both map to "agency" in PLAN_LIMITS
  const normalizedForLimits = (plan: string): PlanType => {
    if (plan.startsWith("agency")) return "agency";
    return normalizePlan(plan);
  };

  const currentLimits = getPlanMetadata(normalizedForLimits(currentPlan));
  const targetLimits = getPlanMetadata(normalizedForLimits(targetPlan));

  // ── Count current usage ──────────────────────────────────────────────────────

  // Active X accounts
  const [accountsCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(xAccounts)
    .where(and(eq(xAccounts.userId, session.user.id), eq(xAccounts.isActive, true)));

  // Scheduled posts (non-draft)
  const [postsCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(and(eq(posts.userId, session.user.id), eq(posts.status, "scheduled")));

  // ── Compute feature differences ───────────────────────────────────────────────

  const featuresLost: string[] = [];
  const featuresGained: string[] = [];
  const overLimits: PreviewResponse["overLimits"] = {};

  // Feature tools (checked via enabledTools)
  const featureLabels: Record<string, string> = {
    schedule_threads: "Thread Scheduling",
    upload_video_gif: "Video/GIF Upload",
    affiliate_generator: "Amazon Affiliate Generator",
    viral_score: "AI Viral Score",
    best_times: "Best Times to Post",
    voice_profile: "AI Voice Profile",
    linkedin: "LinkedIn Integration",
    inspiration: "Tweet Inspiration",
    content_calendar: "AI Content Calendar",
    url_to_thread: "URL → Thread Converter",
    variant_generator: "A/B Variant Generator",
    competitor_analyzer: "Competitor Analyzer",
    reply_generator: "Reply Suggester",
    bio_optimizer: "AI Bio Optimizer",
    agentic_posting: "Agentic Posting",
    tools: "AI Writing Tools",
    pdf_to_thread: "PDF → Thread",
    youtube_to_thread: "YouTube → Thread",
  };

  for (const [toolKey, label] of Object.entries(featureLabels)) {
    const currentValue = currentLimits.enabledTools.includes(toolKey as ToolKey);
    const targetValue = targetLimits.enabledTools.includes(toolKey as ToolKey);
    if (currentValue && !targetValue) {
      featuresLost.push(label);
    } else if (!currentValue && targetValue) {
      featuresGained.push(label);
    }
  }

  // Numeric limits
  if (currentLimits.aiGenerationsPerMonth === -1 && targetLimits.aiGenerationsPerMonth !== -1) {
    featuresLost.push(`Unlimited AI Generations (→ ${targetLimits.aiGenerationsPerMonth}/month)`);
  } else if (
    currentLimits.aiGenerationsPerMonth !== -1 &&
    targetLimits.aiGenerationsPerMonth === -1
  ) {
    featuresGained.push("Unlimited AI Generations");
  }

  if (currentLimits.aiImagesPerMonth === -1 && targetLimits.aiImagesPerMonth !== -1) {
    featuresLost.push(`Unlimited AI Images (→ ${targetLimits.aiImagesPerMonth}/month)`);
  } else if (currentLimits.aiImagesPerMonth !== -1 && targetLimits.aiImagesPerMonth === -1) {
    featuresGained.push("Unlimited AI Images");
  }

  if (currentLimits.maxXAccounts > targetLimits.maxXAccounts) {
    featuresLost.push(`${currentLimits.maxXAccounts} X Accounts (→ ${targetLimits.maxXAccounts})`);
  } else if (currentLimits.maxXAccounts < targetLimits.maxXAccounts) {
    featuresGained.push(
      `${targetLimits.maxXAccounts} X Accounts (was ${currentLimits.maxXAccounts})`
    );
  }

  if (currentLimits.analyticsRetentionDays !== targetLimits.analyticsRetentionDays) {
    if (currentLimits.analyticsRetentionDays > targetLimits.analyticsRetentionDays) {
      featuresLost.push(
        `${currentLimits.analyticsRetentionDays}-day Analytics Retention (→ ${targetLimits.analyticsRetentionDays} days)`
      );
    } else {
      featuresGained.push(`${targetLimits.analyticsRetentionDays}-day Analytics Retention`);
    }
  }

  if (currentLimits.analyticsExport !== targetLimits.analyticsExport) {
    if (currentLimits.analyticsExport === "white_label_pdf") {
      featuresLost.push("White-label PDF Export");
    } else if (targetLimits.analyticsExport === "white_label_pdf") {
      featuresGained.push("White-label PDF Export");
    }
  }

  // ── Check for over-limits ─────────────────────────────────────────────────────

  const activeAccounts = accountsCount?.count ?? 0;
  if (activeAccounts > targetLimits.maxXAccounts) {
    overLimits.xAccounts = {
      current: activeAccounts,
      newLimit: targetLimits.maxXAccounts,
      action: `You'll need to deactivate ${activeAccounts - targetLimits.maxXAccounts} account${activeAccounts - targetLimits.maxXAccounts > 1 ? "s" : ""} in Settings.`,
    };
  }

  const scheduledPosts = postsCount?.count ?? 0;
  if (targetLimits.postsPerMonth !== Infinity && scheduledPosts > targetLimits.postsPerMonth) {
    overLimits.scheduledPosts = {
      current: scheduledPosts,
      newLimit: targetLimits.postsPerMonth,
      action: `Excess scheduled posts will be moved to Drafts.`,
    };
  }

  // ── Determine effective date ───────────────────────────────────────────────────

  const effectiveDate =
    targetPlan === "free"
      ? "End of current billing period"
      : currentPlan === "free"
        ? "Immediate"
        : "Immediate";

  // ── Price info ───────────────────────────────────────────────────────────────────

  let newMonthlyPrice: string | null = null;
  if (targetPlan !== "free") {
    const tier = targetPlan as PricingTier;
    if (targetPlan.endsWith("_annual")) {
      const annual = getAnnualPrice(tier);
      if (annual !== undefined) {
        newMonthlyPrice = `${formatPriceWithInterval(annual, "year")} (~${formatPrice(getMonthlyPrice(tier))}/mo)`;
      }
    } else {
      newMonthlyPrice = formatPriceWithInterval(getMonthlyPrice(tier), "month");
    }
  }

  return Response.json({
    currentPlan: currentPlan,
    targetPlan: targetPlan.startsWith("agency") ? "agency" : targetPlan,
    effectiveDate,
    proratedCredit: null, // Only available after actual change
    newMonthlyPrice,
    featuresLost,
    featuresGained,
    overLimits,
  });
}
