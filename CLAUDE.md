# AstraPost - AI Social Media Manager for X (Twitter)

**MENA-focused** SaaS for scheduling tweets/threads, publishing via BullMQ worker, analytics, and AI content generation. Primary language: Arabic.

## Tech Stack

Next.js 16 (App Router), React 19, TypeScript 5.9, PostgreSQL 18 (pgvector), Drizzle ORM, BullMQ + Redis, shadcn/ui + Tailwind CSS 4, Better Auth (X OAuth 2.0, Instagram, LinkedIn), Stripe, Vercel AI SDK 5 + OpenRouter, Replicate API, Zod 4, next-intl (ar/en), Sentry, Resend

## Source of Truth

The code base is the only source of truth.

## First Steps

- Check the latest two updates in the (the first 100 lines) `docs/0-MY-LATEST-UPDATES.md` for recent changes before starting work, update the file with the latest changes once done
- `pnpm run check` — lint + typecheck (run after ALL changes)
- `pnpm test` — Vitest unit tests
- Package manager: **pnpm** (not npm)

## Hard Rules (Never Break)

1. **Run `pnpm run check` before considering any task complete**
2. **Use OpenRouter, NOT OpenAI for text generation** — `import { openrouter } from "@openrouter/ai-sdk-provider"`. (OpenAI Moderation API at `src/lib/services/moderation.ts` is the documented exception.)
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
16. **after any change, update the documentation if the changes touch the design and architecture of the code** — `docs/claude/AI_Endpoints_Models_and_Prompts_Full_Audit_Report.md` and the files in `docs/claude/`, and README.md whenever required. make sure these chnages are real and reflected in the code base
17. **Agent-first delegation is MANDATORY** — every phase (planning, design, implementation, operating, fixing, debugging) routes to a specialist agent. The main thread orchestrates, reviews, integrates. Only trivial single-file lookups stay inline — and you must say so explicitly ("skipping agent: single-file read"). See Agent Orchestration section for routing table.
18. **Self-improving system is MANDATORY** — agents/skills/CLAUDE.md/docs are living documents. Agents end every report with a `LESSONS:` line. Stale facts found during any task get fixed on the spot (not deferred). Skills that fail a step get fixed before the task continues. Every session folds durable lessons back into auto-memory with Why + How-to-apply.

## Enforcement Tiers

Enforcement escalates. Anything that caused real damage once, or was nearly missed twice, moves up a tier:

| Tier          | Mechanism              | Location                 | Example                                          |
| ------------- | ---------------------- | ------------------------ | ------------------------------------------------ |
| Advisory      | Docs + CLAUDE.md rules | `CLAUDE.md`, `docs/`     | "Never call `getPlanLimits()` in route handlers" |
| Prompted      | Permission `ask` rules | `.claude/settings.json`  | Confirmation before `db:reset` or Stripe-refund  |
| Deterministic | PreToolUse guard hook  | `.claude/hooks/guard.js` | Blocking destructive bash patterns, vendor edits |

## Definition of Done

1. `pnpm run check` passes (lint + typecheck)
2. `pnpm test` passes (unit tests — 705 tests, 52 files)
3. If plan gates or routes changed: `pnpm test:service-catalog:unit` passes
4. New files follow existing patterns in the same directory
5. No new `any` types or `@ts-ignore` comments

## Auth & Session Patterns

- **User routes**: `getTeamContext()` from `@/lib/team-context` → `ctx.currentTeamId` (userId for plan checks), `ctx.role` ("owner"|"admin"|"editor"|"viewer"), `ctx.isOwner`, `ctx.session`
- **Admin API routes**: `requireAdminApi()` from `@/lib/admin` → check `admin.ok`, return `admin.response` on failure
- **Admin pages (RSC)**: `requireAdmin()` from `@/lib/admin` → redirects to `/login` on failure
- **AI routes**: `aiPreamble()` from `@/lib/api/ai-preamble` — handles session + plan + rate-limit + quota + model instantiation

