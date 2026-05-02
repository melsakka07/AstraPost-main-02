import { relations } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  decimal,
  index,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// ── Admin / Billing enums ────────────────────────────────────────────────────
export const discountTypeEnum = pgEnum("discount_type", ["percentage", "fixed"]);

// ── Enums ──────────────────────────────────────────────────────────────────

// ── Existing enums (already in DB) ─────────────────────────────────────────
export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "scheduled",
  "published",
  "failed",
  "cancelled",
  "awaiting_approval",
  "paused_needs_reconnect",
]);

export const planEnum = pgEnum("plan", ["free", "pro_monthly", "pro_annual", "agency"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "cancelled",
  "trialing",
]);

export const jobRunStatusEnum = pgEnum("job_run_status", [
  "running",
  "success",
  "failed",
  "retrying",
]);

// ── New enums (migration required) ─────────────────────────────────────────

/** Platform a post targets. Shared by posts and analytics_refresh_runs. */
export const platformEnum = pgEnum("platform", ["twitter", "linkedin", "instagram"]);

/** Structural type of a post (single tweet vs thread vs platform-native). */
export const postTypeEnum = pgEnum("post_type", [
  "tweet",
  "thread",
  "linkedin_post",
  "instagram_post",
]);

/** Recurrence cadence stored on repeating posts (null = no recurrence). */
export const recurrencePatternEnum = pgEnum("recurrence_pattern", [
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

/** Role a team member holds in a workspace. 'owner' is derived, never stored. */
export const teamRoleEnum = pgEnum("team_role", ["admin", "editor", "viewer"]);

/** Lifecycle state of a team invitation. */
export const invitationStatusEnum = pgEnum("invitation_status", ["pending", "accepted", "expired"]);

/** Admin actions that are tracked in the audit log. */
export const adminAuditActionEnum = pgEnum("admin_audit_action", [
  "ban",
  "unban",
  "delete_user",
  "suspend",
  "unsuspend",
  "impersonate_start",
  "impersonate_end",
  "plan_change",
  "feature_flag_toggle",
  "promo_create",
  "promo_update",
  "promo_delete",
  "announcement_update",
  "subscriber_create",
  "subscriber_update",
  "roadmap_update",
  "bulk_operation",
  "user_update",
  "post_update",
  "webhook_replay",
]);

/** Status of a background analytics refresh run. */
export const analyticsRunStatusEnum = pgEnum("analytics_run_status", [
  "running",
  "success",
  "failed",
]);

/** Lifecycle state of a feedback item. */
export const feedbackStatusEnum = pgEnum("feedback_status", ["pending", "approved", "rejected"]);

/** Category of a feedback submission. */
export const feedbackCategoryEnum = pgEnum("feedback_category", ["feature", "bug", "other"]);

/** Type of an AI generation record. */
export const aiGenerationTypeEnum = pgEnum("ai_generation_type", [
  "thread",
  "image",
  "image_prompt",
  "affiliate",
  "inspiration",
  "inspire",
  "agentic_pipeline",
  "agentic_regenerate",
  "bio_optimizer",
  "content_calendar",
  "tools",
  "hook",
  "cta",
  "rewrite",
  "hashtags",
  "translate",
  "reply_generator",
  "url_to_thread",
  "template",
  "variant_generator",
  "competitor_analyzer",
  "chat",
  "voice_profile",
  "viral_score",
  "agentic_approve",
]);

/** Type of a user-facing notification. */
export const notificationTypeEnum = pgEnum("notification_type", [
  "admin",
  "post_failed",
  "tier_downgrade_warning",
  "token_expiring_soon",
  "billing_checkout_completed",
  "billing_trial_expired",
  "billing_plan_changed",
  "billing_accounts_over_limit",
  "billing_posts_moved_to_draft",
  "billing_cancel_scheduled",
  "billing_reactivated",
  "billing_subscription_cancelled",
  "billing_payment_failed",
  "billing_payment_succeeded",
  "billing_trial_will_end",
  "billing_checkout_expired",
  "billing_grace_period_expired",
  "webhook_processing_failed",
  "referral_credit_earned",
  "referral_trial_extended",
]);

/** Affiliate platform a link targets. */
export const affiliatePlatformEnum = pgEnum("affiliate_platform", [
  "amazon",
  "noon",
  "aliexpress",
  "other",
]);

// IMPORTANT! ID fields should ALWAYS use UUID types, EXCEPT the BetterAuth tables.
// However, to maintain consistency with the existing user table which uses text IDs,
// we will use text for IDs in related tables as well, or ensure type compatibility.

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),

    // AstraPost specific fields
    isAdmin: boolean("is_admin").default(false),
    isSuspended: boolean("is_suspended").default(false),
    timezone: text("timezone").default("Asia/Riyadh"),
    language: text("language").default("ar"), // 'ar' or 'en'
    plan: planEnum("plan").default("free"),
    planExpiresAt: timestamp("plan_expires_at"),
    stripeCustomerId: text("stripe_customer_id"),
    trialEndsAt: timestamp("trial_ends_at"),
    onboardingCompleted: boolean("onboarding_completed").default(false),
    voiceProfile: jsonb("voice_profile"),
    notificationSettings: jsonb("notification_settings"),
    requiresApproval: boolean("requires_approval").default(false), // For Agency plan team workflows

    // Referral System
    referralCode: text("referral_code").unique(),
    referredBy: text("referred_by"), // ID of the user who referred this user
    referralCredits: integer("referral_credits").default(0),
    referralCreditedAt: timestamp("referral_credited_at"),

    // 2FA
    twoFactorEnabled: boolean("two_factor_enabled").default(false),
    twoFactorSecret: text("two_factor_secret"),
    twoFactorBackupCodes: text("two_factor_backup_codes"),

    // AI Features
    preferredImageModel: text("preferred_image_model").default("nano-banana-2"), // 'nano-banana-2', 'banana-pro', 'gemini-imagen4'

    // Admin fields
    bannedAt: timestamp("banned_at"), // set when admin bans; null = not banned
    deletedAt: timestamp("deleted_at"), // soft-delete; null = active account
    lastActiveAt: timestamp("last_active_at"), // last user-initiated action (login, post, etc.)
  },
  (table) => [
    index("user_referred_by_idx").on(table.referredBy),
    index("user_referral_credited_at_idx").on(table.referralCreditedAt),
  ]
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by").references(() => user.id, { onDelete: "set null" }),
    impersonationStartedAt: timestamp("impersonation_started_at", { withTimezone: true }),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_impersonated_by_idx").on(table.impersonatedBy),
  ]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    index("account_provider_account_idx").on(table.providerId, table.accountId),
  ]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("verification_identifier_idx").on(table.identifier),
    index("verification_identifier_expires_idx").on(table.identifier, table.expiresAt),
  ]
);

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// AstraPost Tables

