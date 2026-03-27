# AstraPost — Production Deployment Guide

> Last updated: 2026-03-27

## Architecture Overview

AstraPost splits into two independently deployed processes:

| Process | Host | Purpose |
|---------|------|---------|
| **Next.js app** | Vercel | Web server, API routes, SSR |
| **BullMQ worker** | Railway | Background job processor (tweet scheduling + analytics) |

Supporting services:

| Service | Provider | Instance | Purpose |
|---------|----------|----------|---------|
| PostgreSQL | Neon | `ep-square-truth-an6kpx3y-pooler` · `us-east-1` | Primary database |
| Redis | Upstash | `amazing-bee-85245` · `us-east-1` | BullMQ queues + rate limiting |
| File storage | Vercel Blob | — | User media uploads |
| Email | Resend | — | Transactional emails |
| Payments | Stripe | — | Pro/Agency subscriptions |

> **Credentials are not stored in this file.** Set `POSTGRES_URL` and `REDIS_URL` directly in Vercel and Railway environment variable settings (see §2 and §4).

---

## 1. Vercel — Next.js App

### Initial Setup

1. Push the repo to GitHub.
2. Import the project in the [Vercel dashboard](https://vercel.com/new).
3. Set the **build command** to `pnpm run build:ci` (skips database migration — migrations run separately).
4. Set the **install command** to `pnpm install --frozen-lockfile`.
5. Set the **output directory** to `.next` (auto-detected for Next.js).

> **Why `build:ci` and not `build`?** The default `build` script runs `db:migrate` before `next build`. On Vercel, the build container has no access to your production database. Run migrations manually or via a separate CI step before each deploy.

### Build & Deploy Settings (vercel.json or dashboard)

No `vercel.json` is required for the web app. Vercel auto-detects Next.js. If you need custom headers or rewrites, add a `vercel.json` at the repo root.

---

## 2. Environment Variables

Set all variables under **Project → Settings → Environment Variables** in the Vercel dashboard.
Use the **Production** environment scope for all variables below unless noted.

### Required — Core

| Variable | Example / Notes |
|----------|----------------|
| `POSTGRES_URL` | Neon pooled connection string. Instance: `ep-square-truth-an6kpx3y-pooler.c-6.us-east-1.aws.neon.tech`, database `neondb`. Includes `?sslmode=require&channel_binding=require`. Copy the exact string from the Neon dashboard — **never hardcode credentials in files**. |
| `BETTER_AUTH_SECRET` | Generate: `openssl rand -base64 32`. Must be ≥32 chars. |
| `BETTER_AUTH_URL` | `https://astrapost.vercel.app` |
| `TOKEN_ENCRYPTION_KEYS` | Comma-separated base64 32-byte keys. First key is primary. Generate: `openssl rand -base64 32`. |
| `NEXT_PUBLIC_APP_URL` | `https://astrapost.vercel.app` (no trailing slash) |
| `NODE_ENV` | `production` |

### Required — X (Twitter) OAuth

| Variable | Notes |
|----------|-------|
| `TWITTER_CLIENT_ID` | From [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard). Enable OAuth 2.0, "Read and Write" permissions, and "Request email from users". |
| `TWITTER_CLIENT_SECRET` | Same app — OAuth 2.0 client secret. |
| `TWITTER_BEARER_TOKEN` | Same app → Keys and Tokens → Bearer Token. Required for the Inspiration tweet import feature. |

**Callback URL to register in the Twitter app:**
```
https://astrapost.vercel.app/api/auth/callback/twitter
```

**Required OAuth scopes:**
```
tweet.read  tweet.write  users.read  offline.access  media.write
```

> `media.write` was added in the 2026-03-14 fix. All existing users must reconnect their X account after this scope is added to receive a fresh token.

### Required — Redis (Upstash)

| Variable | Notes |
|----------|-------|
| `REDIS_URL` | Upstash Redis TLS URL. Instance: `amazing-bee-85245.upstash.io:6379` (note: `rediss://` scheme — TLS). Copy the exact string from the Upstash console — **never hardcode credentials in files**. |

> The worker on Railway needs this same `REDIS_URL`. Set it in the Railway service environment as well (see §4).

### Required — AI

| Variable | Notes |
|----------|-------|
| `OPENROUTER_API_KEY` | From [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys). Powers thread writer, translation, hashtags, tools, and chat. |
| `OPENROUTER_MODEL` | Default: `openai/gpt-4o`. Can override with any model from [openrouter.ai/models](https://openrouter.ai/models). |
| `GEMINI_API_KEY` | From [Google AI Studio](https://aistudio.google.com/app/apikey). Powers the Inspiration (inspire) and image endpoints. |
| `GOOGLE_AI_API_KEY` | Alias for `GEMINI_API_KEY` — set both to the same value. |
| `REPLICATE_API_TOKEN` | From [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens). Powers AI image generation (Flux models). |

### Required — Stripe Billing

| Variable | Notes |
|----------|-------|
| `STRIPE_SECRET_KEY` | From [Stripe dashboard → API keys](https://dashboard.stripe.com/apikeys). Use `sk_live_...` for production. |
| `STRIPE_WEBHOOK_SECRET` | From Stripe → Webhooks → your endpoint → Signing secret. Must match the endpoint registered for `https://astrapost.vercel.app/api/billing/webhook`. |
| `STRIPE_PRICE_ID_MONTHLY` | Pro Monthly price ID from Stripe (`price_...`). |
| `STRIPE_PRICE_ID_ANNUAL` | Pro Annual price ID from Stripe. |
| `STRIPE_PRICE_ID_AGENCY_MONTHLY` | Agency Monthly price ID. |
| `STRIPE_PRICE_ID_AGENCY_ANNUAL` | Agency Annual price ID. |

**Stripe Webhook events to enable:**
```
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
```

**Webhook endpoint URL:**
```
https://astrapost.vercel.app/api/billing/webhook
```

### Optional

| Variable | Notes |
|----------|-------|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token — auto-provisioned when you add Vercel Blob to the project. Without this, uploaded media falls back to local disk (not suitable for production). |
| `RESEND_API_KEY` | From [resend.com](https://resend.com). Without it, emails are logged to console only. |
| `RESEND_FROM_EMAIL` | e.g. `noreply@astrapost.com`. Must match a verified domain in Resend. |
| `TWITTER_DRY_RUN` | Set to `1` to prevent the worker from posting to real X accounts (testing only). **Never set in production.** |

---

## 3. Neon — Database Configuration

### Setup

1. In the Vercel dashboard, go to **Storage → Create → Neon**.
   Or install via Marketplace: `vercel integration add neon`.
2. Neon automatically sets `POSTGRES_URL` (and `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`) in Vercel env vars.
3. Use the **pooled connection string** (`POSTGRES_URL`) for the app. Drizzle uses the pooled URL by default.

### Running Migrations

Migrations are **not** run automatically on Vercel build. Run them manually:

```bash
# From your local machine with production env vars loaded
pnpm run db:migrate
```

Or run them in a CI step before deploying:

```bash
# In CI — requires POSTGRES_URL set as a CI secret
pnpm run db:migrate && vercel deploy --prebuilt
```

Current migration state: **32 migrations applied** (0000–0031) as of 2026-03-17.

### Neon Branching (optional)

Neon supports database branches — useful for staging environments:

1. Create a branch in the Neon dashboard.
2. Set the branch connection string as `POSTGRES_URL` in the Vercel **Preview** environment scope.
3. Production and Preview environments now use isolated databases.

### Enabling pgvector

If you use the vector search / embedding features:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Run this once against your production Neon database via the Neon SQL editor or `psql`.

---

## 4. Railway — BullMQ Worker

The worker (`scripts/worker.ts`) runs as a **separate long-lived process** — it cannot run inside Vercel (serverless, no persistent processes). Railway is configured via `railway.json` at the repo root.

### railway.json

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install --frozen-lockfile"
  },
  "deploy": {
    "startCommand": "pnpm run worker",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

- **Builder**: Nixpacks (auto-detects Node.js + pnpm).
- **Start command**: `pnpm run worker` → runs `node --require dotenv/config --import tsx scripts/worker.ts`.
- **Restart policy**: Restarts automatically on crash, up to 10 times. After 10 failures Railway stops and alerts.

### Railway Environment Variables

The following variables are **confirmed set** in the Railway service as of 2026-03-27:

| Variable | Status | Notes |
|----------|--------|-------|
| `POSTGRES_URL` | ✅ Set | Neon pooled — `ep-square-truth-an6kpx3y-pooler`, `us-east-1` |
| `REDIS_URL` | ✅ Set | Upstash TLS — `amazing-bee-85245.upstash.io:6379`, `rediss://` scheme |
| `TWITTER_CLIENT_ID` | ✅ Set | X OAuth client ID |
| `TWITTER_CLIENT_SECRET` | ✅ Set | X OAuth client secret |
| `TOKEN_ENCRYPTION_KEYS` | ✅ Set | Must match Vercel exactly — worker decrypts X OAuth tokens |
| `BETTER_AUTH_SECRET` | ✅ Set | Must match Vercel exactly |
| `BETTER_AUTH_URL` | ✅ Set | `https://astrapost.vercel.app` |
| `NODE_ENV` | ✅ Set | `production` |
| `OPENROUTER_API_KEY` | ✅ Set | Not used by the worker today, but safe to have |
| `NEXT_PUBLIC_APP_URL` | ⚠️ Not needed | Build-time browser variable — the worker has no browser context. Safe to remove from Railway to avoid confusion. **Note:** was set with a typo (`NEXT_PUBLIC_APP_UR`) — ensure it is either removed or corrected if kept. |

**Variables the worker does NOT need** (do not add to Railway):
- `STRIPE_*` — billing is handled by the web app only
- `RESEND_*` — email is sent by the web app only
- `REPLICATE_API_TOKEN` — image generation is web app only
- `GEMINI_API_KEY` / `GOOGLE_AI_API_KEY` — inspiration/chat are web app only
- `BLOB_READ_WRITE_TOKEN` — file uploads are web app only

### What the Worker Does

Two BullMQ workers run in the same process:

| Queue | Processor | Trigger |
|-------|-----------|---------|
| `schedule-queue` | `scheduleProcessor` | Enqueued by the web app when a post is scheduled. Decrypts X tokens, posts tweet/thread via X API v2, updates post status + analytics. |
| `analytics-queue` | `analyticsProcessor` | Repeatable job added at startup. Runs every **6 hours** (`every: 6 * 60 * 60 * 1000`). Updates tweet metrics (likes, retweets, impressions) for all tracked posts. |

### Monitoring Worker Health

- **Railway dashboard** → Service → Deployments → Logs: real-time stdout/stderr.
- **Structured log keys** to watch for in your log aggregator:
  - `job_completed` — normal job completion.
  - `job_failed` — transient failure (will retry).
  - `job_permanently_failed` — all retries exhausted; manual review required. Alert on this key.
  - `worker_error` — BullMQ/Redis internal error.
- **BullMQ Dashboard** (optional): The app includes `@bull-board/api` + `@bull-board/express`. If configured, accessible at `/admin/jobs`.

### Graceful Shutdown

The worker handles `SIGTERM` and `SIGINT`:
1. Closes both queues.
2. Closes both workers (waits for in-progress jobs to finish).
3. Exits with code 0.

Railway sends `SIGTERM` before killing a deployment, giving in-flight jobs time to complete.

---

## 5. Vercel Blob — File Storage

Vercel Blob is used in production for all user-uploaded media (tweet images, etc.).

### Setup

1. In the Vercel dashboard → **Storage → Create → Blob**.
2. `BLOB_READ_WRITE_TOKEN` is auto-added to your Vercel project env vars.
3. In local dev, leave `BLOB_READ_WRITE_TOKEN` unset — the storage abstraction (`src/lib/storage.ts`) falls back to `public/uploads/` automatically.

### Storage Abstraction

```typescript
import { upload, deleteFile } from "@/lib/storage";

const result = await upload(buffer, "avatar.png", "avatars");
await deleteFile(result.url);
```

The switch between local and Blob is automatic — no code changes needed between environments.

---

## 6. Post-Deploy Checklist

After deploying to production for the first time:

- [ ] Run `pnpm run db:migrate` against the production Neon database.
- [ ] Verify `BLOB_READ_WRITE_TOKEN` is set — test a file upload.
- [ ] Register the Stripe webhook endpoint and copy the signing secret.
- [ ] Register the Twitter OAuth callback URL (`https://astrapost.vercel.app/api/auth/callback/twitter`).
- [ ] Confirm the Railway worker is running: check Railway logs for `worker_started`.
- [ ] Create an admin user: register normally, then run in Neon SQL editor:
  ```sql
  UPDATE "user" SET is_admin = true WHERE email = 'you@example.com';
  ```
- [ ] Navigate to `/admin` and verify the admin dashboard loads.
- [ ] Post a test tweet via the composer to confirm the full scheduling → worker → X API pipeline works.

---

## 7. Token Rotation

X OAuth tokens are AES-256-GCM encrypted at rest. If you need to rotate the encryption key:

```bash
# Add a new key at the start of TOKEN_ENCRYPTION_KEYS, keep the old key at the end
# TOKEN_ENCRYPTION_KEYS=NEW_KEY_BASE64,OLD_KEY_BASE64

# Then run the rotation script — re-encrypts all tokens with the new primary key
pnpm run tokens:rotate
```

After rotation, remove the old key from `TOKEN_ENCRYPTION_KEYS`.

> See `src/lib/security/token-encryption.ts` for implementation details.

---

## 8. Key Deployment Notes

- **Worker and web app must share the same `REDIS_URL`** — the web app enqueues jobs; the worker consumes them. If they point to different Redis instances, jobs will never run.
- **Worker and web app must share the same `TOKEN_ENCRYPTION_KEYS`** — the web app stores encrypted tokens; the worker decrypts them. Key mismatch causes 401/400 errors when posting to X.
- **`build` vs `build:ci`**: Always use `build:ci` on Vercel (no DB migration). Use `build` locally or in a pre-deploy CI step where the database is reachable.
- **New OAuth scopes**: After adding `media.write` to the Twitter app, all existing connected users must reconnect their X account via Settings → Connected Accounts → Reconnect to receive a new token with the updated scopes.
