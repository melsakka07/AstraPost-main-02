DROP INDEX "notifications_user_unread_idx";--> statement-breakpoint
CREATE INDEX "posts_x_account_id_idx" ON "posts" USING btree ("x_account_id");