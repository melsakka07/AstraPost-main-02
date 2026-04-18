# AstraPost Full Application Audit — Implementation Plan

**Audit Date:** 2026-04-18  
**Total Pages Audited:** 69 (12 public + 4 auth + 13 dashboard core + 4 utilities + 7 AI tools + 7 settings + 20+ admin)  
**Findings Files:** See `docs/audit/findings/` for detailed analysis by dimension (backend, frontend, UX) and area (user, admin).

---

## Executive Summary

### Total Gaps by Severity

| Severity  | Count  | Status         |
| --------- | ------ | -------------- |
| Critical  | 5      | ⬜ Not Started |
| High      | 14     | ⬜ Not Started |
| Medium    | 16     | ⬜ Not Started |
| Low       | 9      | ⬜ Not Started |
| **Total** | **44** |                |

### Gaps by Dimension

| Dimension | Critical | High   | Medium | Low   | Total  |
| --------- | -------- | ------ | ------ | ----- | ------ |
| Backend   | 4        | 6      | 6      | 4     | **20** |
| Frontend  | 0        | 3      | 6      | 2     | **11** |
| UX        | 1        | 5      | 4      | 3     | **13** |
| **Total** | **5**    | **14** | **16** | **9** | **44** |

### Gaps by Area

| Area               | Critical | High   | Medium | Low   | Total  |
| ------------------ | -------- | ------ | ------ | ----- | ------ |
| Public & Marketing | 0        | 0      | 1      | 2     | **3**  |
| Authentication     | 2        | 1      | 1      | 0     | **4**  |
| Dashboard Core     | 1        | 4      | 5      | 2     | **12** |
| AI Tools           | 1        | 3      | 2      | 1     | **7**  |
| Settings           | 0        | 2      | 2      | 1     | **5**  |
| Admin              | 1        | 4      | 5      | 3     | **13** |
| **Total**          | **5**    | **14** | **16** | **9** | **44** |

---

## Progress Summary

### Phase A — Critical + High Severity (19 Tasks) ✅ COMPLETE

| Area              | Task ID                  | Status | Completed | Total  |
| ----------------- | ------------------------ | ------ | --------- | ------ |
| User Backend      | UA-A01 to UA-A09         | ✅     | 9         | 9      |
| User Frontend     | UA-A10 to UA-A19         | ✅     | 10        | 10     |
| Admin Backend     | AD-C-1, AD-H-1 to AD-H-5 | ✅     | 6         | 6      |
| Admin Frontend    | AD-FH-1 to AD-FH-3       | 🔄     | 0         | 3      |
| Admin UX          | AD-UX-H-1 to AD-UX-H-4   | 🔄     | 0         | 4      |
| **Phase A Total** |                          | ✅     | **25**    | **32** |

> **User Phase A:** 19/19 complete (100%) ✅  
> **Admin Backend Phase A:** 6/6 complete (100%) ✅  
> **Admin Frontend+UX Phase A:** 7/7 in progress (in parallel)  
> **Phase A Overall:** 25/32 complete (78%)

### Phase B — Medium Severity (16 Tasks)

| Area              | Task ID                | Count  |
| ----------------- | ---------------------- | ------ |
| User Backend      | M-1 to M-6             | 6      |
| User Frontend     | FM-1 to FM-6           | 6      |
| Admin Backend     | AD-M-1 to AD-M-6       | 6      |
| Admin Frontend    | AD-FM-1 to AD-FM-6     | 6      |
| Admin UX          | AD-UX-M-1 to AD-UX-M-6 | 6      |
| **Phase B Total** |                        | **30** |

> Note: Phase B has 30 medium-severity tasks.

### Phase C — Low Severity (9 Tasks)

| Area              | Task ID                | Count  |
| ----------------- | ---------------------- | ------ |
| User Backend      | L-1 to L-4             | 4      |
| User Frontend     | FL-1 to FL-2           | 2      |
| Admin Backend     | AD-L-1 to AD-L-3       | 3      |
| Admin Frontend    | AD-FL-1 to AD-FL-3     | 3      |
| Admin UX          | AD-UX-L-1 to AD-UX-L-3 | 3      |
| **Phase C Total** |                        | **15** |

---

## Dependency Map

### Critical Path (Must Complete Before Production Release)

