# AREA 2 AUDIT — Services Layer Conventions

**Date:** 2026-07-07  
**Scope:** LinkedIn/Instagram publishing services + cross-cutting API conventions  
**Context:** Plan `2026-07-07-linkedin-instagram-publishing.md`

---

## VIOLATIONS FOUND

### 1. **BLOCKER — Missing `import "server-only"` in service files**

| File                                | Line | Rule          | Severity |
| ----------------------------------- | ---- | ------------- | -------- |
| `src/lib/services/linkedin-api.ts`  | 1    | CLAUDE.md #14 | Blocker  |
| `src/lib/services/instagram-api.ts` | 1    | CLAUDE.md #14 | Blocker  |

**Rule 14 (CLAUDE.md line 296-297):** "Any `src/lib/` module that imports from `db.ts` MUST have `import "server-only"` as its first line — prevents Node.js builtins (`fs`, `net`, `tls`) from leaking into client bundles via transitive imports"

**Findings:**

- Both `linkedin-api.ts` and `instagram-api.ts` import `db` (line 2 and 2 respectively)
- Neither has `import "server-only"` as the first line
- This creates a security/bundle risk: if a client-side component transitively imports these services via database schema or type exports, Node.js builtins from db.ts could leak into the client bundle

**Impact:** When worker (`src/lib/queue/processors.ts`) or routes instantiate these services, the bundler may not be able to tree-shake server-only code properly.

**Fix needed:**

- `linkedin-api.ts`: Add `import "server-only";` at line 1, before other imports
- `instagram-api.ts`: Add `import "server-only";` at line 1, before other imports

---

### 2. **SHOULD-FIX — Hardcoded Graph API version**

| File                                | Line | Rule                     | Severity   |
| ----------------------------------- | ---- | ------------------------ | ---------- |
| `src/lib/services/instagram-api.ts` | 7    | CLAUDE.md #3 (principle) | Should-fix |

**Rule 3 (CLAUDE.md line 115-116):** "Never hardcode AI model names — env vars only" (principle extends to API versions)

**Finding:**

```typescript
const GRAPH_API_URL = "https://graph.facebook.com/v19.0"; // Line 7
```

Version `v19.0` is hardcoded. Plan gap #7 explicitly calls this out and Phase 2.4 (line 165) says:

> "Bump `GRAPH_API_URL` v19.0 → current stable (constant, or `FACEBOOK_GRAPH_VERSION` env with default — use `process.env.X` directly, NOT `getServerEnv()`, since worker + web both load this service and Railway lacks web-only vars)."

This version is stale and should be parameterized via env var with a sensible default.

**Fix needed:**

- Define `const GRAPH_API_URL = process.env.FACEBOOK_GRAPH_VERSION ? `https://graph.facebook.com/${process.env.FACEBOOK_GRAPH_VERSION}` : "https://graph.facebook.com/v22.0";`
- Add `.env.example` entry: `FACEBOOK_GRAPH_VERSION=v22.0` (or current stable at implementation time)

---

### 3. **DESIGN GAP — Multi-account selection (not a convention violation, but plan-flagged)**

| File                                | Method             | Line  | Plan Gap | Severity     |
| ----------------------------------- | ------------------ | ----- | -------- | ------------ |
| `src/lib/services/linkedin-api.ts`  | `getClientForUser` | 19-75 | #3       | Design issue |
| `src/lib/services/instagram-api.ts` | `getClientForUser` | 18-36 | #3       | Design issue |

**Finding:**
Both services have a `getClientForUser(userId)` static method that queries:

```typescript
const account = await db.query.linkedinAccounts.findFirst({
  where: and(eq(linkedinAccounts.userId, userId), eq(linkedinAccounts.isActive, true)),
});
```

This picks the **first active account** via `findFirst`, but users can have multiple LinkedIn/Instagram accounts. The worker processor will need to dispatch to a **specific** account (e.g., `post.linkedinAccountId`), not just "any active one."

Plan Phase 1.2 (line 113) explicitly calls for a refactor:

> "Call `LinkedInApiService.getClientForUser(post.userId)` — **refactor to `getClientForAccountId(post.linkedinAccountId)`** (current `getClientForUser` picks the first active account, wrong for multi-account; mirror `XApiService.getClientForAccountId` pattern at `processors.ts:180`)."

