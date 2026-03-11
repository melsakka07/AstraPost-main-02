CREATE TABLE "instagram_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"instagram_user_id" text NOT NULL,
	"instagram_username" text NOT NULL,
	"instagram_avatar_url" text,
	"access_token" text NOT NULL,
	"token_expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "instagram_accounts_instagram_user_id_unique" UNIQUE("instagram_user_id")
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "instagram_account_id" text;--> statement-breakpoint
ALTER TABLE "instagram_accounts" ADD CONSTRAINT "instagram_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "instagram_accounts_user_id_idx" ON "instagram_accounts" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_instagram_account_id_instagram_accounts_id_fk" FOREIGN KEY ("instagram_account_id") REFERENCES "public"."instagram_accounts"("id") ON DELETE cascade ON UPDATE no action;