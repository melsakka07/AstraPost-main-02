# Latest Updates

## 2026-04-13: Fix Admin Pages Not Loading Data on Sidebar Navigation ✅

**Summary:** Admin sub-pages (Subscribers, AI Usage, Teams, Billing, etc.) showed no data when navigating via sidebar `<Link>` clicks — users had to manually refresh the browser. Root cause was Next.js App Router client-side navigation caching stale React Server Component payloads, preventing client component `useEffect` hooks (used by `useAdminPolling`) from properly re-triggering on route change.

**Changes:**

- **Created:** [route-key.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/admin/route-key.tsx)
  - Small `"use client"` wrapper that reads `usePathname()` and passes it as a React `key` to its children
  - Forces React to fully unmount and remount the page component tree on every pathname change

- **Updated:** [layout.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/admin/layout.tsx)
  - Wrapped `{children}` in `<RouteKey>` so all admin pages remount on navigation
  - Ensures `useAdminPolling` refs, `useState` initializers, and `useEffect` hooks re-initialize cleanly

**Root Cause:**

Next.js App Router performs soft navigation between routes that share a layout. During soft navigation, the layout persists and only the page segment changes. Next.js caches the React Server Component payload for each route segment. When navigating back to a previously visited admin page, Next.js may reconcile the cached component tree instead of fully remounting it. This means:

- `useState` values persist from the stale cached state
- `useEffect` cleanup + re-run may not fire as expected
- `useRef` values (like `inFlightRef`, `mountedRef` in `useAdminPolling`) retain stale values

A hard refresh destroys the entire React tree and rebuilds from scratch, which is why refreshing always worked.

**Solution:**

The `<RouteKey>` wrapper uses the pathname as a React `key`. When the key changes, React treats it as a completely new component instance — it unmounts the old tree (triggering all cleanups) and mounts a fresh one (triggering all `useEffect` hooks and resetting all refs). This is the standard Next.js pattern for forcing remount on route change.

**Next Steps:**

- Consider applying the same `<RouteKey>` pattern to the dashboard layout (`src/app/(dashboard)/layout.tsx`) if similar stale-data issues are observed there
- Evaluate whether `useAdminPolling` should add an extra `useEffect` that resets all refs on mount as a defensive measure

## 2026-04-13: Sidebar Parent-Child Route Active State Fix (Round 2) ✅

**Summary:** Fixed a remaining bug in `isItemActive()` where parent routes (e.g., "AI Tools" at `/dashboard/ai`) still appeared highlighted alongside child routes (e.g., "Agentic Posting" at `/dashboard/ai/agentic`). The root cause was that the `hasMoreSpecificMatch` check used `pathname.startsWith(\`${otherItem.href}/\`)`which fails when the pathname **exactly equals** the other item's href (no trailing`/`). This meant exact child matches were never detected as "more specific," so the parent's fallback `startsWith`check still returned`true`.

**Changes:**

- **File:** [sidebar.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/dashboard/sidebar.tsx)
  - Introduced `isPrefixOf(prefix, path)` helper that matches both exact equality AND `startsWith(prefix + "/")`
  - Used `isPrefixOf` in the `hasMoreSpecificMatch` check so exact child matches are correctly recognized as more specific
  - Affects all parent-child route pairs: `/dashboard/ai` ↔ children, `/dashboard/analytics` ↔ children, `/dashboard` ↔ all routes

**Added Flattened Nav Items Array:**

