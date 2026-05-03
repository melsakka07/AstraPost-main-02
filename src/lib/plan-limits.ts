export type AnalyticsExportCapability = "none" | "csv_pdf" | "white_label_pdf";

export type ImageModel = "nano-banana-2" | "nano-banana-pro" | "nano-banana" | "gpt-image-2";

export interface PlanLimits {
  postsPerMonth: number;
  aiGenerationsPerMonth: number;
  aiImagesPerMonth: number;
  availableImageModels: ImageModel[];
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
  canUseLinkedin: boolean;
  maxTeamMembers: number | null;
  maxInspirationBookmarks: number;
  canUseInspiration: boolean;
  canUseContentCalendar: boolean;
  canUseUrlToThread: boolean;
  canUseVariantGenerator: boolean;
  canUseCompetitorAnalyzer: boolean;
  canUseReplyGenerator: boolean;
  canUseBioOptimizer: boolean;
  canUseAgenticPosting: boolean;
  canUseTools: boolean;
}

export type PlanType = "free" | "trial" | "pro_monthly" | "pro_annual" | "agency";

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    postsPerMonth: 20,
    aiGenerationsPerMonth: 20,
    aiImagesPerMonth: 10,
    availableImageModels: ["nano-banana-2", "nano-banana"],
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
    canUseLinkedin: false,
    maxTeamMembers: null,
    maxInspirationBookmarks: 5,
    canUseInspiration: true,
    canUseContentCalendar: false,
    canUseUrlToThread: false,
    canUseVariantGenerator: false,
    canUseCompetitorAnalyzer: false,
    canUseReplyGenerator: false,
    canUseBioOptimizer: false,
    canUseAgenticPosting: false,
    canUseTools: false,
  },
  trial: {
    postsPerMonth: 20,
    aiGenerationsPerMonth: 50,
    aiImagesPerMonth: 25,
    availableImageModels: ["nano-banana-2", "nano-banana"],
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
    canUseLinkedin: false,
    maxTeamMembers: null,
    maxInspirationBookmarks: 5,
    canUseInspiration: true,
    canUseContentCalendar: false,
    canUseUrlToThread: false,
    canUseVariantGenerator: false,
    canUseCompetitorAnalyzer: false,
    canUseReplyGenerator: false,
    canUseBioOptimizer: false,
    canUseAgenticPosting: false,
    canUseTools: false,
  },
  pro_monthly: {
    postsPerMonth: Infinity,
    aiGenerationsPerMonth: 150,
    aiImagesPerMonth: 50,
    availableImageModels: ["nano-banana-2", "nano-banana-pro", "nano-banana", "gpt-image-2"],
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
    canUseLinkedin: false,
    maxTeamMembers: null,
    maxInspirationBookmarks: -1, // -1 = unlimited
    canUseInspiration: true,
    canUseContentCalendar: true,
    canUseUrlToThread: true,
    canUseVariantGenerator: true,
    canUseCompetitorAnalyzer: true,
    canUseReplyGenerator: true,
    canUseBioOptimizer: true,
    canUseAgenticPosting: true,
    canUseTools: true,
  },
  pro_annual: {
    postsPerMonth: Infinity,
    aiGenerationsPerMonth: 250,
    aiImagesPerMonth: 50,
    availableImageModels: ["nano-banana-2", "nano-banana-pro", "nano-banana", "gpt-image-2"],
    maxXAccounts: 4,
    canUseAi: true,
    canScheduleThreads: true,
    canUploadVideoGif: true,
    analyticsRetentionDays: 90,
    analyticsExport: "csv_pdf",
    canUseAffiliateGenerator: true,
    canUseViralScore: true,
    canViewBestTimes: true,
    canUseVoiceProfile: true,
    canUseLinkedin: false,
    maxTeamMembers: null,
    maxInspirationBookmarks: -1, // -1 = unlimited
    canUseInspiration: true,
    canUseContentCalendar: true,
    canUseUrlToThread: true,
    canUseVariantGenerator: true,
    canUseCompetitorAnalyzer: true,
    canUseReplyGenerator: true,
    canUseBioOptimizer: true,
    canUseAgenticPosting: true,
    canUseTools: true,
  },
  agency: {
    postsPerMonth: Infinity,
    aiGenerationsPerMonth: Infinity,
    aiImagesPerMonth: -1, // -1 = unlimited
    availableImageModels: ["nano-banana-2", "nano-banana-pro", "nano-banana", "gpt-image-2"],
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
    canUseLinkedin: true,
    maxTeamMembers: 5,
    maxInspirationBookmarks: -1, // -1 = unlimited
    canUseInspiration: true,
    canUseContentCalendar: true,
    canUseUrlToThread: true,
    canUseVariantGenerator: true,
    canUseCompetitorAnalyzer: true,
    canUseReplyGenerator: true,
    canUseBioOptimizer: true,
    canUseAgenticPosting: true,
    canUseTools: true,
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

/** During the 14-day free trial, users get elevated trial quotas (50 AI gens, 25 images) */
export const TRIAL_EFFECTIVE_PLAN: PlanType = "trial";

export const IMAGE_MODEL_COST: Record<ImageModel, number> = {
  "nano-banana": 1,
  "nano-banana-2": 1,
  "nano-banana-pro": 3,
  "gpt-image-2": 5,
};