**Plan info:** Trial users get full Pro feature access (all gates open) for 14 days with capped quotas (50 AI text / 25 images, 20 posts, 1 X account, base image models only) — `TRIAL_EFFECTIVE_PLAN = "trial"` in `src/lib/plan-limits.ts`; plan gates handle it, no special code needed.

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
- **Service Catalog:** `docs/service-catalog.md` (78 services × 5 plans) + machine-readable config at `src/lib/services/__tests__/service-catalog/service-catalog.config.ts`
- **Testing Guide:** `docs/how-to-test.md` — when and how to run every test suite (local + prod)
- Errors: `src/lib/api/errors.ts`
- Rate limiter: `src/lib/rate-limiter.ts`
- AI preamble: `src/lib/api/ai-preamble.ts`
- Logger: `src/lib/logger.ts` | Correlation IDs: `src/lib/correlation.ts`
- Utils: `src/lib/utils.ts` (cn) | Billing cron: `src/app/api/cron/billing-cleanup/route.ts`
- Design tokens: `src/lib/tokens.ts` (hex constants for runtime), `src/app/globals.css` (6 scales × 12 steps × 2 modes = 144 OKLCH values + 21 semantic tokens); Tailwind utility classes: `bg-brand-9`, `text-success-11`, `border-danger-6`, etc.
- Brand: `src/components/brand/` — `Logo` (lockup, LTR/RTL/auto), `LogoMark` (sparkle); `currentColor`-driven, theme via Tailwind text utilities
- i18n: `src/i18n/messages/{en,ar,pseudo}.json` — next-intl message files; user-facing keys + `admin.*` namespace (~210 keys); `useTranslations()` in components, no hardcoded English strings

## Deploy & Environment

### Local Development

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local    # then fill in real values
docker-compose up -d           # PostgreSQL 18 + Redis
pnpm db:migrate
pnpm dev                       # http://localhost:3000
pnpm run worker                # separate terminal — BullMQ processor
```

### Quality Gates

```bash
pnpm run check                  # lint + typecheck + i18n (ALWAYS run before completing)
pnpm test                       # Vitest unit tests (705 tests, 52 files)
pnpm test:db                    # DB integration tests (needs PostgreSQL)
pnpm run format                 # Prettier

