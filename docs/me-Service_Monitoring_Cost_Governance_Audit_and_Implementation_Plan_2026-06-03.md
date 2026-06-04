# Service Monitoring & Cost Governance — Audit and Implementation Plan

**Version**: 2 (2026-06-04) — supersedes V1 (2026-06-03)
**Scope**: Fact-based consumption monitoring, honest provider-API state-of-play, unified admin visibility, and a staged path to alerting/forecasting
**Status**: Audit corrected · Phase 0 (internal consumption monitoring) ready to build

---

## 0. What changed in V2 and why

V1 (2026-06-03) proposed an hourly cron that would read **account balances** from
OpenRouter, Replicate, Deepgram, Vercel, Railway, Resend, and Sentry, then forecast
depletion and fire multi-channel alerts. A verification pass found that the core premise
does not hold against the providers' real APIs:

- **Replicate exposes no balance/`/v1/billing` endpoint** and bills postpaid (usage invoice), not prepaid credits.
- **Vercel exposes no public `/v2/usage` balance endpoint**; billing is postpaid auto-charge.
- **Resend has no usage/quota counter API**; **Sentry**'s org endpoint returns metadata, not error-vs-quota usage.
- **OpenRouter** `auth/key.limit_remaining` is commonly `null`; the reliable read is `/api/v1/credits`.
- The design also had a single point of failure ("what monitors the cron?"), a circular
  dependency (alert email delivered via Resend, itself a monitored service), forecast math
  that breaks on top-ups, and schema/ORM drift.

**V2 re-bases the work on facts we can actually measure today.** The starting point is
**internal consumption** — tokens, API calls, image generations, and cost — which AstraPost
already records in `ai_generations` and `user_image_counters`. This needs **no cron, no new
external API tokens, and no new database tables**. External balances are added only where the
provider genuinely exposes them (OpenRouter, Deepgram), as **best-effort, on-demand,
clearly-labeled** reads — never as the foundation of the system.

Per the user's direction: **start with monitoring, defer cron jobs, and build on facts not
speculation.**

---

## 1. Service Audit (corrected)

### 1.1 Active paid services

| #   | Service                  | Purpose                                     | Billing model                   | Balance readable via API?                                         |
| --- | ------------------------ | ------------------------------------------- | ------------------------------- | ----------------------------------------------------------------- |
| 1   | **OpenRouter**           | AI text generation                          | Prepaid credits                 | **Yes** — `GET /api/v1/credits` (`total_credits − total_usage`)   |
| 2   | **Replicate**            | AI image generation                         | **Postpaid / usage invoice**    | **No** — no balance endpoint; only usage via predictions          |
| 3   | **OpenAI**               | Moderation + Whisper transcription fallback | Prepaid credits                 | **No public balance read** (billing dashboard only)               |
| 4   | **Deepgram**             | YouTube transcription (default)             | Prepaid credits (pay-as-you-go) | **Yes** — `GET /v1/projects/{id}/balances` (credit accounts only) |
| 5   | **Vercel**               | Hosting, functions, Blob                    | Postpaid auto-charge            | **No** — no public $-balance API                                  |
| 6   | **Railway**              | BullMQ worker, Redis                        | Postpaid usage                  | **No** — unofficial GraphQL usage only, no balance                |
| 7   | **PostgreSQL**           | Primary DB (pgvector)                       | Managed plan                    | N/A (auto-charge)                                                 |
| 8   | **Stripe**               | Subscription billing (inbound revenue)      | % per txn                       | N/A — revenue, not a depletable balance                           |
| 9   | **X Developer Platform** | OAuth, publish, analytics                   | Free/Basic tier                 | N/A — rate limits, not balance                                    |
| 10  | **Resend**               | Transactional email                         | Plan limit, auto-charge         | **No usage-count API**                                            |
| 11  | **Sentry**               | Error tracking                              | Plan quota, auto-charge         | **No** via org endpoint; needs `stats_v2`                         |
| 12  | **Webshare**             | Rotating proxies (YouTube)                  | Subscription                    | N/A — subscription                                                |
| 13  | **Facebook/Instagram**   | IG Business posting                         | Free platform API               | N/A                                                               |
| 14  | **LinkedIn**             | LinkedIn posting                            | Free platform API               | N/A                                                               |

> ⚠️ **Verify-live flags.** Provider APIs change. Before wiring any external read, confirm
> against live docs: OpenRouter `/api/v1/credits`, Deepgram `/balances`. Treat any other
> "balance" as **not available** until a provider doc proves otherwise — do not infer one.

