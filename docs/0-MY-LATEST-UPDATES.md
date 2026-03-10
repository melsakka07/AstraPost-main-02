# Latest Updates

## 2026-03-10: Phase 4 Regression Guards, Shared Toolbar, and Density Controls

- **Issue**:
  - Queue/Calendar/Analytics still had repeated toolbar implementations and lacked reusable regression checks.
  - Power users needed optional dense data display for faster scanning.
- **Fix**:
  - Added shared dashboard toolbar component and applied it to Queue, Calendar, and Analytics pages.
  - Added desktop density toggles (`comfortable`/`compact`) for Queue entries and Analytics cards/content.
  - Added Playwright UI regression test suite for:
    - single-page scroll behavior (avoid double main scrollbars),
    - footer visibility and left-edge integrity across dashboard routes,
    - density toggle behavior on Queue/Analytics.
  - Added Playwright configuration and dedicated script for UI regression test execution.
- **Files Modified**:
  - `src/components/dashboard/page-toolbar.tsx`
  - `src/app/dashboard/queue/page.tsx`
  - `src/app/dashboard/calendar/page.tsx`
  - `src/app/dashboard/analytics/page.tsx`
  - `playwright.config.ts`
  - `tests/e2e/dashboard-layout.e2e.ts`
  - `package.json`
- **Validation**:
  - `pnpm run lint` passed.
  - `pnpm run typecheck` passed.
  - `pnpm test` passed.
  - `pnpm run test:e2e:ui -- --list` passed (test discovery and config validation).

## 2026-03-10: Phase 3 UX Refinements for Queue, Calendar, and Analytics

- **Issue**:
  - High-density dashboard pages needed stronger empty states, better mobile legibility, and clearer interaction affordances.
- **Fix**:
  - Added reusable empty-state component with icon, title, description, and primary/secondary actions.
  - Upgraded Queue with sticky page header, section-level actions, clearer scheduled status semantics, and action-oriented empty states.
  - Upgraded Calendar with sticky toolbar, week-level empty state CTA flow, day cards with count badges, and denser content scan patterns.
  - Upgraded Analytics with sticky top actions, horizontally scrollable account filters on small screens, chart axis day labels, clearer refresh status labels, and CTA-driven empty states for follower history/top tweets.
- **Files Modified**:
  - `src/components/ui/empty-state.tsx`
  - `src/app/dashboard/queue/page.tsx`
  - `src/app/dashboard/calendar/page.tsx`
  - `src/app/dashboard/analytics/page.tsx`
- **Validation**:
  - `pnpm run lint` passed.
  - `pnpm run typecheck` passed.
  - `pnpm test` passed.

## 2026-03-10: Phase 2 Dashboard Page Shell and Overflow Standardization

- **Issue**:
  - Dashboard pages had inconsistent spacing, heading structure, and container widths.
  - Dense UI sections could overflow horizontally on smaller screens.
- **Fix**:
  - Standardized page shell wrappers across 10 dashboard pages with consistent `max-w-7xl`, spacing rhythm, and heading treatment.
  - Improved responsive header/action layouts for mobile-first behavior.
  - Hardened dense sections against overflow by adding `min-w-0`, `break-words`, `break-all`, and mobile-first flex/grid adjustments in queue/jobs/analytics/cards.
  - Improved jobs filter form responsiveness to prevent narrow-screen overflow.
  - Updated settings profile grid to stack on mobile and split on larger screens.
- **Files Modified**:
  - `src/app/dashboard/page.tsx`
  - `src/app/dashboard/compose/page.tsx`
  - `src/app/dashboard/queue/page.tsx`
  - `src/app/dashboard/calendar/page.tsx`
  - `src/app/dashboard/drafts/page.tsx`
  - `src/app/dashboard/analytics/page.tsx`
  - `src/app/dashboard/jobs/page.tsx`
  - `src/app/dashboard/ai/page.tsx`
  - `src/app/dashboard/affiliate/page.tsx`
  - `src/app/dashboard/settings/page.tsx`