export const xAccounts = pgTable(
  "x_accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    xUserId: text("x_user_id").notNull().unique(),
    xUsername: text("x_username").notNull(),
    xDisplayName: text("x_display_name"),
    xAvatarUrl: text("x_avatar_url"),
    accessTokenEnc: text("access_token_enc").notNull(),
    refreshTokenEnc: text("refresh_token_enc"),
    tokenExpiresAt: timestamp("token_expires_at"),
    followersCount: integer("followers_count").default(0),
    isDefault: boolean("is_default").default(false),
    isActive: boolean("is_active").default(true),
    xSubscriptionTier: text("x_subscription_tier").default("None"),
    xSubscriptionTierUpdatedAt: timestamp("x_subscription_tier_updated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("x_accounts_user_id_idx").on(table.userId)]
);

export const linkedinAccounts = pgTable(
  "linkedin_accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    linkedinUserId: text("linkedin_user_id").notNull().unique(),
    linkedinName: text("linkedin_name").notNull(),
    linkedinAvatarUrl: text("linkedin_avatar_url"),
    accessTokenEnc: text("access_token_enc").notNull(),
    refreshTokenEnc: text("refresh_token_enc"),
    tokenExpiresAt: timestamp("token_expires_at"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("linkedin_accounts_user_id_idx").on(table.userId)]
);

export const instagramAccounts = pgTable(
  "instagram_accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    instagramUserId: text("instagram_user_id").notNull().unique(),
    instagramUsername: text("instagram_username").notNull(),
    instagramAvatarUrl: text("instagram_avatar_url"),
    accessTokenEnc: text("access_token_enc").notNull(),
    // Instagram Graph API tokens are long-lived (60 days)
    tokenExpiresAt: timestamp("token_expires_at"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("instagram_accounts_user_id_idx").on(table.userId)]
);

export const posts = pgTable(
  "posts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    xAccountId: text("x_account_id").references(() => xAccounts.id, { onDelete: "cascade" }),
    linkedinAccountId: text("linkedin_account_id").references(() => linkedinAccounts.id, {
      onDelete: "cascade",
    }),
    instagramAccountId: text("instagram_account_id").references(() => instagramAccounts.id, {
      onDelete: "cascade",
    }),
    platform: platformEnum("platform").default("twitter"),
    groupId: text("group_id"),
    type: postTypeEnum("type").default("tweet"),
    status: postStatusEnum("status").default("draft"),
    scheduledAt: timestamp("scheduled_at"),
    publishedAt: timestamp("published_at"),
    failReason: text("fail_reason"),
    lastErrorCode: integer("last_error_code"),
    lastErrorAt: timestamp("last_error_at"),
    retryCount: integer("retry_count").default(0),
    aiGenerated: boolean("ai_generated").default(false),
    requiresApproval: boolean("requires_approval").default(false),
    approvedBy: text("approved_by").references(() => user.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at"),
    reviewerNotes: text("reviewer_notes"),
    inspiredByTweetId: text("inspired_by_tweet_id"), // ID of the source tweet from Inspiration feature
    recurrencePattern: recurrencePatternEnum("recurrence_pattern"),
    recurrenceEndDate: timestamp("recurrence_end_date"),
    idempotencyKey: text("idempotency_key").unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at"), // soft-delete; null = active post
  },
  (table) => [
    index("posts_user_id_idx").on(table.userId),
    index("posts_status_idx").on(table.status),
    index("posts_scheduled_at_idx").on(table.scheduledAt),
    index("posts_group_id_idx").on(table.groupId),
    // Composite index for the analytics processor query pattern:
    //   WHERE userId = ? AND status = 'published' AND publishedAt > ?
    // Without this, Postgres must intersect the individual single-column indexes
    // or do a full userId scan filtered by status/date.  With it, the planner
    // satisfies the entire predicate from one B-tree scan ordered by publishedAt.
    index("posts_user_status_published_idx").on(table.userId, table.status, table.publishedAt),
    index("posts_user_status_idx").on(table.userId, table.status),
    index("posts_status_created_idx").on(table.status, table.createdAt),
  ]
);

export const followerSnapshots = pgTable(
  "follower_snapshots",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    xAccountId: text("x_account_id")
      .notNull()
      .references(() => xAccounts.id, { onDelete: "cascade" }),
    followersCount: integer("followers_count").notNull(),
    capturedAt: timestamp("captured_at").defaultNow().notNull(),
  },
  (table) => [
    index("follower_snapshots_user_id_idx").on(table.userId),
    index("follower_snapshots_account_time_idx").on(table.xAccountId, table.capturedAt),
  ]
);

