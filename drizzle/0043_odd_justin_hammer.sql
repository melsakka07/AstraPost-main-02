ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DEFAULT 'free';--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "processed_webhook_events" ADD COLUMN "event_type" text;--> statement-breakpoint
ALTER TABLE "processed_webhook_events" ADD COLUMN "retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "processed_webhook_events" ADD COLUMN "error_message" text;