- **Validation**:
  - `pnpm run lint` passed.
  - `pnpm run typecheck` passed.

## 2026-03-10: Phase 1 Dashboard Scrolling and Footer Visibility Fix

- **Issue**:
  - Dashboard pages had nested scrolling behavior, causing double right-side scrollbars.
  - Footer visibility felt broken because the fixed sidebar could overlap and visually cut content on the left.
- **Cause**:
  - Dashboard layout used an internal `h-screen` + `overflow-y-auto` main scroll container.
  - Parent wrapper used `overflow-hidden`, preventing natural full-page scrolling.
  - Desktop sidebar used `position: fixed`, so it remained over lower-page content.
- **Fix**:
  - Refactored dashboard layout to use natural document flow for vertical scrolling.
  - Removed `overflow-hidden`, `overflow-y-auto`, and `h-screen` from the dashboard content area.
  - Reworked desktop sidebar from fixed positioning to sticky positioning (`top-0`, `h-screen`) within layout flow.
- **Files Modified**:
  - `src/app/dashboard/layout.tsx`
  - `src/components/dashboard/sidebar.tsx`
- **Validation**:
  - `pnpm run lint` passed.
  - `pnpm run typecheck` passed.

## 2026-03-10: Fix "Test X connection" 500 Error

- **Issue**: Clicking **Test X connection** in `/dashboard/settings` returned `GET /api/x/health 500`.
- **Cause**:
  - Health check client selection could pick an inactive X account because `getClientForUser` did not filter `isActive`.
  - Expired/reconnect-required sessions were surfaced as generic 500 responses.
- **Fix**:
  - Updated `XApiService.getClientForUser` to select only active accounts.
  - Updated `/api/x/health` error handling to return `401` for expired X sessions with the existing reconnect message.
- **Files Modified**:
  - `src/lib/services/x-api.ts`
  - `src/app/api/x/health/route.ts`
- **Validation**:
  - `pnpm run check` passed (`pnpm lint && pnpm typecheck`).

## 2026-03-10: Remove Inline Style Warnings in Analytics Page

- **Issue**: IDE diagnostics flagged inline style usage in `src/app/dashboard/analytics/page.tsx`.
- **Cause**: Bar chart elements used `style={{ height: ... }}` for dynamic heights.
- **Fix**:
  - Replaced inline `style` height usage with class-based height mapping.
  - Added a reusable height-class mapper and static Tailwind height class scale.
- **Files Modified**:
  - `src/app/dashboard/analytics/page.tsx`
- **Validation**:
  - `pnpm run check` passed (`pnpm lint && pnpm typecheck`).

## 2026-03-10: Fix Analytics and Next Image Runtime Errors

- **Issue**:
  - `next/image` rejected `pbs.twimg.com` avatars because host was not configured.
  - Analytics page failed with `DrizzleQueryError` when filtering by `captured_at >= Date`.
  - Next.js dynamic API warning on `/dashboard/analytics` and `/dashboard/jobs` for sync `searchParams` usage.
- **Cause**:
  - Missing Twitter image host in `images.remotePatterns`.
  - Raw `sql` template comparisons passed `Date` values in a way that broke parameter serialization with the `postgres` driver.
  - `searchParams` in Next.js 16 App Router pages is async and must be awaited.
- **Fix**:
  - Added `pbs.twimg.com` to `next.config.ts` image remote patterns.
  - Replaced raw Date SQL comparisons with Drizzle operators (`gte`, `lte`) in analytics page and analytics followers API route.
  - Updated analytics/jobs pages to await `searchParams` and safely normalize array/string values.
- **Files Modified**:
  - `next.config.ts`
  - `src/app/dashboard/analytics/page.tsx`
  - `src/app/dashboard/jobs/page.tsx`
  - `src/app/api/analytics/followers/route.ts`
