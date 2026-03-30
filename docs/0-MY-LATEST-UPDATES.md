# Latest Updates

## 2026-03-31: Dynamic Character Limits — Phase 8 Tests Fixed ✅

**Summary:** Fixed all failing Vitest tests for Phase 8 of the X Dynamic Character Limits feature. All 147 tests now pass.

**Root Cause:**
- Zod v4 (v4.3.6) uses a stricter UUID regex than v3 — it requires RFC-4122-compliant UUIDs with version `[1-8]` in position 3 and variant `[89ab]` in position 4.
- Test IDs like `00000000-0000-0000-0000-000000000001` (version `0`) fail this check.
- 4 tests in `src/app/api/ai/thread/__tests__/route.test.ts` were returning 400 (Zod parse error) instead of 403/200/404 because the `targetAccountId` field failed UUID validation before reaching the tier-check logic.

**Fixes applied:**
- Replaced invalid test UUIDs with proper v4-format UUIDs (`550e8400-e29b-41d4-a716-44665544000X`)
- Added 2 staleness tests: stale tier (>24h) triggers `fetchXSubscriptionTier()` re-fetch; fresh tier skips it
- Added `getMaxCharacterLimit()` tests to `src/lib/x-post-length.test.ts` (Phase 8B requirement)
- Fixed import order warnings and unused import TS error

**Files changed:**
- `src/app/api/ai/thread/__tests__/route.test.ts` (UUID fix + staleness tests)
- `src/lib/x-post-length.test.ts` (added `getMaxCharacterLimit` tests)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅ `pnpm test` ✅ (147 tests / 14 files)
**All phases of X Dynamic Character Limits & AI Length Options are now complete.**

---

## 2026-03-31: Dynamic Character Limits — Phase 8 Complete ✅

**Summary:** Completed Phase 8 (Update Documentation) — reviewed existing documentation and added user-facing help text about tier limits.

**Phase 8A — Documentation Review:**
- Reviewed implementation plan for remaining documentation updates
- Found no dedicated API documentation files in the codebase (API routes are self-documenting via TypeScript)
- Verified existing UI components already have appropriate tier-related help text:
  - `ai-length-selector.tsx`: Has tooltip "Requires X Premium subscription" for disabled options
  - `composer.tsx`: Has tier-aware alerts for long posts (success for Premium, warning for Free)
  - `tweet-card.tsx`: Has length zone labels ("Short post", "Medium post", "Long post") and 280 milestone marker

**Phase 8B — User-Facing Help Text:**
- Added help text info box to `connected-x-accounts.tsx` in Settings page
- Explains character limits: Free X accounts = 280 chars, X Premium = 2,000 chars
- Describes tier badge meaning and refresh functionality

**Files changed:**
- `src/components/settings/connected-x-accounts.tsx` (added tier limits help text)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅
**Next:** All 8 phases complete — X Dynamic Character Limits feature fully implemented

---

## 2026-03-31: Dynamic Character Limits — Phase 7 Complete ✅

**Summary:** Implemented Phase 7 (Update Existing Warning & Error Messages) to add Queue page failure banners for TIER_LIMIT_EXCEEDED errors with contextual UI.

**Phase 7A — TIER_LIMIT_EXCEEDED Detection:**
- Updated `getFailureTip()` function in `queue-content.tsx` to detect `tier_limit_exceeded` errors
- Added `isTierLimit` flag to identify tier-specific failures
- Returns the full error message with contextual guidance

**Phase 7B — XSubscriptionBadge Integration:**
- Shows `XSubscriptionBadge` (gray for Free tier) next to tier limit error messages
- Visual indicator of the account's current subscription status
- Tooltip shows tier label on hover

**Phase 7C — Action Buttons for Tier Errors:**
- Added "Edit Post" button linking to compose page with draft preloaded
- Added "Convert to Thread" button (only for single posts, not threads)
- Buttons styled with destructive border to match error context

**Phase 7D — Tier Downgrade Toast Notifications:**
- Updated `NotificationBell` component to show toast for `tier_downgrade_warning` notifications
- Uses `toast.warning()` with "View Queue" action button
- Tracks seen notification IDs to prevent duplicate toasts

