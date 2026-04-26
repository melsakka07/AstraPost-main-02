# AstraPost — UI/UX Implementation Plan (2026-04-26)

> **Scope**: Quick-win UI/UX fixes, known bugs, mobile responsiveness, and dynamic/responsive integrity across **both Arabic (RTL) and English (LTR)**. Every phase below has a clear set of agents and an explicit parallelization strategy. This plan can be executed phase-by-phase across multiple sessions.
>
> **Owner**: UI/UX uplift initiative
> **Target completion**: rolling, by phase priority
> **Related plans**: `docs/arabic/arabic-implementation-plan.md` (Phase 11/12 cover deeper i18n + BiDi); this plan is the _cross-locale UI_ counterpart and intentionally avoids overlap.
>
> **Hard constraints (do not break)**
>
> - All `pnpm run check` (lint + typecheck) and `pnpm test` MUST pass per phase.
> - All user-facing strings MUST exist in both `src/i18n/messages/en.json` and `ar.json`.
> - shadcn/ui color tokens only (`bg-background`, `text-foreground`) — no custom colors.
> - Dark mode parity via Tailwind classes; no hard-coded light-only colors.
> - `exactOptionalPropertyTypes` is ON — use `{...(val !== undefined && { prop: val })}`.
> - No `console.*` — use `@/lib/logger`.
> - Polling `useEffect` MUST follow the AbortController + 8s timeout + cleanup pattern.

---

## Executive Summary

The app's UI is in good shape overall — shadcn/ui + Tailwind v4, design tokens consistent, RTL infrastructure (Cairo font, `<html dir>`, `dir="rtl"` cookie) all wired. The gaps are concentrated in five buckets:

| #   | Bucket                                                                                                                                       | Severity    | Effort | Phase |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ | ----- |
| 1   | **Touch targets below WCAG 44px** in core button sizes                                                                                       | High (a11y) | S      | P1    |
| 2   | **Logical-property bugs in shadcn primitives** (sheet, dialog, dropdown, select, date picker) — physical `left/right` that don't flip in RTL | High (RTL)  | S      | P2    |
| 3   | **Missing `loading.tsx` / `error.tsx` for 16 dashboard subpages** — silent blank screens during navigation                                   | Medium (UX) | M      | P3    |
| 4   | **Mobile responsiveness gaps**: long admin tables without card-fallback, sticky headers untested in RTL, dialog edges on small viewports     | Medium      | M      | P4    |
| 5   | **Empty-state, skeleton, and form-feedback inconsistency** across feature pages                                                              | Medium      | M      | P5    |

Phases P1 and P2 are the highest-impact "quick wins" and can ship in a single session. P3–P5 are larger but each phase is independently shippable.

---

## Agent Orchestration — Master Pattern

Per `.claude/rules/agent-orchestration.md`, every phase follows the same shape:

```
PARALLEL: implementation agents (frontend-dev × N, scoped to non-overlapping files)
   ↓
PARALLEL: convention-enforcer + code-reviewer  (audit pass)
   ↓
PARALLEL: i18n-dev (translation parity) + test-runner (lint/typecheck/tests)
   ↓
docs-writer (CLAUDE.md / docs/0-MY-LATEST-UPDATES.md)
```

Rules of engagement:

- **No two frontend-dev agents may write the same file.** Split by directory (`src/components/ui/*` vs `src/components/dashboard/*`) or by feature (composer vs calendar vs settings).
- **convention-enforcer + code-reviewer are read-only** and MUST run in parallel — never sequentially.
- **test-runner is the gate** — if it fails, the next phase does not start.
- **docs-writer is always the last step** — it touches `docs/0-MY-LATEST-UPDATES.md` after every phase.

---

## Phase 1 — Accessibility Quick Wins (Touch Targets + Focus States)

**Why first**: smallest diff, biggest user-visible impact, zero risk of regression in RTL flow.

### 1.1 Button heights below WCAG 2.5.5 (44×44px)

`src/components/ui/button.tsx` size variants today:

