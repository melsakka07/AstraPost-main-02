# Security Audit: LinkedIn + Instagram Publishing (2026-07-07)

**Scope:** Read-only security review of OAuth and token handling for LinkedIn/Instagram publishing feature plan.

**Reviewed Files:**

- `src/app/api/linkedin/auth/route.ts`
- `src/app/api/linkedin/callback/route.ts`
- `src/app/api/instagram/auth/route.ts`
- `src/app/api/instagram/callback/route.ts`
- `src/lib/services/linkedin-api.ts`
- `src/lib/services/instagram-api.ts`
- `src/components/settings/connected-linkedin-accounts.tsx`
- `src/components/settings/connected-instagram-accounts.tsx`
- `src/lib/schema.ts` (linkedin_accounts, instagram_accounts tables)
- `src/lib/env.ts` (env var validation)
- Plan: `.claude/plans/2026-07-07-linkedin-instagram-publishing.md`

---

## CRITICAL ISSUES (Blocker)

### 1. Facebook App Secret Exposed in URL Query Parameter

**File:** `src/app/api/instagram/callback/route.ts:65, 77`

**Issue:** The `FACEBOOK_APP_SECRET` is passed as a URL query parameter in the Graph API token exchange call:

```typescript
// Line 62-67
const longLivedRes = await fetch(
  `https://graph.facebook.com/v19.0/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${FACEBOOK_APP_ID}` +
    `&client_secret=${FACEBOOK_APP_SECRET}` + // EXPOSED IN URL
    `&fb_exchange_token=${shortLivedToken}`
);
```

Query parameters are logged in:

- Browser history
- Server/proxy logs
- Referrer headers
- CDN/load balancer request logs
- Sentry error reporting (if an exception includes the URL)

**Risk:** Credential compromise, unauthorized API access to Facebook Graph API

**Fix:** Use POST request with parameters in the body instead of URL:

```typescript
const body = new URLSearchParams({
  grant_type: "fb_exchange_token",
  client_id: FACEBOOK_APP_ID,
  client_secret: FACEBOOK_APP_SECRET,
  fb_exchange_token: shortLivedToken,
});
const longLivedRes = await fetch("https://graph.facebook.com/v19.0/oauth/access_token", {
  method: "POST",
  body,
});
```

**Severity:** CRITICAL — affects all Instagram connections in production.

---

### 2. LinkedIn OAuth Endpoint Broken: `/v2/me` Requires Unsupported Scope

**File:** `src/lib/services/linkedin-api.ts:77-79`

**Issue:** The `getUser()` method calls:

```typescript
const response = await fetch(
  `${LINKEDIN_API_URL}/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))`,
  { headers: { Authorization: `Bearer ${this.accessToken}` } }
);
```

This endpoint (`/v2/me`) requires the `r_liteprofile` scope. However, the OAuth configuration in `src/app/api/linkedin/auth/route.ts:18` only requests:

```typescript
scope: "w_member_social profile email openid",
```

**Why it's broken:**

- `openid`, `profile`, `email` are OpenID Connect scopes (grant access to `/v2/userinfo` only)
- `w_member_social` is for posting capability
- There is NO `r_liteprofile` in the scope list
- LinkedIn will return `403 Forbidden` on the `/v2/me` call

**Where it fails:** LinkedIn callback at line 97 when it tries to fetch the user profile:

```typescript
const tempService = new LinkedInApiService(accessToken, "unknown");
const userInfo = await tempService.getUser(); // ← Will throw here
```

**Plan mismatch:** The plan (§1.1) correctly identifies this as a gap and proposes fixing it to use `/v2/userinfo` with the OpenID Connect response instead.

**Current behavior:** Account connection fails silently; user sees error redirect to settings with `error=linkedin_connection_failed`. This blocks the feature.

**Severity:** CRITICAL (blocker) — Phase 1 is impossible without this fix.

---

### 3. Missing Ownership Verification on Account Disconnect Routes (Future Implementation)

**File:** `src/components/settings/connected-linkedin-accounts.tsx:45`, `src/components/settings/connected-instagram-accounts.tsx:45`

**Issue:** Both components call `/api/accounts/linkedin/disconnect` and `/api/accounts/instagram/disconnect` routes that do not exist yet. When implemented, these routes MUST verify that the authenticated user owns the account being disconnected.

**Risk Pattern:** Without ownership verification, account A's authenticated user could pass account B's account ID and disconnect B's OAuth connection.

**Pattern to follow:** X account routes at `src/app/api/x/accounts/route.ts` verify ownership using `getTeamContext()` and checking `userId` match.

**Expected fix in implementation:**

```typescript
const { session, currentTeamId } = await getTeamContext(req);
if (!session) return ApiError.unauthorized();

