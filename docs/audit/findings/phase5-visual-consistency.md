# Phase 5 — Visual Consistency and Polish Audit

## Summary

| Issue Type                       | Count           | Severity   |
| -------------------------------- | --------------- | ---------- |
| Stale/outdated loading skeletons | 2 layout groups | Medium     |
| Hardcoded colors (not tokens)    | 3 locations     | Low-Medium |
| Inconsistent component patterns  | 4 patterns      | Low        |
| Missing hover/focus transitions  | 5+ locations    | Low        |
| Spacing inconsistencies          | 3 locations     | Low        |

---

## 1. Stale Loading Skeletons

### 1.1 AI Sub-Pages Inherit Wrong Skeleton

**Issue:** All 6 AI sub-pages (writer, reply, calendar, bio, agentic, history) inherit from `src/app/dashboard/ai/loading.tsx` which shows the AI Hub landing page layout (7 tool cards + quota meter). During navigation to any sub-page, users briefly see the wrong skeleton — tool cards that don't exist on the target page.
**Impact:** Jarring layout flash during navigation. Looks like a bug.
**Fix:** Create individual `loading.tsx` files for each AI sub-page:

- `ai/writer/loading.tsx` — tabs + config panel + results area skeleton
- `ai/reply/loading.tsx` — URL input + preview + results skeleton
- `ai/calendar/loading.tsx` — config + weekly grid skeleton
- `ai/bio/loading.tsx` — config + bio variant cards skeleton
- `ai/agentic/loading.tsx` — topic input + pipeline progress skeleton
- `ai/history/loading.tsx` — table/list skeleton with pagination

### 1.2 Settings Loading Skeleton is Outdated

**File:** `src/app/dashboard/settings/loading.tsx`
**Issue:** Written for an old combined single-page settings layout. References scroll anchors (`#profile`, `#subscription`, `#accounts`, `#voice`, `#notifications`, `#privacy`) that no longer exist. The current settings uses tabbed sub-pages.
**Impact:** Wrong skeleton layout shown during navigation to settings sub-pages.
**Fix:** Create individual `loading.tsx` per settings sub-page matching each tab's layout:

- `settings/profile/loading.tsx` — form fields skeleton
- `settings/team/loading.tsx` — members list skeleton
- `settings/billing/loading.tsx` — plan cards + history skeleton
- `settings/integrations/loading.tsx` — account cards skeleton
- `settings/notifications/loading.tsx` — toggle list skeleton

---

## 2. Hardcoded Colors (Should Use Design Tokens)

### 2.1 Admin Webhooks — Hardcoded Red

**File:** `src/app/admin/webhooks/page.tsx` line 63
**Issue:** `text-red-500` hardcoded — should use `text-destructive` semantic token.
**Fix:** Change to `text-destructive`.

### 2.2 Viral Analytics — Char Count Colors

**File:** `src/app/dashboard/analytics/viral/page.tsx`
**Issue:** Character count color logic uses specific color values. Need to verify these use token-based colors.
**Fix:** Use `text-destructive` for >280, `text-amber-500` (semantic warning) for >=240, `text-muted-foreground` for normal.

### 2.3 AI Writer — Char Count Colors

**File:** `src/app/dashboard/ai/writer/page.tsx` lines 636, 715, 929
**Issue:** Character count uses hardcoded Tailwind colors. Verify these are consistent with compose page char count.
**Fix:** Ensure same color thresholds as compose: `text-destructive` >280, `text-amber-500` >=240, `text-muted-foreground` <240.

---

## 3. Inconsistent Component Patterns

### 3.1 Error Boundaries — Inconsistent i18n Usage

**Issue:** Dashboard error.tsx uses `"errors"` namespace. Global error.tsx has hardcoded English. Some pages have no error.tsx at all. Pattern is inconsistent.
**Fix:** Standardize: all error.tsx files should use `useTranslations("errors")`.

### 3.2 Empty States — Inconsistent CTA Style

**Issue:** Some empty states have a single CTA button, others have two, some have no CTA. Some use dashed borders, others use solid cards.
**Standard pattern (from dashboard):** Dashed border card + icon + title + description + 1-2 CTA buttons.
**Deviations:**

- AI tools: Use blurred preview + centered text (decorative, not functional CTA)
- Admin pages: Varying patterns, some just show text
- Marketing blog: No empty state at all (just missing posts)
  **Fix:** Standardize empty states on the dashed-border-card pattern for dashboard/admin. Blurred preview is acceptable for AI tools.

### 3.3 Page Headers — Inconsistent Pattern

**Issue:** Dashboard core uses `DashboardPageWrapper`. AI pages mix between the wrapper and custom headers. Admin uses `AdminPageWrapper`. Marketing pages use custom headers.
**Status:** These are intentionally different per section. Acceptable.

### 3.4 Icon Sizes — Inconsistent

