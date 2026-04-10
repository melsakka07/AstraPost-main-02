# Billing System Audit Report

## Date: 2026-03-25 (Original) | 2026-04-10 (Final Update)

## Status: ✅ ALL ITEMS RESOLVED

All 22 audit items (19 hardening + 3 schema gaps) have been implemented, verified, and deployed to production. See `billing-implementation-progress.md` for full details.

---

## 1. Existing Files Inventory

| File                                                     | Summary                                                                                                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/billing/checkout/route.ts`                  | `POST /api/billing/checkout` — creates a Stripe Checkout Session for a given plan. Has multiple bugs (see §7).                                    |
| `src/app/api/billing/portal/route.ts`                    | `POST /api/billing/portal` — creates a Stripe Billing Portal session for the current user. Mostly solid.                                          |
| `src/app/api/billing/webhook/route.ts`                   | `POST /api/billing/webhook` — handles 7 Stripe events. Well-implemented: raw body, signature verification, idempotency guard, per-event handlers. |
| `src/app/api/billing/webhook/route.test.ts`              | Unit tests for the webhook handler. Good coverage of all major event types and edge cases.                                                        |
| `src/app/api/billing/usage/route.ts`                     | `GET /api/billing/usage` — returns current plan, limits, and monthly usage counts. NOT a subscription status endpoint.                            |
| `src/lib/schema.ts`                                      | Defines `subscriptions`, `processedWebhookEvents` tables and billing columns on `user` table.                                                     |
| `src/lib/plan-limits.ts`                                 | Defines `PLAN_LIMITS` for all plan tiers, `normalizePlan()`, `getPlanLimits()`.                                                                   |
| `src/lib/middleware/require-plan.ts`                     | 15+ plan gate functions using `makeFeatureGate()`. Returns 402 with standard payload. Handles 14-day inferred trial.                              |
| `src/lib/env.ts`                                         | Validates env vars. All Stripe vars are `.optional()` — not enforced at startup.                                                                  |
| `src/lib/services/email.ts`                              | Email via Resend. Has `sendBillingEmail()` wrapper used by webhook. No billing-specific email templates.                                          |
| `src/lib/services/notifications.ts`                      | Inserts in-app notifications into the DB. Used by webhook for billing events.                                                                     |
| `src/components/billing/pricing-card.tsx`                | Renders a single plan card. Props-driven: price, features, CTA label, popular flag.                                                               |
| `src/components/billing/pricing-table.tsx`               | Monthly/Annual toggle, plan array, calls `POST /api/billing/checkout`. Handles 409 → portal redirect.                                             |
| `src/app/(marketing)/pricing/page.tsx`                   | Public Server Component pricing page. Passes `currentPlan`, `hasBillingProfile`, `isLoggedIn` to `PricingTable`.                                  |
| `src/components/ui/upgrade-modal.tsx`                    | Zustand-driven modal shown when 402 responses are caught. Context-aware: shows feature label, plan features, CTA.                                 |
| `src/components/ui/trial-banner.tsx`                     | Dashboard banner for the inferred 14-day free trial. Shows countdown and expiry states.                                                           |
| `src/components/ui/blurred-overlay.tsx`                  | Renders blurred children with lock overlay + upgrade CTA for gated content.                                                                       |
| `src/components/settings/plan-usage.tsx`                 | Fetches `/api/billing/usage`, renders progress bars for posts/accounts/AI usage. Shows upgrade CTA at 70%+.                                       |
| `src/components/settings/manage-subscription-button.tsx` | "Manage Subscription" button: calls `/api/billing/portal`, redirects to Stripe portal URL.                                                        |
| `src/app/dashboard/settings/page.tsx`                    | Settings page: shows plan badge, billing notice on return from Stripe, `PlanUsage`, `ManageSubscriptionButton`.                                   |

---

## 2. Database Schema

### `user` table (billing-relevant columns)

| Column             | Type        | Notes                                                                                                                            |
| ------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `plan`             | `planEnum`  | `"free" \| "pro_monthly" \| "pro_annual" \| "agency"` — default `"free"`                                                         |
| `planExpiresAt`    | `timestamp` | Grace period end date on payment failure. Null when healthy.                                                                     |
| `stripeCustomerId` | `text`      | Stripe customer ID. Null until first checkout attempt.                                                                           |
| `trialEndsAt`      | `timestamp` | Set by `require-plan.ts` on first gate check for free users (inferred 14-day trial from `createdAt`). NOT set by Stripe webhook. |

### `subscriptions` table

| Column                 | Type                     | Notes                                                 |
| ---------------------- | ------------------------ | ----------------------------------------------------- |
| `id`                   | `text` PK                | UUID                                                  |
| `userId`               | `text` FK                | References `user.id`, cascade delete                  |
| `stripeSubscriptionId` | `text` UNIQUE            | Stripe subscription object ID                         |
| `stripePriceId`        | `text`                   | Price ID of the active line item                      |
| `plan`                 | `planEnum`               | Mirrors `user.plan` at time of event                  |
| `status`               | `subscriptionStatusEnum` | `"active" \| "past_due" \| "cancelled" \| "trialing"` |
| `currentPeriodStart`   | `timestamp`              | Start of current billing period                       |
| `currentPeriodEnd`     | `timestamp`              | End of current billing period (next billing date)     |
| `cancelAtPeriodEnd`    | `boolean`                | True if user cancelled but still has access           |
| `cancelledAt`          | `timestamp`              | When the subscription was cancelled                   |
| `createdAt`            | `timestamp`              | Auto                                                  |
| `updatedAt`            | `timestamp`              | Auto                                                  |

> Note: `stripeCustomerId` is NOT stored on `subscriptions` — only on `user`.

### `processedWebhookEvents` table

| Column          | Type          | Notes                       |
| --------------- | ------------- | --------------------------- |
| `id`            | `text` PK     | UUID                        |
| `stripeEventId` | `text` UNIQUE | Stripe event ID (`evt_...`) |
| `processedAt`   | `timestamp`   | Auto defaultNow             |

### `planEnum` values

`"free"`, `"pro_monthly"`, `"pro_annual"`, `"agency"`

> **Important**: There is no `"agency_monthly"` or `"agency_annual"` in the enum. The checkout schema accepts these as input but the webhook normalises them to `"agency"` before writing to the DB.

---

## 3. API Routes

### `POST /api/billing/checkout`

**What it does:** Validates plan, maps to price ID, creates Stripe Checkout Session.

**Issues:**

- Uses `customer_email` instead of `customer` — does not look up or create a Stripe Customer object. Every checkout call for the same user may create a new Stripe customer, leading to duplicate customers.
- Does NOT pass `subscription_data.trial_period_days: 14` — Stripe-level trial will never be offered.
- Does NOT check whether the user has already used a trial (`trialEndsAt` is set from account creation, not from Stripe).
- Does NOT pass `allow_promotion_codes: true`.
- Creates `new Stripe(key)` on every request (no singleton).
- Uses raw `new Response(JSON.stringify(...))` everywhere instead of `ApiError`.
- Falls back to mock price IDs (`price_pro_monthly_mock`) when env vars are missing — silently broken in production.
- The `cancel_url` points to `/dashboard/settings?billing=cancelled` but the Phase 1 spec calls for `/pricing?billing=cancelled`.

### `POST /api/billing/portal`

**What it does:** Creates a Stripe Billing Portal session and returns the URL.

**Issues (minor):**

- API version is commented out (`// apiVersion: "2024-06-20"`).
- Creates `new Stripe(key)` on every request (no singleton).
- Uses `NextResponse.json` instead of `ApiError` for errors.
- Does not return `ApiError.badRequest("No billing account found")` as specified; returns a custom JSON error instead.

