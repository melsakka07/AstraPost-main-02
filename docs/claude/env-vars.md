# Environment Variables

## Required

- `POSTGRES_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — 32-char random string
- `BETTER_AUTH_URL` — App URL (e.g., http://localhost:3000)
- `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` — X OAuth
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
- `CRON_SECRET` — Secure cron endpoint execution
- `TWITTER_DRY_RUN` — If set, bypasses actual publishing to X
- `NODE_ENV` — `development`, `production`, `test`
