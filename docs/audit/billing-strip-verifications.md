

# Stripe MCP Implementation Plan for AstraPost (Production)

## Overview

This plan instructs an LLM with Stripe MCP access to complete the remaining Stripe configuration for AstraPost's production environment. Products, prices, keys, and webhook secret are **already created and configured**. What remains is Customer Portal configuration, webhook event registration verification, and proration verification.

**Production URL:** `https://astrapost.vercel.app`

---

## Current State — Already Done

| Item | Status |
|---|---|
| `STRIPE_SECRET_KEY` | ✅ Set in `.env` (production `sk_live_*`) |
| `STRIPE_WEBHOOK_SECRET` | ✅ Set in `.env` (`whsec_*`) |
| AstraPost Pro product | ✅ Created (`prod_UDLVJC0QQ35iMC`) |
| AstraPost Pro Annual product | ✅ Created (`prod_UDLV9HcYRBM36k`) |
| AstraPost Agency Monthly product | ✅ Created (`prod_UDLVHs1ePIlrG5`) |
| AstraPost Agency Annual product | ✅ Created (`prod_UDLVSCcSpjBaNo`) |
| Pro Monthly — $29/mo | ✅ Price ID in `.env` (`STRIPE_PRICE_ID_MONTHLY`) |
| Pro Annual — $290/yr | ✅ Price ID in `.env` (`STRIPE_PRICE_ID_ANNUAL`) |
| Agency Monthly — $99/mo | ✅ Price ID in `.env` (`STRIPE_PRICE_ID_AGENCY_MONTHLY`) |
| Agency Annual — $990/yr | ✅ Price ID in `.env` (`STRIPE_PRICE_ID_AGENCY_ANNUAL`) |

---

## What Remains — 4 Steps

### Step 1: Verify Existing Products and Prices

**Goal:** Confirm all 4 prices are correctly configured before proceeding.

Use the Stripe MCP to retrieve each price and verify:

| Env Var | Expected Amount | Expected Currency | Expected Interval |
|---|---|---|---|
| `STRIPE_PRICE_ID_MONTHLY` | 2900 ($29.00) | `usd` | `month` |
| `STRIPE_PRICE_ID_ANNUAL` | 29000 ($290.00) | `usd` | `year` |
| `STRIPE_PRICE_ID_AGENCY_MONTHLY` | 9900 ($99.00) | `usd` | `month` |
| `STRIPE_PRICE_ID_AGENCY_ANNUAL` | 99000 ($990.00) | `usd` | `year` |

For each price, retrieve it using the Price ID from the `.env` file and confirm `unit_amount`, `currency`, and `recurring.interval` match. If any mismatch is found, **stop and report it** — do not auto-fix production prices.

---

### Step 2: Configure the Customer Portal

