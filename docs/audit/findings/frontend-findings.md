# Frontend Audit Findings

**Audit Date:** 2026-04-16
**Scope:** `src/components/`, `src/app/dashboard/`, `src/app/(auth)/`, `src/app/(marketing)/`

---

## Summary

| Severity  | Count  |
| --------- | ------ |
| Critical  | 2      |
| High      | 6      |
| Medium    | 9      |
| Low       | 5      |
| **Total** | **22** |

---

## Critical Findings

### F-C1: No Client-Side Error Boundaries in Dashboard Pages

**Files:** All `src/app/dashboard/*/page.tsx` files
**Severity:** Critical

**Details:** Only 4 error boundaries exist in the entire app:

- `src/app/error.tsx` (root)
- `src/app/dashboard/error.tsx` (dashboard layout)
- `src/app/chat/error.tsx` (chat page)
- `src/app/admin/error.tsx` (admin layout)

Individual dashboard pages (compose, calendar, drafts, queue, analytics, settings, etc.) have no page-level error boundaries. If a component crashes, the entire dashboard layout unmounts, losing the user's sidebar, header, and navigation context.

**Fix:** Add `error.tsx` files to each major dashboard route segment:

- `src/app/dashboard/compose/error.tsx`
- `src/app/dashboard/calendar/error.tsx`
- `src/app/dashboard/queue/error.tsx`
- `src/app/dashboard/analytics/error.tsx`
- `src/app/dashboard/settings/error.tsx`
- `src/app/dashboard/ai/error.tsx`

---

### F-C2: Multiple Settings Forms Don't Use React Hook Form + Zod

**Files:**

- `src/components/settings/profile-form.tsx` — manual `useState` + `fetch`
- `src/components/settings/voice-profile-form.tsx` — manual `useState` + `fetch`
- `src/components/settings/notification-preferences.tsx` — manual `useState` + `fetch`
- `src/components/settings/privacy-settings.tsx` — manual `useState` + `fetch`
- `src/components/community/contact-form.tsx` — manual `useState` + `fetch`

**Severity:** Critical

**Details:** Five forms use manual `useState` + `fetch` + `e.preventDefault()` patterns instead of React Hook Form with Zod validation. This means:

- No client-side validation before submission
- No dirty state tracking
- No form-level error handling
- Inconsistent with other forms in the codebase (admin dialogs, team invite, roadmap submission all use React Hook Form)

**Fix:** Refactor all five forms to use `useForm` from `react-hook-form` with `zodResolver` and the existing Zod schemas from the API routes.

---

## High Findings

### F-H1: 100 Components Use `"use client"` — Many Could Be Server Components

**Files:** 100 files with `"use client"` directive
**Severity:** High

**Details:** 100 out of 200+ component files have `"use client"`. While many legitimately need client-side interactivity (event handlers, hooks, state), several categories likely don't:

- **Admin dashboard components** (40+ files): Many are data-display tables and stat cards that receive data as props and could be Server Components.
- **Settings components**: `billing-status.tsx`, `plan-usage.tsx`, `notification-preferences.tsx` could potentially be server-rendered if they receive data as props.
- **Analytics components**: `charts-client.tsx` legitimately needs client (recharts), but `analytics-section-nav.tsx` and `date-range-selector.tsx` might not.

**Fix:** Audit each `"use client"` component and convert those that only render props to Server Components. Use the pattern of a Server Component parent that fetches data and passes it to a Client Component child only when interactivity is needed.

---

### F-H2: `console.error` Used Instead of Logger in 40+ Client Components

**Files:** See B-C1 in backend-findings.md
**Severity:** High

**Details:** Client components can't import `@/lib/logger` (which uses `pino` — a Node.js-only library). This means there's no structured client-side error reporting. Errors are silently logged to the browser console where they're invisible to the team.

**Fix:** Create `src/lib/client-logger.ts` that:

1. Sends errors to a server-side logging endpoint (`/api/log`)
2. Falls back to `console.error` in development
3. Integrates with an error tracking service (Sentry, Highlight, etc.)

---

### F-H3: Missing Loading States on Several Dashboard Pages

**Files:**

- `src/app/dashboard/achievements/page.tsx` — No `loading.tsx`
- `src/app/dashboard/affiliate/page.tsx` — No `loading.tsx`
- `src/app/dashboard/referrals/page.tsx` — No `loading.tsx`
- `src/app/dashboard/jobs/page.tsx` — No `loading.tsx`

**Severity:** High

**Details:** While most dashboard pages have `loading.tsx` files (calendar, compose, drafts, queue, analytics, settings, ai), 4 pages are missing them. Users see a blank screen while data loads.