**Status:** This is a design gap the plan expects to be fixed in Phase 1. Not a convention violation — an architectural change needed before worker integration.

---

### 4. **PLAN VERIFICATION — LinkedIn `getUser()` endpoint issue**

| File                               | Line   | Plan Gap | Status      |
| ---------------------------------- | ------ | -------- | ----------- |
| `src/lib/services/linkedin-api.ts` | 77-108 | #3       | Confirmed ✓ |

**Finding:**
Line 78-79 calls `/v2/me?projection=(...)` which requires `r_liteprofile` scope, but the callback route (`src/app/api/linkedin/callback/route.ts:18`) requests `w_member_social profile email openid` — **no `r_liteprofile`**.

This is exactly plan gap #3. The endpoint will 403 at runtime. Phase 1.1 requires replacing this with `/v2/userinfo` (the OpenID Connect endpoint that works with current scopes).

**Status:** Plan gap confirmed; implementation required in Phase 1.1.

---

### 5. **PLAN VERIFICATION — LinkedIn media upload throws**

| File                               | Line | Plan Gap | Status      |
| ---------------------------------- | ---- | -------- | ----------- |
| `src/lib/services/linkedin-api.ts` | 138  | #4       | Confirmed ✓ |

**Finding:**

```typescript
if (content.media && content.media.length > 0) {
  throw new Error("Media upload not yet supported for LinkedIn in this version");
}
```

Explicitly throws on media, as expected for Phase 1 (text-only). Phase 1.3 (`src/app/api/posts/route.ts`) will validate at creation time to reject media + LinkedIn targets earlier.

**Status:** Plan gap confirmed; defensive throw in place.

---

### 6. **PLAN VERIFICATION — Instagram token refresh not implemented**

| File                                | Lines | Plan Gap | Status      |
| ----------------------------------- | ----- | -------- | ----------- |
| `src/lib/services/instagram-api.ts` | 27-34 | #6       | Confirmed ✓ |

**Finding:**

```typescript
// Instagram/Facebook Long-Lived tokens last 60 days.
// We should refresh if getting close to expiry, but for now we'll assume valid or handle error.
// ...
// Not implemented for this MVP phase, assuming manual re-connect if expired.
```

No refresh logic; tokens silently expire after 60 days. Plan Phase 2.3 (line 159-162) requires:

> "Long-lived FB tokens (60d): add refresh in the daily cron — exchange via `GET /oauth/access_token?grant_type=fb_exchange_token&...` when `tokenExpiresAt < now + 10d`; on failure set `isActive=false` + notification."

**Status:** Plan gap confirmed; Phase 2 work item.

---

### 7. **DESIGN DEBT — LinkedIn refresh path dead for self-serve apps**

| File                               | Lines | Plan Gap | Status      |
| ---------------------------------- | ----- | -------- | ----------- |
| `src/lib/services/linkedin-api.ts` | 33-71 | #8       | Confirmed ✓ |

**Finding:**
Lines 33-71 implement a refresh token flow:

```typescript
if (shouldRefresh && account.refreshTokenEnc) {
  // OAuth exchange...
  await fetch("https://www.linkedin.com/oauth/v2/accessToken", { ... });
}
```

However, LinkedIn's **self-serve "Share on LinkedIn" product grants NO refresh tokens** (only partner-level apps get them). Line 87 of the plan confirms:

> "self-serve apps get **no refresh token** — access tokens live ~60 days, then users reconnect (handled in Phase 1.5)."

**Result:** The `refreshTokenEnc` field will always be null, `shouldRefresh` will always be false (or silent-continue), and the refresh path never runs. This is not a bug; it's an unused code path. Phase 1.5 adds handling via the daily account-health cron instead.

**Status:** Plan gap confirmed; working as expected for MVP, full lifecycle handling in Phase 1.5.

---

## CROSS-CUTTING CONVENTION SCAN

### ✓ Rule 4 (ApiError usage)

Callbacks (`linkedin/callback`, `instagram/callback`) do NOT return JSON responses — they return `NextResponse.redirect()` with query params. No ApiError violations.

### ✓ Rule 11 (Logger, no console)