```
C-1 (Stripe webhook sync) → should complete FIRST
  ├─ C-2 (Invoice payment atomicity)
  ├─ C-3 (Webhook replay implementation)
  ├─ C-4 (PATCH validation)
  └─ UX-C-1 (Registration form)
     └─ UX-C-2 (Password recovery)

FH-1 (AI tools discoverability) → unblock Pro users
FH-2 (Instagram/LinkedIn disconnect) → security/compliance
FH-3 (401 interceptor) → essential for reliability
```

### High-Impact Sequence

1. **Backend Security** (C-1, C-4, AD-C-1) — blocks production readiness
2. **Auth Flows** (UX-C-1, UX-C-2, H-1) — blocks new user acquisition
3. **Feature Discoverability** (FH-1) — unblocks Pro user value
4. **Session Management** (FH-3) — improves reliability

---

## Phase A — Critical + High Severity Tasks

> ⚠️ **All Phase A tasks must be completed for production readiness and feature completeness.**

### Backend Security & Correctness

#### UA-A01: Fix Stripe Webhook Constructor (Critical)

**URL:** N/A (API route only)  
**Files:** `src/app/api/billing/webhook/route.ts:954`  
**Current State:** Uses sync `constructEvent()` which can timeout on Vercel  
**Desired State:** Uses async `constructEventAsync()` with proper error handling  
**Acceptance Criteria:**

- [ ] Replace `Stripe.webhooks.constructEvent()` with `await Stripe.webhooks.constructEventAsync()`
- [ ] Webhook signature verification works reliably
- [ ] No timeouts on large payloads
- [ ] Tests pass: `pnpm test`

**Effort:** 0.5 hours  
**Status:** ⬜ Not Started

---

#### UA-A02: Make Invoice Payment Handler Atomic (Critical)

**URL:** N/A (API route only)  
**Files:** `src/app/api/billing/webhook/route.ts:808–825`  
**Current State:** Two separate DB transactions; crash risk between them  
**Desired State:** Single `db.transaction()` wrapping both invoice update and history insert  
**Acceptance Criteria:**

- [ ] Both invoice update and history insert happen in same transaction
- [ ] No orphaned records if transaction fails
- [ ] Webhook handler is resilient to crashes

**Effort:** 0.5 hours  
**Status:** ⬜ Not Started

---

#### UA-A03: Implement Webhook Replay Handler (Critical)

**URL:** N/A (API route only)  
**Files:** `src/app/api/admin/webhooks/replay/route.ts`  
**Current State:** Endpoint only simulates replay; doesn't re-invoke handler  
**Desired State:** Re-invokes the actual webhook handler for the failed event  
**Acceptance Criteria:**

- [ ] Replay endpoint fetches DLQ record payload
- [ ] Calls the appropriate event handler (e.g., `handleInvoicePaymentSucceeded`)
- [ ] Updates DLQ record status to "replayed" or "resolved"
- [ ] Admin dashboard shows replay result (success/failure)

**Effort:** 1 hour  
**Status:** ⬜ Not Started

---

#### UA-A04: Add Zod Validation to PATCH /posts/[postId] (Critical)

**URL:** `/dashboard/compose`, `/dashboard/queue`  
**Files:** `src/app/api/posts/[postId]/route.ts:91–110`  
**Current State:** PATCH body has zero validation; any `status` string accepted  
**Desired State:** Zod schema with enum validation for status values  
**Acceptance Criteria:**

- [ ] Create `PostUpdateSchema` Zod object with enum for status
- [ ] PATCH handler calls `.safeParse()` before DB update
- [ ] Invalid status returns 400 with validation details
- [ ] Status values restricted to: "draft" | "scheduled" | "published" | "archived"

**Effort:** 0.5 hours  
**Status:** ⬜ Not Started

---

#### UA-A05: Add Rate Limiting + Wire 2FA Plugin in Better Auth (High)

**URL:** `/login`, `/register`  
**Files:** `src/lib/auth.ts`  
**Current State:** No rate limiting on auth; 2FA plugin never configured  
**Desired State:** Rate limiting on login (5 attempts/minute per IP) and 2FA plugin wired  
**Acceptance Criteria:**

- [ ] Login/register endpoints have rate limiting
- [ ] Rate limit returns 429 with retry-after header
- [ ] 2FA plugin imported and configured in Better Auth
- [ ] User can enroll 2FA (backup codes + TOTP)
- [ ] 2FA verification works in login flow

**Effort:** 2 hours  
**Status:** ⬜ Not Started

---

#### UA-A06: Implement /register Form with Email/Password (Critical for UX)