**Files changed:**
- `src/components/queue/queue-content.tsx` (failure tip detection, action buttons)
- `src/components/dashboard/notification-bell.tsx` (tier downgrade toast)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅
**Next:** Phase 8 — Update Documentation (if any remaining docs need updates)

---

## 2026-03-31: Dynamic Character Limits — Phase 6 Complete ✅

**Summary:** Implemented Phase 6 (Pre-Publish Tier Verification) to prevent publishing content that exceeds the account's X subscription tier limit.

**Phase 6A — Pre-Publish Tier Check:**
- Added tier verification in `scheduleProcessor` before publishing
- Checks each tweet's content length against the account's tier limit:
  - Free X accounts: 280 characters max
  - X Premium (Basic/Premium/PremiumPlus): 2,000 characters max
- Uses `canPostLongContent()` helper from `x-subscription.ts`

**Phase 6B — TIER_LIMIT_EXCEEDED Error Handling:**
- When content exceeds tier limit, the job fails gracefully with:
  - Post status set to `failed` with descriptive `failReason`
  - Job run record created with `failed` status
  - User notification created with error details
  - `UnrecoverableError` thrown to prevent retries
- Error data includes: `code`, `message`, `postLength`, `accountTier`, `maxAllowed`

**Phase 6C — Tier Downgrade Notifications (Already Implemented):**
- The `refreshXTiersProcessor` already handles tier downgrades
- When tier drops from Premium to Free, checks for scheduled posts exceeding 280 chars
- Creates `tier_downgrade_warning` notification for affected users
- Lists oversized post IDs in notification metadata

**Files changed:**
- `src/lib/queue/processors.ts` (pre-publish tier verification)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅
**Next:** Phase 7 — Update Existing Warning & Error Messages (Queue page failure banners for TIER_LIMIT_EXCEEDED)

---

## 2026-03-30: Dynamic Character Limits — Phase 5 Complete ✅

**Summary:** Verified Phase 5 (BullMQ Recurring Job) was already fully implemented. Fixed minor import order warning in processors.ts.

**Phase 5 — BullMQ Recurring Job (Already Implemented):**
- `RefreshXTiersJobPayload` interface defined in `src/lib/queue/client.ts`
- `xTierRefreshQueue` created in `src/lib/queue/client.ts`
- `refreshXTiersProcessor` fully implemented in `src/lib/queue/processors.ts`:
  - Staleness check: finds accounts where `tier_updated_at` is null or >24h old
  - Calls `fetchXSubscriptionTier()` for each stale account
  - Detects tier downgrades and creates user notifications
  - Handles 401 auth errors gracefully (marks account for re-auth)
  - Batch delay (500ms) to avoid X API rate limits
  - Logs summary: total, refreshed, skipped, errors
- `xTierRefreshWorker` created in `scripts/worker.ts`
- Repeatable job scheduled at 4 AM UTC daily (`0 4 * * *` cron pattern)
- Event handlers for completed/error/failed jobs

**Bug Fix:**
- Fixed import order warning in `processors.ts` (moved type import before regular imports)

**Files changed:**
- `src/lib/queue/processors.ts` (import order fix)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅
**Next:** Phase 6 — Pre-Publish Tier Verification (verify character count against current tier before publishing)

---

## 2026-03-30: Dynamic Character Limits — Phase 4 Complete ✅

**Summary:** Implemented Phase 4 of the X Dynamic Character Limits & AI Length Options plan. Added AiLengthSelector to the AI Writer page with Thread/Single Post mode toggle.

**Phase 4A — AiLengthSelector Component:**
- Component already existed at `src/components/composer/ai-length-selector.tsx`
- Segmented control (Short/Medium/Long) with lock icons for Free X users
- Reused in AI Writer page without changes

**Phase 4B — Composer Integration:**
- Already integrated in composer AI panel (single-post mode only)

