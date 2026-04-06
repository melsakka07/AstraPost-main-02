# Billing & Pricing UI Fix — Implementation Plan

> **Date**: 2026-04-06
> **Scope**: Frontend only (2 files) — no backend, DB, or Stripe changes needed
> **Files**:
> - `src/components/billing/pricing-card.tsx`
> - `src/components/billing/pricing-table.tsx`

---

## Background

A user on `pro_monthly` visiting `/pricing` sees **both** Free and Pro cards labeled "Current Plan". Agency users never see their plan highlighted. Downgrade and billing-cycle switch paths are broken or missing.

**Root cause**: The pricing UI compares `currentPlan` (from DB) against card `priceId` values using simple string equality, but DB plan values don't always match card priceIds:

| DB `user.plan` values | Card `priceId` values |
|---|---|
| `free` | `free` |
| `pro_monthly` | `pro_monthly`, `pro_annual` |
| `pro_annual` | `pro_monthly`, `pro_annual` |
| `agency` | `agency_monthly`, `agency_annual` |

---

## Bug 1: Free Card Always Shows "Current Plan"

**Location**: `pricing-table.tsx` lines 17 and 49

**Problem**: The Free plan's `actionLabel` is hardcoded to `"Current Plan"`. The button renders `{isCurrent ? "Current Plan" : plan.actionLabel}`, so even when `isCurrent` is `false` (user is on a paid plan), the Free card still shows "Current Plan" because the fallback `actionLabel` is literally that string.

**Fix**: Change Free plan `actionLabel` from `"Current Plan"` to `"Get Started"` in both `MONTHLY_PLANS` and `ANNUAL_PLANS` arrays.

---

## Bug 2: Agency Plan Never Matches as Current

**Location**: `pricing-card.tsx` line 30

**Problem**: DB stores `"agency"` for all agency users (both monthly and annual — see `priceToPlan()` in `billing-utils.ts`). But card priceIds are `"agency_monthly"` and `"agency_annual"`. The comparison `"agency" === "agency_monthly"` is always `false`, so agency users never see their plan highlighted.

**Fix**: Add a `extractTier()` helper that strips `_(monthly|annual)` suffix, then compare tiers instead of exact strings. `extractTier("agency") === extractTier("agency_monthly")` → `"agency" === "agency"` → `true`.

---

## Bug 3: Cross-Billing-Cycle Not Handled

**Location**: `pricing-card.tsx` line 30

**Problem**: A `pro_monthly` user viewing the annual tab sees no plan as current. The existing second check `isAnnual && currentPlan === plan.priceId.replace("_monthly", "_annual")` fails because the annual card's `priceId` is already `"pro_annual"` — there's no `"_monthly"` substring to replace.

**Fix**: Use the same `extractTier()` approach. If `extractTier(currentPlan) === extractTier(plan.priceId)` but they're not an exact match, the user is on the same tier but a different billing cycle. Show "Switch to Annual" or "Switch to Monthly" instead of "Current Plan".

---

## Bug 4: No Downgrade Path in UI

**Location**: `pricing-table.tsx` line 99

**Problem**: `handleSelect` returns early when `priceId === "free"`, so paid users clicking the Free card get no response. There's no way to downgrade or cancel from the pricing page.

**Fix**: When a paid user clicks any plan card (including Free), redirect them to the Stripe billing portal. The portal handles cancellations, upgrades, and downgrades. Show a toast like "Redirecting to billing portal to manage subscription..." before redirecting.

---

## Bug 5: Unnecessary Checkout → 409 → Portal Round-Trip

**Location**: `pricing-table.tsx` lines 104-126

**Problem**: When a paid user clicks a different paid plan, the UI first calls `/api/billing/checkout`, gets a 409 `existing_subscription` error, then falls back to calling `/api/billing/portal`. This is an unnecessary extra API call and creates a jarring UX with a brief error state.

**Fix**: Check `currentPlan` on the client before making any API call. If `currentPlan !== "free"`, skip checkout entirely and go straight to the portal endpoint. This removes one wasted network round-trip and provides instant feedback.