const account = await db.query.linkedinAccounts.findFirst({
  where: eq(linkedinAccounts.id, accountId),
});

if (!account || account.userId !== session.user.id) {
  return ApiError.forbidden("You do not own this account");
}

await db.delete(linkedinAccounts).where(eq(linkedinAccounts.id, accountId));
```

**Severity:** CRITICAL — account takeover risk if oversight during Phase 1 implementation.

---

## HIGH ISSUES (Should Fix)

### 4. Service Files Missing `import "server-only"` Guard

**Files:**

- `src/lib/services/linkedin-api.ts` (no guard)
- `src/lib/services/instagram-api.ts` (no guard)

**Issue:** Both services import from `db.ts` (which imports Node.js `pg` driver), but lack `import "server-only"` as the first line. This violates CLAUDE.md rule 14.

**Why it matters:** Without the guard, Next.js tree-shaking cannot eliminate Node.js modules (like `pg`, `net`, `tls`) from the client bundle. If either service is ever transively imported by a client component, Node.js builtins leak into browser code.

**Current pattern (correct):** `src/lib/services/x-api.ts` starts with:

```typescript
import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
```

**Fix:** Add as first line in both files:

```typescript
import "server-only";
```

**Severity:** HIGH — bundle contamination risk; easy fix.

---

### 5. LinkedIn Token Refresh Not Implemented; Self-Serve Apps Get No Refresh Token

**File:** `src/lib/services/linkedin-api.ts:33-72`

**Issue:** The code attempts to refresh tokens:

```typescript
if (shouldRefresh && account.refreshTokenEnc) {
  try {
    // ... refresh logic
  }
}
```

However, **self-serve LinkedIn OAuth apps never receive a refresh token**. Per the plan (§0.1):

> "self-serve apps get **no refresh tokens** — access tokens live ~60 days, then users reconnect"

**Current problem:**

- Refresh token is always `null` for self-serve apps
- The `shouldRefresh` branch will never execute (condition `account.refreshTokenEnc` is false)
- After ~60 days, the token silently expires
- When a user tries to publish, the post fails

**Plan solution:** Phase 1.5 adds token expiry notifications in daily cron; worker detects expired token and marks account `paused_needs_reconnect`.

**Missing in current code:**

- Worker processor doesn't check `paused_needs_reconnect` state for LinkedIn (only does for X at lines 150-166)
- Daily cron job to check `tokenExpiresAt < now + 7d` and mark accounts needing reconnect
- No notification to user when token is about to expire

**Severity:** HIGH — posts fail after 60 days; no graceful degradation.

---

### 6. Instagram Token Refresh Not Implemented; 60-Day Expiry

**File:** `src/lib/services/instagram-api.ts:27-34`

**Issue:** Current code contains a TODO comment:

```typescript
// Instagram/Facebook Long-Lived tokens last 60 days.
// We should refresh if getting close to expiry, but for now we'll assume valid or handle error.
// Refreshing FB tokens usually involves a specific endpoint or just re-auth if completely expired.
// For long-lived tokens, you can query the endpoint to get a new one if it's old.

