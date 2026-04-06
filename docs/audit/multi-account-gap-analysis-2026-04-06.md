# Multi-Account Feature — Gap Analysis & Implementation Plan

**Date:** 2026-04-06
**Scope:** X account connection flow, multi-account UX, edge cases
**Related:** [Pricing Gap Analysis](./pricing-gap-analysis-2026-04-06.md)

---

## 1. Complete Gap Inventory

### Category A: Discovery & Guidance (UX)

| # | Gap | Where | Severity | Detail |
|---|-----|-------|----------|--------|
| A1 | **No "Add Account" button anywhere** | Settings page | Critical | Users can only "Reconnect" (expired tokens) or "Sync". There is no explicit "Add another X account" action. |
| A2 | **No guidance on multi-account workflow** | Settings, onboarding | Critical | Nothing tells users: "Stay logged in, then connect additional accounts from Settings." A user who logs out and signs in with a different X account creates a separate AstraPost user. |
| A3 | **Onboarding skips account connection** | `onboarding-wizard.tsx` | High | 4 steps (Preferences → Compose → Schedule → AI). No step for "Connect your X account" even though it's required to post. |
| A4 | **Empty state in Composer has no CTA** | `target-accounts-select.tsx:69` | High | Shows "No accounts connected" but no link to Settings to fix it. Dead end. |
| A5 | **Empty state in Settings has no CTA** | `connected-x-accounts.tsx:259` | High | Shows "No accounts connected." with no button to connect one. |
| A6 | **No multi-account hint in Composer** | `composer-onboarding-hint.tsx` | Medium | Composer hints cover AI, scheduling, shortcuts — never mentions the account selector. |
| A7 | **Plan Usage shows slots but no "Add" CTA** | `plan-usage.tsx:75` | Medium | Shows "2 / 3" but doesn't say "You have 1 slot remaining — [Add Account]". |

### Category B: Account Management (UX + Backend)

| # | Gap | Where | Severity | Detail |
|---|-----|-------|----------|--------|
| B1 | **No "Remove/Disconnect" button in UI** | `connected-x-accounts.tsx` | High | DELETE endpoint exists (`/api/x/accounts/[id]`) but no UI button to trigger it. Users cannot remove unwanted accounts. |
| B2 | **No downgrade account cleanup** | Stripe webhook | High | User downgrades Pro (3 accounts) → Free (1 account). All 3 accounts remain `isActive = true`. No deactivation, no notification, no grace period to choose which to keep. |
| B3 | **No "Set as default" enforcement** | `connected-x-accounts.tsx`, DB | Medium | Multiple accounts can have `isDefault = true` simultaneously (no DB constraint, no clearing of old default before setting new one). |
| B4 | **No proactive token refresh** | Background jobs | Medium | Tokens expire silently. No background job checks for expiring tokens (e.g., 24h warning). User only discovers expired token when a post fails or they visit Settings. |
| B5 | **Orphaned paused posts on account deletion** | `processors.ts` | Medium | Posts in `paused_needs_reconnect` status for a deleted account remain stuck forever. No migration to another account, no user notification. |

### Category C: Edge Cases (Backend)

| # | Gap | Where | Severity | Detail |
|---|-----|-------|----------|--------|
| C1 | **Inactive accounts bypass limit count** | `require-plan.ts:164` | Medium | `checkAccountLimitDetailed` counts only `isActive = true`. A user can accumulate unlimited deactivated accounts, then reactivate them without a limit check. |
| C2 | **No cascade cleanup for job_runs** | `schema.ts` | Low | Deleting an X account cascades to posts, follower snapshots, analytics runs — but `jobRuns` and notifications become orphaned. |
| C3 | **Race condition on concurrent OAuth** | `sync/route.ts` | Low | Two simultaneous OAuth completions for the same X account could create duplicates before the `onConflictDoUpdate` runs (unlikely but possible). |

---

## 2. Prioritized Implementation Plan

