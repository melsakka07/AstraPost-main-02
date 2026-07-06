CREATE TYPE "public"."inbox_item_type" AS ENUM('mention', 'reply', 'quote');--> statement-breakpoint
CREATE TABLE "inbox_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"x_account_id" text NOT NULL,
	"type" "inbox_item_type" NOT NULL,
	"source_tweet_id" text NOT NULL,
	"source_author_id" text,
	"source_author_handle" text NOT NULL,
	"source_author_name" text,
	"source_author_avatar_url" text,
	"source_text" text NOT NULL,
	"your_tweet_id" text,
	"your_tweet_text" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_replied" boolean DEFAULT false NOT NULL,
	"ai_replied" boolean DEFAULT false NOT NULL,
	"x_created_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_items" ADD CONSTRAINT "inbox_items_x_account_id_x_accounts_id_fk" FOREIGN KEY ("x_account_id") REFERENCES "public"."x_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_items_source_tweet_x_account_unique" ON "inbox_items" USING btree ("source_tweet_id","x_account_id");--> statement-breakpoint
CREATE INDEX "inbox_items_user_read_created_idx" ON "inbox_items" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "inbox_items_x_account_created_idx" ON "inbox_items" USING btree ("x_account_id","created_at");--> statement-breakpoint
CREATE INDEX "inbox_items_user_archived_created_idx" ON "inbox_items" USING btree ("user_id","is_archived","created_at");