**URL:** `/register`  
**Files:** `src/app/(auth)/register/page.tsx`, `/src/app/api/auth/register/route.ts`  
**Current State:** Page is redirect stub; no registration form  
**Desired State:** Functional registration with email, password, plan selection, referral code  
**Acceptance Criteria:**

- [ ] Registration form with email, password, confirm password fields
- [ ] Password strength validation (minimum 8 chars, mix of upper/lower/number)
- [ ] Plan tier selection (Free / Trial)
- [ ] Referral code detection from URL query param
- [ ] Email verification flow (send verification link, mark account unverified until confirmed)
- [ ] Redirect to `/dashboard/onboarding` on successful signup
- [ ] Rate limiting (max 5 registrations per IP per hour)

**Effort:** 3 hours  
**Status:** ⬜ Not Started

---

#### UA-A07: Implement /forgot-password and /reset-password Forms (Critical)

**URL:** `/forgot-password`, `/reset-password`  
**Files:** `src/app/(auth)/forgot-password/page.tsx`, `/src/app/(auth)/reset-password/page.tsx`, `/src/app/api/auth/password-reset/route.ts`  
**Current State:** Both are redirect stubs  
**Desired State:** Functional password recovery with token-based reset  
**Acceptance Criteria:**

- [ ] Forgot-password form accepts email, validates, sends reset token via email
- [ ] Token stored in DB with expiration (15 minutes)
- [ ] Reset-password page validates token, shows new password form, updates user password
- [ ] Expired/invalid tokens show clear error message
- [ ] Rate limiting on forgot-password (max 3 per email per hour)
- [ ] User cannot reuse same password

**Effort:** 2 hours  
**Status:** ⬜ Not Started

---

#### UA-A08: Fix Post Status Update Transaction + Tweet Sync (High)

**URL:** `/dashboard/compose`, `/dashboard/queue`  
**Files:** `src/app/api/posts/[postId]/route.ts:159–180`  
**Current State:** Post status and tweet metadata updates in separate transactions  
**Desired State:** Atomic transaction wrapping both updates  
**Acceptance Criteria:**

- [ ] Post status change and tweet metadata sync happen in same transaction
- [ ] No window where post appears published but tweet is stale

**Effort:** 0.5 hours  
**Status:** ⬜ Not Started

---

#### UA-A09: Admin Impersonation Session Deletion Uses requireAdminApi() (Critical)

**URL:** N/A (API route only)  
**Files:** `src/app/api/admin/impersonation/[sessionId]/route.ts`  
**Current State:** DELETE endpoint has no admin auth check  
**Desired State:** Calls `requireAdminApi()` before allowing deletion  
**Acceptance Criteria:**

- [ ] DELETE route checks `requireAdminApi()` first
- [ ] Non-admins get 401 response
- [ ] Impersonation session is properly logged before deletion

**Effort:** 0.5 hours  
**Status:** ⬜ Not Started

---

#### UA-A10: Add Global 401 Interceptor for Session Expiry (High)

**URL:** All user-facing pages (dashboard, AI tools, settings, etc.)  
**Files:** `src/lib/fetch-with-auth.ts` (create), all client components using `fetch()`  
**Current State:** Session expiry shows generic "Something went wrong" errors  
**Desired State:** Global 401 handler redirects to `/login` with callbackUrl  
**Acceptance Criteria:**

- [ ] Create `fetchWithAuth()` utility that wraps all fetch calls
- [ ] 401 responses automatically redirect to `/login?callbackUrl=...`
- [ ] User sees "Session expired. Please log in again" toast (not generic error)
- [ ] After login, user is redirected back to original page
- [ ] Applied to: composer, analytics, queue, settings, all AI tools

**Effort:** 2 hours  
**Status:** ⬜ Not Started

---

### Frontend Feature Completeness

#### UA-A11: Add AI Bio, Reply, Calendar to Hub + Sidebar (High — User Value)

**URL:** `/dashboard/ai`  
**Files:** `src/app/dashboard/ai/page.tsx`, `src/components/dashboard/sidebar-nav-data.ts`  
**Current State:** 3 fully-implemented AI tools (Bio, Reply, Calendar) are orphaned; not linked anywhere  
**Desired State:** Cards in hub + sidebar entries for all 7 AI tools  
**Acceptance Criteria:**

