# Schema Consistency & Sync Strategy

## Deployment Strategy (canonical)

Production migrations run automatically on every Vercel **production** deploy.

| Environment               | Build command              | Runs `db:migrate`?                                 |
| ------------------------- | -------------------------- | -------------------------------------------------- |
| Local (`pnpm build`)      | `db:migrate && next build` | Yes — against your local `DATABASE_URL`            |
| Vercel **Production**     | `build:ci`                 | **Yes** — `VERCEL_ENV=production` gate triggers it |
| Vercel **Preview**        | `build:ci`                 | No — preview deploys never touch production        |
| GitHub Actions / other CI | `build:ci`                 | No — `VERCEL_ENV` is unset, gate skips migrate     |

The gate lives in `package.json`:

```json
"build:ci": "if [ \"$VERCEL_ENV\" = \"production\" ]; then pnpm run db:migrate; fi && next build"
```

If a production migration fails, the build fails and the deploy is rejected — production code can never ship referencing columns that don't exist yet.

## Workflow for schema changes

1. Edit `src/lib/schema.ts`
2. `pnpm db:generate` — creates SQL in `drizzle/` and updates `drizzle/meta/_journal.json`
3. Review the generated `.sql` carefully (and the journal entry — never delete or hand-rename existing entries)
4. `pnpm db:migrate` locally to apply + smoke test
5. Commit `schema.ts`, the new `drizzle/*.sql`, the updated snapshot, and the journal entry **together**
6. Push → on production deploy, Vercel runs `db:migrate` automatically before `next build`

## What used to fail

Before 2026-05-02, `vercel.json` pointed Vercel at `build:ci` which was just `next build` — no migrate step. Schema changes shipped without DB updates and broke production every time. This was patched by adding the `VERCEL_ENV=production` gate inside `build:ci` (see incident `docs/0-MY-LATEST-UPDATES.md` 2026-05-02).

## Other silent-failure class: missing i18n keys

- New navigation items added to `src/components/dashboard/sidebar-nav-data.ts`
- Translation keys are generated dynamically via `item.label.toLowerCase().replace(/\s+/g, "_")`
- No corresponding entry added to `src/i18n/messages/en.json` or `src/i18n/messages/ar.json`
- Runtime generates MISSING_MESSAGE errors when key lookup fails

## Detection Strategy

### Before Committing Code

**Checklist when modifying:**

1. **Touching `src/lib/schema.ts`?**
   - After ANY field addition/modification:
     ```bash
     pnpm db:generate  # Creates migration in drizzle/
     ```
   - Review the generated `.sql` file for correctness
   - Verify the migration will run: `pnpm db:migrate`

2. **Touching `src/components/dashboard/sidebar-nav-data.ts`?**
   - After adding ANY new `label` property:
     - Extract the snake_case version: `label: "Affiliate Dashboard"` → `affiliate_dashboard`
     - Add entry to both `src/i18n/messages/en.json` and `src/i18n/messages/ar.json`
     - Format check: `pnpm run check` (will catch missing keys if i18n validation is enabled)

3. **Adding any new nav section?**
   - Update section label translations too
   - Example: `label: "Growth"` needs `"growth": "Growth"` in en.json

### Pre-Commit Hook

Add to `settings.json` hooks (future iteration):

```json
{
  "hooks": {
    "pre-commit": [
      {
        "description": "Verify schema migrations exist",
        "command": "pnpm db:generate --check"
      },
      {
        "description": "Verify i18n keys for nav items",
        "command": "pnpm run lint"
      }
    ]
  }
}
```

### CI/CD Integration

GitHub Actions should:

1. Run schema generation check: ensure no new schema fields without migrations
2. Validate i18n completeness: verify all nav items have translation keys
3. Run full typecheck + build to catch migration failures early

## What Was Fixed

### Fixed Issues (2026-05-02) — Vercel migration gap

1. **Vercel build now runs migrations on production deploys.** `package.json` `build:ci` was rewritten with a `VERCEL_ENV=production` shell gate. Preview deploys still skip migrate, so a PR can never accidentally migrate production.
2. **Production schema synced.** Manually applied missing migrations 0062–0065 (`last_active_at`, posts.deleted_at, user_ai_counters, moderation_flag, three admin_audit_action enum values). SQL runbook saved at `docs/sql-runbooks/2026-05-02-apply-pending-migrations.sql`.
3. **Orphan migration removed.** `drizzle/0062_add_posts_deleted_at.sql` had no entry in `_journal.json` and was never reachable by `drizzle-kit migrate`. Deleted; column already in production via prior manual application and captured in later snapshots.

### Fixed Issues (2026-04-19)

1. **Missing i18n keys**
   - Added to `src/i18n/messages/en.json`:
     - `affiliate_dashboard`
     - `bio_generator`
     - `reply_generator`
     - `ai_calendar`
   - Added corresponding Arabic translations to `src/i18n/messages/ar.json`

## Query Selection Rules

**To prevent hidden failures, always use column projections:**

### ❌ Bad — selects all columns (will break if schema adds nullable field)

```typescript
const posts = await db.query.posts.findMany({
  where: and(eq(posts.userId, userId), eq(posts.status, "scheduled")),
  with: { tweets: true },
});
```

### ✅ Good — explicit columns

```typescript
const posts = await db.query.posts.findMany({
  where: and(eq(posts.userId, userId), eq(posts.status, "scheduled")),
  columns: { id: true, status: true, scheduledAt: true }, // Only what we need
  with: { tweets: true },
});
```

**Exception:** Simple count queries don't need projection:

```typescript
const [result] = await db
  .select({ count: sql<number>`count(*)` })
  .from(posts)
  .where(and(...));
```

## Ongoing Checks

### Before Each Feature/Update

- [ ] Schema changed? → Run `pnpm db:generate`
- [ ] Sidebar nav changed? → Update i18n files
- [ ] New query? → Use `columns: {}` projection
- [ ] Run `pnpm run check` → catches lint/type issues

### After Merge

- Production deploy auto-runs `db:migrate` (since 2026-05-02). If a migration fails, the deploy fails — fix and redeploy.
- Monitor Vercel build logs for `drizzle-kit migrate` output on every production deploy
- Monitor runtime logs for `column does not exist` errors (would indicate journal/snapshot drift, not a missed migration)
- Monitor for `MISSING_MESSAGE` console warnings

## Files to Watch

| File                                           | What It Affects      | Checklist                               |
| ---------------------------------------------- | -------------------- | --------------------------------------- |
| `src/lib/schema.ts`                            | Database structure   | Run `pnpm db:generate` after ANY edit   |
| `drizzle/*.sql`                                | Migration statements | Review generated SQL before commit      |
| `src/components/dashboard/sidebar-nav-data.ts` | Navigation labels    | Update i18n for each new `label:` entry |
| `src/i18n/messages/en.json`                    | English translations | Add all new nav item keys here          |
| `src/i18n/messages/ar.json`                    | Arabic translations  | Add all new nav item keys here          |

## Future Improvements

1. **Automated schema validator**: Script that checks if all schema fields have a corresponding migration
2. **i18n completeness linter**: Plugin that extracts sidebar labels and verifies all have translation keys
3. **Query analyzer**: ESLint rule that warns when `db.query.*.find*` is used without `columns:` projection
4. **Migration timestamp enforcement**: Require migrations to be generated fresh, not manually written
