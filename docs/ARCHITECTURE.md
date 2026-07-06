# AstraPost — System Architecture

> **Verified against code on 2026-07-06.** Cross-reference with `docs/claude/architecture.md` for file-level layout.

## Deployment Topology

```
┌──────────────────────────────────────────────────────────┐
│                        USERS                              │
└────────────┬──────────────────────────────┬──────────────┘
             │                              │
     ┌───────▼───────┐               ┌──────▼──────┐
     │  Next.js 16    │               │   Railway   │
     │  (Vercel)      │               │  (Nixpacks) │
     │                │               │             │
     │  App Router    │               │  BullMQ     │
     │  RSC + API     │    Redis      │  Worker     │
     │  Routes        │◄─────────────►│             │
     │                │               │  X/Twitter  │
     │  Fluid Compute │               │  Instagram  │
     │                │               │  LinkedIn   │
     └───────┬───────┘               └──────────────┘
             │
     ┌───────▼───────┐
     │  PostgreSQL 18 │
     │  (Vercel       │
     │   Marketplace) │
     │  + pgvector    │
     └───────┬───────┘
             │
     ┌───────▼───────────────────────────────┐
     │           External APIs                │
     │  OpenRouter (AI text)                  │
     │  Replicate (AI images)                 │
     │  Stripe (billing)                      │
     │  X API v2 (tweets, analytics)          │
     │  Instagram Graph API                   │
     │  LinkedIn API                          │
     │  Sentry (error tracking)               │
     │  Resend (email)                        │
     └────────────────────────────────────────┘
```

**Key files:** `vercel.json`, `railway.json`, `nixpacks.toml`, `.github/workflows/ci.yml`

## Data Flow: Post Publishing

```
1. User creates post in Composer
   ↓  src/components/composer/
2. POST /api/posts → validated, saved to DB
   ↓  src/app/api/posts/route.ts
3. BullMQ job enqueued (AFTER transaction commits)
   ↓  src/lib/queue/client.ts
4. Railway worker picks up job
   ↓  src/lib/queue/processors.ts
5. Worker calls X API v2 to publish
   ↓  src/lib/services/x-api.ts
6. Analytics backfill enqueued
   ↓  src/lib/services/analytics.ts
7. Post status updated in DB
   ↓  src/lib/schema.ts (posts table)
```

**Canonical route:** `src/app/api/posts/route.ts` — implements the full 9-step API checklist.

## Data Flow: AI Content Generation

```
1. User requests AI generation (e.g., thread, bio, reply)
   ↓  src/app/api/ai/*/route.ts
2. aiPreamble() — session + plan gate + rate limit + quota check
   ↓  src/lib/api/ai-preamble.ts
3. tryConsumeAiQuota() — atomic decrement
   ↓  src/lib/services/ai-quota-atomic.ts
4. AI call via OpenRouter / Replicate
   ↓  @openrouter/ai-sdk-provider
5. recordAiUsage() — billing tracking
   ↓  src/lib/schema.ts (aiGenerations table)
6. Moderation check (OpenAI Moderation API)
   ↓  src/lib/services/moderation.ts
```

**22 AI-billing routes** call `recordAiUsage()`. See Phase 1 recon for full list.

## Data Flow: Billing (Stripe)

```
1. User initiates checkout → POST /api/billing/checkout
   ↓  Stripe Checkout Session
2. Stripe sends webhooks → POST /api/billing/webhook
   ↓  Signature verified (no auth middleware)
3. Webhook handler: 8 transaction blocks for lifecycle events
   ↓  src/app/api/billing/webhook/route.ts
4. Subscription state updated → plan gates recalculated
   ↓  src/lib/middleware/require-plan.ts (5-min cache)
5. Daily cleanup cron: expires trials, handles grace periods
   ↓  src/app/api/cron/billing-cleanup/route.ts (Vercel cron, 2 AM daily)
```

**Money-path tables:** `subscriptions`, `promoCodes`, `promoCodeRedemptions`, `planChangeLog`, `userAiCounters`, `userImageCounters`, `aiQuotaGrants`, `processedWebhookEvents`, `webhookDeliveryLog`, `webhookDeadLetterQueue`

## Auth Architecture

- **Framework:** Better Auth (`src/lib/auth.ts`)
- **Providers:** X OAuth 2.0, Instagram, LinkedIn
- **Team/Multi-account:** `src/lib/team-context.ts` — `getTeamContext()` returns `{ currentTeamId, role, isOwner, session }`
- **Admin:** `src/lib/admin.ts` — `requireAdmin()` (RSC pages), `requireAdminApi()` (API routes)
- **Token encryption:** `src/lib/security/token-encryption.ts` — OAuth tokens encrypted at rest (`v1:kid:iv.ct.tag`)
- **Impersonation:** Admin can impersonate users (audit-logged at `adminAuditLog` table)
- **Session types:** `CLAUDE.md §"Auth & Session Patterns"`

## Plan & Quota Architecture

- **5 plan tiers:** `free`, `trial` (14-day full Pro, capped quotas), `pro_monthly`, `pro_annual`, `agency`
- **29 gated features** in `src/lib/middleware/require-plan.ts` (790 lines, 28 gate functions)
- **Plan resolution:** `getPlanContext()` with 5-minute cache. Trial-elevated effective plan.
- **Quota system:** `userAiCounters` + `userImageCounters` (atomic decrement via `tryConsumeAiQuota()`) + `aiQuotaGrants` (admin manual top-ups) + `ai_counter_rollover` cron (daily reset)
- **Plan limits:** `src/lib/plan-limits.ts` (182 lines) — per-tier caps on posts, AI generations, images, accounts, bookmarks, scheduling horizon, tools, analytics retention

## Queue Architecture

- **Library:** BullMQ 5.x over Redis
- **Queues:** Defined in `src/lib/queue/client.ts`
- **Processors:** All job processing logic in `src/lib/queue/processors.ts`
- **Worker:** Runs on Railway via `scripts/worker.ts` — started with `pnpm run worker`
- **SSE endpoint:** `src/app/api/queue/sse/route.ts` — real-time job status updates
- **Job types:** Post publishing, analytics refresh, token health check, AI generation

## i18n Architecture

- **Library:** next-intl 4.x
- **Languages:** Arabic (primary), English
- **Messages:** `src/i18n/messages/{ar,en,pseudo}.json` — ~210 keys including `admin.*` namespace
- **RTL:** Arabic layout via Tailwind RTL variants + directional components
- **Config:** `src/i18n/request.ts` (next-intl plugin), wrapped in `next.config.ts` via `withNextIntl`

## Monitoring & Observability

- **Error tracking:** Sentry (`sentry.client/edge/server.config.ts`)
- **Structured logging:** `src/lib/logger.ts` — no `console.log` anywhere
- **Correlation IDs:** `src/lib/correlation.ts` — tracks requests through queue → publish → analytics
- **AI cost tracking:** `aiGenerations` table tracks tokens, model, latency, cost per generation
- **Admin dashboard:** AI usage metrics at `src/app/admin/ai-metrics/`, operations center at `src/app/admin/operations/`
- **Health endpoints:** `src/app/api/admin/health/route.ts`, `src/app/api/x/health/route.ts`

---

_All facts verified against code on 2026-07-06. File paths are clickable references. For the file-level map, see `docs/claude/architecture.md`._
