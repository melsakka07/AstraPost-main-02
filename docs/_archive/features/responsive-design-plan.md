# Responsive Design Implementation Plan

**Goal:** Implement a fully responsive, mobile-first design system across the entire AstraPost codebase.

**Breakpoints in use (Tailwind v4 defaults):**

- Mobile: default (< 640px)
- `sm`: 640px+ (tablet portrait)
- `md`: 768px+ (tablet landscape)
- `lg`: 1024px+ (laptop)
- `xl`: 1280px+ (desktop)

---

## Status Legend

- `[x]` Done
- `[ ]` Pending
- `[-]` Not needed / handled by design

---

## Phase 1 — Grid & Layout Gaps (Targeted Fixes)

| #   | File                                             | Change                                                                              | Status |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------- | ------ |
| 1.1 | `src/app/dashboard/analytics/page.tsx`           | Follower metrics grid: `md:grid-cols-3` → `sm:grid-cols-2 md:grid-cols-3`           | `[x]`  |
| 1.2 | `src/app/dashboard/analytics/page.tsx`           | Performance metrics grid: `md:grid-cols-3` → `sm:grid-cols-3 lg:grid-cols-5`        | `[x]`  |
| 1.3 | `src/app/dashboard/analytics/viral/page.tsx`     | Overview stats (live + blurred): `md:grid-cols-4` → `sm:grid-cols-2 md:grid-cols-4` | `[x]`  |
| 1.4 | `src/app/dashboard/analytics/viral/page.tsx`     | Loading skeleton: `md:grid-cols-2` → `sm:grid-cols-2`                               | `[x]`  |
| 1.5 | `src/app/dashboard/ai/writer/page.tsx`           | Tab list: remove `max-w-xl` constraint, use `w-full grid-cols-4`                    | `[x]`  |
| 1.6 | `src/app/dashboard/ai/calendar/page.tsx`         | Preview grids: `grid-cols-4` → `grid-cols-2 sm:grid-cols-4`                         | `[x]`  |
| 1.7 | `src/components/dashboard/notification-bell.tsx` | Dropdown: add `max-w-[calc(100vw-1rem)]` viewport guard                             | `[x]`  |

---

## Phase 2 — Remaining Grid Gaps

| #   | File                                   | Change                                                                                                | Status |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ |
| 2.1 | `src/app/dashboard/analytics/page.tsx` | Insights section: `grid lg:grid-cols-2` → `grid md:grid-cols-2` (closes 1-col gap between 768–1023px) | `[x]`  |

---

## Phase 3 — Fluid Typography

Add `clamp()`-based font sizes so headings scale smoothly across all viewports instead of jumping at breakpoints.

| #   | File                                                  | Change                                                                  | Status |
| --- | ----------------------------------------------------- | ----------------------------------------------------------------------- | ------ |
| 3.1 | `src/app/globals.css`                                 | Add fluid heading scale via `@theme` custom properties using `clamp()`  | `[x]`  |
| 3.2 | `src/components/dashboard/dashboard-page-wrapper.tsx` | Apply fluid title class (`text-xl sm:text-3xl` → `clamp`-based utility) | `[x]`  |

---

## Phase 4 — CSS Spacing & Sizing Tokens

Add CSS custom properties for spacing and sizing to `globals.css` `@theme` block.

| #   | File                           | Change                                                              | Status |
| --- | ------------------------------ | ------------------------------------------------------------------- | ------ |
| 4.1 | `src/app/globals.css`          | Add `--spacing-page-x`, `--spacing-section`, `--radius-card` tokens | `[x]`  |
| 4.2 | `src/app/dashboard/layout.tsx` | Replace inline padding values with token-based classes              | `[x]`  |

---

## Phase 5 — Page Scan Results

All 11 pages + key components scanned. Issues promoted to Phase 6 below.

