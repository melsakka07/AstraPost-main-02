CREATE TABLE IF NOT EXISTS "affiliate_links" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amazon_product_url" text NOT NULL,
	"amazon_asin" text,
	"product_title" text,
	"product_image_url" text,
	"product_price" numeric(10, 2),
	"product_currency" text DEFAULT 'USD',
	"affiliate_tag" text,
	"generated_tweet" text,
	"was_scheduled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_generations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text,
	"input_prompt" text,
	"output_content" jsonb,
	"tone" text,
	"language" text DEFAULT 'ar',
	"tokens_used" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"tweet_id" text,
	"file_url" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"x_media_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text,
	"message" text,
	"is_read" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"x_account_id" text NOT NULL,
	"type" text DEFAULT 'tweet',
	"status" text DEFAULT 'draft',
	"scheduled_at" timestamp,
	"published_at" timestamp,
	"fail_reason" text,
	"retry_count" integer DEFAULT 0,
	"ai_generated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"stripe_price_id" text,
	"plan" text,
	"status" text,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tweet_analytics" (
	"id" text PRIMARY KEY NOT NULL,
	"tweet_id" text NOT NULL,
	"x_tweet_id" text NOT NULL,
	"impressions" integer DEFAULT 0,
	"likes" integer DEFAULT 0,
	"retweets" integer DEFAULT 0,
	"replies" integer DEFAULT 0,
	"link_clicks" integer DEFAULT 0,
	"engagement_rate" numeric(5, 2) DEFAULT '0.00',
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tweets" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"content" text NOT NULL,
	"position" integer DEFAULT 1 NOT NULL,
	"x_tweet_id" text,
	"media_ids" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "x_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"x_user_id" text NOT NULL,
	"x_username" text NOT NULL,
	"x_display_name" text,
	"x_avatar_url" text,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"followers_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "x_accounts_x_user_id_unique" UNIQUE("x_user_id")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "timezone" text DEFAULT 'Asia/Riyadh';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "language" text DEFAULT 'ar';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "plan" text DEFAULT 'free';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "plan_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "onboarding_completed" boolean DEFAULT false;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media" ADD CONSTRAINT "media_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media" ADD CONSTRAINT "media_tweet_id_tweets_id_fk" FOREIGN KEY ("tweet_id") REFERENCES "public"."tweets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_x_account_id_x_accounts_id_fk" FOREIGN KEY ("x_account_id") REFERENCES "public"."x_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tweet_analytics" ADD CONSTRAINT "tweet_analytics_tweet_id_tweets_id_fk" FOREIGN KEY ("tweet_id") REFERENCES "public"."tweets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tweets" ADD CONSTRAINT "tweets_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "x_accounts" ADD CONSTRAINT "x_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_gen_user_id_idx" ON "ai_generations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_user_id_idx" ON "posts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_status_idx" ON "posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_scheduled_at_idx" ON "posts" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_tweet_id_idx" ON "tweet_analytics" USING btree ("tweet_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_fetched_at_idx" ON "tweet_analytics" USING btree ("fetched_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tweets_post_id_idx" ON "tweets" USING btree ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tweets_post_position_idx" ON "tweets" USING btree ("post_id","position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "x_accounts_user_id_idx" ON "x_accounts" USING btree ("user_id");