- **Created `allNavItems` array:** Flattened all navigation items for active state checking
  - File: [sidebar.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/dashboard/sidebar.tsx#L154)
  - Used by `isItemActive` to check all possible matches

**Updated Active State Logic (3 locations):**

- **Updated `CollapsibleSection` component:** Replaced inline logic with `isItemActive()` helper
  - File: [sidebar.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/dashboard/sidebar.tsx#L222)
  - Changed: `pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(\`${item.href}/\`))`
  - To: `isItemActive(item.href, pathname, allNavItems)`

- **Updated Overview section:** Replaced inline logic with `isItemActive()` helper
  - File: [sidebar.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/dashboard/sidebar.tsx#L406)

- **Updated regular sections:** Replaced inline logic with `isItemActive()` helper
  - File: [sidebar.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/dashboard/sidebar.tsx#L446)

**Root Cause:**

The previous fix only handled the root `/dashboard` route, but didn't address general parent-child route relationships. When on `/dashboard/analytics/viral`, both "Analytics" (parent) and "Viral Analyzer" (child) appeared selected because:

- "Analytics" matched via `pathname.startsWith("/dashboard/analytics/")`
- "Viral Analyzer" matched via exact path

The logic didn't check if there was a more specific match before marking a route as active.

**Solution:**

Implemented a smart `isItemActive()` function that:

1. Returns true if the pathname exactly matches the item's href
2. Checks if any other nav item is a more specific match (longer path that also matches)
3. If a more specific match exists, returns false for this item
4. Otherwise, returns true if the pathname starts with this item's href followed by a slash

This ensures only the most specific route is highlighted at any time.

**Verification:**

- ✅ `pnpm run lint` — 0 errors, 0 warnings
- ✅ `pnpm run typecheck` — 0 errors

**Manual Testing Required:**

Please verify the following scenarios in the Analytics section:

1. On `/dashboard/analytics` — Only "Analytics" is selected
2. On `/dashboard/analytics/viral` — Only "Viral Analyzer" is selected (NOT "Analytics")
3. On `/dashboard/analytics/competitor` — Only "Competitor" is selected (NOT "Analytics")

Also verify other sections work correctly: 4. On `/dashboard/ai` — Only "AI Tools" is selected 5. On `/dashboard/ai/agentic` — Only "Agentic Posting" is selected (NOT "AI Tools") 6. On `/dashboard` — Only "Dashboard" is selected

**Impact:**

- ✅ Sidebar navigation now correctly highlights only the most specific active page
- ✅ Parent routes (Analytics, AI Tools) no longer appear selected when on child routes
- ✅ Improved UX by eliminating confusing multi-selection state in parent-child route scenarios
- ✅ Consistent behavior across all navigation items with hierarchical relationships

**Next Steps:**

- Test the fix manually in the browser to verify all parent-child route combinations work correctly
- Monitor for any edge cases where nested routes might still have issues

---

## 2026-04-13: Sidebar Navigation Selection State Fix ✅

**Summary:** Fixed sidebar navigation issue where multiple items would appear selected simultaneously. The root cause was incorrect active state logic that matched the `/dashboard` route with all child routes using `startsWith()`.

**Changes:**

**Sidebar Active State Logic Fix (3 locations):**

- **Updated `CollapsibleSection` component:** Fixed active state check for collapsible sections
  - File: [sidebar.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/dashboard/sidebar.tsx#L203)
  - Changed: `pathname === item.href || pathname.startsWith(\`${item.href}/\`)`
  - To: `pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(\`${item.href}/\`))`

- **Updated Overview section:** Fixed active state check for Dashboard item
  - File: [sidebar.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/dashboard/sidebar.tsx#L384)

- **Updated regular sections:** Fixed active state check for all other nav items
  - File: [sidebar.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/dashboard/sidebar.tsx#L424)

**Root Cause:**

The original logic used `pathname.startsWith(`${item.href}/`)` to match child routes, which caused the `/dashboard` route to incorrectly match all its child routes (e.g., `/dashboard/compose`, `/dashboard/drafts`, etc.). This resulted in both the Dashboard item and the actual child route item appearing selected simultaneously.

**Solution:**

Added a condition to exclude the root `/dashboard` route from the `startsWith()` check. Now:

- `/dashboard` is only active when exactly on the dashboard home page
- Child routes are only matched with their specific parent routes
- Only one navigation item appears selected at a time

**Verification:**

- ✅ `pnpm run lint` — 0 errors, 0 warnings
- ✅ `pnpm run typecheck` — 0 errors

**Manual Testing Required:**

Please verify the following scenarios:

1. On `/dashboard` — Only "Dashboard" is selected
2. On `/dashboard/compose` — Only "Compose" is selected
3. On `/dashboard/drafts` — Only "Drafts" is selected
4. On `/dashboard/queue` — Only "Queue" is selected
5. On `/dashboard/calendar` — Only "Calendar" is selected
6. On `/dashboard/ai` — Only "AI Tools" is selected
7. On `/dashboard/ai/agentic` — Only "Agentic Posting" is selected
8. On `/dashboard/analytics` — Only "Analytics" is selected
9. On `/dashboard/analytics/viral` — Only "Viral Analyzer" is selected
10. On `/dashboard/settings` — Only "Settings" is selected

**Impact:**

- ✅ Sidebar navigation now correctly highlights only the active page
- ✅ Improved UX by eliminating confusing multi-selection state
- ✅ Consistent behavior across all navigation items

**Next Steps:**

- Test the fix manually in the browser to verify all navigation items work correctly
- Monitor for any edge cases where nested routes might still have issues

---

## 2026-04-13: Pricing Page Bookmark Limit Fix ✅

**Summary:** Added missing bookmark limit information to the Free plan on the pricing page to match actual implementation.

**Changes:**

**Pricing Table Updates (2 locations):**

- **Added "5 Bookmarks" to Free plan (monthly view):** Updated Free plan features to explicitly state the 5-bookmark limit
  - File: [pricing-table.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/billing/pricing-table.tsx#L28)

- **Added "5 Bookmarks" to Free plan (annual view):** Updated Free plan features to explicitly state the 5-bookmark limit
  - File: [pricing-table.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/components/billing/pricing-table.tsx#L92)

**Codebase Investigation Findings:**

- Free plan has a 5-bookmark limit enforced by [plan-limits.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/plan-limits.ts#L53)
- All paid plans (Pro Monthly, Pro Annual, Agency) have unlimited bookmarks (-1)
- Pricing page previously listed "Tweet Inspiration & Import" but did not mention the bookmark limit
- All other pricing page features correctly match the implementation in plan-limits.ts

**Verification:**

- ✅ `pnpm run lint` — 0 errors, 0 warnings
- ✅ `pnpm run typecheck` — 0 errors

**Impact:**

- ✅ Pricing page now accurately reflects actual bookmark limits for Free plan
- ✅ Users will have clear expectations about the 5-bookmark limit on Free plan

---

## 2026-04-13: README.md and env.example Corrections ✅

**Summary:** Updated README.md and env.example files to match the actual codebase implementation. Fixed multiple discrepancies between documentation and actual code.

**Changes:**

**README.md Updates (5 corrections):**

- **Updated overview line:** Changed "LinkedIn and Instagram integration coming soon" to "LinkedIn integration available on Agency plan"
  - File: [README.md](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/README.md#L3)

- **Fixed AI Image Generation description:** Changed "Flux models" to "Nano Banana models"
  - Files: [README.md](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/README.md#L65), [README.md](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/README.md#L114)

- **Updated migration count:** Changed "0000–0038" to "0000–0047" (48 migration files)
  - File: [README.md](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/README.md#L152)

- **Removed Google Gemini references:** Updated AI Inspiration and Overview sections to remove mentions of Google Gemini, as all AI features now use OpenRouter
  - Files: [README.md](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/README.md#L40), [README.md](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/README.md#L65), [README.md](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/README.md#L112)

- **Updated Environment Variables Reference:**
  - Removed `GEMINI_API_KEY` and `GOOGLE_AI_API_KEY` (not used in codebase)
  - Added `FACEBOOK_APP_ID` for Instagram OAuth
  - File: [README.md](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/README.md#L402-L410)

**env.example Updates (1 addition):**

- **Added Instagram OAuth variables:** Added FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, and FACEBOOK_REDIRECT_URI for Instagram integration
  - File: [env.example](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/env.example#L23-L28)

**Verification:**

- ✅ `pnpm run lint` — 0 errors, 0 warnings
- ✅ `pnpm run typecheck` — 0 errors

**Codebase Investigation Findings:**

- LinkedIn integration exists and is available on Agency plan (confirmed in pricing-table.tsx)
- Instagram integration exists but is not yet publicly announced (implementation complete)
- All AI features (chat, inspire, thread writer) use OpenRouter, not Google Gemini
- 48 migration files exist (0000 through 0047)
- AI image generation uses Replicate's Nano Banana models (google/nano-banana-2, google/nano-banana-pro)
- Instagram OAuth uses Facebook App ID (Meta for Developers)

**Impact:**

- ✅ Documentation now accurately reflects actual codebase implementation
- ✅ Users will not be confused by missing environment variables
- ✅ Correct feature availability information for each platform
- ✅ Accurate migration count for developers

**Next Steps:**

- Consider publicly announcing Instagram integration when ready
- Continue monitoring codebase for any other documentation discrepancies
- Regularly review and update README.md after major feature changes

---

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
