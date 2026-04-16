CREATE TYPE "public"."agentic_post_status" AS ENUM('generating', 'ready', 'needs_input', 'approved', 'scheduled', 'posted', 'failed', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."x_subscription_tier" AS ENUM('None', 'Basic', 'Premium', 'PremiumPlus');--> statement-breakpoint
ALTER TABLE "agentic_posts" DROP CONSTRAINT "agentic_posts_post_id_posts_id_fk";
--> statement-breakpoint
ALTER TABLE "agentic_posts" ALTER COLUMN "status" SET DEFAULT 'generating'::"public"."agentic_post_status";--> statement-breakpoint
ALTER TABLE "agentic_posts" ALTER COLUMN "status" SET DATA TYPE "public"."agentic_post_status" USING "status"::"public"."agentic_post_status";--> statement-breakpoint
ALTER TABLE "x_accounts" ALTER COLUMN "x_subscription_tier" SET DEFAULT 'None'::"public"."x_subscription_tier";--> statement-breakpoint
ALTER TABLE "x_accounts" ALTER COLUMN "x_subscription_tier" SET DATA TYPE "public"."x_subscription_tier" USING "x_subscription_tier"::"public"."x_subscription_tier";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "notification_settings" jsonb;--> statement-breakpoint
ALTER TABLE "agentic_posts" ADD CONSTRAINT "agentic_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agentic_posts_user_status_created_idx" ON "agentic_posts" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "analytics_refresh_runs_status_idx" ON "analytics_refresh_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_runs_post_id_status_idx" ON "job_runs" USING btree ("post_id","status");