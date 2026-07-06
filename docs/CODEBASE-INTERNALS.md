# Codebase Internals — Gotchas, Footguns & Fragile Patterns

> **The single highest-value doc in the harness.** Everything here cost someone hours of debugging. Read it before you touch anything on this list.

---

## 1. Database Footguns

### `db:push` without `db:generate` causes production outages

**What:** `db:push` applies schema changes directly without creating migration files. If someone later runs `db:migrate` on production, the migration anchor (BEFORE/AFTER enum snapshots) won't exist, and the migration will fail.

**Rule:** Every `schema.ts` edit must be followed by `pnpm db:generate` AND the generated SQL must be committed. The CI `schema-drift` job catches uncommitted migrations: it runs `db:generate` with a dummy `POSTGRES_URL` and fails if `git diff --exit-code drizzle/` shows changes.

**Files:** `src/lib/schema.ts`, `drizzle/`, `.github/workflows/ci.yml`
**Memory:** [[feedback_db_push_drift]]

### `connect_timeout: 10, idle_timeout: 20` prevents stale socket hangs

**File:** `src/lib/db.ts:22-23`
**Why:** Without these, a stale PostgreSQL connection can hang the Node event loop indefinitely. Production uses `idle_timeout: 60, max_lifetime: 1800`.

### 90 migrations and counting

**Directory:** `drizzle/` — migrations `0000` through `0089`. The journal at `drizzle/meta/_journal.json` tracks all 90 entries. Never delete or renumber migrations.

---

## 2. Connection & Polling Footguns

### Polling `useEffect` MUST use AbortController + 8s timeout

**Pattern (canonical):** `src/components/queue/queue-realtime-listener.tsx`
**What breaks:** Two components (`notification-bell.tsx`, `queue-realtime-listener.tsx`) previously polled without AbortController, hung requests exhausted the browser's 6-connection limit, blocking all API calls.

**Required pattern:**

```typescript
const abortRef = useRef<AbortController | null>(null);
useEffect(() => {
  const controller = new AbortController();
  abortRef.current?.abort(); // cancel in-flight before new poll
  abortRef.current = controller;
  const timeout = setTimeout(() => controller.abort(), 8000);
  // ... fetch with controller.signal ...
  return () => {
    clearTimeout(timeout);
    controller.abort();
  };
}, [deps]);
```

**Memory:** [[feedback_admin_polling_race]], Hard rule #10

### `useAdminPolling` uses AbortController identity as mutex

**What:** Never use a shared boolean ref for polling state — React Strict Mode double-invokes effects, and a boolean can flip back before the fetch completes. Use the AbortController instance itself as the mutex.

**Memory:** [[feedback_admin_polling_race]]

---

## 3. Billing & Money-Path Footguns

### AI quota must be consumed AFTER validation, BEFORE AI call

**Order matters:**

1. Zod validation passes
2. External preconditions checked
3. `tryConsumeAiQuota()` — atomic decrement
4. AI call — wrapped in try/catch that releases quota on throw

**Why:** Consuming quota after a successful AI call creates a race window where the user can fire multiple requests, all pass validation, and all charge. Consuming before validation charges for bad requests.

**Memory:** [[feedback_quota_consume_ordering]]

### Never call `getPlanLimits()` in route handlers

**Rule:** Use `require-plan.ts` gate helpers only. `getPlanLimits()` is for internal use. Hard rule #6.

**Files:** `src/lib/middleware/require-plan.ts` (28 gate functions, 790 lines), `src/lib/plan-limits.ts`

### Stripe webhook handler has 8 transaction blocks

**File:** `src/app/api/billing/webhook/route.ts` — handles created, updated, deleted, checkout completed, paused, resumed, trial ending, trial ended. Each is a separate `db.transaction()`. This is the most fragile route in the app — changes here need extra review.

### `billing/webhook/route.ts` has an allowlist of Stripe IPs

The webhook is unauthenticated (no session cookie) — it validates via Stripe signature verification. Do not add auth middleware to this route.

---

## 4. AI & Model Footguns

### Never hardcode AI model names

Always use env vars: `OPENROUTER_MODEL!`, `REPLICATE_MODEL_FAST!`, `REPLICATE_MODEL_PRO!`, `REPLICATE_MODEL_FALLBACK!`. Hard rule #3.

### OpenRouter is the only text generation provider

Never import OpenAI SDK directly for text. The one documented exception: OpenAI Moderation API at `src/lib/services/moderation.ts`. Hard rule #2.

### `getServerEnv()` validates the WHOLE schema

**File:** `src/lib/env.ts`
**Footgun:** `getServerEnv()` throws if ANY required env var is missing. This crashes at module init (in tests) and per-host (Railway lacks `REPLICATE_MODEL_*`). Use `process.env.X` in service code shared by web + worker, not `getServerEnv()`.

**Memory:** [[feedback_getserverenv_lazy]]

---

## 5. Nixpacks & Deployment Footguns

### Nixpacks `[phases.setup]` replaces, never extends

**File:** `nixpacks.toml`
**What breaks:** If you add a Nix package to `[phases.setup]` without also including `nodejs_22` + `pnpm-9_x`, pnpm vanishes from PATH and the build fails. The setup phase completely overrides auto-detection.

**Memory:** [[feedback_nixpacks_setup_phase]]

### Production auto-migrates

