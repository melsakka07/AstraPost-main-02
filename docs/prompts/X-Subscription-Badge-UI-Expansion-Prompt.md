# Prompt: Expand X Subscription Tier Badge Across All Key UI Surfaces

> **Objective:** Make the user's X subscription tier visible in every contextually relevant location — Settings, Composer, Sidebar account switcher, and Queue error context — so users always know their account status without navigating away from their current workflow. This prompt does NOT change character limit logic — it only surfaces the tier data that was collected in the previous implementation phase.

---

## Prerequisite

This prompt assumes the **X Subscription Tier Detection** feature is already fully implemented:

- `x_subscription_tier` and `x_subscription_tier_updated_at` columns exist on the `x_accounts` table.
- `fetchXSubscriptionTier()` exists in `src/lib/services/x-api.ts`.
- `GET /api/x/subscription-tier` and `POST /api/x/subscription-tier/refresh` routes are functional.
- `XSubscriptionBadge` component exists at `src/components/settings/x-subscription-badge.tsx`.
- `xSubscriptionTierEnum`, `canPostLongContent()`, and `getMaxCharacterLimit()` utility exports are available.
- Existing X account data responses already include the `xSubscriptionTier` field.

**Before writing any code**, verify these prerequisites exist in the codebase. If anything is missing, stop and inform the user.

---

## Context & Codebase

You are working on **AstraPost**, a production-ready AI-powered social media scheduling platform. Study the attached `README.md` and `CLAUDE.md` thoroughly — they are your source of truth for the tech stack, project structure, architectural rules, and coding conventions.

**Key files you will touch or reference in this prompt:**

| Surface      | Key Files                                                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Settings** | `src/components/settings/connected-x-accounts.tsx`, `src/components/settings/x-subscription-badge.tsx`                                 |
| **Composer** | `src/components/composer/composer.tsx`, `src/components/composer/target-accounts-select.tsx`, `src/components/composer/tweet-card.tsx` |
| **Sidebar**  | `src/components/dashboard/sidebar.tsx`, and the account switcher component (likely in `src/components/dashboard/`)                     |
| **Queue**    | `src/components/queue/` directory — specifically queue content, thread collapsible, and the failure tip banners                        |

---

## UX Design Principles — Apply to Every Phase

Follow these principles across all four surfaces. They are non-negotiable for this feature:

### 1. Progressive Disclosure

The badge is **secondary information** — it should be visible but never compete with primary content (account name, tweet text, character count). Use small visual indicators (colored dots) at rest, and reveal detail (tier name, what it means) only on hover/tap via tooltips.

### 2. Contextual Relevance

Only show information the user needs **at that moment**:

- In the **Composer**, the tier matters because it determines their character limit — so place the badge near the account selector where posting decisions are made.
- In the **Queue**, the tier matters only when a post fails due to character limits — so surface it inside the error context, not on every queue item.
- In the **Sidebar**, the tier helps distinguish between multiple accounts — so show it inline with each account name in the switcher.

### 3. Consistency

The `XSubscriptionBadge` component is the **single visual implementation**. Every surface renders the same component with the same colors, sizes, and tooltip behavior. Never recreate the badge inline with ad-hoc styles.

### 4. Non-Intrusive

- No modals, no banners, no alerts to announce the tier.
- No animation or pulsing on the badge — it's static information, not a notification.
- The badge should feel like it has always been part of the UI, not bolted on.

### 5. Accessibility

- Tooltips must be keyboard-accessible (focusable trigger element).
- Badge colors must not be the sole differentiator — the tooltip text provides the tier name for colorblind users.
- Use `aria-label` on the badge element describing the tier (e.g., `aria-label="X Premium subscriber"`).

### 6. Mobile-Friendly

- Touch targets must be at least 44×44px for the interactive tooltip trigger area, even if the badge itself is 8–12px.
- On mobile, tooltips should work via tap (not hover). Verify the shadcn/ui `Tooltip` component supports this — if not, use `Popover` as a fallback on touch devices.

---

## Implementation Phases

### Phase 1: Relocate Badge Component to Shared Location

**Current location:** `src/components/settings/x-subscription-badge.tsx`
**New location:** `src/components/ui/x-subscription-badge.tsx`

The badge will now be used in 4 different component directories (settings, composer, dashboard, queue). It belongs in `src/components/ui/` alongside other shared primitives.

**Steps:**