// Simple check: if < 3 days left, try refresh?
// Not implemented for this MVP phase, assuming manual re-connect if expired.
```

Unlike LinkedIn, **Facebook/Instagram long-lived tokens CAN be refreshed** without user interaction, using:

```
GET /oauth/access_token?grant_type=fb_exchange_token&client_id=...&client_secret=...&fb_exchange_token=<old_token>
```

**Plan solution:** Phase 2.3 adds refresh in daily cron when `tokenExpiresAt < now + 10d`.

**Current gaps:**

- No refresh logic implemented
- No token expiry check in worker
- No daily cron job for Instagram token refresh
- After 60 days, posts silently fail

**Severity:** HIGH — posts fail after 60 days; no graceful degradation.

---

### 7. Missing `paused_needs_reconnect` State Check in Worker

**File:** `src/lib/queue/processors.ts` (future Phase 1 implementation)

**Issue:** The plan (§1.2) says:

> "Account checks mirror `:150-166` (paused_needs_reconnect) and `:345-392` (inactive/ownership) but against `post.linkedinAccount`"

Current X implementation at `:150-166` in `processors.ts`:

```typescript
if (xAccount?.paused_needs_reconnect) {
  return {
    failReason: "x_token_needs_reconnect",
    status: "paused_needs_reconnect",
  };
}
```

**Missing for LinkedIn/Instagram:** When Phase 1 implements the processor branch, it must include the same check. Without it:

- Account with expired token shows no error to user
- Post sits in queue indefinitely or times out
- No notification sent to reconnect

**Severity:** HIGH — incomplete error handling path; blocks Phase 1 verification.

---

## MEDIUM ISSUES (Nice-to-Have Fix)

### 8. Feature Flags Not Wired in Routes

**Files:**

- `src/app/api/posts/route.ts` (no flag check)
- `src/components/composer/target-accounts-select.tsx` (UI doesn't surface flag)

**Issue:** The plan (§1.3) requires:

> "After parsing `selectedAccounts`: if any `linkedin` target and `!(await isFeatureEnabled("linkedin_publishing"))` → `ApiError.forbidden("LinkedIn publishing is not yet enabled")`"

Currently, there's no check in `posts/route.ts` for the `linkedin_publishing` or `instagram_publishing` flags before accepting a LinkedIn/Instagram post creation.

**Consequence:** Feature rollout control doesn't work; feature can be enabled/disabled at the feature-flag level, but posts still go through.

**Severity:** MEDIUM — affects rollout safety; feature still works if accidentally enabled.

---

### 9. Instagram Connection Missing Pro-Plan Gate

**File:** `src/app/api/instagram/callback/route.ts:32-35`

**Issue:** The callback checks account limit:

```typescript
const planCheck = await checkInstagramAccountLimitDetailed(session.user.id);
if (!planCheck.allowed) {
  return settingsRedirect(req, "error=instagram_plan_limit");
}
```

But there's no check for whether Instagram is a Pro-only feature. The plan (Phase 2 verification §2.3) implies Instagram posting requires a Pro plan.

**Missing gate:** Should check `checkInstagramAccessDetailed()` or equivalent, similar to LinkedIn at callback line 30.

**Current behavior:** Free users can connect Instagram accounts (will fail later when trying to post, but inconsistent UX).

**Severity:** MEDIUM — inconsistent plan enforcement; free users see connected account they can't use.

---

### 10. Redirect URI Validation (Infrastructure Concern, Not Exploitable)

**Files:** `src/app/api/linkedin/auth/route.ts:16`, `src/app/api/instagram/auth/route.ts:7`

**Issue:** Both auth routes construct redirect URIs from `process.env.NEXT_PUBLIC_APP_URL`:

```typescript
redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`;
```

**Check:** Are these values registered in the OAuth app settings (LinkedIn dev app, Facebook app)?

