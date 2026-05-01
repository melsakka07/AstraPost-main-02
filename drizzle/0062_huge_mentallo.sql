ALTER TABLE "notifications" ADD COLUMN "admin_status" text DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "target_type" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_active_at" timestamp;