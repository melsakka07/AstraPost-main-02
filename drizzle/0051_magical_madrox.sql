DROP INDEX "notifications_user_id_idx";--> statement-breakpoint
DROP INDEX "notifications_is_read_idx";--> statement-breakpoint
CREATE INDEX "notifications_user_read_created_idx" ON "notifications" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "analytics_x_tweet_id_idx" ON "tweet_analytics" USING btree ("x_tweet_id");--> statement-breakpoint
CREATE INDEX "tweets_x_tweet_id_idx" ON "tweets" USING btree ("x_tweet_id");