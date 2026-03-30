# Latest Updates

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