CREATE TABLE "linkedin_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"linkedin_user_id" text NOT NULL,
	"linkedin_name" text NOT NULL,
	"linkedin_avatar_url" text,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"refresh_token_enc" text,
	"token_expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "linkedin_accounts_linkedin_user_id_unique" UNIQUE("linkedin_user_id")
);
--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "x_account_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "linkedin_account_id" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "platform" text DEFAULT 'twitter';--> statement-breakpoint
ALTER TABLE "linkedin_accounts" ADD CONSTRAINT "linkedin_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "linkedin_accounts_user_id_idx" ON "linkedin_accounts" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_linkedin_account_id_linkedin_accounts_id_fk" FOREIGN KEY ("linkedin_account_id") REFERENCES "public"."linkedin_accounts"("id") ON DELETE cascade ON UPDATE no action;