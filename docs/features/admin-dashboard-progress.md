# Admin Dashboard — Implementation Progress

## Status: All 4 Phases Complete ✓

## Phase 1 — Foundation & Subscriber Management (Backend)
- **Status:** Complete
- **Files Created:**
  - `src/app/api/admin/subscribers/route.ts` — GET (list) + POST (create)
  - `src/app/api/admin/subscribers/[id]/route.ts` — GET (detail) + PATCH (edit) + DELETE (soft-delete)
  - `src/app/api/admin/subscribers/[id]/ban/route.ts` — POST ban/unban toggle
- **Files Modified:**
  - `src/lib/admin.ts` — added `requireAdminApi()` helper for API routes
  - `src/lib/schema.ts` — added `bannedAt` + `deletedAt` to user table; new tables: `promoCodes`, `promoCodeRedemptions`, `featureFlags`; new enum: `discountTypeEnum`
- **Decisions & Notes:**
  - `requireAdmin()` (page redirect) kept as-is; new `requireAdminApi()` returns `{ ok, session }` tuple for API routes
  - User creation via `auth.api.signUpEmail` to let Better Auth handle password hashing; then db.update for plan/role
  - Ban = set `bannedAt` timestamp + `isSuspended = true`; unban = clear both
  - Soft-delete = set `deletedAt` timestamp; hard-delete is intentionally NOT supported
  - Plan enum stays as existing: "free" | "pro_monthly" | "pro_annual" | "agency"
  - Migration: `0032_admin_dashboard_foundation`

## Phase 2 — Subscriber Management (Frontend)
- **Status:** Complete
- **Files Created:**
  - `src/components/admin/admin-page-wrapper.tsx` — shared page header wrapper for all admin pages
  - `src/components/admin/subscribers/types.ts` — shared TypeScript types for subscriber data
  - `src/components/admin/subscribers/subscriber-badges.tsx` — PlanBadge, StatusBadge, SubscriptionStatusBadge
  - `src/components/admin/subscribers/subscribers-table.tsx` — paginated, searchable, filterable, sortable table with add/edit/ban/delete actions
  - `src/components/admin/subscribers/subscriber-detail.tsx` — full profile, usage stats, sessions, connected accounts view
  - `src/components/admin/subscribers/add-subscriber-dialog.tsx` — RHF+Zod add form dialog
  - `src/components/admin/subscribers/edit-subscriber-dialog.tsx` — RHF+Zod edit form dialog
  - `src/components/admin/subscribers/ban-dialog.tsx` — ban/unban AlertDialog
  - `src/components/admin/subscribers/delete-dialog.tsx` — soft-delete AlertDialog with PII warning
  - `src/app/admin/subscribers/page.tsx` — list page
  - `src/app/admin/subscribers/[id]/page.tsx` — detail page
- **Files Modified:**
  - `src/components/admin/sidebar.tsx` — replaced legacy "Users" entry with "Subscribers" pointing to new route
- **Decisions & Notes:**
  - Table is fully client-side (fetch from API); no server-side data passing to avoid stale data after mutations
  - Debounced search (350ms) prevents excessive API calls during typing
  - Detail view fetches its own data client-side; redirects back to list if subscriber not found
  - Ban/delete use AlertDialog for confirmation before mutation
  - Edit dialog resets form values when `subscriber` prop changes (useEffect + form.reset)

## Phase 3 — Billing Management
- **Status:** Complete
- **Files Created:**
  - `src/app/api/admin/billing/overview/route.ts` — MRR + subscription stats (plan breakdown, churn, conversion rate)
  - `src/app/api/admin/billing/transactions/route.ts` — Last 20 subscription events with user details
  - `src/app/api/admin/promo-codes/route.ts` — GET list + POST create (with Stripe coupon creation)
  - `src/app/api/admin/promo-codes/[id]/route.ts` — PATCH update + DELETE soft-delete
  - `src/app/api/billing/validate-promo/route.ts` — Public promo validation with IP-based Redis rate limiting
  - `src/components/admin/billing/billing-overview.tsx` — BillingOverview client component (MRR cards, plan breakdown, transactions table)
  - `src/components/admin/billing/create-promo-dialog.tsx` — RHF+Zod create dialog (code, type, value, dates, max redemptions, plans, active toggle)
  - `src/components/admin/billing/edit-promo-dialog.tsx` — RHF+Zod edit dialog (same fields; code + discount immutable)
  - `src/components/admin/billing/promo-codes-table.tsx` — CRUD table with create/edit/delete actions
  - `src/app/admin/billing/page.tsx` — Billing overview admin page
  - `src/app/admin/billing/promo-codes/page.tsx` — Promo codes management admin page
