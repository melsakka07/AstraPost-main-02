CREATE TABLE "team_x_budget_counters" (
	"team_id" text PRIMARY KEY NOT NULL,
	"period_start" timestamp NOT NULL,
	"used_micro" integer DEFAULT 0 NOT NULL,
	"limit_micro" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "x_api_usage_log" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"action" text NOT NULL,
	"cost_micro" integer NOT NULL,
	"endpoint" text,
	"correlation_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_x_budget_counters" ADD CONSTRAINT "team_x_budget_counters_team_id_user_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "x_api_usage_log_team_created_idx" ON "x_api_usage_log" USING btree ("team_id","created_at");--> statement-breakpoint
CREATE INDEX "x_api_usage_log_created_idx" ON "x_api_usage_log" USING btree ("created_at");