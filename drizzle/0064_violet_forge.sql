CREATE TABLE "user_ai_counters" (
	"user_id" text PRIMARY KEY NOT NULL,
	"period_start" timestamp NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"limit" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_ai_counters" ADD CONSTRAINT "user_ai_counters_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;