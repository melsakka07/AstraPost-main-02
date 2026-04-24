import { z } from "zod";

/**
 * Server-side environment variables schema.
 * These variables are only available on the server.
 */
const serverEnvSchema = z.object({
  // Database
  POSTGRES_URL: z.string().url("Invalid database URL"),

  // Authentication
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url().optional(),

  // OAuth
  TWITTER_CLIENT_ID: z.string().optional(),
  TWITTER_CLIENT_SECRET: z.string().optional(),

  // Security
  TOKEN_ENCRYPTION_KEYS: z.string().min(32, "TOKEN_ENCRYPTION_KEYS is required"),

  // AI - OpenRouter (text generation)
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().min(1, "OPENROUTER_MODEL is required"),
  // Optional: dedicated model for Agentic Posting pipeline. Falls back to OPENROUTER_MODEL if not set.
  OPENROUTER_MODEL_AGENTIC: z.string().optional(),
  // Optional: web-search-capable model for trends discovery (e.g. perplexity/llama-3.1-sonar-large-128k-online).
  // Falls back through OPENROUTER_MODEL_FREE → OPENROUTER_MODEL_AGENTIC → OPENROUTER_MODEL if not set.
  OPENROUTER_MODEL_TRENDS: z.string().optional(),
  // Optional: cheap/free model for quota-free endpoints (e.g. trends discovery).
  OPENROUTER_MODEL_FREE: z.string().optional(),

  // AI - Replicate (image generation)
  REPLICATE_API_TOKEN: z.string().optional(),
  REPLICATE_MODEL_FAST: z.string().min(1, "REPLICATE_MODEL_FAST is required"),
  REPLICATE_MODEL_PRO: z.string().min(1, "REPLICATE_MODEL_PRO is required"),
  REPLICATE_MODEL_FALLBACK: z.string().min(1, "REPLICATE_MODEL_FALLBACK is required"),
  REPLICATE_MODEL_ADVANCED: z.string().min(1, "REPLICATE_MODEL_ADVANCED is required"),

  // Queue
  REDIS_URL: z.string().url().default("redis://localhost:6379"),

  // Billing (Stripe)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_MONTHLY: z.string().optional(),
  STRIPE_PRICE_ID_ANNUAL: z.string().optional(),
  STRIPE_PRICE_ID_AGENCY_MONTHLY: z.string().optional(),
  STRIPE_PRICE_ID_AGENCY_ANNUAL: z.string().optional(),

  // Storage
  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  TWITTER_DRY_RUN: z.string().optional(),
});

/**
 * Client-side environment variables schema.
 * These variables are exposed to the browser via NEXT_PUBLIC_ prefix.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Validates and returns server-side environment variables.
 * Throws an error if validation fails.
 */
export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid server environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment variables");
  }

  return parsed.data;
}

/**
 * Validates and returns client-side environment variables.
 * Throws an error if validation fails.
 */
export function getClientEnv(): ClientEnv {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) {
    console.error("Invalid client environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid client environment variables");
  }

  return parsed.data;
}

/**
 * Checks if required environment variables are set.
 * Logs warnings for missing optional variables.
 */
export function checkEnv(): void {
  const warnings: string[] = [];

  // Check required variables
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is required");
  }

  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is required");
  }

  // Check optional variables and warn
  if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
    warnings.push("Twitter OAuth is not configured. Twitter login will be disabled.");
  }

  if (process.env.NODE_ENV === "production" && !process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is required in production");
  } else if (!process.env.OPENROUTER_API_KEY) {
    warnings.push("OPENROUTER_API_KEY is not set. AI chat will not work.");
  }

  if (process.env.NODE_ENV === "production" && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn(
      "CRITICAL: BLOB_READ_WRITE_TOKEN is not set in production! Falling back to local storage which will fail in serverless environments."
    );
  } else if (!process.env.BLOB_READ_WRITE_TOKEN) {
    warnings.push("BLOB_READ_WRITE_TOKEN is not set. Using local storage for file uploads.");
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    warnings.push("REPLICATE_API_TOKEN is not set. AI image generation will not work.");
  }

  if (!process.env.RESEND_API_KEY) {
    warnings.push("RESEND_API_KEY is not set. Emails will be logged to console only.");
  }

  // Stripe billing — warn loudly if any key is missing
  const stripeMissing: string[] = [];
  if (!process.env.STRIPE_SECRET_KEY) stripeMissing.push("STRIPE_SECRET_KEY");
  if (!process.env.STRIPE_WEBHOOK_SECRET) stripeMissing.push("STRIPE_WEBHOOK_SECRET");
  if (!process.env.STRIPE_PRICE_ID_MONTHLY) stripeMissing.push("STRIPE_PRICE_ID_MONTHLY");
  if (!process.env.STRIPE_PRICE_ID_ANNUAL) stripeMissing.push("STRIPE_PRICE_ID_ANNUAL");
  if (!process.env.STRIPE_PRICE_ID_AGENCY_MONTHLY)
    stripeMissing.push("STRIPE_PRICE_ID_AGENCY_MONTHLY");
  if (!process.env.STRIPE_PRICE_ID_AGENCY_ANNUAL)
    stripeMissing.push("STRIPE_PRICE_ID_AGENCY_ANNUAL");
  if (stripeMissing.length > 0) {
    warnings.push(
      `Stripe billing is partially unconfigured. Missing: ${stripeMissing.join(", ")}. Checkout and webhooks will not work.`
    );
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn("\n⚠️  Environment warnings:");
    warnings.forEach((w) => console.warn(`   - ${w}`));
    console.warn("");
  }
}
