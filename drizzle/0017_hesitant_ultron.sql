ALTER TABLE "posts" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_secret" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_backup_codes" text;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_idempotency_key_unique" UNIQUE("idempotency_key");