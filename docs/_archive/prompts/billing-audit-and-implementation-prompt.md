# AstraPost — Billing System Audit & Full Implementation Prompt

> **Purpose:** Use this prompt with an LLM (Claude, etc.) to audit the existing billing code in AstraPost and implement a fully functioning, production-grade Stripe billing system. Paste this prompt along with your project's `README.md` and `CLAUDE.md` files. A Stripe MCP tool is connected and available for use — use it to inspect Stripe products, prices, webhooks, and customers directly during implementation.

---

## Context

You are working on **AstraPost**, an AI-powered social media scheduling platform. The project has a partially implemented Stripe billing system. Your job is to **audit what exists**, **identify gaps and bugs**, and **implement everything needed** for a fully functional billing flow — from the public pricing page through checkout, subscription lifecycle management, plan enforcement, and the in-app billing experience.

### Tech Stack (billing-relevant)

- **Framework:** Next.js 16 (App Router), React 19, TypeScript (strict mode)
- **Database:** PostgreSQL 18 with Drizzle ORM
- **Auth:** Better Auth (sessions via `auth.api.getSession()`)
- **UI:** shadcn/ui + Tailwind CSS 4 (dark mode supported)
- **Billing:** Stripe (using `stripe` npm package)
- **Forms:** React Hook Form + Zod
- **Email:** Resend + React Email
- **State:** Zustand

### Stripe Environment Variables (all available)

```
STRIPE_SECRET_KEY          — Stripe secret key (server-side only)
STRIPE_PUBLISHABLE_KEY     — Stripe publishable key (client-side, via NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
STRIPE_WEBHOOK_SECRET      — Stripe webhook signing secret
STRIPE_PRICE_ID_MONTHLY    — Stripe Price ID for Pro Monthly
STRIPE_PRICE_ID_ANNUAL     — Stripe Price ID for Pro Annual
STRIPE_PRICE_ID_AGENCY_MONTHLY  — Stripe Price ID for Agency Monthly
STRIPE_PRICE_ID_AGENCY_ANNUAL   — Stripe Price ID for Agency Annual
```

### Plan Tiers

| Plan           | Billing Cycle | Trial             |
| -------------- | ------------- | ----------------- |
| Free           | —             | —                 |
| Pro Monthly    | Monthly       | 14-day free trial |
| Pro Annual     | Annual        | 14-day free trial |
| Agency Monthly | Monthly       | 14-day free trial |
| Agency Annual  | Annual        | 14-day free trial |

### Stripe MCP Tool

A Stripe MCP tool is connected and available in this session. Use it to:

- Inspect existing Stripe products and prices to confirm they match the env var price IDs.
- Inspect webhook endpoint configuration to verify which events are being sent.
- Look up customer and subscription objects when debugging.
- Verify coupon/promotion code configuration if needed.

Use the Stripe MCP tool proactively during the audit phase to cross-reference what's in the code vs. what's actually configured in Stripe.

### Existing Billing-Related Files (known from project structure)

**API Routes:**

- `src/app/api/billing/` — Contains subdirectories for checkout, portal, webhooks, and usage endpoints.
- `src/app/api/billing/webhook/route.test.ts` — Existing webhook test file.

**Frontend:**

- `src/app/(marketing)/pricing/` or `src/app/pricing/` — Public pricing page.
- `src/components/billing/` — Contains `pricing-card.tsx` and `pricing-table.tsx`.
- `src/components/settings/` — Contains plan usage display components.
- `src/components/ui/upgrade-modal.tsx` — Upgrade prompt modal (shown when free users hit plan gates).
- `src/components/ui/trial-banner.tsx` — Trial countdown banner.
- `src/components/ui/blurred-overlay.tsx` — Overlay for gated features.

**Schema & Logic:**

