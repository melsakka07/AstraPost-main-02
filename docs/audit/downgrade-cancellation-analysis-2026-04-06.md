# Downgrade & Cancellation Path — Analysis & Implementation Plan

> **Date**: 2026-04-06
> **Status**: Analysis complete, implementation pending

---

## LLM Implementation Instructions

This document is designed to be handed to an LLM (Claude Code, Cursor, etc.) as the complete specification for implementing the downgrade/cancellation billing flow. Follow the phase order below. **Use specialized agents in parallel** to maximize speed and coverage.

### Agent Strategy Per Phase

**Phase 5 (Grace Period — do first, it's 1 line):**

- No agents needed. Apply the fix directly in `src/lib/middleware/require-plan.ts`.

**Phase 1 (Change-Plan API):**

- Spawn **code-explorer** agent: trace the existing `POST /api/billing/checkout/route.ts` and `POST /api/billing/webhook/route.ts` to understand the full Stripe integration pattern (how `stripe` is imported, how subscriptions are queried, how `ApiError` is used, how webhooks sync plan changes). Provide findings to the implementation step.
- Spawn **codebase-analyst** agent: analyze `src/lib/billing-utils.ts` to understand `planToPrice()`, `priceToPlan()`, `VALID_CHECKOUT_PLANS` — these must be reused, not duplicated.
- After agents return: create `src/app/api/billing/change-plan/route.ts` following the exact same patterns (imports, auth check, Zod validation, `ApiError` responses, transaction wrapping).

**Phase 2 (Preview Endpoint):**

- Spawn **code-explorer** agent: read `src/lib/plan-limits.ts` to extract the full `PLAN_LIMITS` structure and understand how to compute feature diffs between two plan tiers.
- Spawn **code-explorer** agent: read `src/app/api/billing/usage/route.ts` to understand how current usage (posts, accounts, AI) is counted — reuse those exact queries.
- After agents return: create `src/app/api/billing/change-plan/preview/route.ts`. Reuse `getPlanLimits()` and the usage counting queries. Do NOT duplicate counting logic.

**Phase 3 (Confirmation Dialog):**

- Spawn **code-explorer** agent: scan `src/components/billing/` and `src/components/ui/` for existing Dialog, AlertDialog, and Button patterns. Check how `pricing-table.tsx` currently calls `handleSelect` — the dialog must integrate with that flow.
- After agent returns: create `src/components/billing/change-plan-dialog.tsx` using the project's existing shadcn/ui `AlertDialog` component. Wire it into `pricing-table.tsx`'s `handleSelect` so that downgrade/switch buttons open the dialog instead of going to portal.

**Phase 4 (Settings Enhancements):**

- Spawn **code-explorer** agent: read `src/app/dashboard/settings/page.tsx` (the subscription card section) and `src/components/settings/billing-status.tsx` to understand the current layout, how `ManageSubscriptionButton` works, and what data is available.
- After agent returns: add "Change Plan" link/button to the subscription card. Enhance `billing-status.tsx` to show an "Undo Cancellation" button when `cancelAtPeriodEnd` is true (calls `POST /api/billing/change-plan` with the current plan to reactivate).

**Phase 6 (Over-Limit UI):**

- Spawn **code-explorer** agent: read `src/components/settings/connected-x-accounts.tsx` to understand the current account list UI and how accounts are deactivated/removed.
- After agent returns: add an amber warning banner when `activeAccounts > planLimit`. Each account card should show a "Deactivate" action. Deactivated accounts set `isActive = false` (preserved, not deleted).

**Phase 7 (Scheduled Posts Cleanup):**

- Spawn **codebase-analyst** agent: trace the webhook handler `handleSubscriptionUpdated` in `src/app/api/billing/webhook/route.ts` to find where plan changes are detected and where to insert the cleanup logic.
- After agent returns: add a function that queries `posts` with `status = 'scheduled'` for the user, counts them against the new plan's `postsPerMonth` limit, and moves excess to `status = 'draft'`. Add a notification via the existing `notifyBillingEvent` pattern.

### Cross-Cutting Verification

After ALL phases are complete:

- Spawn **code-reviewer** agent on all changed files to check for bugs, security issues, and pattern adherence.
- Run `pnpm lint && pnpm typecheck` to verify no regressions.
- Run `pnpm test` to verify existing tests pass.
- Manually verify each row in the Verification Checklist below.

### Key Rules for Implementation

1. **Reuse existing patterns** — import `ApiError`, `auth`, `db`, `stripe`, `planToPrice()`, `getPlanLimits()`. Never create parallel utilities.
2. **Follow CLAUDE.md rules** — no hardcoded model names, use `ApiError` for all error responses, wrap multi-table writes in `db.transaction()`.
3. **Stripe API calls** — use `stripe.subscriptions.update()` for plan changes (NOT `checkout.sessions.create`). Use `stripe.subscriptions.retrieve()` to get the current subscription item ID.
4. **Proration** — always pass `proration_behavior: "create_prorations"` on paid→paid changes. Stripe handles the credit/charge math.
5. **Downgrade to free** — use `cancel_at_period_end: true` (NOT immediate cancellation). User keeps access until period end.
6. **Webhook handles DB sync** — the `change-plan` API does NOT update `user.plan` directly. It calls Stripe, and the existing webhook handler (`customer.subscription.updated`) syncs the change to DB. This prevents DB/Stripe drift.
7. **Exception: cancel_at_period_end** — this flag must be synced to the `subscriptions` table immediately (the webhook also handles it, but showing it in the UI requires the DB to reflect it right away).

---

## Executive Summary

AstraPost has a **solid cancellation flow** (via Stripe portal) but **no in-app downgrade path**. Users who want to go from Agency → Pro or Pro → Free must cancel their subscription entirely, wait for the billing period to end, then re-subscribe to a lower plan — creating a gap in service and a terrible UX. This document covers what exists, what's missing, and what to build.

---

## What Works Today

| Flow                         | Status     | How                                                            |
| ---------------------------- | ---------- | -------------------------------------------------------------- |
| Cancel subscription          | ✅ Works   | Settings → Manage Subscription → Stripe portal                 |
| Cancellation at period end   | ✅ Works   | Keeps access until period ends, then auto-downgrades to free   |
| Reactivate before period end | ✅ Works   | User can undo cancellation via Stripe portal                   |
| Trial → Free (no payment)    | ✅ Works   | `incomplete_expired` webhook sets `plan = "free"`              |
| Payment failure grace        | ⚠️ Partial | 7-day grace tracked via `planExpiresAt`, but not auto-enforced |
| Usage counter reset          | ✅ Auto    | Calendar-month based queries, no manual reset needed           |
| Data preservation on cancel  | ✅ Works   | Posts, accounts, analytics all preserved                       |

## What's Missing

| Flow                                             | Status     | Impact                                                                                               |
| ------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------- |
| **In-app plan downgrade** (Agency→Pro, Pro→Free) | ❌ Missing | Users must cancel + rebuy, creating service gap                                                      |
| **In-app billing cycle switch** (monthly↔annual) | ❌ Missing | Only possible via Stripe portal (no custom UI)                                                       |
| **Grace period enforcement**                     | ❌ Missing | `planExpiresAt` is set but never checked — user keeps paid access indefinitely after payment failure |
| **Over-limit remediation UI**                    | ❌ Missing | User gets notification but no guided flow to deactivate excess accounts                              |
| **Scheduled posts cleanup on downgrade**         | ❌ Missing | Existing scheduled posts remain; fail silently at publish time                                       |

---

## Industry Best Practice (What Other SaaS Platforms Do)

### 1. Downgrade Timing

- **Stripe, Slack, Notion, Linear**: Downgrade takes effect **at the end of the current billing period**. User keeps full access until then. Stripe issues a prorated credit for the remaining time.
- **Never immediate**: No reputable SaaS cuts access mid-billing-period after the user already paid.

### 2. Downgrade UX

- **In-app confirmation dialog** showing:
  - What features they'll lose
  - What happens to their data (preserved, not deleted)
  - When the change takes effect (end of current period)
  - Option to cancel the downgrade before it takes effect
- **Not through Stripe portal** — the portal is for payment methods and invoices, not plan management.

### 3. Over-Limit Handling

- **Notion**: Read-only mode for excess content; doesn't delete anything.
- **Slack**: Archives excess channels; data preserved, just inaccessible.
- **GitHub**: Blocks new private repos; existing ones become read-only.
- **Best practice for AstraPost**: Block new posts/AI from excess accounts; let user choose which accounts to keep active.

### 4. Cancellation → Free

- **Standard approach**: Cancel = downgrade to free at period end.
- User gets a **"win-back" email** before the period ends.
- After downgrade: usage counters reset naturally (calendar month), data preserved, features gated.

### 5. Prorated Credits

- **Stripe handles this natively**: `stripe.subscriptions.update()` with `proration_behavior: "create_prorations"` automatically credits unused time from the old plan and charges the new plan price.
- Agency ($99/mo) → Pro ($29/mo) mid-cycle: Stripe credits ~$50 and charges ~$15 for remaining days.

---

## Proposed Implementation

### Phase 1: API Endpoint — `POST /api/billing/change-plan`

**Purpose**: Handle all plan changes (upgrade, downgrade, cycle switch) for existing subscribers.

**Request**:

```json
{ "plan": "pro_monthly" | "pro_annual" | "agency_monthly" | "agency_annual" | "free" }
```

**Logic**:

```
1. Validate user has active subscription (via stripeSubscriptionId)
2. If target plan is "free":
   → Call stripe.subscriptions.update(subId, { cancel_at_period_end: true })
   → This schedules cancellation; webhook handles the rest
   → Return { effectiveDate: currentPeriodEnd, action: "cancel_scheduled" }

3. If target plan is paid:
   → Get current subscription item ID from Stripe
   → Get new Stripe price ID via planToPrice()
   → Call stripe.subscriptions.update(subId, {
       items: [{ id: itemId, price: newPriceId }],
       proration_behavior: "create_prorations"  // Stripe handles credits
     })
   → Webhook (customer.subscription.updated) will sync the new plan to DB
   → Return { effectiveDate: "immediate", action: "plan_changed", prorationAmount }

4. Return preview of what changes (features lost/gained, effective date)
```

**Why not use the existing checkout route?**: Checkout creates a NEW subscription. For existing subscribers, we need `subscriptions.update()` which modifies the EXISTING subscription in-place, preserving billing history and handling proration.

### Phase 2: Preview Endpoint — `POST /api/billing/change-plan/preview`

**Purpose**: Show the user what will happen before they confirm.

**Request**: Same as change-plan.

**Response**:

```json
{
  "currentPlan": "agency",
  "targetPlan": "pro_monthly",
  "effectiveDate": "2026-05-01T00:00:00Z",
  "proratedCredit": "$47.00",
  "newMonthlyPrice": "$29/mo",
  "featuresLost": [
    "LinkedIn Integration",
    "Team Collaboration",
    "Unlimited AI Generations (→ 100/month)",
    "10 X Accounts (→ 3)"
  ],
  "overLimits": {
    "xAccounts": { "current": 5, "newLimit": 3, "action": "You'll need to deactivate 2 accounts" }
  }
}
```

**How to compute**: Compare `PLAN_LIMITS[currentPlan]` vs `PLAN_LIMITS[targetPlan]` and query current usage.

### Phase 3: Confirmation Dialog Component

**Location**: New component `src/components/billing/change-plan-dialog.tsx`

**Triggered from**: Pricing page buttons (Downgrade, Switch to Annual/Monthly) and Settings page.

**UI**:

```
┌─────────────────────────────────────────────────┐
│  Change to Pro Monthly                           │
│                                                   │
│  Your plan will change from Agency to Pro.        │
│                                                   │
│  What changes:                                    │
│  ✗ LinkedIn Integration (Agency only)             │
│  ✗ Team Collaboration (Agency only)               │
│  ✗ Unlimited AI → 100/month                       │
│  ✗ 10 X Accounts → 3 accounts                    │
│                                                   │
│  ⚠ You have 5 connected X accounts.              │
│    You'll need to deactivate 2 in Settings.       │
│                                                   │
│  Prorated credit: $47.00 applied to next invoice  │
│  Effective: Immediately                           │
│  New price: $29/month                             │
│                                                   │
│  [Cancel]                    [Confirm Downgrade]  │
└─────────────────────────────────────────────────┘
```

### Phase 4: Settings Page — Plan Management Section

**Enhancement to**: `src/app/dashboard/settings/page.tsx` subscription card.

Add a "Change Plan" button alongside "Manage Subscription":

- "Change Plan" → opens pricing page (or inline plan selector)
- "Manage Subscription" → Stripe portal (payment methods, invoices only)

Show pending downgrade notice if `cancelAtPeriodEnd` is true:

```
⚠ Your plan will change to Free on May 1, 2026.
You'll keep full access until then. [Undo Cancellation]
```

### Phase 5: Grace Period Enforcement

**Problem**: `planExpiresAt` is set on payment failure (7-day grace) but never checked.

**Solution**: Add a check in `getPlanContext()` (require-plan.ts):

```
if (user.planExpiresAt && user.planExpiresAt < now) {
  // Grace period expired — treat as free
  effectivePlan = "free"
  // Optionally: update user.plan = "free" in DB for consistency
}
```

This is a **one-line fix** that makes the existing grace period mechanism actually work.

### Phase 6: Over-Limit Account Deactivation UI

**Location**: Settings → Connected Accounts section.

When user has more active accounts than their plan allows:

- Show amber warning banner: "Your plan allows N accounts. Please deactivate M accounts."
- Each account card gets a "Deactivate" button
- Deactivated accounts are preserved (not deleted) — user can reactivate after upgrading

### Phase 7: Scheduled Posts Cleanup on Downgrade

**When plan changes**: Query scheduled posts that would exceed the new plan's limits.

**Approach** (soft, non-destructive):

- Move excess scheduled posts to `status = "draft"` (not deleted)
- Notify user: "N scheduled posts were moved to Drafts because they exceed your new plan's limits"
- User can re-schedule them if they upgrade again

---

## Stripe Portal Configuration

The current portal uses Stripe defaults. For the complete flow, configure the portal to complement (not replace) the in-app UI:

**Keep in portal**: Payment method updates, invoice history, billing address
**Remove from portal**: Plan changes (handle in-app for better UX and data migration warnings)

This is done via `stripe.billingPortal.configurations.create()` or the Stripe Dashboard → Settings → Customer portal.

---

## Files to Create/Modify

| File                                               | Action | Purpose                                                   |
| -------------------------------------------------- | ------ | --------------------------------------------------------- |
| `src/app/api/billing/change-plan/route.ts`         | Create | Plan change API (upgrade/downgrade/cycle switch)          |
| `src/app/api/billing/change-plan/preview/route.ts` | Create | Preview what changes before confirming                    |
| `src/components/billing/change-plan-dialog.tsx`    | Create | Confirmation dialog with feature comparison               |
| `src/components/billing/pricing-table.tsx`         | Modify | Wire downgrade/switch buttons to dialog instead of portal |
| `src/lib/middleware/require-plan.ts`               | Modify | Add `planExpiresAt` grace period check (1 line)           |
| `src/app/api/billing/webhook/route.ts`             | Modify | Add scheduled posts cleanup on plan change                |
| `src/app/dashboard/settings/page.tsx`              | Modify | Add "Change Plan" button, pending downgrade notice        |
| `src/components/settings/billing-status.tsx`       | Modify | Show "Undo Cancellation" action                           |

---

## Priority Order

1. **Grace period enforcement** (Phase 5) — 1-line fix, high impact, zero risk
2. **Change-plan API** (Phase 1) — Core capability, enables everything else
3. **Preview endpoint** (Phase 2) — Required for good UX
4. **Confirmation dialog** (Phase 3) — User-facing, pairs with API
5. **Settings enhancements** (Phase 4) — Polish
6. **Over-limit UI** (Phase 6) — Important but not blocking
7. **Scheduled posts cleanup** (Phase 7) — Nice to have, prevents silent failures

---

## Verification Checklist

- [ ] Free → Pro Monthly: checkout flow (existing, unchanged)
- [ ] Free → Pro Annual: checkout flow (existing, unchanged)
- [ ] Pro Monthly → Pro Annual: `change-plan` API, prorated credit
- [ ] Pro Annual → Pro Monthly: `change-plan` API, prorated credit
- [ ] Pro → Agency: `change-plan` API, immediate upgrade
- [ ] Agency → Pro: `change-plan` API with over-limit warning
- [ ] Agency → Free: schedules cancellation at period end
- [ ] Pro → Free: schedules cancellation at period end
- [ ] Payment failure → 7-day grace → auto-downgrade to free
- [ ] Over-limit accounts: warning shown, deactivation available
- [ ] Scheduled posts: excess moved to drafts on downgrade
- [ ] Stripe webhook syncs all plan changes to DB correctly
