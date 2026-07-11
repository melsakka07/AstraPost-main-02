CREATE INDEX "job_runs_status_started_idx" ON "job_runs" USING btree ("status","started_at");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");