1. Move the file from `settings/` to `ui/`.
2. Update the import path in `src/components/settings/connected-x-accounts.tsx`.
3. Verify the component already supports the `size` prop (`"sm"` | `"md"`). If not, add it — `"sm"` (8px) for dense contexts like the sidebar, `"md"` (12px) for prominent contexts like the composer.
4. Add the `aria-label` prop based on tier:
   - `None` / `null` → `aria-label="Free X account"`
   - `Basic` → `aria-label="X Basic subscriber"`
   - `Premium` → `aria-label="X Premium subscriber"`
   - `PremiumPlus` → `aria-label="X Premium+ subscriber"`
5. Run `pnpm lint && pnpm typecheck`.

---

### Phase 2: Settings Page — Enhance Existing Integration

**File:** `src/components/settings/connected-x-accounts.tsx`

The badge was already integrated here in the previous phase. Enhance it:

1. **Update import** to the new path (`@/components/ui/x-subscription-badge`).
2. **Add "last checked" timestamp** — below or beside the badge, show a muted text like `"Checked 2h ago"` using the `x_subscription_tier_updated_at` value. Use relative time formatting (e.g., via `date-fns`'s `formatDistanceToNow`). This helps users understand data freshness.
3. **Refresh feedback** — when the user clicks the "Refresh" button and the tier changes (e.g., `None` → `Premium`), briefly highlight the badge with a subtle transition (`transition-all duration-300`) so the change is noticeable. No animation at rest.
4. **Edge case** — if `x_subscription_tier` is `null` (account connected before the feature existed and never refreshed), show the gray badge with tooltip text: `"Subscription status unknown — click Refresh to check"`.

---

### Phase 3: Composer — Account Selector Area

This is the highest-impact surface. Users compose content here and hit character limits here.

#### 3A: Add Badge to Target Account Selector

**File:** `src/components/composer/target-accounts-select.tsx`

This component lets users pick which X account(s) to publish from. Modify it to:

1. **Display the `XSubscriptionBadge`** (`size="sm"`) inline next to each account name in the dropdown/select options.
2. **Also display the badge** next to the currently selected account(s) in the collapsed/summary view of the selector.
3. Ensure the account data object passed to this component already includes `xSubscriptionTier` from the API response. If it doesn't, trace the data flow upstream and add the field.

**Layout guidance:**

```
[ @username ● ]    ← badge sits right after the username text, vertically centered
```

The dot is small enough that it doesn't disrupt the existing layout. It just adds a color signal.

#### 3B: Add Tier Context Near Character Counter

**File:** `src/components/composer/tweet-card.tsx`

The tweet card shows a character counter. This is where the 280-character tension lives. Add a **subtle tier-aware hint** near the character counter area:

1. **If the selected account has a paid tier** (Basic, Premium, Premium+): Show the badge (`size="sm"`) next to the character counter with tooltip: `"This account supports long posts (up to 25,000 characters)"`. This is informational only — the counter itself still enforces 280 in this phase.
2. **If the selected account is Free or unknown**: Show nothing extra — the existing 280-char experience is unchanged.
3. **If multiple accounts are selected with mixed tiers**: Show the badge of the _most restrictive_ account (Free trumps paid), with tooltip: `"Character limit is based on the most restrictive account selected"`.

**Important:** Do NOT change the character count logic, the validation, or the warning message. This phase only adds a visual indicator. The tooltip wording intentionally prepares the user for the next phase when limits will actually change.

#### 3C: Data Flow Verification

Trace the data path from API → composer component and ensure `xSubscriptionTier` is available:

1. Check how the composer loads X account data (likely via a Zustand store or direct API call).
2. Ensure the account data includes `xSubscriptionTier`. If the field isn't present, add it to the relevant API response and Zustand store type.
3. If the composer uses a different data source than the settings page, ensure both stay in sync.

Run `pnpm lint && pnpm typecheck` after this phase.

---

### Phase 4: Sidebar — Account Switcher

**Files:**

- `src/components/dashboard/sidebar.tsx`
- Account switcher component (check `src/components/dashboard/` for a file like `account-switcher.tsx` or similar — it may be inline in `sidebar.tsx`)

The sidebar contains an account switcher for users with multiple connected X accounts. Add the tier badge here so users can distinguish between their accounts at a glance.

#### 4A: Locate the Account Switcher

First, identify exactly where the account switcher renders:

- It may be a dropdown in the sidebar header.
- It may be a section within the sidebar navigation.
- On mobile, it may appear in the drawer header (the `vaul` DrawerPrimitive).

Read the existing code before modifying. Look for where `x_accounts` data is mapped into UI elements.

#### 4B: Add Badge to Each Account Entry

For each X account listed in the switcher:

1. **Display `XSubscriptionBadge`** (`size="sm"`) inline after the account username/display name.
2. **Layout:**

   ```
   @myaccount ●          ✓ (default)
   @workaccount ●
   ```

   The badge sits between the username and any trailing indicators (default account checkmark, etc.).

3. If the switcher shows the currently active account in a collapsed/summary state (e.g., just the avatar + name in the sidebar header), include the badge there too.

#### 4C: Mobile Drawer

**File:** Check `src/components/dashboard/sidebar.tsx` or related mobile drawer component.

The mobile navigation uses a swipe-to-close drawer with the user avatar in the header. If the active X account is displayed in the mobile drawer header:

1. Add the `XSubscriptionBadge` (`size="sm"`) next to the account name.
2. Ensure the tooltip trigger area meets the 44×44px touch target minimum. If the badge itself is too small, wrap it in a `<button>` or `<span>` with appropriate padding.

Run `pnpm lint && pnpm typecheck` after this phase.

---

### Phase 5: Queue Page — Contextual Error Enhancement

This is the most nuanced surface. The badge should **only appear when it adds value** — specifically when a post fails or shows a warning related to character limits.

#### 5A: Enhance the 280-Character Warning

**File:** Locate the component that renders the existing warning message:

> _"X Premium required for long posts. One or more of your tweets exceeds 280 characters..."_

This warning currently appears when any tweet in a post exceeds 280 characters. Enhance it:

1. **If the post's target X account has a paid tier** (Basic, Premium, Premium+): Modify the warning to include the badge and updated messaging:
   - Show the `XSubscriptionBadge` (`size="md"`) inline at the start of the message.
   - Change the message to: `"Your account (@username) supports long posts — this tweet will publish normally."` with a green/success tone (use shadcn `Alert` with `variant="default"` or a custom success variant).
   - This is **informational only** — the post still goes through the existing 280-char enforcement in this phase. The message is preparing the user for the next phase.

2. **If the post's target X account is Free**: Keep the existing warning exactly as-is, but prepend the gray `XSubscriptionBadge` (`size="md"`) to reinforce that the account is on the free tier.

3. **If the subscription tier is unknown** (`null`): Keep the existing warning as-is and append a subtle link: `"Not sure? Check your X subscription status in Settings."` linking to `/dashboard/settings`.

#### 5B: Enhance Contextual Failure Tip Banners

**File:** Check `src/components/queue/` for the failure tip banner components (the README mentions "Contextual failure tip banners — 401/403/rate-limit/duplicate").

When a post in the queue has failed and the failure reason is related to content length:

1. Add the `XSubscriptionBadge` to the failure banner alongside the account name.
2. If the account is Free: The banner should gently explain that the post exceeded the 280-character limit for free accounts.
3. If the account is paid: The banner should indicate that this failure is unexpected for a paid account and suggest refreshing the subscription status (link to Settings or trigger inline refresh).

#### 5C: Do NOT Add the Badge to Normal Queue Items

For posts in the queue that are pending, scheduled, or successfully published — do **not** show the subscription badge. It would add visual noise without value. The badge only appears in the queue context when there's a character-limit-related warning or error.

Run `pnpm lint && pnpm typecheck` after this phase.

---

### Phase 6: Verify Data Flow End-to-End

This is not a coding phase — it's a verification pass. Manually trace and confirm:

1. **Data source consistency:** All four surfaces (Settings, Composer, Sidebar, Queue) read `xSubscriptionTier` from the same underlying data source. If the Settings page refreshes the tier, the Composer and Sidebar should reflect the update without requiring a page reload.
   - If they use a shared Zustand store → confirm the store is updated after refresh.
   - If they each fetch independently → confirm they all call the same endpoint and cache/invalidate consistently.

2. **Multi-account edge cases:**
   - User has 2 accounts: one Free, one Premium → each shows its own correct badge everywhere.
   - User disconnects a Premium account → badge disappears, no stale data.
   - User connects a new account → tier is fetched automatically (from the previous implementation), badge appears.

3. **Null/unknown state:** Verify that accounts with `xSubscriptionTier: null` (connected before the feature existed) show the gray badge with the "unknown — click Refresh" tooltip consistently across all surfaces.

4. **Run the full check:**
   ```bash
   pnpm lint && pnpm typecheck && pnpm test
   ```

---

## Architectural Rules — MUST Follow

These rules come directly from the project's `CLAUDE.md` and `README.md`:

1. **`ApiError` for all error responses** — never `new Response(JSON.stringify(...))` or `NextResponse.json()` with error status codes.
2. **`db.transaction()` for multi-table writes** — if any phase requires writing to multiple tables, wrap in a transaction.
3. **`exactOptionalPropertyTypes`** — use `{...(val !== undefined && { prop: val })}` spread for optional props, never `prop={maybeUndefined}`.
4. **Server Components by default** — only add `"use client"` when the component needs client-side interactivity (which the badge will, due to tooltips).
5. **Tailwind + shadcn/ui color tokens** — use `bg-background`, `text-foreground`, etc. Support dark mode in every badge color.
6. **Structured logger** — use `@/lib/logger` for any new logging, not `console.log`.
7. **Run `pnpm lint && pnpm typecheck` after every phase** — fix any errors before moving on.
8. **Never start the dev server** — ask the user if you need runtime output.
9. **Read existing code first** — before modifying any component, read its current implementation to understand its props, data flow, and rendering patterns. Do not assume structure.

---

## What NOT To Do

- **Do NOT change character limit enforcement.** The composer must still validate against 280 characters for ALL users. This prompt only adds visual tier indicators.
- **Do NOT change the existing 280-character warning message text** for Free users — only enhance it with the badge and adjust messaging for paid users.
- **Do NOT add tier-based feature gating** (e.g., hiding features from Free users). That's a separate concern.
- **Do NOT add new API routes.** The routes from the previous phase (`GET /api/x/subscription-tier`, `POST /api/x/subscription-tier/refresh`) are sufficient. This prompt is purely frontend.
- **Do NOT add polling or background refresh** for the tier. It stays on-demand (manual refresh + fetch on account connection).
- **Do NOT install new npm packages.** Everything needed (Tooltip, Badge, date-fns) is already in the project.

---

## Deliverables Checklist

After implementation, verify each item:

- [x] **Badge relocated** to `src/components/ui/x-subscription-badge.tsx` — all existing imports updated
- [x] **`aria-label` added** to badge for all tier values
- [x] **Settings page** — badge import updated, "last checked" timestamp shown, transition on refresh, null-state tooltip
- [x] **Composer: account selector** — badge visible next to each account in dropdown and collapsed view
- [x] **Composer: character counter area** — tier hint shown for paid accounts, hidden for free, mixed-tier logic handles multiple accounts
- [x] **Sidebar: account switcher** — N/A (no X account switcher in sidebar - only team/workspace switcher)
- [x] **Mobile drawer** — N/A (no X account switcher in mobile drawer)
- [x] **Queue: 280-char warning** — badge and updated messaging for paid accounts, unchanged for free
- [x] **Queue: failure banners** — badge shown in character-limit-related failures only
- [x] **Queue: normal items** — no badge on pending/scheduled/published posts (clean)
- [x] **Data flow** — all 4 surfaces read from the same source, refresh in Settings propagates everywhere
- [x] **Dark mode** — badge colors are visible and distinguishable on dark backgrounds across all surfaces
- [x] **`pnpm lint && pnpm typecheck && pnpm test`** — all pass cleanly

---

## Summary

This implementation surfaces the X subscription tier badge across the four locations where it matters most:

| Surface      | When Visible                                              | Badge Size | Why It's Here                                            |
| ------------ | --------------------------------------------------------- | ---------- | -------------------------------------------------------- |
| **Settings** | Always (on connected accounts list)                       | `md`       | Primary place to manage and refresh tier status          |
| **Composer** | Always (on account selector + near char counter for paid) | `sm`       | Where character limit decisions are made                 |
| **Sidebar**  | Always (in account switcher)                              | `sm`       | Quick identification when switching between accounts     |
| **Queue**    | Only on character-limit warnings/errors                   | `md`       | Contextual explanation of why a post succeeded or failed |

The result is that users **always know their X tier** without ever needing to navigate to Settings — the information appears naturally wherever it's relevant, following the principle of progressive disclosure.

Implement all phases in order. Run `pnpm lint && pnpm typecheck` after each phase. Run `pnpm test` at the end to confirm nothing is broken.