**Analysis:** Per the plan (§0.1 & §0.2), the user must manually register these redirect URIs in the OAuth platform settings. Character-for-character mismatch causes OAuth to fail at the platform (not AstraPost's responsibility).

**Status:** Not exploitable if setup is correct; potential user error in Part 0 setup.

**Recommendation:** Document setup step clearly; test with a real LinkedIn + Facebook dev app during Phase 1.

**Severity:** MEDIUM (operational risk, not code vulnerability).

---

## VERIFICATION CHECKLIST

### OAuth State/CSRF (Verified Safe)

- ✅ LinkedIn auth route generates `state` via `crypto.randomUUID()` (line 11)
- ✅ Instagram auth route generates `state` via `crypto.randomUUID()` (line 23)
- ✅ Both store in HttpOnly, SameSite=lax cookie with 10-minute expiry (lines 26-32, 35-41)
- ✅ Both callback routes validate state before using code (linkedin callback:49, instagram callback:44)
- ✅ Both clear cookie after use (linkedin callback:18, instagram callback:18)
- ✅ Parity with X OAuth flow (Better Auth handles X CSRF via `defaultCookieAttributes.sameSite`)

### Token Encryption (Verified Safe)

- ✅ LinkedIn callback uses `encryptToken(accessToken)` on plaintext token (line 104)
- ✅ Instagram callback uses `encryptToken(accessToken)` on plaintext token (line 142)
- ✅ Both services decrypt tokens before use (`decryptToken()`)
- ✅ No double-encryption risk; tokens don't arrive with `v1:` prefix
- ✅ Guards present in Better Auth databaseHooks (`isEncryptedToken()` checks at auth.ts:94, 98)

### Callback Authorization (Verified Safe)

- ✅ LinkedIn callback binds to authenticated `session.user.id` (line 100)
- ✅ Instagram callback binds to authenticated `session.user.id` (line 153)
- ✅ Both redirect user to `/login` if not authenticated (linkedin:26, instagram:26)
- ✅ Account upsert uses `userId` + unique constraint on platform ID (linkedin:112, instagram:135)
- ✅ Parity with X flow (Better Auth stores account under `user.id`)

### Secret Exposure in Logs (Mostly Safe, One Exception)

- ✅ LinkedIn callback doesn't log secrets (line 81 logs `errorText` as string, not secret)
- ✅ Instagram callback doesn't log secrets (line 165 logs generic error)
- ❌ Instagram callback includes `FACEBOOK_APP_SECRET` in URL (line 65, 77) — CRITICAL issue #1
- ✅ Neither service logs access tokens to console (uses `logger` instead, but logger calls not checked for token leakage)

### Disconnect Routes (Not Yet Implemented)

- ⚠️ Cannot verify until routes are built
- ⚠️ MUST add ownership check (issue #3)
- ⚠️ MUST check user can disconnect this account type (no cross-team disconnect)

---

## SUMMARY: 3 CRITICAL, 4 HIGH, 3 MEDIUM ISSUES

### By Severity:

**CRITICAL (Blockers):**

1. Facebook App Secret in URL query parameter (instagram/callback:65, 77)
2. LinkedIn getUser() broken endpoint / missing scope (linkedin-api:78-79)
3. Missing ownership verification on disconnect routes (future implementation)

**HIGH (Should Fix Before Launch):** 4. Service files missing `import "server-only"` (linkedin-api, instagram-api) 5. LinkedIn token refresh not implemented (linkedin-api:33-72) 6. Instagram token refresh not implemented (instagram-api:27-34) 7. Missing `paused_needs_reconnect` check in worker (processors.ts future)

**MEDIUM (Nice-to-Have):** 8. Feature flags not wired (posts/route + composer UI) 9. Instagram connection missing plan gate (instagram/callback) 10. Redirect URI validation (infrastructure, not code)

---

## MAPPING TO PLAN REQUIREMENTS

The plan's §1-2 correctly identifies gaps 1, 2, 5, 6, 7. Implementation should:

1. ✅ Phase 1.1: Fix LinkedIn getUser() to use `/v2/userinfo` (closes issue #2)
2. ✅ Phase 1.2: Add worker dispatch with `paused_needs_reconnect` check (closes issue #7)
3. ✅ Phase 1.3: Add feature flag gate in posts/route (closes issue #8)
4. ✅ Phase 1.5: Add daily cron for LinkedIn token expiry notification (closes issue #5)
5. ❌ Phase 2.3: Add Instagram token refresh in cron (closes issue #6)
6. ❌ Issue #1 (Facebook secret in URL) not mentioned in plan — **ADD TO PHASE 1.1**
7. ❌ Issue #3 (disconnect ownership) not mentioned in plan — **ADD TO PHASE 1.4 UI section**
8. ❌ Issue #4 (server-only guard) not mentioned in plan — **ADD to hard-rule compliance checklist**
9. ❌ Issue #9 (Instagram plan gate) not mentioned in plan — **ADD to Phase 2.2**

---

## HANDOFF NOTES FOR BACKEND-DEV

**Go/No-Go:** Feature is technically sound in design, but **CRITICAL issues must be fixed before Phase 1 approval:**

1. **Fix Facebook secret in URL immediately** — change POST body format
2. **Fix LinkedIn getUser() endpoint** — port from `/v2/me` to `/v2/userinfo` + refactor OpenID response mapping
3. **Add ownership check stub** to disconnect routes (can be implemented after main endpoints)
4. **Add `import "server-only"`** to both service files
5. **Implement token expiry flows** for both platforms (align with existing X pattern)
6. **Add feature flag checks** to posts/route before accepting LinkedIn/Instagram targets

**Test checklist:**

- LinkedIn OAuth callback returns 403 today (endpoint broken) — will pass after fix
- Instagram OAuth secret not leaking to logs — POST body hides secret
- Worker rejects posts for expired accounts — `paused_needs_reconnect` check
- Disconnect only works for account owner — ownership verification
- Free users see "coming soon" in composer when feature flag off

---

## LESSONS LEARNED

1. **OAuth secret in URL is a sneaky anti-pattern** — looks correct at first (standard query-param auth), but URLs are logged everywhere. Always use POST body for credentials.
2. **LinkedIn OpenID Connect vs r_liteprofile is a gotcha** — OpenID grants `/v2/userinfo` only; breaking `scope` → breaking callback. Plan correctly identified but implementation didn't yet.
3. **Token expiry state machine is critical** — without `paused_needs_reconnect`, expired tokens cause silent failures. Pattern from X should be reused, not invented.
4. **Feature flags must be enforced at creation time** — if not wired in posts/route, they're decorative.
