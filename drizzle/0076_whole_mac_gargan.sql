ALTER TABLE "x_accounts" ADD COLUMN "consecutive_refresh_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "x_accounts" ADD COLUMN "last_refresh_failure_at" timestamp;--> statement-breakpoint
ALTER TABLE "x_accounts" ADD COLUMN "refresh_failure_reason" text;