### 1.2 Provider API state-of-play (what is ACTUALLY available)

This table replaces V1's speculative "Service API Mapping." It records, per provider, the
**real** surface and our confidence.

| Service    | Connectivity check                         | Usage/consumption                           | Balance                            | Recommended monitoring source                                                       |
| ---------- | ------------------------------------------ | ------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------- |
| OpenRouter | ✅ `auth/key` (already in `/admin/health`) | Provider-side usage in `auth/key`/`credits` | ✅ `/api/v1/credits` (best-effort) | **Internal `ai_generations`** (authoritative for our spend) + optional credits read |
| Replicate  | ✅ ping `/v1/account`                      | Per-prediction; no aggregate API            | ❌ none                            | **Internal `ai_generations` (type=image) + `user_image_counters`**                  |
| OpenAI     | ✅ ping moderation/models                  | None aggregate                              | ❌ none                            | **Internal `ai_generations`** (Whisper/moderation are low-volume)                   |
| Deepgram   | ✅ `/v1/projects`                          | Request-level                               | ✅ `/balances` (credit accts)      | **Internal transcription logs** + optional balance read                             |
| Vercel     | platform status only                       | ❌ no public API                            | ❌ none                            | Vercel dashboard / billing email (manual)                                           |
| Railway    | platform status only                       | ⚠️ unofficial GraphQL                       | ❌ none                            | Railway dashboard (manual)                                                          |
| Resend     | ✅ send works = up                         | ❌ no count API                             | ❌ none                            | **Internal**: count emails we send                                                  |
| Sentry     | ✅ ingest = up                             | ⚠️ `stats_v2` only                          | ❌ none                            | Sentry dashboard (manual)                                                           |

**Principle:** for spend that matters (AI text + image), **our own database is the
authoritative source** — more accurate and timelier than any provider aggregate, because we
record cost at the moment of each call. External reads are supplementary, not foundational.

### 1.3 What we already measure internally (facts)

| Signal                               | Source (verified)                                                                                           | Granularity                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Text + image API calls               | `ai_generations` rows (text routes + `image/route.ts:233`)                                                  | per call, typed (`thread`, `image`, `image_prompt`, `bio_optimizer`, …) |
| Tokens consumed                      | `ai_generations.tokensUsed`                                                                                 | total per call (no in/out split — cost is precomputed)                  |
| Cost estimate                        | `ai_generations.costEstimateCents` via `estimateCost()` + `MODEL_PRICING` (`ai-quota.ts:28,42`)             | cents per call                                                          |
| Image cost weight                    | `IMAGE_MODEL_COST` (`plan-limits.ts:176`): nano-banana=1, nano-banana-2=1, nano-banana-pro=3, gpt-image-2=5 | per image model                                                         |
| Image quota usage                    | `user_image_counters` (`used`/`limit`/`periodStart`)                                                        | per user per period                                                     |
| Model / feature / fallback / latency | `ai_generations.model`, `.subFeature`, `.fallbackUsed`, `.latencyMs`                                        | per call                                                                |
| Daily AI budget alarm                | `/api/cron/ai-cost-alarm` vs `AI_DAILY_BUDGET_USD` (default 50)                                             | daily (existing)                                                        |
| Connectivity                         | `/api/admin/health` — Postgres, Redis, BullMQ, Stripe, OpenRouter                                           | on-demand                                                               |

### 1.4 Existing admin surfaces (reuse, don't rebuild)

| Surface       | Location                                     | Coverage                                                          |
| ------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| System Health | `/admin/health` + `/api/admin/health`        | connectivity + token expiry + job success 24h                     |
| AI Usage      | `/admin/ai-usage` + `/api/admin/ai-usage`    | counts, distinct users, tokens, per-user/day/type aggregation     |
| AI Cost       | `/admin/ai-cost`                             | 7-day cost trend, top spenders, model mix, latency, fallback rate |
| AI Metrics    | `/admin/ai-metrics`                          | detailed generation metrics                                       |
| Billing       | `/admin/billing`, `/admin/billing/analytics` | MRR, subscriptions, revenue trends                                |

### 1.5 Real gaps (after correction)

