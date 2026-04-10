CREATE TABLE "plan_change_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"old_plan" "plan",
	"new_plan" "plan" NOT NULL,
	"reason" text NOT NULL,
	"stripe_subscription_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "trial_end" timestamp;--> statement-breakpoint
ALTER TABLE "plan_change_log" ADD CONSTRAINT "plan_change_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_change_log_user_id_idx" ON "plan_change_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plan_change_log_created_at_idx" ON "plan_change_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_created_idx" ON "subscriptions" USING btree ("user_id","created_at");