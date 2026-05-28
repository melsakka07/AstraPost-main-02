CREATE TABLE IF NOT EXISTS "notification_dismissals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"notification_key" text NOT NULL,
	"dismissed_at" timestamp DEFAULT now() NOT NULL,
	"snapshot_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "notification_dismissals" ADD CONSTRAINT "notification_dismissals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nd_user_key_unique" ON "notification_dismissals" USING btree ("user_id","notification_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nd_user_id_idx" ON "notification_dismissals" USING btree ("user_id");
