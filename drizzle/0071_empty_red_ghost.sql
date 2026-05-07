ALTER TYPE "public"."ai_generation_type" ADD VALUE IF NOT EXISTS 'trends_discovery' BEFORE 'agentic_approve';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "youtube_thread_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"youtube_url" text NOT NULL,
	"youtube_video_id" text NOT NULL,
	"provider" text NOT NULL,
	"language" text NOT NULL,
	"tweet_count" integer DEFAULT 8 NOT NULL,
	"duration_seconds" integer,
	"transcript" text,
	"thread_result" jsonb,
	"error" text,
	"audio_blob_path" text,
	"quota_consumed" integer DEFAULT 0,
	"quota_released" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "youtube_thread_jobs" ADD CONSTRAINT "youtube_thread_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "yt_thread_jobs_user_idx" ON "youtube_thread_jobs" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "yt_thread_jobs_status_idx" ON "youtube_thread_jobs" USING btree ("status");