- `src/lib/schema.ts` — Contains `subscriptions` table. The `user` table includes `plan`, `stripeCustomerId`, and trial-related fields.
- `src/lib/plan-limits.ts` — Defines plan-based feature limits.
- `src/lib/middleware/require-plan.ts` — 15+ plan gate functions using `makeFeatureGate()`. Returns HTTP 402 with `upgrade_url`, `suggested_plan`, `reset_at`, `remaining`. Handles 14-day trial automatically.
- `src/lib/env.ts` — Environment variable validation.

---

## Phase 0 — Audit (Do This First)

Before writing any new code, perform a thorough audit of every billing-related file. The goal is to create a complete picture of what exists, what works, what's broken, and what's missing.

### 0.1 — Read and Document Every Existing File

Read the following files (and any other billing-related files you discover) in their entirety:

1. **All files under `src/app/api/billing/`** — read every route.ts file and understand each endpoint (checkout, portal, webhook, usage, and anything else).
2. **`src/lib/schema.ts`** — find and document the `subscriptions` table schema, and all billing-related columns on the `user` table (`plan`, `stripeCustomerId`, `trialEndsAt`, etc.).
3. **`src/lib/plan-limits.ts`** — understand how plan tiers and limits are defined.
4. **`src/lib/middleware/require-plan.ts`** — understand how plan enforcement works, what 402 responses look like, and how trial logic is handled.
5. **`src/lib/env.ts`** — check which Stripe env vars are validated and how.
6. **`src/components/billing/pricing-card.tsx`** and **`src/components/billing/pricing-table.tsx`** — the pricing UI components.
7. **The public pricing page** — find it (could be at `src/app/pricing/page.tsx` or `src/app/(marketing)/pricing/page.tsx`) and understand what it renders.
8. **`src/components/ui/upgrade-modal.tsx`** — the upgrade prompt shown to free/gated users.
9. **`src/components/ui/trial-banner.tsx`** — the trial countdown banner.
10. **`src/components/settings/`** — find any plan-usage or subscription-display component.
11. **`src/app/api/billing/webhook/route.test.ts`** — the existing webhook test.

### 0.2 — Cross-Reference with Stripe (Use the MCP Tool)

Use the Stripe MCP tool to verify:

1. **Products:** Are there products defined in Stripe? What are their names and IDs?
2. **Prices:** Do the prices in Stripe match the price IDs in the environment variables? Confirm the billing interval (monthly/yearly) and amount for each.
3. **Webhook endpoint:** Is a webhook endpoint configured in Stripe? Which events is it listening for? Compare this against which events the webhook handler actually processes.
4. **Customer portal:** Is the Stripe customer portal configured? What can customers do there (cancel, switch plans, update payment)?
5. **Coupons/promotion codes:** Are there any existing coupons or promotion codes configured?

### 0.3 — Produce an Audit Report

After reading all the code and checking Stripe, create a document at `docs/features/billing-audit-report.md` with this structure:

```markdown
# Billing System Audit Report

## Date: [today]

## 1. Existing Files Inventory

[List every billing-related file with a 1-2 sentence summary of what it does]

## 2. Database Schema

[Document the exact columns of the `subscriptions` table and all billing-related columns on the `user` table]

## 3. API Routes

[For each billing API route: HTTP method, path, what it does, any issues found]

## 4. Frontend Components

[For each billing component: what it renders, what data it needs, any issues found]

## 5. Plan Enforcement

[How plan limits and gates work, what happens on 402, how trial logic works]

## 6. Stripe Configuration (from MCP)

[Products, prices, webhook events, portal config]

## 7. Gaps & Issues Found

[Specific list of what's missing, broken, or inconsistent]

## 8. Implementation Plan

[What needs to be built/fixed to make billing fully functional, organized by priority]
```

**Do not skip this audit.** The implementation phases below are based on common gaps in partially built billing systems. After the audit, adjust the implementation plan based on what you actually find — some items may already be implemented and working, others may need fixes rather than new code.

---

## Phase 1 — Core Stripe Integration (Backend)

**Goal:** Ensure the foundational server-side Stripe integration is solid and complete.

### 1.1 — Stripe Client Singleton