```ts
size: {
  default: "h-9 px-4 py-2 has-[>svg]:px-3",   // 36px
  xs:      "h-6 ... px-2 text-xs",             // 24px
  sm:      "h-8 ... px-3",                     // 32px
  lg:      "h-10 ... px-6",                    // 40px
  icon:    "size-9",                           // 36px
  "icon-xs": "size-6",                         // 24px
  "icon-sm": "size-8",                         // 32px
  "icon-lg": "size-10",                        // 40px
}
```

**None of the touch-applicable sizes meets the 44px minimum** for primary/secondary actions on mobile.

**Fix strategy** (preserve current density on desktop, expand on touch):

- Add a `touch-manipulation` utility and increase tap target via `min-h-[44px]` only on coarse pointers:
  ```ts
  default: "h-9 px-4 py-2 has-[>svg]:px-3 [@media(pointer:coarse)]:min-h-[44px]"
  ```
- Apply the same `[@media(pointer:coarse)]:min-h-[44px]` to `sm`, `lg`, `icon`, `icon-sm`, `icon-lg`. Leave `xs` / `icon-xs` unchanged (these are deliberately compact, e.g., dense table rows).
- Audit all uses of `size="xs"` and `size="icon-xs"` — these MUST sit inside a parent with its own ≥44px hit area (e.g., a TableRow whose `py-3` provides the buffer).

### 1.2 Focus-visible ring contrast in dark mode

Sample `button.tsx` — `focus-visible:ring-ring/50` is usable but very faint in dark mode against dark backgrounds. Verify visually on:

- Buttons inside dark cards (`bg-card`)
- Inside command palette (already dark)

**Fix**: bump to `ring-ring/70` for dark mode only via `dark:focus-visible:ring-ring/70`.

### 1.3 Inputs / textareas — same touch-target audit

`src/components/ui/input.tsx` and `textarea.tsx` use `h-9`. Apply the same `[@media(pointer:coarse)]:min-h-[44px]` so mobile forms pass WCAG.

### 1.4 Skip-to-content link

There's no visible skip link in `src/app/layout.tsx`. For keyboard users this means tabbing through the entire sidebar before reaching content.

**Fix**: add a `<a href="#main-content" className="sr-only focus:not-sr-only ...">` at the top of `<body>`. Add `id="main-content"` to the dashboard layout's main wrapper.

### Files in scope

- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/select.tsx` (trigger height)
- `src/app/layout.tsx`
- `src/app/dashboard/layout.tsx` (main wrapper id)
- `src/i18n/messages/{en,ar}.json` (skip link label key `a11y.skipToContent`)

### Agents (parallel where marked)

| Step         | Agent                                       | Scope                                               |
| ------------ | ------------------------------------------- | --------------------------------------------------- |
| 1            | **frontend-dev**                            | Button/Input/Textarea/Select primitives + skip link |
| 2 (parallel) | **i18n-dev**                                | Add `a11y.skipToContent` to `en.json` + `ar.json`   |
| 3 (parallel) | **convention-enforcer** + **code-reviewer** | Audit                                               |
| 4            | **test-runner**                             | `pnpm run check` + `pnpm test`                      |
| 5            | **docs-writer**                             | `docs/0-MY-LATEST-UPDATES.md` entry                 |

### Acceptance

- Manual test on Chrome DevTools mobile emulation (iPhone 12, Galaxy S20) — every primary CTA has ≥44px hit area.
- Tab on `/dashboard` lands on skip link first; activating it focuses the main content.
- All Storybook (if present) / pages render unchanged at desktop sizes.

---

## Phase 2 — RTL Logical-Property Cleanup (shadcn Primitives)

**Why second**: these bugs are real, reproducible, and affect every Arabic user. Scope is narrow (≤8 files).

### Confirmed defects (physical `left`/`right` that don't flip in RTL)

| File                                     | Line    | Issue                                                                                                                                                                                                  | Fix                                                                                                                                   |
| ---------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/ui/sheet.tsx`            | 58      | Right sheet uses `inset-y-0 right-0 ... border-l` — close icon and slide-from direction don't flip                                                                                                     | Use `inset-y-0 end-0 ... border-s` and `slide-in-from-right` switched to `rtl:slide-in-from-left` (or use `data-[side=end]` semantic) |
| `src/components/ui/sheet.tsx`            | 60      | Mirror issue for left sheet                                                                                                                                                                            | `inset-y-0 start-0 ... border-e`                                                                                                      |
| `src/components/ui/sheet.tsx`            | 71      | Close button `top-4 right-4`                                                                                                                                                                           | `top-4 end-4`                                                                                                                         |
| `src/components/ui/dialog.tsx`           | 63      | Close button `top-4 right-4`                                                                                                                                                                           | `top-4 end-4`                                                                                                                         |
| `src/components/ui/dropdown-menu.tsx`    | 87, 117 | Item indicator `absolute left-2`                                                                                                                                                                       | `absolute start-2`                                                                                                                    |
| `src/components/ui/select.tsx`           | 118     | Item indicator `absolute left-2`                                                                                                                                                                       | `absolute start-2`                                                                                                                    |
| `src/components/ui/calendar.tsx`         | 24, 28  | `nav_button_previous: left-1` and `nav_button_next: right-1` are _semantically_ correct in LTR but reversed in RTL (next month should still mean "forward in time", which in RTL visually points left) | Use `start-1` / `end-1` so visual position flips with `dir`                                                                           |
| `src/components/ui/date-time-picker.tsx` | 122     | Clear button `right-2`                                                                                                                                                                                 | `end-2`                                                                                                                               |

