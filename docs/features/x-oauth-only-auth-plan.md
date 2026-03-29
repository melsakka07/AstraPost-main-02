# X OAuth-Only Authentication — Phased Implementation Plan

## Phase 1: Auth Configuration Cleanup
**Objective:** Remove email/password from Better Auth config and client; verify Twitter OAuth scopes and email-from-users setting.

### Files to Modify
| File | Change |
|------|--------|
| `src/lib/auth.ts` | Remove `emailAndPassword` block, remove `emailVerification` block, remove `twoFactor` plugin, ensure Twitter OAuth scopes include all required: `tweet.read`, `tweet.write`, `users.read`, `offline.access`, `media.write` |
| `src/lib/auth-client.ts` | Remove `twoFactorClient()` plugin, remove `signUp`, `requestPasswordReset`, `resetPassword`, `sendVerificationEmail`, `twoFactor` from exports, keep only `signIn`, `signOut`, `useSession`, `getSession` |
| `src/proxy.ts` | No password-related logic found; already clean — verify `callbackUrl` redirect to `/login` works for all protected routes |

### Files to Delete
- None in this phase

### Files to Create
- `docs/features/x-oauth-only-auth.md` — Progress tracking document

### Dependencies
- None (this is the first phase)

### Risk Level
**Medium** — Modifying the auth config is the most critical change. If misconfigured, ALL users cannot log in. Rollback is a git revert.

### Rollback Strategy
`git checkout src/lib/auth.ts src/lib/auth-client.ts` — restore previous versions.

### Testing Checklist
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] New user can initiate X OAuth sign-in (visit `/login`, click X button)
- [ ] X OAuth callback reaches `/dashboard` successfully
- [ ] Email/password sign-in no longer works (API returns appropriate error)
- [ ] No "password" references remain in `src/lib/auth.ts` or `src/lib/auth-client.ts`

---

## Phase 2: Login Page Redesign
**Objective:** Replace the login page's email/password card UI with a clean, X-only sign-in experience.

### Files to Modify
| File | Change |
|------|--------|
| `src/app/(auth)/login/page.tsx` | Remove `SignInButton` import; remove `CardHeader` with "Welcome back / Sign in to your account" text; remove `reset` success message; add value proposition headline + bullet list; render only the X OAuth sign-in button with official X branding |

### Files to Delete
- None

### Files to Create
- None (reuse existing X OAuth button pattern from `sign-in-button.tsx`)

### Dependencies
- Phase 1 must be complete (auth config must work before redesigning the UI)

### Risk Level
**Low** — UI-only change, no auth logic touched. Rollback is a git revert.

### Rollback Strategy
`git checkout src/app/(auth)/login/page.tsx`

### Testing Checklist
- [ ] Login page shows value proposition headline
- [ ] Login page shows bullet list of features
- [ ] X sign-in button is prominent, centered, with black background + white X icon
- [ ] No email input, password input, or "Forgot password" link visible
- [ ] No "or continue with email" divider
- [ ] No "Don't have an account? Sign up" link
- [ ] Page is fully responsive on mobile (min 320px)
- [ ] Clicking X button redirects to X OAuth consent screen

---

## Phase 3: Obsolete Auth Pages — Redirect Setup
**Objective:** Convert `/register`, `/forgot-password`, and `/reset-password` pages to redirect to `/login`.

### Files to Modify
| File | Change |
|------|--------|
| `src/app/(auth)/register/page.tsx` | Replace page content with `redirect("/login")` |
| `src/app/(auth)/forgot-password/page.tsx` | Replace page content with `redirect("/login")` |
| `src/app/(auth)/reset-password/page.tsx` | Replace page content with `redirect("/login")` |

### Files to Delete
- None (pages are converted, not deleted, to avoid broken import errors)

### Files to Create
- None

### Dependencies
- Phase 2 should be done before or alongside this phase (no hard dependency)

### Risk Level
**Low** — Simple redirect replacements. Rollback via git.

### Rollback Strategy
`git checkout src/app/(auth)/register/page.tsx src/app/(auth)/forgot-password/page.tsx src/app/(auth)/reset-password/page.tsx`

### Testing Checklist
- [ ] Visiting `/register` redirects to `/login`
- [ ] Visiting `/forgot-password` redirects to `/login`
- [ ] Visiting `/reset-password` redirects to `/login`
- [ ] No errors in server logs from these routes

---

## Phase 4: Remove Obsolete Auth Components
**Objective:** Delete sign-up, forgot-password, and reset-password form components. Simplify `sign-in-button.tsx` to only X OAuth.

