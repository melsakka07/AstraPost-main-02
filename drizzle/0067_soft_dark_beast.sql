CREATE TABLE "ai_quota_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"remaining" integer NOT NULL,
	"granted_by" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_quota_grants" ADD CONSTRAINT "ai_quota_grants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_quota_grants" ADD CONSTRAINT "ai_quota_grants_granted_by_user_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_quota_grants_user_id_idx" ON "ai_quota_grants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_quota_grants_granted_by_idx" ON "ai_quota_grants" USING btree ("granted_by");--> statement-breakpoint
CREATE INDEX "ai_quota_grants_user_remaining_idx" ON "ai_quota_grants" USING btree ("user_id","remaining");