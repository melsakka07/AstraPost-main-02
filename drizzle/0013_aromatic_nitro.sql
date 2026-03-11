CREATE TABLE "affiliate_clicks" (
	"id" text PRIMARY KEY NOT NULL,
	"affiliate_link_id" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"country" text,
	"referer" text,
	"clicked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "affiliate_links" RENAME COLUMN "amazon_product_url" TO "destination_url";--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD COLUMN "short_code" text;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD COLUMN "platform" text DEFAULT 'amazon';--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD COLUMN "clicks" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tweet_analytics" ADD COLUMN "performance_score" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tweet_analytics_snapshots" ADD COLUMN "performance_score" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_affiliate_link_id_affiliate_links_id_fk" FOREIGN KEY ("affiliate_link_id") REFERENCES "public"."affiliate_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "affiliate_clicks_link_id_idx" ON "affiliate_clicks" USING btree ("affiliate_link_id");--> statement-breakpoint
CREATE INDEX "affiliate_clicks_clicked_at_idx" ON "affiliate_clicks" USING btree ("clicked_at");--> statement-breakpoint
CREATE INDEX "affiliate_links_user_id_idx" ON "affiliate_links" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_links_short_code_idx" ON "affiliate_links" USING btree ("short_code");--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_short_code_unique" UNIQUE("short_code");