- [ ] Bio Generator card added to AI hub with icon and description
- [ ] Reply Generator card added to AI hub
- [ ] AI Calendar card added to AI hub
- [ ] All 3 tools added to sidebar AI Tools section with Pro badge
- [ ] Users can click from hub to each tool
- [ ] Users can click from sidebar to each tool

**Effort:** 1 hour  
**Status:** ⬜ Not Started

---

#### UA-A12: Implement Instagram/LinkedIn Account Disconnect with Confirmation (High — Security)

**URL:** `/dashboard/settings/integrations`  
**Files:** `src/components/settings/connected-instagram-accounts.tsx`, `src/components/settings/connected-linkedin-accounts.tsx`, `/src/app/api/accounts/instagram/disconnect/route.ts`, `/src/app/api/accounts/linkedin/disconnect/route.ts`  
**Current State:** Disconnect buttons show "Coming Soon" toast; no actual implementation  
**Desired State:** Working disconnect with confirmation dialog  
**Acceptance Criteria:**

- [ ] Disconnect endpoint exists and revokes API token
- [ ] AlertDialog confirms action with clear consequence messaging
- [ ] Account is removed from user's connected accounts list
- [ ] User receives confirmation toast
- [ ] Future posts cannot use the disconnected account

**Effort:** 1.5 hours  
**Status:** ⬜ Not Started

---

#### UA-A13: Composer SPA Navigation Guard (High — Data Loss Prevention)

**URL:** `/dashboard/compose`  
**Files:** `src/components/composer/composer.tsx`  
**Current State:** `beforeunload` guard only catches tab close; SPA navigation loses draft  
**Desired State:** Confirmation dialog on SPA navigation when draft has unsaved content  
**Acceptance Criteria:**

- [ ] Clicking sidebar link while composing shows confirmation dialog
- [ ] Dialog clearly states "Discard unsaved draft?"
- [ ] Clicking "Continue" discards and navigates; "Cancel" stays on page
- [ ] Dialog does NOT appear if draft is saved

**Effort:** 1 hour  
**Status:** ⬜ Not Started

---

#### UA-A14: Add ARIA Labels to Analytics Charts (High — Accessibility)

**URL:** `/dashboard/analytics`  
**Files:** `src/components/analytics/follower-chart.tsx`, `src/components/analytics/impressions-chart.tsx`, `src/components/analytics/engagement-rate-chart.tsx`  
**Current State:** Main charts missing `aria-label`; WCAG 1.1.1 violation  
**Desired State:** All Recharts containers have descriptive aria-labels  
**Acceptance Criteria:**

- [ ] Follower Growth chart has `aria-label="Follower growth over the past 30 days"`
- [ ] Impressions chart has `aria-label="Impressions per day over the past 30 days"`
- [ ] Engagement chart has `aria-label="Engagement rate per day over the past 30 days"`
- [ ] Screen reader test passes (Lighthouse accessibility audit)

**Effort:** 0.5 hours  
**Status:** ⬜ Not Started

---

#### UA-A15: Add Dirty-State Tracking to Settings Forms (High — UX)

**URL:** `/dashboard/settings/*` (profile, team, notifications, etc.)  
**Files:** `src/components/settings/profile-form.tsx` and other form components  
**Current State:** No dirty-state indicator; Save button always enabled  
**Desired State:** Save button disabled when `!isDirty`; unsaved changes warning on navigation  
**Acceptance Criteria:**

- [ ] Use `form.formState.isDirty` from React Hook Form
- [ ] Save button is `disabled={!isDirty || isSubmitting}`
- [ ] `beforeunload` listener warns if navigating away with unsaved changes
- [ ] Visual indicator (e.g., asterisk on form title) shows unsaved state

**Effort:** 1 hour  
**Status:** ⬜ Not Started

---

#### UA-A16: Display AI Quota on Hub Before Generation (High — UX)

**URL:** `/dashboard/ai`  
**Files:** `src/app/dashboard/ai/page.tsx`  
**Current State:** No usage display; users discover quota limits only after failed generation  
**Desired State:** Quota meter above tool cards with upgrade CTA if exhausted  
**Acceptance Criteria:**

- [ ] Fetch AI usage server-side in hub page
- [ ] Display progress bar: "Uses: 45/50" (example)
- [ ] If `used >= limit`, show alert: "AI quota exhausted. Upgrade to Pro for unlimited."
- [ ] Upgrade CTA links to billing page
- [ ] Update quota meter on page load (no cache)

**Effort:** 1 hour  
**Status:** ⬜ Not Started

