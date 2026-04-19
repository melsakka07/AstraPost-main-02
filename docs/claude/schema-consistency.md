# Schema Consistency & Sync Strategy

## Problem

Two classes of silent failures have occurred:

1. **Database schema-migration mismatch**: Code references columns (e.g., `deletedAt`) defined in `src/lib/schema.ts` but not migrated to the actual database
2. **Missing i18n keys**: Sidebar nav data references labels (e.g., "Affiliate Dashboard") that have no corresponding translation keys

These are particularly dangerous because:

- They fail silently at runtime when queries hit the database
- They only appear when specific code paths are executed
- They're invisible in lint/typecheck

## Root Causes

### Schema Drift

- Schema file (`src/lib/schema.ts`) is modified → defines new columns
- Developer forgets to run `pnpm db:generate` → no migration created
- Deployment skips migration step → production DB never updated
- Any query selecting that table fails with `column does not exist`

### i18n Drift

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

### Fixed Issues (2026-04-19)

1. **Missing `posts.deleted_at` column**
   - Defined in schema.ts line 405 but never migrated
   - Created migration: `drizzle/0062_add_posts_deleted_at.sql`
   - Applied via `pnpm db:migrate`

2. **Missing i18n keys**
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

- Production deploy always includes migration step
- Monitor for `column does not exist` errors in logs
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