### Files to Modify
| File | Change |
|------|--------|
| `src/components/auth/sign-in-button.tsx` | Remove email/password form elements, remove `signIn.email()` call, remove "Or continue with" divider, remove "Forgot password" link, remove "Don't have an account? Sign up" link, remove `showPassword` toggle, keep only X OAuth `signIn.social({ provider: "twitter" })` button with proper error handling |

### Files to Delete
| File | Reason |
|------|--------|
| `src/components/auth/sign-up-form.tsx` | No longer needed — X OAuth handles both sign-in and sign-up |
| `src/components/auth/forgot-password-form.tsx` | No longer needed — no password reset possible |
| `src/components/auth/reset-password-form.tsx` | No longer needed — no password reset possible |

### Files to Create
- None

### Dependencies
- Phase 2 and Phase 3 should be complete

### Risk Level
**Medium** — Deleting files and modifying the last remaining auth component. Must ensure `sign-in-button.tsx` is fully simplified and all imports are cleaned.

### Rollback Strategy
`git checkout src/components/auth/sign-in-button.tsx` and recreate deleted files from git history.

### Testing Checklist
- [ ] `sign-in-button.tsx` contains only X OAuth button code
- [ ] `sign-up-form.tsx` file no longer exists
- [ ] `forgot-password-form.tsx` file no longer exists
- [ ] `reset-password-form.tsx` file no longer exists
- [ ] No remaining imports of deleted components anywhere in `src/`
- [ ] Login page still renders correctly with simplified `SignInButton`
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes

---

## Phase 5: Settings Page Cleanup
**Objective:** Remove any password/2FA-related sections from the settings page and its sub-components.

### Files to Modify
| File | Change |
|------|--------|
| `src/app/dashboard/settings/page.tsx` | Remove `SecuritySettings` import and any "Security" section that references it |
| `src/components/settings/security-settings.tsx` | Delete entire file (password change, 2FA setup all become obsolete) |

### Files to Delete
| File | Reason |
|------|--------|
| `src/components/settings/security-settings.tsx` | Contains Change Password and 2FA — both obsolete with X OAuth-only |

### Files to Create
- None

### Dependencies
- Phase 1 must be complete

### Risk Level
**Low** — Settings cleanup. Rollback via git.

### Rollback Strategy
`git checkout src/app/dashboard/settings/page.tsx` and recover `security-settings.tsx` from git.

### Testing Checklist
- [ ] Settings page no longer shows a "Security" section/card
- [ ] No "Change Password" UI anywhere in settings
- [ ] No 2FA toggle/setup UI anywhere in settings
- [ ] Settings page still renders all remaining sections (Profile, Subscription, X Connections)
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes

---

## Phase 6: Marketing Site & Navigation Link Cleanup
**Objective:** Update all links in marketing pages, header, footer, and mobile menu that point to `/register` or reference email/password auth.

### Files to Modify
| File | Change |
|------|--------|
| `src/components/site-header.tsx:56` | Change `href="/register"` "Get Started" button → `href="/login"` |
| `src/components/site-footer.tsx` | Search for and update any `/register` links to `/login` |
| `src/components/mobile-menu.tsx:137` | Change `href="/register"` → `href="/login"` |
| `src/components/auth/user-profile.tsx:45` | Change `href="/register"` → `href="/login"` |
| `src/app/(marketing)/page.tsx:36,143` | Update any "Get Started" / "Sign Up" CTAs to point to `/login` |
| `src/app/(marketing)/features/page.tsx:140` | Update CTA link to `/login` |
| `src/app/(marketing)/pricing/page.tsx:74` | Update CTA link to `/login` |

### Files to Delete
- None

### Files to Create
- None

### Dependencies
- Phase 2 should be complete before this (login page should be ready)

### Risk Level
**Low** — Link updates only. Rollback via git.

### Rollback Strategy
`git checkout` on all modified files.

### Testing Checklist
- [ ] Site header "Get Started" button links to `/login`
- [ ] Mobile menu "Get Started Free" links to `/login`
- [ ] Footer has no `/register` links
- [ ] Home page marketing CTAs link to `/login`
- [ ] Features page CTA links to `/login`
- [ ] Pricing page CTA links to `/login`
- [ ] User profile dropdown "Get Started" links to `/login`
- [ ] No dead links to `/register`, `/forgot-password`, or `/reset-password` anywhere in marketing pages

---

## Phase 7: OAuth Error Handling (User-Friendly Messages)
**Objective:** Handle common X OAuth failure scenarios with user-friendly messages on the login/callback pages.

