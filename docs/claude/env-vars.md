# Environment Variables

## Required

- `POSTGRES_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — 32-char random string
- `BETTER_AUTH_URL` — App URL (e.g., http://localhost:3000)
- `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` — X OAuth
- `INSTAGRAM_CLIENT_ID` / `INSTAGRAM_CLIENT_SECRET` — Instagram OAuth
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` — LinkedIn OAuth
- `TOKEN_ENCRYPTION_KEYS` — Comma-separated 32-byte base64 keys
- `OPENROUTER_API_KEY` — OpenRouter API key
- `OPENROUTER_MODEL` — Model identifier (e.g., `openai/gpt-4o`)
- `REPLICATE_MODEL_FAST` / `REPLICATE_MODEL_PRO` / `REPLICATE_MODEL_FALLBACK` — Image model identifiers
- `REDIS_URL` — Redis for BullMQ
- `NEXT_PUBLIC_APP_URL` — Public app URL

## Optional

- `OPENROUTER_MODEL_FREE` — Cheap/free model for quota-free endpoints (e.g. `deepseek/deepseek-v3.2`)
- `OPENROUTER_MODEL_AGENTIC` — Dedicated model for Agentic Posting pipeline
- `OPENROUTER_MODEL_TRENDS` — Web-search-capable model for trends discovery
- `REPLICATE_API_TOKEN` — Replicate API (Optional locally, required in production for AI Images)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`, `STRIPE_PRICE_ID_AGENCY_MONTHLY`, `STRIPE_PRICE_ID_AGENCY_ANNUAL` — Billing
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob (production storage)
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — Email
- `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` — Error tracking via Sentry
- `GOOGLE_GENERATIVE_AI_API_KEY` — Google Gemini API (fallback/optional)
- `CRON_SECRET` — Secure cron endpoint execution
- `TWITTER_DRY_RUN` — If set, bypasses actual publishing to X
- `DIAGNOSTICS_TOKEN` — Token required for full diagnostics endpoint response (without token, only status is returned)
- `PLAN_CHANGE_LOG_RETENTION_YEARS` — Retention period for plan change audit logs in years (default: 7)
- `NODE_ENV` — `development`, `production`, `test`
