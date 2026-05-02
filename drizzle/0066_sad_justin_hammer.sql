ALTER TABLE "ai_generations" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD COLUMN "sub_feature" text;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD COLUMN "cost_estimate_cents" integer;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD COLUMN "prompt_version" text;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD COLUMN "feedback" text;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD COLUMN "latency_ms" integer;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD COLUMN "fallback_used" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "ai_gen_model_idx" ON "ai_generations" USING btree ("model");--> statement-breakpoint
CREATE INDEX "ai_gen_sub_feature_idx" ON "ai_generations" USING btree ("sub_feature");