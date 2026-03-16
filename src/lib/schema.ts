
import { relations } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp, boolean, integer, jsonb, decimal, index, uniqueIndex } from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────────────────

// ── Existing enums (already in DB) ─────────────────────────────────────────
export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "scheduled",
  "published",
  "failed",
  "cancelled",
  "awaiting_approval",
]);

export const planEnum = pgEnum("plan", [
  "free",
  "pro_monthly",
  "pro_annual",
  "agency",
]);

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
export const platformEnum = pgEnum("platform", [
  "twitter",
  "linkedin",
  "instagram",
]);

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
export const teamRoleEnum = pgEnum("team_role", [
  "admin",
  "editor",
  "viewer",
]);

/** Lifecycle state of a team invitation. */
export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
]);

/** Status of a background analytics refresh run. */
export const analyticsRunStatusEnum = pgEnum("analytics_run_status", [
  "running",
  "success",
  "failed",
]);

/** Lifecycle state of a feedback item. */
export const feedbackStatusEnum = pgEnum("feedback_status", [
  "pending",
  "planned",
  "in_progress",
  "completed",
  "declined",
]);

/** Category of a feedback submission. */
export const feedbackCategoryEnum = pgEnum("feedback_category", [
  "feature",
  "bug",
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
    requiresApproval: boolean("requires_approval").default(false), // For Agency plan team workflows
    
    // Referral System
    referralCode: text("referral_code").unique(),
    referredBy: text("referred_by"), // ID of the user who referred this user
    referralCredits: integer("referral_credits").default(0),

    // 2FA
    twoFactorEnabled: boolean("two_factor_enabled").default(false),
    twoFactorSecret: text("two_factor_secret"),
    twoFactorBackupCodes: text("two_factor_backup_codes"),

    // AI Features
    preferredImageModel: text("preferred_image_model").default("nano-banana-2"), // 'nano-banana-2', 'banana-pro', 'gemini-imagen4'
  },
  (table) => [
    index("user_email_idx").on(table.email),
    index("user_referral_code_idx").on(table.referralCode)
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
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_token_idx").on(table.token),
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

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// AstraPost Tables

export const xAccounts = pgTable("x_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  xUserId: text("x_user_id").notNull().unique(),
  xUsername: text("x_username").notNull(),
  xDisplayName: text("x_display_name"),
  xAvatarUrl: text("x_avatar_url"),
  accessToken: text("access_token").notNull(),
  refreshTokenEnc: text("refresh_token_enc"),
  tokenExpiresAt: timestamp("token_expires_at"),
  followersCount: integer("followers_count").default(0),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("x_accounts_user_id_idx").on(table.userId)
]);

export const linkedinAccounts = pgTable("linkedin_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  linkedinUserId: text("linkedin_user_id").notNull().unique(),
  linkedinName: text("linkedin_name").notNull(),
  linkedinAvatarUrl: text("linkedin_avatar_url"),
  accessToken: text("access_token").notNull(),
  refreshTokenEnc: text("refresh_token_enc"),
  tokenExpiresAt: timestamp("token_expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("linkedin_accounts_user_id_idx").on(table.userId)
]);

export const instagramAccounts = pgTable("instagram_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  instagramUserId: text("instagram_user_id").notNull().unique(),
  instagramUsername: text("instagram_username").notNull(),
  instagramAvatarUrl: text("instagram_avatar_url"),
  accessToken: text("access_token").notNull(),
  // Instagram Graph API tokens are long-lived (60 days)
  tokenExpiresAt: timestamp("token_expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("instagram_accounts_user_id_idx").on(table.userId)
]);

export const posts = pgTable("posts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  xAccountId: text("x_account_id").references(() => xAccounts.id, { onDelete: "cascade" }),
  linkedinAccountId: text("linkedin_account_id").references(() => linkedinAccounts.id, { onDelete: "cascade" }),
  instagramAccountId: text("instagram_account_id").references(() => instagramAccounts.id, { onDelete: "cascade" }),
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
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("posts_user_id_idx").on(table.userId),
  index("posts_status_idx").on(table.status),
  index("posts_scheduled_at_idx").on(table.scheduledAt),
  index("posts_group_id_idx").on(table.groupId),
]);

export const followerSnapshots = pgTable("follower_snapshots", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  xAccountId: text("x_account_id").notNull().references(() => xAccounts.id, { onDelete: "cascade" }),
  followersCount: integer("followers_count").notNull(),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
}, (table) => [
  index("follower_snapshots_user_id_idx").on(table.userId),
  index("follower_snapshots_account_time_idx").on(table.xAccountId, table.capturedAt),
]);