> Tailwind v4 supports `start-*` / `end-*` / `border-s` / `border-e` natively when `dir` is set on `<html>`. We already set `dir`, so these utilities will Just Work.

### Sheet sliding direction

Sheets currently slide-in from the side they're docked on. With `dir="rtl"`, a right-docked sheet visually becomes left-docked but its slide-in animation is unchanged, so it still slides "from the right" — which in RTL looks correct because "right" is physical. Animation does NOT need RTL flipping; only the docking position does. **Verify** before changing animations: a manual smoke test with `dir="rtl"` is required.

### Other primitives to verify (likely fine but check)

- `breadcrumb.tsx` — uses ChevronRight; the existing `directional-icon.tsx` already wraps these. Confirm breadcrumb separators are wrapped.
- `popover.tsx` / `tooltip.tsx` — Radix handles `dir` automatically; verify with a coarse test.

### Files in scope

- `src/components/ui/sheet.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/calendar.tsx`
- `src/components/ui/date-time-picker.tsx`
- (optional) `src/components/ui/breadcrumb.tsx`, `popover.tsx`, `tooltip.tsx`

### Agents (parallel where marked)

| Step          | Agent                                       | Scope                                                                                                                                                                    |
| ------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1a (parallel) | **frontend-dev** A                          | sheet.tsx + dialog.tsx                                                                                                                                                   |
| 1b (parallel) | **frontend-dev** B                          | dropdown-menu.tsx + select.tsx                                                                                                                                           |
| 1c (parallel) | **frontend-dev** C                          | calendar.tsx + date-time-picker.tsx                                                                                                                                      |
| 2 (parallel)  | **convention-enforcer** + **code-reviewer** | Audit all 6 files                                                                                                                                                        |
| 3             | **test-runner**                             | `pnpm run check` + `pnpm test`                                                                                                                                           |
| 4             | (manual)                                    | Toggle locale to Arabic in dev; open Sheet, Dialog, DropdownMenu, Select, Calendar, DateTimePicker — confirm close button, indicator, nav arrows are on the correct side |
| 5             | **docs-writer**                             | Update `docs/arabic/arabic-implementation-plan.md` Phase 12 status + `docs/0-MY-LATEST-UPDATES.md`                                                                       |

### Acceptance

- In RTL: Dialog close button is on the **left** edge.
- In RTL: Sheet docked at `side="end"` opens on the **left** edge (mirrors LTR right).
- In RTL: DropdownMenu / Select check indicator sits on the **right** of the item label.
- In RTL: Calendar prev/next chevrons swap visually so "next" still moves forward in time.

---

## Phase 3 — Missing `loading.tsx` and `error.tsx` Coverage

**Why**: Next.js streams content per route segment; without `loading.tsx` users see a frozen previous page on slow navigations, and without `error.tsx` a thrown server error blanks the whole layout.

### Current state (audited 2026-04-26)

**Has `loading.tsx`** (12 routes): `/dashboard`, `/dashboard/achievements`, `/dashboard/affiliate`, `/dashboard/ai`, `/dashboard/analytics`, `/dashboard/calendar`, `/dashboard/compose`, `/dashboard/drafts`, `/dashboard/inspiration`, `/dashboard/queue`, `/dashboard/referrals`, `/dashboard/settings`.

