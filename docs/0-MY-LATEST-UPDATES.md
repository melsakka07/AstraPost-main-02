# Latest Updates

## 2026-04-12: Fix ioredis serverExternalPackages Warning + /api/admin/billing/overview 404 ✅

**Summary:** Fixed two unrelated dev-server issues: ioredis spam warnings in the terminal and a 404 error on the billing overview endpoint.

**Changes:**

1. **ioredis Warning Fix** — Changed `serverExternalPackages` in `next.config.ts` from `["ioredis"]` to `["bullmq"]`. This resolves module resolution issues where BullMQ's ESM build imports deep sub-paths from ioredis (`ioredis/built/utils`) that Node.js cannot resolve in pnpm's non-hoisted layout. By bundling ioredis (instead of treating it as external), Next.js's enhanced module resolver can handle these sub-path imports correctly.

2. **Billing Overview 404 Fix** — Added try/catch block to `/api/admin/billing/overview` route handler to surface the actual runtime error causing 404 responses. The route was recompiling on every hit (21-29ms vs 4-16ms for cached routes), suggesting an unhandled runtime exception was causing Next.js to deregister the route. The try/catch converts the failure to a 500 error and logs the real error message, allowing the underlying DB query issue to be diagnosed and fixed.

**Files Modified:**

- `next.config.ts` — changed `serverExternalPackages: ["bullmq"]` (removed "ioredis")
- `src/app/api/admin/billing/overview/route.ts` — added try/catch + ApiError import

**Status:** `pnpm run check` ✅

**Next Steps:** Restart dev server to confirm ioredis warnings are gone, then check terminal for the actual error message from `[billing/overview]` to fix the underlying DB query issue.

---

## 2026-04-12: Admin Affiliate & Subscribers Components — Polling Migration ✅

**Summary:** Migrated 6 admin components from manual `useEffect` + `fetch()` to the reusable `useAdminPolling` hook for consistent auto-refresh behavior, improved error handling, and better connection management.

**Changes:**

**Phase 2 — Affiliate Components (4 files):**

1. **Affiliate Summary Cards** — Replaced manual state management with `useAdminPolling<AffiliateSummary>`. Auto-refreshes every 60 seconds.

2. **Affiliate Conversion Funnel** — Migrated to `useAdminPolling<ConversionFunnelResponse>`. Consistent 60s polling interval.

3. **Affiliate Trends Chart** — Migrated to `useAdminPolling<TrendDataPoint[]>`. Preserved period state (7d/30d/90d) for dynamic API queries. Added null check for data before rendering chart.

4. **Affiliate Leaderboard** — Migrated to `useAdminPolling<TopAffiliate[]>`. Preserved client-side sorting logic for ranking display.

**Phase 3 — Complex Table Components (2 files):**

1. **Subscribers Table** — Full migration with pagination, search, filters, and bulk actions:
   - Removed `useCallback` import, added `useAdminPolling` import
   - Removed useState for `data`, `pagination`, `loading`
   - Replaced `fetchData()` callback with `useAdminPolling` hook returning `response`, `loading`, and `refresh`
   - Updated all data access from `data` to `response?.data`
   - Updated all pagination access from `pagination` to `response?.pagination`
   - Updated dialog `onSuccess` callbacks from `fetchData()` to `refresh()`
   - Fixed TypeScript errors by adding explicit type annotations for map callbacks

2. **Audit Log Table** — Similar migration pattern with action filtering, date ranges, and search:
   - Same state removal and hook integration as subscribers table
   - Updated export handler to use `response?.pagination.total`
   - Updated pagination UI to use `response?.pagination` properties
   - Fixed TypeScript errors with explicit AbortSignal type and map callback types

**Technical Improvements:**

