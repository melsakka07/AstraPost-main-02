CREATE TABLE IF NOT EXISTS "tweet_analytics_snapshots" (
  "id" text PRIMARY KEY,
  "tweet_id" text NOT NULL REFERENCES "tweets"("id") ON DELETE cascade,
  "x_tweet_id" text NOT NULL,
  "impressions" integer DEFAULT 0,
  "likes" integer DEFAULT 0,
  "retweets" integer DEFAULT 0,
  "replies" integer DEFAULT 0,
  "link_clicks" integer DEFAULT 0,
  "engagement_rate" numeric(5, 2) DEFAULT '0.00',
  "fetched_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "analytics_tweet_id_unique" ON "tweet_analytics" ("tweet_id");
CREATE INDEX IF NOT EXISTS "analytics_snapshots_tweet_id_idx" ON "tweet_analytics_snapshots" ("tweet_id");
CREATE INDEX IF NOT EXISTS "analytics_snapshots_fetched_at_idx" ON "tweet_analytics_snapshots" ("fetched_at");

