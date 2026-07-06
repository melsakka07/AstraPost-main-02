# AstraPost — 5-Minute Onboarding

Quick start for developers joining the AstraPost project.

## What is AstraPost?

MENA-focused SaaS for AI-powered social media management on X (Twitter). Schedule tweets/threads, generate content with AI, analyze performance, manage multiple accounts. Primary language: Arabic. ~46 database tables, ~152 API routes, 12 specialist AI agents in the harness.

## Prerequisites

- **Node.js 22** (see `.nvmrc`)
- **pnpm 9** (package manager — not npm)
- **Docker** (for PostgreSQL 18 + Redis in local dev)

## 5-Minute Setup

```bash
git clone <repo-url> && cd AstraPost-main-02
pnpm install --frozen-lockfile
cp .env.example .env.local     # fill in required values (see docs/claude/env-vars.md)
docker-compose up -d            # starts PostgreSQL 18 (pgvector) + Redis
pnpm db:migrate                 # apply all 90 migrations
pnpm dev                        # http://localhost:3000
pnpm run worker                 # separate terminal — BullMQ job processor
```

## Key Files to Read First

| File                          | Why                                                           |
| ----------------------------- | ------------------------------------------------------------- |
| `CLAUDE.md`                   | Constitution — 18 hard rules, agent inventory, deploy recipes |
| `docs/ARCHITECTURE.md`        | System architecture and data flow                             |
| `docs/CODEBASE-INTERNALS.md`  | Gotchas, footguns, fragile patterns — highest-value doc       |
| `docs/DB-SCHEMA.md`           | All 46 tables, relationships, money path                      |
| `docs/0-MY-LATEST-UPDATES.md` | Most recent changes — read before starting work               |

## Quality Gates

```bash
pnpm run check      # lint + typecheck + i18n (run after EVERY change)
pnpm test           # Vitest unit tests
pnpm test:db        # DB integration tests (needs PostgreSQL running)
```

## Architecture at a Glance

```
Browser → Next.js 16 (Vercel) → PostgreSQL 18 (pgvector)
                               → Redis (BullMQ)
                               → OpenRouter (AI text)
                               → Replicate (AI images)
                               → Stripe (billing)
         BullMQ Worker (Railway) → X API / Instagram / LinkedIn
```

## Where Everything Lives

| What           | Where                                                             |
| -------------- | ----------------------------------------------------------------- |
| API routes     | `src/app/api/` (28 groups, ~152 route files)                      |
| React pages    | `src/app/dashboard/`, `src/app/admin/`, `src/app/(marketing)/`    |
| Components     | `src/components/` (24 directories)                                |
| Business logic | `src/lib/` (services, AI, queue, middleware)                      |
| Database       | `src/lib/schema.ts` (46 tables), `src/lib/db.ts` (connection)     |
| Auth           | `src/lib/auth.ts` (Better Auth), `src/lib/team-context.ts`        |
| Jobs           | `src/lib/queue/client.ts` (queues), `src/lib/queue/processors.ts` |
| i18n           | `src/i18n/messages/{en,ar,pseudo}.json` (~210 keys)               |
| Tests          | Root-level `*.test.ts` files (Vitest), `tests/e2e/` (Playwright)  |

## Before Your First Commit

1. `pnpm run check` passes
2. `pnpm test` passes
3. Read `CLAUDE.md` hard rules (all 18)
4. Update `docs/0-MY-LATEST-UPDATES.md` with your changes
5. Use conventional commits: `type(scope): description`

---

_Part of the AstraPost AI-engineering harness. See CLAUDE.md §"Harness Layer Stack" for the full system._