**Phase 4C — AI Writer Page Integration:**
- Added Thread/Single Post mode toggle to `/dashboard/ai/writer` Thread tab
- Thread mode: shows Thread Length slider (3–15 tweets)
- Single Post mode: shows AiLengthSelector (Short/Medium/Long)
- Fetches user's X subscription tier from `/api/accounts` on mount
- Sends `mode`, `lengthOption`, and `targetAccountId` in API request
- Handles single-post response (plain text) vs thread response (SSE stream)
- Single-post results show one text area with dynamic character counter
- Button text changes: "Generate Thread" vs "Generate Post"

**Bug Fix:**
- Removed duplicate `isSinglePost` const declaration in `composer.tsx` (pre-existing TS2451 error)

**Files changed:**
- `src/app/dashboard/ai/writer/page.tsx` (mode toggle, AiLengthSelector, single-post handling)
- `src/components/composer/composer.tsx` (removed duplicate variable declaration)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅
**Next:** Phase 5 — BullMQ recurring job for daily tier refresh

---

## 2026-03-30: X Subscription Badge UI Expansion — Phase 5 Complete ✅

**Summary:** Implemented Phase 5 of the X Subscription Badge UI Expansion plan. Enhanced queue page with contextual error messaging for character-limit failures.

**Phase 5A — 280-Character Warning Enhancement:**
- Added success Alert for paid users with long posts in `composer.tsx`
- Shows `XSubscriptionBadge` with green/success styling
- Message: "Your account (@username) supports long posts — this will publish normally with up to 25,000 characters"
- Uses `CheckCircle2` icon for positive feedback

**Phase 5B — Queue Failure Banners:**
- Updated `queue/page.tsx` to include `xAccount` relation with `xSubscriptionTier` for all post queries (scheduled, failed, awaiting_approval)
- Enhanced `getFailureTip()` in `queue-content.tsx` to detect character-limit errors
- Added `isCharLimit` flag to failure tip return type
- Shows `XSubscriptionBadge` in failure banner for character-limit errors
- Different messaging for paid vs free accounts:
  - Paid: "This post failed despite your paid subscription. Try refreshing your subscription status in Settings."
  - Free: "This post exceeds the 280-character limit for free X accounts. Edit the content or upgrade to X Premium for long posts."
- Added `@username` display in failed post cards

**Phase 6 — Data Flow Verification:**
- Verified all surfaces read `xSubscriptionTier` from consistent data sources
- Settings page: reads from API response, updates via refresh
- Composer: reads from `/api/accounts` response
- Queue: reads from database relations via `xAccount.xSubscriptionTier`

**Files changed:**
- `src/components/composer/composer.tsx` (success alert for paid users)
- `src/app/dashboard/queue/page.tsx` (added xAccount relation to queries)
- `src/components/queue/queue-content.tsx` (character-limit failure detection + badge)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅
**Next:** Feature complete! All phases of X Subscription Badge UI Expansion implemented.

---

## 2026-03-30: X Subscription Badge UI Expansion — Phase 3 Complete ✅

**Summary:** Implemented Phase 3 of the X Subscription Badge UI Expansion plan. Added tier context to the Composer component.

**Phase 3A — Account Selector Badge:**
- Added `xSubscriptionTier` to `/api/accounts` response for Twitter accounts
- Extended `SocialAccountLite` type with `xSubscriptionTier` field
- Added badge display in selected label (single account view)
- Added badge display in dropdown items
- Wrapped component with `TooltipProvider` for hover tooltips

**Phase 3B — Character Counter Tier Context:**
- Added `tier` prop to `TweetCard` component
- Character counter now shows dynamic limit based on tier (280 or 25,000)
- Added `XSubscriptionBadge` next to character counter for paid accounts
- Updated warning alert to only show when user lacks paid tier
- Tier flows from Composer → SortableTweet → TweetCard

**Files changed:**
- `src/app/api/accounts/route.ts` (added `xSubscriptionTier` to response)
- `src/components/composer/target-accounts-select.tsx` (badge in selector)
- `src/components/composer/tweet-card.tsx` (tier-aware character counter)
- `src/components/composer/sortable-tweet.tsx` (pass tier prop)
- `src/components/composer/composer.tsx` (derive tier from selected account)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅
**Next:** Phase 4 — Add badge to Sidebar account switcher

---

