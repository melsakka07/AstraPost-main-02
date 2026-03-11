CREATE TABLE "social_analytics" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"impressions" integer DEFAULT 0,
	"likes" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"engagement_rate" numeric(5, 2) DEFAULT '0.00',
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_refresh_runs" ALTER COLUMN "x_account_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_refresh_runs" ADD COLUMN "linkedin_account_id" text;--> statement-breakpoint
ALTER TABLE "analytics_refresh_runs" ADD COLUMN "instagram_account_id" text;--> statement-breakpoint
ALTER TABLE "analytics_refresh_runs" ADD COLUMN "platform" text DEFAULT 'twitter';--> statement-breakpoint
ALTER TABLE "social_analytics" ADD CONSTRAINT "social_analytics_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "social_analytics_post_id_unique" ON "social_analytics" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "social_analytics_fetched_at_idx" ON "social_analytics" USING btree ("fetched_at");--> statement-breakpoint
ALTER TABLE "analytics_refresh_runs" ADD CONSTRAINT "analytics_refresh_runs_linkedin_account_id_linkedin_accounts_id_fk" FOREIGN KEY ("linkedin_account_id") REFERENCES "public"."linkedin_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_refresh_runs" ADD CONSTRAINT "analytics_refresh_runs_instagram_account_id_instagram_accounts_id_fk" FOREIGN KEY ("instagram_account_id") REFERENCES "public"."instagram_accounts"("id") ON DELETE cascade ON UPDATE no action;