Verify or create a Stripe client singleton at `src/lib/stripe.ts`:

```
- Initialize the Stripe SDK with STRIPE_SECRET_KEY.
- Export a single `stripe` instance for use across all API routes.
- Include the API version explicitly (use the latest stable version).
- Include app info metadata: { name: "AstraPost", version: "1.0.0" }.
- This file must NOT be imported in any client component.
```

### 1.2 — Checkout Session Creation

Verify or implement `POST /api/billing/checkout`:

```
- Accept: { priceId: string, plan: string } in the request body.
- Validate priceId is one of the four known price IDs from env vars (reject unknown IDs).
- Look up or create the Stripe customer:
  - If the user already has a stripeCustomerId on their user record, use it.
  - If not, create a new Stripe customer with the user's email and name, then save the stripeCustomerId to the user table.
- Create a Stripe Checkout Session with:
  - mode: "subscription"
  - customer: the Stripe customer ID
  - line_items: [{ price: priceId, quantity: 1 }]
  - subscription_data.trial_period_days: 14 (only if the user has never had a trial before — check the user record)
  - success_url: "{APP_URL}/dashboard/settings?billing=success"
  - cancel_url: "{APP_URL}/pricing?billing=cancelled"
  - metadata: { userId: user.id, plan: plan }
  - allow_promotion_codes: true (lets Stripe-native promo codes work at checkout)
- Return the checkout session URL.
- Use ApiError for all error responses.
```

### 1.3 — Stripe Customer Portal

Verify or implement `POST /api/billing/portal`:

```
- Authenticate the user (session required).
- Look up the user's stripeCustomerId. If none exists, return ApiError.badRequest("No billing account found").
- Create a Stripe Billing Portal session with:
  - customer: stripeCustomerId
  - return_url: "{APP_URL}/dashboard/settings"
- Return the portal URL.
- The portal allows: cancel subscription, switch plan, update payment method, view invoices.
```

### 1.4 — Webhook Handler (Critical)

This is the most important part of billing. Verify or implement `POST /api/billing/webhook`:

```
The webhook handler must:

1. Verify the Stripe signature using STRIPE_WEBHOOK_SECRET. Reject invalid signatures with 400.
2. Parse the raw request body (NOT JSON-parsed — Stripe needs the raw body for signature verification).
3. Handle these events at minimum:

   checkout.session.completed
   ─────────────────────────
   - Extract the subscription ID from the session.
   - Extract userId and plan from session.metadata.
   - Retrieve the full subscription object from Stripe.
   - Upsert the subscriptions table with:
     stripeSubscriptionId, stripeCustomerId, stripePriceId, plan,
     status: subscription.status, currentPeriodStart, currentPeriodEnd,
     cancelAtPeriodEnd: false, userId
   - Update the user table: set plan to the purchased plan, set stripeCustomerId.
   - If this is a trial subscription, set trialEndsAt on the user record.

   customer.subscription.updated
   ──────────────────────────────
   - Handles: plan upgrades/downgrades, trial ending, renewal, payment method changes.
   - Retrieve the subscription object.
   - Find the subscription record in the DB by stripeSubscriptionId.
   - Update: status, stripePriceId, plan (map price ID back to plan name),
     currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd.
   - Update the user's plan column to match the new plan.
   - If status changed to "past_due" or "unpaid", consider downgrading the user to free.

   customer.subscription.deleted
   ─────────────────────────────
   - Subscription has been fully cancelled (end of billing period or immediate).
   - Update the subscription record: status = "canceled".
   - Update the user's plan to "free".
   - Optionally send a cancellation email via Resend.

   invoice.payment_succeeded
   ─────────────────────────
   - Confirms successful recurring payment.
   - Update the subscription record's currentPeriodStart and currentPeriodEnd from the invoice's period.
   - Ensure the user's plan is still active (in case it was temporarily in past_due).

   invoice.payment_failed
   ──────────────────────
   - Payment attempt failed (card declined, insufficient funds, etc.).
   - Update the subscription status to reflect the failure.
   - Send a "payment failed" email to the user via Resend with a link to update their payment method (Stripe portal URL).
   - Optionally: after N failed attempts (check Stripe's subscription status), downgrade to free.

4. Return 200 for successfully processed events.
5. Return 200 for events you don't handle (don't return errors for unknown events — Stripe will retry).
6. All database operations inside the webhook must use db.transaction() when touching multiple tables.
7. Make the webhook handler idempotent — processing the same event twice must not cause duplicate records or incorrect state.
```

