ALTER TABLE "x_accounts" ADD COLUMN "x_subscription_tier" text DEFAULT 'None';--> statement-breakpoint
ALTER TABLE "x_accounts" ADD COLUMN "x_subscription_tier_updated_at" timestamp;