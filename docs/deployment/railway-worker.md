# Deploying the BullMQ Worker on Railway

The Vercel app handles HTTP traffic (Next.js, API routes, SSE). It **cannot** run the
BullMQ worker because the worker is a long-lived process that holds a Redis
connection and consumes jobs continuously. Railway hosts that worker.

End-to-end flow:

```
[ User ] → [ Vercel: /api/posts ] → [ Postgres: posts row, status='scheduled' ]
                                  → [ Redis: BullMQ job ]
                                                ↓
                                  [ Railway: pnpm run worker ]
                                                ↓
                                  [ X / LinkedIn / Instagram APIs ]
                                                ↓
                                  [ Postgres: posts row, status='posted' ]
```

Vercel and Railway must talk to the **same Redis** and the **same Postgres**.

---

## ⚠️ Redis backend — migrated Upstash → Railway Redis (2026-08-07)

**Current state (live):** Both the Vercel app and this worker use a **Railway-hosted Redis**
service in the same `friendly-courage` project, reachable via its **public TCP proxy**
`caboose.proxy.rlwy.net:15131`. `REDIS_URL` on both sides points there. (Password is in the
Railway `Redis` service variables — never commit it.)

**Why we moved (the ~$45/mo bill):** the worker runs BullMQ, which polls Redis continuously —
blocking pops, delayed-set scans, stalled-job checks, heartbeats — **~8–9 commands/second even
when idle**. Redis was on **Upstash via the Vercel Marketplace, billed Pay-As-You-Go per
request**, so that idle polling generated ~22M commands/month → **$44.81 in July** (invoice
`WLWHHAWX-0005`). BullMQ + Upstash PAYG is a well-known cost trap — both vendors warn against it.
**Railway Redis bills by RAM/egress, not per request**, so the same polling is effectively free.

**Cost impact:** Upstash **~$45/mo → $0**; Railway Redis ≈ **$1–3/mo** RAM + negligible egress.

**Cutover (done 2026-08-07, verified):**

1. Provisioned a Railway **Redis** service (persistent volume) in `friendly-courage`.
2. Enabled its **public TCP proxy** so Vercel can reach it.
3. Set Vercel `REDIS_URL` → Railway proxy, redeployed the app (confirmed it began writing to the
   new Redis).
4. Set the worker `REDIS_URL` → same Railway proxy via `railway variables --set` (auto-redeployed
   the worker). Verified: `worker_ready`, all 3 repeatable jobs (analytics 6h / x-tier 04:00 /
   token-health 02:00) re-registered in Railway Redis, **no** connection errors; Upstash
   `schedule-queue` empty (nothing stranded). Because `scripts/worker.ts` re-registers repeatables
   on every boot and the schedule queue was empty, **no data migration was needed** — the fresh
   Redis self-heals.

### ⏳ Remaining step (finalize the cleanup)

- **Remove the Upstash Marketplace integration:** Vercel → Settings → Integrations → **Upstash →
  Remove**. The per-request meter already stopped (nothing connects to Upstash), but this stops
  any base fee and tidies up. **Suggested first:** schedule one test post to confirm the full path
  (app → Railway Redis → worker → X), then remove.
- **Rollback (keep available until the test post passes):** repoint `REDIS_URL` back to the Upstash
  `rediss://…@amazing-bee-85245.upstash.io:6379` URL on **both** the worker (Railway CLI:
  `railway variables --set 'REDIS_URL=…' -s AstraPost-main-02 -e production`) and the app (Vercel
  env), then redeploy both.

### 🔧 Follow-up optimizations (NOT yet done — backlog)

