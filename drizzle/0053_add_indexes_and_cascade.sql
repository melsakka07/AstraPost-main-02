ALTER TABLE "agentic_posts" DROP CONSTRAINT "agentic_posts_post_id_posts_id_fk";
--> statement-breakpoint
ALTER TABLE "agentic_posts" ADD CONSTRAINT "agentic_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_post_id_idx" ON "media" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "media_user_id_idx" ON "media" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "media_tweet_id_idx" ON "media" USING btree ("tweet_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "posts_user_status_idx" ON "posts" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "posts_status_created_idx" ON "posts" USING btree ("status","created_at");