export const analyticsRefreshRuns = pgTable(
  "analytics_refresh_runs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    xAccountId: text("x_account_id").references(() => xAccounts.id, { onDelete: "cascade" }),
    linkedinAccountId: text("linkedin_account_id").references(() => linkedinAccounts.id, {
      onDelete: "cascade",
    }),
    instagramAccountId: text("instagram_account_id").references(() => instagramAccounts.id, {
      onDelete: "cascade",
    }),
    platform: platformEnum("platform").default("twitter"),
    status: analyticsRunStatusEnum("status").default("running"),
    error: text("error"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
  },
  (table) => [
    index("analytics_refresh_runs_user_id_idx").on(table.userId),
    index("analytics_refresh_runs_account_time_idx").on(table.xAccountId, table.startedAt),
  ]
);

export const teamMembers = pgTable(
  "team_members",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }), // The owner's user ID
    role: teamRoleEnum("role").notNull().default("viewer"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("team_members_user_id_idx").on(table.userId),
    index("team_members_team_id_idx").on(table.teamId),
    uniqueIndex("team_members_user_team_unique").on(table.userId, table.teamId),
  ]
);

export const teamInvitations = pgTable(
  "team_invitations",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }), // The owner's user ID
    email: text("email").notNull(),
    role: teamRoleEnum("role").notNull().default("viewer"),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    status: invitationStatusEnum("status").default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("team_invitations_team_id_idx").on(table.teamId),
    index("team_invitations_email_idx").on(table.email),
    index("team_invitations_token_idx").on(table.token),
  ]
);

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(user, {
    fields: [teamMembers.userId],
    references: [user.id],
    relationName: "membership",
  }),
  team: one(user, {
    fields: [teamMembers.teamId],
    references: [user.id],
    relationName: "ownedTeam",
  }),
}));

export const teamInvitationsRelations = relations(teamInvitations, ({ one }) => ({
  team: one(user, {
    fields: [teamInvitations.teamId],
    references: [user.id],
  }),
}));

export const tweets = pgTable(
  "tweets",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    position: integer("position").default(1).notNull(),
    xTweetId: text("x_tweet_id"),
    mediaIds: jsonb("media_ids").default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("tweets_post_id_idx").on(table.postId),
    uniqueIndex("tweets_post_position_idx").on(table.postId, table.position),
  ]
);

export const media = pgTable(
  "media",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tweetId: text("tweet_id").references(() => tweets.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    fileType: text("file_type"), // 'image', 'video', 'gif'
    fileSize: integer("file_size"),
    xMediaId: text("x_media_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("media_post_id_idx").on(table.postId),
    index("media_user_id_idx").on(table.userId),
    index("media_tweet_id_idx").on(table.tweetId),
  ]
);

export const tweetAnalytics = pgTable(
  "tweet_analytics",
  {
    id: text("id").primaryKey(),
    tweetId: text("tweet_id")
      .notNull()
      .references(() => tweets.id, { onDelete: "cascade" }),
    xTweetId: text("x_tweet_id").notNull(),
    impressions: integer("impressions").default(0),
    likes: integer("likes").default(0),
    retweets: integer("retweets").default(0),
    replies: integer("replies").default(0),
    linkClicks: integer("link_clicks").default(0),
    engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }).default("0.00"),
    performanceScore: integer("performance_score").default(0),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("analytics_tweet_id_unique").on(table.tweetId),
    index("analytics_fetched_at_idx").on(table.fetchedAt),
  ]
);

export const tweetAnalyticsSnapshots = pgTable(
  "tweet_analytics_snapshots",
  {
    id: text("id").primaryKey(),
    tweetId: text("tweet_id")
      .notNull()
      .references(() => tweets.id, { onDelete: "cascade" }),
    xTweetId: text("x_tweet_id").notNull(),
    impressions: integer("impressions").default(0),
    likes: integer("likes").default(0),
    retweets: integer("retweets").default(0),
    replies: integer("replies").default(0),
    linkClicks: integer("link_clicks").default(0),
    engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }).default("0.00"),
    performanceScore: integer("performance_score").default(0),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => [
    index("analytics_snapshots_tweet_id_idx").on(table.tweetId),
    index("analytics_snapshots_fetched_at_idx").on(table.fetchedAt),
    // Compound index for time-series queries: WHERE tweetId = ? ORDER BY fetchedAt DESC
    index("analytics_snapshots_tweet_id_fetched_at_idx").on(table.tweetId, table.fetchedAt),
  ]
);