1. **Private networking for the worker.** The worker currently reaches Redis over the _public_
   proxy (~$0.20/mo egress + plaintext-over-internet). Switch it to the internal
   `redis.railway.internal:6379` so worker↔Redis traffic is free and private. **Gotcha:** Railway's
   internal DNS is **IPv6-only** and `ioredis` defaults to IPv4 — add **`family: 0`** to the
   `IORedis` options in `src/lib/queue/client.ts` (and any other ioredis client, e.g.
   `src/lib/billing-redis.ts`) before repointing, or it fails with `ENOTFOUND`. Then set the worker
   `REDIS_URL = ${{ Redis.REDIS_URL }}` (the private URL). The Vercel app still needs the public
   proxy (it's outside Railway).
2. **Full hardening (no public Redis at all).** Have the Vercel app enqueue via an authenticated
   HTTPS endpoint on the worker instead of connecting to Redis directly; keep Redis fully private.
   Best security; larger change.
3. **TLS caveat.** The Railway public proxy is plain TCP (strong password, **not encrypted**) —
   the `rediss://` guidance in §4 and the Upstash assumptions in §8 below **predate this migration
   and are now stale**. Follow-ups 1/2 remove the plaintext exposure.
4. **Secret rotation.** During the 2026-08-07 investigation a full env dump surfaced (Stripe
   **live** key + many others). Rotate any considered sensitive.
5. **Consolidate queues (optional).** 6 BullMQ queues = 6 pollers. Fewer queues → less polling;
   harmless under Railway's non-per-request pricing, but tidier and important if a per-request
   Redis is ever used again.

> The `rediss://` note in §4 and the Upstash framing in §8 predate this migration. The current
> backend is **Railway Redis** (`redis://`, public proxy). This section is the source of truth.

---

## 1. Prerequisites

- Railway account (you have this)
- Redis reachable from both Vercel and Railway (Upstash, Railway Redis, Redis Cloud,
  etc.). If your current Redis is local-only, that explains the `ETIMEDOUT` errors
  in your Vercel logs.
- Postgres reachable from both (Neon / Supabase / etc.)
- GitHub repo connected to Railway (recommended — auto-deploys on push)

---

## 2. Pick a build strategy

The repo ships **two** build strategies. Pick one — don't enable both.

### Option A — Nixpacks (default, already configured)

Already set up in `railway.json`:

```json
{
  "build": { "builder": "NIXPACKS", "buildCommand": "pnpm install --frozen-lockfile" },
  "deploy": {
    "startCommand": "pnpm run worker",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Pros: zero config, auto-detects Node version. Cons: less reproducible across
environments.

### Option B — Dockerfile

Use `Dockerfile.worker` at the repo root. In Railway service settings:

- **Builder:** Dockerfile
- **Dockerfile Path:** `Dockerfile.worker`

Pros: deterministic, locks Node 24, works the same locally (`docker build`) and on
any Docker host. Cons: slightly slower cold builds.

**Recommendation:** start with Nixpacks (already configured). Switch to Dockerfile
only if you hit reproducibility issues.

---

## 3. Create the Railway service

1. Open Railway → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. After the first build attempt, go to the service → **Settings**:
   - **Root Directory:** leave empty (project root)
   - **Watch Paths:** `src/**`, `scripts/worker.ts`, `package.json`, `pnpm-lock.yaml`
     (avoids redeploys on docs/UI-only changes)
   - **Start Command:** comes from `railway.json` (`pnpm run worker`) — leave empty
   - **Healthcheck:** disable (the worker is not an HTTP server)
   - **Replicas:** **1** — see "Scaling" below before increasing.
3. Railway will deploy on every push to `main`. Use a separate branch for hotfixes
   if you don't want this.

---

## 4. Environment variables checklist

The worker imports `src/lib/env.ts`, which validates env vars at boot. **Missing or
malformed values crash the worker on startup.**

Copy from Vercel → Railway. The fastest way:

```bash
# On your machine, with Vercel CLI installed and logged in:
vercel env pull .env.production --environment=production
# Then in Railway → service → Variables → Raw Editor → paste the file contents.
```

### Required (worker boots fail without these)

| Variable                   | Source | Notes                                                                                                                                                             |
| -------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_URL`             | Vercel | Same Postgres the app uses. Must be reachable from Railway.                                                                                                       |
| `REDIS_URL`                | Vercel | Same Redis the app uses. Use the **TLS** URL (`rediss://`) if your provider offers one.                                                                           |
| `BETTER_AUTH_SECRET`       | Vercel | 32+ chars. Worker uses it for some auth-adjacent operations.                                                                                                      |
| `TOKEN_ENCRYPTION_KEYS`    | Vercel | Comma-separated base64 keys (first is primary). Worker decrypts X/LinkedIn/Instagram OAuth tokens to publish — must match the app exactly or every publish fails. |
| `OPENROUTER_MODEL`         | Vercel | Required by env schema even if worker doesn't use AI per-job.                                                                                                     |
| `REPLICATE_MODEL_FAST`     | Vercel | Same — required by schema.                                                                                                                                        |
| `REPLICATE_MODEL_PRO`      | Vercel | Same.                                                                                                                                                             |
| `REPLICATE_MODEL_FALLBACK` | Vercel | Same.                                                                                                                                                             |
| `REPLICATE_MODEL_ADVANCED` | Vercel | Same.                                                                                                                                                             |
| `NODE_ENV`                 | —      | `production`                                                                                                                                                      |

### Required for publishing

| Variable                                      | Used for                                                     |
| --------------------------------------------- | ------------------------------------------------------------ |
| `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` | Refreshing X OAuth tokens, proactive token health checks     |
| `OPENROUTER_API_KEY`                          | If any worker job calls AI (agentic posting, scoring)        |
| `REPLICATE_API_TOKEN`                         | If a job generates images                                    |
| `BLOB_READ_WRITE_TOKEN`                       | Reading/writing media blobs                                  |
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL`        | Post failure, token expiring, and account deactivated emails |

### Optional / situational

| Variable                                                                                                            | When to set                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `OPENROUTER_MODEL_AGENTIC`, `OPENROUTER_MODEL_AGENTIC_REVIEWER`, `OPENROUTER_MODEL_TRENDS`, `OPENROUTER_MODEL_FREE` | If you want dedicated models for those flows                                                                       |
| `STRIPE_*`                                                                                                          | The worker doesn't process Stripe webhooks, so usually not needed. Leave unset unless a queue job touches billing. |
| `AI_DAILY_BUDGET_USD`, `RESEND_OPS_EMAIL`                                                                           | Cost monitoring & ops alerts                                                                                       |
| `TWITTER_DRY_RUN=1`                                                                                                 | Set in a **staging** Railway service to test publishing without hitting X                                          |
| `SENTRY_DSN`                                                                                                        | If you want worker errors in Sentry too                                                                            |

### What NOT to copy

- `NEXT_PUBLIC_*` — frontend-only, not used by the worker
- `BETTER_AUTH_URL` — only needed by HTTP layer
- `CRON_SECRET` — Vercel-only

---

## 5. Verify the worker is alive

In Railway → **Logs**, after deploy you should see:

```
✅ [Worker] Started successfully (PID: ...).
⏳ Waiting for jobs in 'schedule-queue', 'analytics-queue', 'x-tier-refresh-queue', and 'token-health-queue'...
```

Then post a tweet from the Vercel UI with "Publish now". Within a couple of seconds
the worker logs should show:

```
{"level":"info","msg":"job_completed","queue":"schedule-queue","jobId":"<postId>"}
```

If you see `ECONNREFUSED` or `ETIMEDOUT` on Redis: your `REDIS_URL` is wrong, the
provider is blocking Railway's egress IP, or you're missing TLS (`rediss://` not
`redis://`).

---

## 6. Vercel-side check

Make sure Vercel's `REDIS_URL` and `POSTGRES_URL` point at the **same** instances
Railway is using. Mismatch is the most common bug — the app enqueues to one Redis
and the worker waits on a different one.

```bash
# From repo root, compare:
vercel env pull .env.vercel --environment=production
# Then diff REDIS_URL / POSTGRES_URL against what's in Railway.
```

The `ETIMEDOUT` errors in your current Vercel logs strongly suggest Vercel cannot
reach your Redis at all. Fix that first — the worker on Railway can't help if the
app can't enqueue.

---

## 7. Scaling

**Keep `Replicas: 1` for now.** The worker is deliberately configured with
`concurrency: 1` and a 6-minute lock duration (`scripts/worker.ts:32`) because OAuth
refresh tokens are single-use — two workers refreshing the same X account at the
same time will permanently invalidate one of them.

A **circuit breaker** (`src/lib/services/x-circuit-breaker.ts`) adds further
protection: after `X_CIRCUIT_THRESHOLD` consecutive permanent failures (default 5),
all X API calls pause for `X_CIRCUIT_TIMEOUT_MS` (default 5 min). This prevents
mass token invalidation when X's API is degraded.

If you need more throughput later, the right move is to shard by `userId` /
`xAccountId`, not just bump replicas. That's a code change, not a Railway setting.

---

## 8. Cost expectations

- A worker that's mostly idle uses ~150-300 MB RAM and very little CPU.
- Railway hobby plan ($5/mo credit) covers this comfortably.
- Watch for runaway retry loops. The error classification system (`x-error.ts`)
  distinguishes transient from permanent failures — permanently revoked tokens
  deactivate the account instead of retrying. The circuit breaker adds a second
  safety layer by blocking all X API calls when the failure rate spikes.

---

## 9. Troubleshooting

| Symptom                                        | Likely cause                                                                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Posts stay in `scheduled` forever              | Worker not running, or wrong `REDIS_URL`                                                                                      |
| `ECONNREFUSED 127.0.0.1:6379` in worker logs   | `REDIS_URL` is unset → defaulted to localhost. Set it.                                                                        |
| `Invalid server environment variables` on boot | One of the required env vars is missing/malformed. Worker logs the exact field.                                               |
| `Failed to decrypt token` per job              | `TOKEN_ENCRYPTION_KEYS` differs from Vercel's. Tokens were encrypted with the app's key and can't be decrypted by the worker. |
| Vercel app shows `ETIMEDOUT` to Redis          | Vercel can't reach Redis (firewall / wrong host). Worker is irrelevant — fix Vercel first.                                    |
| Duplicate tweets posted                        | Two worker replicas processing the same job. Set `Replicas: 1`.                                                               |

## 10. Questions

Quick yes/no: Do I need Railway if, in my web app, I decided to post the tweet now without any scheduling in the future? Yes or no?  
● Yes.
Even "post now" goes through BullMQ — /api/posts always inserts the job into Redis with delay: 0 and returns immediately. The actual call to X happens in the worker (scripts/worker.ts), which Vercel cannot host. No worker = the job sits in Redis and the tweet never publishes.