**Has `error.tsx`** (7 routes): `/dashboard`, `/dashboard/ai`, `/dashboard/analytics`, `/dashboard/calendar`, `/dashboard/compose`, `/dashboard/queue`, `/dashboard/settings`.

**Missing `loading.tsx`** (16 routes):

- `/dashboard/jobs`
- `/dashboard/onboarding`
- `/dashboard/ai/agentic`
- `/dashboard/ai/bio`
- `/dashboard/ai/calendar`
- `/dashboard/ai/history`
- `/dashboard/ai/reply`
- `/dashboard/ai/writer`
- `/dashboard/analytics/competitor`
- `/dashboard/analytics/viral`
- `/dashboard/settings/billing`
- `/dashboard/settings/integrations`
- `/dashboard/settings/notifications`
- `/dashboard/settings/profile`
- `/dashboard/settings/team`
- `/dashboard/admin/webhooks`

**Missing `error.tsx`** (most non-top-level routes — same list as above plus `achievements`, `affiliate`, `drafts`, `inspiration`, `referrals`).

### Strategy: shared skeleton + boundary primitives, not 30 bespoke files

Create two reusable primitives:

- `src/components/dashboard/page-skeleton.tsx` — accepts a variant prop (`"form" | "table" | "grid" | "detail"`) and renders the appropriate skeleton shape using the existing `<Skeleton />` from `src/components/ui/skeleton.tsx`.
- `src/components/dashboard/page-error.tsx` — Client Component that takes Next.js `error` + `reset` props, calls `logger.error` (via a `/api/log-error` endpoint or Sentry directly), and shows the `<EmptyState>` with a "Try again" button.

Then each missing `loading.tsx` becomes:

```tsx
import { PageSkeleton } from "@/components/dashboard/page-skeleton";
export default function Loading() {
  return <PageSkeleton variant="form" />;
}
```

And each `error.tsx` becomes:

```tsx
"use client";
import { PageError } from "@/components/dashboard/page-error";
export default function Error(props: { error: Error; reset: () => void }) {
  return <PageError {...props} />;
}
```

### Files in scope

