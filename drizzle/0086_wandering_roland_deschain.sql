CREATE TABLE "inspiration_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_tweet_id" text NOT NULL,
	"source_tweet_url" text NOT NULL,
	"source_author_handle" text NOT NULL,
	"source_text" text NOT NULL,
	"adapted_text" text,
	"action" text,
	"tone" text,
	"language" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inspiration_history" ADD CONSTRAINT "inspiration_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inspiration_history_user_id_idx" ON "inspiration_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inspiration_history_created_at_idx" ON "inspiration_history" USING btree ("created_at");