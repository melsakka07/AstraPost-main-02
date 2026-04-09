DROP INDEX "user_referral_code_idx";--> statement-breakpoint
CREATE INDEX "user_referred_by_idx" ON "user" USING btree ("referred_by");