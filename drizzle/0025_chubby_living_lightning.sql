CREATE TYPE "public"."job_run_status" AS ENUM('running', 'success', 'failed', 'retrying');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'pro_monthly', 'pro_annual', 'agency');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('draft', 'scheduled', 'published', 'failed', 'cancelled', 'awaiting_approval');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'cancelled', 'trialing');--> statement-breakpoint
ALTER TABLE "job_runs" ALTER COLUMN "status" SET DATA TYPE "public"."job_run_status" USING "status"::"public"."job_run_status";--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."post_status";--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "status" SET DATA TYPE "public"."post_status" USING "status"::"public"."post_status";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DATA TYPE "public"."plan" USING "plan"::"public"."plan";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DATA TYPE "public"."subscription_status" USING "status"::"public"."subscription_status";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "plan" SET DEFAULT 'free'::"public"."plan";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "plan" SET DATA TYPE "public"."plan" USING "plan"::"public"."plan";