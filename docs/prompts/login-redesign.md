## Context

You are working on **AstraPost** (also called AstraPost), a production-ready AI-powered social media management SaaS platform for X (Twitter). The project is built with Next.js 16 (App Router), React 19, TypeScript, Better Auth, PostgreSQL (Drizzle ORM), BullMQ, shadcn/ui, and Tailwind CSS 4.

Before starting, read the following files to understand the full project structure, conventions, and rules:
- `CLAUDE.md` — AI assistant guidelines, project structure, coding rules, and architectural constraints
- `docs/0-MY-LATEST-UPDATES.md` — Latest code changes and tracking
- `src/lib/auth.ts` — Current Better Auth server configuration
- `src/lib/auth-client.ts` — Current Better Auth client configuration
- `src/app/(auth)/login/page.tsx` — Current login page
- `src/app/(auth)/register/page.tsx` — Current registration page
- `src/app/(auth)/forgot-password/page.tsx` — Current forgot password page
- `src/app/(auth)/reset-password/page.tsx` — Current reset password page
- `src/components/auth/sign-in-button.tsx` — Current sign-in component
- `src/components/auth/sign-up-form.tsx` — Current sign-up form component
- `src/components/auth/forgot-password-form.tsx` — Current forgot password form component
- `src/components/auth/reset-password-form.tsx` — Current reset password form component
- `src/proxy.ts` — Auth route protection and redirect logic
- `src/lib/schema.ts` — Database schema (focus on `user`, `session`, `account`, `verification` tables)
- `src/app/dashboard/settings/page.tsx` — Settings page (check for password/security sections)

## Objective

Remove all email/password-based authentication from the application and make **X (Twitter) OAuth 2.0 the sole authentication method**. After this change, users can only sign in by connecting their X account. No email, no password, no magic links — X OAuth only.

This must follow **industry best practices for OAuth-only SaaS authentication** and implement the **minimum viable best-practice baseline** that adds real value to the project.

## Requirements

### 1. Authentication Configuration
- Remove the email/password plugin from Better Auth server config (`src/lib/auth.ts`)
- Remove any password-related configuration, hooks, or plugins
- Keep the Twitter OAuth plugin as the only social provider
- Ensure the OAuth flow requests appropriate scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`, and `media.write`
- Ensure `Request email from users` is enabled in the Twitter OAuth config so we still capture the user's email from X for account identification
- Update Better Auth client config (`src/lib/auth-client.ts`) to remove email/password methods and only expose social sign-in

### 2. Login Page Redesign
- Redesign `src/app/(auth)/login/page.tsx` to show **only** an X sign-in button
- The page should feel clean, focused, and trustworthy — not empty
- Include a brief value proposition headline (e.g., "Sign in with X to manage your content") and optionally a short bullet list of what the user gets (schedule tweets, AI writer, analytics, etc.)
- The X button should be prominent, centered, and use the official X/Twitter branding colors (black background, white X icon)
- Remove any "or continue with email" divider, email input fields, password input fields, "Forgot password?" link, and "Don't have an account? Sign up" link
- Remove any toggle or tab switching between sign-in and sign-up modes
- The page must remain fully responsive (mobile-first, as per the project's MENA audience on mobile)

### 3. Remove Obsolete Auth Pages
- `src/app/(auth)/register/page.tsx` — Remove or convert to a redirect to `/login` (since X OAuth handles both sign-in and sign-up in one flow)
- `src/app/(auth)/forgot-password/page.tsx` — Remove or convert to a redirect to `/login`
- `src/app/(auth)/reset-password/page.tsx` — Remove or convert to a redirect to `/login`
- Any internal links throughout the entire codebase pointing to `/register`, `/forgot-password`, or `/reset-password` must be updated or removed

### 4. Remove Obsolete Auth Components
- `src/components/auth/sign-up-form.tsx` — Remove (no longer needed)
- `src/components/auth/forgot-password-form.tsx` — Remove (no longer needed)
- `src/components/auth/reset-password-form.tsx` — Remove (no longer needed)
- `src/components/auth/sign-in-button.tsx` — Simplify to only contain the X OAuth button (remove email/password form elements)
- Search the entire codebase for any imports of these removed components and clean them up

### 5. Settings Page Cleanup
- If the settings page (`src/app/dashboard/settings/page.tsx` or any sub-components) contains a "Change Password" or "Security" section related to passwords, remove it
- Keep any 2FA-related UI only if it applies to the OAuth flow (likely it does not, so remove it)
- Ensure no password-related settings remain anywhere in the dashboard

### 6. Email Verification Considerations
- Since we still request the user's email from X OAuth, determine whether the existing email verification flow in `verification` table is still needed
- X OAuth provides a verified email directly — no separate verification step is needed
- Remove any email verification UI flows that are no longer applicable
- The `verification` table in the schema can remain (Better Auth may use it internally), but no custom verification UI should exist

### 7. Existing User Migration Strategy
- **Existing users who signed up with email/password** need a clear migration path. Define the strategy:
  - **Recommended approach**: On their next visit, if they try to log in with email/password, show a one-time migration screen explaining: "We've moved to X-only sign-in. Please sign in with your X account. If your X account email matches your current email, your account will be linked automatically."
  - Better Auth's `account` table links OAuth identities to `user` records by email. If the X OAuth email matches the existing user's email, Better Auth should automatically link the OAuth account to the existing user — **verify this behavior** in the Better Auth docs and code before implementing
  - If automatic linking by email is not supported by default, implement a manual linking flow: after X OAuth callback, check if a user with that email exists, and if so, create the `account` record linking the X OAuth identity to the existing `user`
- **Important**: Do NOT delete existing user records or posts. Existing content must be preserved.
- Document the migration strategy clearly in the implementation plan

### 8. OAuth Error Handling (Best Practice Baseline)
- Handle common X OAuth failure scenarios with user-friendly messages:
  - User denies access on X consent screen → "You need to authorize AstraPost to access your X account to continue."
  - X API is down or unreachable → "X is currently unavailable. Please try again in a few minutes."
  - OAuth callback error → Generic "Sign-in failed. Please try again." with a retry button
  - No email returned from X → "We couldn't get your email from X. Please ensure your X account has a verified email address and that you've granted email permission."
- These error states should be handled on the login/callback page, not as raw error dumps

### 9. Session & Security (Best Practice Baseline)
- Sessions remain managed by Better Auth (cookie-based) — no change needed to session mechanism
- Ensure the OAuth `state` parameter is used to prevent CSRF (Better Auth handles this by default — verify)
- Ensure the callback URL is strictly validated (Better Auth handles this — verify)
- No new security measures beyond what Better Auth already provides are required for this phase

### 10. Database Schema
- Do NOT drop or alter the `user`, `session`, `account`, or `verification` tables in this phase
- Better Auth manages these tables internally, and removing columns could break the library
- The `account` table will now only contain `provider: "twitter"` records going forward
- Existing `account` records with other providers (if any) can be left as-is — they will simply never be used

### 11. Redirect & Route Protection
- Update `src/proxy.ts` if it contains any password-related redirect logic
- Ensure unauthenticated users are always redirected to `/login`
- Ensure there are no dead-end redirects to `/register`, `/forgot-password`, or `/reset-password`
- The marketing site (header/footer) may have "Sign Up" or "Log In" links — update them all to point to `/login`

### 12. Marketing Site & Public Pages
- Search all files under `src/app/(marketing)/` for any links to `/register`, `/forgot-password`, `/reset-password`, or references to "email sign up", "create account with email", "password" in the context of authentication
- Update all such references to point to `/login` with appropriate wording ("Get Started", "Sign in with X", etc.)
- Check `src/components/site-header.tsx` and `src/components/site-footer.tsx` for auth-related navigation links

## What NOT to Do

- Do NOT write any code in this stage — this is a planning and documentation task only
- Do NOT delete database tables or run destructive migrations
- Do NOT modify the BullMQ worker, queue system, or any non-auth-related features
- Do NOT add new OAuth providers (no Google, no GitHub — X only)
- Do NOT implement a "link X account" flow for already-logged-in users (that's a separate feature)
- Do NOT change the X account connection flow in Settings (that's for connecting posting accounts, not auth)
- Do NOT modify any AI, analytics, billing, or scheduling features

## Deliverables

You must produce exactly **two deliverables**:

### Deliverable 1: Phased Implementation Plan

Create a detailed implementation plan divided into logical phases. Each phase must include:
- **Phase name and number** (e.g., "Phase 1: Auth Configuration Cleanup")
- **Objective**: What this phase accomplishes
- **Files to modify**: Exact file paths with a brief description of what changes in each
- **Files to delete**: Exact file paths of components/pages to remove
- **Files to create**: Any new files needed (e.g., a migration helper)
- **Dependencies**: What must be completed before this phase can start
- **Risk level**: Low / Medium / High and why
- **Rollback strategy**: How to undo this phase if something goes wrong
- **Testing checklist**: How to verify this phase works correctly (manual steps, not automated tests)

Structure the phases so that:
- Each phase is independently deployable if possible
- The most critical/fragile changes (auth config, user migration) come early when less has changed
- UI changes come after backend changes are stable
- Cleanup (dead code, unused pages) comes last

### Deliverable 2: Progress Tracking Document

Create a Markdown document at `docs/features/x-oauth-only-auth.md` with the following structure:

```markdown
# Feature: X OAuth-Only Authentication