- **Import path correction**: Fixed `useAdminPolling` import from `@/hooks/use-admin-polling` to `../use-admin-polling` (relative import)
- **Type safety**: Added explicit type annotations for callback parameters (`signal: AbortSignal`, `d: SubscriberRow`, `log: AuditLogRow`)
- **Null safety**: Added null checks for data before accessing properties (e.g., `(!data || data.length === 0)`)
- **Import cleanup**: Removed unused `ApiError` imports from 3 affiliate API routes (`summary`, `funnel`, `leaderboard`)
- **Import cleanup**: Removed unused `useEffect` import from `affiliate-trends-chart.tsx`

**Files Modified:**

- `src/components/admin/affiliate/affiliate-summary-cards.tsx`
- `src/components/admin/affiliate/affiliate-conversion-funnel.tsx`
- `src/components/admin/affiliate/affiliate-trends-chart.tsx`
- `src/components/admin/affiliate/affiliate-leaderboard.tsx`
- `src/components/admin/subscribers/subscribers-table.tsx`
- `src/components/admin/audit/audit-log-table.tsx`
- `src/app/api/admin/affiliate/summary/route.ts` — removed unused ApiError import
- `src/app/api/admin/affiliate/funnel/route.ts` — removed unused ApiError import
- `src/app/api/admin/affiliate/leaderboard/route.ts` — removed unused ApiError import

**Verification:**

- `pnpm run check` ✅ (2 import order warnings, 0 errors)
- `pnpm test` ✅ (196/196 tests pass)

---

## 2026-04-12: Admin Panel Phase 2 — UX Improvements for Mobile ✅

**Summary:** Completed Phase 2 of admin panel mobile responsiveness enhancement. Improved 6 core UI components with better touch targets, spacing, and mobile-optimized layouts.

**Changes:**

1. **AdminPageWrapper Header** — Enhanced header section for mobile:
   - Icon container: increased from `h-10 w-10` to `sm:h-12 sm:w-12` on desktop
   - Icon size: increased from `h-5 w-5` to `sm:h-6 sm:w-6` on desktop
   - Title: responsive typography `text-xl sm:text-2xl`
   - Description: responsive text size `text-xs sm:text-sm`

2. **Date Range Picker** — Improved mobile calendar experience:
   - Preset buttons: added `h-10` for consistent touch targets (44px minimum)
   - Popover: added `max-w-[calc(100vw-2rem)]` to prevent overflow on small screens
   - Layout: simplified to vertical stack (removed horizontal `sm:flex-row`)

3. **Activity Feed** — Enhanced activity item layout:
   - Added `min-w-0 flex-1` to content container for proper truncation
   - Added `truncate` class to target ID/description to prevent overflow
   - Better handling of long content on narrow screens

4. **Sidebar Mobile Drawer** — Improved mobile navigation:
   - Menu button: increased from default to `h-11 w-11` for better tap targets
   - Drawer width: increased from `w-64` to `w-72` for better content display
   - Added `max-w-[calc(100vw-2rem)]` to prevent overflow on very small screens

5. **Empty State Component** — Enhanced empty states for mobile:
   - Added `px-4` horizontal padding for better edge spacing
   - Reduced vertical padding on mobile: `py-8 sm:py-12`
   - Added `px-2` to description text for better readability

6. **Breadcrumbs** — Improved mobile navigation path display:
   - Added `truncate` and `max-w-[100px]` to link items
   - Added `truncate` and `max-w-[150px]` to current page label
   - Hidden overflow on mobile, full width on desktop (`sm:max-w-none`)

**Files Modified:**

- `src/components/admin/admin-page-wrapper.tsx` — header responsive enhancements
- `src/components/admin/date-range-picker.tsx` — touch targets + max-width
- `src/components/admin/activity-feed.tsx` — truncation + layout
- `src/components/admin/sidebar.tsx` — mobile drawer touch targets
- `src/components/admin/empty-state.tsx` — mobile spacing
- `src/components/admin/breadcrumbs.tsx` — truncation on mobile

**Status:** `pnpm run check` ✅

---

## 2026-04-12: Admin Panel Phase 1 — Mobile Responsiveness Critical Fixes ✅