**Issue:** Same icon used at different sizes across pages:

- `Loader2` spinner: h-4 w-4 in some places, h-5 w-5 in others, h-8 w-8 in loading states
- `ChevronRight`: h-4 w-4, h-5 w-5, or no explicit size
- `Copy`/`Check`: h-3 w-3, h-3.5 w-3.5, h-4 w-4 across different pages
  **Fix:** Standardize: h-4 w-4 for inline icons, h-5 w-5 for standalone icons, h-8 w-8 for centered spinners.

---

## 4. Missing Hover / Focus Transitions

### 4.1 Marketing Card Links — No Transition

**Issue:** Some marketing page cards (docs, resources, features) use `<Link>` wrapping `<Card>` without explicit hover transitions.
**Fix:** Add `transition-shadow hover:shadow-md` or `transition-all` to interactive cards.

### 4.2 Settings Navigation Tabs — No Hover State

**File:** `src/app/dashboard/settings/layout.tsx` lines 34-38
**Issue:** Tab links use active underline but no hover state.
**Fix:** Add `hover:text-foreground` transition on inactive tabs.

### 4.3 AI Hub Cards — Hover Present

**File:** `src/app/dashboard/ai/page.tsx`
**Status:** Cards use `hover:shadow-md transition-shadow` — good.

---

## 5. Spacing Inconsistencies

### 5.1 Dashboard Page Padding

**Issue:** Different dashboard sub-pages use different padding values. Most use `p-4 sm:p-6 md:p-8`. Some may use `p-6` without responsive scaling.
**Fix:** Audit all dashboard pages for consistent padding pattern.

### 5.2 Card Gap Inconsistency

**Issue:** Card grids use `gap-4` in some places, `gap-6` in others. No consistent standard.
**Fix:** Standardize on `gap-6` for card grids, `gap-4` for compact lists.

### 5.3 Section Spacing

**Issue:** Vertical spacing between sections varies from `space-y-4` to `space-y-8`.
**Fix:** Use `space-y-6` as standard section spacing, `space-y-8` for major section breaks.

---

## 6. Border and Radius Inconsistencies

### 6.1 Card Border Radius

**Issue:** Cards use `rounded-lg`, `rounded-xl`, or `rounded-2xl` inconsistently across the app.
**Standard:** shadcn/ui default is `rounded-xl` for Card component.
**Fix:** Audit all custom card divs for consistent `rounded-xl`.

### 6.2 Input Border Radius

**Issue:** shadcn/ui Input uses `rounded-md` by default. Verify all custom inputs match.
**Status:** All pages use shadcn/ui Input — consistent by default.

---

## 7. Animation and Transition Inconsistencies

### 7.1 Toast/Sonner — Consistent

**Status:** All toasts use sonner with consistent positioning and animation. Good.

### 7.2 Modal/Dialog — Consistent

**Status:** All dialogs use shadcn/ui Dialog/AlertDialog. Consistent animation built-in. Good.

### 7.3 Dropdown Menu — Consistent

**Status:** All dropdowns use shadcn/ui DropdownMenu. Consistent. Good.

---

## 8. Dark Mode Issues

### 8.1 Hardcoded White/Black Backgrounds

**Issue:** No hardcoded white/black backgrounds found — all pages use `bg-background`, `bg-card`, etc. Good.

### 8.2 Blog Post — Dark Mode Prose

**File:** `src/app/(marketing)/blog/[slug]/blog-post-client.tsx` line 166
**Status:** Good. Uses `prose prose-lg dark:prose-invert`.

### 8.3 Hardcoded Shadows in Dark Mode

**Issue:** Verify shadow utilities work in dark mode. Some custom shadows may be invisible on dark backgrounds.
**Status:** Using Tailwind shadow classes which are dark-mode aware. Good.

---

## 9. Other Polish Issues

### 9.1 Changelog Timeline — Date Alignment

**File:** `src/app/(marketing)/changelog/page.tsx`
**Issue:** Timeline dates use `md:ml-8` (physical margin). Should use `md:ms-8` for RTL.
**Fix:** Replace physical margins with logical equivalents.

### 9.2 Marketing Footer

**Issue:** Footer links and social icons should be verified for consistent spacing, hover states, and RTL mirroring.
**Action:** Quick audit of `src/components/marketing/site-footer.tsx`.

### 9.3 Focus Ring Consistency

**Issue:** Focus rings should use `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` consistently across all interactive elements.
**Status:** shadcn/ui components handle this. Custom interactive elements may miss focus indicators.
**Fix:** Audit custom buttons/links for focus-visible styles.

### 9.4 Loading Spinner Consistency

**Issue:** Different loading states use different patterns: `Loader2` spinner, `Skeleton` components, custom CSS animations.
**Status:** Mix of patterns is acceptable — Loader2 for button loading, Skeleton for content loading, custom animations for special cases (SSE streaming).
