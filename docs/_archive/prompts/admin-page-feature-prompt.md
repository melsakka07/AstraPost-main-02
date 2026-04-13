# AstraPost — Admin Dashboard Feature Prompt

> **Purpose:** Use this prompt with an LLM (Claude, etc.) to build a production-ready admin dashboard for the AstraPost SaaS platform. Paste the full contents of this prompt along with your project's `README.md` and `CLAUDE.md` files.

---

## Context

You are working on **AstraPost**, an AI-powered social media scheduling and content platform. The tech stack is:

- **Framework:** Next.js 16 (App Router), React 19, TypeScript (strict mode)
- **Database:** PostgreSQL 18 with Drizzle ORM
- **Auth:** Better Auth (Email/Password + OAuth + 2FA)
- **UI:** shadcn/ui + Tailwind CSS 4 (dark mode supported)
- **Billing:** Stripe (Pro Monthly, Pro Annual, Agency Monthly, Agency Annual plans + 14-day free trial)
- **State:** Zustand
- **Forms:** React Hook Form + Zod
- **Existing tables of interest:** `user`, `subscriptions`, `session`, `account`, `posts`, `tweets`, `job_runs`, `ai_generations`
- **Existing admin area:** A basic admin panel exists at `src/app/admin/` with rudimentary user listing and job monitoring. This will be replaced/enhanced.
- **Existing helpers:** `src/lib/admin.ts`, `src/lib/api/errors.ts` (ApiError), `src/lib/middleware/require-plan.ts`, `src/lib/schema.ts`

The platform already has a `role` field on the `user` table (managed by Better Auth). Admin access is gated in the proxy/middleware layer — only users with `role: "admin"` can access `/admin/*` routes.

---

## Objective

Build a comprehensive **Admin Dashboard** that gives me (the platform owner) full visibility and control over three core areas: **Subscribers**, **Billing**, and **Features**. The admin dashboard must follow the existing project conventions, be practical and clean, and avoid over-engineering — this is a simple SaaS, not an enterprise suite.

---

## Scope & Requirements

### 1. Subscribers Management

**1.1 — Subscriber List View (read)**

- Paginated, searchable, sortable table of all users.
- Columns: name, email, signup date, plan (free / trial / pro-monthly / pro-annual / agency-monthly / agency-annual), status (active / inactive / banned), connected platforms count (X, LinkedIn, Instagram), last login date.
- Quick-filter pills: "All", "Free", "Trial", "Pro", "Agency", "Banned".
- Search by name or email (server-side, debounced).
- Sortable by signup date, last login, and plan.
- Each row has a "View" action that opens a subscriber detail panel/page.

**1.2 — Subscriber Detail View (read)**

- Full profile: name, email, avatar, signup date, timezone, language, plan, Stripe customer ID, referral code.
- Subscription info: current plan, billing cycle, trial end date, subscription status, next billing date.
- Usage summary: total posts scheduled, total posts published, total drafts, AI credits used this month, connected accounts list.
- Activity: last 10 login sessions (date + device/browser if available from session table).
- Related data: quick links/counts for their posts, AI generations, team (if agency).

**1.3 — Subscriber Actions (write)**

- **Edit subscriber:** Change name, email, plan (manual override), role (user/admin), status (active/banned).
- **Add subscriber:** Manual form to create a user with name, email, temporary password, plan assignment. Send a welcome email via Resend.
- **Ban/unban subscriber:** Toggle ban status. Banning should invalidate all active sessions for that user.
- **Delete subscriber:** Soft-delete with confirmation dialog. Warn about cascading effects (posts, subscriptions, connected accounts). Do NOT hard-delete; mark as deleted and anonymize PII.
- **Impersonate (view-as):** Optional stretch goal — an admin can view the dashboard as a specific user for debugging. If implemented, log every impersonation event for audit.

**1.4 — Subscriber API Routes**