**File:** `package.json` script `build:ci`: runs `db:migrate` when `VERCEL_ENV=production`. Preview deploys skip migration. Since 2026-05-02.

**Memory:** [[project_vercel_build_migrations]]

---

## 6. OAuth & Token Footguns

### OAuth tokens are encrypted at rest

**File:** `src/lib/security/token-encryption.ts`
**Format:** `v1:kid:iv.ct.tag` — version, key ID, IV, ciphertext, auth tag.
**Guard:** `isEncryptedToken()` check before encrypting prevents double-encryption.
**Memory:** CLAUDE.md §"Non-Obvious Patterns"

### X token auto-deactivation (two-layer)

1. **Daily tier refresh** catches dead tokens within 24 hours
2. **Publish attempt** catches at post time
3. Diagnose with `pnpm diagnose:x-accounts` (has `--fix` flag)

**Memory:** [[project_x_token_failure_protection]]

### YouTube cookies incident

Cookies leaked to git history and were scrubbed from `main` + `fix/tier3-bug-batch` via `git-filter-repo`. Cookies rotated first. This is why you never commit credential files.

**Memory:** [[project_cookie_leak_scrub]]

---

## 7. TypeScript Footguns

### `exactOptionalPropertyTypes` is ON

Never do `prop={maybeUndefined}` — it will not compile. Use the spread pattern:

```typescript
{...(val !== undefined && { prop: val })}
```

Hard rule #9.

### `server-only` import must be first line

Any `src/lib/` module that imports from `db.ts` MUST have `import "server-only"` as its first line. Prevents Node.js builtins (`fs`, `net`, `tls`) from leaking into client bundles. Hard rule #14.

### Never use `any` types or `@ts-ignore`

Definition of Done #4. No exceptions.

---

## 8. Logging & Error Handling

### Never `console.log` or `console.error`

Use `import { logger } from "@/lib/logger"` with structured fields. Hard rule #11.

### Never `NextResponse.json()`

Use `Response.json()` in route handlers. Hard rule #12.

### Always use `ApiError` from `@/lib/api/errors`

Never inline `new Response(JSON.stringify(...))`. Use `createPlanLimitResponse()` for 402 responses. Hard rule #4.

---

## 9. Queue & Job Footguns

### Enqueue jobs AFTER transaction commits

Never call `queue.add()` inside a `db.transaction()` block. If the transaction rolls back, the job is already queued with stale data. Hard rule #13.

### X API 402 CreditsDepleted

Non-transient error — mark job failed on first 402 instead of burning 5 backoff cycles. Fix is deferred.
**Memory:** [[project_x_402_credits_depleted_short_circuit]]

---

## 10. Known Non-Issues (don't "fix" these)

| Issue                                      | Why it's ok                                  |
| ------------------------------------------ | -------------------------------------------- |
| `ioredis` Turbopack warning                | Cosmetic, cannot fix without breaking server |
| `.next/types/validator.ts` TS errors       | Next.js 16 + Turbopack generated file issue  |
| `processors.integration.test.ts` TS errors | Pre-existing test file issues                |

**Memory:** CLAUDE.md §"Known Non-Issues"

---

## 11. Fragile Files (changes here need extra care)

| File                                   | Why fragile                                                          | Risk                                |
| -------------------------------------- | -------------------------------------------------------------------- | ----------------------------------- |
| `src/app/api/billing/webhook/route.ts` | 8 transaction blocks, unauthenticated, Stripe signature verification | Money loss, subscription corruption |
| `src/lib/middleware/require-plan.ts`   | 28 gate functions, 790 lines, cached plan resolution                 | Plan gate bypass                    |
| `src/lib/services/ai-quota-atomic.ts`  | Atomic quota decrement with fallback to grants                       | Billing leak or denial-of-service   |
| `src/lib/queue/processors.ts`          | All BullMQ job processing logic                                      | Publishing failures                 |
| `nixpacks.toml`                        | Setup phase overwrites auto-detection                                | Worker deploy failure               |
| `src/lib/schema.ts`                    | 46 tables, 1808 lines, must stay in sync with migrations             | Schema drift, migration failures    |
| `src/lib/security/token-encryption.ts` | Encrypts/decrypts OAuth tokens                                       | Account disconnection               |
| `src/lib/db.ts`                        | Connection pool config, global singleton                             | Connection leaks                    |

---

## 12. When Things Go Wrong

| Symptom                          | First thing to check                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| Worker not processing jobs       | `pnpm debug-worker` skill, check Redis connectivity                                |
| Build failing on Railway         | `nixpacks.toml` — does `[phases.setup]` include `nodejs_22` + `pnpm-9_x`?          |
| X accounts disconnecting         | Token encrypted? Run `pnpm diagnose:x-accounts`                                    |
| AI quota overage                 | `tryConsumeAiQuota` order — was quota consumed before or after AI call?            |
| Browser stuck, API calls hanging | Polling without AbortController? Check for polling `useEffect` without cleanup     |
| Migration failures on prod       | Was `db:push` used without `db:generate`? Check `drizzle/` for uncommitted changes |
| Schema drift in CI               | Run `pnpm db:generate`, commit the new migration files                             |

---

_Maintained under hard rule #18 (self-improving system). If you hit a gotcha not listed here, add it immediately — before you forget the details. Every entry should reference the relevant memory file with `[[name]]` syntax._