export const socialAnalytics = pgTable(
  "social_analytics",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    impressions: integer("impressions").default(0),
    likes: integer("likes").default(0),
    comments: integer("comments").default(0),
    shares: integer("shares").default(0),
    clicks: integer("clicks").default(0),
    engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }).default("0.00"),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("social_analytics_post_id_unique").on(table.postId),
    index("social_analytics_fetched_at_idx").on(table.fetchedAt),
  ]
);

export const aiGenerations = pgTable(
  "ai_generations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: aiGenerationTypeEnum("type"),
    inputPrompt: text("input_prompt"),
    outputContent: jsonb("output_content"),
    tone: text("tone"),
    language: text("language").default("ar"),
    tokensUsed: integer("tokens_used"),
    model: text("model"),
    subFeature: text("sub_feature"),
    costEstimateCents: integer("cost_estimate_cents"),
    promptVersion: text("prompt_version"),
    feedback: text("feedback"),
    latencyMs: integer("latency_ms"),
    fallbackUsed: boolean("fallback_used").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_gen_user_id_idx").on(table.userId),
    index("ai_gen_user_created_idx").on(table.userId, table.createdAt),
    index("ai_gen_model_idx").on(table.model),
    index("ai_gen_sub_feature_idx").on(table.subFeature),
  ]
);

/**
 * Trust & Safety: moderation flags for AI-generated content.
 *
 * Each row records a flagged piece of content (snippet) with one or more
 * violation categories. Optionally linked to an aiGenerations row via
 * generationId to trace the source generation.
 */
export const moderationFlag = pgTable(
  "moderation_flag",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    generationId: text("generation_id"), // nullable — optional link to aiGenerations row
    categories: text("categories").array().notNull(), // e.g. ["hate_speech", "harassment"]
    snippet: text("snippet").notNull(), // first 200 chars of flagged content
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("moderation_flag_user_id_idx").on(table.userId),
    index("moderation_flag_created_at_idx").on(table.createdAt),
  ]
);

export const inspirationBookmarks = pgTable(
  "inspiration_bookmarks",
  {
    id: text("id").primaryKey(), // Will use UUID like other tables
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sourceTweetId: text("source_tweet_id").notNull(),
    sourceTweetUrl: text("source_tweet_url").notNull(),
    sourceAuthorHandle: text("source_author_handle").notNull(),
    sourceText: text("source_text").notNull(),
    adaptedText: text("adapted_text"),
    action: text("action"), // 'rephrase', 'change_tone', 'expand_thread', 'add_take', 'translate', 'counter_point'
    tone: text("tone"),
    language: text("language"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("inspiration_bookmarks_user_id_idx").on(table.userId),
    index("inspiration_bookmarks_source_tweet_id_idx").on(table.sourceTweetId),
  ]
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    stripePriceId: text("stripe_price_id"),
    plan: planEnum("plan").notNull().default("free"),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    cancelledAt: timestamp("cancelled_at"),
    trialEnd: timestamp("trial_end"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("subscriptions_user_id_idx").on(table.userId),
    index("subscriptions_user_created_idx").on(table.userId, table.createdAt),
  ]
);

/**
 * Tracks processed Stripe webhook event IDs to prevent duplicate side-effects.
 *
 * Stripe retries webhooks on non-2xx responses (and occasionally on successful
 * ones due to network conditions). Without deduplication, side-effects such as
 * billing emails and notifications fire on every retry.
 *
 * The unique constraint on `stripeEventId` is intentionally the deduplication
 * key — `ON CONFLICT DO NOTHING` in the webhook handler makes the insert a
 * no-op if the event was already recorded.
 *
 * Retention: rows are never cleaned up in the hot path. A periodic job or
 * manual maintenance query can prune rows older than 90 days.
 */
export const processedWebhookEvents = pgTable("processed_webhook_events", {
  id: text("id").primaryKey(),
  stripeEventId: text("stripe_event_id").notNull().unique(),
  eventType: text("event_type"),
  retryCount: integer("retry_count").default(0).notNull(),
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});

/**
 * Audit trail for every plan transition.
 *
 * Each row records who changed plans, from what to what, when, and why.
 * Inserted at every code path that mutates `user.plan` (webhook handlers,
 * change-plan route, grace period cron, admin API, sync failsafe).
 */
export const planChangeLog = pgTable(
  "plan_change_log",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    oldPlan: planEnum("old_plan"),
    newPlan: planEnum("new_plan").notNull(),
    reason: text("reason").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("plan_change_log_user_id_idx").on(table.userId),
    index("plan_change_log_created_at_idx").on(table.createdAt),
  ]
);

