CREATE TABLE "inspiration_bookmarks" (
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
ALTER TABLE "posts" ADD COLUMN "inspired_by_tweet_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "preferred_image_model" text DEFAULT 'nano-banana-2';--> statement-breakpoint
ALTER TABLE "inspiration_bookmarks" ADD CONSTRAINT "inspiration_bookmarks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inspiration_bookmarks_user_id_idx" ON "inspiration_bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inspiration_bookmarks_source_tweet_id_idx" ON "inspiration_bookmarks" USING btree ("source_tweet_id");