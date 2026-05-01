CREATE TABLE "moderation_flag" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"generation_id" text,
	"categories" text[] NOT NULL,
	"snippet" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "moderation_flag" ADD CONSTRAINT "moderation_flag_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_flag_user_id_idx" ON "moderation_flag" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "moderation_flag_created_at_idx" ON "moderation_flag" USING btree ("created_at");