export const jobRuns = pgTable(
  "job_runs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    queueName: text("queue_name").notNull(),
    jobId: text("job_id").notNull(),
    correlationId: text("correlation_id"),
    postId: text("post_id").references(() => posts.id, { onDelete: "set null" }),
    status: jobRunStatusEnum("status").notNull(),
    attempts: integer("attempts"),
    attemptsMade: integer("attempts_made"),
    error: text("error"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
  },
  (table) => [
    uniqueIndex("job_runs_queue_job_unique").on(table.queueName, table.jobId),
    index("job_runs_user_id_idx").on(table.userId),
    index("job_runs_status_idx").on(table.status),
    index("job_runs_started_at_idx").on(table.startedAt),
  ]
);

/**
 * Dead-letter queue (DLQ) table for permanently failed jobs.
 *
 * When a job exhausts all retries or throws UnrecoverableError, we insert
 * a record here for visibility and manual recovery/retry. Admins can view
 * failed jobs and trigger manual retry via API.
 */
export const failedJobs = pgTable(
  "failed_jobs",
  {
    id: text("id").primaryKey(),
    jobName: text("job_name").notNull(), // e.g. "publish-post"
    jobData: jsonb("job_data").notNull().$type<Record<string, unknown>>(), // original job payload
    errorMessage: text("error_message").notNull(), // last error message
    failureCount: integer("failure_count").notNull().default(1), // total attempts made
    correlationId: text("correlation_id"), // for tracing back to request
    postId: text("post_id").references(() => posts.id, { onDelete: "cascade" }), // if applicable
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastAttemptAt: timestamp("last_attempt_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("failed_jobs_user_id_idx").on(table.userId),
    index("failed_jobs_created_at_idx").on(table.createdAt),
    index("failed_jobs_job_name_idx").on(table.jobName),
  ]
);

export const webhookDeadLetterQueue = pgTable("webhook_dead_letter_queue", {
  id: text("id").primaryKey(),
  stripeEventId: text("stripe_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data").notNull(), // Full Stripe event object
  errorMessage: text("error_message"),
  failureCount: integer("failure_count").default(0).notNull(),
  failedAt: timestamp("failed_at").notNull().defaultNow(),
  movedToDlqAt: timestamp("moved_to_dlq_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"), // Admin user ID
  resolution: text("resolution"), // "replayed" | "ignored" | "manual_fix"
  notes: text("notes"), // Admin notes
  requestBody: text("request_body"), // Raw webhook request body
  requestSignature: text("request_signature"), // Stripe-Signature header
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const webhookDeliveryLog = pgTable(
  "webhook_delivery_log",
  {
    id: text("id").primaryKey(),
    stripeEventId: text("stripe_event_id").notNull(),
    eventType: text("event_type").notNull(),
    status: text("status").notNull(), // "success" | "failure"
    statusCode: integer("status_code"),
    processingTimeMs: integer("processing_time_ms"),
    errorMessage: text("error_message"),
    requestBody: text("request_body"),
    requestSignature: text("request_signature"),
    processedAt: timestamp("processed_at").notNull().defaultNow(),
  },
  (table) => [
    index("webhook_delivery_log_event_id_idx").on(table.stripeEventId),
    index("webhook_delivery_log_processed_at_idx").on(table.processedAt),
  ]
);

export const affiliateLinks = pgTable(
  "affiliate_links",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    destinationUrl: text("destination_url").notNull(),
    shortCode: text("short_code").unique(),
    platform: affiliatePlatformEnum("platform").default("amazon"),
    clicks: integer("clicks").default(0),
    amazonAsin: text("amazon_asin"),
    productTitle: text("product_title"),
    productImageUrl: text("product_image_url"),
    productPrice: decimal("product_price", { precision: 10, scale: 2 }),
    productCurrency: text("product_currency").default("USD"),
    affiliateTag: text("affiliate_tag"),
    generatedTweet: text("generated_tweet"),
    wasScheduled: boolean("was_scheduled").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("affiliate_links_user_id_idx").on(table.userId),
    uniqueIndex("affiliate_links_short_code_idx").on(table.shortCode),
  ]
);

export const affiliateClicks = pgTable(
  "affiliate_clicks",
  {
    id: text("id").primaryKey(),
    affiliateLinkId: text("affiliate_link_id")
      .notNull()
      .references(() => affiliateLinks.id, { onDelete: "cascade" }),
    ipAddress: text("ip_address"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    country: text("country"),
    referer: text("referer"),
    clickedAt: timestamp("clicked_at").defaultNow().notNull(),
  },
  (table) => [
    index("affiliate_clicks_link_id_idx").on(table.affiliateLinkId),
    index("affiliate_clicks_clicked_at_idx").on(table.clickedAt),
  ]
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title"),
    message: text("message"),
    isRead: boolean("is_read").default(false),
    metadata: jsonb("metadata").default({}),
    adminStatus: text("admin_status").default("draft"), // "draft" | "scheduled" | "sent" | "failed"
    deletedAt: timestamp("deleted_at"), // soft-delete for admin notifications
    targetType: text("target_type"), // "all" | "segment" | "individual"
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_read_created_idx").on(table.userId, table.isRead, table.createdAt),
    index("notifications_user_unread_idx").on(table.userId, table.isRead, table.createdAt),
  ]
);

export const templates = pgTable(
  "templates",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    content: jsonb("content").notNull().$type<string[]>(),
    category: text("category").default("Personal"),
    aiMeta: jsonb("ai_meta").$type<{
      templateId: string;
      tone: string;
      language: string;
      outputFormat: string;
    } | null>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("templates_user_id_idx").on(table.userId)]
);

// Milestones
export const milestones = pgTable(
  "milestones",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    milestoneId: text("milestone_id").notNull(), // e.g. 'first_post', '100_followers'
    unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
    metadata: jsonb("metadata"), // e.g. { count: 105 }
  },
  (table) => [
    index("milestones_user_id_idx").on(table.userId),
    uniqueIndex("milestones_user_milestone_unique").on(table.userId, table.milestoneId),
  ]
);