# Service Catalog Tests (plan-gate enforcement matrix)
pnpm test:service-catalog       # Full orchestrator (unit + opt-in integration/prod)
pnpm test:service-catalog:unit  # Gate unit tests + auto-discovery (fast, no server)
pnpm seed:test-accounts         # Create 5 test users across all plans in local DB
pnpm test:service-catalog:integration  # HTTP integration (needs dev server + seeded DB)
pnpm test:service-catalog:prod  # Read-only production smoke (needs TEST_TOKENS)
```

### Production (Vercel + Railway)

- **Web app:** Vercel auto-deploys on push to main. `build:ci` runs `db:migrate` when `VERCEL_ENV=production`. Preview deploys skip migration.
- **Worker:** Railway runs `pnpm run worker` via Nixpacks (`nixpacks.toml` + `railway.json`). Restarts on failure (max 10 retries).
- **Cron jobs (Vercel):** billing-cleanup (daily 2 AM), ai-cost-alarm (daily 12:07 AM), ai-counter-rollover (daily 12:03 AM)
- **CI (GitHub Actions):** 6 jobs — lint, typecheck, schema-drift (catches uncommitted migrations), dashboard-tokens, rtl-guard, db-tests (pgvector container), build

### Secrets & Credentials

- `.env.local` for local dev (gitignored). `.env.example` is the template.
- `getServerEnv()` at `src/lib/env.ts` validates required env vars at module init.
- OAuth tokens stored encrypted (`v1:kid:iv.ct.tag` format) via `src/lib/security/token-encryption.ts`.
- **Never print tokens, keys, or connection strings** to logs or terminal output.
- **Never commit `.env.local`, `.env.production`, or any file containing real credentials.**

### Access (from this machine)

- Vercel project via MCP (`vercel` plugin tools)
- Stripe MCP for billing inspection
- Railway CLI for worker logs
- No direct SSH to production databases — use Vercel/Railway log tools

## Git & Commits

- Branch from `main` — `feature/*` or `fix/*` prefix
- Conventional commits: `type(scope): description` — types: feat, fix, docs, test, chore, refactor
- CI: GitHub Actions → lint → typecheck → build on every push/PR
- Never force-push to main

## Agent Orchestration

Use sub-agents for 3+ file changes or independent subtasks. Never run sequential work that can be parallelized. Each agent gets scoped file boundaries — no overlapping writes. Final step: always parallel convention-enforcer + security-reviewer → test-runner.

Custom agents in `.claude/agents/`: feature-lead, backend-dev, frontend-dev, ai-specialist, i18n-dev, db-migrator, test-runner, researcher, code-reviewer, security-reviewer, performance-analyst, convention-enforcer, docs-writer
Rules: `.claude/rules/agent-orchestration.md`

### Harness Layer Stack

| Layer                  | Location                                           | Role                                                       | Loaded             |
| ---------------------- | -------------------------------------------------- | ---------------------------------------------------------- | ------------------ |
| Golden rules + routing | `CLAUDE.md` (root)                                 | Non-negotiable operating rules + agent/skill inventory     | Every session      |
| Agents                 | `.claude/agents/*.md`                              | 12 specialist agents, one domain each                      | On spawn           |
| Skills                 | `.claude/skills/*/SKILL.md`                        | 8 repeatable procedures with exact commands                | On invoke          |
| Templates              | `.claude/templates/`                               | Code stubs matching REAL current patterns                  | On reference       |
| Deep docs              | `docs/`                                            | Verified architecture, gotchas, domain docs                | On reference       |
| Auto-memory            | `~/.claude/projects/<proj>/memory/`                | Cross-session facts, feedback, incident history (27 files) | Recalled per topic |
| Hooks + permissions    | `.claude/settings.json` + `.claude/hooks/guard.js` | Deterministic guardrails                                   | Every tool call    |
| Rules                  | `.claude/rules/*.md`                               | Domain-specific conventions (13 files)                     | Loaded by agents   |

**Division of labor:** docs hold what's true, agents hold who does what and how, skills hold exact procedures, memory holds what happened and what the user wants, hooks hold what must never happen.

### Full Agent Inventory (13 agents)

| Agent                 | Domain                                             | Model   | Role         |
| --------------------- | -------------------------------------------------- | ------- | ------------ |
| `feature-lead`        | End-to-end feature design, research, orchestration | inherit | Orchestrator |
| `backend-dev`         | API routes, services, server-side logic            | inherit | Builder      |
| `frontend-dev`        | React components, dashboard pages, UI              | inherit | Builder      |
| `ai-specialist`       | AI endpoints, prompts, OpenRouter/Replicate        | inherit | Builder      |
| `db-migrator`         | Schema changes, Drizzle migrations                 | inherit | Builder      |
| `i18n-dev`            | next-intl, translations, RTL                       | inherit | Builder      |
| `docs-writer`         | CLAUDE.md, README, docs/claude/                    | haiku   | Builder      |
| `test-runner`         | Vitest, lint, typecheck                            | haiku   | Verifier     |
| `code-reviewer`       | Quality, security, conventions                     | inherit | Verifier     |
| `security-reviewer`   | Token storage, auth bypass, injection, secrets     | haiku   | Verifier     |
| `convention-enforcer` | All CLAUDE.md rules                                | haiku   | Verifier     |
| `performance-analyst` | N+1 queries, re-renders, DB indexes, bundle size   | haiku   | Verifier     |
| `researcher`          | Read-only code exploration, tracing, fact-finding  | haiku   | Explorer     |

**Agent contract** (every agent must have): router-written description with "Complements (does not replace): X, Y" boundary · read-first doc pointers · Verified Architecture section with file:line refs · numbered workflow with mandatory verification step · Guardrails (never-do, confirm-before, handoff edges) · References to docs/skills/siblings · "Continuous learning (mandatory)" footer. See `.claude/agents/` for current compliance status.

### Full Skill Inventory (8 skills)

| Skill           | Trigger                                             | Has learning footer? |
| --------------- | --------------------------------------------------- | -------------------- |
| `agent-browser` | Browser automation, screenshots, form filling       | No                   |
| `audit-routes`  | Audit all API routes for convention violations      | No                   |
| `debug-worker`  | Diagnose BullMQ worker issues                       | No                   |
| `e2e-test`      | Playwright end-to-end tests                         | No                   |
| `linear`        | Linear issue tracking (team AST)                    | No                   |
| `new-feature`   | Full-stack feature: schema → API → frontend → tests | No                   |
| `stripe-test`   | Stripe billing flow testing                         | No                   |
| `ui-ux-pro-max` | UI/UX design intelligence (67 styles, 96 palettes)  | No                   |

**Skill contract** (every skill must have): numbered steps with copy-paste commands · safety rails inline at the step where they matter · "When to run" trigger list · "Self-improvement (mandatory)" footer. See `.claude/skills/` for current compliance status.

### Quick Agent Selection

| Task              | Primary Agent                           | Also Spawn                              | Order                                     |
| ----------------- | --------------------------------------- | --------------------------------------- | ----------------------------------------- |
| **New feature**   | **feature-lead**                        | all builders + auditors (orchestrated)  | research → design → approve → orchestrate |
| New API route     | backend-dev                             | convention-enforcer + security-reviewer | impl → parallel audit                     |
| New AI endpoint   | ai-specialist                           | convention-enforcer + security-reviewer | impl → parallel audit                     |
| Schema change     | db-migrator                             | backend-dev (update callers)            | sequential                                |
| New component     | frontend-dev                            | —                                       | impl only                                 |
| New page          | frontend-dev                            | i18n-dev (if new strings)               | parallel                                  |
| New i18n keys     | i18n-dev                                | frontend-dev (if UI changes)            | parallel                                  |
| Billing/webhook   | backend-dev                             | convention-enforcer + security-reviewer | impl → parallel audit                     |
| Bug investigation | researcher                              | → targeted dev agent                    | sequential                                |
| Post-impl audit   | convention-enforcer + security-reviewer | → test-runner                           | parallel audit → test                     |
| Refactor          | researcher (map) → dev agents           | code-reviewer + test-runner             | map → impl → parallel review              |

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
- **X API capability, pricing & cost model (grounding source of truth)**: `docs/claude/x-api-reference.md` — read BEFORE designing any X API feature; facts tagged by source. Raw spec at `docs/reference/x-api-openapi.json`; live docs via the `x-docs` MCP.

# General Coding Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

**Skills to leverage:** `researcher` agent for AstraPost code, `Explore` agent for general lookups, `plan-feature` or `feature-dev:feature-dev` before implementation, `prp-core:codebase-analyst` to trace data flow, `prime` to load project context fast.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

**Skills to leverage:** `simplify` skill for reuse + efficiency review, `prp-core:code-simplifier` to reduce complexity while preserving behavior, `convention-enforcer` agent to flag deviations from AstraPost patterns.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

**Skills to leverage:** `code-reviewer` + `convention-enforcer` agents in parallel after edits, `prp-core:silent-failure-hunter` to catch swallowed errors / inappropriate fallbacks, `prp-core:comment-analyzer` to flag stale comments, `prp-core:prp-review-agents` for multi-agent PR review in one pass.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**Skills to leverage:** `check` skill as the canonical quality gate, `pre-commit` before committing, `test-runner` agent for tests/lint/typecheck, `prp-core:prp-implement` for plan-driven validation loops, `prp-core:prp-ralph` for autonomous retry-until-green, `prp-core:prp-debug` for root-cause analysis on failures, `loop` for interval-based polling.

---

## Pillar Quick-Reference

| Pillar      | First-Reach Skill                                | Backup                                                                  |
| ----------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| 1. Think    | `researcher` / `Explore`                         | `plan-feature`, `prp-core:codebase-analyst`, `prime`                    |
| 2. Simplify | `simplify`                                       | `prp-core:code-simplifier`, `convention-enforcer`                       |
| 3. Surgical | `code-reviewer` + `convention-enforcer` parallel | `prp-core:silent-failure-hunter`, `prp-core:prp-review-agents`          |
| 4. Verify   | `check`                                          | `pre-commit`, `test-runner`, `prp-core:prp-ralph`, `prp-core:prp-debug` |

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