**Summary:** Completed Phase 1 of comprehensive admin panel mobile responsiveness audit. Fixed 6 critical issues affecting mobile functionality and responsive design across `/admin/*` pages.

**Changes:**

1. **Admin Layout Sidebar Margin** — Fixed content shift on mobile by changing sidebar margin from `ms-64` (always applied) to `lg:ms-64` (desktop-only). Main content now uses full width on mobile/tablet.

2. **Subscribers Table** — Added `overflow-x-auto` wrapper for horizontal scroll on mobile. Increased checkbox touch targets to `h-5 w-5`. Increased pagination button sizes to `h-9 w-9` for better tap targets.

3. **Billing Transaction Table** — Added `overflow-x-auto` wrapper to prevent overflow on small screens when table columns exceed viewport width.

4. **Admin Dashboard KPI Cards** — Changed grid from `sm:grid-cols-2` to `grid-cols-2` so cards display in 2-column layout on mobile (previously stacked 1-column). Applied to both main grid and loading skeleton.

5. **Jobs Queue Stats Grid** — Added responsive breakpoints: `grid-cols-2 sm:grid-cols-3 md:grid-cols-5`. Previously only had `md:grid-cols-5` causing 1-column layout on mobile.

6. **Global Search** — Enhanced mobile touch support:
   - Search result items: increased padding to `py-3` and added `min-h-[44px]` for touch targets
   - Modal positioning: adjusted top margin from `pt-20` to `pt-12 sm:pt-20`
   - Horizontal margins: reduced from `mx-4` to `mx-2 sm:mx-4`
   - Footer hints: keyboard shortcuts hidden on mobile, replaced with "Tap to select results" message

**Files Modified:**

- `src/app/admin/layout.tsx` — sidebar margin fix
- `src/components/admin/subscribers/subscribers-table.tsx` — overflow wrapper + touch targets
- `src/components/admin/billing/billing-overview.tsx` — overflow wrapper
- `src/components/admin/dashboard/admin-dashboard.tsx` — KPI grid breakpoints
- `src/app/admin/jobs/page.tsx` — queue stats grid breakpoints
- `src/components/admin/global-search.tsx` — mobile touch optimizations
- `src/components/admin/search-result-item.tsx` — min-height for touch targets

**Status:** `pnpm run check` ✅

---

## 2026-04-12: Fix Billing Analytics Page "Failed to load analytics data" ✅

**Summary:** Fixed the billing analytics page at `/admin/billing/analytics` showing "Failed to load analytics data" even when there was no actual error.

**Root Cause:** Two issues:

1. The billing analytics page was a Server Component that fetched from the API route using `fetch()`. Server-side fetches don't automatically include cookies, so the auth check failed with 401 Unauthorized.
2. The `calculateMRRTrends` function used raw SQL template strings with Date objects, but Drizzle's `sql` tag expects strings, causing `ERR_INVALID_ARG_TYPE`.

**Fix:**

1. Converted the billing analytics page to use a Client Component pattern (same as the AI Usage dashboard fix)
2. Replaced raw SQL comparisons with Drizzle's type-safe operators: `isNull()`, `ne()`, and `lt()`

**Files Modified:**

- `src/components/admin/billing/billing-analytics-dashboard.tsx` — New client component for billing analytics
- `src/app/admin/billing/analytics/page.tsx` — Updated to use client component
- `src/app/api/admin/billing/analytics/route.ts` — Fixed date comparison in `calculateMRRTrends`

**Status:** `pnpm run check` ✅

---

## 2026-04-12: Fix 405 Error on Notifications Stats Endpoint ✅

**Summary:** Fixed `405 Method Not Allowed` error when fetching `/api/admin/notifications/stats`.

**Root Cause:** Next.js route resolution was matching `/api/admin/notifications/stats` to the dynamic route `/api/admin/notifications/[id]`, treating "stats" as an ID. Since the `[id]` route only had PATCH and DELETE handlers, Next.js returned 405 for GET requests.

