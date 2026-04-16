import Stripe from "stripe";
import { logger } from "@/lib/logger";

if (!process.env.STRIPE_SECRET_KEY) {
  logger.warn("stripe_secret_key_missing", {
    message: "STRIPE_SECRET_KEY is not set — all billing features are disabled.",
  });
}

/**
 * Stripe client singleton.
 * Null when STRIPE_SECRET_KEY is not set (e.g. local dev without billing).
 * Import this instead of creating `new Stripe(...)` in every route.
 */
export const stripe: Stripe | null = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      appInfo: { name: "AstraPost", version: "1.0.0" },
    })
  : null;
