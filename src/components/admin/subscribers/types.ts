export type SubscriberPlan = "free" | "pro_monthly" | "pro_annual" | "agency";
export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "trialing";
export type ActivityType = "post" | "ai_generation" | "plan_change";

export interface SubscriberRow {
  id: string;
  name: string;
  email: string;
  image: string | null;
  plan: SubscriberPlan | null;
  isAdmin: boolean | null;
  isSuspended: boolean | null;
  bannedAt: string | null;
  deletedAt: string | null;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  createdAt: string;
  connectedPlatforms: number;
  subscriptionStatus: SubscriptionStatus | null;
}

export interface SubscriberDetail {
  subscriber: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    plan: SubscriberPlan | null;
    isAdmin: boolean | null;
    isSuspended: boolean | null;
    bannedAt: string | null;
    deletedAt: string | null;
    trialEndsAt: string | null;
    stripeCustomerId: string | null;
    referralCode: string | null;
    timezone: string | null;
    language: string | null;
    createdAt: string;
    updatedAt: string;
  };
  subscription: {
    id: string;
    plan: SubscriberPlan | null;
    status: SubscriptionStatus | null;
    stripeSubscriptionId: string;
    stripePriceId: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean | null;
    cancelledAt: string | null;
    createdAt: string;
  } | null;
  connectedAccounts: {
    x: Array<{
      id: string;
      xUsername: string;
      xDisplayName: string | null;
      xAvatarUrl: string | null;
      followersCount: number | null;
      isDefault: boolean | null;
      tokenExpiry: string | null;
      isHealthy: boolean | null;
    }>;
    linkedin: Array<{
      id: string;
      linkedinName: string;
      linkedinAvatarUrl: string | null;
      tokenExpiry: string | null;
      isHealthy: boolean | null;
    }>;
    instagram: Array<{
      id: string;
      instagramUsername: string;
      instagramAvatarUrl: string | null;
      tokenExpiry: string | null;
      isHealthy: boolean | null;
    }>;
  };
  usage: {
    totalPosts: number;
    publishedPosts: number;
    drafts: number;
    aiGenerationsThisMonth: number;
    imageGenerationsThisMonth: number;
  };
  recentSessions: Array<{
    id: string;
    createdAt: string;
    ipAddress: string | null;
    userAgent: string | null;
    expiresAt: string;
  }>;
  aiQuota?: {
    used: number;
    limit: number | "unlimited";
    percentage: number;
  };
  imageQuota?: {
    used: number;
    limit: number | "unlimited";
    percentage: number;
  };
  referrals?: {
    referredUsers: Array<{
      id: string;
      name: string | null;
      email: string;
      createdAt: string;
    }>;
    creditsEarned: number;
    totalCount: number;
  };
  teamMemberships?: Array<{
    id: string;
    role: string;
    joinedAt: string;
    team: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
  recentActivity?: Array<{
    type: ActivityType;
    id: string;
    createdAt: string;
    status?: string;
    prompt?: string;
    oldPlan?: string;
    newPlan?: string;
    reason?: string;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