### `POST /api/billing/webhook`

**What it does:** Verifies Stripe signature, runs idempotency check, dispatches to per-event handlers.

**Events handled:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`, `customer.subscription.trial_will_end`, `checkout.session.expired`.

**Strengths:** Raw body signature verification, idempotency via `processedWebhookEvents`, module-level Stripe singleton, `runSideEffect` for non-critical side effects, `getPlanFromPriceId` for authoritative price→plan mapping.

**Issues:**

- `handleCheckoutCompleted` executes two separate DB writes (`db.update(user)` then `db.insert(subscriptions)`) without wrapping them in `db.transaction()` — violates CLAUDE.md §15.
- `handleInvoicePaymentFailed` executes two separate DB writes (`db.update(subscriptions)` then `db.update(user)`) without `db.transaction()`.
- `handleSubscriptionDeleted` executes two separate DB writes without `db.transaction()`.
- `handleSubscriptionDeleted` does NOT send a cancellation email, despite the spec requiring it.
- No `stripeCustomerId` stored in the subscriptions insert (not a bug — stored on `user` — but means you can't look up subscriptions by customer without joining user).

### `GET /api/billing/usage`

**What it does:** Returns `{ plan, limits, usage }` — plan tier, numeric limits, and current month usage counts.

**Issues:**

- Returns usage stats but NOT subscription lifecycle data: no `status`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `trialEndsAt`, `stripeCustomerId`. The settings page therefore cannot show trial countdown, next billing date, or cancellation state.
- The Phase 1.6 requirement for a billing status endpoint (returning subscription lifecycle info) is NOT fulfilled by this endpoint.

---

## 4. Frontend Components

### `PricingTable` / `PricingCard`

**Strengths:** Monthly/Annual toggle, 409 → portal redirect, isLoggedIn-aware routing.

**Issues:**

- Annual plan pricing (`$290/yr`, `$990/yr`) is hardcoded in the component; not derived from Stripe prices.
- No per-month equivalent display or savings % on annual plans (e.g., "$24.17/mo, save 17%").
- `isCurrent` check in `PricingCard` is fragile (`plan.priceId.replace("_monthly", "_annual")`).
- `hasBillingProfile` check in `handleSelect` has a stub comment (`// Let's try creating checkout first...`) and effectively does nothing — the 409 path handles it reactively.
- Free plan CTA shows "Current Plan" for all users even if logged out.

