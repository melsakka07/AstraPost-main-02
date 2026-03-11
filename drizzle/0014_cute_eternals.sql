CREATE TABLE "team_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"team_id" text NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "requires_approval" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "approved_by" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "reviewer_notes" text;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_team_id_user_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_user_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_invitations_team_id_idx" ON "team_invitations" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_invitations_email_idx" ON "team_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "team_invitations_token_idx" ON "team_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "team_members_user_id_idx" ON "team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_members_team_id_idx" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_user_team_unique" ON "team_members" USING btree ("user_id","team_id");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;