# AstraPost User UX Journey Audit

**Scope:** End-to-end user journeys from onboarding through daily usage through upgrade.

---

## Critical Issues

### UX-C-1: Registration Flow is Broken — No Email Signup Available

**Journey:** New User → /register

**Current State:**

- `/register` is a redirect stub: `redirect("/login?mode=register")`
- No registration form exists
- Users can only sign up via Twitter OAuth

**Desired State:** Email/password registration with plan selection

**Impact:** Users who don't have Twitter accounts are blocked. Users who want privacy cannot sign up. The primary signup CTA ("Get Started for Free" on homepage) leads to `/login` with no signup option.

**User Flow Broken:**

1. User clicks "Get Started for Free" on homepage
2. Lands on `/login` page
3. Sees "Don't have an account?" link pointing to `/register`
4. Clicks `/register`
5. **Silently redirected back to `/login` with no explanation**
6. User abandons signup

**Fix:** Implement `/register` page with:

- Email/password form with validation
- Plan tier selection (Trial/Free)
- Referral code detection
- Email verification flow
- Redirect to onboarding on success

---

### UX-C-2: Password Recovery Flow is Broken

**Journey:** Returning User → /forgot-password

**Current State:**

- `/forgot-password` is a redirect stub: `redirect("/login")`
- `/reset-password` is a redirect stub: `redirect("/login")`
- No password reset form or token handling

**Impact:** Users who forget their password have no recovery path. If someone attempts password reset, they are silently redirected to login with no explanation.

**Fix:**

1. Implement `/forgot-password` page:
   - Email input form with Zod validation
   - Rate limiting (max 5 requests per IP per hour)
   - Success message: "Check your email for reset link"
   - Auto-generate and send reset token via email

2. Implement `/reset-password` page:
   - Token validation from query param
   - New password form with strength meter
   - Error states for expired/used tokens
   - Redirect to `/login` on success

---

### UX-C-3: Three AI Tools Are Invisible to Pro Users

**Journey:** Pro User → /dashboard/ai → discovers available tools

**Current State:**

- AI hub shows 4 tool cards (Thread Writer, URL→Thread, A/B Variants, Hashtags)
- Bio Generator, Reply Suggester, Content Calendar exist but are completely hidden
- No sidebar links to these three features
- Users who paid for Pro cannot access these features

**Impact:** Feature discoverability is 0%. Pro users lose value immediately.

**User Frustration:** User upgrades to Pro, visits AI section, sees 4 tools, never discovers the other 3 they just paid for.

**Fix:** (See FH-1 in frontend findings)

---

## High Severity Issues

### UX-H-1: Session Expiry Produces Generic Errors, Not Login Prompts

**Journey:** Active User → session expires → attempts action

**Current State:**

- When session expires (after 24 hours), API returns 401
- Client sees generic error toast: "Failed to load analytics" or "Error saving draft"
- No indication that session has expired
- No "Log in again" CTA
- User must manually navigate to `/login`

**Impact:** User confusion. Users think the app is broken rather than their session expired.

**Flow Broken:**

1. User opens `/dashboard/analytics`
2. Session is expired (no indication)
3. User clicks "Refresh data" button
4. Toast shows: "Failed to fetch analytics"
5. User has no recovery path — must guess that they need to log in

**Fix:** (See FH-3 in frontend findings — global 401 interceptor)

---

### UX-H-2: Compose Mid-Draft Navigation Loses Content

**Journey:** Power User → /dashboard/compose → creates thread → clicks sidebar → loses draft

**Current State:**

- `beforeunload` listener warns on hard tab close
- SPA navigation (clicking sidebar) bypasses `beforeunload`
- Draft is lost silently

**Impact:** Data loss. Power users will lose valuable draft content when navigating via sidebar.

**Expected:** Confirmation dialog before navigation when unsaved content exists.

**Fix:** (See FM-1 in frontend findings)

---