- **Files Modified:**
  - `src/lib/schema.ts` — added `stripeCouponId` column to `promoCodes` table
  - `src/app/api/billing/checkout/route.ts` — added optional `promoCode` input; applies Stripe coupon from DB
  - `src/components/admin/sidebar.tsx` — added Billing section (Billing Overview + Promo Codes); restructured into labelled sections
  - `drizzle/0033_same_psynapse.sql` — migration adding `stripe_coupon_id` to `promo_codes`
- **Decisions & Notes:**
  - MRR computed from DB subscription counts × `DISPLAY_PRICE_*` env vars (no Stripe API calls on load)
  - Stripe coupon created once at promo code creation time with ID `ASTRAPOST_{CODE}`; `stripeCouponId` stored in DB
  - Checkout applies coupon via `discounts: [{ coupon: id }]`; falls back to `allow_promotion_codes: true` when no coupon
  - Rate limiting on validate-promo: 20 req/min per IP via Redis INCR/EXPIRE; fails open if Redis unavailable
  - No `Checkbox` component in this project — plan selection uses toggle Button variants instead
  - Zod v4 + RHF v7.71 with `exactOptionalPropertyTypes: true`: avoid `.default()` in schemas; use `useForm<T, unknown, T>` explicit generics

## Phase 4 — Feature Management & Polish
- **Status:** Complete
- **Files Created:**
  - `src/lib/feature-flags.ts` — `isFeatureEnabled(key)` helper with 60s in-memory cache + `invalidateFeatureFlag(key)` + `DEFAULT_FLAGS` array
  - `src/app/api/admin/feature-flags/route.ts` — GET list (auto-seeds defaults if table empty)
  - `src/app/api/admin/feature-flags/[key]/route.ts` — PATCH toggle (busts cache after update)
  - `src/app/api/admin/announcement/route.ts` — GET + PUT (admin-only; stores config in feature_flags table under `_announcement` key)
  - `src/app/api/announcement/route.ts` — Public GET for user-facing banner (returns null when inactive)
  - `src/app/api/admin/stats/route.ts` — Platform stats (users, posts, AI generations, queue health)
  - `src/components/admin/feature-flags/feature-flags-table.tsx` — Optimistic-update toggle table; hides `_`-prefixed system flags
  - `src/components/admin/announcement/announcement-form.tsx` — RHF+Zod form with live preview of banner
  - `src/components/admin/stats/platform-stats.tsx` — Three-section stats dashboard (users, content, queue)
  - `src/components/announcement-banner.tsx` — User-facing banner; session-storage dismiss per message
  - `src/app/admin/feature-flags/page.tsx`
  - `src/app/admin/announcement/page.tsx`
  - `src/app/admin/stats/page.tsx`
- **Files Modified:**
  - `src/app/admin/metrics/page.tsx` — wrapped in `AdminPageWrapper`
  - `src/components/admin/sidebar.tsx` — added Platform Stats, Feature Flags, Announcement entries; restructured into 4 labelled sections
  - `src/app/dashboard/layout.tsx` — `<AnnouncementBanner />` inserted above `<FailureBanner />`
- **Decisions & Notes:**
  - Announcement stored in `feature_flags` table under special key `_announcement`; `description` = JSON `{text, type}`; `enabled` = active toggle — avoids a new migration
  - Feature flags auto-seeded on first GET (idempotent upsert for new defaults)
  - Cache bust via `invalidateFeatureFlag()` called in PATCH handler so toggle is reflected in < 1 request cycle
  - `jobRuns.status` enum is `"success"` not `"completed"` — caught by typecheck
  - Banner dismissed per-session via `sessionStorage` keyed to the exact message text

## Changelog
| Date | Phase | Change |
|------|-------|--------|
| 2026-03-26 | Phase 1 | Foundation complete — schema, helpers, all 6 subscriber API routes |
| 2026-03-26 | Phase 2 | Subscriber management frontend — list page, detail page, add/edit/ban/delete, AdminPageWrapper, sidebar |
| 2026-03-26 | Phase 3 | Billing management — overview API, transactions, promo code CRUD API+UI, Stripe coupon sync, checkout integration, sidebar restructured into sections |
| 2026-03-26 | Phase 4 | Feature flags toggle UI + isFeatureEnabled helper, platform stats dashboard, announcement banner (admin config + user-facing), metrics page wrapped in AdminPageWrapper, sidebar expanded to 4 sections |
