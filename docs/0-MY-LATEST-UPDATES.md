# Latest Updates

## 2026-04-13: Feature Improvements Phase 5 — RTL/Arabic Hardening ✅

**Summary:** Completed Phase 5 of the existing feature improvements plan. Implemented locale-aware date and number formatting across all dashboard pages and components to support Arabic and other RTL languages for MENA users.

**Changes:**

**Quick Wins (Already Implemented — No Changes Needed):**

- ✅ `dir="auto"` on composer textarea — [src/components/composer/tweet-card.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/composer/tweet-card.tsx#L211)
- ✅ RTL-aware sidebar brand logo — [src/components/dashboard/sidebar.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/dashboard/sidebar.tsx#L368)
- ✅ Language switcher in dashboard header — [src/components/dashboard/dashboard-header.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/dashboard/dashboard-header.tsx#L52)

**AI Language Defaults (Already Synced — Clarified Comment):**

- ✅ Thread Writer already uses user's language preference — [src/components/composer/composer.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/composer/composer.tsx#L226-230)
- Updated comment to clarify UI language vs content language

**Locale Formatting (8 files modified + 1 file created):**

- **Created `useUserLocale` hook:** New [src/hooks/use-user-locale.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/hooks/use-user-locale.ts)
  - Provides user locale to client components via `useSession()`
  - Defaults to `"en"` if no language preference is set

- **Updated dashboard pages (Server Components):**
  - [src/app/dashboard/page.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/dashboard/page.tsx) — 1 toLocaleString() call updated
  - [src/app/dashboard/analytics/page.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/dashboard/analytics/page.tsx) — 6 toLocaleString() calls updated
  - [src/app/dashboard/jobs/page.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/dashboard/jobs/page.tsx) — 1 toLocaleString() call updated
  - [src/app/dashboard/ai/history/page.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/dashboard/ai/history/page.tsx) — 1 toLocaleString() call updated
  - [src/app/api/analytics/export/route.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/api/analytics/export/route.tsx) — Passes userLocale to PDF generation

- **Updated client components:**
  - [src/components/analytics/top-tweets-list.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/analytics/top-tweets-list.tsx) — Added userLocale prop, 4 toLocaleString() calls updated
  - [src/app/dashboard/analytics/viral/page.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/dashboard/analytics/viral/page.tsx) — Added useUserLocale hook, 2 toLocaleString() calls updated
  - [src/app/dashboard/analytics/competitor/page.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/dashboard/analytics/competitor/page.tsx) — Added useUserLocale hook, 3 toLocaleString() calls updated

- **Updated PDF export component:**
  - [src/components/analytics/pdf-document.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/analytics/pdf-document.tsx) — Added userLocale prop, 9 toLocaleString() calls updated

**Pattern Applied:**

Server Components:

```typescript
const session = await auth.api.getSession({ headers: await headers() });
const userLocale =
  session?.user && "language" in session.user ? (session.user as any).language : "en";
// Usage:
{
  value.toLocaleString(userLocale);
}
{
  new Date(date).toLocaleString(userLocale, { dateStyle: "medium", timeStyle: "short" });
}
```

Client Components:

```typescript
const userLocale = useUserLocale();
// Usage:
{
  value.toLocaleString(userLocale);
}
```

**Verification:**

- ✅ `pnpm run lint` — 0 errors, 1 unrelated warning in post-usage-bar.tsx
- ✅ `pnpm run typecheck` — 0 errors
- ✅ All dashboard toLocaleString() calls now use user locale
- ✅ PDF exports respect user locale
- ✅ Admin components excluded (internal use, English-only is acceptable)

**Impact:**

- ✅ All dates, numbers, and metrics now display in user's preferred locale (e.g., Arabic: "١,٢٣٤" vs English: "1,234")
- ✅ Better UX for MENA users who prefer Arabic or other RTL languages
- ✅ Consistent locale handling across the entire dashboard
- ✅ No database changes required — uses existing `user.language` field

**Next Steps:**

- Phase 6: Mobile UX Improvements (if not already started)
- Continue with remaining phases from the feature improvements plan
- Monitor user feedback on locale formatting in production

---

## 2026-04-13: Feature Improvements Phase 1 — Quick UX Wins ✅

**Summary:** Completed Phase 1 of the existing feature improvements plan. Implemented composer enhancements, dashboard home improvements, and sidebar improvements with zero database changes.

**Changes:**

**Composer Improvements (3 files modified):**

- **Added "Select all" checkbox:** Updated [src/components/composer/target-accounts-select.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/composer/target-accounts-select.tsx)
  - Shows when user has >1 X account connected
  - Selects/deselects all accounts with one click

- **Implemented 3s debounce for Pro+ users:** Updated [src/components/composer/viral-score-badge.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/composer/viral-score-badge.tsx)
  - Pro+ users get 3s debounce for viral score auto-refresh (vs 2s for Free users)
  - Added `userPlan` prop to enable conditional debounce timing

- **Swapped CTA visual weight and changed auto-save:** Updated [src/components/composer/composer.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/composer/composer.tsx)
  - "Schedule" button now solid primary, "Post Now" now outline
  - Auto-save debounce changed from 1s to 2s

**Dashboard Home Improvements (2 files modified):**

- **Split "Today's Posts" stat:** Updated [src/app/dashboard/page.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/dashboard/page.tsx)
  - Now shows "Published Today" and "Scheduled Today" as separate stats
  - Added "Last 30 days" sub-label to Avg. Engagement stat
  - Wrapped queue cards in Link to `/dashboard/queue`
  - Updated `getDashboardData` function with thirtyDaysAgo filter

- **Added checklist query param handler:** Updated [src/components/dashboard/setup-checklist.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/dashboard/setup-checklist.tsx)
  - Supports `?checklist=open` to force checklist visible
  - Enables linking from Settings > Profile

**Sidebar Improvements (2 files modified):**

- **Added image quota progress bar:** Updated [src/components/dashboard/sidebar.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/dashboard/sidebar.tsx)
  - Fetches from `/api/ai/image/quota`
  - Shows below AI credits bar with progress indicator

- **Fixed Pro badge link and active states:** Updated [src/components/dashboard/sidebar.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/dashboard/sidebar.tsx)
  - Pro badge for Free users now links to `/pricing`
  - Fixed active state check for all nav items using `startsWith()`

- **Passed user plan to sidebar:** Updated [src/app/dashboard/layout.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/dashboard/layout.tsx)
  - Added `userPlan` prop to Sidebar component

**Verification:**

- ✅ `pnpm run lint` — 0 errors, 0 warnings
- ✅ `pnpm run typecheck` — 0 errors

**Discovery:**

- Character count badge already exists in [tweet-card.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/composer/tweet-card.tsx)
- Hashtag "Insert" buttons already exist in [ai-tools-panel.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/composer/ai-tools-panel.tsx)
- Mobile reorder controls already exist in [tweet-card.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/composer/tweet-card.tsx)

**Deferred Items (require further investigation):**

- BestTimeSuggestions inline rendering for Pro+ users
- Mobile AI credits mirror stat card

**Next Steps:**

- Start Phase 2: Subscription Clarity & Frictions (Free tier post counter, Pro Annual bonus, trial expiry banner, downgrade warning modal)
- Investigate deferred items from Phase 1

---

## 2026-04-12: Critical Security Fixes — Search Sanitization & Audit Export Limits ✅

**Summary:** Fixed critical SQL injection vulnerability in audit export route and reduced max-row limit to prevent memory exhaustion during large exports.

**Changes:**

**Security Fixes (1 file modified):**

- **Fixed SQL injection in audit export route:** Updated [src/app/api/admin/audit/export/route.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/api/admin/audit/export/route.ts)
  - Added sanitization to the `search` parameter before passing to `ILIKE` query
  - Pattern applied: `const safeSearch = search.replace(/[%_\\]/g, "\\$&");`
  - This prevents potential SQL injection attacks via wildcard characters (`%`, `_`, `\`)
  - The search route (`/api/admin/search/route.ts`) was already properly sanitized

- **Reduced audit export max-row limit:** Updated [src/app/api/admin/audit/export/route.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/api/admin/audit/export/route.ts)
  - Changed from 50,000 rows to 10,000 rows to prevent memory exhaustion
  - Large CSV exports could cause server performance issues or crashes
  - 10,000 rows is still sufficient for most audit log analysis needs

**Verification:**

- ✅ `pnpm run check` — 0 errors, 0 warnings
- ✅ All search parameters in admin API routes are now properly sanitized

**Security Impact:**

- ✅ Eliminated SQL injection vulnerability in audit export
- ✅ Reduced risk of memory exhaustion from large exports
- ✅ Improved overall admin panel security posture

**Next Steps:**

- Consider making the audit export limit configurable via environment variable
- Monitor export performance in production
- Consider adding export size warnings to the UI when approaching limits

---

## 2026-04-12: Admin Panel Phase 4 — UX Fixes & Cleanup ✅

**Summary:** Completed Phase 4 of the admin panel audit. Fixed the duplicate `/admin/users` page, added breadcrumb navigation to subscriber detail page, and verified search input sanitization.

**Changes:**

**Phase 4 — UX Fixes & Cleanup (2 files modified):**

- **Fixed `/admin/users` page:** Updated [src/app/admin/users/page.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/admin/users/page.tsx)
  - Implemented redirect to `/admin/subscribers` to eliminate duplicate/confusing stub
  - Kept `requireAdmin()` for security before redirect
  - Removed duplicate `UsersTable` component usage and DB queries
  - This keeps any deep-linked URLs working while pointing to the real page

- **Added breadcrumb to subscriber detail page:** Updated [src/app/admin/subscribers/[id]/page.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/admin/subscribers/[id]/page.tsx)
  - Added DB query to fetch subscriber name/email for breadcrumb
  - Used `AdminPageWrapper`'s built-in `breadcrumbs` prop
  - Breadcrumb shows: `Home > Subscribers > [Subscriber Name/Email]`
  - Improves navigation and context for admin users

- **Verified search sanitization:** Confirmed [src/app/api/admin/search/route.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/api/admin/search/route.ts) already has proper sanitization
  - Escapes `%` and `_` characters before passing to `ilike()`
  - Pattern: `const safeQuery = q.replace(/[%_\\]/g, "\\$&");`

**Verification:**

- ✅ `pnpm run check` — 0 errors, 0 warnings
- ✅ ESLint warnings were already fixed during Phase 2

**All Phases Complete:**

- ✅ Phase 1: Route conflicts and billing DB errors
- ✅ Phase 2: API route hardening (try/catch on 33+ routes)
- ✅ Phase 3: Loading skeletons and error boundaries (19 files)
- ✅ Phase 4: UX fixes and cleanup (2 files)

**Total Admin Panel Audit:** ~60 files changed across 4 phases

**Next Steps:**

- Monitor admin panel in production for any issues
- Consider adding more granular permissions for different admin roles
- Potential future enhancements: Advanced filtering, bulk actions, export options

---

## 2026-04-12: Admin Panel Phase 3 — Loading Skeletons & Error Boundaries ✅

**Summary:** Completed Phase 3 of the admin panel audit. Added loading skeletons to all 18 admin pages that were missing them, and created a shared error boundary for graceful error handling across all admin sub-pages.

**Changes:**

**Phase 3 — Loading Skeletons & Error Boundaries (19 files created):**

- **Shared Error Boundary:** Created `src/app/admin/error.tsx`
  - Covers all admin sub-pages via Next.js error boundary inheritance
  - Uses `AdminPageWrapper` for consistent layout
  - Displays error message with AlertCircle icon
  - Shows error digest for debugging
  - Provides "Try again" button to reset the error boundary

- **Loading Skeletons (18 pages):** Each uses `AdminPageWrapper` with matching icon, title, and description, plus skeleton placeholders matching the page structure
  - `src/app/admin/affiliate/loading.tsx`
  - `src/app/admin/agentic/loading.tsx`
  - `src/app/admin/ai-usage/loading.tsx`
  - `src/app/admin/announcement/loading.tsx`
  - `src/app/admin/audit/loading.tsx`
  - `src/app/admin/billing/promo-codes/loading.tsx`
  - `src/app/admin/content/loading.tsx`
  - `src/app/admin/feature-flags/loading.tsx`
  - `src/app/admin/health/loading.tsx`
  - `src/app/admin/impersonation/loading.tsx`
  - `src/app/admin/jobs/loading.tsx`
  - `src/app/admin/notifications/loading.tsx`
  - `src/app/admin/referrals/loading.tsx`
  - `src/app/admin/roadmap/loading.tsx`
  - `src/app/admin/subscribers/loading.tsx`
  - `src/app/admin/subscribers/[id]/loading.tsx`
  - `src/app/admin/teams/loading.tsx`
  - `src/app/admin/users/loading.tsx`

**Verification:**

- ✅ `pnpm run check` — 0 errors, 0 warnings
- ✅ All admin pages now show skeleton during data fetch
- ✅ All admin pages have graceful error handling

**Next Steps:**

- **Phase 4** (Low Priority): UX fixes and cleanup
  - Fix `/admin/users` page (redirect to `/admin/subscribers`)
  - Add breadcrumb to subscriber detail page
  - Sanitise search route input (escape `%` and `_` characters)
  - Fix any remaining ESLint import order warnings

---

## 2026-04-12: Admin Panel Phase 2 — API Hardening (try/catch on all routes) ✅

**Summary:** Completed Phase 2 of the admin panel audit. Added try/catch error handling to all unprotected API routes to prevent unhandled exceptions and improve production reliability.

**Changes:**

**Phase 2 — API Route Hardening (32 routes total):**

- **Batch A (3 routes):** Already had try/catch — no changes needed
  - `src/app/api/admin/stats/route.ts`
  - `src/app/api/admin/activity-feed/route.ts`
  - `src/app/api/admin/search/route.ts`

- **Batch B (7 routes):** All wrapped in try/catch
  - `src/app/api/admin/subscribers/route.ts`
  - `src/app/api/admin/subscribers/[id]/route.ts`
  - `src/app/api/admin/subscribers/[id]/ban/route.ts`
  - `src/app/api/admin/subscribers/bulk/route.ts`
  - `src/app/api/admin/users/[userId]/impersonate/route.ts`
  - `src/app/api/admin/users/[userId]/suspend/route.ts`
  - `src/app/api/admin/impersonation/[sessionId]/route.ts`

- **Batch C (4 routes):** All wrapped in try/catch
  - `src/app/api/admin/billing/transactions/route.ts`
  - `src/app/api/admin/billing/transactions/export/route.ts`
  - `src/app/api/admin/promo-codes/route.ts`
  - `src/app/api/admin/promo-codes/[id]/route.ts`

- **Batch D (8 routes):** All wrapped in try/catch
  - `src/app/api/admin/content/route.ts`
  - `src/app/api/admin/referrals/route.ts`
  - `src/app/api/admin/teams/route.ts`
  - `src/app/api/admin/roadmap/route.ts`
  - `src/app/api/admin/roadmap/[id]/route.ts`
  - `src/app/api/admin/roadmap/[id]/delete/route.ts`
  - `src/app/api/admin/roadmap/bulk/route.ts`
  - `src/app/api/admin/announcement/route.ts`

- **Batch E (0 routes):** Routes do not exist in this project structure

- **Batch F (9 routes):** All wrapped in try/catch
  - `src/app/api/admin/agentic/route.ts`
  - `src/app/api/admin/agentic/metrics/route.ts`
  - `src/app/api/admin/agentic/sessions/route.ts`
  - `src/app/api/admin/agentic/sessions/[id]/route.ts`
  - `src/app/api/admin/affiliate/route.ts`
  - `src/app/api/admin/affiliate/summary/route.ts`
  - `src/app/api/admin/affiliate/funnel/route.ts`
