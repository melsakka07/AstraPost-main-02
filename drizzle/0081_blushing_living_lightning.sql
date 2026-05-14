CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'annual');--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "billing_cycle" "billing_cycle";