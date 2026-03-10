ALTER TABLE "x_accounts" ADD COLUMN IF NOT EXISTS "is_default" boolean DEFAULT false;

ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "group_id" text;
CREATE INDEX IF NOT EXISTS "posts_group_id_idx" ON "posts" ("group_id");

CREATE TABLE IF NOT EXISTS "follower_snapshots" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "x_account_id" text NOT NULL REFERENCES "x_accounts"("id") ON DELETE cascade,
  "followers_count" integer NOT NULL,
  "captured_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "follower_snapshots_user_id_idx" ON "follower_snapshots" ("user_id");
CREATE INDEX IF NOT EXISTS "follower_snapshots_account_time_idx" ON "follower_snapshots" ("x_account_id", "captured_at");

CREATE TABLE IF NOT EXISTS "analytics_refresh_runs" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "x_account_id" text NOT NULL REFERENCES "x_accounts"("id") ON DELETE cascade,
  "status" text DEFAULT 'running',
  "error" text,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "finished_at" timestamp
);

CREATE INDEX IF NOT EXISTS "analytics_refresh_runs_user_id_idx" ON "analytics_refresh_runs" ("user_id");
CREATE INDEX IF NOT EXISTS "analytics_refresh_runs_account_time_idx" ON "analytics_refresh_runs" ("x_account_id", "started_at");