export const feedback = pgTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: feedbackCategoryEnum("category").default("feature"),
    status: feedbackStatusEnum("status").default("pending"),
    upvotes: integer("upvotes").default(0),
    adminNotes: text("admin_notes"),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("feedback_user_id_idx").on(table.userId),
    index("feedback_status_idx").on(table.status),
    index("feedback_upvotes_idx").on(table.upvotes),
  ]
);

export const feedbackVotes = pgTable(
  "feedback_votes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    feedbackId: text("feedback_id")
      .notNull()
      .references(() => feedback.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("feedback_votes_user_feedback_unique").on(table.userId, table.feedbackId),
    index("feedback_votes_feedback_id_idx").on(table.feedbackId),
  ]
);

export const affiliateLinksRelations = relations(affiliateLinks, ({ one, many }) => ({
  user: one(user, {
    fields: [affiliateLinks.userId],
    references: [user.id],
  }),
  clicks: many(affiliateClicks),
}));

export const affiliateClicksRelations = relations(affiliateClicks, ({ one }) => ({
  link: one(affiliateLinks, {
    fields: [affiliateClicks.affiliateLinkId],
    references: [affiliateLinks.id],
  }),
}));

export const userRelations = relations(user, ({ one, many }) => ({
  sessions: many(session),
  accounts: many(account),
  xAccounts: many(xAccounts),
  linkedinAccounts: many(linkedinAccounts),
  instagramAccounts: many(instagramAccounts),
  posts: many(posts, { relationName: "user_posts" }),
  subscriptions: many(subscriptions),
  notifications: many(notifications),
  templates: many(templates),
  affiliateLinks: many(affiliateLinks),
  teamMemberships: many(teamMembers, { relationName: "membership" }),
  ownedTeamMembers: many(teamMembers, { relationName: "ownedTeam" }),
  teamInvitations: many(teamInvitations),
  unlockedMilestones: many(milestones),
  referrer: one(user, {
    fields: [user.referredBy],
    references: [user.id],
    relationName: "referrals",
  }),
  referrals: many(user, { relationName: "referrals" }),
  aiGenerations: many(aiGenerations),
  inspirationBookmarks: many(inspirationBookmarks),
  jobRuns: many(jobRuns),
  followerSnapshots: many(followerSnapshots),
  analyticsRefreshRuns: many(analyticsRefreshRuns),
  feedback: many(feedback),
  feedbackVotes: many(feedbackVotes),
  socialAnalytics: many(socialAnalytics),
  auditLogEntries: many(adminAuditLog),
  moderationFlags: many(moderationFlag),
  aiCounter: one(userAiCounters, {
    fields: [user.id],
    references: [userAiCounters.userId],
  }),
}));

export const socialAnalyticsRelations = relations(socialAnalytics, ({ one }) => ({
  post: one(posts, {
    fields: [socialAnalytics.postId],
    references: [posts.id],
  }),
}));

export const feedbackRelations = relations(feedback, ({ one, many }) => ({
  user: one(user, {
    fields: [feedback.userId],
    references: [user.id],
  }),
  votes: many(feedbackVotes),
}));

export const feedbackVotesRelations = relations(feedbackVotes, ({ one }) => ({
  user: one(user, {
    fields: [feedbackVotes.userId],
    references: [user.id],
  }),
  feedback: one(feedback, {
    fields: [feedbackVotes.feedbackId],
    references: [feedback.id],
  }),
}));

export const aiGenerationsRelations = relations(aiGenerations, ({ one, many }) => ({
  user: one(user, {
    fields: [aiGenerations.userId],
    references: [user.id],
  }),
  moderationFlags: many(moderationFlag),
}));

export const moderationFlagRelations = relations(moderationFlag, ({ one }) => ({
  user: one(user, {
    fields: [moderationFlag.userId],
    references: [user.id],
  }),
  generation: one(aiGenerations, {
    fields: [moderationFlag.generationId],
    references: [aiGenerations.id],
  }),
}));

/**
 * Atomic per-user quota counter for AI generations.
 *
 * Replaces COUNT(*) on aiGenerations with a single-row counter that is
 * atomically incremented/decremented to enforce quota without race conditions.
 *
 * - `periodStart` defines the current billing window (calendar month).
 * - When periodStart is stale (< start of current month), the row is reset
 *   by either the tryConsumeAiQuota service or the ai-counter-rollover cron.
 * - `limit` is cached from the user's plan at the time of counter creation
 *   or rollover; it is refreshed on every period reset.
 */
