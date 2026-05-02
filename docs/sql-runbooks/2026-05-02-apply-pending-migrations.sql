-- =============================================================================
-- Production DB Migration Runbook — 2026-05-02
-- Apply pending migrations 0062, 0064, 0065 (and 0063 enum values) to production.
-- Context: Vercel build skipped migrations; X OAuth was failing because
--          column "user.last_active_at" did not exist (already fixed separately).
-- Run each STEP in order. Steps 1 and 5 are read-only verification.
-- =============================================================================


-- =============================================================================
-- STEP 1 — Verify current state (READ-ONLY)
-- =============================================================================
-- Run this first. Any value returning `false` = migration not yet applied.

SELECT
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name='posts' AND column_name='deleted_at') AS posts_deleted_at,
  EXISTS (SELECT 1 FROM pg_indexes
          WHERE tablename='posts' AND indexname='posts_deleted_at_idx') AS posts_deleted_at_idx,
  EXISTS (SELECT 1 FROM information_schema.tables
          WHERE table_name='user_ai_counters') AS user_ai_counters_table,
  EXISTS (SELECT 1 FROM information_schema.tables
          WHERE table_name='moderation_flag') AS moderation_flag_table,
  'user_update'    = ANY(enum_range(NULL::admin_audit_action)::text[]) AS enum_user_update,
  'post_update'    = ANY(enum_range(NULL::admin_audit_action)::text[]) AS enum_post_update,
  'webhook_replay' = ANY(enum_range(NULL::admin_audit_action)::text[]) AS enum_webhook_replay;


-- =============================================================================
-- STEP 2 — Apply 0062_add_posts_deleted_at + 0064 + 0065
-- =============================================================================
-- Idempotent (IF NOT EXISTS guards) — safe to run even if partially applied.
-- Run as ONE block.

-- 0062_add_posts_deleted_at
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
CREATE INDEX IF NOT EXISTS "posts_deleted_at_idx" ON "posts" ("deleted_at");

-- 0064_violet_forge — user_ai_counters
CREATE TABLE IF NOT EXISTS "user_ai_counters" (
  "user_id"      text PRIMARY KEY NOT NULL,
  "period_start" timestamp NOT NULL,
  "used"         integer DEFAULT 0 NOT NULL,
  "limit"        integer NOT NULL,
  "updated_at"   timestamp DEFAULT now() NOT NULL
);
DO $$ BEGIN
  ALTER TABLE "user_ai_counters"
    ADD CONSTRAINT "user_ai_counters_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 0065_lowly_spyke — moderation_flag
CREATE TABLE IF NOT EXISTS "moderation_flag" (
  "id"            text PRIMARY KEY NOT NULL,
  "user_id"       text NOT NULL,
  "generation_id" text,
  "categories"    text[] NOT NULL,
  "snippet"       text NOT NULL,
  "created_at"    timestamp DEFAULT now() NOT NULL
);
DO $$ BEGIN
  ALTER TABLE "moderation_flag"
    ADD CONSTRAINT "moderation_flag_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "moderation_flag_user_id_idx"   ON "moderation_flag" ("user_id");
CREATE INDEX IF NOT EXISTS "moderation_flag_created_at_idx" ON "moderation_flag" ("created_at");


-- =============================================================================
-- STEP 3 — Apply 0063_left_eternals (enum values)
-- =============================================================================
-- IMPORTANT: Postgres requires each ALTER TYPE ... ADD VALUE to run on its
-- OWN, OUTSIDE any transaction. Run each statement separately.

ALTER TYPE "admin_audit_action" ADD VALUE IF NOT EXISTS 'user_update';

-- (run separately)
ALTER TYPE "admin_audit_action" ADD VALUE IF NOT EXISTS 'post_update';

-- (run separately)
ALTER TYPE "admin_audit_action" ADD VALUE IF NOT EXISTS 'webhook_replay';


-- =============================================================================
-- STEP 4 — Manual smoke test (no SQL)
-- =============================================================================
-- 1. Open https://astrapost.vercel.app/login in an incognito window
-- 2. Click "Sign in with X"
-- 3. Approve on x.com
-- 4. Confirm redirect lands on /dashboard (NOT /api/auth/error)


-- =============================================================================
-- STEP 5 — Re-run STEP 1 verification
-- =============================================================================
-- All 7 boolean columns should now return TRUE.

SELECT
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name='posts' AND column_name='deleted_at') AS posts_deleted_at,
  EXISTS (SELECT 1 FROM pg_indexes
          WHERE tablename='posts' AND indexname='posts_deleted_at_idx') AS posts_deleted_at_idx,
  EXISTS (SELECT 1 FROM information_schema.tables
          WHERE table_name='user_ai_counters') AS user_ai_counters_table,
  EXISTS (SELECT 1 FROM information_schema.tables
          WHERE table_name='moderation_flag') AS moderation_flag_table,
  'user_update'    = ANY(enum_range(NULL::admin_audit_action)::text[]) AS enum_user_update,
  'post_update'    = ANY(enum_range(NULL::admin_audit_action)::text[]) AS enum_post_update,
  'webhook_replay' = ANY(enum_range(NULL::admin_audit_action)::text[]) AS enum_webhook_replay;
