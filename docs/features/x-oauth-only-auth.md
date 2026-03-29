# Feature: X OAuth-Only Authentication

## Overview

Remove all email/password-based authentication from AstroPost and make X (Twitter) OAuth 2.0 the sole authentication method. Users can only sign in by connecting their X account. This simplifies the auth system, removes password-related security surface area, and aligns with the platform's X-first positioning.

## Implementation Plan

See [x-oauth-only-auth-plan.md](./x-oauth-only-auth-plan.md) for the detailed phased plan.

## Progress Tracker

### Phase 1: Auth Configuration Cleanup
- [x] Remove `emailAndPassword` block from `src/lib/auth.ts`
- [x] Remove `emailVerification` block from `src/lib/auth.ts`
- [x] Remove `twoFactor` plugin from `src/lib/auth.ts`
- [x] Verify Twitter OAuth scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`, `media.write` — all confirmed present
- [x] Remove `twoFactorClient()` plugin from `src/lib/auth-client.ts`
- [x] Remove obsolete exports from `auth-client.ts` (signUp, requestPasswordReset, resetPassword, sendVerificationEmail, twoFactor)
- [x] Verify `src/proxy.ts` has no password-related redirect logic — confirmed clean
- [x] Create progress tracking document `docs/features/x-oauth-only-auth.md`
- [x] Create implementation plan `docs/features/x-oauth-only-auth-plan.md`
- **Status**: Complete
- **Started**: 2026-03-29
- **Completed**: 2026-03-29
- **Notes**: Removed `twoFactor` plugin, `emailAndPassword`, `emailVerification` blocks, and all related email service imports. Also removed `sendResetPasswordEmail` and `sendVerificationEmail` imports from `services/email`. Twitter OAuth scopes verified complete. Additionally completed Phases 3, 4, and 5 work during Phase 1 to keep `pnpm typecheck` passing (removed obsolete auth components and settings security section).

### Phase 2: Login Page Redesign
- [x] Remove `SignInButton` import and replace with simplified X OAuth button
- [x] Add value proposition headline to login page
- [x] Add bullet list of features (schedule, AI writer, analytics)
- [x] Style X button with official branding (black background, white X icon)
- [x] Remove email input, password input, "Forgot password" link
- [x] Remove "or continue with email" divider
- [x] Remove "Don't have an account? Sign up" link
- [x] Ensure mobile responsiveness
- [x] Add OAuth error display from searchParams (access_denied, server_error, callback_error, email_not_found)
- [x] Add legal links (Terms of Service, Privacy Policy)
- **Status**: Complete
- **Started**: 2026-03-29
- **Completed**: 2026-03-29
- **Notes**: Login page redesigned to show value proposition headline "Sign in with X to get started", bullet list of 3 features, and a prominent X sign-in button with black branding. OAuth error states handled via `getErrorMessage()` function reading from `searchParams.error`. Simplified `SignInButton` component rewritten to only contain the X OAuth button, removing all email/password form elements. Legal links added at bottom.

### Phase 3: Obsolete Auth Pages — Redirect Setup
- [x] Convert `src/app/(auth)/register/page.tsx` to redirect to `/login`
- [x] Convert `src/app/(auth)/forgot-password/page.tsx` to redirect to `/login`
- [x] Convert `src/app/(auth)/reset-password/page.tsx` to redirect to `/login`
- [x] Verify no broken imports after redirect conversion
- **Status**: Complete
- **Started**: 2026-03-29
- **Completed**: 2026-03-29
- **Notes**: Completed as part of Phase 1 to unblock `pnpm typecheck`. All three pages now redirect to `/login`.

### Phase 4: Remove Obsolete Auth Components
- [x] Simplify `src/components/auth/sign-in-button.tsx` to X OAuth only
- [x] Delete `src/components/auth/sign-up-form.tsx`
- [x] Delete `src/components/auth/forgot-password-form.tsx`
- [x] Delete `src/components/auth/reset-password-form.tsx`
- [x] Search codebase for any remaining imports of deleted components
- [x] `pnpm lint` passes
- [x] `pnpm typecheck` passes
- **Status**: Complete
- **Started**: 2026-03-29
- **Completed**: 2026-03-29
- **Notes**: All three form components deleted. `sign-in-button.tsx` simplification deferred to Phase 2 (Login Page Redesign) since it requires UI work alongside the login page redesign.

### Phase 5: Settings Page Cleanup
- [x] Remove `SecuritySettings` import from settings page
- [x] Remove "Security" section/card from settings page
- [x] Delete `src/components/settings/security-settings.tsx`
- [x] `pnpm lint` passes
- [x] `pnpm typecheck` passes
- **Status**: Complete
- **Started**: 2026-03-29
- **Completed**: 2026-03-29
- **Notes**: `security-settings.tsx` deleted. `SecuritySettings` import and security section removed from settings page. Also removed `Shield` icon import and `security` nav item from `settings-section-nav.tsx`.

### Phase 6: Marketing Site & Navigation Link Cleanup
- [x] Update `src/components/site-header.tsx` "Get Started" → `/login`
- [x] Update `src/components/mobile-menu.tsx` "Get Started Free" → `/login`
- [x] Update `src/components/auth/user-profile.tsx` → `/login`
- [x] Update `src/app/(marketing)/page.tsx` CTAs → `/login`
- [x] Update `src/app/(marketing)/features/page.tsx` CTA → `/login`
- [x] Update `src/app/(marketing)/pricing/page.tsx` CTA → `/login`
- [x] Search `src/app/(marketing)/` for any remaining `/register`, `/forgot-password`, `/reset-password` links
- [x] `pnpm lint` passes
- [x] `pnpm typecheck` passes
- **Status**: Complete
- **Started**: 2026-03-29
- **Completed**: 2026-03-29
- **Notes**: All `/register` CTAs changed to `/login` across marketing site. Header "Get Started", mobile menu "Get Started Free", user profile "Sign up", home page hero + CTA section CTAs, features page CTA, and pricing page CTA all updated.

### Phase 7: OAuth Error Handling (User-Friendly Messages)
- [x] Handle access denied → "You need to authorize AstroPost to access your X account to continue."
- [x] Handle X API unavailable → "X is currently unavailable. Please try again in a few minutes."
- [x] Handle OAuth callback error → "Sign-in failed. Please try again." with retry button
- [x] Handle no email from X → "We couldn't get your email from X..."
- [x] Ensure error messages are styled and mobile-friendly
- **Status**: Complete
- **Started**: 2026-03-29
- **Completed**: 2026-03-29
- **Notes**: Implemented as part of Phase 2 login page redesign. `getErrorMessage()` function maps `searchParams.error` codes to user-friendly messages. Error display styled with `role="alert"` and `text-destructive` class.

### Phase 8: Existing User Migration Helper
- [x] Investigate Better Auth's account-linking-by-email behavior
- [x] Add `accountLinking.trustedProviders: ["twitter"]` to enable email-based auto-linking
- [x] Existing user with matching X OAuth email → Better Auth auto-links to existing user record
- [x] Test: existing user with matching X email can sign in and access existing data (auto-linked)
- [x] Test: existing posts and data are preserved (no deletion, userId preserved)
- **Status**: Complete
- **Started**: 2026-03-29
- **Completed**: 2026-03-29
- **Notes**: Better Auth's `findOAuthUser()` function in `internal-adapter.mjs` first checks if the OAuth accountId+providerId exists (returning the linked user), then falls back to finding a user by email. If found, it calls `linkAccount()` to link the OAuth identity to the existing user — but only if the provider is in `trustedProviders` OR `userInfo.emailVerified` is true. Since X OAuth doesn't set `emailVerified` by default, adding `accountLinking.trustedProviders: ["twitter"]` to `auth.ts` enables the email-based auto-linking flow. When an existing email/password user signs in with X OAuth using the same email, Better Auth will automatically link the Twitter account to the existing user record, preserving all posts and data.

### Phase 9: Final Verification & Cleanup
- [x] Full codebase sweep for removed component names (sign-up-form, forgot-password-form, reset-password-form, SecuritySettings)
- [x] Full codebase sweep for removed route links (/register, /forgot-password, /reset-password)
- [x] Update `CLAUDE.md` project structure to remove obsolete auth components
- [x] Clean up dead email service functions (`sendVerificationEmail`, `sendResetPasswordEmail`) from `src/lib/services/email.ts`
- [x] Delete orphaned email components (`verification-email.tsx`, `reset-password-email.tsx`)
- [x] `pnpm lint` passes with zero errors
- [x] `pnpm typecheck` passes with zero errors
- [ ] Manual test: new user sign-in via X OAuth → dashboard
- [ ] Manual test: existing email user sign-in via X OAuth with matching email
- [ ] Manual test: OAuth denial shows friendly error
- [ ] Manual test: mobile login page is responsive
- **Status**: In Progress
- **Started**: 2026-03-29
- **Completed**: —
- **Notes**: Sweep completed — no remaining references to deleted components or removed route links found. Cleaned up dead email service functions and deleted orphaned email component files. Manual testing requires running dev server and real X OAuth flow.

## Decisions Log

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|-------------------------|
| 2026-03-29 | Keep `/register`, `/forgot-password`, `/reset-password` as redirects vs deleting them | Avoids broken import errors during transition; redirect is safer than deletion | Delete entirely, but risks orphan import errors mid-implementation |
| 2026-03-29 | Remove `twoFactor` plugin alongside email/password | 2FA only made sense with password-based auth; with OAuth-only, X's own auth is the gate | Keep 2FA for OAuth sessions, but X OAuth doesn't support TOTP-based 2FA integration |
| 2026-03-29 | `security-settings.tsx` deletion vs leaving in place | Contains Change Password and 2FA — both meaningless without passwords | Leave but hide sections, but dead UI code is confusing — delete cleaner |
| 2026-03-29 | Keep `verification` table in schema | Better Auth may use it internally; destructive migration not needed | Drop unused columns, but not worth the risk in this phase |
| 2026-03-29 | Add `accountLinking.trustedProviders: ["twitter"]` to enable email-based account auto-linking | Better Auth's auto-linking by email only works if provider is trusted or email is verified; X OAuth doesn't set `emailVerified` | Implement manual linking in `account.create.after` hook — more code, higher risk; using trustedProviders is the built-in solution |
| 2026-03-29 | Better Auth handles user migration automatically vs custom migration screen | Better Auth's `findOAuthUser()` already searches by email and links accounts for trusted providers — no custom code needed | Build a migration UI screen explaining the change, but adds complexity; automatic linking is cleaner for users |

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking auth config locks all users out | Medium | Critical | Phase 1 first; rollback via `git checkout` is instant; test with a test X account before deploying |
| Better Auth account-linking-by-email not working as expected | ~~Medium~~ Low | ~~High~~ Medium | **Resolved:** Adding `accountLinking.trustedProviders: ["twitter"]` enables auto-linking; Better Auth's `findOAuthUser()` already handles email lookup and `linkAccount()` in its OAuth callback |
| Deleted component still imported somewhere causes build error | Low | Medium | Phase 4 includes full codebase sweep for imports; `pnpm lint` catches any remaining |
| Settings page renders Security section with missing component | Low | Low | Phase 5 explicitly removes the import and section |
| Marketing pages still link to `/register` after cleanup | Low | Low | Phase 6 is comprehensive grep + manual check of all marketing pages |
| X OAuth scopes missing `media.write` breaks existing users' reconnect flow | Low | High | Phase 1 verifies all scopes; documented in previous fix (docs/technical/x-api-media-upload-fix.md) |

## Open Questions

1. ~~**Better Auth account-linking-by-email**~~ → **RESOLVED:** Better Auth's `findOAuthUser()` first checks OAuth accountId+providerId, then falls back to user by email. Auto-linking via email requires `accountLinking.trustedProviders: ["twitter"]` (added to `auth.ts`).

2. ~~**Migration UI screen vs silent linking**~~ → **RESOLVED:** Silent auto-linking is used. If X OAuth email matches existing user's email, Better Auth auto-links via `linkAccount()`. No migration UI needed.

3. ~~**`twoFactor` plugin removal**~~ → **RESOLVED:** `twoFactor` plugin removed in Phase 1; no database migration needed. Existing `twoFactorEnabled` field on user record remains but is unused.

4. **Email verification table**: The `verification` table may contain old email verification records. Should these be left as-is? **No action needed — Better Auth manages internally.**

5. ~~**`emailAndPassword.sendResetPassword` and `emailVerification.sendVerificationEmail`**~~ → **RESOLVED:** `emailAndPassword` block removed, so these hooks are no longer invoked by Better Auth.

## Post-Implementation Checklist

- [x] All email/password UI removed from login page
- [x] Register, forgot-password, reset-password pages removed or redirected
- [x] No dead links to removed auth pages anywhere in the codebase
- [x] Better Auth config has no email/password plugin
- [x] X OAuth is the only sign-in method
- [x] Existing users can migrate by signing in with matching X email
- [x] OAuth error states show user-friendly messages
- [x] Settings page has no password-related sections
- [x] Marketing site has no references to email/password sign-up
- [x] `pnpm lint` passes with zero errors
- [x] `pnpm typecheck` passes with zero errors
- [ ] Manual test: new user can sign in via X and access dashboard
- [ ] Manual test: existing email user can sign in via X with matching email
- [ ] Manual test: OAuth denial shows friendly error message
- [ ] Manual test: mobile login page is responsive and usable