### Files to Modify
| File | Change |
|------|--------|
| `src/app/(auth)/login/page.tsx` | Add error display area that reads OAuth error states from `searchParams` (`error`, `error_description`) and shows user-friendly messages for: access denied, X unavailable, no email returned |
| `src/app/api/auth/[...all]/route.ts` (or Better Auth callback) | If Better Auth exposes error handling, ensure OAuth callback errors are surfaced to the login page with proper error codes |

### Files to Create
- None (reuse existing error display patterns from the codebase)

### Dependencies
- Phase 2 should be complete (login page is redesigned before adding error states)

### Risk Level
**Low** — Adding error display to existing UI. Rollback via git.

### Rollback Strategy
`git checkout src/app/(auth)/login/page.tsx`

### Testing Checklist
- [ ] User denies X access → sees "You need to authorize AstroPost to access your X account to continue." message on login page
- [ ] X API is unreachable → sees "X is currently unavailable. Please try again in a few minutes."
- [ ] OAuth callback error → sees "Sign-in failed. Please try again." with retry option
- [ ] No email from X → sees "We couldn't get your email from X. Please ensure your X account has a verified email..."
- [ ] Error messages are styled appropriately (not raw error dumps)
- [ ] Mobile error display is readable and non-breaking

---

## Phase 8: Existing User Migration Helper
**Objective:** Ensure existing email/password users can migrate by signing in with X OAuth if their email matches.

### Files to Modify
| File | Change |
|------|--------|
| `src/lib/auth.ts` | After Twitter OAuth callback (in `account.create.after` hook), check if a user with the same email already exists via email/password; if so, ensure Better Auth links the OAuth account to that existing user record (preserving all posts and data) |
| `src/lib/auth.ts` — `account.create.after` hook | The existing hook already syncs to `xAccounts`. Investigate whether Better Auth auto-links by email or if manual linking is needed. **Open Question: verify Better Auth's account-linking-by-email behavior.** |

### Files to Create
| File | Purpose |
|------|---------|
| `src/lib/auth-migration.ts` (optional) | Helper to check for existing email/password user and trigger account linking if needed |

### Dependencies
- Phase 1 must be complete (auth config must support this investigation)

### Risk Level
**High** — Migration logic touches user data linking. Must be carefully tested. Rollback via git + manual DB review.

### Rollback Strategy
`git checkout src/lib/auth.ts`; if migration linked wrong accounts, manual DB intervention required.

### Testing Checklist
- [ ] Existing user with matching X OAuth email can sign in and sees their existing dashboard/posts
- [ ] Existing user with non-matching X OAuth email gets a new account (or appropriate error)
- [ ] No existing user records are deleted
- [ ] No existing posts are lost
- [ ] Account linking correctly maps OAuth `account.userId` to existing `user.id`

### Open Questions (must resolve before implementing)
1. Does Better Auth auto-link OAuth accounts to existing users by email? Need to verify in Better Auth docs and source.
2. If not auto-linked, does the `account.create.before` or `account.create.after` hook fire for OAuth sign-ins, or only for email/password?
3. Should we display a migration UI screen or handle silently?

---

## Phase 9: Final Verification & Cleanup
**Objective:** Ensure no dead code, no broken imports, and no references to removed auth methods remain.

### Files to Modify
| File | Change |
|------|--------|
| Throughout `src/` | Search for any remaining imports of `sign-up-form`, `forgot-password-form`, `reset-password-form`, `SecuritySettings`, `twoFactorClient`, `requestPasswordReset`, `resetPassword`, `sendVerificationEmail` and remove/clean them |
| `CLAUDE.md` | Update project structure reference to remove obsolete auth components from the file tree |

### Files to Delete
- Any remaining dead imports or unused references found during the sweep

### Files to Create
- None

### Dependencies
- All previous phases must be complete

### Risk Level
**Low** — Cleanup only. Rollback via git.

### Rollback Strategy
`git checkout` on all modified files.

### Testing Checklist
- [ ] `pnpm lint` passes with zero errors
- [ ] `pnpm typecheck` passes with zero errors
- [ ] Full codebase grep for removed component names returns no results
- [ ] Full codebase grep for `/register`, `/forgot-password`, `/reset-password` in internal links returns no results
- [ ] Manual test: fresh incognito browser, visit `/login`, sign in with X, land on dashboard with no errors
- [ ] Manual test: existing email/password user visits `/login`, can sign in with X OAuth, sees their existing data