- `GET /api/admin/subscribers` — paginated list with search/filter/sort query params.
- `GET /api/admin/subscribers/[id]` — full detail for one subscriber.
- `PATCH /api/admin/subscribers/[id]` — edit subscriber fields.
- `POST /api/admin/subscribers` — create a new subscriber.
- `DELETE /api/admin/subscribers/[id]` — soft-delete subscriber.
- `POST /api/admin/subscribers/[id]/ban` — ban/unban toggle.
- All routes must verify the caller is an admin (check `role === "admin"` from session).
- All routes must use `ApiError` from `@/lib/api/errors` for error responses.
- All multi-table writes must use `db.transaction()`.

---

### 2. Billing Management

**2.1 — Billing Overview Dashboard (read)**

- Summary cards at the top: Total MRR (Monthly Recurring Revenue), total active subscriptions, total churned (cancelled) subscriptions this month, trial-to-paid conversion rate.
- Revenue breakdown: count and revenue per plan tier (Pro Monthly, Pro Annual, Agency Monthly, Agency Annual).
- Recent transactions: last 20 subscription events (new, upgraded, downgraded, cancelled, payment failed) pulled from the `subscriptions` table and/or Stripe webhooks log.

**2.2 — Plan & Price Management (write)**

- Display current plan tiers and their Stripe price IDs (read from environment variables or a config table).
- Ability to update the display price shown on the frontend pricing page (this does NOT change the Stripe price — it updates a config value that the pricing page reads).
- Ability to mark a plan as "hidden" (not shown on the pricing page but existing subscribers keep it).
- Note: Actual Stripe price changes must be done in the Stripe dashboard. The admin UI only manages the display/config layer.

**2.3 — Promo Codes (full CRUD)**

- Create promo codes with: code string, discount type (percentage or fixed amount), discount value, valid-from date, valid-to date, max redemptions, applicable plans (which tiers it applies to), active/inactive toggle.
- List all promo codes in a table with columns: code, discount, validity period, redemptions used / max, status, actions.
- Edit existing promo codes (update discount, dates, max redemptions, status).
- Delete promo codes (soft-delete — mark inactive, keep for historical reference).
- Promo code validation endpoint for the checkout flow: `POST /api/admin/promo-codes/validate` — accepts a code, returns discount details or error.
- **Database:** Create a new `promo_codes` table and a `promo_code_redemptions` table to track usage.
- **Integration:** The Stripe checkout flow should accept an optional promo code, create a Stripe coupon/promotion code on-the-fly or map to an existing Stripe coupon, and apply the discount at checkout.

**2.4 — Billing API Routes**

- `GET /api/admin/billing/overview` — summary stats (MRR, counts, conversion rate).
- `GET /api/admin/billing/transactions` — recent subscription events.
- `GET /api/admin/promo-codes` — list all promo codes.
- `POST /api/admin/promo-codes` — create promo code.
- `PATCH /api/admin/promo-codes/[id]` — update promo code.
- `DELETE /api/admin/promo-codes/[id]` — soft-delete promo code.
- `POST /api/billing/validate-promo` — public-facing validation (not admin-only, used at checkout). Rate-limited.

---

### 3. Feature & Platform Management

**3.1 — Platform Stats Dashboard (read)**

- Key metrics cards: total users, new users (last 7 days), total posts published (all time), posts published (last 7 days), active AI users (used AI this month), total AI generations this month.
- System health: BullMQ queue depth (pending jobs), failed jobs (last 24h), worker status.
- Quick links to: Drizzle Studio, Bull Board (if available), Sentry dashboard.

**3.2 — Feature Flags (simple toggle system)**

