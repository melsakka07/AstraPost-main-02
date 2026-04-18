DROP INDEX IF EXISTS "notifications_user_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "notifications_is_read_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_read_created_idx" ON "notifications" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_x_tweet_id_idx" ON "tweet_analytics" USING btree ("x_tweet_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tweets_x_tweet_id_idx" ON "tweets" USING btree ("x_tweet_id");