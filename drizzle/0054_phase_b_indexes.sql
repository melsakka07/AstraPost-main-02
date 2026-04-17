CREATE INDEX "ai_gen_user_created_idx" ON "ai_generations" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verification_identifier_expires_idx" ON "verification" USING btree ("identifier","expires_at");