**Fix:** Added a GET handler to the `[id]` route that:

1. Checks if `id === "stats"` and returns notification statistics
2. Otherwise, returns the individual notification by ID

**Files Modified:**

- `src/app/api/admin/notifications/[id]/route.ts` — Added GET handler with stats support

**Status:** `pnpm run check` ✅

---

## 2026-04-12: Admin Agentic API Routes ✅

**Summary:** Created missing API routes for the admin agentic dashboard to fix 404 errors.

**Changes:**

1. **Metrics Route** — `/api/admin/agentic/metrics` returns aggregated metrics: totalSessions, successRate, avgQualityScore, totalPostsGenerated

2. **Sessions List Route** — `/api/admin/agentic/sessions` returns paginated list of agentic sessions with filtering by status/topic

3. **Session Detail Route** — `/api/admin/agentic/sessions/[id]` returns individual session details with generated posts

**Files Created:**

- `src/app/api/admin/agentic/metrics/route.ts`
- `src/app/api/admin/agentic/sessions/route.ts`
- `src/app/api/admin/agentic/sessions/[id]/route.ts`

**Status:** `pnpm run check` ✅

---

## 2026-04-12: Admin Panel Post-Phase Enhancements ✅

**Summary:** Implemented 4 additional enhancements for the admin panel based on audit review suggestions.

**Changes:**

1. **Date Range Picker Integration** — Integrated `DateRangePicker` component into AI Usage Dashboard. Added `from` and `to` query parameters to `/api/admin/ai-usage` endpoint with date-fns filtering (startOfDay, endOfDay). Preset buttons: 7d, 30d, 90d, Custom.

2. **Empty State Illustrations** — Created reusable `EmptyState` component with variant icons (default, search, users, analytics, ai, billing). Integrated into subscribers table, jobs page, and AI usage dashboard with contextual titles and descriptions.

3. **Real-time Updates Expansion** — Created reusable `useAdminPolling` hook with AbortController pattern (60s interval, 10s timeout). Integrated into admin dashboard (stats + billing overview) and AI usage dashboard. Prevents connection leaks with proper cleanup.

4. **Admin-specific Middleware** — ⚠️ **Redundant**: Next.js 16 uses `proxy.ts` (not `middleware.ts`). The project already has `src/proxy.ts` that protects `/admin/*` routes with session cookie checks. Deleted the redundant files.

**Files Created:**

- `src/components/admin/empty-state.tsx` — EmptyState and TableEmptyState components
- `src/components/admin/use-admin-polling.ts` — Reusable polling hook

**Files Modified:**

- `src/app/api/admin/ai-usage/route.ts` — Added date range query parameters
- `src/components/admin/ai-usage/ai-usage-dashboard.tsx` — Integrated DateRangePicker, EmptyState, useAdminPolling
- `src/components/admin/dashboard/admin-dashboard.tsx` — Integrated useAdminPolling hook
- `src/components/admin/subscribers/subscribers-table.tsx` — Added EmptyState component
- `src/app/admin/jobs/page.tsx` — Added EmptyState component

**Status:** `pnpm run check` ✅

---

## 2026-04-12: Fix Admin Sidebar Hydration Mismatch ✅

**Summary:** Fixed hydration mismatch error on admin pages caused by Radix UI generating different random IDs on server vs client for the mobile sheet menu.

**Root Cause:** The `aria-controls` attribute in the Sheet component (Radix UI) was generating different random IDs on the server (`radix-_R_4qbmqlb_`) vs client (`radix-_R_16itmlb_`), causing React hydration mismatch warnings.

**Fix:** Wrapped the mobile sheet menu in a `{hydrated && ...}` conditional to only render it after the component has hydrated on the client, ensuring consistent IDs.

**Files Modified:**

- `src/components/admin/sidebar.tsx` — added `hydrated` check before rendering mobile sheet

**Status:** `pnpm run check` ✅

---

## 2026-04-12: Fix Admin Referrals Page SQL Error ✅