- **Validation**:
  - `pnpm run check` passed (`pnpm lint && pnpm typecheck`).

## 2026-03-10: Fix Turbopack Panic After Warning Cleanup

- **Issue**: Dev server crashed with `TurbopackInternalError` due to conflict between `transpilePackages` and `serverExternalPackages` for `ioredis`.
- **Cause**: `ioredis` was added to `transpilePackages`, but Turbopack treats it as externally managed on the server side, which created a hard conflict.
- **Fix**:
  - Updated `next.config.ts` to use `transpilePackages: ["bullmq"]` only.
  - Removed `ioredis` from `transpilePackages` to resolve the startup panic.
- **Files Modified**:
  - `next.config.ts`
- **Validation**:
  - `pnpm run check` passed (`pnpm lint && pnpm typecheck`).

## 2026-03-10: Fix Terminal Startup Warnings

- **Issue**: Development terminal showed repeated startup warnings for Sentry deprecated options and BullMQ/IORedis external package resolution.
- **Cause**:
  - `next.config.ts` used deprecated Sentry options: `disableLogger`, `automaticVercelMonitors`, and `reactComponentAnnotation`.
  - Turbopack attempted to externalize BullMQ/IORedis and produced `ioredis/built/utils` resolution warnings.
  - Local development warned about `BLOB_READ_WRITE_TOKEN` even when local storage fallback is expected.
- **Fix**:
  - Updated Sentry configuration to the new `webpack.*` option format.
  - Added `transpilePackages: ["bullmq", "ioredis"]` in Next config to prevent external package resolution warnings.
  - Limited the `BLOB_READ_WRITE_TOKEN` warning to production only.
  - Updated calendar date range calculations to avoid `Date.now()` lint purity errors introduced by stricter linting.
- **Files Modified**:
  - `next.config.ts`
  - `src/lib/env.ts`
  - `src/app/dashboard/calendar/page.tsx`
- **Validation**:
  - `pnpm run check` passed (`pnpm lint && pnpm typecheck`).

## 2026-03-10: Fix Calendar Query Date Handling

- **Issue**: `TypeError: The "string" argument must be of type string... Received an instance of Date` when accessing the Calendar page.
- **Cause**: The query in `src/app/dashboard/calendar/page.tsx` was using raw `sql` template literals (`sql<boolean>\`${posts.scheduledAt} >= ${start}\``) which passed `Date` objects directly to the template string interpolation. This caused serialization issues with the underlying driver.
- **Fix**: Replaced raw `sql` usage with Drizzle's type-safe operators:
  - `gte(posts.scheduledAt, start)`
  - `lte(posts.scheduledAt, end)`
  - `isNotNull(posts.scheduledAt)`
  - This ensures proper parameter handling and type safety.
- **Files Modified**:
  - `src/app/dashboard/calendar/page.tsx` (Updated query logic)

## 2026-03-10: Database Schema Fix

- **Issue**: Application crashed with `internal_server_error` due to missing `trial_ends_at` column in `user` table.
- **Cause**: Database schema was out of sync with `src/lib/schema.ts`. Previous migrations seemed to be missing or partially applied, causing `drizzle-kit` to generate a large migration that conflicted with existing tables.
- **Fix**: Created and applied a custom migration `drizzle/0008_grey_monster_badoon.sql` that:
  - Adds `trial_ends_at` to `user` table (with `IF NOT EXISTS` check).
  - Adds potentially missing columns to `posts` and `x_accounts` tables.
  - Skips creation of tables that already exist in the database (`analytics_refresh_runs`, `follower_snapshots`, etc.).
- **Files Modified**:
  - `drizzle/0008_grey_monster_badoon.sql` (Created/Modified)
  - `drizzle/meta/*` (Updated by `drizzle-kit generate`)

## Next Steps

1. **Verify**: Refresh the Calendar page (`/dashboard/calendar`) to ensure it loads without errors.
2. **Monitor**: Check if scheduled posts appear correctly on the calendar.
