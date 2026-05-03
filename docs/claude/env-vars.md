# Environment Variables

> Source of truth: `.env.example` (50+ variables, fully documented and grouped by category) and `src/lib/env.ts` (Zod-validated runtime checks).

## Required

- `POSTGRES_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — 32-char random string
- `BETTER_AUTH_URL` — App URL (e.g., http://localhost:3000)
- `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` — X OAuth
- `INSTAGRAM_CLIENT_ID` / `INSTAGRAM_CLIENT_SECRET` — Instagram OAuth
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` — LinkedIn OAuth
- `TOKEN_ENCRYPTION_KEYS` — Comma-separated 32-byte base64 keys
- `OPENROUTER_API_KEY` — OpenRouter API key
- `OPENROUTER_MODEL` — Default model identifier (e.g., `anthropic/claude-sonnet-4.6`)
- `REPLICATE_MODEL_FAST` / `REPLICATE_MODEL_PRO` / `REPLICATE_MODEL_FALLBACK` — Image model identifiers (must be distinct — Phase 0 `T2`)
- `REDIS_URL` — Redis for BullMQ + idempotency cache + Replicate poll metadata
- `NEXT_PUBLIC_APP_URL` — Public app URL

## Optional

### AI Models (OpenRouter cascading fallbacks)

- `OPENROUTER_MODEL_FREE` — Cheap/free model for quota-free endpoints (e.g. `deepseek/deepseek-v3.2`)
- `OPENROUTER_MODEL_AGENTIC` — Dedicated model for the Agentic Posting writer step
- `OPENROUTER_MODEL_AGENTIC_REVIEWER` — Reviewer model (different family from writer; Phase 0 `P10`/`P11` quality gate ≥7)
- `OPENROUTER_MODEL_TRENDS` — Web-search-capable model for trends discovery (e.g. `perplexity/sonar`)

### AI Auxiliary Providers

- `OPENAI_API_KEY` — Used for embeddings (pgvector) and content moderation API
- `OPENAI_EMBEDDING_MODEL` — Embedding model (default: `text-embedding-3-large`)
- `OPENAI_MODERATION_MODEL` — Moderation model (default: `omni-moderation-latest`) — backs `src/lib/services/moderation.ts` (Phase 1 `S1`)
- `GEMINI_API_KEY` / `GOOGLE_AI_API_KEY` — Google Gemini API (optional alternative provider)

### Image Generation

- `REPLICATE_API_TOKEN` — Replicate API (optional locally, required in production for AI Images)
- `REPLICATE_MODEL_ADVANCED` — Agency-tier image model (default: `openai/gpt-image-2`)

### Cost Guardrails

- `AI_DAILY_BUDGET_USD` — Daily AI cost cap; triggers Resend email alert when exceeded (Phase 0 `B4`, cron at `/api/cron/ai-cost-alarm`)

### Billing & Infrastructure

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`, `STRIPE_PRICE_ID_AGENCY_MONTHLY`, `STRIPE_PRICE_ID_AGENCY_ANNUAL` — Billing
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob (production storage)
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — Email (welcome, schedule confirmation, failure, trial extension)
- `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` — Error tracking via Sentry
- `CRON_SECRET` — Bearer token for `/api/cron/*` endpoints (billing-cleanup, ai-cost-alarm, ai-counter-rollover)
- `TWITTER_BEARER_TOKEN` — App-only bearer token for tweet import + Competitor Analyzer
- `TWITTER_DRY_RUN` — If set, bypasses actual publishing to X (smoke-test mode)
- `DIAGNOSTICS_TOKEN` — Token required for full diagnostics endpoint response (without token, only status is returned)
- `PLAN_CHANGE_LOG_RETENTION_YEARS` — Retention period for plan change audit logs in years (default: 7)
- `NODE_ENV` — `development`, `production`, `test`
