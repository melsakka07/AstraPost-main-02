ALTER TYPE "public"."ai_generation_type" ADD VALUE 'pdf_to_thread';--> statement-breakpoint
CREATE TABLE "pdf_thread_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"status" text DEFAULT 'uploading' NOT NULL,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"page_count" integer,
	"char_count" integer,
	"extracted_text" text,
	"language" text NOT NULL,
	"tweet_count" integer DEFAULT 7 NOT NULL,
	"tone" text DEFAULT 'professional' NOT NULL,
	"attestation_at" timestamp NOT NULL,
	"thread_result" jsonb,
	"error" text,
	"quota_consumed" integer DEFAULT 0,
	"quota_released" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "pdf_thread_jobs" ADD CONSTRAINT "pdf_thread_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pdf_thread_jobs_user_idx" ON "pdf_thread_jobs" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "pdf_thread_jobs_status_idx" ON "pdf_thread_jobs" USING btree ("status");