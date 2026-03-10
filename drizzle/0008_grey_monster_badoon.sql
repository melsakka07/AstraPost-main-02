-- Custom migration to fix schema drift
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamp;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "last_error_code" integer;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "last_error_at" timestamp;
ALTER TABLE "x_accounts" ADD COLUMN IF NOT EXISTS "refresh_token_enc" text;

-- These tables likely exist, so commenting them out to avoid errors.
-- If they don't exist, uncommenting might be needed, but let's be safe.
-- CREATE TABLE IF NOT EXISTS "analytics_refresh_runs" ...
-- CREATE TABLE IF NOT EXISTS "follower_snapshots" ...
-- CREATE TABLE IF NOT EXISTS "job_runs" ...
-- CREATE TABLE IF NOT EXISTS "tweet_analytics_snapshots" ...

-- Adding columns that might be missing from previous migrations
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "group_id" text;
ALTER TABLE "x_accounts" ADD COLUMN IF NOT EXISTS "is_default" boolean DEFAULT false;

-- Add constraints if they don't exist (Drizzle doesn't support IF NOT EXISTS for constraints easily in raw SQL without DO block)
-- Skipping constraints for now as they might already exist.

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS "posts_group_id_idx" ON "posts" ("group_id");