- 2 new primitives in `src/components/dashboard/`
- 16 new `loading.tsx` files
- 21 new `error.tsx` files (5 already exist; we're adding 21)
- New i18n keys: `errors.pageError.title`, `errors.pageError.description`, `errors.pageError.retry`

### Agents (parallel where marked)

| Step          | Agent                                       | Scope                                                                                  |
| ------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1             | **frontend-dev** A                          | Create `PageSkeleton` + `PageError` primitives                                         |
| 2             | **i18n-dev**                                | Add `errors.pageError.*` keys to `en.json` + `ar.json`                                 |
| 3a (parallel) | **frontend-dev** B                          | All `loading.tsx` files for `/dashboard/ai/*` (6 files)                                |
| 3b (parallel) | **frontend-dev** C                          | All `loading.tsx` files for `/dashboard/settings/*` (5 files) + jobs + onboarding      |
| 3c (parallel) | **frontend-dev** D                          | All `loading.tsx` for analytics/\* + admin/webhooks + all missing `error.tsx` files    |
| 4 (parallel)  | **convention-enforcer** + **code-reviewer** | Audit all 39 new files                                                                 |
| 5             | **test-runner**                             | `pnpm run check`                                                                       |
| 6             | **docs-writer**                             | Note pattern in `docs/claude/common-tasks.md` so future routes auto-include both files |

### Acceptance

- `git ls-files | grep "loading.tsx\|error.tsx" | wc -l` shows ≥ 39 entries.
- Manual: throttle network to "Slow 3G", navigate `/dashboard/ai/writer` — skeleton shows, not a blank page.
- Manual: introduce a deliberate `throw new Error()` in `getServerSideProps` of one page — error boundary renders, "Try again" button works.

---

## Phase 4 — Mobile Responsiveness Audit

**Why**: AstraPost's primary market (MENA) skews mobile-first. Every page must be usable on a 360px wide viewport.

### 4.1 Long admin/data tables without card fallback

`src/components/admin/audit/audit-log-table.tsx`, `subscribers-table.tsx`, `agentic-sessions-table.tsx`, `notification-history-table.tsx`, `impersonation-table.tsx` use `overflow-x-auto`. This is functionally OK but UX is poor on mobile (hidden columns, horizontal scroll friction).

**Pattern**: at `md:` breakpoint use the table; below, render a `<Card>` per row with stacked label/value pairs. Build one helper:

```tsx
// src/components/admin/responsive-table.tsx
export function ResponsiveTable<T>({ rows, columns, mobileCard }: {...}) {
  return (
    <>
      <div className="hidden md:block"><Table>...</Table></div>
      <div className="md:hidden space-y-3">{rows.map(mobileCard)}</div>
    </>
  );
}
```

Apply to the 5 admin tables above. (User-facing tables in `/dashboard/queue` already use card grids; verify.)

### 4.2 Dialog edges on 320–360px viewports

`src/components/ui/dialog.tsx` line 54: `w-full max-w-[calc(100%-2rem)] ... sm:max-w-lg`.

The 2rem gutter (32px) is fine, but content that uses `p-6` (24px) inside a 360px viewport leaves only 280px for actual content — buttons in dialog footers can clip. Audit:

- `src/components/composer/ai-image-dialog.tsx` (action row)
- `src/components/ui/upgrade-modal.tsx` (CTA row)

**Fix pattern**: dialog footers should be `flex-col-reverse sm:flex-row` so on mobile buttons stack vertically (primary on top after reverse).

### 4.3 Sticky elements interaction with mobile keyboard

When a virtual keyboard opens, `position: sticky` headers can cover input fields. Audit:

- `src/components/composer/composer.tsx` (sticky toolbar)
- `src/components/dashboard/sidebar.tsx` (mobile drawer header)

**Fix**: scope sticky to non-touch (`sm:sticky` instead of `sticky`) where appropriate, OR add `interactive-widget=resizes-content` to viewport meta in `src/app/layout.tsx`.

### 4.4 Sidebar drawer in RTL

Mobile sidebar uses Sheet — depends on Phase 2 fix. After Phase 2, manually verify drawer slides in from the _correct_ edge in both locales.

### 4.5 Card layouts at 360px

Audit `stat-card.tsx`, `setup-checklist.tsx`, `quick-compose.tsx`, `trial-banner.tsx`, `upgrade-banner.tsx` for:

- Long Arabic labels overflowing buttons (Arabic strings are typically 20–30% longer than English equivalents — confirmed in i18n parity check).
- Text using `whitespace-nowrap` that should `truncate` instead.
- Action button rows that need to wrap on small screens.

### Files in scope (representative — full audit produces final list)

- 5 admin table components
- 2 dialog content files (ai-image, upgrade-modal)
- composer.tsx, sidebar.tsx, layout.tsx
- 5 banner/card components above

### Agents (parallel where marked)

| Step          | Agent                                       | Scope                                                                                                                                                 |
| ------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1             | **researcher**                              | Walk every dashboard page at 360px and 768px, in both locales, and produce a concrete defect list under `docs/ux-audits/2026-04-26-mobile-defects.md` |
| 2a (parallel) | **frontend-dev** A                          | Build `ResponsiveTable` primitive + migrate 5 admin tables                                                                                            |
| 2b (parallel) | **frontend-dev** B                          | Dialog/footer responsive fixes (composer, upgrade)                                                                                                    |
| 2c (parallel) | **frontend-dev** C                          | Sticky behavior + viewport meta + sidebar                                                                                                             |
| 2d (parallel) | **frontend-dev** D                          | Banner/card overflow fixes (stat-card, trial-banner, upgrade-banner, setup-checklist, quick-compose)                                                  |
| 3 (parallel)  | **convention-enforcer** + **code-reviewer** | Audit                                                                                                                                                 |
| 4             | **i18n-dev**                                | Spot-check that no Arabic string was added/changed without parity                                                                                     |
| 5             | **test-runner**                             | `pnpm run check` + `pnpm test`                                                                                                                        |
| 6             | **docs-writer**                             | Update `docs/0-MY-LATEST-UPDATES.md`                                                                                                                  |

### Acceptance

- Every dashboard page at 360px Chrome DevTools (iPhone SE preset) has zero horizontal scrollbars in both LTR and RTL.
- Dialog action buttons never clip at 320px.
- No content covered by mobile keyboard on form pages (`/dashboard/compose`, `/dashboard/settings/profile`).

---

## Phase 5 — Empty States, Skeletons, Forms

**Why**: silent loading screens and "0 items" blank lists are the #1 reason new users churn.

### 5.1 Empty-state coverage

`<EmptyState>` from `src/components/ui/empty-state.tsx` is used in 9 places. Audit list pages that DON'T use it:

- `/dashboard/calendar` — when no posts scheduled
- `/dashboard/ai/history` — when no AI generations yet
- `/dashboard/inspiration` — when no imported tweets
- `/dashboard/affiliate` — referral tab variants
- Admin tables — when result set is empty

Each should render `<EmptyState icon={...} title="..." description="..." actionLabel="..." onAction={...} />` with localized strings.

### 5.2 Skeleton consistency

`<Skeleton />` is the right primitive but loading shapes diverge across pages. Adopt `<PageSkeleton variant>` from Phase 3 in feature pages too:

- replace bespoke skeletons in `src/components/queue/queue-content.tsx`
- replace bespoke skeletons in `src/components/drafts/drafts-client.tsx`

### 5.3 Form feedback — error placement

shadcn Forms use `<FormMessage>` which renders below `<FormControl>`. Audit:

- Are server-returned errors (from API 4xx) propagated into `form.setError(field, { message })`?
- Toast errors should ALSO log to `logger` via a tiny helper so we have observability.

Helper to standardize:

```ts
// src/lib/forms/handle-api-error.ts
export function handleApiError(form: UseFormReturn, error: unknown, t: (k: string) => string) {
  // map server { error, field? } to form.setError or toast
}
```

### 5.4 Submit-button loading state

Many submit buttons show `disabled={isLoading}` but don't show a spinner. Use `<Spinner className="size-4" />` from `src/components/ui/spinner.tsx` consistently.

### Files in scope

- ~10 list/table pages (empty-state)
- 2 client components (skeleton swap)
- New `src/lib/forms/handle-api-error.ts`
- Submit-button audit across `composer.tsx`, `voice-profile-form.tsx`, `submission-form.tsx`, settings forms

### Agents (parallel where marked)

| Step          | Agent                                       | Scope                                                     |
| ------------- | ------------------------------------------- | --------------------------------------------------------- |
| 1a (parallel) | **frontend-dev** A                          | Empty-state additions (calendar, ai/history, inspiration) |
| 1b (parallel) | **frontend-dev** B                          | Skeleton swap (queue-content, drafts-client)              |
| 1c (parallel) | **frontend-dev** C                          | Form-error helper + apply to compose/settings forms       |
| 1d (parallel) | **frontend-dev** D                          | Submit-button spinner audit                               |
| 2 (parallel)  | **i18n-dev**                                | New i18n keys for empty-state titles/descriptions         |
| 3 (parallel)  | **convention-enforcer** + **code-reviewer** | Audit                                                     |
| 4             | **test-runner**                             | `pnpm run check` + `pnpm test`                            |
| 5             | **docs-writer**                             | Pattern note in `docs/claude/common-tasks.md`             |

### Acceptance

- No blank list page when results are empty — every list shows `<EmptyState>` with a clear next-action CTA.
- All submit buttons in long-running forms (>500ms) show a spinner while pending.
- Server-side validation errors land on the correct field, not a generic toast.

---

## Phase 6 — Cross-Locale Layout Integrity (Visual Regression)

**Why**: catches drift after every UI change.

### 6.1 Manual smoke matrix (executed each phase)

For every changed page, run this matrix:
| Locale | Theme | Viewport |
|--------|-------|----------|
| en | light | 360px |
| en | dark | 1280px |
| ar | light | 360px |
| ar | dark | 1280px |

Look for: text overflow, broken alignment, mirrored icons that shouldn't be (logos, X-bird icon), unmirrored chevrons that should be.

### 6.2 Long-string Arabic stress

Many Arabic translations are longer than English (e.g., "Schedule" → "جدولة المنشور"). Pages susceptible to overflow:

- Sidebar nav items
- Stat cards
- Button labels
- Toasts

Test with a deliberate stress: temporarily set `ar.json` button labels to a 30-char string and re-render. Anything that breaks must use `truncate` + `title=` for hover.

### 6.3 Optional: Playwright smoke (not required, but recommended)

A minimal Playwright spec that:

1. Boots the app
2. Logs in as a fixture user
3. Visits the 8 highest-traffic pages in both locales
4. Asserts no horizontal scrollbar (`document.body.scrollWidth <= window.innerWidth`)
5. Asserts no `dir=` mismatch on `<html>` after locale switch

This is a Phase 6 deliverable but can be deferred to a later session.

### Agents

| Step         | Agent            | Scope                                                         |
| ------------ | ---------------- | ------------------------------------------------------------- |
| 1            | **researcher**   | Run the smoke matrix manually, file defects in a tracking doc |
| 2            | **frontend-dev** | Fix surfaced defects in priority order                        |
| 3 (optional) | **test-runner**  | Playwright spec (if user wants automated check)               |
| 4            | **docs-writer**  | Final summary entry                                           |

---

## Sequencing & Effort

| Phase                    | Effort                | Best to run                                    | Dependencies             |
| ------------------------ | --------------------- | ---------------------------------------------- | ------------------------ |
| **P1** Touch targets     | S (≤2h)               | Solo session                                   | None                     |
| **P2** RTL primitives    | S (≤2h)               | Solo session, can pair with P1 in same session | None — independent of P1 |
| **P3** Loading/error     | M (≤4h)               | Solo session                                   | None                     |
| **P4** Mobile responsive | M–L (≤6h, 2 sessions) | After P2 (depends on Sheet fix)                | P2                       |
| **P5** Empty/forms       | M (≤4h)               | After P3 (reuses PageSkeleton)                 | P3                       |
| **P6** Cross-locale QA   | S (recurring)         | After every phase                              | All previous             |

**Recommended order for first push**: P1 + P2 in one session (both quick, high impact, independent). Then P3 in a second session. P4 and P5 follow.

---

## Definition of Done (per phase)

A phase is only "done" when ALL of the following are true:

1. ☐ `pnpm run check` passes (lint + typecheck)
2. ☐ `pnpm test` passes
3. ☐ All new strings present in `en.json` AND `ar.json` (parity verified)
4. ☐ Manual cross-locale smoke (en + ar, 360px + 1280px, light + dark) on changed pages
5. ☐ `docs/0-MY-LATEST-UPDATES.md` updated with phase summary
6. ☐ Convention-enforcer + code-reviewer reports surfaced no high-priority issues
7. ☐ No new `any` types, `@ts-ignore`, or `console.*`
8. ☐ No new `NextResponse.json()` usage (route handlers use `Response.json()`)
9. ☐ `docs/arabic/arabic-implementation-plan.md` updated where Phase 12 BiDi items intersect (only P2 / P4 may touch this)

---

## Out of Scope (Intentionally Deferred)

These are real but belong to other initiatives:

- **Animation polish** (microinteractions, page transitions) — design-led, not engineering quick-win
- **Onboarding wizard redesign** — separate product workstream
- **Marketing pages** (`src/app/(marketing)/*`) — different content model, separate audit
- **Email template UI** — covered by i18n plan Phase 11
- **BiDi text isolation in user-generated content** — covered by `docs/arabic/arabic-implementation-plan.md` Phase 12

---

## Tracking

When executing, prefix commits with the phase number:

- `feat(ui-p1): increase button touch targets to WCAG 44px`
- `fix(ui-p2): use logical properties for RTL in shadcn primitives`
- `feat(ui-p3): add PageSkeleton + PageError boundary primitives`
- `feat(ui-p4): responsive table fallback for admin views`
- `feat(ui-p5): standardize empty-state and form-error patterns`

Update this document at the top of each phase with a checkbox for completed items so the next session can resume cleanly.

---

## Phase Status

- ☐ **P1** — Accessibility quick wins
- ☐ **P2** — RTL logical-property cleanup
- ☐ **P3** — `loading.tsx` / `error.tsx` coverage
- ☐ **P4** — Mobile responsiveness audit
- ☐ **P5** — Empty states / skeletons / forms
- ☐ **P6** — Cross-locale layout integrity
