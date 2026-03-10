CREATE TABLE IF NOT EXISTS "job_runs" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "queue_name" text NOT NULL,
  "job_id" text NOT NULL,
  "correlation_id" text,
  "post_id" text REFERENCES "posts"("id") ON DELETE set null,
  "status" text NOT NULL,
  "attempts" integer,
  "attempts_made" integer,
  "error" text,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "finished_at" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "job_runs_queue_job_unique" ON "job_runs" ("queue_name", "job_id");
CREATE INDEX IF NOT EXISTS "job_runs_user_id_idx" ON "job_runs" ("user_id");
CREATE INDEX IF NOT EXISTS "job_runs_status_idx" ON "job_runs" ("status");
CREATE INDEX IF NOT EXISTS "job_runs_started_at_idx" ON "job_runs" ("started_at");