export const analyticsRefreshRuns = pgTable("analytics_refresh_runs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  xAccountId: text("x_account_id").references(() => xAccounts.id, { onDelete: "cascade" }),
  linkedinAccountId: text("linkedin_account_id").references(() => linkedinAccounts.id, { onDelete: "cascade" }),
  instagramAccountId: text("instagram_account_id").references(() => instagramAccounts.id, { onDelete: "cascade" }),
  platform: platformEnum("platform").default("twitter"),
  status: analyticsRunStatusEnum("status").default("running"),
  error: text("error"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
}, (table) => [
  index("analytics_refresh_runs_user_id_idx").on(table.userId),
  index("analytics_refresh_runs_account_time_idx").on(table.xAccountId, table.startedAt),
]);

export const teamMembers = pgTable("team_members", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  teamId: text("team_id").notNull().references(() => user.id, { onDelete: "cascade" }), // The owner's user ID
  role: teamRoleEnum("role").notNull().default("viewer"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("team_members_user_id_idx").on(table.userId),
  index("team_members_team_id_idx").on(table.teamId),
  uniqueIndex("team_members_user_team_unique").on(table.userId, table.teamId),
]);

export const teamInvitations = pgTable("team_invitations", {
  id: text("id").primaryKey(),
  teamId: text("team_id").notNull().references(() => user.id, { onDelete: "cascade" }), // The owner's user ID
  email: text("email").notNull(),
  role: teamRoleEnum("role").notNull().default("viewer"),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  status: invitationStatusEnum("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("team_invitations_team_id_idx").on(table.teamId),
  index("team_invitations_email_idx").on(table.email),
  index("team_invitations_token_idx").on(table.token),
]);

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

export const tweets = pgTable("tweets", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  position: integer("position").default(1).notNull(),
  xTweetId: text("x_tweet_id"),
  mediaIds: jsonb("media_ids").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("tweets_post_id_idx").on(table.postId),
  uniqueIndex("tweets_post_position_idx").on(table.postId, table.position)
]);

export const media = pgTable("media", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  tweetId: text("tweet_id").references(() => tweets.id, { onDelete: "cascade" }),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type"), // 'image', 'video', 'gif'
  fileSize: integer("file_size"),
  xMediaId: text("x_media_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tweetAnalytics = pgTable("tweet_analytics", {
  id: text("id").primaryKey(),
  tweetId: text("tweet_id").notNull().references(() => tweets.id, { onDelete: "cascade" }),
  xTweetId: text("x_tweet_id").notNull(),
  impressions: integer("impressions").default(0),
  likes: integer("likes").default(0),
  retweets: integer("retweets").default(0),
  replies: integer("replies").default(0),
  linkClicks: integer("link_clicks").default(0),
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }).default("0.00"),
  performanceScore: integer("performance_score").default(0),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("analytics_tweet_id_unique").on(table.tweetId),
  index("analytics_tweet_id_idx").on(table.tweetId),
  index("analytics_fetched_at_idx").on(table.fetchedAt)
]);

export const tweetAnalyticsSnapshots = pgTable("tweet_analytics_snapshots", {
  id: text("id").primaryKey(),
  tweetId: text("tweet_id").notNull().references(() => tweets.id, { onDelete: "cascade" }),
  xTweetId: text("x_tweet_id").notNull(),
  impressions: integer("impressions").default(0),
  likes: integer("likes").default(0),
  retweets: integer("retweets").default(0),
  replies: integer("replies").default(0),
  linkClicks: integer("link_clicks").default(0),
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }).default("0.00"),
  performanceScore: integer("performance_score").default(0),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
}, (table) => [
  index("analytics_snapshots_tweet_id_idx").on(table.tweetId),
  index("analytics_snapshots_fetched_at_idx").on(table.fetchedAt),
  // Compound index for time-series queries: WHERE tweetId = ? ORDER BY fetchedAt DESC
  index("analytics_snapshots_tweet_id_fetched_at_idx").on(table.tweetId, table.fetchedAt),
]);

export const socialAnalytics = pgTable("social_analytics", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  impressions: integer("impressions").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  clicks: integer("clicks").default(0),
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }).default("0.00"),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("social_analytics_post_id_unique").on(table.postId),
  index("social_analytics_fetched_at_idx").on(table.fetchedAt)
]);

export const aiGenerations = pgTable("ai_generations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type: text("type"), // 'thread', 'tweet_improve', 'affiliate', 'image', 'inspiration', 'inspire'
  inputPrompt: text("input_prompt"),
  outputContent: jsonb("output_content"),
  tone: text("tone"),
  language: text("language").default("ar"),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("ai_gen_user_id_idx").on(table.userId)
]);

