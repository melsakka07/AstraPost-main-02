# Plan: Multi-Account UX Gap Implementation

**Date:** 2026-04-06
**Prerequisites:** [Multi-Account Gap Analysis](./multi-account-gap-analysis-2026-04-06.md), [Pricing Gap Analysis](./pricing-gap-analysis-2026-04-06.md)

## Context

The pricing audit revealed that the multi-account feature (Pro: 3 accounts, Agency: 10) is fully functional in the backend but has critical UX gaps — there's no "Add Account" button, no onboarding guidance, no remove button, no downgrade handling, and no proactive token expiry warnings. Users who log out and sign in with a different X account create a separate AstraPost user instead of linking accounts. This plan addresses all 15 gaps identified in `docs/audit/multi-account-gap-analysis-2026-04-06.md`.

---

## Phase 1: "Add Account" Flow & Guidance (P0 — Critical)

### 1.1 Add "Connect X Account" button + guidance banner to Settings

**File:** `src/components/settings/connected-x-accounts.tsx`

- Add a **"Connect X Account"** button (with Plus icon) in the header area above the accounts list
- The button triggers `signIn.social({ provider: "twitter", callbackURL: "/dashboard/settings?sync=1" })` — same pattern as existing `handleReconnect` (line 164-169)
- Before triggering OAuth, check account limit client-side: fetch `/api/billing/usage` to get `usage.accounts` vs `limits.maxXAccounts`. If at limit → show upgrade modal via existing `openWithContext()` (already used at line 106-119)
- Disable button with tooltip "Account limit reached" when at limit
- Add an **info banner** (Alert component) above the accounts list:
  ```
  "To manage multiple X accounts under one subscription, add them here while logged in.
   Pro: up to 3 accounts · Agency: up to 10"
  ```
- Update **empty state** (line 259-262): Replace "No accounts connected." text with the "Connect X Account" button + brief explanation

### 1.2 Fix Composer empty state

**File:** `src/components/composer/target-accounts-select.tsx`

- At line 69-70, replace `"No accounts connected"` text with a Link to `/dashboard/settings`:
  ```tsx
  <Link href="/dashboard/settings" className="text-sm text-primary hover:underline px-2 py-2">
    Connect an X account to start posting →
  </Link>
  ```
- Import `Link` from `next/link`

### 1.3 Add "Connect Account" confirmation step to Onboarding

**File:** `src/components/onboarding/onboarding-wizard.tsx`

- Insert a **new Step 1** at position 0 in the `steps` array (line 42-67), shifting existing steps to indices 1-4:
  ```ts
  { icon: UserPlus, label: "Account", description: "Confirm your X account is connected." }
  ```
- The step content should:
  - Fetch connected accounts from `/api/x/accounts` on mount
  - If account exists → show account card (avatar + @username) with green check + "Your X account is connected"
  - Below: "Pro & Agency plans let you manage multiple X accounts from Settings"
  - If no account (edge case) → show "Connect X Account" button triggering OAuth
  - "Next" button enabled only when at least 1 account is connected
- **Update completion check** (currently `currentStep === steps.length` at ~line 260) — this naturally works since `steps.length` increases to 5

### 1.4 Add multi-account hint to Composer

**File:** `src/components/composer/composer-onboarding-hint.tsx`

- Add a 4th hint step after the keyboard shortcuts step (after line 61):
  ```ts
  { icon: Users, text: "Posting to multiple accounts? Use the account selector to choose which X accounts to post to." }
  ```
- This hint only shows as part of the rotation — no conditional logic needed since the hint system cycles through all steps

### 1.5 Add "Add Account" CTA to Plan Usage

**File:** `src/components/settings/plan-usage.tsx`

- In the "Connected X Accounts" section (lines 75-82), when `usage.accounts < limits.maxXAccounts`, add a small link:
  ```tsx
  <span className="text-xs text-primary cursor-pointer">{remaining} slot{remaining > 1 ? 's' : ''} available</span>
  ```
- This provides a visual nudge without being intrusive

---

## Phase 2: Account Removal & Default Fix (P1 — High)

### 2.1 Add "Remove Account" button with confirmation