### 1.5 — Price-to-Plan Mapping Helper

Create a utility function (in `src/lib/stripe.ts` or `src/lib/billing-utils.ts`):

```
export function priceToPlan(priceId: string): string
- Maps a Stripe Price ID to the internal plan name.
- STRIPE_PRICE_ID_MONTHLY → "pro-monthly"
- STRIPE_PRICE_ID_ANNUAL → "pro-annual"
- STRIPE_PRICE_ID_AGENCY_MONTHLY → "agency-monthly"
- STRIPE_PRICE_ID_AGENCY_ANNUAL → "agency-annual"
- Unknown price IDs → "free"

export function planToPrice(plan: string): string | null
- Reverse mapping: plan name → Stripe Price ID.
- Returns null for "free" plan.
```

### 1.6 — Subscription Status Endpoint

Verify or implement `GET /api/billing/usage` (or `/api/billing/status`):

```
- Authenticate the user.
- Return the user's current billing status:
  {
    plan: string,
    status: "active" | "trialing" | "past_due" | "canceled" | "free",
    trialEndsAt: string | null,
    currentPeriodEnd: string | null,
    cancelAtPeriodEnd: boolean,
    stripeCustomerId: string | null
  }
- This endpoint is consumed by the frontend settings page and the upgrade modal.
```

---

## Phase 2 — Frontend Billing Experience

**Goal:** Ensure every user-facing billing touchpoint works end-to-end.

### 2.1 — Public Pricing Page

Verify or fix the pricing page (find it — likely `src/app/pricing/page.tsx` or under `(marketing)/pricing/`):

```
- Display all plan tiers: Free, Pro Monthly, Pro Annual, Agency Monthly, Agency Annual.
- Each plan card shows: price, billing cycle, feature list, CTA button.
- Annual plans should display the per-month equivalent price and savings percentage vs. monthly.
- CTA buttons:
  - Free: "Get Started" → links to /register
  - Paid plans (user not logged in): "Start Free Trial" → links to /register (after registration, the checkout flow should be accessible)
  - Paid plans (user logged in, on free plan): "Start Free Trial" or "Upgrade" → calls the checkout API to create a session and redirects to Stripe Checkout
  - Paid plans (user logged in, on that plan): "Current Plan" (disabled)
  - Paid plans (user logged in, on a different paid plan): "Switch Plan" → calls checkout API or Stripe portal
- Highlight the recommended plan (Pro Annual or whichever you choose).
- Mobile responsive: stack cards vertically on small screens.
- Support dark mode.
```

### 2.2 — Checkout Flow (Client-Side)

Verify or implement the client-side checkout trigger:

```
- When a user clicks an upgrade/subscribe button, the client calls POST /api/billing/checkout with the selected priceId.
- The API returns a checkout session URL.
- The client redirects the user to the Stripe Checkout URL using window.location.href (NOT Stripe.js embedded checkout — server-side session redirect is simpler and recommended).
- After successful checkout, Stripe redirects to the success_url with a ?billing=success query param.
- The success page (or settings page) should detect this param, show a success toast/message, and refresh the user's plan data.
- After cancelled checkout, Stripe redirects to the cancel_url. Show a message like "Checkout was cancelled. You can try again anytime."
```

### 2.3 — Post-Checkout Success Handling

