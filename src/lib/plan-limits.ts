export type AnalyticsExportCapability = "none" | "csv_pdf" | "white_label_pdf";

export interface PlanLimits {
  postsPerMonth: number;
  aiGenerationsPerMonth: number;
  maxXAccounts: number;
  canUseAi: boolean;
  canScheduleThreads: boolean;
  canUploadVideoGif: boolean;
  analyticsRetentionDays: number;
  analyticsExport: AnalyticsExportCapability;
  canUseAffiliateGenerator: boolean;
  canUseViralScore: boolean;
  canViewBestTimes: boolean;
  canUseVoiceProfile: boolean;
  maxTeamMembers: number | null;
}

export type PlanType = "free" | "pro_monthly" | "pro_annual" | "agency";

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    postsPerMonth: 10,
    aiGenerationsPerMonth: 5,
    maxXAccounts: 1,
    canUseAi: true,
    canScheduleThreads: false,
    canUploadVideoGif: false,
    analyticsRetentionDays: 7,
    analyticsExport: "none",
    canUseAffiliateGenerator: false,
    canUseViralScore: false,
    canViewBestTimes: false,
    canUseVoiceProfile: false,
    maxTeamMembers: null,
  },
  pro_monthly: {
    postsPerMonth: Infinity,
    aiGenerationsPerMonth: 100,
    maxXAccounts: 3,
    canUseAi: true,
    canScheduleThreads: true,
    canUploadVideoGif: true,
    analyticsRetentionDays: 90,
    analyticsExport: "csv_pdf",
    canUseAffiliateGenerator: true,
    canUseViralScore: true,
    canViewBestTimes: true,
    canUseVoiceProfile: true,
    maxTeamMembers: null,
  },
  pro_annual: {
    postsPerMonth: Infinity,
    aiGenerationsPerMonth: 100,
    maxXAccounts: 3,
    canUseAi: true,
    canScheduleThreads: true,
    canUploadVideoGif: true,
    analyticsRetentionDays: 90,
    analyticsExport: "csv_pdf",
    canUseAffiliateGenerator: true,
    canUseViralScore: true,
    canViewBestTimes: true,
    canUseVoiceProfile: true,
    maxTeamMembers: null,
  },
  agency: {
    postsPerMonth: Infinity,
    aiGenerationsPerMonth: Infinity,
    maxXAccounts: 10,
    canUseAi: true,
    canScheduleThreads: true,
    canUploadVideoGif: true,
    analyticsRetentionDays: 365,
    analyticsExport: "white_label_pdf",
    canUseAffiliateGenerator: true,
    canUseViralScore: true,
    canViewBestTimes: true,
    canUseVoiceProfile: true,
    maxTeamMembers: 5,
  },
};

export function normalizePlan(plan: string | null | undefined): PlanType {
  if (!plan) {
    return "free";
  }

  return plan in PLAN_LIMITS ? (plan as PlanType) : "free";
}

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[normalizePlan(plan)];
}