### UX-H-3: Plan Upgrade Cache Miss — User Sees Stale Limits Post-Upgrade

**Journey:** Free User → upgrades to Pro → immediately uses new features → sees old limits

**Current State:**

- Plan cache is 5 minutes TTL
- Webhook webhook `handleSubscriptionUpdated` updates `user.plan` in DB
- But does NOT call `cache.delete()` to invalidate
- User upgrades, page refreshes, still sees Free limits for up to 5 minutes
- Can't use new features immediately

**Impact:** Upgrade UX friction. User pays, feature doesn't work for 5 minutes.

**Fix:** (See L-4 in backend findings — add cache invalidation)

---

### UX-H-4: AI Hub Shows No Quota Before Attempt

**Journey:** User at /dashboard/ai → starts composing with AI tool → quota exhausted → error

**Current State:**

- Hub displays no usage meter
- User clicks into tool, spends time typing prompt
- Submits → gets "AI quota exhausted" error
- Feels like wasted effort

**Expected:** Quota display on hub, upgrade CTA at point of friction.

**Fix:** (See FM-4 in frontend findings)

---

### UX-H-5: Instagram/LinkedIn Disconnect Are Stub Features

**Journey:** User at /dashboard/settings/integrations → wants to disconnect Instagram → clicks trash → sees "Coming Soon"

**Current State:**

- Disconnect buttons are interactive but non-functional
- User attempts disconnection, sees toast: "Coming soon"
- No feedback that it's not implemented
- User confused: "Did it work?"

**Impact:** Broken affordance. Users can't revoke compromised credentials.

**Fix:** (See FH-2 in frontend findings)

---

## Medium Severity Issues

### UX-M-1: Settings Forms Have No Unsaved Changes Warning

**Journey:** User at /dashboard/settings/profile → edits name → clicks sidebar → lands on new page

**Current State:**

- No dirty-state indicator
- No "unsaved changes" warning
- No confirmation dialog before navigation
- Changes are lost silently if user navigates away

**Expected:** "You have unsaved changes. Discard?" confirmation.

**Fix:** (See FM-3 in frontend findings)

---

### UX-M-2: Onboarding Wizard Doesn't Guide Discovery of AI Tools

**Journey:** New User → /dashboard/onboarding → completes → lands on /dashboard

**Current State:**

- Onboarding covers: account connection, first post creation
- Does NOT introduce or link to AI tools
- New user has no awareness of AI capabilities

**Expected:** Final step mentions "Explore AI Writer at /dashboard/ai/writer" and shows feature preview.

**Fix:** Update onboarding final step with:

- Screenshot of AI Writer interface
- "3 AI tools included: Thread Writer, Bio Generator, Reply Suggester"
- CTA: "Start using AI Writer"

---

### UX-M-3: No Contextual Upgrade Prompt When Feature Gated

**Journey:** Free User → clicks "Analytics" → sees BlurredOverlay → clicks "Upgrade"

**Current State:**

- Feature-gated content shows BlurredOverlay with "Upgrade to Pro"
- Clicking leads to `/dashboard/settings/billing`
- Plan options are not pre-filtered to what user needs
- User must read through plan comparison to understand what they're upgrading to

**Expected:** Contextual upgrade CTA at point of friction with clear benefit messaging.

**Fix:** Upgrade modal should show:

- Feature name: "Deep Analytics (Viral Analyzer, Competitor Analysis)"
- Current plan: "Free"
- Target plan: "Pro"
- Cost: "$29/month"
- Benefit: "Unlock 5 additional AI features, 500 posts/month, etc."

---

### UX-M-4: Admin Impersonation Has No Visible Indicator

**Journey:** Admin → /admin/impersonation → impersonates user → navigates to dashboard

**Current State:**

- Admin can impersonate a user (see backend H-5)
- Session is created but **no banner indicates admin is viewing as another user**
- Admin sees normal dashboard with no "You are viewing as User X" banner

