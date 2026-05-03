# AstraPost - AI Social Media Manager for X (Twitter)

**MENA-focused** SaaS for scheduling tweets/threads, publishing via BullMQ worker, analytics, and AI content generation. Primary language: Arabic.

## Tech Stack

Next.js 16 (App Router), React 19, TypeScript 5.9, PostgreSQL 18 (pgvector), Drizzle ORM, BullMQ + Redis, shadcn/ui + Tailwind CSS 4, Better Auth (X OAuth 2.0, Instagram, LinkedIn), Stripe, Vercel AI SDK 5 + OpenRouter, Replicate API, Zod 4, next-intl (ar/en), Sentry, Resend

## First Steps

- Check the latest two updates in the (the first 100 lines) `docs/0-MY-LATEST-UPDATES.md` for recent changes before starting work, update the file with the latest changes once done
- `pnpm run check` — lint + typecheck (run after ALL changes)
- `pnpm test` — Vitest unit tests
- Package manager: **pnpm** (not npm)

## Hard Rules (Never Break)

1. **Run `pnpm run check` before considering any task complete**
2. **Use OpenRouter, NOT OpenAI** — `import { openrouter } from "@openrouter/ai-sdk-provider"`
3. **Never hardcode AI model names** — env vars only: `OPENROUTER_MODEL!`, `REPLICATE_MODEL_FAST!`, `REPLICATE_MODEL_PRO!`, `REPLICATE_MODEL_FALLBACK!`
4. **Use `ApiError` from `@/lib/api/errors`** for all error responses — never inline `new Response(JSON.stringify(...))` or `NextResponse.json()`. Use `createPlanLimitResponse()` for 402 plan-limit responses.
5. **Multi-table writes MUST use `db.transaction()`** — prevents orphaned records
6. **Never call `getPlanLimits()` in route handlers** — use `require-plan.ts` gate helpers only
7. **Every AI endpoint must call `recordAiUsage()`** for billing tracking
8. **Shared Zod schemas** go in `src/lib/schemas/common.ts`; shared enums in `src/lib/constants.ts`
9. **`exactOptionalPropertyTypes` is ON** — use `{...(val !== undefined && { prop: val })}` spread pattern, never `prop={maybeUndefined}`
10. **Polling `useEffect` MUST use `AbortController` + 8s timeout + cleanup abort** — prevents connection leaks (canonical: `src/components/queue/queue-realtime-listener.tsx`)
11. **Never use `console.log` or `console.error`** — use `import { logger } from "@/lib/logger"` with structured fields
12. **Never use `NextResponse.json()`** — use `Response.json()` in route handlers
13. **Queue jobs must be enqueued AFTER `db.transaction()` commits** — never call `queue.add()` inside a transaction block
14. **Any `src/lib/` module that imports from `db.ts` MUST have `import "server-only"` as its first line** — prevents Node.js builtins (`fs`, `net`, `tls`) from leaking into client bundles via transitive imports
15. **Any UI/UX design or frontend change, you must follow industry best practices** such as using accessible color contrasts, intuitive navigation, and adhering to WCAG guidelines. Ensure all UI/UX and frontend designs are mobile friendly, dynamic (adapt to user input), and responsive (with fluid layouts that adjust to screen size).

## Definition of Done

1. `pnpm run check` passes (lint + typecheck)
2. `pnpm test` passes (unit tests)
3. New files follow existing patterns in the same directory
4. No new `any` types or `@ts-ignore` comments

## Auth & Session Patterns

- **User routes**: `getTeamContext()` from `@/lib/team-context` → `ctx.currentTeamId` (userId for plan checks), `ctx.role` ("owner"|"admin"|"editor"|"viewer"), `ctx.isOwner`, `ctx.session`
- **Admin API routes**: `requireAdminApi()` from `@/lib/admin` → check `admin.ok`, return `admin.response` on failure
- **Admin pages (RSC)**: `requireAdmin()` from `@/lib/admin` → redirects to `/login` on failure
- **AI routes**: `aiPreamble()` from `@/lib/api/ai-preamble` — handles session + plan + rate-limit + quota + model instantiation

**Plan info:** Trial users get a dedicated `trial` tier (50 AI gens / 25 images, base image models only) for 14 days automatically — `TRIAL_EFFECTIVE_PLAN = "trial"` in `src/lib/plan-limits.ts`; plan gates handle it, no special code needed.

**AI quota:** Use `tryConsumeAiQuota(userId, weight)` from `@/lib/services/ai-quota-atomic` for atomic decrement (prevents race overage). Falls back to `ai_quota_grants` rows when base quota exhausts. `aiPreamble({ quotaWeight: N })` wires this for gated routes.

## API Route Checklist (9 steps — implement in order)