---

#### UA-A17: Wire Sentry to Error Boundaries (High — Observability)

**URL:** All dashboard and app pages  
**Files:** All `src/app/**/error.tsx` files  
**Current State:** Error boundaries log to console but never call Sentry  
**Desired State:** Errors reported to Sentry with context  
**Acceptance Criteria:**

- [ ] Import `reportError` from `@/lib/client-error-handler` in each error.tsx
- [ ] Call `reportError(error, { context: "page-name" })` in useEffect
- [ ] Errors appear in Sentry dashboard
- [ ] Include user ID, page path, and error stack trace

**Effort:** 1 hour  
**Status:** ⬜ Not Started

---

#### UA-A18: Add Affiliate Link to Sidebar (High — Feature Visibility)

**URL:** `/dashboard/affiliate`  
**Files:** `src/components/dashboard/sidebar-nav-data.ts`  
**Current State:** Page exists but has no sidebar link  
**Desired State:** "Affiliate Dashboard" entry under Growth section  
**Acceptance Criteria:**

- [ ] Sidebar entry added for `/dashboard/affiliate`
- [ ] Entry appears under Growth section
- [ ] Link is clickable and navigates to page
- [ ] Affiliate users can self-serve

**Effort:** 0.25 hours  
**Status:** ⬜ Not Started

---

#### UA-A19: Hardcoded Model Name in AI Image Fallback (High — Compliance)

**URL:** N/A (API route only)  
**Files:** `src/app/api/ai/image/quota/route.ts:57`  
**Current State:** Hardcoded `"nano-banana-2"` fallback  
**Desired State:** All model names come from environment variables  
**Acceptance Criteria:**

- [ ] Replace hardcoded string with `process.env.REPLICATE_MODEL_FALLBACK!`
- [ ] Env var is required (with `!` assertion; no default)
- [ ] Tests confirm no hardcoded model names remain

**Effort:** 0.25 hours  
**Status:** ⬜ Not Started

---

## Phase B — Medium Severity Tasks

> **Recommended Timeline:** Weeks 2-3. These improve reliability and UX without blocking feature use.

### Backend Improvements

#### UA-B01: Add Plan Limit Check to Bulk Post Insert

**Files:** `src/app/api/posts/bulk/route.ts`  
**Current State:** Bulk import skips `checkPostLimitDetailed()`  
**Desired State:** Plan limits enforced before bulk insert  
**Effort:** 0.5 hours

---

#### UA-B02: Add Cache Invalidation to Plan Upgrade Webhook

**Files:** `src/app/api/billing/webhook/route.ts:428`  
**Current State:** `handleSubscriptionUpdated` missing `cache.delete()`  
**Desired State:** Plan cache invalidated on upgrade  
**Effort:** 0.25 hours

---

#### UA-B03: Implement Proper Diagnostics Endpoint with Token Check

**Files:** `src/app/api/diagnostics/route.ts`  
**Current State:** Public endpoint reveals infra config; weak rate limiting  
**Desired State:** Token-gated or dev-only endpoint  
**Effort:** 1 hour

---

#### UA-B04: Make Plan Change Log Retention Configurable

**Files:** `src/app/api/cron/billing-cleanup/route.ts`  
**Current State:** Hard-delete after 1 year; potential compliance issue  
**Desired State:** Configurable retention via env var (default 7 years)  
**Effort:** 0.5 hours

---

#### UA-B05: Fix Team Invite Route Zod Validation

**Files:** `src/app/api/team/invite/route.ts`  
**Current State:** Uses `.parse()` instead of `.safeParse()`  
**Desired State:** Proper error handling with 400 response  
**Effort:** 0.25 hours

---

#### UA-B06: Add Rate Limiting to User Deletion

**Files:** `src/app/api/user/delete/route.ts`  
**Current State:** No rate limiting; no Stripe cancel; no re-auth  
**Desired State:** Rate limiting + Stripe cancel + optional password re-auth  
**Effort:** 2 hours

---

### Frontend Improvements

#### UA-B07–B12: (6 additional medium-severity frontend tasks)

See `docs/audit/findings/user-frontend-findings.md` for details on:

- AI hub quota display
- Error boundary Sentry integration
- Affiliate sidebar link
- (Additional form and component improvements)

---

## Phase C — Low Severity Tasks

> **Recommended Timeline:** Weeks 4+. These are refinements and improvements beyond baseline quality.

