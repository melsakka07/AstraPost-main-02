DROP INDEX "analytics_tweet_id_idx";--> statement-breakpoint
DROP INDEX "user_email_idx";--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "user_id" text NOT NULL DEFAULT '';--> statement-breakpoint
UPDATE "media" m SET "user_id" = p."user_id" FROM "posts" p WHERE m."post_id" = p."id";--> statement-breakpoint
ALTER TABLE "media" ALTER COLUMN "user_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;