**Fix:** Add `loading.tsx` skeleton files to each missing page.

---

### F-H4: No `React.lazy` / `dynamic()` for Heavy Dashboard Components

**Files:**

- `src/components/composer/composer.tsx` — Very large component (~1600 lines)
- `src/components/analytics/charts-client.tsx` — Imports recharts (heavy)
- `src/components/calendar/calendar-view-client.tsx` — Complex calendar logic
- `src/components/admin/*` — 40+ admin components loaded eagerly

**Severity:** High

**Details:** Only 5 files use `dynamic()` import. Heavy components like the composer, analytics charts, and admin dashboard components are loaded eagerly, increasing initial bundle size and Time to Interactive (TTI).

**Fix:** Use `next/dynamic()` with `loading` fallback for:

- Composer (loaded when navigating to `/dashboard/compose`)
- Analytics charts (loaded when navigating to analytics pages)
- Admin components (already behind admin auth, but still should be lazy)

---

### F-H5: `ContactForm` Validation Inconsistency

**File:** `src/components/community/contact-form.tsx`
**Severity:** High

**Details:** The community contact form is now listed under F-C2 as one of the forms not using React Hook Form + Zod. Additionally, the corresponding API route (`/api/community/contact`) uses inline `Response.json({ error }, { status: 422 })` for validation errors instead of `ApiError.badRequest()`, creating a full-stack inconsistency from form to API response.

**Fix:** Refactor form to use React Hook Form + Zod (see F-C2). Update the API route to use `ApiError.badRequest()` for validation errors (see B-C3).

---

### F-H6: `OnboardingWizard` Uses `console.error` Instead of Client Logger

**File:** `src/components/onboarding/onboarding-wizard.tsx`
**Severity:** High

**Details:** The onboarding wizard has 2 `console.error` calls (line 281: "Failed to fetch X accounts", line 423: "Step error"). This is the first experience new users have — errors should be properly handled and reported via a client logger, not silently dumped to the browser console.

**Fix:** Replace `console.error` with client logger. Consider extracting each step into a sub-component for better maintainability.

---

## Medium Findings

### F-M1: Accessibility — Limited ARIA Labels Across Components

**Files:** ~30 components have some ARIA attributes, but many interactive elements lack them
**Severity:** Medium

**Details:** While 30 components use `aria-label`, `aria-describedby`, `aria-expanded`, or `role` attributes, many interactive elements are missing:

- Sidebar navigation items lack `aria-current="page"` for active state
- Custom dropdown menus may lack proper `role="menu"` and `aria-expanded`
- Modal dialogs should verify `aria-modal="true"` and focus trapping
- Data tables in admin section may lack proper `role="table"` and sortable column indicators

**Fix:** Run an automated accessibility audit (axe-core or Lighthouse) and fix all critical/serious violations. Add `aria-current` to active nav items.

---

### F-M2: No Keyboard Navigation Support for Custom Components

**Files:** Various custom interactive components
**Severity:** Medium

**Details:** Custom components like the sidebar collapsible sections, composer AI tools panel, and calendar day cells may not support keyboard navigation (Tab, Enter, Escape, Arrow keys).

**Fix:** Ensure all interactive custom components support keyboard navigation. Use Radix UI primitives where possible (already used for most shadcn/ui components).

---

### F-M3: `composer.tsx` Is 1600+ Lines — Needs Decomposition

**File:** `src/components/composer/composer.tsx`
**Severity:** Medium

**Details:** The composer component is extremely large and handles tweet editing, AI tools, media upload, scheduling, templates, and more in a single file. This makes it hard to maintain, test, and optimize.

**Fix:** Extract logical sections into separate components:

- `ComposerContent.tsx` — Tweet editing area
- `ComposerSidebar.tsx` — AI tools, scheduling
- `ComposerMedia.tsx` — Media upload/preview
- `ComposerActions.tsx` — Save, schedule, publish buttons

---

### F-M4: `sidebar.tsx` Is 500+ Lines

**File:** `src/components/dashboard/sidebar.tsx`
**Severity:** Medium

**Details:** The sidebar component handles navigation rendering, active state logic, mobile drawer, image quota fetching, and more. It should be decomposed.

**Fix:** Extract navigation data, active state logic, and mobile drawer into separate modules.

---

### F-M5: No Suspense Boundaries for Data Fetching in Client Components

**Files:** Various dashboard pages
**Severity:** Medium

**Details:** Client components that fetch data (e.g., `dashboard-header.tsx` fetching notifications, `sidebar.tsx` fetching image quota) show nothing while loading. They should use Suspense or loading skeletons.