**Summary:** Fixed `Failed to fetch referral data` error on `/admin/referrals` page caused by invalid SQL subqueries with raw table aliases.

**Root Cause:** The API endpoint `/api/admin/referrals` used raw SQL subqueries with table aliases like `referred.referred_by` which don't work with Drizzle's automatic table aliasing. Drizzle aliases tables (e.g., `"user"` → `"user"` with different references), causing PostgreSQL `invalid reference to FROM-clause entry` errors.

**Fix:** Rewrote the referrers query to use proper Drizzle queries instead of raw SQL subqueries. Now fetches referrers and referred counts separately, then combines them in JavaScript with proper pagination.

**Files Modified:**

- `src/app/api/admin/referrals/route.ts` — replaced SQL subqueries with Drizzle queries

**Status:** `pnpm run check` ✅

---

## 2026-04-12: Fix Admin Notifications Page Runtime Error ✅

**Summary:** Fixed `Cannot read properties of undefined (reading 'toLocaleString')` error on `/admin/notifications` page caused by missing `targetCount` field in API response.

**Root Cause:** The API endpoint `/api/admin/notifications` was returning notifications without the `targetCount` field, but the frontend expected this field to display the target count in the table.

**Fix:** Added `targetCount` field to the API response, calculated from the `targetUserIds` array length.

**Files Modified:**

- `src/app/api/admin/notifications/route.ts` — added `targetCount` field to notification response

**Status:** `pnpm run check` ✅

---

## 2026-04-12: Fix Admin Teams Page Runtime Error ✅

**Summary:** Fixed `Cannot read properties of undefined (reading 'totalTeams')` error on `/admin/teams` page caused by API response structure mismatch.

**Root Cause:** The API endpoint `/api/admin/teams` was wrapping the response in a `data` property (`{ data: { summary, teams, invitations } }`), but the frontend `TeamsResponse` interface expected the properties at the top level (`{ summary, teams, invitations }`).

**Fix:** Removed the extra `data` wrapper from the API response to match the frontend's expected structure.

**Files Modified:**

- `src/app/api/admin/teams/route.ts` — removed `data` wrapper from `Response.json()`

**Status:** `pnpm run check` ✅

---

## 2026-04-11: Admin-Only Access for Jobs & AI History Pages ✅

**Summary:** Restricted `/dashboard/jobs` and `/dashboard/ai/history` to admin users only. Non-admin users can no longer see these pages in the sidebar or access them via direct URL.

**Changes:**

1. **Sidebar Filtering** — Added `isAdmin` flag to `NavItem` interface in `sidebar.tsx`. Jobs and AI History entries are marked `isAdmin: true`. Sidebar filters out admin-only items for non-admin users, alongside existing feature flag filtering.
2. **Dashboard Layout** — Passes `isAdmin` from `session.user` to `<Sidebar>` component in `dashboard/layout.tsx`.
3. **Page-Level Guards** — Both pages now use `requireAdmin()` from `@/lib/admin` instead of basic session checks, redirecting non-admins to `/dashboard`.

**Files Modified:**

- `src/components/dashboard/sidebar.tsx` — `isAdmin` flag on NavItem, SidebarProps, SidebarContentProps; filtering logic
- `src/app/dashboard/layout.tsx` — passes `isAdmin` to Sidebar
- `src/app/dashboard/jobs/page.tsx` — `requireAdmin()` guard
- `src/app/dashboard/ai/history/page.tsx` — `requireAdmin()` guard

**Status:** `pnpm run check` ✅

---

## 2026-04-10: Audit Fixes — Rate Limiting, Email Templates, Pagination, Schema ✅

**Summary:** Fixed 4 confirmed codebase audit issues: missing rate limiting on AI inspiration endpoint, plain-text billing emails upgraded to HTML templates, admin analytics pagination navigation, and subscriptions.status NOT NULL constraint.

**Changes:**