## 2026-03-30: X Subscription Tier Detection — Phase 7 Complete ✅

**Summary:** Implemented Phase 7 of the X Subscription Tier Detection feature. Added Vitest tests for helper functions, Zod schema, and API response parsing.

**Test Coverage:**

1. **Helper Function Tests (`src/lib/services/x-subscription.test.ts`):**
   - `canPostLongContent()` — 6 tests (None, null, undefined, Basic, Premium, PremiumPlus)
   - `getMaxCharacterLimit()` — 6 tests (returns 280 or 25,000 based on tier)
   - `getTierLabel()` — 6 tests (human-readable labels for all tiers)

2. **Zod Schema Validation Tests:**
   - `xSubscriptionTierEnum` — 8 tests (valid values, invalid values, null handling)

3. **API Response Parsing Tests (`src/lib/services/x-api.test.ts`):**
   - Returns correct tier for Premium, Basic, PremiumPlus
   - Returns "None" for missing/null subscription_type
   - Throws `X_SESSION_EXPIRED` on 401 response
   - Throws `X_RATE_LIMITED` on 429 response
   - Throws generic error on other HTTP errors

**Files changed:**
- `src/lib/services/x-subscription.test.ts` (new file)
- `src/lib/services/x-api.test.ts` (updated)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅ `pnpm test` ✅ (26 new tests pass)
**Next:** Feature complete! Ready for integration with composer character limit logic.

---

## 2026-03-30: X Subscription Tier Detection — Phase 6 Complete ✅

**Summary:** Implemented Phase 6 of the X Subscription Tier Detection feature. Added Zod schema and helper functions for subscription tier handling.

**Zod Schema:**
- Added `xSubscriptionTierEnum` to `src/lib/schemas/common.ts`
- Enum values: `"None"`, `"Basic"`, `"Premium"`, `"PremiumPlus"`
- Exported `XSubscriptionTier` type via `z.infer`

**Helper Functions (`src/lib/services/x-subscription.ts`):**
- `canPostLongContent(tier)` — Returns `true` for Basic, Premium, PremiumPlus
- `getMaxCharacterLimit(tier)` — Returns 25,000 for paid tiers, 280 for free
- `getTierLabel(tier)` — Returns human-readable label for display

**Files changed:**
- `src/lib/schemas/common.ts` (updated)
- `src/lib/services/x-subscription.ts` (new file)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅
**Next:** Phase 7 — Add Vitest tests for helper functions and Zod schema

---

## 2026-03-30: X Subscription Tier Detection — Phase 5 Complete ✅

**Summary:** Implemented Phase 5 of the X Subscription Tier Detection feature. Created the `XSubscriptionBadge` component and integrated it into the connected X accounts list.

**Component Features:**
- Small colored circle indicator (8px for `sm`, 12px for `md`)
- Tooltip on hover showing tier label
- Supports all 4 tiers + null:
  - Gray (`bg-muted-foreground/40`) for None/null — "Free X account"
  - Yellow (`bg-yellow-500`) for Basic — "X Basic subscriber"
  - Blue (`bg-blue-500`) for Premium — "X Premium subscriber ✓"
  - Blue with gold ring (`bg-blue-500 ring-2 ring-yellow-400`) for PremiumPlus — "X Premium+ subscriber ✓✓"
- Loading state with animated pulse
- Dark mode compatible via Tailwind CSS

**Integration:**
- Badge displays next to account display name
- Refresh button (RefreshCw icon) to manually refresh tier
- Auto-fetches missing tiers on component mount
- Uses `TooltipProvider` from shadcn/ui

**Files changed:**
- `src/components/settings/x-subscription-badge.tsx` (new file)
- `src/components/settings/connected-x-accounts.tsx` (updated)
- `src/app/api/x/accounts/route.ts` (updated to return tier fields)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅
**Next:** Phase 6 — Add Zod schema (`xSubscriptionTierEnum`) and helper functions

---

## 2026-03-30: X Subscription Tier Detection — Phase 4 Complete ✅

**Summary:** Implemented Phase 4 of the X Subscription Tier Detection feature. Created the POST `/api/x/subscription-tier/refresh` API route for batch refresh.

