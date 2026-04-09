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
4. **Use `ApiError` from `@/lib/api/errors`** for all error responses — never inline `new Response(JSON.stringify(...))` or `NextResponse.json()`
5. **Multi-table writes MUST use `db.transaction()`** — prevents orphaned records
6. **Never call `getPlanLimits()` in route handlers** — use `require-plan.ts` gate helpers only
7. **Every AI endpoint must call `recordAiUsage()`** for billing tracking
8. **Shared Zod schemas** go in `src/lib/schemas/common.ts`; shared enums in `src/lib/constants.ts`
9. **`exactOptionalPropertyTypes` is ON** — use `{...(val !== undefined && { prop: val })}` pattern, never `prop={maybeUndefined}`
10. **Polling `useEffect` MUST use `AbortController` + timeout + cleanup abort** — prevents connection leaks

## Definition of Done

1. `pnpm run check` passes (lint + typecheck)
2. `pnpm test` passes (unit tests)
3. New files follow existing patterns in the same directory
4. No new `any` types or `@ts-ignore` comments

## Testing

- **Framework**: Vitest — tests co-located with source (`*.test.ts`) or in `__tests__/` directories
- **Run tests**: `pnpm test` (unit), `pnpm test:e2e:ui` (Playwright)
- **Mocking**: Use `vi.hoisted()` for mock data, `vi.mock()` for module mocks — see existing tests for patterns
- **When to add tests**: API routes, services with business logic, middleware — skip trivial UI components
- **Integration test**: Only `processors.integration.test.ts` — requires Redis; don't add more without discussion

## Git & Commits

- **Branch from `main`** — use `feature/*` or `fix/*` prefix (e.g. `feature/billing-upgrade`, `fix/polling-leak`)
- **Commit style**: conventional commits — `type(scope): description`
  - Types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`
  - Scopes match the area: `composer`, `billing`, `ai-quota`, `ui`, etc.
- **CI**: GitHub Actions runs lint → typecheck → build on every push/PR to main
- **Don't force-push to main**

## AI Providers

- **OpenRouter** (`@openrouter/ai-sdk-provider`): thread, translate, tools, affiliate, agentic, chat — model via `process.env.OPENROUTER_MODEL!`
- **Google Gemini** (`@ai-sdk/google`): inspiration — needs `GEMINI_API_KEY`
- **Replicate**: image generation — models via env vars
- Model mapping: `src/lib/services/ai-image.ts` → `startImageGeneration()`

## Auth & Plans

- Server: `import { auth } from "@/lib/auth"` → `auth.api.getSession({ headers: await headers() })`
- Client: `import { ... } from "@/lib/auth-client"`
- Plan info: `user.plan` column (manual override, wins) + `subscriptions` table (Stripe)
- Trial users get Pro Monthly limits (not unlimited)

## Dashboard Pages (MANDATORY)

- Every `/dashboard/*` page MUST have a sidebar entry in `src/components/dashboard/sidebar.tsx`
- Every dashboard page MUST use `<DashboardPageWrapper icon={...} title="..." description="...">`
- Sidebar is the single source of truth for navigation

## Key File Locations

- DB: `src/lib/db.ts` (client), `src/lib/schema.ts` (schema)
- Auth: `src/lib/auth.ts` (server), `src/lib/auth-client.ts` (client)
- Queue: `src/lib/queue/client.ts` (client), `src/lib/queue/processors.ts` (processors)
- Storage: `src/lib/storage.ts` (local/Vercel Blob auto-switch)
- Encryption: `src/lib/security/token-encryption.ts`
- Plan gates: `src/lib/middleware/require-plan.ts`
- Plan limits: `src/lib/plan-limits.ts`
- Errors: `src/lib/api/errors.ts`

## Agent Orchestration

Use sub-agents for multi-file tasks. Split by concern, run independent work in parallel.

**When to use agents:** 3+ file changes, independent subtasks, research + implementation, verification.

**Rules:**

- Never run independent work sequentially when parallelized agents work
- Each agent gets scoped file boundaries — no overlapping writes
- Wait for dependent agent output before spawning the next — never use placeholders
- Always run verification (lint + typecheck + test) as parallel agents as the final step
- Use GLM-4.7 (subagent model) for exploration, GLM-5-Turbo (sonnet) for implementation, GLM-5.1 (opus) for architecture

**Custom agents:** `.claude/agents/` — backend-dev, frontend-dev, ai-specialist, db-migrator, test-runner, researcher, code-reviewer
**Orchestration rules:** `.claude/rules/agent-orchestration.md`
**Team patterns:** `docs/claude/agent-patterns.md`

## Reference Docs (read on demand when needed)

- **Project structure & file map**: `docs/claude/architecture.md`
- **Environment variables**: `docs/claude/env-vars.md`
- **AI features & endpoints**: `docs/claude/ai-features.md`
- **Recent fixes & known issues**: `docs/claude/recent-changes.md`
- **Common task patterns**: `docs/claude/common-tasks.md`
- **Available scripts**: `docs/claude/scripts.md`