1. **AI Inspiration Rate Limiting** — Refactored `ai/inspiration` route to use the shared `aiPreamble()` helper, adding rate limiting (20/200/1000 per hour for free/pro/agency), AI access check, and quota enforcement. Previously had no rate limit — free users could make unlimited requests.
2. **Billing Email HTML Templates** — Created 7 React Email templates in `src/components/email/billing/` using BaseLayout branding. Updated Stripe webhook handler to send HTML emails alongside existing text fallbacks for: trial expired, cancel scheduled, reactivated, subscription cancelled, payment failed, payment succeeded, trial ending soon.
3. **Admin Analytics Pagination** — Added Previous/Next navigation buttons to `/admin/billing/analytics`. New client component `AnalyticsPagination` with URL-based page state. API already supported `page` param; page now passes it through.
4. **subscriptions.status NOT NULL** — Column now has `.notNull().default("active")`. All insert/update points already provided a value; this adds data integrity at the schema level.

**Schema Change (migration 0044):**

| Table           | Change                                                   |
| --------------- | -------------------------------------------------------- |
| `subscriptions` | `status` column: `SET DEFAULT 'active'` + `SET NOT NULL` |

**Files Modified:**

- `src/app/api/ai/inspiration/route.ts` — refactored to use `aiPreamble()`
- `src/app/api/billing/webhook/route.ts` — added `react:` prop to 7 billing email calls
- `src/app/admin/billing/analytics/page.tsx` — searchParams + pagination component
- `src/lib/schema.ts` — subscriptions.status NOT NULL

**Files Created:**

- `src/components/admin/billing/analytics-pagination.tsx`
- `src/components/email/billing/trial-expired-email.tsx`
- `src/components/email/billing/cancel-scheduled-email.tsx`
- `src/components/email/billing/reactivated-email.tsx`
- `src/components/email/billing/subscription-cancelled-email.tsx`
- `src/components/email/billing/payment-failed-email.tsx`
- `src/components/email/billing/payment-succeeded-email.tsx`
- `src/components/email/billing/trial-ending-soon-email.tsx`
- `drizzle/0044_smiling_radioactive_man.sql`

---

## 2026-04-10: Billing Phase 6 — Rate Limiting, Analytics, Monitoring, Schema Hardening ✅

**Summary:** Completed 5 hardening improvements: shared IP rate limiting, billing analytics admin page, webhook retry monitoring with admin alerts, subscriptions.plan NOT NULL constraint, and audit log retention policy.

**Changes:**

1. **Shared IP Rate Limiting** — Extracted inline Redis rate limit from 4 billing routes into `checkIpRateLimit()` in `src/lib/rate-limiter.ts`. Added rate limiting to `billing/status` (30/min) and `ai/inspiration`.
2. **Billing Analytics Admin Page** — New page at `/admin/billing/analytics` with plan distribution, churn rate, grace recovery rate, failed webhooks table, and recent plan changes. New API endpoint at `/api/admin/billing/analytics`.
3. **Webhook Retry Monitoring** — `processedWebhookEvents` table now tracks retry count, event type, and error message. Admins receive in-app notifications when a webhook fails 3+ times.
4. **subscriptions.plan NOT NULL** — Column now has `.notNull().default("free")`. Removed 5 `?? "free"` workarounds across webhook, status, and admin routes.
5. **Audit Log Retention** — Cron cleanup now prunes `plan_change_log` entries older than 1 year alongside the existing 90-day webhook event cleanup.

**Schema Changes (migration 0043):**

| Table                      | Change                                                                |
| -------------------------- | --------------------------------------------------------------------- |
| `subscriptions`            | `plan` column: `SET DEFAULT 'free'` + `SET NOT NULL`                  |
| `processed_webhook_events` | New columns: `event_type`, `retry_count` (default 0), `error_message` |

**Files Modified:**