### `PricingPage`

**Strengths:** Server Component, fetches current plan and billing profile status, passes to `PricingTable`.

**Issues:** No "Start Free Trial" label on paid plan CTAs for logged-out users — button label is left to `PricingPlan.actionLabel` which says "Upgrade to Pro" even for first-time visitors.

### `UpgradeModal`

**Strengths:** Zustand store, context-aware labels, feature-specific CTA.

**Issues:** CTA is a `<Link>` to `/pricing` — navigates away from current page. Phase 2.6 spec suggests opening checkout directly from the modal.

### `TrialBanner`

**Strengths:** `useSyncExternalStore` for SSR-safe sessionStorage, urgency colors at ≤3 days, expired state.

**Issues:**

- Condition `plan === "free" && !!trialEndsAt` means it only fires for the **inferred** free trial. Users who subscribed via Stripe (who have `plan = "pro_monthly"` even while `status = "trialing"`) will see no trial banner.
- The inferred trial (from `require-plan.ts`) and the Stripe trial are separate concepts but are not clearly differentiated in the UI.

### `PlanUsage` / `ManageSubscriptionButton`

**Strengths:** Functional, fetches live data, handles portal errors gracefully.

**Issues:**

- `PlanUsage` shows only usage bars — no subscription details (next billing date, status, cancel date).
- Settings page has no section for: trial end countdown, next billing date, cancelAtPeriodEnd banner ("cancels on [date]"), past_due warning + update payment button.

### `BlurredOverlay`

Clean implementation, no issues.

---

## 5. Plan Enforcement

### How it works

`require-plan.ts` provides 15+ async gate functions. Each:

1. Calls `getPlanContext(userId)` — fetches `plan`, `trialEndsAt`, computes `isTrialActive`.
2. If `isTrialActive` → allows unconditionally (all features unlocked during inferred trial).
3. Checks the relevant limit from `PLAN_LIMITS`.
4. On failure → returns `PlanGateFailure` with `error`, `feature`, `message`, `suggestedPlan`, `remaining`, `resetAt`.