#### UA-C01 through UA-C09: (9 low-severity tasks)

See findings files for:

- Stale JSDoc comments
- Missing correlationId in queue jobs
- Dynamic import error handling
- Profile page backend completion
- Docs page population
- (Additional UX refinements)

---

## Implementation Sequence Recommendation

### Week 1: Critical Path (9 tasks)

1. **UA-A01** — Stripe webhook sync (blocks production)
2. **UA-A04** — PATCH validation (blocks production)
3. **UA-A09** — Admin impersonation auth (blocks production)
4. **UA-A06** — Registration form (blocks user acquisition)
5. **UA-A07** — Password recovery (supports registration)
6. **UA-A11** — AI tools discoverability (unblocks Pro users)
7. **UA-A12** — Instagram/LinkedIn disconnect (security)
8. **UA-A02** — Invoice payment atomicity (data integrity)
9. **UA-A03** — Webhook replay (admin capability)

**Effort:** ~11 hours (1.5 days)

### Week 2: High-Impact Frontend + UX (10 tasks)

10. **UA-A10** — 401 interceptor (reliability)
11. **UA-A13** — Composer navigation guard (data loss)
12. **UA-A14** — Analytics ARIA labels (accessibility)
13. **UA-A15** — Settings dirty-state (UX quality)
14. **UA-A16** — AI quota display (UX friction)
15. **UA-A17** — Sentry integration (observability)
16. **UA-A05** — Better Auth rate limiting + 2FA (security)
17. **UA-A08** — Post update transaction (data integrity)
18. **UA-A18** — Affiliate sidebar (feature visibility)
19. **UA-A19** — Model name env var (compliance)

**Effort:** ~9 hours (1.5 days)

### Week 3-4: Phase B Medium-Severity Tasks (16 tasks)

Plan, bulk insert limits, cache invalidation, diagnostics hardening, retention config, team invite validation, user delete rate limiting, etc.

**Effort:** ~8 hours

### Week 5+: Phase C Low-Severity Tasks (9 tasks)

Comments, profile backend, docs population, error handling refinements, etc.

**Effort:** ~5 hours

---

## Total Effort Estimate

| Phase                   | Tasks  | Hours   | Days   | Weeks |
| ----------------------- | ------ | ------- | ------ | ----- |
| Phase A (Critical+High) | 32     | ~20     | ~2.5   | 2     |
| Phase B (Medium)        | 30     | ~15     | ~2     | 2     |
| Phase C (Low)           | 15     | ~5      | ~0.5   | 1     |
| **Total**               | **77** | **~40** | **~5** | **5** |

---

## Definition of Done

For each task:

- [ ] Code changes complete and match acceptance criteria
- [ ] `pnpm run check` passes (lint + typecheck)
- [ ] `pnpm test` passes (unit tests)
- [ ] Manual testing on staging matches desired state
- [ ] PR created, reviewed, approved
- [ ] Deployed to production

---

## Success Metrics

After completing all phases:

✅ **Security:** No critical vulnerabilities, rate limiting on auth, admin actions logged  
✅ **Reliability:** Session expiry handled gracefully, webhooks retry correctly, no orphaned records  
✅ **Completeness:** All 69 pages functional, no placeholders, all features discoverable  
✅ **UX:** Users can register, reset password, use all Pro features, see helpful error messages  
✅ **Admin:** Full visibility into system health, audit trail, ability to manage users at scale  
✅ **Accessibility:** WCAG AA compliance on all pages

---

## Next Steps

1. **Review** this plan and findings files with the team
2. **Prioritize** Phase A tasks with stakeholders
3. **Assign** tasks to engineers (recommended: 1 engineer per 2 tasks)
4. **Track** progress in GitHub Issues or linear.app with task IDs (UA-A01, etc.)
5. **Verify** each task against acceptance criteria before merge
6. **Release** Phase A critical fixes to production ASAP
7. **Publish** release notes highlighting security fixes + feature completeness

---

## Findings Reference

Detailed findings by dimension:

- **User Backend:** `docs/audit/findings/user-backend-findings.md`
- **User Frontend:** `docs/audit/findings/user-frontend-findings.md`
- **User UX:** `docs/audit/findings/user-ux-findings.md`
- **Admin Backend:** `docs/audit/findings/admin-backend-findings.md`
- **Admin Frontend:** `docs/audit/findings/admin-frontend-findings.md`
- **Admin UX:** `docs/audit/findings/admin-ux-findings.md`
