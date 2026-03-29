ALTER TABLE "feedback" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."feedback_status";--> statement-breakpoint
CREATE TYPE "public"."feedback_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."feedback_status";--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "status" SET DATA TYPE "public"."feedback_status" USING "status"::"public"."feedback_status";--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "admin_notes" text;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "reviewed_at" timestamp;