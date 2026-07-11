# How to Test AstraPost

> **Last updated:** 2026-07-11  
> **Related:** [`docs/service-catalog.md`](service-catalog.md), [`.claude/plans/2026-07-11-service-catalog-test-suite.md`](../.claude/plans/2026-07-11-service-catalog-test-suite.md)

---

## Quick Reference

| Command                                 | What It Does                         | Needs Server?    | Needs DB?        |
| --------------------------------------- | ------------------------------------ | ---------------- | ---------------- |
| `pnpm run check`                        | Lint + typecheck + i18n validation   | No               | No               |
| `pnpm test`                             | All 705 unit tests (52 files)        | No               | No               |
| `pnpm test:db`                          | Real DB integration test             | No               | Yes (PostgreSQL) |
| `pnpm test:service-catalog:unit`        | 228 gate + auto-discovery tests      | No               | No               |
| `pnpm seed:test-accounts`               | Create 5 test users across all plans | No               | Yes (PostgreSQL) |
| `pnpm test:service-catalog:integration` | HTTP-level gate verification         | Yes (`pnpm dev`) | Yes              |
| `pnpm test:service-catalog:prod`        | Read-only production smoke           | No (remote)      | No               |
| `pnpm test:service-catalog`             | Full orchestrator                    | Depends on flags | Depends on flags |
| `pnpm test:e2e:ui`                      | Playwright browser E2E               | Yes (`pnpm dev`) | Yes              |

---

## Before Every Commit

```bash
pnpm run check    # Must pass — lint + typecheck + i18n
pnpm test         # Must pass — all 705 unit tests
```

---

## Testing Service Catalog (Plan Gates)

The service catalog test suite verifies that all 78 user-facing services are correctly gated across 5 plan tiers (Free, Trial, Pro Monthly, Pro Annual, Agency).

### Local: Fast Gate Unit Tests

```bash
pnpm test:service-catalog:unit
```

- **228 tests**, < 1 second, no server or DB needed
- 145 gate unit tests — calls every plan gate function with mocked DB
- 83 auto-discovery tests — scans codebase for drift between routes and config
- Run after ANY change to `require-plan.ts`, `plan-limits.ts`, or adding a new API route

### Local: Seed Test Accounts

```bash
pnpm seed:test-accounts
```

Creates 5 test users in your **local PostgreSQL**:

| Email                                            | Plan        | Trial?  | Quota Grant |
| ------------------------------------------------ | ----------- | ------- | ----------- |
| `test-free-xxxxxxxx@astrapost-test.local`        | free        | No      | 1000 units  |
| `test-trial-xxxxxxxx@astrapost-test.local`       | free        | 14 days | 1000 units  |
| `test-pro-monthly-xxxxxxxx@astrapost-test.local` | pro_monthly | No      | 1000 units  |
| `test-pro-annual-xxxxxxxx@astrapost-test.local`  | pro_annual  | No      | 1000 units  |
| `test-agency-xxxxxxxx@astrapost-test.local`      | agency      | No      | 1000 units  |

Each user gets a Better Auth session token (30-day expiry). Tokens are written to `TEST_TOKENS.json` at the repo root (gitignored).

The script is **idempotent** — running it again deletes and recreates all test users.

> **Prerequisites:** `POSTGRES_URL` in `.env.local`, `docker-compose up -d`

### Local: HTTP Integration Tests

```bash
# Terminal 1
pnpm dev

# Terminal 2
RUN_INTEGRATION_TESTS=1 pnpm test:service-catalog:integration
```

This:

1. Re-seeds the 5 test accounts
2. Hits ~130 real API endpoints with session cookies
3. Verifies 200 (allowed) vs 402 (denied) status codes
4. Tolerates 401/404/422/429 as non-gate infrastructure noise

**Key assertions:**

- Allowed plans → response must NOT be 402
- Denied plans → response must NOT be 200

> Without `RUN_INTEGRATION_TESTS=1`, all 133 integration tests skip automatically.

### Production: Read-Only Smoke Tests

#### Step 1: Get Production Tokens

You need 3-5 real accounts on production (one per plan). Two approaches:

**Option A — Create real accounts:**

1. Sign up at `https://astrapost.app` for a free account
2. Subscribe to Pro Monthly / Agency via Stripe
3. For trial: sign up fresh (14-day trial auto-activates)

**Option B — Use existing accounts:**
If you have personal accounts across plans, extract their tokens.

**Extract token from browser:**

```
DevTools → Application → Cookies → astrapost.app → better-auth.session_token → Copy value
```

#### Step 2: Run

```bash
TEST_BASE_URL=https://astrapost.app \
TEST_TOKENS='{"free":"tok_free","trial":"tok_trial","pro_monthly":"tok_pro","pro_annual":"tok_pro_annual","agency":"tok_agency"}' \
pnpm test:service-catalog:prod
```

This hits **21 read-only GET endpoints** across all categories:

| Category          | Endpoints Tested                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| AI Text           | `/api/ai/history`, `/api/ai/quota`, `/api/ai/trends`                                                                                 |
| AI Image          | — (status/quota endpoints are ungated)                                                                                               |
| Content-to-Thread | `/api/ai/youtube-to-thread/capabilities`                                                                                             |
| Posts             | `/api/posts` (GET), `/api/media/library`                                                                                             |
| Analytics         | `/api/analytics/followers`, `/api/analytics/self-stats`, `/api/analytics/best-time`, `/api/analytics/viral`, `/api/analytics/export` |
| Social            | `/api/x/accounts` (GET), `/api/x/health`                                                                                             |
| Billing           | `/api/billing/status`, `/api/billing/usage`                                                                                          |
| Team              | `/api/team/members` (Agency-only)                                                                                                    |
| Other             | `/api/notifications`, `/api/templates`, `/api/changelog`, `/api/announcement`                                                        |

**What it verifies:**

- Free user → gated endpoints return **402**
- Pro user → gated endpoints return **200**
- Agency user → team endpoints return **200** (Free/Pro get 402)

Zero mutations, zero side effects, zero cost — pure read-only gate checks.

> If `TEST_TOKENS` is not set, all tests skip gracefully with a clear message. Safe to have in the repo.

---

## Testing Individual Areas

### Database Changes

```bash
pnpm db:generate          # Generate migration from schema changes
pnpm db:migrate           # Apply migration to local DB
pnpm test:db              # Real DB integration test
```

### Queue / Worker

```bash
pnpm run worker           # Start BullMQ worker locally
# Then run the debug skill:
# /debug-worker
```

### E2E UI

```bash
pnpm dev                  # Start dev server
pnpm test:e2e:ui          # Playwright browser tests
```

### Billing / Stripe

```bash
# Use the Stripe test skill:
# /stripe-test
```

---

## CI / GitHub Actions

These run automatically on every push and PR:

| Job                | What It Checks                                    |
| ------------------ | ------------------------------------------------- |
| `lint`             | ESLint across all files                           |
| `typecheck`        | `tsc --noEmit`                                    |
| `schema-drift`     | Uncommitted Drizzle migrations                    |
| `dashboard-tokens` | Design token consistency                          |
| `rtl-guard`        | RTL/layout regressions                            |
| `db-tests`         | PostgreSQL integration tests (pgvector container) |
| `build`            | Production build succeeds                         |

**Service catalog tests do NOT run in CI** — manual only via `pnpm test:service-catalog`.

---

## When to Run What

| After changing...     | Run...                                                     |
| --------------------- | ---------------------------------------------------------- |
| `require-plan.ts`     | `pnpm test:service-catalog:unit`                           |
| `plan-limits.ts`      | `pnpm test:service-catalog:unit`                           |
| Any API route handler | `pnpm test:service-catalog:unit` + `pnpm test`             |
| `schema.ts`           | `pnpm db:generate` + `pnpm db:migrate` + `pnpm test`       |
| New API route added   | `pnpm test:service-catalog:unit` (auto-discovery flags it) |
| New feature shipped   | `pnpm test:service-catalog:integration` (local)            |
| Deploy to production  | `pnpm test:service-catalog:prod` (after deploy)            |
| Before every commit   | `pnpm run check` + `pnpm test`                             |