**Fix:** Wrap data-fetching client components in Suspense boundaries with skeleton fallbacks.

---

### F-M6: Settings Section Nav and Admin Sidebar Use Different Navigation Patterns

**Files:**

- `src/components/settings/settings-section-nav.tsx` — IntersectionObserver-based scroll spy
- `src/components/admin/sidebar-content.tsx` — Link-based sidebar navigation with `pathname` matching

**Severity:** Medium

**Details:** The settings page uses an IntersectionObserver-based scroll spy that highlights the active section as the user scrolls, while the admin panel uses a traditional link-based sidebar with `pathname` matching. These are fundamentally different patterns serving different use cases (single-page scroll vs. multi-page navigation), so they are NOT duplicated. However, the settings scroll-spy pattern could be extracted into a reusable `ScrollSpyNav` component if other pages adopt the same single-page scroll pattern in the future.

**Fix:** No immediate action needed. If more single-page scroll layouts are added, extract a shared `ScrollSpyNav` component from `settings-section-nav.tsx`.

---

### F-M7: No Empty State Components for Some Pages

**Files:**

- `src/app/dashboard/achievements/page.tsx`
- `src/app/dashboard/referrals/page.tsx`

**Severity:** Medium

**Details:** While some pages have proper empty states (queue, drafts, calendar), achievements and referrals pages may not handle the zero-data case gracefully.

**Fix:** Add empty state components with helpful CTAs for pages that lack them.

---

### F-M8: `github-stars.tsx` Uses `console.error`

**File:** `src/components/ui/github-stars.tsx`
**Severity:** Medium

**Details:** Uses `console.error("Failed to fetch GitHub stars:", error)` instead of a client logger.

**Fix:** Replace with client logger or silently fail (star count is non-critical).

---

### F-M9: `manage-subscription-button.tsx` Uses `console.error`

**File:** `src/components/settings/manage-subscription-button.tsx`
**Severity:** Medium

**Details:** Uses `console.error(error)` for Stripe portal creation failure.

**Fix:** Replace with client logger and show user-facing error toast.

---

## Low Findings

### F-L1: `dynamic()` Used for `NotificationBell` and `UserProfile` Due to Hydration

**Files:** `src/components/dashboard/dashboard-header.tsx`
**Severity:** Low

**Details:** The `recent-changes.md` documents that `dynamic({ ssr: false })` was used to fix Radix UI hydration mismatches. This is a workaround, not a fix. The root cause (Radix shifting `useId()` counters) should be addressed.

**Fix:** Investigate the root cause of the hydration mismatch and fix it properly, then remove the `dynamic()` wrapper.

---

### F-L2: No Image Optimization for User-Uploaded Media

**Files:** `src/components/composer/composer.tsx`, `src/app/api/media/upload/route.ts`
**Severity:** Low

**Details:** Uploaded images are stored and served as-is without optimization (WebP conversion, responsive srcsets, lazy loading).

**Fix:** Add image processing pipeline (sharp/libvips) during upload or use Next.js `<Image>` with remote patterns.

---

### F-L3: `bottom-nav.tsx` Only Shows 4 of 10+ Dashboard Routes

**File:** `src/components/dashboard/bottom-nav.tsx`
**Severity:** Low

**Details:** The mobile bottom navigation only shows 4 items (Dashboard, Compose, Queue, AI Tools) plus a "More" button that opens the full sidebar Sheet. The sidebar has 10+ routes including Calendar, Drafts, Analytics, Inspiration, Achievements, Referrals, Affiliate, and Settings. While the "More" button provides access to all routes, key features like Calendar and Analytics are two taps away on mobile. The current selection is reasonable but should be validated with mobile usage analytics.

**Fix:** Consider adding Calendar as a 5th bottom-nav item (replacing "More" with a 5-icon layout + overflow), or validate the current 4+More pattern with mobile usage data.

---

### F-L4: No Prefetching Strategy for Likely Next Routes

**Files:** `src/components/dashboard/sidebar.tsx`, `src/app/dashboard/layout.tsx`
**Severity:** Low

**Details:** Next.js Link component prefetches by default, but there's no explicit prefetching strategy for heavy routes (analytics, compose) that users are likely to visit.

**Fix:** Consider using `next/link` with `prefetch={true}` for primary navigation items.

---

### F-L5: `theme-provider.tsx` Uses `next-themes` — Verify RTL Support

**File:** `src/components/theme-provider.tsx`
**Severity:** Low

**Details:** The theme provider handles dark/light mode but RTL support for Arabic should be verified to work correctly with all shadcn/ui components.

**Fix:** Test all components in RTL mode and fix any layout issues.