```
- On the success redirect page (e.g., /dashboard/settings?billing=success):
  - Show a success toast: "Welcome to [Plan Name]! Your subscription is now active."
  - Refresh/refetch the user's session or plan data so the UI immediately reflects the new plan.
  - Clear the ?billing=success param from the URL after showing the toast.
- Important: The webhook may not have fired by the time the user hits the success URL. The page should either poll for the updated plan or show a "Processing your subscription..." state and retry after a few seconds.
```

### 2.4 — Settings Billing Section

Verify or implement the billing section in the user settings page (`/dashboard/settings`):

```
- Show current plan name and status (active, trialing, past_due, canceled, free).
- If trialing: show trial end date and days remaining with a countdown.
- If active paid plan: show next billing date (currentPeriodEnd) and billing cycle.
- If cancelAtPeriodEnd is true: show "Your plan will be cancelled on [date]. You'll keep access until then."
- If past_due: show a warning banner with a "Update Payment Method" button that opens the Stripe portal.
- If canceled or free: show an "Upgrade" button that links to the pricing page.
- "Manage Subscription" button: calls POST /api/billing/portal to get a Stripe portal session URL, then redirects. This lets users: change payment method, view invoices, cancel subscription, switch plans.
- Invoice history: Either link to the Stripe portal (which shows invoices) or fetch the last 10 invoices via the Stripe API and display them in-app with download links.
```

### 2.5 — Trial Banner

Verify or fix `src/components/ui/trial-banner.tsx`:

```
- Shows at the top of the dashboard layout when the user is on a trial.
- Displays: "You have X days left in your free trial. Upgrade now to keep your features."
- "Upgrade" button links to the pricing page.
- When trial has < 3 days remaining, increase visual urgency (e.g., warning color).
- When trial has expired (trialEndsAt is in the past but user hasn't subscribed), show: "Your trial has ended. Upgrade to continue using [Plan] features." and downgrade their access to free.
- Hide the banner for users on paid plans (status: active) or on the free plan (never trialed).
```

### 2.6 — Upgrade Modal / Blurred Overlay

Verify or fix `src/components/ui/upgrade-modal.tsx` and `src/components/ui/blurred-overlay.tsx`:

```
- When a free user (or expired trial user) tries to access a gated feature, the plan gate returns 402.
- The frontend should catch this 402 and show the upgrade modal.
- The modal shows: which feature they tried to use, what plan unlocks it (from the 402 response's suggested_plan), pricing, and a CTA to upgrade.
- The blurred overlay is used on pages where the feature is visible but locked — the content is rendered but blurred with the upgrade prompt on top.
- Ensure the 402 response from require-plan.ts is properly consumed by all relevant frontend API calls.
```

### 2.7 — Plan-Specific UI Throughout the App

```
- Sidebar: Features gated by plan should show a subtle badge or lock icon for free users. Examples: AI Content Calendar (Pro), Competitor Analyzer (Pro), Team Collaboration (Agency).
- Composer: If a free user tries to use a Pro feature (e.g., AI Image Generation beyond their quota), catch the 402 and show the upgrade modal.
- Settings: The plan usage section should show current usage vs. limits (e.g., "3/5 AI generations used this month").
```

---

## Phase 3 — Subscription Lifecycle Handling

**Goal:** Handle all real-world subscription scenarios gracefully.

### 3.1 — Trial Expiration

```
- The 14-day trial is set via subscription_data.trial_period_days in the checkout session.
- Stripe sends `customer.subscription.updated` when the trial ends and the first payment is attempted.
- If the payment succeeds: the subscription transitions to "active". Update the user's plan in the DB.
- If the payment fails (no valid card was added during trial): the subscription transitions to "past_due" or "incomplete_expired".
- Implement logic to detect expired trials: if subscription.status is "past_due" or "incomplete_expired" and the trial has ended, downgrade the user to free.
- The trial-ended user should see the trial-expired banner (Phase 2.5) and be blocked from gated features.
```

### 3.2 — Plan Upgrades and Downgrades

