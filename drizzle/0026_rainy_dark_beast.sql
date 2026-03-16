CREATE TYPE "public"."analytics_run_status" AS ENUM('running', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."feedback_category" AS ENUM('feature', 'bug', 'other');--> statement-breakpoint
CREATE TYPE "public"."feedback_status" AS ENUM('pending', 'planned', 'in_progress', 'completed', 'declined');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('twitter', 'linkedin', 'instagram');--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('tweet', 'thread', 'linkedin_post', 'instagram_post');--> statement-breakpoint
CREATE TYPE "public"."recurrence_pattern" AS ENUM('daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('admin', 'editor', 'viewer');--> statement-breakpoint
ALTER TABLE "analytics_refresh_runs" ALTER COLUMN "platform" SET DEFAULT 'twitter'::"public"."platform";--> statement-breakpoint
ALTER TABLE "analytics_refresh_runs" ALTER COLUMN "platform" SET DATA TYPE "public"."platform" USING "platform"::"public"."platform";--> statement-breakpoint
ALTER TABLE "analytics_refresh_runs" ALTER COLUMN "status" SET DEFAULT 'running'::"public"."analytics_run_status";--> statement-breakpoint
ALTER TABLE "analytics_refresh_runs" ALTER COLUMN "status" SET DATA TYPE "public"."analytics_run_status" USING "status"::"public"."analytics_run_status";--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "category" SET DEFAULT 'feature'::"public"."feedback_category";--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "category" SET DATA TYPE "public"."feedback_category" USING "category"::"public"."feedback_category";--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."feedback_status";--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "status" SET DATA TYPE "public"."feedback_status" USING "status"::"public"."feedback_status";--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "platform" SET DEFAULT 'twitter'::"public"."platform";--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "platform" SET DATA TYPE "public"."platform" USING "platform"::"public"."platform";--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "type" SET DEFAULT 'tweet'::"public"."post_type";--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "type" SET DATA TYPE "public"."post_type" USING "type"::"public"."post_type";--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "recurrence_pattern" SET DATA TYPE "public"."recurrence_pattern" USING "recurrence_pattern"::"public"."recurrence_pattern";--> statement-breakpoint
ALTER TABLE "team_invitations" ALTER COLUMN "role" SET DEFAULT 'viewer'::"public"."team_role";--> statement-breakpoint
ALTER TABLE "team_invitations" ALTER COLUMN "role" SET DATA TYPE "public"."team_role" USING "role"::"public"."team_role";--> statement-breakpoint
ALTER TABLE "team_invitations" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."invitation_status";--> statement-breakpoint
ALTER TABLE "team_invitations" ALTER COLUMN "status" SET DATA TYPE "public"."invitation_status" USING "status"::"public"."invitation_status";--> statement-breakpoint
ALTER TABLE "team_members" ALTER COLUMN "role" SET DEFAULT 'viewer'::"public"."team_role";--> statement-breakpoint
ALTER TABLE "team_members" ALTER COLUMN "role" SET DATA TYPE "public"."team_role" USING "role"::"public"."team_role";