**Route Features:**
- Validates user authentication via Better Auth session
- Validates ownership of all requested account IDs
- Accepts `accountIds` array in request body (1-10 accounts, UUID validated with Zod)
- 15-minute cooldown per account to prevent API spam
- Sequential processing to respect X API rate limits
- Returns detailed results per account with status

**Response Shape:**
```json
{
  "results": [
    {
      "accountId": "uuid-1",
      "tier": "Premium",
      "updatedAt": "2026-03-30T12:00:00.000Z",
      "status": "refreshed"
    },
    {
      "accountId": "uuid-2",
      "tier": "Basic",
      "updatedAt": "2026-03-30T11:30:00.000Z",
      "status": "skipped_cooldown"
    }
  ],
  "summary": {
    "total": 2,
    "refreshed": 1,
    "skipped": 1,
    "errors": 0
  }
}
```

**Files changed:**
- `src/app/api/x/subscription-tier/refresh/route.ts` (new file)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅
**Next:** Phase 5 — Create `XSubscriptionBadge` component and integrate into UI

---

## 2026-03-30: X Subscription Tier Detection — Phase 3 Complete ✅

**Summary:** Implemented Phase 3 of the X Subscription Tier Detection feature. Created the GET `/api/x/subscription-tier` API route.

**Route Features:**
- Validates user authentication via Better Auth session
- Validates account ownership (user must own the X account)
- Accepts `accountId` query parameter (UUID validated with Zod)
- Returns tier from DB if fresh (< 24 hours old)
- Fetches fresh tier from X API if missing or stale
- Graceful fallback to cached tier on rate limit or API errors
- Uses `ApiError` class for consistent error responses

**Response Shape:**
```json
{
  "tier": "Premium",
  "updatedAt": "2026-03-30T12:00:00.000Z",
  "fresh": true
}
```

**Files changed:**
- `src/app/api/x/subscription-tier/route.ts` (new file)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅
**Next:** Phase 4 — Create POST `/api/x/subscription-tier/refresh` route

---

## 2026-03-30: X Subscription Tier Detection — Phase 2 Complete ✅

**Summary:** Implemented Phase 2 of the X Subscription Tier Detection feature. Added the `fetchXSubscriptionTier()` method to the X API service.

**Methods Added:**
- `getSubscriptionTier()` — Instance method that calls X API v2 `/2/users/me?user.fields=subscription_type`
- `fetchXSubscriptionTier(accountId)` — Static method that orchestrates the full flow: lookup account, decrypt token, refresh if needed, fetch tier, update DB

**Error Handling:**
- `401` → throws `"X_SESSION_EXPIRED"`
- `429` → throws `"X_RATE_LIMITED"`
- Other errors → throws `"X_API_ERROR:{status}"`

**Files changed:**
- `src/lib/services/x-api.ts` (added `getSubscriptionTier()` and `fetchXSubscriptionTier()` methods)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅
**Next:** Phase 3 — Create GET `/api/x/subscription-tier` route

---

## 2026-03-30: X Subscription Tier Detection — Phase 1 Complete ✅

**Summary:** Implemented Phase 1 of the X Subscription Tier Detection feature. Added database schema changes to track X subscription tiers for connected accounts.

**Schema Changes:**
- Added `xSubscriptionTier` column to `x_accounts` table (text, default 'None')
- Added `xSubscriptionTierUpdatedAt` column to `x_accounts` table (timestamp)
- Migration generated: `drizzle/0037_naive_dreaming_celestial.sql`
- Migration applied successfully

**Tier Values:** `"None"`, `"Basic"`, `"Premium"`, `"PremiumPlus"`

**Files changed:**
- `src/lib/schema.ts` (added two new columns to xAccounts table)
- `drizzle/0037_naive_dreaming_celestial.sql` (generated migration)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅ `pnpm db:migrate` ✅
**Next:** Phase 2 — Add `fetchXSubscriptionTier()` method to `x-api.ts`

---

## 2026-03-30: Bug Fix — Hydration Mismatch in Composer Component ✅

**Summary:** Fixed React hydration mismatch error in the Composer component's user avatar display.

