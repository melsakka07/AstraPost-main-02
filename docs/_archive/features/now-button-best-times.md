# Feature: "Now" Button in Best Times to Post

**Date:** 2026-03-15
**Status:** Implemented
**Scope:** Frontend only — single component change

---

## Overview

Add a **"Now"** button to the "Best times to post" section in the Composer page (`/dashboard/compose`). When clicked, it captures the current system date and time and populates the "Schedule for" datetime input, enabling users to instantly schedule a post for immediate publication.

---

## User Story

> As a user composing a tweet or thread, I want to quickly set the scheduled time to "right now" so I can schedule a post for immediate publishing without manually entering the current date and time.

---

## Affected Files

| File                                                | Change                                 |
| --------------------------------------------------- | -------------------------------------- |
| `src/components/composer/best-time-suggestions.tsx` | Add "Now" button to the time slots row |

---

## Implementation Plan

### Phase 1 — Analysis (Complete)

1. Reviewed `src/app/dashboard/compose/page.tsx` — thin shell, renders `<Composer />`.
2. Reviewed `src/components/composer/composer.tsx` — manages `scheduledDate` state (`string`, format `yyyy-MM-dd'T'HH:mm`). Passes `setScheduledDate` as `onSelect` prop to `<BestTimeSuggestions />`.
3. Reviewed `src/components/composer/best-time-suggestions.tsx` — renders suggested time slot buttons using:
   - `variant="secondary"`, `size="sm"`
   - `className="h-7 text-xs bg-primary/10 hover:bg-primary/20 text-primary border-transparent"`
   - Calls `onSelect(dateStr)` with `format(targetDate, "yyyy-MM-dd'T'HH:mm")`

### Phase 2 — Implementation (Complete)

**Single change in `best-time-suggestions.tsx`:**

- Add a `handleNow` function that:
  1. Gets `new Date()` (current system time)
  2. Formats it as `"yyyy-MM-dd'T'HH:mm"` using `date-fns/format` (already imported)
  3. Calls `onSelect(dateStr)`

- Add a "Now" button to the `flex flex-wrap gap-2` container, **before** the mapped time slots (leftmost position for visual prominence):
  - Identical styling: `variant="secondary"`, `size="sm"`, same `className`
  - Label: `Now`
  - `onClick`: calls `handleNow`

- The "Now" button is **always visible** when `isRestricted` is false (same condition as the other buttons).

### Phase 3 — Testing

**Manual testing steps:**

1. Navigate to `/dashboard/compose`
2. Observe "Best times to post" row shows "Now" button at the left
3. Click "Now" → datetime input populates with current date/time (within ±1 minute)
4. Verify main submit button label changes to "Schedule Post"
5. Verify button styling matches adjacent time slot buttons exactly
6. Test on restricted (free) plan → "Now" button not shown (same gate as other buttons)

### Phase 4 — Validation

```bash
pnpm lint && pnpm typecheck
```

No backend changes, no migrations, no new dependencies required.

---

## Design Decisions

| Decision                                  | Rationale                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Button placed **first** (leftmost)        | Most frequently used; users who want to post now shouldn't scroll past future suggestions                |
| Same styling as time slot buttons         | Visual consistency per the feature request                                                               |
| Uses `date-fns/format` (already imported) | No new dependencies; consistent with existing date formatting in same file                               |
| Seconds set to current value (not zero)   | `new Date()` captures full current time; acceptable for "post now" semantics                             |
| Only shown when not restricted            | Consistent with existing gate; "Now" without scheduling context is covered by the main "Post Now" button |

---

## Non-Goals

- No backend changes
- No new API endpoints
- No changes to the scheduling logic or worker
- No changes to the restricted/upgrade flow