export const userAiCounters = pgTable("user_ai_counters", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start").notNull(),
  used: integer("used").default(0).notNull(),
  limit: integer("limit").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userAiCountersRelations = relations(userAiCounters, ({ one }) => ({
  user: one(user, {
    fields: [userAiCounters.userId],
    references: [user.id],
  }),
}));

export const inspirationBookmarksRelations = relations(inspirationBookmarks, ({ one }) => ({
  user: one(user, {
    fields: [inspirationBookmarks.userId],
    references: [user.id],
  }),
}));

export const xAccountRelations = relations(xAccounts, ({ one, many }) => ({
  user: one(user, {
    fields: [xAccounts.userId],
    references: [user.id],
  }),
  posts: many(posts, { relationName: "user_posts" }),
  followerSnapshots: many(followerSnapshots),
  analyticsRefreshRuns: many(analyticsRefreshRuns),
}));

export const linkedinAccountRelations = relations(linkedinAccounts, ({ one, many }) => ({
  user: one(user, {
    fields: [linkedinAccounts.userId],
    references: [user.id],
  }),
  posts: many(posts, { relationName: "user_posts" }),
}));

export const instagramAccountRelations = relations(instagramAccounts, ({ one, many }) => ({
  user: one(user, {
    fields: [instagramAccounts.userId],
    references: [user.id],
  }),
  posts: many(posts, { relationName: "user_posts" }),
}));

export const postRelations = relations(posts, ({ one, many }) => ({
  user: one(user, {
    fields: [posts.userId],
    references: [user.id],
    relationName: "user_posts",
  }),
  xAccount: one(xAccounts, {
    fields: [posts.xAccountId],
    references: [xAccounts.id],
  }),
  linkedinAccount: one(linkedinAccounts, {
    fields: [posts.linkedinAccountId],
    references: [linkedinAccounts.id],
  }),
  instagramAccount: one(instagramAccounts, {
    fields: [posts.instagramAccountId],
    references: [instagramAccounts.id],
  }),
  approvedByUser: one(user, {
    fields: [posts.approvedBy],
    references: [user.id],
    relationName: "approved_posts",
  }),
  tweets: many(tweets),
  media: many(media),
}));

export const tweetRelations = relations(tweets, ({ one, many }) => ({
  post: one(posts, {
    fields: [tweets.postId],
    references: [posts.id],
  }),
  media: many(media),
  analyticsSnapshots: many(tweetAnalyticsSnapshots),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  post: one(posts, {
    fields: [media.postId],
    references: [posts.id],
  }),
  user: one(user, {
    fields: [media.userId],
    references: [user.id],
  }),
  tweet: one(tweets, {
    fields: [media.tweetId],
    references: [tweets.id],
  }),
}));

export const tweetAnalyticsRelations = relations(tweetAnalytics, ({ one }) => ({
  tweet: one(tweets, {
    fields: [tweetAnalytics.tweetId],
    references: [tweets.id],
  }),
}));

export const tweetAnalyticsSnapshotsRelations = relations(tweetAnalyticsSnapshots, ({ one }) => ({
  tweet: one(tweets, {
    fields: [tweetAnalyticsSnapshots.tweetId],
    references: [tweets.id],
  }),
}));

export const jobRunsRelations = relations(jobRuns, ({ one }) => ({
  user: one(user, {
    fields: [jobRuns.userId],
    references: [user.id],
  }),
  post: one(posts, {
    fields: [jobRuns.postId],
    references: [posts.id],
  }),
}));

export const followerSnapshotsRelations = relations(followerSnapshots, ({ one }) => ({
  xAccount: one(xAccounts, {
    fields: [followerSnapshots.xAccountId],
    references: [xAccounts.id],
  }),
  user: one(user, {
    fields: [followerSnapshots.userId],
    references: [user.id],
  }),
}));

export const analyticsRefreshRunsRelations = relations(analyticsRefreshRuns, ({ one }) => ({
  xAccount: one(xAccounts, {
    fields: [analyticsRefreshRuns.xAccountId],
    references: [xAccounts.id],
  }),
  linkedinAccount: one(linkedinAccounts, {
    fields: [analyticsRefreshRuns.linkedinAccountId],
    references: [linkedinAccounts.id],
  }),
  instagramAccount: one(instagramAccounts, {
    fields: [analyticsRefreshRuns.instagramAccountId],
    references: [instagramAccounts.id],
  }),
  user: one(user, {
    fields: [analyticsRefreshRuns.userId],
    references: [user.id],
  }),
}));

export const milestonesRelations = relations(milestones, ({ one }) => ({
  user: one(user, {
    fields: [milestones.userId],
    references: [user.id],
  }),
}));

// ── Admin / Billing Tables ───────────────────────────────────────────────────

/**
 * Promotional codes that can be applied at checkout for discounts.
 * Soft-deleted via deletedAt; hard deletes are intentionally not supported.
 */
export const promoCodes = pgTable(
  "promo_codes",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    description: text("description"),
    discountType: discountTypeEnum("discount_type").notNull(),
    discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
    validFrom: timestamp("valid_from"),
    validTo: timestamp("valid_to"),
    maxRedemptions: integer("max_redemptions"), // null = unlimited
    redemptionsCount: integer("redemptions_count").default(0).notNull(),
    applicablePlans: jsonb("applicable_plans").default([]).$type<string[]>(), // [] = all plans
    isActive: boolean("is_active").default(true).notNull(),
    stripeCouponId: text("stripe_coupon_id"), // set when a Stripe coupon is created for this code
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("promo_codes_code_idx").on(table.code),
    index("promo_codes_is_active_idx").on(table.isActive),
  ]
);