```
- Upgrades (e.g., Pro → Agency): handled via Stripe Checkout (create a new checkout session) or Stripe Customer Portal. Stripe prorates by default.
- Downgrades (e.g., Agency → Pro): best handled via the Stripe Customer Portal where proration is managed automatically.
- The webhook handler (customer.subscription.updated) must detect the new price ID and update the plan accordingly using the priceToPlan() helper.
- Annual ↔ Monthly switches: also handled through the portal. The webhook handler treats these the same — read the new price ID and update.
```

### 3.3 — Cancellation

```
- Users cancel via the Stripe Customer Portal.
- By default, configure cancellation to happen at the end of the billing period (cancel_at_period_end = true).
- When Stripe sends customer.subscription.updated with cancel_at_period_end: true:
  - Update the subscription record to reflect cancelAtPeriodEnd = true.
  - The user keeps full access until currentPeriodEnd.
  - Show a banner: "Your subscription will end on [date]."
- When Stripe sends customer.subscription.deleted at the end of the period:
  - Update the user's plan to "free".
  - Send a cancellation email.
```

### 3.4 — Payment Failures and Dunning

```
- When invoice.payment_failed fires:
  - Update subscription status to reflect the failure.
  - Send an email: "Your payment failed. Please update your payment method to avoid losing access."
  - Include a link to the Stripe Customer Portal for payment method update.
- Stripe's built-in Smart Retries will attempt the payment again (configurable in Stripe settings).
- After all retries are exhausted and the subscription is canceled by Stripe:
  - The customer.subscription.deleted event fires.
  - Downgrade to free.
```

### 3.5 — Reactivation

```
- A user who cancelled (at period end) but hasn't reached the end date yet can reactivate via the Stripe Portal.
- Stripe sends customer.subscription.updated with cancel_at_period_end: false.
- Update the subscription record and remove any cancellation banners.
- A user who is fully cancelled (past the period end) must start a new checkout session to resubscribe.
```

---

## Phase 4 — Hardening & Edge Cases

**Goal:** Production-grade reliability and security.

### 4.1 — Webhook Security

```
- MUST verify the Stripe-Signature header using constructEvent() with the raw body.
- NEVER parse the body as JSON before verifying the signature.
- In Next.js App Router, read the raw body using: const body = await request.text()
- Return 400 for invalid signatures.
- Return 200 for all valid events, even ones you don't process (to avoid Stripe retries).
```

### 4.2 — Idempotency

```
- Stripe may send the same webhook event multiple times.
- Guard against duplicate processing by:
  - Checking if the subscription record already exists before inserting (upsert pattern).
  - Using the event ID: store processed event IDs in the DB or in Redis with a short TTL (24h) and skip already-processed events.
  - Using db.transaction() so partial updates don't leave the DB in an inconsistent state.
```

### 4.3 — Race Conditions: Webhook vs. Success Redirect

```
- The user may land on the success URL before the webhook fires.
- Options (implement one):
  A) Poll: The success page polls GET /api/billing/usage every 2 seconds for up to 30 seconds until the plan updates.
  B) Optimistic: On the success page, call Stripe directly (server-side) to fetch the checkout session and subscription status, update the DB immediately, then render the updated state.
  C) Accept delay: Show "Your subscription is being processed..." and tell the user to refresh in a moment.
- Option A or B is recommended.
```

### 4.4 — Environment Variable Validation

```
- In src/lib/env.ts, ensure ALL Stripe env vars are validated:
  - STRIPE_SECRET_KEY (required)
  - STRIPE_WEBHOOK_SECRET (required)
  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (required if using Stripe.js on client — may not be needed if using server-side checkout redirect)
  - STRIPE_PRICE_ID_MONTHLY (required)
  - STRIPE_PRICE_ID_ANNUAL (required)
  - STRIPE_PRICE_ID_AGENCY_MONTHLY (required)
  - STRIPE_PRICE_ID_AGENCY_ANNUAL (required)
- Fail fast at startup if any required billing env var is missing.
```

### 4.5 — Sync Failsafe: Stripe → Database