**Impact:** Confusion. Admin forgets they're impersonating and makes changes as the user.

**Expected:** Persistent banner: "You are impersonating John (john@example.com). [End Impersonation]"

**Fix:** Check if session has `impersonatedBy` field in middleware and render banner in dashboard layout:

```typescript
{impersonatedBy && (
  <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 flex items-center justify-between">
    <span className="text-sm">You are viewing as {impersonationUser.name}</span>
    <Button size="sm" onClick={exitImpersonation}>
      End Impersonation
    </Button>
  </div>
)}
```

---

### UX-M-5: Invitation Acceptance Page Has No Header/Nav

**Journey:** New Invitee → receives email → clicks invite link → lands on /join-team

**Current State:**

- `/join-team` has no layout (no header, nav, footer)
- Renders as isolated page with minimal context
- No brand visibility — user unsure if they're on legit site

**Expected:** Minimal header with logo, "You've been invited to [Team Name]", accept/decline buttons.

**Fix:** Create layout for `/join-team`:

```typescript
// src/app/(auth)/join-team/layout.tsx
export default function JoinTeamLayout({ children }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b py-4 px-6">
        <Logo className="h-8" />
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
```

---

### UX-M-6: Affiliate Feature Is Invisible (No Sidebar Link)

**Journey:** Affiliate Partner User → wants to create AI tweet for partner product → can't find feature

**Current State:**

- `/dashboard/affiliate` page exists and is fully implemented
- No sidebar link
- No hub link
- Unreachable without direct URL

**Expected:** Sidebar entry under Growth section.

**Fix:** (See FM-6 in frontend findings)

---

## Low Severity Issues

### UX-L-1: /profile Page Is Partially Placeholder

**File:** `src/app/profile/page.tsx`

**Issues:**

- Edit form shows toast: "Profile updates require backend implementation"
- 2FA button shows: "Coming Soon" badge
- Email preferences show: "Coming Soon" badge

**Impact:** Users cannot update profile; 2FA appears available but isn't.

**Fix:** Either implement the features or remove the buttons/forms that suggest they exist.

---

### UX-L-2: /docs Marketing Page Shows All Links as "Coming Soon"

**File:** `src/app/(marketing)/docs/page.tsx`

**Current:** Every documentation article link has `comingSoon: true` and renders as disabled "Soon" badge.

**Impact:** Users looking for docs find none; feature appears incomplete.

**Fix:** Either populate `/docs` with real content or remove the page from navigation until content is ready.

---

### UX-L-3: Pricing Page Shows Plan Tiers Accurately But Could Highlight Current Plan

**File:** `src/app/(marketing)/pricing/page.tsx`

**Current:** Plan comparison is accurate and feature tiers match backend gates.

**Minor UX improvement:** If user is logged in, highlight their current plan with a "Your Plan" badge.

---

## Summary

| Severity  | Count  |
| --------- | ------ |
| Critical  | 3      |
| High      | 5      |
| Medium    | 6      |
| Low       | 3      |
| **Total** | **17** |

---

## Recommended UX Fix Priority

**Week 1 (Critical):**

1. Implement `/register` with email/password and plan selection
2. Implement `/forgot-password` and `/reset-password` with token handling
3. Add AI tools to hub and sidebar (30 min task; high impact)

**Week 2 (High):**

1. Add global 401 interceptor + redirect to login
2. Add navigation guard to composer (prevent draft loss)
3. Add cache invalidation to plan upgrade webhook
4. Implement Instagram/LinkedIn disconnect with confirmation

**Week 3 (Medium):**

1. Add unsaved changes warning to settings forms
2. Add AI quota display to hub
3. Add onboarding step for AI tools discovery
4. Add admin impersonation banner

**Week 4+ (Low):**

1. Complete `/profile` backend or remove stubs
2. Populate `/docs` or remove from nav
3. Improve `/join-team` with layout/header
