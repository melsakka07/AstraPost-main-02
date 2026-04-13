---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# Agent Orchestration Rules

## Task Decomposition — Analyze First

1. Identify subtasks and their dependency graph
2. Group by dependency — dependent tasks in same agent; independent groups in parallel agents
3. Define clear boundaries — each agent gets exact files to read/write (no overlapping writes)
4. Aggregate results — review all outputs together before reporting

## AstraPost Domain Splits

| Agent         | File Scope                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| backend-dev   | `src/app/api/**/*.ts`, `src/lib/services/**/*.ts`, `src/lib/queue/**/*.ts`                             |
| frontend-dev  | `src/components/**/*.tsx`, `src/app/dashboard/**/*.tsx`, `src/app/(marketing)/**/*.tsx`                |
| ai-specialist | `src/app/api/ai/**/*.ts`, `src/app/api/chat/**/*.ts`, `src/lib/ai/**/*.ts`, `src/lib/services/ai-*.ts` |
| db-migrator   | `src/lib/schema.ts`, `src/lib/db.ts`, `drizzle/**/*`                                                   |
| test-runner   | `src/**/*.test.ts`, `vitest.config.ts`                                                                 |

## Patterns

**New feature:** backend-dev + frontend-dev + db-migrator (if needed) in parallel → test-runner
**Bug fix:** researcher (Haiku, read-only) → WAIT → targeted dev agent → test-runner
**AI feature:** ai-specialist + frontend-dev in parallel → test-runner
**Refactor:** researcher maps files → WAIT → parallel dev agents by layer → test-runner + code-reviewer

## Verification (always parallel, always final)

After ALL code changes, spawn 3 agents in parallel: `pnpm lint` / `pnpm typecheck` / `pnpm test`
