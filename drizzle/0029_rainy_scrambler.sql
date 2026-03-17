CREATE TABLE "processed_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"stripe_event_id" text NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "processed_webhook_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
ALTER TABLE "linkedin_accounts" DROP COLUMN IF EXISTS "refresh_token";--> statement-breakpoint
ALTER TABLE "x_accounts" DROP COLUMN IF EXISTS "refresh_token";