/** Tracks each time a promo code was successfully redeemed at checkout. */
export const promoCodeRedemptions = pgTable(
  "promo_code_redemptions",
  {
    id: text("id").primaryKey(),
    promoCodeId: text("promo_code_id")
      .notNull()
      .references(() => promoCodes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    stripeSessionId: text("stripe_session_id"),
    discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }),
    redeemedAt: timestamp("redeemed_at").defaultNow().notNull(),
  },
  (table) => [
    index("promo_redemptions_code_id_idx").on(table.promoCodeId),
    index("promo_redemptions_user_id_idx").on(table.userId),
  ]
);

/**
 * Simple key-value feature flag system.
 * Admin UI provides toggle switches; `isFeatureEnabled()` reads from this table
 * with a 60-second in-memory cache.
 */
export const featureFlags = pgTable(
  "feature_flags",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    enabled: boolean("enabled").default(false).notNull(),
    description: text("description"),
    rolloutPercentage: integer("rollout_percentage").default(0).notNull(), // 0-100% for gradual rollout
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("feature_flags_key_unique").on(table.key)]
);

// ── Relations for new admin tables ──────────────────────────────────────────

export const promoCodesRelations = relations(promoCodes, ({ one, many }) => ({
  createdByUser: one(user, {
    fields: [promoCodes.createdBy],
    references: [user.id],
  }),
  redemptions: many(promoCodeRedemptions),
}));

export const promoCodeRedemptionsRelations = relations(promoCodeRedemptions, ({ one }) => ({
  promoCode: one(promoCodes, {
    fields: [promoCodeRedemptions.promoCodeId],
    references: [promoCodes.id],
  }),
  user: one(user, {
    fields: [promoCodeRedemptions.userId],
    references: [user.id],
  }),
}));

// ── Admin Audit Log ──────────────────────────────────────────────────────────

/**
 * Immutable audit trail for every admin action.
 *
 * Each row records which admin performed what action, on which target,
 * when, and from where. Rows are never updated or deleted — append-only.
 *
 * Retention: consider pruning rows older than 1 year via a periodic job.
 */
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: text("id").primaryKey(),
    adminId: text("admin_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: adminAuditActionEnum("action").notNull(),
    targetType: text("target_type"), // e.g. 'user', 'feature_flag', 'promo_code'
    targetId: text("target_id"), // e.g. user ID, flag key, promo code ID
    details: jsonb("details").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("admin_audit_log_admin_id_idx").on(table.adminId),
    index("admin_audit_log_action_idx").on(table.action),
    index("admin_audit_log_created_at_idx").on(table.createdAt),
    index("admin_audit_log_target_idx").on(table.targetType, table.targetId),
  ]
);

// ── Agentic Posts ────────────────────────────────────────────────────────────

/**
 * Stores full agentic generation sessions.
 * Each row represents one pipeline run: research → strategy → write → images → review.
 * The actual published content lives in the standard posts/tweets tables after approval.
 */
export const agenticPosts = pgTable(
  "agentic_posts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    xAccountId: text("x_account_id")
      .notNull()
      .references(() => xAccounts.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    researchBrief: jsonb("research_brief"),
    contentPlan: jsonb("content_plan"),
    tweets: jsonb("tweets"),
    qualityScore: integer("quality_score"),
    summary: text("summary"),
    status: varchar("status", { length: 30 }).default("generating").notNull(),
    postId: text("post_id").references(() => posts.id, { onDelete: "cascade" }),
    correlationId: varchar("correlation_id", { length: 36 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("agentic_posts_user_id_idx").on(table.userId),
    index("agentic_posts_status_idx").on(table.status),
    index("agentic_posts_x_account_id_idx").on(table.xAccountId),
  ]
);

export const agenticPostsRelations = relations(agenticPosts, ({ one }) => ({
  user: one(user, {
    fields: [agenticPosts.userId],
    references: [user.id],
  }),
  xAccount: one(xAccounts, {
    fields: [agenticPosts.xAccountId],
    references: [xAccounts.id],
  }),
  post: one(posts, {
    fields: [agenticPosts.postId],
    references: [posts.id],
  }),
}));

// ── Type Exports ────────────────────────────────────────────────────────────
export type User = typeof user.$inferSelect;
export type InsertUser = typeof user.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;
export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLog.$inferInsert;
export type UserAiCounter = typeof userAiCounters.$inferSelect;
export type InsertUserAiCounter = typeof userAiCounters.$inferInsert;
export type SessionWithImpersonation = typeof session.$inferSelect & {
  impersonatedByUser?: typeof user.$inferSelect;
};
export type ModerationFlag = typeof moderationFlag.$inferSelect;
export type InsertModerationFlag = typeof moderationFlag.$inferInsert;
