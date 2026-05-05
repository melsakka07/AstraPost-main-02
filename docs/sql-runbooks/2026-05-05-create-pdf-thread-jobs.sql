-- Idempotent runbook to create pdf_thread_jobs and (best-effort) extend the
-- ai_generation_type ENUM with the 'pdf_to_thread' value.
--
-- Why this exists: local dev DB drifted from drizzle migrations (some applied
-- via db:push, several migration files never ran). pnpm db:migrate fails on
-- 0066 ("column model already exists"). This runbook applies only the SQL the
-- pdf-to-thread feature needs, without depending on the broken migration chain.
--
-- Apply with: node scripts/apply-pdf-thread-runbook.mjs
-- (uses POSTGRES_URL from .env)

-- 1. Add 'pdf_to_thread' to the ai_generation_type ENUM only if the type IS
--    a real ENUM in this DB. (In some local DBs it is still TEXT.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_generation_type' AND typtype = 'e')
     AND NOT EXISTS (
       SELECT 1 FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'ai_generation_type' AND e.enumlabel = 'pdf_to_thread'
     )
  THEN
    EXECUTE 'ALTER TYPE "public"."ai_generation_type" ADD VALUE ''pdf_to_thread''';
  END IF;
END
$$;

-- 2. Create the pdf_thread_jobs table.
CREATE TABLE IF NOT EXISTS "pdf_thread_jobs" (
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

-- 3. FK + indexes (guard with IF NOT EXISTS / DO blocks for idempotency).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pdf_thread_jobs_user_id_user_id_fk'
  ) THEN
    ALTER TABLE "pdf_thread_jobs"
      ADD CONSTRAINT "pdf_thread_jobs_user_id_user_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "pdf_thread_jobs_user_idx"
  ON "pdf_thread_jobs" USING btree ("user_id", "created_at" DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS "pdf_thread_jobs_status_idx"
  ON "pdf_thread_jobs" USING btree ("status");