**Goal:** Set up the Stripe Customer Portal so users can manage billing but **cannot switch plans** directly (plan switching is handled in-app via AstraPost's custom confirmation dialog).

Use the Stripe MCP to create a Customer Portal configuration:

**Features to ENABLE:**

- **Payment method update:** `enabled: true` — customers can update their credit card
- **Invoice history:** `enabled: true` — customers can view and download past invoices
- **Subscription cancellation:** `enabled: true`, cancellation mode `at_period_end`, proration behavior `none` — subscription stays active until the current billing period ends

**Features to DISABLE:**

- **Subscription update / plan switching:** `enabled: false` — customers must NOT change plans through the portal. AstraPost handles upgrades and downgrades in-app.

**Portal branding and links:**

- **Business name:** `AstraPost`
- **Default return URL:** `https://astrapost.vercel.app/dashboard/settings`
- **Privacy policy URL:** `https://astrapost.vercel.app/legal/privacy`
- **Terms of service URL:** `https://astrapost.vercel.app/legal/terms`

After creating the configuration, confirm it is set as the default active portal configuration.

---

### Step 3: Verify the Webhook Endpoint

**Goal:** Confirm the webhook endpoint is correctly registered and receives all 4 required event types.

Use the Stripe MCP to list all webhook endpoints, then find the one pointing to:

```
https://astrapost.vercel.app/api/billing/webhook
```

Verify it is subscribed to **all 4 of these events:**

- `customer.subscription.updated` — handles plan changes, cancellation scheduling
- `customer.subscription.deleted` — handles full cancellation (user reverts to free plan)
- `invoice.payment_failed` — triggers grace period logic in the app
- `invoice.payment_succeeded` — clears `past_due` status in the app

**If the webhook exists but is missing events:** Update it to add the missing events.

**If the webhook URL is wrong** (e.g., pointing to `localhost` or a different domain): Update the URL to `https://astrapost.vercel.app/api/billing/webhook`.

**If no webhook endpoint exists at all:** Create one:

- **URL:** `https://astrapost.vercel.app/api/billing/webhook`
- **Enabled events:** the 4 listed above
- **Description:** `AstraPost production billing webhook — subscription lifecycle events`
- ⚠️ **Important:** If a new webhook is created, the signing secret will change. Output the new `whsec_*` value and instruct the user to update `STRIPE_WEBHOOK_SECRET` in the `.env` file and redeploy on Vercel.

---

### Step 4: Verify Proration Settings

**Goal:** Confirm Stripe's proration behavior is active at the account level.

The AstraPost codebase passes `proration_behavior: 'create_prorations'` when updating subscriptions (Stripe's default). If the Stripe MCP can check account-level subscription settings, verify proration is not disabled.

If the MCP cannot check this programmatically, output:

> **Manual verification needed:** Go to **Stripe Dashboard → Settings → Billing → Subscriptions** and confirm that "Proration" is not disabled. AstraPost relies on `create_prorations` behavior for mid-cycle plan changes (e.g., upgrading from Pro to Agency mid-month).

---

## Final Verification Checklist

After completing all steps, output this status report:

```
✅ Products: 4 verified (Pro Monthly, Pro Annual, Agency Monthly, Agency Annual)
✅ Prices: 4 verified
   - Pro Monthly:    $29.00/mo  (price_****)
   - Pro Annual:     $290.00/yr (price_****)
   - Agency Monthly: $99.00/mo  (price_****)
   - Agency Annual:  $990.00/yr (price_****)
✅ Customer Portal: configured
   - Payment method update: enabled
   - Invoice history: enabled
   - Subscription cancellation: enabled (at period end)
   - Plan switching: DISABLED (handled in-app)
   - Return URL: https://astrapost.vercel.app/dashboard/settings
   - Privacy policy: https://astrapost.vercel.app/legal/privacy
   - Terms of service: https://astrapost.vercel.app/legal/terms
✅ Webhook: verified at https://astrapost.vercel.app/api/billing/webhook
   - customer.subscription.updated: ✅
   - customer.subscription.deleted: ✅
   - invoice.payment_failed: ✅
   - invoice.payment_succeeded: ✅
✅ Environment variables: all 6 values present in .env
⚠️  Manual check: Verify proration is not disabled (Stripe Dashboard → Settings → Billing → Subscriptions)
⚠️  Manual check: Test full subscription flow manually in production
```

---

## Important Notes for the LLM

- **This is production.** Every Stripe MCP call hits live Stripe. Do not create test objects, do not delete or archive existing prices, and do not modify existing price amounts.
- **Read before writing.** Always retrieve and verify existing objects before creating new ones. The products and prices already exist — the main work is portal configuration and webhook verification.
- **If anything looks wrong, stop and ask.** If a price amount doesn't match expectations, a webhook points to an unexpected URL, or an existing portal config conflicts — report it to the user rather than overwriting.
- **The `.env` comments contain product IDs.** Each price's parent product is noted (e.g., `prod_UDLVJC0QQ35iMC`). Use these to cross-reference when verifying.
- **Webhook secret sensitivity.** If a new webhook must be created (Step 3), the user must update `STRIPE_WEBHOOK_SECRET` in their Vercel environment variables and trigger a redeployment. Emphasize this — a mismatched secret will silently reject all webhook events.

---------
as per the plan: c:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02\docs\audit\downgrade-cancellation-analysis-2026-04-06.md

What's Still Needed for Stripe:

Your Stripe Dashboard needs configuration:
Customer Portal settings (Stripe Dashboard → Settings → Customer portal):

Disable "Allow customers to switch plans" in the portal — since you now handle plan changes in-app with the confirmation dialog
Keep enabled: Update payment method, View invoices, Cancel subscription
Stripe Price IDs — Ensure all 4 env vars are set:

STRIPE_PRICE_ID_MONTHLY — Pro monthly price
STRIPE_PRICE_ID_ANNUAL — Pro annual price
STRIPE_PRICE_ID_AGENCY_MONTHLY — Agency monthly price
STRIPE_PRICE_ID_AGENCY_ANNUAL — Agency annual price
Webhook events — Ensure your Stripe webhook endpoint receives these events (most should already be configured):

customer.subscription.updated (handles plan changes, cancellation flags)
customer.subscription.deleted (handles full cancellation → free)
invoice.payment_failed (triggers grace period)
invoice.payment_succeeded (clears past_due status)
Proration behavior — The code uses create_prorations which is Stripe's default. No Stripe-side config needed, but verify in Stripe Dashboard → Settings → Subscriptions that "Proration" is not disabled.
---------------