### Phase 1: "Add Account" Flow & Guidance (P0 — Critical)

**Goal:** Make multi-account discoverable and usable.

#### 1.1 Add "Connect X Account" button to Settings

**File:** `src/components/settings/connected-x-accounts.tsx`

Add a prominent button above the accounts list:

```tsx
<Button onClick={handleAddAccount} disabled={atLimit}>
  <Plus className="h-4 w-4 mr-2" /> Connect X Account
</Button>
```

The `handleAddAccount` function should:
1. Call `checkAccountLimitDetailed` via a lightweight GET endpoint (or use client-side plan data)
2. If under limit → trigger `signIn.social({ provider: "twitter", callbackURL: "/dashboard/settings?sync=1" })`
3. If at limit → show upgrade modal with remaining slots info

Also update the **empty state** (line 259) to show this button instead of plain text.

#### 1.2 Add guidance banner in Settings

**File:** `src/components/settings/connected-x-accounts.tsx`

Add an info banner above accounts list:

```
ℹ️ To add another X account, click "Connect X Account" while logged in.
   Each additional account will be managed under your current subscription.
   Pro plan: up to 3 accounts · Agency: up to 10 accounts
```

#### 1.3 Fix empty state in Composer

**File:** `src/components/composer/target-accounts-select.tsx`

When `accounts.length === 0`, replace "No accounts connected" with:

```tsx
<Link href="/dashboard/settings" className="text-primary underline">
  Connect an X account to start posting →
</Link>
```

#### 1.4 Add "Connect Account" step to Onboarding

**File:** `src/components/onboarding/onboarding-wizard.tsx`

Insert a new Step 1 (shift existing steps to 2-5):

**Step 1: "Connect Your X Account"**
- Check if user already has an active X account (they should — they signed in with one)
- If yes → show confirmation with their connected account + "You can add more accounts later from Settings"
- If no (edge case) → show "Connect X Account" button
- Mention: "Pro & Agency plans let you manage multiple X accounts under one subscription"

#### 1.5 Add multi-account hint to Composer

**File:** `src/components/composer/composer-onboarding-hint.tsx`

Add a hint step:

```
💡 Posting to multiple accounts? Use the account selector above to choose
   which X accounts this post goes to. Manage accounts in Settings.
```

Only show when user has 2+ accounts connected.

---

### Phase 2: Account Removal & Default Fix (P1 — High)

**Goal:** Let users manage their connected accounts properly.

#### 2.1 Add "Remove Account" button

**File:** `src/components/settings/connected-x-accounts.tsx`

Add a trash icon button to each account card. On click:
1. Show confirmation dialog: "Remove @username? Scheduled posts for this account will be cancelled."
2. Call `DELETE /api/x/accounts/[id]`
3. Refresh account list

**File:** `src/app/api/x/accounts/[id]/route.ts`