```
- In case the DB and Stripe get out of sync (missed webhook, server outage), implement a sync check:
  - When a user hits GET /api/billing/usage (or on login), if they have a stripeCustomerId, optionally fetch their latest subscription from Stripe and reconcile with the DB.
  - This is a safety net, not the primary mechanism. The webhook should be the source of truth 99% of the time.
  - Keep this lightweight — don't call Stripe on every page load. Cache the check for 1 hour per user.
```

### 4.6 — Stripe Webhook Event Registration

```
Verify (using the Stripe MCP tool or Stripe dashboard) that the webhook endpoint is registered to receive at minimum:
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed
- invoice.finalized (optional — for invoice history)

The webhook URL should be: https://[your-domain]/api/billing/webhook
For local development: use Stripe CLI to forward events (stripe listen --forward-to localhost:3000/api/billing/webhook).
```

---

## Technical Constraints & Conventions

Follow these project conventions — see `CLAUDE.md` for full details:

1. **API errors:** Always use `ApiError` from `@/lib/api/errors`. Never inline `new Response(JSON.stringify(...))`.
2. **Transactions:** Multi-table writes must use `db.transaction()`.
3. **Plan gates:** Use `require-plan.ts` helpers. Never call `getPlanLimits()` directly in route handlers.
4. **Validation:** Use Zod for all API input validation.
5. **Server Components by default.** Only `"use client"` when needed.
6. **Styling:** shadcn/ui + Tailwind CSS. Support dark mode.
7. **Toasts:** Use `sonner` for success/error notifications.
8. **Email:** Use `Resend` + `React Email` (existing patterns in `src/lib/services/email.ts` and `src/components/email/`).
9. **Testing:** Run `pnpm lint && pnpm typecheck` after every batch of changes.
10. **No standalone Stripe.js on the client** unless absolutely needed. The server-side Checkout Session redirect pattern (create session on server → redirect to Stripe-hosted page) is preferred over embedding Stripe Elements.

---

## Implementation Plan Summary

| Phase       | Focus     | Key Deliverables                                                                                                             |
| ----------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Phase 0** | Audit     | Read every existing billing file, cross-reference with Stripe MCP, produce `billing-audit-report.md`                         |
| **Phase 1** | Backend   | Stripe singleton, checkout session, portal, complete webhook handler (6 events), price↔plan mapping, billing status endpoint |
| **Phase 2** | Frontend  | Pricing page, checkout flow, success handling, settings billing section, trial banner, upgrade modal, plan badges            |
| **Phase 3** | Lifecycle | Trial expiration, upgrades/downgrades, cancellation, payment failures, reactivation                                          |
| **Phase 4** | Hardening | Webhook security, idempotency, race condition handling, env validation, Stripe↔DB sync failsafe                              |

---

## Progress Tracking

At the start of implementation, create `docs/features/billing-implementation-progress.md`:

```markdown
# Billing System — Implementation Progress

## Status: In Progress

## Phase 0 — Audit

- **Status:** Not Started
- **Audit Report:** [link to billing-audit-report.md once created]
- **Key Findings:**

## Phase 1 — Core Stripe Integration (Backend)

- **Status:** Not Started
- **Files Created:**
- **Files Modified:**
- **Decisions & Notes:**

## Phase 2 — Frontend Billing Experience

- **Status:** Not Started
- **Files Created:**
- **Files Modified:**
- **Decisions & Notes:**

## Phase 3 — Subscription Lifecycle Handling

- **Status:** Not Started
- **Files Created:**
- **Files Modified:**
- **Decisions & Notes:**

## Phase 4 — Hardening & Edge Cases

- **Status:** Not Started
- **Files Created:**
- **Files Modified:**
- **Decisions & Notes:**

## Changelog

| Date | Phase | Change |
| ---- | ----- | ------ |

## Testing Checklist

- [ ] Checkout: Free → Pro Monthly works end-to-end
- [ ] Checkout: Free → Pro Annual works end-to-end
- [ ] Checkout: Free → Agency Monthly works end-to-end
- [ ] Checkout: Free → Agency Annual works end-to-end
- [ ] Trial: 14-day trial starts on first subscription
- [ ] Trial: No trial on second subscription (user already used trial)
- [ ] Webhook: checkout.session.completed updates DB correctly
- [ ] Webhook: customer.subscription.updated handles plan change
- [ ] Webhook: customer.subscription.deleted downgrades to free
- [ ] Webhook: invoice.payment_failed sends email notification
- [ ] Webhook: duplicate events are handled idempotently
- [ ] Portal: "Manage Subscription" opens Stripe portal
- [ ] Portal: Cancel at period end works, user keeps access until end date
- [ ] Portal: Reactivation before period end works
- [ ] UI: Trial banner shows correct countdown
- [ ] UI: Trial expired banner shows for expired trials
- [ ] UI: Upgrade modal appears on 402 responses
- [ ] UI: Settings billing section shows correct plan info
- [ ] UI: Success redirect shows confirmation and updated plan
- [ ] UI: Pricing page CTAs change based on user state
- [ ] Security: Invalid webhook signatures are rejected
- [ ] Security: Raw body is used for signature verification (not JSON-parsed)
- [ ] Env: All Stripe env vars are validated at startup
- [ ] Lint & typecheck pass: pnpm lint && pnpm typecheck
```

Update this document after each phase is completed. Mark testing checklist items as they are verified.

---

## What NOT To Do

- **Do not embed Stripe Elements or Stripe.js payment forms.** Use Stripe Checkout (server-side session redirect). It's simpler, PCI-compliant out of the box, and handles all payment method types automatically.
- **Do not store credit card details anywhere in your database.** Stripe handles all payment data.
- **Do not build a custom invoice system.** Stripe generates invoices automatically. Either link to the Stripe portal or fetch invoices from the Stripe API for display.
- **Do not handle proration logic manually.** Let Stripe handle proration for plan changes via the portal or checkout.
- **Do not create separate Stripe products/prices from code.** Products and prices should be created in the Stripe dashboard (or via the MCP tool) and referenced via environment variables.
- **Do not parse the webhook body as JSON before verifying the signature.** This is the #1 webhook bug. Always use the raw body string.
- **Do not ignore webhook idempotency.** Stripe retries failed webhook deliveries. Processing the same event twice can cause duplicate records or incorrect state.
- **Do not hardcode Stripe price IDs in the code.** Always read them from environment variables.
- **Do not show billing-related errors to users as raw API responses.** Map Stripe errors to friendly user-facing messages.

---

## Deliverables Checklist

When all phases are complete, the following should exist and work:

- [ ] `docs/features/billing-audit-report.md` — complete audit findings
- [ ] `src/lib/stripe.ts` — Stripe client singleton
- [ ] `src/lib/billing-utils.ts` (or in stripe.ts) — priceToPlan / planToPrice helpers
- [ ] `POST /api/billing/checkout` — creates Stripe Checkout session
- [ ] `POST /api/billing/portal` — creates Stripe Portal session
- [ ] `POST /api/billing/webhook` — handles 6 Stripe events correctly
- [ ] `GET /api/billing/usage` — returns current billing status
- [ ] Public pricing page — responsive, plan-aware CTAs, dark mode
- [ ] Settings billing section — plan info, manage button, invoice link
- [ ] Trial banner — countdown, expiry warning, expired state
- [ ] Upgrade modal — triggered on 402, shows relevant plan
- [ ] Checkout success handling — toast, plan data refresh
- [ ] Payment failure email — sent via Resend on invoice.payment_failed
- [ ] Cancellation email — sent via Resend on subscription.deleted
- [ ] Webhook idempotency — duplicate events handled safely
- [ ] Env validation — all Stripe vars validated in env.ts
- [ ] All existing plan gates (require-plan.ts) work with real subscription data
- [ ] Progress document fully updated
- [ ] Testing checklist completed
- [ ] `pnpm lint && pnpm typecheck` passes cleanly