- `linkedin-api.ts:153,67-71`: uses `logger.error()` ✓
- `instagram-api.ts`: no logging calls (service is silent on failure, routes will handle)
- Callbacks: use `logger.error()` ✓

### ✓ Rule 12 (Response.json not NextResponse.json)

Callbacks return only `NextResponse.redirect()` for navigation, no JSON responses. No violation.

### ✓ Rule 9 (exactOptionalPropertyTypes spread pattern)

Callbacks set optional fields explicitly (e.g., `linkedinAvatarUrl: userInfo.avatarUrl ?? null`), not via spread pattern. This is acceptable — the spread pattern is only needed when conditionally including optional properties based on defined-ness, not when explicitly setting to null.

### ✓ Rule 5 (db.transaction for multi-table writes)

Callbacks do single-table upserts (insert or update `linkedin_accounts` / `instagram_accounts` only). No transaction needed per CLAUDE.md context.

### ⚠ Optional detail: Env var access

- `linkedin-api.ts:39-40`: Uses `process.env.LINKEDIN_CLIENT_ID!` and `LINKEDIN_CLIENT_SECRET!` directly (not `getServerEnv()`). This is correct per memory note: worker + web both load this service, and Railway may lack web-only vars. ✓
- `instagram-api.ts`: Does not access env vars at all. ✓
- Callbacks: Both construct URLs using `process.env.NEXT_PUBLIC_APP_URL` and other env vars. Correct pattern. ✓

---

## PLAN-SPECIFIC VERIFICATION SUMMARY

| Gap # | Issue                            | File:Line                | Severity                         | Status              |
| ----- | -------------------------------- | ------------------------ | -------------------------------- | ------------------- |
| #3    | LinkedIn `/v2/me` scope mismatch | `linkedin-api.ts:77-79`  | Blocker (endpoint 403)           | Phase 1.1 work item |
| #4    | LinkedIn media upload missing    | `linkedin-api.ts:138`    | Design (not Phase 1)             | Working as expected |
| #6    | Instagram token refresh missing  | `instagram-api.ts:27-34` | Design (Phase 2)                 | Phase 2 work item   |
| #7    | v19.0 pinned (old)               | `instagram-api.ts:7`     | Should-fix                       | Phase 2.4 work item |
| #8    | LinkedIn refresh dead code       | `linkedin-api.ts:33-71`  | Design (expected for self-serve) | Working as expected |

---

## SUMMARY OF ACTIONABLE VIOLATIONS

**Must fix BEFORE Phase 1 backend-dev start:**

1. Add `import "server-only";` to both `linkedin-api.ts` and `instagram-api.ts` (line 1) — **Blocker**

**Nice-to-have before Phase 1 but can defer to Phase 2:** 2. Parameterize `GRAPH_API_URL` with env var `FACEBOOK_GRAPH_VERSION` in `instagram-api.ts:7`

**Plan-flagged design work (expected in implementation):** 3. Refactor both services: `getClientForUser(userId)` → `getClientForAccountId(accountId)` to match X pattern 4. Fix LinkedIn `getUser()` to call `/v2/userinfo` instead of `/v2/me?projection` (Phase 1.1) 5. Add Instagram token refresh in daily cron (Phase 2.3) 6. Add LinkedIn account health checks in daily cron (Phase 1.5)

---

## LESSONS

1. **server-only import enforcement:** Both new service files importing db.ts are missing the critical security boundary. This should be caught by a pre-commit hook or linter, not manual audit.

2. **Hardcoded versions decay:** API versions (v19.0 is from 2024) should be env-vars with clear "bump by date" guidance in docs. Current approach leaves old versions in code indefinitely.

3. **Multi-account bug is pervasive:** The `.findFirst()` pattern for picking "any active account" appears in multiple places. Phase 1 refactoring should establish a clear pattern (`getClientForAccountId`), then audit all callers to match.

4. **Plan gaps are mostly design, not conventions:** LinkedIn refresh dead code, Instagram refresh MVP stub — these are intentional design choices documented in the plan, not rule violations. The audit confirms alignment.

5. **Callback routes are solid:** OAuth callbacks follow the security patterns (CSRF state validation, error handling, token encryption) correctly. No convention issues found.