1. **Auth** — `getTeamContext()`, return `new Response("Unauthorized", {status:401})` if null _(plain 401 here is correct — session middleware hasn't run yet, not an ApiError violation)_
2. **Role check** — reject viewers on mutations: `ApiError.forbidden("...")`
3. **Correlation ID** — `getCorrelationId(req)` for job-enqueuing or AI routes
4. **Parse + validate** — Zod `.safeParse()`, `ApiError.badRequest(parsed.error.issues)` on failure
5. **Rate limit** — `checkRateLimit()` → `createRateLimitResponse()` on failure
6. **Plan gate** — `check*Detailed()` → `createPlanLimitResponse()` on failure (402)
7. **Business logic** — `db.transaction()` for any multi-table writes
8. **Enqueue jobs** — AFTER transaction commits, never inside
9. **Return** — `Response.json({...})`, set `x-correlation-id` header when relevant

Canonical example: `src/app/api/posts/route.ts`

## Plan Gates

Import from `@/lib/middleware/require-plan`. See `.claude/rules/billing.md` for full gate list. All return `{ allowed: true } | PlanGateFailure`. Never call `getPlanLimits()` in route handlers.

## Key File Locations

- DB: `src/lib/db.ts` (client), `src/lib/schema.ts` (schema + inferred types)
- Auth: `src/lib/auth.ts` (server), `src/lib/auth-client.ts` (client)
- Team context: `src/lib/team-context.ts` (multi-account auth wrapper)
- Admin auth: `src/lib/admin.ts` (`requireAdmin`, `requireAdminApi`)
- Queue: `src/lib/queue/client.ts` (queues + job types + `SCHEDULE_JOB_OPTIONS`), `src/lib/queue/processors.ts`
- Storage: `src/lib/storage.ts` (local/Vercel Blob auto-switch)
- Encryption: `src/lib/security/token-encryption.ts`
- Plan gates: `src/lib/middleware/require-plan.ts`
- Plan limits: `src/lib/plan-limits.ts`
- Errors: `src/lib/api/errors.ts`
- Rate limiter: `src/lib/rate-limiter.ts`
- AI preamble: `src/lib/api/ai-preamble.ts`
- Logger: `src/lib/logger.ts` | Correlation IDs: `src/lib/correlation.ts`
- Utils: `src/lib/utils.ts` (cn) | Billing cron: `src/app/api/cron/billing-cleanup/route.ts`
- Design tokens: `src/lib/tokens.ts` (hex constants for runtime), `src/app/globals.css` (6 scales × 12 steps × 2 modes = 144 OKLCH values + 21 semantic tokens); Tailwind utility classes: `bg-brand-9`, `text-success-11`, `border-danger-6`, etc.
- Brand: `src/components/brand/` — `Logo` (lockup, LTR/RTL/auto), `LogoMark` (sparkle); `currentColor`-driven, theme via Tailwind text utilities

## Git & Commits

- Branch from `main` — `feature/*` or `fix/*` prefix
- Conventional commits: `type(scope): description` — types: feat, fix, docs, test, chore, refactor
- CI: GitHub Actions → lint → typecheck → build on every push/PR
- Never force-push to main

## Agent Orchestration

Use sub-agents for 3+ file changes or independent subtasks. Never run sequential work that can be parallelized. Each agent gets scoped file boundaries — no overlapping writes. Final step: always parallel convention-enforcer + security-reviewer → test-runner.

Custom agents in `.claude/agents/`: backend-dev, frontend-dev, ai-specialist, i18n-dev, db-migrator, test-runner, researcher, code-reviewer, security-reviewer, performance-analyst, convention-enforcer
Rules: `.claude/rules/agent-orchestration.md`

### Quick Agent Selection

| Task              | Primary Agent                           | Also Spawn                              | Order                        |
| ----------------- | --------------------------------------- | --------------------------------------- | ---------------------------- |
| New API route     | backend-dev                             | convention-enforcer + security-reviewer | impl → parallel audit        |
| New AI endpoint   | ai-specialist                           | convention-enforcer + security-reviewer | impl → parallel audit        |
| Schema change     | db-migrator                             | backend-dev (update callers)            | sequential                   |
| New component     | frontend-dev                            | —                                       | impl only                    |
| New page          | frontend-dev                            | i18n-dev (if new strings)               | parallel                     |
| New i18n keys     | i18n-dev                                | frontend-dev (if UI changes)            | parallel                     |
| Billing/webhook   | backend-dev                             | convention-enforcer + security-reviewer | impl → parallel audit        |
| Bug investigation | researcher                              | → targeted dev agent                    | sequential                   |
| Post-impl audit   | convention-enforcer + security-reviewer | → test-runner                           | parallel audit → test        |
| Refactor          | researcher (map) → dev agents           | code-reviewer + test-runner             | map → impl → parallel review |

## Plans

Plan files: `YYYY-MM-DD-<short-kebab-case-description>.md` in `.claude/plans/`. Never leave auto-generated names like `calm-silver-fox.md`.

## Reference Docs (read on demand when needed)

- **Project structure & file map**: `docs/claude/architecture.md`
- **Environment variables**: `docs/claude/env-vars.md`
- **AI features & endpoints**: `docs/claude/ai-features.md`
- **Recent fixes & known issues**: `docs/claude/recent-changes.md`
- **Latest updates log**: `docs/0-MY-LATEST-UPDATES.md`
- **Common task patterns**: `docs/claude/common-tasks.md`
- **Available scripts**: `docs/claude/scripts.md`
