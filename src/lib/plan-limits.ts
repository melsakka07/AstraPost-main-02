export type AnalyticsExportCapability = "none" | "csv_pdf" | "white_label_pdf";

export type ImageModel = "nano-banana-2" | "nano-banana-pro" | "nano-banana" | "gpt-image-2";

/** Feature tool keys — used by enabledTools[] to replace 18 canUseXyz booleans. */
export type ToolKey =
  | "schedule_threads"
  | "upload_video_gif"
  | "affiliate_generator"
  | "viral_score"
  | "best_times"
  | "voice_profile"
  | "linkedin"
  | "inspiration"
  | "content_calendar"
  | "url_to_thread"
  | "variant_generator"
  | "competitor_analyzer"
  | "reply_generator"
  | "bio_optimizer"
  | "agentic_posting"
  | "tools"
  | "pdf_to_thread"
  | "youtube_to_thread";

export interface PlanLimits {
  postsPerMonth: number;
  aiGenerationsPerMonth: number;
  aiImagesPerMonth: number;
  availableImageModels: ImageModel[];
  maxXAccounts: number;
  maxInstagramAccounts: number;
  maxLinkedinAccounts: number;
  maxScheduleHorizonDays: number;
  canUseAi: boolean;
  enabledTools: ToolKey[];
  analyticsRetentionDays: number;
  analyticsExport: AnalyticsExportCapability;
  maxTeamMembers: number | null;
  maxInspirationBookmarks: number;
  youtubeToThreadMonthly: number;
  maxYoutubeVideoDurationSeconds: number;
}

export type PlanType = "free" | "trial" | "pro_monthly" | "pro_annual" | "agency";

const PRO_TOOLS: ToolKey[] = [
  "schedule_threads",
  "upload_video_gif",
  "affiliate_generator",
  "viral_score",
  "best_times",
  "voice_profile",
  "inspiration",
  "content_calendar",
  "url_to_thread",
  "variant_generator",
  "competitor_analyzer",
  "reply_generator",
  "bio_optimizer",
  "agentic_posting",
  "tools",
  "pdf_to_thread",
  "youtube_to_thread",
];

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    postsPerMonth: 20,
    aiGenerationsPerMonth: 20,
    aiImagesPerMonth: 10,
    availableImageModels: ["nano-banana-2", "nano-banana"],
    maxXAccounts: 1,
    maxInstagramAccounts: 0,
    maxLinkedinAccounts: 0,
    maxScheduleHorizonDays: 7,
    canUseAi: true,
    enabledTools: ["inspiration"],
    analyticsRetentionDays: 7,
    analyticsExport: "none",
    maxTeamMembers: null,
    maxInspirationBookmarks: 5,
    youtubeToThreadMonthly: 0,
    maxYoutubeVideoDurationSeconds: 0,
  },
  // Trial users get full Pro feature access for 14 days with capped quotas
  trial: {
    postsPerMonth: 20, // trial-specific quota
    aiGenerationsPerMonth: 50, // trial-specific quota
    aiImagesPerMonth: 25, // trial-specific quota
    availableImageModels: ["nano-banana-2", "nano-banana"], // trial image models (base only)
    maxXAccounts: 1, // trial-specific limit
    maxInstagramAccounts: 0,
    maxLinkedinAccounts: 0,
    maxScheduleHorizonDays: 7,
    canUseAi: true,
    enabledTools: PRO_TOOLS,
    analyticsRetentionDays: 90,
    analyticsExport: "csv_pdf",
    maxTeamMembers: null,
    maxInspirationBookmarks: -1, // unlimited bookmarks during trial
    youtubeToThreadMonthly: 30, // match pro_monthly
    maxYoutubeVideoDurationSeconds: 1200, // match pro_monthly (20 min)
  },
  pro_monthly: {
    postsPerMonth: Infinity,
    aiGenerationsPerMonth: 150,
    aiImagesPerMonth: 50,
    availableImageModels: ["nano-banana-2", "nano-banana-pro", "nano-banana", "gpt-image-2"],
    maxXAccounts: 3,
    maxInstagramAccounts: 1,
    maxLinkedinAccounts: 0,
    maxScheduleHorizonDays: 90,
    canUseAi: true,
    enabledTools: PRO_TOOLS,
    analyticsRetentionDays: 90,
    analyticsExport: "csv_pdf",
    maxTeamMembers: null,
    maxInspirationBookmarks: -1, // -1 = unlimited
    youtubeToThreadMonthly: 30,
    maxYoutubeVideoDurationSeconds: 1200,
  },
  pro_annual: {
    postsPerMonth: Infinity,
    aiGenerationsPerMonth: 150,
    aiImagesPerMonth: 50,
    availableImageModels: ["nano-banana-2", "nano-banana-pro", "nano-banana", "gpt-image-2"],
    maxXAccounts: 3,
    maxInstagramAccounts: 1,
    maxLinkedinAccounts: 0,
    maxScheduleHorizonDays: 90,
    canUseAi: true,
    enabledTools: PRO_TOOLS,
    analyticsRetentionDays: 90,
    analyticsExport: "csv_pdf",
    maxTeamMembers: null,
    maxInspirationBookmarks: -1, // -1 = unlimited
    youtubeToThreadMonthly: 30,
    maxYoutubeVideoDurationSeconds: 1200,
  },
  agency: {
    postsPerMonth: Infinity,
    aiGenerationsPerMonth: -1, // -1 = unlimited
    aiImagesPerMonth: -1, // -1 = unlimited
    availableImageModels: ["nano-banana-2", "nano-banana-pro", "nano-banana", "gpt-image-2"],
    maxXAccounts: 10,
    maxInstagramAccounts: 5,
    maxLinkedinAccounts: 5,
    maxScheduleHorizonDays: Infinity,
    canUseAi: true,
    enabledTools: [...PRO_TOOLS, "linkedin"],
    analyticsRetentionDays: 365,
    analyticsExport: "white_label_pdf",
    maxTeamMembers: 5,
    maxInspirationBookmarks: -1, // -1 = unlimited
    youtubeToThreadMonthly: Infinity,
    maxYoutubeVideoDurationSeconds: 5400,
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