## Overview
[Brief description of the feature and its business justification]

## Implementation Plan
[Link to or embed the phased plan from Deliverable 1]

## Progress Tracker

### Phase 1: [Name]
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3
- **Status**: Not Started | In Progress | Blocked | Complete
- **Started**: [Date]
- **Completed**: [Date]
- **Notes**: [Any observations, blockers, deviations from plan]

### Phase 2: [Name]
[Same structure as above]

...

## Decisions Log
| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| ... | ... | ... | ... |

## Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ... | ... | ... | ... |

## Open Questions
- [Question 1]
- [Question 2]

## Post-Implementation Checklist
- [ ] All email/password UI removed from login page
- [ ] Register, forgot-password, reset-password pages removed or redirected
- [ ] No dead links to removed auth pages anywhere in the codebase
- [ ] Better Auth config has no email/password plugin
- [ ] X OAuth is the only sign-in method
- [ ] Existing users can migrate by signing in with matching X email
- [ ] OAuth error states show user-friendly messages
- [ ] Settings page has no password-related sections
- [ ] Marketing site has no references to email/password sign-up
- [ ] `pnpm lint` passes with zero errors
- [ ] `pnpm typecheck` passes with zero errors
- [ ] Manual test: new user can sign in via X and access dashboard
- [ ] Manual test: existing email user can sign in via X with matching email
- [ ] Manual test: OAuth denial shows friendly error message
- [ ] Manual test: mobile login page is responsive and usable
```

## Rules

- Follow all rules from `CLAUDE.md` — especially the critical rules about `ApiError`, `require-plan.ts`, `db.transaction()`, shared schemas, and running `pnpm lint && pnpm typecheck` after changes
- Use the project's existing shadcn/ui components and Tailwind patterns — do not introduce new UI libraries
- Do NOT produce any code, only the two documents described above
- Be specific about file paths — use the exact paths from the project structure
- If you are uncertain about any Better Auth behavior (especially automatic account linking by email), flag it explicitly as an "Open Question" in the tracking document rather than assuming