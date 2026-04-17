CREATE TABLE IF NOT EXISTS "failed_jobs" (
  "id" text PRIMARY KEY NOT NULL,
  "job_name" text NOT NULL,
  "job_data" jsonb NOT NULL,
  "error_message" text NOT NULL,
  "failure_count" integer NOT NULL DEFAULT 1,
  "correlation_id" text,
  "post_id" text REFERENCES "posts"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "last_attempt_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "failed_jobs_user_id_idx" ON "failed_jobs" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "failed_jobs_created_at_idx" ON "failed_jobs" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "failed_jobs_job_name_idx" ON "failed_jobs" USING btree ("job_name");