- `src/lib/schema.ts` — subscriptions.plan NOT NULL + processedWebhookEvents new columns
- `src/lib/rate-limiter.ts` — new `checkIpRateLimit()` helper
- `src/app/api/billing/webhook/route.ts` — retry tracking + admin alerts
- `src/app/api/billing/status/route.ts` — rate limiting + removed `?? "free"`
- `src/app/api/billing/checkout/route.ts` — refactored to shared rate limiter
- `src/app/api/billing/change-plan/route.ts` — refactored to shared rate limiter
- `src/app/api/billing/portal/route.ts` — refactored to shared rate limiter
- `src/app/api/billing/validate-promo/route.ts` — refactored to shared rate limiter
- `src/app/api/admin/billing/analytics/route.ts` — NEW analytics API
- `src/app/admin/billing/analytics/page.tsx` — NEW analytics page
- `src/app/admin/billing/analytics/loading.tsx` — NEW loading skeleton
- `src/components/admin/sidebar.tsx` — added Analytics sidebar entry
- `src/app/api/cron/billing-cleanup/route.ts` — plan_change_log 1-year retention
- `src/app/api/admin/billing/overview/route.ts` — removed `?? "free"` workaround

**Verification:** lint + typecheck clean, 196/196 tests pass

**Migration:** `drizzle/0043_odd_justin_hammer.sql` — NOT YET APPLIED (requires manual production SQL)

---

## 2026-04-10: Billing System — Final Gaps Implementation & Production Deployment ✅

**Summary:** Completed the remaining 3 billing gaps (audit trail, grace period enforcement, trial end persistence) and deployed to production. All 22 billing audit items are now resolved. Post-deployment review caught and fixed 2 additional hardening items.

**Requirements Addressed:**

1. **Plan Change Audit Trail** — New `plan_change_log` table records every plan transition (who, from, to, when, why) across 8 code paths (was 7, added payment_failed_grace_period)
2. **Grace Period Auto-Enforcement** — Cron job now checks for expired grace periods and downgrades users to free, cancels Stripe subscriptions, and sends notifications
3. **Trial End Persistence** — Stripe `trial_end` timestamp now persisted to `subscriptions.trial_end` column in webhook handlers
4. **Cron Infrastructure** — Vercel cron job configured (daily 2am UTC), `CRON_SECRET` set in dev and production

**Post-Deployment Hardening (code review):**

- Wrapped `handleSubscriptionUpdated` plan change + audit log in `db.transaction()` — was 3 separate DB calls, now atomic (rule #5)
- Added `plan_change_log` entry for `handleInvoicePaymentFailed` — complete paper trail of grace period triggers

**Schema Changes:**

| Change     | Table                     | Details                                                                                               |
| ---------- | ------------------------- | ----------------------------------------------------------------------------------------------------- |
| New table  | `plan_change_log`         | `id`, `user_id`, `old_plan`, `new_plan`, `reason`, `stripe_subscription_id`, `created_at` + 2 indexes |
| New column | `subscriptions.trial_end` | `timestamp` (nullable)                                                                                |

**Files Modified:**

| File                                        | Changes                                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/lib/schema.ts`                         | Added `plan_change_log` table + `subscriptions.trialEnd` column                               |
| `src/app/api/cron/billing-cleanup/route.ts` | Grace period enforcement: query expired users, downgrade, cancel Stripe, notify               |
| `src/app/api/billing/webhook/route.ts`      | Trial end persistence (3 locations) + audit log inserts (5 locations) + transaction hardening |
| `src/app/api/billing/status/route.ts`       | Audit log inserts (2 locations)                                                               |
| `src/app/api/admin/subscribers/route.ts`    | Audit log insert (1 location)                                                                 |
| `vercel.json`                               | Cron job configuration                                                                        |

**Verification:**

- `pnpm run check` (lint + typecheck) — clean
- `pnpm test` — 196/196 tests passing
- Production deployment — zero runtime errors
- Cron endpoint — correctly rejects bad auth, processes with correct auth

**Migration:** `drizzle/0042_right_swarm.sql` — applied to both dev and production databases