| Gap                                                                                      | Severity              | Reality                                                                |
| ---------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------- |
| Consumption is fragmented across `/admin/ai-cost`, `/ai-usage`, `/ai-metrics`, `/health` | **High**              | No single pane; ops checks 4+ pages                                    |
| No per-provider rollup (OpenRouter vs Replicate vs OpenAI vs Deepgram)                   | **High**              | `ai_generations.model` exists but isn't mapped to a provider dimension |
| No connectivity check for Replicate / Deepgram / OpenAI                                  | **Medium**            | `/admin/health` covers only 5 services                                 |
| External balance only where the provider exposes it (OpenRouter, Deepgram)               | **Medium**            | Best-effort; not available elsewhere — by provider design              |
| No depletion forecasting / alerting                                                      | **Medium — deferred** | Requires historical snapshots + cron; corrected design in §6           |
| ~~No external balance tracking for all 7 services~~                                      | ~~Critical~~          | **Withdrawn** — most providers expose no balance (see §1.2)            |

---

## 2. Phase 0 — Internal Consumption Monitoring (build first, no cron)

Goal: one admin page that answers **"how much are we consuming, by provider/model/feature,
over time, and what does it cost?"** — sourced entirely from data we already store.

**No cron. No new tables. No new external API tokens. No balance speculation.**

### 2.1 Provider dimension (the one mapping we add)

`ai_generations.model` stores the model string but not the provider. Add a pure,
testable mapper (no I/O):

**File**: `src/lib/services/provider-map.ts` (`import "server-only"` not required — pure logic, no DB import)

```typescript
export type Provider = "openrouter" | "replicate" | "openai" | "deepgram" | "unknown";

// Maps a stored model string / generation type to its upstream provider.
export function providerForGeneration(type: string | null, model: string | null): Provider {
  if (type === "image") return "replicate"; // image models run on Replicate
  if (model && /gpt-image|dall-?e/i.test(model)) return "openai";
  if (model) return "openrouter"; // all text generation
  return "unknown";
}
```

> This is the single source of the provider dimension. If image generation ever moves
> providers, this is the one place to change. Covered by unit tests with the real model
> strings from `MODEL_PRICING` and `IMAGE_MODEL_COST`.

### 2.2 Consumption aggregation service

**File**: `src/lib/services/consumption-metrics.ts`
**Must start with**: `import "server-only";`

Reads `ai_generations` (+ `user_image_counters` for image quota context) and rolls up by
window. Mirrors the existing `/api/admin/ai-usage` query style (`sql` SUM/COUNT + `groupBy`).

```typescript
export interface ConsumptionWindow {
  rangeDays: number; // 1 | 7 | 30
  totalCalls: number;
  totalTokens: number;
  totalCostCents: number;
  fallbackRate: number; // fallbackUsed share
  byProvider: ProviderConsumption[]; // openrouter / replicate / openai / deepgram
  byModel: ModelConsumption[]; // model, calls, tokens, costCents
  byFeature: FeatureConsumption[]; // subFeature, calls, costCents
  daily: Array<{ date: string; calls: number; tokens: number; costCents: number }>;
  imageQuota: { totalUsed: number; activeUsers: number };
}

export async function getConsumption(rangeDays: 1 | 7 | 30): Promise<ConsumptionWindow>;
```

Implementation notes (all verifiable against existing patterns):

- Provider rollup = `groupBy(model, type)` then fold through `providerForGeneration()`.
- Cost = `SUM(costEstimateCents)`; for rows missing it, fall back to `estimateCost()` from
  `tokensUsed` (same fallback logic the `ai-cost-alarm` cron already uses).
- Token in/out split is **not available** — report total tokens only; do not fabricate a split.
- All queries are read-only `SELECT`; no transaction needed.

### 2.3 On-demand connectivity + best-effort balance (no cron)

**File**: `src/lib/services/service-connectivity.ts`
**Must start with**: `import "server-only";`

Extends the **existing** `/admin/health` pattern (`HealthCheckResult`, `AbortSignal.timeout`,
never throws) to the AI providers, and reads balance **only** where it genuinely exists.

| Check               | Endpoint (verify live)                                | Returns                                     |
| ------------------- | ----------------------------------------------------- | ------------------------------------------- |
| `checkOpenRouter()` | `GET /api/v1/credits` → `total_credits − total_usage` | `{ up, balanceCents?, source:"api" }`       |
| `checkDeepgram()`   | `GET /v1/projects/{id}/balances` (credit accounts)    | `{ up, balanceCents?, source:"api" }`       |
| `checkReplicate()`  | `GET /v1/account` (liveness only)                     | `{ up, balanceCents: null, source:"none" }` |
| `checkOpenAI()`     | `GET /v1/models` (liveness only)                      | `{ up, balanceCents: null, source:"none" }` |

Rules:

- Runs **only when an admin opens the page** (request-scoped), behind a short server cache
  (60s) so refreshes don't hammer providers. **No background polling.**
- Where balance is not exposed, the UI shows **"Balance not exposed by provider — see
  dashboard"** with a link, never a fabricated number or a misleading `$0`.
- Every check returns `{ up:false }` on error and logs `logger.warn("connectivity_check_failed", …)`.

### 2.4 Admin API

**File**: `src/app/api/admin/operations/route.ts`

```
GET /api/admin/operations?range=7
Auth:        requireAdminApi()  → check admin.ok, return admin.response on failure
Rate limit:  checkAdminRateLimit("read")
Response:    Response.json({ consumption, connectivity })
```

- `consumption` = `getConsumption(range)`; `connectivity` = cached `checkAll()`.
- No new external token is _required_: OpenRouter key already exists; Deepgram key already
  exists (`YOUTUBE_DEEPGRAM_API_KEY`). Balance reads are skipped if a key is absent.

### 2.5 Dashboard (single pane)

```
src/app/admin/operations/
  page.tsx     # RSC: await requireAdmin(); <AdminPageWrapper><OperationsDashboard/></…>
  loading.tsx  # skeleton

src/components/admin/operations/
  operations-dashboard.tsx   # useAdminPolling<…>(intervalMs: 60_000) on /api/admin/operations
  consumption-summary.tsx    # totals: calls, tokens, cost, fallback rate (range toggle 1/7/30d)
  provider-breakdown.tsx     # cost + calls by provider (OpenRouter/Replicate/OpenAI/Deepgram)
  model-usage-table.tsx      # per-model calls, tokens, cost
  feature-usage-panel.tsx    # per-subFeature cost (where the spend goes)
  consumption-trend-chart.tsx# Recharts daily cost/calls (tokens from src/lib/tokens.ts colors)
  connectivity-strip.tsx     # per-service up/down + balance (or "not exposed") badge
```

- Reuses `useAdminPolling` (existing, AbortController-mutex pattern) at 60s — consistent with
  other admin components. **Polling the page ≠ cron**: it only fetches while an admin is viewing.
- Mobile 1-col / tablet 2-col / desktop 3-col; WCAG-compliant status colors; aria-labels on charts.

### 2.6 Sidebar + i18n

- `src/components/admin/sidebar.tsx`: add `{ href:"/admin/operations", label:t("nav.operations_center"), icon:Gauge }` to the **System** group.
- i18n keys under `admin.operations.*` + `admin.nav.operations_center` in `en`/`ar`/`pseudo`
  (focused on consumption/connectivity wording — **no** "balance threshold" copy yet).

---

## 3. Phase 0 file inventory

### New files (10)

| #   | File                                                       | Purpose                                                     |
| --- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | `src/lib/services/provider-map.ts`                         | pure model→provider mapper                                  |
| 2   | `src/lib/services/consumption-metrics.ts`                  | read-only aggregation over `ai_generations`                 |
| 3   | `src/lib/services/service-connectivity.ts`                 | on-demand connectivity + best-effort balance                |
| 4   | `src/app/api/admin/operations/route.ts`                    | dashboard data API                                          |
| 5   | `src/app/admin/operations/page.tsx`                        | RSC page                                                    |
| 6   | `src/app/admin/operations/loading.tsx`                     | skeleton                                                    |
| 7   | `src/components/admin/operations/operations-dashboard.tsx` | orchestrator                                                |
| 8   | `src/components/admin/operations/*` (5 panels)             | summary / provider / model / feature / trend / connectivity |
| 9   | `src/lib/services/__tests__/provider-map.test.ts`          | mapper unit tests                                           |
| 10  | `src/lib/services/__tests__/consumption-metrics.test.ts`   | aggregation tests (mocked DB)                               |

### Modified files (5)

| #   | File                                                          | Change                      |
| --- | ------------------------------------------------------------- | --------------------------- |
| 1   | `src/components/admin/sidebar.tsx`                            | Operations Center nav entry |
| 2   | `src/i18n/messages/en.json`                                   | `admin.operations.*` keys   |
| 3   | `src/i18n/messages/ar.json`                                   | Arabic translations         |
| 4   | `src/i18n/messages/pseudo.json`                               | pseudo translations         |
| 5   | `docs/claude/architecture.md` + `docs/0-MY-LATEST-UPDATES.md` | document new surface        |

**No `schema.ts` change. No migration. No `vercel.json` cron. No new required env var.**

---