- A lightweight key-value feature flag system. No need for a full feature-flag service — just a `feature_flags` table with columns: key (string, unique), enabled (boolean), description (text), updated_at.
- Admin UI: Table listing all flags with toggle switches.
- API helper: `isFeatureEnabled(key: string): Promise<boolean>` that checks the table (with in-memory cache, 60-second TTL).
- Seed with sensible defaults: `ai_image_generation`, `instagram_publishing`, `linkedin_publishing`, `referral_program`, `team_collaboration`, `promo_codes`.
- API routes:
  - `GET /api/admin/feature-flags` — list all flags.
  - `PATCH /api/admin/feature-flags/[key]` — toggle a flag.

**3.3 — Announcement Banner (simple)**

- Admin can set a global announcement banner (text + type: info/warning/success + active toggle).
- Stored in the `feature_flags` table or a simple `announcements` table.
- Displays at the top of the dashboard for all users when active.
- Admin UI: Text input, type selector, preview, and active toggle.

---

## Technical Constraints & Conventions

You MUST follow these project conventions — review the `CLAUDE.md` file for full details:

1. **File structure:** All admin pages go under `src/app/admin/`. All admin API routes go under `src/app/api/admin/`. All admin components go under `src/components/admin/`.
2. **Page wrapper:** Every admin page must use a consistent page wrapper component (create `AdminPageWrapper` similar to `DashboardPageWrapper`).
3. **Navigation:** The admin area has its own sidebar (already exists at `src/components/admin/`). Add entries for every new page.
4. **Server Components by default.** Only use `"use client"` when interactivity is needed (tables with filters, forms, toggles).
5. **API errors:** Always use `ApiError` from `@/lib/api/errors`. Never inline `new Response(JSON.stringify(...))`.
6. **Transactions:** Multi-table writes must use `db.transaction()`.
7. **Plan gates:** Do NOT call `getPlanLimits()` directly in route handlers.
8. **Validation:** Use Zod schemas for all API input validation. Shared schemas go in `src/lib/schemas/common.ts`.
9. **Auth check:** Every admin API route must verify `role === "admin"` from the session. Create a reusable `requireAdmin()` helper that returns the session or throws `ApiError.forbidden()`.
10. **Styling:** Use shadcn/ui components and Tailwind CSS utility classes. Support dark mode. No custom colors unless necessary.
11. **Tables:** Use shadcn/ui `<Table>` or a DataTable pattern with column sorting, pagination, and search.
12. **Forms:** Use React Hook Form + Zod for all forms.
13. **Toasts:** Use `sonner` for success/error notifications.
14. **Database migrations:** After adding new tables or columns, generate and apply migrations with `pnpm run db:generate && pnpm run db:migrate`.
15. **Testing:** Run `pnpm lint && pnpm typecheck` after every batch of changes.

---

## Implementation Plan

Implement this feature in **4 phases**. At the start of the project, create a progress tracking document at `docs/features/admin-dashboard-progress.md`. Update this document after completing each phase with: what was done, files created/modified, and any decisions made.

### Phase 1 — Foundation & Subscriber Management (Backend)

**Goal:** Database schema, admin auth helpers, subscriber CRUD API routes.

Tasks:

- Create `requireAdmin()` helper in `src/lib/admin.ts` (or enhance the existing file).
- Add new tables to `src/lib/schema.ts`: `promo_codes`, `promo_code_redemptions`, `feature_flags`. Add `banned_at` and `deleted_at` columns to the `user` table if they don't exist.
- Generate and apply database migration.
- Build all subscriber API routes (`/api/admin/subscribers/...`) with Zod validation.
- Write the progress tracking document with Phase 1 results.

### Phase 2 — Subscriber Management (Frontend)

**Goal:** Admin subscriber pages and components.

Tasks:

- Build the subscriber list page with search, filter, sort, and pagination.
- Build the subscriber detail page/panel.
- Build the add/edit subscriber forms (React Hook Form + Zod).
- Build ban/unban and soft-delete confirmation dialogs.
- Add sidebar navigation entries for subscriber pages.
- Update the progress document.

### Phase 3 — Billing Management

**Goal:** Billing overview, promo code system (full stack).