Verify the DELETE handler:
- Cancels or reassigns pending posts (don't leave orphans)
- If removing the default account, auto-promote the next active account to default
- Prevent removing the last remaining account (it's the auth account)

#### 2.2 Fix default account enforcement

**File:** `src/app/api/x/accounts/default/route.ts`

Wrap in a transaction:
```typescript
await db.transaction(async (tx) => {
  // Clear ALL defaults for this user
  await tx.update(xAccounts).set({ isDefault: false }).where(eq(xAccounts.userId, userId));
  // Set the new default
  await tx.update(xAccounts).set({ isDefault: true }).where(eq(xAccounts.id, accountId));
});
```

This prevents multiple defaults from existing simultaneously.

---

### Phase 3: Downgrade Handling (P1 — High)

**Goal:** Gracefully handle account excess when user downgrades.

#### 3.1 Add downgrade logic to Stripe webhook

**File:** `src/app/api/billing/webhook/route.ts`

When plan changes (e.g., Pro → Free):
1. Count active accounts
2. If `activeCount > newLimit`:
   - Do NOT auto-deactivate accounts
   - Mark the user as `accountsOverLimit = true` in DB (new column or flag)
   - Create a notification: "Your plan allows 1 account. You have 3 active. Please choose which accounts to keep in Settings."
3. Block new posts from excess accounts (but don't delete scheduled ones)

#### 3.2 Add "over-limit" banner in Settings

**File:** `src/components/settings/connected-x-accounts.tsx`

If user has more accounts than their plan allows:

```
⚠️ Your Free plan allows 1 X account. You have 3 active accounts.
   Please remove 2 accounts or upgrade your plan to continue posting from all accounts.
```

Show a warning badge on excess accounts and disable posting (but don't auto-disconnect).

---

### Phase 4: Token Expiry Proactivity (P2 — Medium)

**Goal:** Warn users before tokens expire, not after posts fail.

#### 4.1 Background token health check

**File:** `src/lib/queue/processors.ts` (or new processor)

Add a daily job:
1. Query all X accounts where `tokenExpiresAt < NOW() + INTERVAL '48 hours'`
2. For each: attempt a silent token refresh via `refreshToken`
3. If refresh fails: create a notification + email: "Your @username token expires soon. Reconnect in Settings."

#### 4.2 Token expiry badge in Composer

**File:** `src/components/composer/target-accounts-select.tsx`

Show an amber warning icon next to accounts with tokens expiring within 48 hours:

```
@AccountA ⚠️ Token expires soon
```

---

### Phase 5: Inactive Account Limit Fix (P2 — Medium)

**Goal:** Prevent limit bypass via inactive accounts.

#### 5.1 Count all accounts, not just active

**File:** `src/lib/middleware/require-plan.ts`

Change `checkAccountLimitDetailed`:

```typescript
// BEFORE: Only counts active
.where(and(eq(xAccounts.userId, userId), eq(xAccounts.isActive, true)))

// AFTER: Count all (active + inactive)
.where(eq(xAccounts.userId, userId))
```

OR add a reactivation gate: when user calls an endpoint to reactivate an account, check the limit at that point.

**Decision needed:** Counting all accounts is simpler but penalizes users who have deactivated accounts they can't remove (due to gap B1). Fix B1 (remove button) first, then tighten the count.

---

### Phase 6: Testing

#### Unit Tests

**File:** `src/lib/middleware/require-plan.test.ts` (extend)

```
Test Suite: Multi-Account Limits
  ✓ Free user blocked at 2nd account
  ✓ Pro user allowed up to 3 accounts
  ✓ Pro user blocked at 4th account
  ✓ Agency user allowed up to 10 accounts
  ✓ Downgraded user sees over-limit state
  ✓ Default account is unique per user (no duplicates)
  ✓ Removing account updates default if needed
  ✓ Cannot remove last remaining account
```

#### Manual Testing Checklist

| # | Scenario | Expected |
|---|----------|----------|
| 1 | New user → Settings → sees "Connect X Account" button | Button visible |
| 2 | Free user clicks "Connect X Account" with 1 account | Blocked with upgrade modal |
| 3 | Pro user clicks "Connect X Account" with 2 accounts | OAuth flow starts |
| 4 | Pro user with 3 accounts → button disabled or shows "Limit reached" | Correct |
| 5 | Composer with 0 accounts | Shows link to Settings |
| 6 | Composer with 3 accounts | Dropdown with checkboxes, all visible |
| 7 | Remove account with scheduled posts | Confirmation dialog warns about posts |
| 8 | Remove default account | Next account auto-promoted to default |
| 9 | Try to remove last account | Blocked with explanation |
| 10 | Downgrade Pro → Free with 3 accounts | Notification about over-limit |
| 11 | Onboarding → Step 1 shows connected account | Account visible with "add more later" text |

---

## 3. Agent Orchestration Guide

### Phase 1 Agents (Add Account Flow)

Launch **3 agents in parallel**:

```
Agent 1: general-purpose
  Prompt: "Update src/components/settings/connected-x-accounts.tsx:
    - Add 'Connect X Account' button that triggers OAuth flow
    - Add info banner explaining multi-account workflow
    - Update empty state to include CTA button
    - Show remaining slots from plan limits"

Agent 2: general-purpose
  Prompt: "Update src/components/composer/target-accounts-select.tsx:
    - Add link to Settings when 0 accounts connected
    Update src/components/composer/composer-onboarding-hint.tsx:
    - Add multi-account hint for users with 2+ accounts"

Agent 3: general-purpose
  Prompt: "Update src/components/onboarding/onboarding-wizard.tsx:
    - Add new Step 1: 'Connect Your X Account'
    - Show current connected account with confirmation
    - Mention multi-account is available on Pro/Agency
    - Shift existing steps from 1-4 to 2-5
    - Update the step count check for onboarding completion"
```

### Phase 2 Agents (Account Removal)

Launch **2 agents in parallel**:

```
Agent 1: general-purpose
  Prompt: "Add remove/disconnect button to connected-x-accounts.tsx:
    - Trash icon per account card with confirmation dialog
    - Call DELETE /api/x/accounts/[id]
    - Prevent removing last account
    - Refresh list after removal"

Agent 2: general-purpose
  Prompt: "Fix default account enforcement in /api/x/accounts/default/route.ts:
    - Wrap in db.transaction
    - Clear all defaults before setting new one
    - Verify DELETE handler handles default promotion"
```

### Phase 3 Agents (Downgrade)

Launch **1 agent**:

```
Agent 1: general-purpose
  Prompt: "Add downgrade handling to /api/billing/webhook/route.ts:
    - On plan change: count active accounts vs new limit
    - If over limit: create notification for user
    - Add over-limit banner to connected-x-accounts.tsx
    - Do NOT auto-deactivate accounts"
```

### Phase 5+6 Agents (Limit Fix + Tests)

Launch **2 agents in parallel**:

```
Agent 1: general-purpose
  Prompt: "Update checkAccountLimitDetailed in require-plan.ts to count
    all accounts (not just active). Run pnpm lint && pnpm typecheck."

Agent 2: general-purpose
  Prompt: "Add unit tests for multi-account limits to require-plan.test.ts:
    - Free blocked at 2nd, Pro at 4th, Agency at 11th
    - Downgrade over-limit detection
    - Default uniqueness enforcement
    Run pnpm test after."
```

---

## 4. Files Modified Summary

| Phase | File | Change |
|-------|------|--------|
| 1 | `src/components/settings/connected-x-accounts.tsx` | Add "Connect" button, guidance banner, fix empty state |
| 1 | `src/components/composer/target-accounts-select.tsx` | Add Settings link on empty state |
| 1 | `src/components/composer/composer-onboarding-hint.tsx` | Add multi-account hint |
| 1 | `src/components/onboarding/onboarding-wizard.tsx` | Add "Connect Account" step |
| 2 | `src/components/settings/connected-x-accounts.tsx` | Add remove button + confirmation |
| 2 | `src/app/api/x/accounts/[id]/route.ts` | Verify/fix DELETE handler |
| 2 | `src/app/api/x/accounts/default/route.ts` | Transaction-based default enforcement |
| 3 | `src/app/api/billing/webhook/route.ts` | Downgrade over-limit handling |
| 3 | `src/components/settings/connected-x-accounts.tsx` | Over-limit banner |
| 4 | `src/lib/queue/processors.ts` | Token health check job |
| 4 | `src/components/composer/target-accounts-select.tsx` | Token expiry badge |
| 5 | `src/lib/middleware/require-plan.ts` | Count all accounts in limit check |
| 6 | `src/lib/middleware/require-plan.test.ts` | Multi-account test cases |

---

*Generated 2026-04-06. Addresses multi-account gaps identified during pricing audit.*