## 4. Gap-closure matrix (verification findings → V2 resolution)

| V1 finding (severity)                                                          | Resolution in V2                                                                                                                   |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Replicate `/v1/billing` does not exist; postpaid not prepaid (**Critical**)    | Reclassified §1.1/§1.2; Replicate monitored via internal `ai_generations`+counters; no balance read                                |
| Vercel `/v2/usage` balance assumption (**Critical**)                           | Removed; Vercel = connectivity/manual-dashboard only                                                                               |
| No monitor-of-the-monitor + circular Resend alert dependency (**Critical**)    | Phase 0 has **no cron and no email path**; deferred alerting design (§6) mandates external heartbeat + non-Resend critical channel |
| Forecast math breaks on top-ups; two burn-rate methods (**High**)              | Forecasting deferred; corrected single-method, top-up-aware formula specified in §6                                                |
| In-app channel claimed but unwired (**High**)                                  | No alerting in Phase 0; deferred design wires the existing `notifications` table explicitly                                        |
| Drizzle `channels_sent` mistyped; DATE/TIMESTAMPTZ/id drift (**High**)         | No new tables in Phase 0 → drift eliminated; corrected DDL kept in §6 for when snapshots are added                                 |
| "Zero interruptions / 100%" overpromise (**High**)                             | Replaced with SLO-style metrics (§5)                                                                                               |
| Resend/Sentry/OpenAI metrics not obtainable from chosen endpoints (**Medium**) | §1.2 documents real surface; those services use internal counts or manual dashboards                                               |
| Anomaly score ÷0; unstable at n=7 (**Medium**)                                 | Deferred; §6 guards `stddev===0` and sets a minimum sample + absolute-dollar floor                                                 |
| Hard spending stop advisory/deferred (**Medium**)                              | Kept explicitly as future; §6 names the gate it would flip                                                                         |
| Over-scoped Railway/Vercel tokens (**Medium**)                                 | Those tokens are **not introduced** in Phase 0                                                                                     |
| OpenRouter `limit_remaining` often null (**Low**)                              | Switched to `/api/v1/credits`                                                                                                      |

---

## 5. Success metrics (SLO-style, no overpromise)

| Metric                                               | Target                                      | Measurement                                 |
| ---------------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| Single page shows consumption for all 4 AI providers | 100% of providers present                   | `/admin/operations` renders provider rollup |
| Cost figures reconcile with `/admin/ai-cost`         | within ±1%                                  | cross-check same window                     |
| Connectivity reflects real provider state            | matches `/admin/health` for shared services | side-by-side                                |
| Balance shown only where provider exposes it         | 0 fabricated balances                       | code review + UI copy audit                 |
| Dashboard P95 load                                   | < 2 s                                       | client timing                               |
| `pnpm run check` clean · `pnpm test` pass            | 0 errors                                    | CI                                          |
| i18n key parity en/ar/pseudo                         | 100%                                        | key-count check                             |

> We explicitly **do not** claim "zero service interruptions." Phase 0 improves _visibility_;
> preventing depletion of postpaid services (Vercel/Railway) ultimately depends on provider
> billing, not on this dashboard.

---

## 6. Deferred (NOT in current scope) — corrected designs for later

These are documented now so the gaps are closed _by design_, but they are **out of scope**
until Phase 0 ships and we decide they're worth the operational cost. Each requires a cron.

### 6.1 Balance history + depletion forecast (cron-dependent)

- Add `service_health_snapshots` **only when needed**, with corrected DDL: `id TEXT DEFAULT gen_random_uuid()::text`, all timestamps `TIMESTAMPTZ` mirrored as `timestamp(..., { withTimezone:true })`, arrays as `text(...).array()` with `sql` defaults.
- Forecast, single method, **top-up aware**:
  ```
  // Reset the window whenever balance increases (recharge detected).
  segment = snapshots since last balance increase
  burnPerDay = (segment.first.balance - segment.last.balance) / segment.spanDays
  daysRemaining = burnPerDay > 0 ? current.balance / burnPerDay : Infinity   // null if Infinity
  confidence = stddev(daily deltas) > 0.3 * mean ? "low" : (points >= 7 ? "high" : "medium")
  ```
- Only meaningful for **OpenRouter + Deepgram** (the providers with a real balance).

### 6.2 Alerting (cron-dependent) — SPOF + circular-dependency fixes baked in

