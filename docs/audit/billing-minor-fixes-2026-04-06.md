# Billing Minor Fixes — Implementation Plan

> **Date**: 2026-04-06
> **Scope**: 3 minor fixes across 3 files
> **Estimated effort**: Small (each fix is 1-5 lines changed)

---

## LLM Implementation Instructions

### Agent Strategy

**All 3 fixes are independent — execute in parallel.**

- Spawn **code-explorer** agent: read the current code of all 3 files to confirm exact line numbers and surrounding context before editing:
  - `src/app/api/billing/change-plan/route.ts`
  - `src/app/api/billing/change-plan/preview/route.ts`
  - `src/app/api/billing/webhook/route.ts`

- After agent returns: apply all 3 fixes directly (no further exploration needed).

### Cross-Cutting Verification

After all fixes:
- Run `pnpm lint && pnpm typecheck` — must pass
- Run `pnpm test` — no regressions

### Key Rules

- Do NOT restructure or refactor surrounding code — these are surgical fixes only.
- Reuse existing imports (e.g., `inArray` from `drizzle-orm` is likely already imported in the webhook file; if not, add it).
- Follow CLAUDE.md: `ApiError` for errors, `db.transaction()` for multi-table writes.

---

## Fix 1: Remove Unused Queries in Preview Endpoint

**File**: `src/app/api/billing/change-plan/preview/route.ts`

**Problem**: Two DB queries are executed but their results are never stored or used — wasted database round-trips.

**Fix**: Remove both unused queries entirely. They compute `aiGenerations` count and `inspirationBookmarks` count, but neither value is referenced anywhere in the response.

**Delete** the `aiGenerations` query block:
```typescript
// DELETE THIS:
await db
  .select({ count: sql<number>`count(*)` })
  .from(aiGenerations)
  .where(and(eq(aiGenerations.userId, session.user.id), gte(aiGenerations.createdAt, startOfMonth)));
```

**Delete** the `inspirationBookmarks` query block:
```typescript
// DELETE THIS:
await db
  .select({ count: sql<number>`count(*)` })
  .from(inspirationBookmarks)
  .where(eq(inspirationBookmarks.userId, session.user.id));
```

**Also remove** any now-unused imports (`aiGenerations`, `inspirationBookmarks`) if they are no longer referenced elsewhere in the file.

---

## Fix 2: Batch Update for Scheduled Posts Cleanup in Webhook

**File**: `src/app/api/billing/webhook/route.ts`

**Problem**: Sequential `for` loop with individual `db.update()` per post. If a user has 50 excess scheduled posts, this is 50 separate DB queries.

**Fix**: Replace the `for` loop with a single batch update using `inArray`.

**Replace**:
```typescript
for (const post of postsToMove) {
  await db.update(posts)
    .set({ status: "draft" })
    .where(eq(posts.id, post.id));
}
```

**With**:
```typescript
const postIdsToMove = postsToMove.map((p) => p.id);
await db.update(posts)
  .set({ status: "draft" })
  .where(inArray(posts.id, postIdsToMove));
```

**Ensure** `inArray` is imported from `drizzle-orm` at the top of the file. Check if it's already imported; if not, add it to the existing import line.

---

## Fix 3: Clarify Transaction Safety in Change-Plan Route

**File**: `src/app/api/billing/change-plan/route.ts`

**Problem**: Two `db.update(subscriptions)` calls (cancel sync at ~line 61 and reactivation sync at ~line 115) are single-table writes, so they don't technically violate the multi-table transaction rule. However, the code's intent is clearer if we acknowledge this explicitly.

**Fix**: Add a brief comment above each `db.update()` call to document why a transaction is not needed:

Above the cancellation sync (~line 60):
```typescript
// Single-table write — no transaction needed (webhook also syncs this field)
await db
  .update(subscriptions)
  ...
```

Above the reactivation sync (~line 114):
```typescript
// Single-table write — no transaction needed (webhook also syncs this field)
await db
  .update(subscriptions)
  ...
```

This is a documentation-only change — no logic change required.

---

## Verification Checklist

- [ ] `pnpm lint && pnpm typecheck` passes
- [ ] `pnpm test` — no regressions
- [ ] Preview endpoint: no unused imports remain after removing the two queries
- [ ] Webhook: `inArray` imported from `drizzle-orm`
- [ ] Webhook: batch update works (test with a user who has multiple scheduled posts and downgrades)