| #    | Page / File                                  | Scan Result                                                                                                     |
| ---- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 5.1  | `src/app/dashboard/queue/page.tsx`           | `[-]` Clean — delegates rendering to `QueueContent` component                                                   |
| 5.2  | `src/app/dashboard/drafts/page.tsx`          | `[-]` Clean — delegates to `DraftsClient`; grid uses `md:` default-1-col pattern                                |
| 5.3  | `src/app/dashboard/calendar/page.tsx`        | `[-]` Clean — minimal layout shell                                                                              |
| 5.4  | `src/app/dashboard/ai/reply/page.tsx`        | `[-]` Clean — `grid sm:grid-cols-3` correctly defaults to 1-col on mobile                                       |
| 5.5  | `src/app/dashboard/ai/bio/page.tsx`          | `[!]` **Issue** — `grid grid-cols-2` with no mobile fallback → Phase 6.1                                        |
| 5.6  | `src/app/dashboard/ai/history/page.tsx`      | `[-]` Clean — `grid grid-cols-1` throughout; flex rows acceptable                                               |
| 5.7  | `src/app/dashboard/referrals/page.tsx`       | `[!]` **Issue** — `flex items-center space-x-2` input+button rows can squeeze → Phase 6.2                       |
| 5.8  | `src/app/dashboard/achievements/page.tsx`    | `[-]` Clean — grid uses proper `md:grid-cols-2 lg:grid-cols-4` steps                                            |
| 5.9  | `src/app/chat/page.tsx`                      | `[-]` Acceptable — `max-w-[80%]` on bubbles is fine (80% of 320px = 256px, readable)                            |
| 5.10 | `src/app/(marketing)/` (pricing, blog, etc.) | `[-]` Clean — grids use `md:grid-cols-2` which defaults to 1-col; decorative blobs use `overflow-hidden` parent |
| 5.11 | `src/app/admin/` (users table)               | `[-]` Clean — shadcn `<Table>` component already wraps in `overflow-auto`                                       |
| 5.12 | `src/components/calendar/calendar-view.tsx`  | `[!]` **Issue** — `grid grid-cols-7` month/week view on 320px (~45px/cell) → Phase 6.3                          |

---

## Phase 6 — Fixes from Phase 5 Scan

| #   | File                                        | Change                                                                                                                                                                                             | Status |
| --- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 6.1 | `src/app/dashboard/ai/bio/page.tsx`         | Tone/Language select grid: `grid grid-cols-2 gap-4` → `grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4`                                                                                             | `[x]`  |
| 6.2 | `src/app/dashboard/referrals/page.tsx`      | Link rows: `flex items-center space-x-2` → `flex flex-col gap-2 sm:flex-row sm:items-center`; outer wrapper: removed double `p-8` (layout already provides padding); title: `text-2xl sm:text-3xl` | `[x]`  |
| 6.3 | `src/components/calendar/calendar-view.tsx` | Day header: single-letter labels on mobile (`S/M/T/W/T/F/S`), full on `sm:`+; reduced header cell padding `p-1 sm:p-2`; text size `text-xs sm:text-sm`                                             | `[x]`  |

---

## Out of Scope / Already Handled

| Item                             | Reason                                                              |
| -------------------------------- | ------------------------------------------------------------------- |
| Mobile sidebar (vaul drawer)     | Already implemented — swipe-to-close drawer                         |
| Bottom navigation                | Already implemented — `BottomNav` fixed, `md:hidden`                |
| Touch targets (44×44px)          | `.touch-target` utility + `h-10 w-10` on interactive elements       |
| `overflow-x-hidden` on body      | Already set in root layout                                          |
| Safe area insets (notch)         | `pb-safe`, `pt-safe` CSS utilities already in `globals.css`         |
| Hover media query wrapping       | All hover states already use `@media (hover: hover)`                |
| Images (`next/image`)            | Responsive by default                                               |
| shadcn `Table` horizontal scroll | Built-in `overflow-auto` wrapper in `src/components/ui/table.tsx`   |
| Dialog mobile margins            | `max-w-[calc(100%-2rem)]` already set in `dialog.tsx`               |
| Competitor page `grid-cols-2`    | Intentional 2-col comparison UX; badge content uses `flex-wrap`     |
| RTL support                      | CSS logical properties used throughout (`ms-`, `me-`, `ps-`, `pe-`) |
| Chat page `max-w-[80%]` bubbles  | 80% of 320px = 256px — readable; no change needed                   |
| Admin users table overflow       | `<Table>` component has built-in `overflow-auto` wrapper            |
| `ai/reply` `sm:grid-cols-3`      | Correctly defaults to 1-col below `sm` breakpoint                   |