- **External heartbeat** (e.g. Healthchecks.io / Better Stack) pings the cron so a _missed run_ is itself alertable. The monitor is monitored externally.
- **Critical alerts use a non-Resend path** (SMS/webhook) so a Resend outage can't suppress the alert about Resend.
- **In-app** = INSERT into the existing `notifications` table (wired, not just labeled).
- De-dup via Redis TTL; immediate fire on first _critical_ reading (no "2 consecutive" delay for critical).

### 6.3 Anomaly detection (cron-dependent)

- Over internal cost only; guard `stddev === 0` (no ÷0/Infinity), require ≥14 days and an absolute-dollar floor before flagging, to avoid small-sample false positives.

### 6.4 Hard spending stop

- Optional kill-switch flipping the AI plan gates in `src/lib/middleware/require-plan.ts` when `AI_MONTHLY_BUDGET_USD` is exceeded. Default off. Specify exact gate before building.

---

## 7. Testing plan (honest, reproducible)

### Unit (Phase 0)

| Suite                         | Scenarios                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `provider-map.test.ts`        | every `MODEL_PRICING` + `IMAGE_MODEL_COST` model maps to the right provider; unknown model → `"unknown"`                        |
| `consumption-metrics.test.ts` | mocked rows → correct totals, provider/model/feature rollups, cost fallback from tokens, empty-range = zeros, fallbackRate math |

### Integration (Phase 0)

| Scenario                   | Steps                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------- |
| API shape                  | seed `ai_generations` → `GET /api/admin/operations?range=7` → assert sections populated |
| Reconciliation             | same window cost vs `/admin/ai-cost` within ±1%                                         |
| Connectivity graceful-fail | force provider 401/timeout → `{ up:false }`, no throw, balance omitted                  |

> External provider reads are **mocked** in tests. We do **not** assert live balances in CI —
> that would only prove the network works, not that a number is correct, and would give false
> confidence for providers that expose nothing.

---

## 8. Implementation order

1. **`provider-map.ts` + tests** → verify mapping against real model strings.
2. **`consumption-metrics.ts` + tests** → reconcile against `/admin/ai-cost`.
3. **`service-connectivity.ts`** → reuse `/admin/health` pattern; balance only for OpenRouter/Deepgram.
4. **`/api/admin/operations` route** → `requireAdminApi` + rate limit.
5. **Dashboard components + page + loading** → `useAdminPolling` 60s.
6. **Sidebar + i18n (en/ar/pseudo)**.
7. **Docs** (`architecture.md`, `0-MY-LATEST-UPDATES.md`).
8. `pnpm run check` + `pnpm test` green.

Phases 1+ (snapshots, forecasting, alerting, anomaly, hard-stop) are **deferred** per §6 and
revisited only after Phase 0 is in use.

---

## Appendix A: Verified provider endpoints (confirm live before wiring)

```
# OpenRouter — balance (prepaid credits)
GET https://openrouter.ai/api/v1/credits
Authorization: Bearer {OPENROUTER_API_KEY}
→ { "data": { "total_credits": N, "total_usage": M } }   # balance = N - M

# OpenRouter — liveness (already used in /admin/health)
GET https://openrouter.ai/api/v1/auth/key

# Deepgram — balance (credit/pay-as-you-go accounts only)
GET https://api.deepgram.com/v1/projects/{project_id}/balances
Authorization: Token {YOUTUBE_DEEPGRAM_API_KEY}
→ [ { "amount": N, "units": "usd" } ]

# Replicate — liveness only (NO balance endpoint exists)
GET https://api.replicate.com/v1/account
Authorization: Bearer {REPLICATE_API_TOKEN}

# OpenAI — liveness only (NO public balance read)
GET https://api.openai.com/v1/models
Authorization: Bearer {OPENAI_API_KEY}
```

Vercel, Railway, Resend, Sentry: **no balance/usage API used.** Monitor connectivity (or the
provider's own dashboard/billing email) manually.

---

## Appendix B: Authoritative internal sources (code references)

- `src/lib/schema.ts` — `aiGenerations` (tokensUsed, costEstimateCents, model, subFeature, type, fallbackUsed, latencyMs); `userImageCounters`
- `src/lib/services/ai-quota.ts:28` — `MODEL_PRICING`; `:42` — `estimateCost()`
- `src/lib/plan-limits.ts:176` — `IMAGE_MODEL_COST`
- `src/app/api/admin/ai-usage/route.ts` — existing aggregation pattern to mirror
- `src/app/api/admin/health/route.ts` — existing connectivity pattern to extend
- `src/app/api/cron/ai-cost-alarm/route.ts` — existing cost-fallback logic to reuse
