export type SubscriberPlan = "free" | "pro_monthly" | "pro_annual" | "agency";
export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "trialing";

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
    x: Array<{ id: string; xUsername: string; xDisplayName: string | null; xAvatarUrl: string | null; followersCount: number | null; isDefault: boolean | null }>;
    linkedin: Array<{ id: string; linkedinName: string; linkedinAvatarUrl: string | null }>;
    instagram: Array<{ id: string; instagramUsername: string; instagramAvatarUrl: string | null }>;
  };
  usage: {
    totalPosts: number;
    publishedPosts: number;
    drafts: number;
    aiGenerationsThisMonth: number;
  };
  recentSessions: Array<{
    id: string;
    createdAt: string;
    ipAddress: string | null;
    userAgent: string | null;
    expiresAt: string;
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