**Issue:** The `userImage` variable was derived from `selectedAccount?.avatarUrl || session?.user?.image`, where `selectedAccount` comes from `accounts` state that is populated asynchronously via `fetch("/api/accounts")`. On the server, `accounts` is empty, so `userImage` is `undefined`. On the client after hydration, the fetch completes and `userImage` gets a value. This caused React to render a fallback `<div>` on the server but an `<Image>` component on the client, triggering a hydration mismatch error.

**Fix:** Added a `mounted` state that is `false` on initial render (both server and client hydration). The `userImage` is set to `null` until `mounted` is `true`, ensuring consistent rendering between server and client. After the component mounts, the actual image URL is used.

**Files changed:**
- `src/components/composer/composer.tsx` (added `mounted` state, updated `userImage` derivation)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅

## 2026-03-30: Bug Fix — ARIA Attribute Value in Mobile Menu ✅

**Summary:** Fixed invalid ARIA attribute value error in mobile-menu.tsx.

**Issue:** The `aria-expanded` attribute was receiving a boolean value directly (`aria-expanded={isOpen}`), which violates ARIA accessibility requirements.

**Fix:** Changed `aria-expanded={isOpen}` to `aria-expanded={isOpen ? "true" : "false"}` to use explicit string values.

**Files changed:**
- `src/components/mobile-menu.tsx`

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅

## 2026-03-29: Phase 9 — Final Verification & Cleanup ✅

**Summary:** Completed Phase 9 final codebase sweep and dead code cleanup. All automated checks pass.

**Full Codebase Sweep Results:**
- No remaining references to `sign-up-form`, `forgot-password-form`, `reset-password-form`, `SecuritySettings`
- No remaining `/register`, `/forgot-password`, `/reset-password` href links
- CLAUDE.md already clean (no references to deleted components)

**Dead Code Cleanup:**
- Removed `sendVerificationEmail` and `sendResetPasswordEmail` functions from `src/lib/services/email.ts`
- Removed unused imports `VerificationEmail` and `ResetPasswordEmail` from `services/email.ts`
- Deleted orphaned `src/components/email/verification-email.tsx`
- Deleted orphaned `src/components/email/reset-password-email.tsx`
- `sendTeamInvitationEmail`, `sendBillingEmail`, `sendPostFailureEmail`, and `PostFailureEmail` component remain (still in use)

**Files changed:**
- `src/lib/services/email.ts` (removed dead functions)
- `docs/features/x-oauth-only-auth.md` (Phase 9 progress + post-implementation checklist updated)

**Files deleted:**
- `src/components/email/verification-email.tsx`
- `src/components/email/reset-password-email.tsx`

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅
**Manual testing** (requires dev server + real X OAuth):
- [ ] New user sign-in via X OAuth → dashboard
- [ ] Existing email/password user sign-in via X OAuth with matching email → existing data preserved
- [ ] OAuth denial → friendly error message on login page
- [ ] Mobile login page responsive and usable

## 2026-03-29: Phase 8 — Existing User Migration (Auto-Linking) ✅

**Summary:** Completed Phase 8 by investigating Better Auth's account-linking-by-email behavior and adding the one-line `accountLinking.trustedProviders` config to enable automatic migration.

**Investigation Findings:**
- Better Auth's `findOAuthUser()` in `internal-adapter.mjs` first checks by OAuth accountId+providerId, then falls back to finding a user by email
- If a user is found by email but not linked, it calls `linkAccount()` — but only if the provider is in `trustedProviders` OR `userInfo.emailVerified` is true
- X OAuth doesn't set `emailVerified` → requires adding `twitter` to `trustedProviders`

**Implementation:**
- Added `accountLinking: { trustedProviders: ["twitter"] }` to `src/lib/auth.ts`
- When an existing email/password user signs in with X OAuth using the same email, Better Auth automatically links the Twitter account to the existing user record
- All existing posts and data are preserved (userId stays the same)
- No custom migration code needed — Better Auth handles it natively

