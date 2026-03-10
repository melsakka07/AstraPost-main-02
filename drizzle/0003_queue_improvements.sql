ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "last_error_code" integer;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "last_error_at" timestamp;

