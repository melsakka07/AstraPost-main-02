CREATE TABLE "agentic_posts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"x_account_id" text NOT NULL,
	"topic" text NOT NULL,
	"research_brief" jsonb,
	"content_plan" jsonb,
	"tweets" jsonb,
	"quality_score" integer,
	"summary" text,
	"status" varchar(30) DEFAULT 'generating' NOT NULL,
	"post_id" text,
	"correlation_id" varchar(36),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agentic_posts" ADD CONSTRAINT "agentic_posts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agentic_posts" ADD CONSTRAINT "agentic_posts_x_account_id_x_accounts_id_fk" FOREIGN KEY ("x_account_id") REFERENCES "public"."x_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agentic_posts" ADD CONSTRAINT "agentic_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agentic_posts_user_id_idx" ON "agentic_posts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agentic_posts_status_idx" ON "agentic_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agentic_posts_x_account_id_idx" ON "agentic_posts" USING btree ("x_account_id");