**Files changed:**
- `src/lib/auth.ts` (added `accountLinking.trustedProviders`)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅
**Next:** Phase 9 — Final Verification & Cleanup (full codebase sweep, update CLAUDE.md, manual testing)

## 2026-03-29: Phases 2, 6, 7 — Login Redesign + Marketing Links + OAuth Errors ✅

**Summary:** Completed Phase 2 (Login Page Redesign), Phase 6 (Marketing Site Link Cleanup), and Phase 7 (OAuth Error Handling) of the X OAuth-only auth migration.

**Phase 2 - Login Page Redesign:**
- Redesigned `src/app/(auth)/login/page.tsx` with clean value proposition: "Sign in with X to get started"
- Added bullet list of 3 features (schedule, AI writer, analytics)
- Added OAuth error display via `getErrorMessage()` function mapping `searchParams.error` codes
- Added legal links (Terms of Service, Privacy Policy)
- Removed all email/password form elements, "Forgot password", "Don't have an account?" links
- Fully responsive mobile-first design

- Rewrote `src/components/auth/sign-in-button.tsx` to X OAuth only:
  - Removed all email/password state, form elements, "Or continue with" divider
  - X button styled with official black background + white X icon
  - Loading spinner state while redirecting
  - Local error state for redirect failures

**Phase 6 - Marketing Site Link Cleanup:**
- `src/components/site-header.tsx`: "Get Started" → `/login`
- `src/components/mobile-menu.tsx`: "Get Started Free" → `/login`
- `src/components/auth/user-profile.tsx`: "Sign up" → `/login`
- `src/app/(marketing)/page.tsx`: Both hero + CTA section CTAs → `/login`
- `src/app/(marketing)/features/page.tsx`: CTA → `/login`
- `src/app/(marketing)/pricing/page.tsx`: CTA → `/login`

**Phase 7 - OAuth Error Handling (already integrated into Phase 2):**
- `access_denied` → "You need to authorize AstroPost to access your X account to continue."
- `server_error` → "X is currently unavailable. Please try again in a few minutes."
- `callback_error` → "Sign-in failed. Please try again."
- `email_not_found` → "We couldn't get your email from X..."
- Error display uses `role="alert"` + `text-destructive` for accessibility

**Files changed:**
- `src/app/(auth)/login/page.tsx` (redesigned)
- `src/components/auth/sign-in-button.tsx` (simplified)
- `src/components/site-header.tsx`
- `src/components/mobile-menu.tsx`
- `src/components/auth/user-profile.tsx`
- `src/app/(marketing)/page.tsx`
- `src/app/(marketing)/features/page.tsx`
- `src/app/(marketing)/pricing/page.tsx`
- `docs/features/x-oauth-only-auth.md` (progress updated)

**Status:** `pnpm lint` ✅ `pnpm typecheck` ✅
**Next:** Phase 8 — Existing User Migration Helper (investigate Better Auth account-linking-by-email behavior)

## 2026-03-29: Phase 1, 2 & 3 - Roadmap Moderation Feature COMPLETE ✅

**Phase 1 - Backend:**
- Schema changes: `feedbackStatusEnum` changed to `["pending", "approved", "rejected"]`, added `adminNotes` and `reviewedAt` columns
- Database migration applied
- Rate limiting on feedback submission (max 3/day)
- Admin API routes created at `/api/admin/roadmap`

**Phase 2 - Public Page Redesign:**
- Created `submission-form.tsx` component with authentication check
- Redesigned public roadmap page to show only submission form
- Non-authenticated users see sign-in prompt
- Success toast message after submission
- Removed all feedback list/voting UI

**Phase 3 - Admin Roadmap Management:**
- Created admin roadmap page at `/admin/roadmap`
- Implemented tab filters (Pending/Approved/Rejected/All) with counts
- Search by title or description
- View Details, Approve, Reject (with notes), Delete actions
- Bulk select and bulk approve/reject
- Added Roadmap entry to admin sidebar

