-- First, update any existing NULL values to 'active' to prevent constraint violation
UPDATE "subscriptions" SET "status" = 'active' WHERE "status" IS NULL;--> statement-breakpoint
-- Then set the default value for future inserts
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
-- Finally, apply the NOT NULL constraint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET NOT NULL;