### 402 response shape

```json
{
  "error": "upgrade_required | quota_exceeded",
  "code": "upgrade_required | quota_exceeded",
  "feature": "ai_quota",
  "message": "...",
  "plan": "free",
  "limit": 20,
  "used": 21,
  "remaining": 0,
  "upgrade_url": "/pricing",
  "suggested_plan": "pro_monthly",
  "trial_active": false,
  "reset_at": "2026-04-01T00:00:00.000Z"
}
```

### Trial logic

Two separate trial concepts exist:

| Type                     | Source                                                                | Behaviour                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Inferred free trial**  | `require-plan.ts` — derives from `createdAt + 14d`                    | All new free users get 14 days of unlimited access to gated features. Plan stays "free". Trial banner shows.                |
| **Stripe payment trial** | `subscription_data.trial_period_days` (NOT currently set in checkout) | Delays first payment by 14 days. Plan is immediately set to the subscribed tier by the webhook. Trial banner does NOT show. |

Currently only the inferred trial is active. The Stripe-level trial is not configured in `checkout/route.ts`.

---

## 6. Stripe Configuration (from MCP)

### Account

- **Account name:** Astravision (`acct_1RVGdRKrX43F2j4c`)
- **Note:** This is a shared Stripe account used by multiple unrelated projects.

### Products found

The following products exist — **none are for AstraPost**:

| Name                                | Product ID            | Type             |
| ----------------------------------- | --------------------- | ---------------- |
| Elite Plan - Monthly Subscription   | `prod_StzovGpM6bAJ9d` | Recurring $19/mo |
| Pro Plan - Monthly Subscription     | `prod_Stzo6YA1yv3vlt` | Recurring $9/mo  |
| Starter Plan - Monthly Subscription | `prod_StzoccIp8nrXNw` | Recurring $5/mo  |
| One Time Top-Up                     | `prod_StdcRygi5LgJ3f` | One-time         |
| Glossa Pro                          | `prod_SUsXZEU1tj0Dzf` | Recurring $12/mo |
| (various image generation products) | —                     | —                |

> **CRITICAL:** There are NO Stripe products or prices for AstraPost's Pro/Agency plans. The env vars `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL`, `STRIPE_PRICE_ID_AGENCY_MONTHLY`, `STRIPE_PRICE_ID_AGENCY_ANNUAL` are unset, which means `checkout/route.ts` falls back to mock IDs (`price_pro_monthly_mock`) — Stripe will reject these.

### Prices

No AstraPost-specific recurring prices. All prices on the account belong to unrelated products.

### Webhook endpoint

No webhook endpoint has been confirmed for AstraPost at `/api/billing/webhook`. Without this, no Stripe events will be received and the DB will never be updated after checkout.

### Customer portal

Unknown — not yet verified. Likely not configured for AstraPost plans.

---

## 7. Gaps & Issues Found

### Blockers (must fix before billing works at all)

| #   | Issue                                                                                                         | Severity     |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------ |
| B1  | No AstraPost products/prices in Stripe — `STRIPE_PRICE_ID_*` env vars unset — checkout falls back to mock IDs | **Critical** |
| B2  | No Stripe webhook endpoint registered — DB never updated after payment                                        | **Critical** |
| B3  | `checkout/route.ts` uses `customer_email` not `customer` — creates duplicate Stripe customers                 | **Critical** |
| B4  | No `subscription_data.trial_period_days` in checkout — Stripe-level trial never offered                       | **High**     |

### Code Quality Issues