export const inspirationBookmarks = pgTable("inspiration_bookmarks", {
  id: text("id").primaryKey(), // Will use UUID like other tables
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  sourceTweetId: text("source_tweet_id").notNull(),
  sourceTweetUrl: text("source_tweet_url").notNull(),
  sourceAuthorHandle: text("source_author_handle").notNull(),
  sourceText: text("source_text").notNull(),
  adaptedText: text("adapted_text"),
  action: text("action"), // 'rephrase', 'change_tone', 'expand_thread', 'add_take', 'translate', 'counter_point'
  tone: text("tone"),
  language: text("language"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("inspiration_bookmarks_user_id_idx").on(table.userId),
  index("inspiration_bookmarks_source_tweet_id_idx").on(table.sourceTweetId),
]);

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripePriceId: text("stripe_price_id"),
  plan: planEnum("plan"),
  status: subscriptionStatusEnum("status"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
});

export const jobRuns = pgTable("job_runs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
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
}, (table) => [
  uniqueIndex("job_runs_queue_job_unique").on(table.queueName, table.jobId),
  index("job_runs_user_id_idx").on(table.userId),
  index("job_runs_status_idx").on(table.status),
  index("job_runs_started_at_idx").on(table.startedAt),
]);

export const affiliateLinks = pgTable("affiliate_links", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  destinationUrl: text("destination_url").notNull(),
  shortCode: text("short_code").unique(),
  platform: text("platform").default("amazon"),
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
}, (table) => [
  index("affiliate_links_user_id_idx").on(table.userId),
  uniqueIndex("affiliate_links_short_code_idx").on(table.shortCode),
]);

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: text("id").primaryKey(),
  affiliateLinkId: text("affiliate_link_id").notNull().references(() => affiliateLinks.id, { onDelete: "cascade" }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  country: text("country"),
  referer: text("referer"),
  clickedAt: timestamp("clicked_at").defaultNow().notNull(),
}, (table) => [
  index("affiliate_clicks_link_id_idx").on(table.affiliateLinkId),
  index("affiliate_clicks_clicked_at_idx").on(table.clickedAt),
]);

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title"),
  message: text("message"),
  isRead: boolean("is_read").default(false),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("notifications_user_id_idx").on(table.userId),
  index("notifications_is_read_idx").on(table.isRead)
]);

export const templates = pgTable("templates", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  content: jsonb("content").notNull().$type<string[]>(),
  category: text("category").default("Personal"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("templates_user_id_idx").on(table.userId),
]);

// Milestones
export const milestones = pgTable("milestones", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  milestoneId: text("milestone_id").notNull(), // e.g. 'first_post', '100_followers'
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  metadata: jsonb("metadata"), // e.g. { count: 105 }
}, (table) => [
  index("milestones_user_id_idx").on(table.userId),
  uniqueIndex("milestones_user_milestone_unique").on(table.userId, table.milestoneId),
]);

export const feedback = pgTable("feedback", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: feedbackCategoryEnum("category").default("feature"),
  status: feedbackStatusEnum("status").default("pending"),
  upvotes: integer("upvotes").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("feedback_user_id_idx").on(table.userId),
  index("feedback_status_idx").on(table.status),
  index("feedback_upvotes_idx").on(table.upvotes),
]);

export const feedbackVotes = pgTable("feedback_votes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  feedbackId: text("feedback_id").notNull().references(() => feedback.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("feedback_votes_user_feedback_unique").on(table.userId, table.feedbackId),
  index("feedback_votes_feedback_id_idx").on(table.feedbackId),
]);

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
  xAccounts: many(xAccounts),
  linkedinAccounts: many(linkedinAccounts),
  instagramAccounts: many(instagramAccounts),
  posts: many(posts),
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

export const aiGenerationsRelations = relations(aiGenerations, ({ one }) => ({
  user: one(user, {
    fields: [aiGenerations.userId],
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
  posts: many(posts),
  followerSnapshots: many(followerSnapshots),
  analyticsRefreshRuns: many(analyticsRefreshRuns),
}));

export const linkedinAccountRelations = relations(linkedinAccounts, ({ one, many }) => ({
  user: one(user, {
    fields: [linkedinAccounts.userId],
    references: [user.id],
  }),
  posts: many(posts),
}));

export const instagramAccountRelations = relations(instagramAccounts, ({ one, many }) => ({
  user: one(user, {
    fields: [instagramAccounts.userId],
    references: [user.id],
  }),
  posts: many(posts),
}));

export const postRelations = relations(posts, ({ one, many }) => ({
  user: one(user, {
    fields: [posts.userId],
    references: [user.id],
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
