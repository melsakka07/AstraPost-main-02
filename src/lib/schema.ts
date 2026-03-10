import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, integer, jsonb, decimal, index, uniqueIndex } from "drizzle-orm/pg-core";

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
    
    // AstroPost specific fields
    timezone: text("timezone").default("Asia/Riyadh"),
    language: text("language").default("ar"), // 'ar' or 'en'
    plan: text("plan").default("free"), // 'free', 'pro_monthly', 'pro_annual', 'agency'
    planExpiresAt: timestamp("plan_expires_at"),
    stripeCustomerId: text("stripe_customer_id"),
    trialEndsAt: timestamp("trial_ends_at"),
    onboardingCompleted: boolean("onboarding_completed").default(false),
  },
  (table) => [index("user_email_idx").on(table.email)]
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

// AstroPost Tables

export const xAccounts = pgTable("x_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  xUserId: text("x_user_id").notNull().unique(),
  xUsername: text("x_username").notNull(),
  xDisplayName: text("x_display_name"),
  xAvatarUrl: text("x_avatar_url"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
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

export const posts = pgTable("posts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  xAccountId: text("x_account_id").notNull().references(() => xAccounts.id, { onDelete: "cascade" }),
  groupId: text("group_id"),
  type: text("type").default("tweet"), // 'tweet', 'thread'
  status: text("status").default("draft"), // 'draft', 'scheduled', 'published', 'failed', 'cancelled'
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  failReason: text("fail_reason"),
  lastErrorCode: integer("last_error_code"),
  lastErrorAt: timestamp("last_error_at"),
  retryCount: integer("retry_count").default(0),
  aiGenerated: boolean("ai_generated").default(false),
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
  xAccountId: text("x_account_id").notNull().references(() => xAccounts.id, { onDelete: "cascade" }),
  status: text("status").default("running"),
  error: text("error"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
}, (table) => [
  index("analytics_refresh_runs_user_id_idx").on(table.userId),
  index("analytics_refresh_runs_account_time_idx").on(table.xAccountId, table.startedAt),
]);

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
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
}, (table) => [
  index("analytics_snapshots_tweet_id_idx").on(table.tweetId),
  index("analytics_snapshots_fetched_at_idx").on(table.fetchedAt),
]);

export const aiGenerations = pgTable("ai_generations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type: text("type"), // 'thread', 'tweet_improve', 'affiliate'
  inputPrompt: text("input_prompt"),
  outputContent: jsonb("output_content"),
  tone: text("tone"),
  language: text("language").default("ar"),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("ai_gen_user_id_idx").on(table.userId)
]);

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripePriceId: text("stripe_price_id"),
  plan: text("plan"),
  status: text("status"), // 'active', 'past_due', 'cancelled', 'trialing'
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
  status: text("status").notNull(),
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
  amazonProductUrl: text("amazon_product_url").notNull(),
  amazonAsin: text("amazon_asin"),
  productTitle: text("product_title"),
  productImageUrl: text("product_image_url"),
  productPrice: decimal("product_price", { precision: 10, scale: 2 }),
  productCurrency: text("product_currency").default("USD"),
  affiliateTag: text("affiliate_tag"),
  generatedTweet: text("generated_tweet"),
  wasScheduled: boolean("was_scheduled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

// RELATIONS

export const userRelations = relations(user, ({ many }) => ({
  xAccounts: many(xAccounts),
  posts: many(posts),
  subscriptions: many(subscriptions),
  notifications: many(notifications),
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

export const postRelations = relations(posts, ({ one, many }) => ({
  user: one(user, {
    fields: [posts.userId],
    references: [user.id],
  }),
  xAccount: one(xAccounts, {
    fields: [posts.xAccountId],
    references: [xAccounts.id],
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
  analytics: one(tweetAnalytics, {
    fields: [tweets.id],
    references: [tweetAnalytics.tweetId],
  }),
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
  user: one(user, {
    fields: [analyticsRefreshRuns.userId],
    references: [user.id],
  }),
}));