Tasks:

- Build billing overview API route and dashboard cards (MRR, active subs, churn, conversion).
- Build promo code CRUD: schema already created in Phase 1, now build API routes + frontend.
- Build the promo code creation/edit form.
- Build the public-facing promo code validation endpoint.
- Integrate promo code validation into the existing Stripe checkout flow (modify `src/app/api/billing/` routes).
- Build the plan display config UI (optional — only if time permits; otherwise just display current env var values read-only).
- Update the progress document.

### Phase 4 — Feature Management & Polish

**Goal:** Feature flags, platform stats, announcement banner, and final polish.

Tasks:

- Build feature flag API routes and admin toggle UI.
- Create the `isFeatureEnabled()` helper with in-memory caching.
- Seed default feature flags via migration or a seed script.
- Build the platform stats dashboard (user counts, post counts, AI usage, queue health).
- Build the announcement banner system (admin config + user-facing banner component).
- Final UI polish: loading states, empty states, error boundaries, mobile responsiveness.
- Full `pnpm lint && pnpm typecheck` pass.
- Update the progress document with final status.

---

## Progress Tracking Document

At the very start of implementation, create the file `docs/features/admin-dashboard-progress.md` with this structure:

```markdown
# Admin Dashboard — Implementation Progress

## Status: In Progress

## Phase 1 — Foundation & Subscriber Management (Backend)

- **Status:** Not Started
- **Files Created:**
- **Files Modified:**
- **Decisions & Notes:**

## Phase 2 — Subscriber Management (Frontend)

- **Status:** Not Started
- **Files Created:**
- **Files Modified:**
- **Decisions & Notes:**

## Phase 3 — Billing Management

- **Status:** Not Started
- **Files Created:**
- **Files Modified:**
- **Decisions & Notes:**

## Phase 4 — Feature Management & Polish

- **Status:** Not Started
- **Files Created:**
- **Files Modified:**
- **Decisions & Notes:**

## Changelog

| Date | Phase | Change |
| ---- | ----- | ------ |
```

Update this document after each phase is completed. Change each phase status to "Complete" and fill in the files and decisions. Add a row to the changelog table for each update.

---

## What NOT To Do

- **Do not over-engineer.** No RBAC with granular permissions — just admin vs. user is enough. No audit log table (unless impersonation is implemented). No real-time WebSocket dashboard updates — simple page refreshes are fine.
- **Do not build a full Stripe management UI.** Price changes happen in the Stripe dashboard. The admin UI only shows read-only billing stats and manages the display/config layer.
- **Do not build user-facing self-service promo code redemption UI.** The promo code is entered during checkout only — the validation endpoint is called from the existing checkout flow.
- **Do not create separate CSS files or custom design tokens.** Use shadcn/ui and Tailwind utilities exclusively.
- **Do not skip validation.** Every API route must validate input with Zod.
- **Do not hardcode admin emails.** Use the `role` field on the `user` table.

---

## Deliverables Checklist

When all phases are complete, the following should exist:

- [ ] `requireAdmin()` helper
- [ ] `promo_codes` and `promo_code_redemptions` tables in schema
- [ ] `feature_flags` table in schema
- [ ] Database migration applied
- [ ] Subscriber list page with search/filter/sort/pagination
- [ ] Subscriber detail page
- [ ] Add/edit/ban/delete subscriber functionality
- [ ] All subscriber API routes (6 endpoints)
- [ ] Billing overview dashboard with MRR and stats
- [ ] Promo code CRUD (frontend + backend)
- [ ] Promo code checkout integration
- [ ] Feature flags toggle UI and `isFeatureEnabled()` helper
- [ ] Platform stats dashboard
- [ ] Announcement banner (admin config + user display)
- [ ] Admin sidebar updated with all new pages
- [ ] Progress document fully updated
- [ ] `pnpm lint && pnpm typecheck` passes cleanly
