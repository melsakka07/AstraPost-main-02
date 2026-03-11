CREATE TABLE "milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"milestone_id" text NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "referral_code" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "referred_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "referral_credits" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "milestones_user_id_idx" ON "milestones" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "milestones_user_milestone_unique" ON "milestones" USING btree ("user_id","milestone_id");--> statement-breakpoint
CREATE INDEX "user_referral_code_idx" ON "user" USING btree ("referral_code");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_referral_code_unique" UNIQUE("referral_code");