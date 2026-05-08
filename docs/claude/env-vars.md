# Environment Variables

> Source of truth: `.env.example` (50+ variables, fully documented and grouped by category) and `src/lib/env.ts` (Zod-validated runtime checks).

## Required

- `POSTGRES_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — 32-char random string
- `TOKEN_ENCRYPTION_KEYS` — Comma-separated 32-byte base64 keys
- `OPENROUTER_MODEL` — Model identifier for AI text generation (no default — must be set explicitly, e.g. `openai/gpt-4o`)
- `REPLICATE_MODEL_FAST` / `REPLICATE_MODEL_PRO` / `REPLICATE_MODEL_FALLBACK` / `REPLICATE_MODEL_ADVANCED` — Image model identifiers (all four are required by `serverEnvSchema`; must be distinct)

## Optional (but strongly recommended)

- `BETTER_AUTH_URL` — App URL (e.g., http://localhost:3000). Optional in schema; Better Auth auto-detects in production.
- `OPENROUTER_API_KEY` — OpenRouter API key (required in production, optional in dev)
- `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` — X OAuth 2.0 (Twitter login will be disabled if missing)
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` — LinkedIn posting integration (NOT a Better Auth provider — Agency plan only)
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` — Instagram Business posting via Facebook Graph API (NOT a Better Auth provider — posting integration only)
- `REDIS_URL` — Redis for BullMQ + idempotency cache + Replicate poll metadata (default: `redis://localhost:6379`)
- `NEXT_PUBLIC_APP_URL` — Public app URL (default: `http://localhost:3000`)

## Optional AI Models & Providers

### OpenRouter (text generation — cascading fallbacks)

- `OPENROUTER_MODEL_FREE` — Cheap/free model for quota-free endpoints (e.g. `deepseek/deepseek-v4-flash`)
- `OPENROUTER_MODEL_AGENTIC` — Dedicated model for the Agentic Posting writer step. Falls back to `OPENROUTER_MODEL` if not set.
- `OPENROUTER_MODEL_AGENTIC_REVIEWER` — Reviewer model (different family from writer). Falls back to `OPENROUTER_MODEL_AGENTIC` → `OPENROUTER_MODEL` if not set.
- `OPENROUTER_MODEL_TRENDS` — Web-search-capable model for trends discovery (e.g. `perplexity/sonar`). Falls back through `OPENROUTER_MODEL_FREE` → `OPENROUTER_MODEL_AGENTIC` → `OPENROUTER_MODEL`.
- `OPENROUTER_MODEL_PDF_TO_THREAD` — Dedicated model for PDF-to-thread generation. Falls back to `OPENROUTER_MODEL` if not set.
- `OPENROUTER_MODEL_YOUTUBE_TO_THREAD` — Dedicated model for YouTube-to-Thread generation. Optional; falls back to `OPENROUTER_MODEL` if not set. Allows cost/quality tuning for long-context transcription → thread pipelines.
- `YOUTUBE_DEEPGRAM_API_KEY` — Deepgram API key for YouTube transcription ($200 free credit at console.deepgram.com). Optional; if not set, Deepgram option is hidden from the UI. Pricing: ~$0.0059/minute — a 20-minute video costs ~$0.12; a 90-minute video costs ~$0.53. Feature warns if neither Deepgram nor Whisper (OpenAI) is configured.

### Replicate (image generation)

- `REPLICATE_API_TOKEN` — Replicate API key (optional locally, required in production for AI Images)

### OpenAI (content moderation only — documented exception to the "no OpenAI for text generation" rule)

- `OPENAI_API_KEY` — When set, enables OpenAI Moderation API as primary content check (backed by `src/lib/services/moderation.ts`). When absent, falls back to 25-pattern regex matching. This is the **only** OpenAI usage in the codebase. Also reused by YouTube-to-Thread for Whisper transcription (alongside moderation).
- `OPENAI_MODERATION_MODEL` — Moderation model (default: `omni-moderation-latest`)

### Cost Guardrails

- `AI_DAILY_BUDGET_USD` — Daily AI cost cap in USD (default: `50`). Triggers Resend email alert when exceeded (cron at `/api/cron/ai-cost-alarm`).

### Billing & Infrastructure

- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `STRIPE_PRICE_ID_MONTHLY` — Price ID for Pro Monthly plan
- `STRIPE_PRICE_ID_ANNUAL` — Price ID for Pro Annual plan
- `STRIPE_PRICE_ID_AGENCY_MONTHLY` — Price ID for Agency Monthly plan
- `STRIPE_PRICE_ID_AGENCY_ANNUAL` — Price ID for Agency Annual plan
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob (production storage; falls back to local filesystem in dev)
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — Email (welcome, schedule confirmation, failure, trial extension, token-expiring warnings, account deactivated)
- `RESEND_OPS_EMAIL` — Ops alert email recipient (falls back to `RESEND_FROM_EMAIL`); used by AI cost alarm cron
- `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` — Error tracking via Sentry
- `CRON_SECRET` — Bearer token for `/api/cron/*` endpoints (billing-cleanup, ai-cost-alarm, ai-counter-rollover)
- `TWITTER_BEARER_TOKEN` — App-only bearer token for tweet import + Competitor Analyzer
- `TWITTER_DRY_RUN` — If set, worker skips actual X API posting (for local testing / smoke tests)
- `X_CIRCUIT_THRESHOLD` — Consecutive permanent X API failures before the circuit breaker opens (default: `5`)
- `X_CIRCUIT_TIMEOUT_MS` — Duration the circuit stays open in milliseconds (default: `300000` — 5 minutes)
- `DIAGNOSTICS_TOKEN` — Token required for full diagnostics endpoint response (without token, only status is returned)
- `PLAN_CHANGE_LOG_RETENTION_YEARS` — Retention period for plan change audit logs in years. Stored as **string** (not number) — callers parse with `parseInt(… \|\| "7", 10)`. Default: `7`.
- `NODE_ENV` — `development`, `production`, `test` (default: `development`)
- `YT_DLP_PATH` — Override path to the yt-dlp binary for YouTube audio extraction. If not set, the worker resolves via common platform paths (`/usr/local/bin/yt-dlp`, Homebrew, Python user installs, chocolatey, scoop) then falls back to `"yt-dlp"` (PATH lookup). The worker healthchecks `yt-dlp --version` at boot and logs a fatal diagnostic if the binary is inaccessible.

### Host Dependencies (not env vars, but required for full functionality)

- **yt-dlp** — Required for YouTube-to-Thread audio extraction. Install via `pip install yt-dlp`, `brew install yt-dlp`, `choco install yt-dlp`, or `scoop install yt-dlp`. Verify with `yt-dlp --version`.

  **CRITICAL: Vercel Functions cannot execute yt-dlp.** yt-dlp requires a native binary that Vercel's serverless runtime does not support. The BullMQ worker process MUST run on a separate host (e.g. Fly.io, Railway, a VPS, or your own server) that has yt-dlp installed. Never deploy the worker to Vercel Functions.

## Validation Coverage

All documented env vars are now validated by `serverEnvSchema` in `src/lib/env.ts` (extended 2026-05-06 to add the previously-uncovered set: `OPENAI_API_KEY`, `DIAGNOSTICS_TOKEN`, `PLAN_CHANGE_LOG_RETENTION_YEARS`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `TWITTER_BEARER_TOKEN`).

Note: Instagram OAuth uses **Facebook App credentials** (`FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`) because Instagram Business posting goes through the Facebook Graph API — there is no separate `INSTAGRAM_CLIENT_ID` / `INSTAGRAM_CLIENT_SECRET` in the codebase.