**File:** `src/components/settings/connected-x-accounts.tsx`

- Add a **Trash2 icon button** to each account card's action buttons area (after the refresh tier button, around line 464)
- Button is **disabled** if the account is the only remaining account (prevent removing auth account)
- On click → open an **AlertDialog** (shadcn/ui) with:
  - Title: "Remove @username?"
  - Description: "This will disconnect the account. Any scheduled posts for this account will be cancelled. This cannot be undone."
  - Cancel + "Remove" (destructive variant) buttons
- On confirm → `DELETE /api/x/accounts/[id]` → refresh accounts list → toast success

### 2.2 Harden DELETE endpoint

**File:** `src/app/api/x/accounts/[id]/route.ts`

The existing DELETE handler (lines 7-29) needs:
- **Prevent deleting last account:** Count user's active accounts before deletion. If count === 1, return 400 with message "Cannot remove your only connected account."
- **Handle default promotion:** If the deleted account was `isDefault = true`, update the next remaining active account to `isDefault = true`
- **Cancel orphaned posts:** Update any posts with `xAccountId = deletedId` and status `scheduled` or `paused_needs_reconnect` to status `draft` (don't delete them, let user reassign)
- Wrap all operations in `db.transaction()`

### 2.3 Fix default account enforcement

**File:** `src/app/api/x/accounts/default/route.ts`

- Wrap lines 24-29 in `db.transaction()`:
  ```typescript
  await db.transaction(async (tx) => {
    await tx.update(xAccounts).set({ isDefault: false }).where(eq(xAccounts.userId, userId));
    await tx.update(xAccounts).set({ isDefault: true }).where(and(eq(xAccounts.id, xAccountId), eq(xAccounts.userId, userId)));
  });
  ```
- This prevents multiple defaults from existing simultaneously (race condition fix)

---

## Phase 3: Downgrade Handling (P1 — High)

### 3.1 Detect over-limit on plan change

**File:** `src/app/api/billing/webhook/route.ts`

- In `handleSubscriptionUpdated` (around lines 301-312), after updating `user.plan`:
  ```typescript
  // After plan update, check if accounts exceed new limit
  const newLimits = getPlanLimits(newPlan);
  const activeAccounts = await tx.select({ count: sql<number>`count(*)` })
    .from(xAccounts)
    .where(and(eq(xAccounts.userId, userId), eq(xAccounts.isActive, true)));
  const accountCount = Number(activeAccounts[0]?.count ?? 0);

  if (accountCount > newLimits.maxXAccounts) {
    // Create notification — do NOT auto-deactivate
    await tx.insert(notifications).values({
      id: createId(),
      userId,
      type: "account_over_limit",
      title: "Account limit exceeded",
      message: `Your ${newPlan} plan allows ${newLimits.maxXAccounts} X account(s). You have ${accountCount} active. Please remove extra accounts in Settings.`,
      read: false,
      createdAt: new Date(),
    });
  }
  ```
- Import `getPlanLimits` from `@/lib/plan-limits` and `notifications` from `@/lib/schema`
- Same check needed in `handleSubscriptionDeleted` (lines 419-473) when plan resets to "free"

### 3.2 Add over-limit banner in Settings

**File:** `src/components/settings/connected-x-accounts.tsx`

- Fetch plan limits alongside accounts (from `/api/billing/usage` or pass as prop)
- If `accounts.length > maxXAccounts`, show a warning Alert at the top:
  ```
  ⚠️ Your plan allows {limit} X account(s). You have {count} active.
  Please remove {excess} account(s) or upgrade your plan to continue posting from all accounts.
  ```
- Posting from excess accounts is already blocked by `checkAccountLimitDetailed` in the post creation route — no additional backend blocking needed

---

## Phase 4: Token Expiry Proactivity (P2 — Medium)

### 4.1 Background token health check job

**File:** `src/lib/queue/processors.ts` (or new file `src/lib/queue/token-health.ts`)

- Add a new BullMQ job type `token-health-check` that runs daily
- Logic:
  1. Query `xAccounts` where `tokenExpiresAt < NOW() + INTERVAL '48 hours'` and `isActive = true`
  2. For each account: attempt silent token refresh using the `refreshToken` via X API
  3. If refresh succeeds → update `accessToken`, `refreshToken`, `tokenExpiresAt` in DB
  4. If refresh fails → insert notification: "Your @{username} token expires soon. Please reconnect in Settings."
- Register the job in `src/lib/queue/client.ts` with a daily cron schedule

### 4.2 Token expiry badge in Composer

**File:** `src/components/composer/target-accounts-select.tsx`

- In the account dropdown items (lines 72-93), check if `tokenExpiresAt` is within 48 hours
- If so, show an amber `AlertTriangle` icon next to the account name with tooltip "Token expires soon — reconnect in Settings"
- This requires adding `tokenExpiresAt` to the `SocialAccountLite` type (line 17-25)

---

## Phase 5: Testing

### Unit Tests

**File:** `src/lib/middleware/require-plan.test.ts`

Add to existing "Multi-Account Limits" describe block:
- "Downgraded user: over-limit detection returns correct counts"
- "Default account uniqueness after transaction"

**New test file:** `src/app/api/x/accounts/[id]/route.test.ts`
- "Cannot delete last remaining account → 400"
- "Deleting default account promotes next account"
- "Scheduled posts moved to draft on account deletion"

### Lint & Typecheck

```bash
pnpm lint && pnpm typecheck
```

### Manual Testing Checklist

| # | Scenario | Expected |
|---|----------|----------|
| 1 | New user → Settings → "Connect X Account" button visible | Button shown |
| 2 | Free user (expired trial, 1 account) clicks "Connect X Account" | Upgrade modal appears |
| 3 | Pro user (2 accounts) clicks "Connect X Account" | OAuth flow starts |
| 4 | Pro user (3 accounts) → button disabled with "Limit reached" | Correct |
| 5 | Composer with 0 accounts | Link to Settings shown |
| 6 | Composer with 3 accounts | Dropdown with all accounts |
| 7 | Remove account with scheduled posts | Confirmation dialog, posts moved to draft |
| 8 | Remove default account | Next account auto-promoted |
| 9 | Try to remove last account | Button disabled |
| 10 | Downgrade Pro → Free with 3 accounts | Notification created |
| 11 | Settings after downgrade | Over-limit banner shown |
| 12 | Onboarding Step 1 | Connected account shown with green check |

---

## Verification

After all phases:
1. `pnpm lint && pnpm typecheck` — zero errors
2. `pnpm test` — all existing + new tests pass
3. Manual walkthrough of scenarios 1-12 above

---

## Agent Orchestration Guide

### Phase 1 — Launch 3 agents in parallel:

**Agent 1 (general-purpose):** "Update `src/components/settings/connected-x-accounts.tsx`: Add 'Connect X Account' button with Plus icon that triggers OAuth via `signIn.social()`. Add info banner explaining multi-account workflow. Update empty state (line 259-262) to show the button. Check account limit client-side via `/api/billing/usage` before triggering OAuth — if at limit, use existing `openWithContext()` for upgrade modal. Also update `src/components/settings/plan-usage.tsx` lines 75-82 to show remaining slots text."

**Agent 2 (general-purpose):** "Update `src/components/composer/target-accounts-select.tsx` line 69-70: replace 'No accounts connected' with a Link to `/dashboard/settings`. Import Link from next/link. Also update `src/components/composer/composer-onboarding-hint.tsx`: add a 4th hint about the multi-account selector after line 61."

**Agent 3 (general-purpose):** "Update `src/components/onboarding/onboarding-wizard.tsx`: Insert new Step 1 'Account' at index 0 in steps array (line 42). Step fetches `/api/x/accounts` on mount, shows connected account with green check, or 'Connect X Account' button if none. Add 'Pro & Agency plans support multiple accounts' text. Shift existing steps to indices 1-4. The completion check at `currentStep === steps.length` should still work since steps.length increases. Run `pnpm lint && pnpm typecheck`."

### Phase 2 — Launch 2 agents in parallel:

**Agent 1 (general-purpose):** "Update `src/components/settings/connected-x-accounts.tsx`: Add Trash2 icon button to each account card (after line 464). Disabled if only 1 account. On click opens AlertDialog confirmation. On confirm calls DELETE `/api/x/accounts/[id]`, refreshes list, shows toast. Use shadcn AlertDialog component."

**Agent 2 (general-purpose):** "Harden `src/app/api/x/accounts/[id]/route.ts` DELETE handler: (a) prevent deleting last account (count check → 400), (b) if deleted account was isDefault, promote next active account, (c) move scheduled/paused posts to draft status, (d) wrap in db.transaction(). Also fix `src/app/api/x/accounts/default/route.ts`: wrap lines 24-29 in db.transaction — clear all defaults first, then set new one. Run `pnpm lint && pnpm typecheck`."

### Phase 3 — Launch 1 agent:

**Agent 1 (general-purpose):** "Update `src/app/api/billing/webhook/route.ts`: In `handleSubscriptionUpdated` (after line 305 plan update) and `handleSubscriptionDeleted` (after line 455 plan reset), add over-limit detection — count active xAccounts vs new plan's maxXAccounts. If over limit, insert a notification row. Do NOT auto-deactivate accounts. Import getPlanLimits from plan-limits.ts. Also update `src/components/settings/connected-x-accounts.tsx`: add an over-limit warning Alert banner when accounts exceed plan limit. Run `pnpm lint && pnpm typecheck`."

### Phase 4 — Launch 2 agents in parallel:

**Agent 1 (general-purpose):** "Create a daily token health check job. In `src/lib/queue/client.ts` add a `token-health-check` job type. In `src/lib/queue/processors.ts` (or new file), add processor that: queries xAccounts where tokenExpiresAt < NOW()+48h and isActive=true, attempts token refresh via X API refreshToken, updates DB on success, creates notification on failure. Register with daily cron."

**Agent 2 (general-purpose):** "Update `src/components/composer/target-accounts-select.tsx`: add tokenExpiresAt to SocialAccountLite type. In account dropdown items, show amber AlertTriangle icon with tooltip when token expires within 48 hours. Run `pnpm lint && pnpm typecheck`."

### Phase 5 — Launch 1 agent:

**Agent 1 (general-purpose):** "Add tests: extend `require-plan.test.ts` with downgrade over-limit test. Create `src/app/api/x/accounts/[id]/route.test.ts` with tests for: cannot delete last account, default promotion on delete, posts moved to draft. Run `pnpm test`."

---

## Files Modified Summary

| Phase | File | Change |
|-------|------|--------|
| 1 | `src/components/settings/connected-x-accounts.tsx` | Add "Connect" button, guidance banner, fix empty state |
| 1 | `src/components/composer/target-accounts-select.tsx` | Link to Settings on empty state |
| 1 | `src/components/composer/composer-onboarding-hint.tsx` | 4th hint about account selector |
| 1 | `src/components/onboarding/onboarding-wizard.tsx` | New Step 1: "Account" confirmation |
| 1 | `src/components/settings/plan-usage.tsx` | Remaining slots text |
| 2 | `src/components/settings/connected-x-accounts.tsx` | Remove button + AlertDialog |
| 2 | `src/app/api/x/accounts/[id]/route.ts` | Harden DELETE: last-account guard, default promotion, orphan cleanup |
| 2 | `src/app/api/x/accounts/default/route.ts` | Transaction-based default enforcement |
| 3 | `src/app/api/billing/webhook/route.ts` | Over-limit detection + notification |
| 3 | `src/components/settings/connected-x-accounts.tsx` | Over-limit warning banner |
| 4 | `src/lib/queue/processors.ts` or new file | Token health check job |
| 4 | `src/lib/queue/client.ts` | Register token-health-check job |
| 4 | `src/components/composer/target-accounts-select.tsx` | Token expiry badge |
| 5 | `src/lib/middleware/require-plan.test.ts` | Downgrade test |
| 5 | `src/app/api/x/accounts/[id]/route.test.ts` | New test file |

---

*Implementation plan generated 2026-04-06. Based on [Multi-Account Gap Analysis](./multi-account-gap-analysis-2026-04-06.md).*
