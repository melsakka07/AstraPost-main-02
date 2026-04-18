
CREATE TABLE "failed_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"job_name" text NOT NULL,
	"job_data" jsonb NOT NULL,
	"error_message" text NOT NULL,
	"failure_count" integer DEFAULT 1 NOT NULL,
	"correlation_id" text,
	"post_id" text,
	"user_id" text NOT NULL,
	"last_attempt_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_dead_letter_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"event_data" jsonb NOT NULL,
	"error_message" text,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"failed_at" timestamp DEFAULT now() NOT NULL,
	"moved_to_dlq_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" text,
	"resolution" text,
	"notes" text,
	"request_body" text,
	"request_signature" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_dead_letter_queue_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_delivery_log" (
	"id" text PRIMARY KEY NOT NULL,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"status" text NOT NULL,
	"status_code" integer,
	"processing_time_ms" integer,
	"error_message" text,
	"request_body" text,
	"request_signature" text,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

DROP INDEX IF EXISTS "session_token_idx";--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD COLUMN "ip_hash" text;--> statement-breakpoint
ALTER TABLE "failed_jobs" ADD CONSTRAINT "failed_jobs_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failed_jobs" ADD CONSTRAINT "failed_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "failed_jobs_user_id_idx" ON "failed_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "failed_jobs_created_at_idx" ON "failed_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "failed_jobs_job_name_idx" ON "failed_jobs" USING btree ("job_name");--> statement-breakpoint
CREATE INDEX "webhook_delivery_log_event_id_idx" ON "webhook_delivery_log" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "webhook_delivery_log_processed_at_idx" ON "webhook_delivery_log" USING btree ("processed_at");