| #   | Issue                                                                                           | Severity |
| --- | ----------------------------------------------------------------------------------------------- | -------- |
| Q1  | `handleCheckoutCompleted` — two separate DB writes without `db.transaction()`                   | High     |
| Q2  | `handleInvoicePaymentFailed` — two separate DB writes without `db.transaction()`                | High     |
| Q3  | `handleSubscriptionDeleted` — two separate DB writes without `db.transaction()`                 | High     |
| Q4  | `handleSubscriptionDeleted` — no cancellation email sent                                        | Medium   |
| Q5  | `checkout/route.ts` — uses raw `new Response()` instead of `ApiError`                           | Medium   |
| Q6  | `portal/route.ts` — uses `NextResponse.json` instead of `ApiError`                              | Low      |
| Q7  | No `src/lib/stripe.ts` singleton — checkout and portal each create new `Stripe()`               | Low      |
| Q8  | No `src/lib/billing-utils.ts` — `priceToPlan`/`planToPrice` helpers missing as standalone utils | Low      |
| Q9  | All Stripe env vars are `.optional()` in `env.ts` — no fail-fast at startup                     | Medium   |
| Q10 | Checkout `cancel_url` points to `/dashboard/settings` not `/pricing`                            | Low      |
| Q11 | Mock price ID fallback in checkout is silently broken in production                             | High     |

### Frontend / UX Gaps

| #   | Issue                                                                                                                                     | Severity |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| F1  | Settings page shows no subscription details: no trial end date, no next billing date, no cancelAtPeriodEnd indicator, no past_due warning | High     |
| F2  | `/api/billing/usage` returns usage stats but not subscription lifecycle status                                                            | High     |
| F3  | Trial banner only covers inferred trial — Stripe-trialing users (plan≠free) see nothing                                                   | Medium   |
| F4  | Pricing page has no "Start Free Trial" labeling for logged-out users                                                                      | Low      |
| F5  | Annual plan pricing is hardcoded, not derived from Stripe API                                                                             | Low      |
| F6  | `UpgradeModal` CTA navigates away to `/pricing` instead of triggering checkout                                                            | Low      |
| F7  | No post-checkout success polling — user may see stale plan data on success redirect                                                       | Medium   |
| F8  | No `allow_promotion_codes: true` in checkout                                                                                              | Low      |

---

## 8. Implementation Plan

Based on the audit, here is the prioritized implementation plan:

### Pre-Phase: Stripe Setup (must do before any code)

1. Create AstraPost products in Stripe: Pro Monthly, Pro Annual, Agency Monthly, Agency Annual.
2. Set the four `STRIPE_PRICE_ID_*` env vars in `.env.local` and Vercel dashboard.
3. Register the webhook endpoint in Stripe for `/api/billing/webhook` with required events.
4. Configure the Stripe Customer Portal (allow cancel, switch plan, update payment method).

### Phase 1 — Backend Fixes (Critical Path)

**Priority order:**

1. Create `src/lib/stripe.ts` singleton.
2. Create `src/lib/billing-utils.ts` with `priceToPlan` / `planToPrice`.
3. Fix `checkout/route.ts`: customer lookup/create, trial period, allow_promotion_codes, ApiError, remove mock fallbacks.
4. Wrap webhook multi-table writes in `db.transaction()` (Q1, Q2, Q3).
5. Add cancellation email to `handleSubscriptionDeleted` (Q4).
6. Create a billing status endpoint (`GET /api/billing/status`) returning subscription lifecycle data.
7. Harden `env.ts` — require Stripe vars (or warn loudly if missing).

### Phase 2 — Frontend Fixes

1. Add subscription status section to settings page (trial countdown, next billing date, cancelAtPeriodEnd, past_due warning).
2. Update `PlanUsage` or create `BillingStatus` component consuming the new status endpoint.
3. Add post-checkout polling or optimistic update on success redirect.
4. Update trial banner to also handle Stripe trialing status.
5. Add "Start Free Trial" CTA label for logged-out users on pricing page.

### Phase 3 — Lifecycle & Hardening

1. Verify cancellation flow works end-to-end via Stripe portal.
2. Test payment failure → grace period → recovery flow.
3. Test trial expiration (Stripe-level).
4. Add idempotency documentation for retry scenarios.
5. Add sync failsafe: on `/api/billing/status`, optionally reconcile with Stripe if last sync > 1 hour ago.