---

## Bug 6: "Save ~20%" Should Be "Save 17%"

**Location**: `pricing-table.tsx` line 152

**Problem**: The annual toggle label says "Save ~20%" but the actual savings is 17% ($290/year vs $348/year for Pro, $990/year vs $1188/year for Agency).

**Fix**: Change `(Save ~20%)` to `(Save 17%)`.

---

## Implementation Details

### New Helpers (add to `pricing-card.tsx`)

```
TIER_ORDER = { free: 0, pro: 1, agency: 2 }
extractTier(plan) → strips _(monthly|annual) suffix
getTierRank(plan) → returns numeric tier rank
```

### Button Label Logic

Replace the single `isCurrent` boolean with tier-aware logic:

| User's DB Plan | Card priceId | Tab | Button Label | Disabled? | Click Action |
|---|---|---|---|---|---|
| `free` | `free` | any | Get Started | Yes | — |
| `free` | `pro_monthly` | monthly | Upgrade to Pro | No | Checkout |
| `free` | `pro_annual` | annual | Upgrade to Pro | No | Checkout |
| `free` | `agency_monthly` | monthly | Upgrade to Agency | No | Checkout |
| `free` | `agency_annual` | annual | Upgrade to Agency | No | Checkout |
| `pro_monthly` | `free` | any | Downgrade | No | Portal |
| `pro_monthly` | `pro_monthly` | monthly | Current Plan | Yes | — |
| `pro_monthly` | `pro_annual` | annual | Switch to Annual | No | Portal |
| `pro_monthly` | `agency_monthly` | monthly | Upgrade to Agency | No | Portal |
| `pro_monthly` | `agency_annual` | annual | Upgrade to Agency | No | Portal |
| `pro_annual` | `free` | any | Downgrade | No | Portal |
| `pro_annual` | `pro_monthly` | monthly | Switch to Monthly | No | Portal |
| `pro_annual` | `pro_annual` | annual | Current Plan | Yes | — |
| `pro_annual` | `agency_monthly` | monthly | Upgrade to Agency | No | Portal |
| `pro_annual` | `agency_annual` | annual | Upgrade to Agency | No | Portal |
| `agency` | `free` | any | Downgrade | No | Portal |
| `agency` | `pro_monthly` | monthly | Downgrade | No | Portal |
| `agency` | `pro_annual` | annual | Downgrade | No | Portal |
| `agency` | `agency_monthly` | monthly | Manage Plan | No | Portal |
| `agency` | `agency_annual` | annual | Manage Plan | No | Portal |

> **Note on Agency**: DB stores `"agency"` without cycle suffix, so we can't determine if the user is on monthly or annual. Both agency cards show "Manage Plan" and link to the portal where the user can see their exact billing cycle.

### `handleSelect` Rewrite

```
if not logged in → redirect to /register?plan={priceId}
if currentPlan is paid (not "free") → go to Stripe portal directly
if priceId is "free" → no-op (button should be disabled anyway)
else → create checkout session via /api/billing/checkout
```

---

## Verification Checklist

- [ ] `pnpm lint && pnpm typecheck` passes
- [ ] Free user: Free card shows "Get Started" (disabled), Pro/Agency show "Upgrade to ..."
- [ ] Pro monthly user, monthly tab: Free="Downgrade", Pro="Current Plan" (disabled), Agency="Upgrade to Agency"
- [ ] Pro monthly user, annual tab: Free="Downgrade", Pro="Switch to Annual", Agency="Upgrade to Agency"
- [ ] Pro annual user, monthly tab: Pro="Switch to Monthly"
- [ ] Agency user: both Agency cards show "Manage Plan", Pro cards show "Downgrade"
- [ ] Clicking any button as paid user → redirects to Stripe portal (no 409 error)
- [ ] Clicking Upgrade as free user → redirects to Stripe checkout
- [ ] Annual toggle says "Save 17%" not "Save ~20%"
- [ ] Settings page still shows correct plan badge (no regression)
