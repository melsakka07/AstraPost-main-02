ALTER TABLE "posts" ADD COLUMN "deleted_at" timestamp;
CREATE INDEX "posts_deleted_at_idx" on "posts" ("deleted_at");
