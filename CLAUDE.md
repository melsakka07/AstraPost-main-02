# AstraPost - AI Social Media Manager for X (Twitter)

**MENA-focused** SaaS for scheduling tweets/threads, publishing via BullMQ worker, analytics, and AI content generation. Primary language: Arabic.

## Tech Stack

Next.js 16 (App Router), React 19, TypeScript, PostgreSQL 18 (pgvector), Drizzle ORM, BullMQ + Redis, shadcn/ui + Tailwind CSS 4, Better Auth (X OAuth 2.0 only), Stripe, Vercel AI SDK 5 + OpenRouter, Google Gemini, Replicate API

## First Steps

- Check `docs/0-MY-LATEST-UPDATES.md` for recent changes before starting work
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

## Anti-Patterns (Never Do)

| Wrong                                                 | Right                                       |
| ----------------------------------------------------- | ------------------------------------------- |
| `new Response(JSON.stringify({error}), {status:400})` | `ApiError.badRequest("msg")`                |
| `NextResponse.json({error}, {status:400})`            | `Response.json({error}, {status:400})`      |
| `console.log("debug:", data)`                         | `logger.info("event", {data})`              |
| `openrouter("anthropic/claude-3.5-sonnet")`           | `openrouter(process.env.OPENROUTER_MODEL!)` |
| `getPlanLimits(user.plan)` in route handlers          | `checkPostLimitDetailed(userId, count)`     |
| `queue.add(...)` inside `db.transaction()`            | Enqueue after transaction commits           |
| `type Post = { id: string; ... }`                     | `type Post = typeof posts.$inferSelect`     |

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

**Plan info:** Trial users get Pro Monthly limits for 14 days automatically — plan gates handle it, no special code needed.

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

## Plan Gates Reference

Import from `@/lib/middleware/require-plan`. Boolean feature gates: `checkAgenticPostingAccessDetailed`, `checkViralScoreAccessDetailed`, `checkVariantGeneratorAccessDetailed`, and others. Quota gates: `checkPostLimitDetailed`, `checkAiQuotaDetailed`, `checkAiImageQuotaDetailed`. All return `{ allowed: true } | PlanGateFailure`. Pass failures to `createPlanLimitResponse()` → 402 with `upgrade_url`, `suggested_plan`, `trial_active`, `reset_at`.

Never call `getPlanLimits()` directly in route handlers — only in services that already hold the plan string.

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

## Git & Commits

- Branch from `main` — `feature/*` or `fix/*` prefix
- Conventional commits: `type(scope): description` — types: feat, fix, docs, test, chore, refactor
- CI: GitHub Actions → lint → typecheck → build on every push/PR
- Never force-push to main

## Agent Orchestration

Use sub-agents for 3+ file changes or independent subtasks. Never run sequential work that can be parallelized. Each agent gets scoped file boundaries — no overlapping writes. Final step: always parallel lint + typecheck + test agents.

Custom agents in `.claude/agents/`: backend-dev, frontend-dev, ai-specialist, db-migrator, test-runner, researcher, code-reviewer, security-reviewer, performance-analyst, convention-enforcer
Rules: `.claude/rules/agent-orchestration.md` | Patterns: `docs/claude/agent-patterns.md`

## Plans

Plan files: `YYYY-MM-DD-<short-kebab-case-description>.md` in `.claude/plans/`. Never leave auto-generated names like `calm-silver-fox.md`.

## Reference Docs (read on demand when needed)

- **Project structure & file map**: `docs/claude/architecture.md`
- **Environment variables**: `docs/claude/env-vars.md`
- **AI features & endpoints**: `docs/claude/ai-features.md`
- **Recent fixes & known issues**: `docs/claude/recent-changes.md`
- **Common task patterns**: `docs/claude/common-tasks.md`
- **Available scripts**: `docs/claude/scripts.md`
