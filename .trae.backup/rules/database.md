---
paths:
  - "src/lib/schema.ts"
  - "src/lib/db.ts"
  - "drizzle/**/*"
  - "src/app/api/**/*.ts"
---

# Database Rules

- PostgreSQL 18 with Drizzle ORM — import `db` from `@/lib/db`, schema from `@/lib/schema`
- Schema: `src/lib/schema.ts` — single source of truth
- **Migration workflow:**
  1. Edit `src/lib/schema.ts`
  2. `pnpm db:generate` — creates SQL migration in `drizzle/`
  3. Review the generated `drizzle/*.sql` file
  4. `pnpm db:migrate` — apply migration
- **Dev shortcut**: `pnpm db:push` — pushes schema directly without migration files (local dev only, never for production changes)
- **Never edit existing migration SQL files** — always generate new ones
- **Production**: `pnpm build` auto-runs `db:migrate` before Next.js build
- Multi-table writes MUST use `db.transaction()` — no orphaned records
- Key tables: `posts`, `tweets`, `x_accounts`, `job_runs`, `tweet_analytics`, `subscriptions`, `agenticPosts`