**Files changed:**
- `src/lib/schema.ts`
- `src/app/api/feedback/route.ts`
- `src/app/api/feedback/[id]/upvote/route.ts`
- `src/app/(marketing)/roadmap/page.tsx`
- `src/components/roadmap/submission-form.tsx` (new)
- `src/app/api/admin/roadmap/route.ts` (new)
- `src/app/api/admin/roadmap/[id]/route.ts` (new)
- `src/app/api/admin/roadmap/[id]/delete/route.ts` (new)
- `src/app/api/admin/roadmap/bulk/route.ts` (new)
- `src/app/admin/roadmap/page.tsx` (new)
- `src/components/admin/roadmap/roadmap-table.tsx` (new)
- `src/components/admin/sidebar.tsx`
- `docs/features/roadmap-moderation-progress.md` (new)

---

## 2026-03-28: Fixed Server Component Render Error (Enum Caching)

**Files changed:**
- `src/app/dashboard/queue/page.tsx`
- `src/lib/queue/processors.ts`

**What changed:**
- **Bypassed Postgres Enum Cache:** Addressed the persistent "invalid input value for enum post_status" error causing the `/dashboard/queue` page to crash in production. Even after the database migration was applied, connection poolers (like PgBouncer used by Supabase/Neon) cache enum definitions. When the server component queried `inArray(posts.status, ["failed", "paused_needs_reconnect"])`, the pooler rejected the new value.
- Modified the Drizzle query in `page.tsx` to cast the column to text before comparison: `sql`${posts.status}::text IN ('failed', 'paused_needs_reconnect')``. This completely bypasses the strict enum validation and resolves the Server Component 500 error.
- Added a similar defensive cast in `processors.ts` when the background worker updates the post status, preventing the worker from crashing due to the same stale enum cache issue.

---

## 2026-03-28: Fixed Queue Dashboard Error (Missing Migration)

**Files changed:**
- `drizzle/0034_rainy_runaways.sql`
- `drizzle/meta/_journal.json`

**What changed:**
- **Generated Database Migration:** The previous update added `paused_needs_reconnect` to the `post_status` enum in `schema.ts`, but a database migration was missing. This caused a Next.js Server Component render error (`invalid input value for enum post_status: "paused_needs_reconnect"`) on the `/dashboard/queue` page in production.
- Ran `pnpm db:generate` to create the missing migration (`drizzle/0034_rainy_runaways.sql`).
- Once this change is pushed and deployed, Vercel will automatically run `pnpm db:migrate` during the build process, which will add the missing enum value to the PostgreSQL database and fix the crash.

---

## 2026-03-28: Unified OAuth Flow & Resilient Background Posting

**Files changed:**
- `src/lib/auth.ts`
- `src/lib/schema.ts`
- `src/lib/queue/processors.ts`
- `src/lib/services/x-api.ts`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/queue/page.tsx`
- `src/components/dashboard/token-warning-banner.tsx` (new)
- `src/components/onboarding/onboarding-wizard.tsx`
- `src/components/settings/connected-x-accounts.tsx`
- `src/components/queue/queue-content.tsx`

**What changed:**
- **Unified Single OAuth Flow:** Modified `better-auth` configuration in `auth.ts` to seamlessly write OAuth tokens directly to the `xAccounts` table on every login via `databaseHooks.account.create.after` and `update.after`. The separate "Connect X Account" flow is deprecated.
- **Resilient Token Refresh:** Updated `refreshWithLock` in `x-api.ts` to execute the token update inside a strict database transaction to prevent single-use refresh token loss. Added fingerprint logging for auditability.
- **Retry Policy for Authorization Failures:** The background worker (`scheduleProcessor`) no longer marks posts as permanently `failed` upon OAuth token expiration (400/401 errors). It now marks the `xAccounts` connection as inactive, sets the post status to `paused_needs_reconnect`, and leverages BullMQ's `DelayedError` to retry in 1 hour.
- **Global Error State:** Added `<TokenWarningBanner>` to the dashboard layout. If an inactive account is detected, a prominent warning alerts the user to reconnect their account immediately.
- **Queue UI Updates:** `paused_needs_reconnect` posts now appear under "Failed Posts" with a yellow "Waiting for reconnection" badge.
- **Onboarding Cleanup:** Removed the now-redundant "Connect X" step from the onboarding wizard, simplifying the process from 5 steps to 4.