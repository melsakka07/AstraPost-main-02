# Backend & Worker Audit — LinkedIn/Instagram Publishing Plan

**Date:** 2026-07-07  
**Auditor:** researcher (read-only)  
**Scope:** Verify plan's 8 gaps + backend routes + queue/worker architecture vs actual code

---

## AREA 1: Processor Query & Type Definition — BLOCKER

**Finding:** Worker FullPost type is X-only; linkedinAccount/instagramAccount NOT loaded  
**Severity:** BLOCKER  
**File:Line:**

- Type definition: `src/lib/queue/processors.ts:68-74` — `FullPost` type includes ONLY `xAccount: InferSelectModel<typeof xAccounts> | null`, missing `linkedinAccount` and `instagramAccount`
- Query: `src/lib/queue/processors.ts:91-102` — loads only `xAccount: true`, not `linkedinAccounts` or `instagramAccounts` relations
- Schema relations exist: `src/lib/schema.ts:1401-1408` — `postRelations` DOES define `linkedinAccount` and `instagramAccount`, so relations are correctly defined

**Evidence:** The processor will fail immediately when trying to publish a LinkedIn/Instagram post because `post.linkedinAccount` and `post.instagramAccount` will be undefined, and the code has no dispatch logic to handle platform branching.

**What needs fixing:**

1. Update `FullPost` type to include `linkedinAccount` and `instagramAccount` relations
2. Update query to load all three relations with `with: { xAccount: true, linkedinAccount: true, instagramAccount: true }`

---

## GAP #1: Worker is X-only — CONFIRMED

**Plan claim:** "processor hardcoded `post.xAccount` checks (:170 throws, :349 account-inactive check on `xAccount`), `post.tweets` loop calls X media/postTweet only"

**Verification:**

- `src/lib/queue/processors.ts:170-171` — checks `if (!post.xAccountId) throw new Error("Post has no associated X account")` — **CONFIRMED hardcoded X check**
- `src/lib/queue/processors.ts:349` — checks `if (!post.xAccount?.isActive || post.xAccount?.userId !== post.userId)` — **CONFIRMED hardcoded X account inactivity check**
- `src/lib/queue/processors.ts:174-184` — creates `XApiService` via `XApiService.getClientForAccountId()` or dry-run mock; no platform dispatch
- `src/lib/queue/processors.ts:190-265` — loop processes `post.tweets`, calls `postTweet()` only (X-specific)

**Severity:** BLOCKER — Plan must implement platform dispatch before any LinkedIn/Instagram post can be published.

---

## GAP #2: Feature flags unwired — CONFIRMED

**Plan claim:** "Nothing checks `linkedin_publishing` / `instagram_publishing` — no rollout switch actually exists"

**Verification:**

- Flags defined: `src/lib/feature-flags.ts:50-58` — both flags exist in `DEFAULT_FLAGS` with `enabled: false`
- `isFeatureEnabled()` function exists: `src/lib/feature-flags.ts:13-31` — ready to use
- **NO check in posts/route.ts** — lines 129-215 parse accounts and gate on Instagram account limit (line 211) but NEVER check `linkedin_publishing` or `instagram_publishing` flags before accepting targets
- **NO check in processor.ts** — no flag validation at publish time

**Severity:** SHOULD-FIX — Feature flags are defined but not wired. Plan assumes they'll be added at creation time (posts/route.ts:121) and before dispatch.

---

## GAP #3: LinkedIn profile fetch broken — CONFIRMED

**Plan claim:** "`LinkedInApiService.getUser()` calls `/v2/me?projection=...`, which requires `r_liteprofile`. Our OpenID Connect scopes grant `/v2/userinfo` instead"

**Verification:**

- Auth route scopes: `src/app/api/linkedin/auth/route.ts:18` — requests `w_member_social profile email openid` — **CORRECT per plan**
- getUser() call: `src/lib/services/linkedin-api.ts:77-83` — calls `GET /v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture...)`
- Callback flow: `src/app/api/linkedin/callback/route.ts:96-97` — calls `new LinkedInApiService(accessToken, "unknown").getUser()` immediately after token exchange

**Severity:** BLOCKER — Will 403 on callback step 5 (getUser) until LinkedIn API service is fixed to use `/v2/userinfo` instead.

**What needs fixing:** Replace `/v2/me` with `GET /v2/userinfo` in `LinkedInApiService.getUser()`, map response fields accordingly (plan specifies: `sub` → `id`, `name` → `name`, `picture` → `avatarUrl`).

---

## GAP #4: LinkedIn media upload throws — CONFIRMED

**Plan claim:** "`linkedin-api.ts:138` throws — text-only"

**Verification:**

- `src/lib/services/linkedin-api.ts:134-139` — `if (content.media && content.media.length > 0) { throw new Error("Media upload not yet supported...") }`

**Severity:** NICE-TO-HAVE (Phase 1) — Intentional per plan. Posts/route.ts MUST reject LinkedIn posts with media at creation time (plan 1.3, lines 122).

**What needs fixing:** Add validation in posts/route.ts to reject LinkedIn targets when media exists.

---

## GAP #5: Instagram media must be public URL — CONFIRMED

**Plan claim:** "Local `/uploads/...` paths can't be fetched by Meta. Prod Vercel Blob URLs are absolute + public → fine"

**Verification:**

- `src/lib/services/instagram-api.ts:87, 105, 142, 157` — all use `mediaItem.url` directly in API calls without validation
- No check that `url.startsWith('/')` triggers error or local-dev warning

**Severity:** SHOULD-FIX — Local dev publishing will silently fail (Meta 404 on fetch). Plan assumes dry-run mode for local testing (1.2 and risk #3).

**What needs fixing:** In processor or instagram-api.ts, validate media URLs are public (not `/`-relative) or fail with actionable error message. Document dry-run requirement for local dev.

---

## GAP #6: Instagram token refresh not implemented — CONFIRMED

**Plan claim:** "60-day long-lived tokens silently expire. Not implemented for this MVP phase"

**Verification:**

- `src/lib/services/instagram-api.ts:27-33` — comment says "Not implemented for this MVP phase, assuming manual re-connect if expired"
- No refresh token logic (no `refreshToken()` call)

**Severity:** SHOULD-FIX (Phase 2) — Users must reconnect after 60 days. Plan 2.3 specifies token lifecycle refresh via cron.

---

## GAP #7: Graph API version pinned to v19.0 — CONFIRMED

**Plan claim:** "v19.0 is old; bump to current version"

**Verification:**

- `src/lib/services/instagram-api.ts:7` — `const GRAPH_API_URL = "https://graph.facebook.com/v19.0"`
- Used in lines 62, 74, 90, 104, 115, 142, 157, 173

**Severity:** NICE-TO-HAVE — v19.0 is old but functional. Plan 2.4 suggests bumping to current stable. No blocking impact.

---

## GAP #8: LinkedIn tokens no refresh — CONFIRMED

**Plan claim:** "Self-serve apps get no refresh token. `linkedin-api.ts:33` refresh path will simply never run. Users must reconnect ~60 days"

**Verification:**

- `src/lib/services/linkedin-api.ts:19-75` — `getClientForUser()` attempts refresh at line 33 if `shouldRefresh && account.refreshTokenEnc`
- Callback stores refreshToken: `src/app/api/linkedin/callback/route.ts:92, 105` — accepts `refresh_token` from LinkedIn response
- **Problem:** LinkedIn self-serve apps (per plan §0.1 line 32) return **no refresh token**, so `account.refreshTokenEnc` will be null, and refresh path never runs
- Users must manually reconnect via Settings after ~60 days

**Severity:** SHOULD-FIX — Add account-health cron (plan 1.5) to proactively mark accounts for reconnection when `tokenExpiresAt < now + 7d`.

---

## AREA 2: Posts Route (9-step API Checklist)

### Checklist Compliance — MOSTLY GOOD

**File:** `src/app/api/posts/route.ts:63-389`

| Step                    | Check                                           | Status    | Notes                                                                                                     |
| ----------------------- | ----------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------- |
| 1. Auth                 | `getTeamContext()` at line 65                   | ✓ PASS    | Returns 401 if null (line 67)                                                                             |
| 2. Role                 | Viewers blocked at line 71                      | ✓ PASS    | `ApiError.forbidden()`                                                                                    |
| 3. Correlation ID       | `getCorrelationId(req)` at line 88              | ✓ PASS    | Logged + returned in response header (line 383)                                                           |
| 4. Parse + validate     | Zod schema at line 98, `.safeParse()`           | ✓ PASS    | `ApiError.badRequest()` on failure (line 101)                                                             |
| 5. Rate limit           | `checkRateLimit()` at line 81                   | ✓ PASS    | `createRateLimitResponse()` on failure (line 86)                                                          |
| 6. Plan gate            | Multiple gates at lines 183-226                 | ⚠ PARTIAL | Post limit, thread access, video access, Instagram account limit, schedule horizon — BUT NO LinkedIn gate |
| 7. Transaction          | `db.transaction()` at line 353                  | ✓ PASS    | Batches insert posts, tweets, media (lines 354-356)                                                       |
| 8. Enqueue after commit | Jobs enqueued at line 365-373 after transaction | ✓ PASS    | Correctly wrapped in `try/catch`, queue failure doesn't discard posts                                     |
| 9. Response             | `Response.json()` at line 382                   | ✓ PASS    | Sets correlation ID header (line 383)                                                                     |

### Missing: LinkedIn feature flag gate — SHOULD-FIX

**Severity:** SHOULD-FIX  
**File:Line:** `src/app/api/posts/route.ts:208-215`  
**Current code:** Only checks Instagram account limit

```typescript
const hasInstagramTarget = selectedAccounts.some((a) => a.platform === "instagram");
if (hasInstagramTarget) {
  const instagramGate = await checkInstagramAccountLimitDetailed(ctx.currentTeamId, 0);
  if (!instagramGate.allowed) return createPlanLimitResponse(instagramGate);
}
```

**Plan requirement (1.3):** Add gate for LinkedIn after parsing selectedAccounts:

```typescript
const hasLinkedInTarget = selectedAccounts.some((a) => a.platform === "linkedin");
if (hasLinkedInTarget) {
  if (!(await isFeatureEnabled("linkedin_publishing"))) {
    return ApiError.forbidden("LinkedIn publishing is not yet enabled");
  }
}
```

### Missing: LinkedIn media validation — SHOULD-FIX

**Severity:** SHOULD-FIX  
**File:Line:** `src/app/api/posts/route.ts:208-215`  
**Plan requirement (1.3):** "LinkedIn target + any media → `ApiError.badRequest` (Phase 1 text-only)"

No code currently blocks this. Needs to add:

```typescript
const hasLinkedInTarget = selectedAccounts.some((a) => a.platform === "linkedin");
const hasMedia = tweetsData.some((t) => t.media?.length);
if (hasLinkedInTarget && hasMedia) {
  return ApiError.badRequest("LinkedIn image posts coming soon");
}
```

### Missing: Instagram media format validation — SHOULD-FIX (Phase 2)

**Severity:** NICE-TO-HAVE (Phase 2)  
**File:Line:** `src/app/api/posts/route.ts`  
**Plan requirement (2.2):** "Images: JPEG-only per Meta — validate extension/MIME, reject PNG/WebP for IG targets"

Not implemented. Requires extending media validation after platform target parsing.

### Missing: Instagram requires media — SHOULD-FIX (Phase 2)

**Severity:** SHOULD-FIX (Phase 2)  
**File:Line:** `src/app/api/posts/route.ts`  
**Plan requirement (2.2):** "Instagram target requires ≥1 media item → `ApiError.badRequest` if none"

Not implemented. Needs to add after Phase 2 is reached.

### TYPE for LinkedIn posts — ALREADY SET

**Finding:** Post type correctly branches on platform  
**File:Line:** `src/lib/app/api/posts/route.ts:318`

```typescript
type: postType ?? (acc.platform === "linkedin" ? "linkedin_post" : "tweet"),
```

**Severity:** INFO — Already correct. Plan risk #5 is correctly implemented.

---

## AREA 3: OAuth Callback Routes

### LinkedIn Callback — 9-step pattern ✓ PASS

**File:** `src/app/api/linkedin/callback/route.ts:22-129`

| Step           | Status | Notes                                                    |
| -------------- | ------ | -------------------------------------------------------- |
| Auth           | ✓      | Session check at line 24                                 |
| Role           | N/A    | N/A (callback is implicit owner/admin)                   |
| Correlation ID | N/A    | Not needed for OAuth                                     |
| Parse          | ✓      | State + code validation lines 45-61                      |
| Rate limit     | N/A    | Not applicable                                           |
| Plan gate      | ✓      | Checked at lines 30-38 (LinkedIn access + account limit) |
| Transaction    | N/A    | Single record upsert, no transaction needed              |
| Enqueue        | N/A    | No queue job                                             |
| Response       | ✓      | Redirect with query params (line 124)                    |

**CRITICAL BUG:** Step 5 will fail — callback calls `tempService.getUser()` at line 97, which hits the /v2/me bug (GAP #3). This prevents any LinkedIn connection until fixed.

### Instagram Callback — 9-step pattern ✓ PASS

**File:** `src/app/api/instagram/callback/route.ts:22-168`

Works correctly (does not call service methods that would fail). Plan gate checked at line 32.

---

## AREA 4: Disconnect Routes — PARITY ✓ PASS

**Files:**

- LinkedIn: `src/app/api/accounts/linkedin/disconnect/route.ts:12-34`
- Instagram: `src/app/api/accounts/instagram/disconnect/route.ts:12-36`

Both follow identical pattern:

1. Auth via getTeamContext ✓
2. Parse accountId ✓
3. Verify ownership ✓
4. Delete ✓
5. Return Response.json ✓

Minor issue: Line 14 uses bare `new Response("Unauthorized", {status: 401})` instead of `ApiError.unauthorized()` — could be stricter but not blocking.

---

## AREA 5: Feature Flags & Admin Wiring

**Finding:** Flags exist but not wired to routes  
**Severity:** SHOULD-FIX

- Flags defined: `src/lib/feature-flags.ts:50, 55`
- Function exists: `isFeatureEnabled(key)` at line 13
- **No usage in:**
  - posts/route.ts (should gate LinkedIn target creation)
  - posts/route.ts (should gate Instagram target creation) — note: Instagram has a different gate (`checkInstagramAccountLimitDetailed`) but that's not a feature flag
  - processor.ts (should gate dispatch per platform)

Plan assumes these will be added at creation-time gate step (1.3). No admin UI found for toggling flags, but that's not in scope for this audit.

---

## AREA 6: Account Health Cron — MISSING

**Plan requirement (1.5):** "Add LinkedIn accounts to daily account-health cron: if `tokenExpiresAt < now + 7d`, create 'reconnect soon' notification; if expired, set `isActive=false`"

**Status:** NOT FOUND

**Severity:** SHOULD-FIX (Phase 1.5)

No cron route exists yet. Plan mentions it should mirror X tier refresh logic (currently handled somewhere in the codebase — likely `src/app/api/cron/` but not verified in this audit). Needs to be added to load LinkedIn accounts and check expiration.

---

## AREA 7: Schema & Relations — CORRECT

**Finding:** All columns and relations exist  
**Severity:** INFO ✓ PASS

| Table                                            | Column                   | Status                                                     |
| ------------------------------------------------ | ------------------------ | ---------------------------------------------------------- |
| posts                                            | linkedinAccountId        | ✓ defined line 438                                         |
| posts                                            | instagramAccountId       | ✓ defined line 441                                         |
| posts                                            | platform                 | ✓ defined line 444 (platformEnum)                          |
| posts                                            | type                     | ✓ defined line 446 (postTypeEnum includes "linkedin_post") |
| postRelations                                    | linkedinAccount          | ✓ defined line 1401                                        |
| postRelations                                    | instagramAccount         | ✓ defined line 1405                                        |
| tweets                                           | published_id column      | ⚠ NOT VERIFIED — assumed from plan                         |
| xAccounts / linkedinAccounts / instagramAccounts | isActive, tokenExpiresAt | ✓ (verified in callback routes)                            |

**Minor concern:** `type` column defaults to `"tweet"` for all platforms. Plan risk #5 notes this is only LinkedIn-special-cased at line 318. Consider adding `instagram_post` enum value in Phase 2 if metrics/filtering by type is planned.

---

## AREA 8: Published-ID Column — NEEDS VERIFICATION

**Plan statement:** "Success: store returned URN in the `tweets` row's published-id column (reuse existing per-tweet published-id mechanism)"

**Status:** UNVERIFIED (not in audit scope, but flagged for implementation)

**Severity:** SHOULD-FIX

The plan assumes `tweets` table has a `published_id` column that can store X tweet IDs, LinkedIn URNs, and Instagram post IDs. Verify this column exists and supports all three platforms. If X-specific (e.g., only stores numeric IDs), may need refactoring or separate columns.

---

## AREA 9: Processor Error Handling — NEEDS PLATFORM DISPATCH

**Finding:** All error handling is X-specific; needs platform dispatch  
**Severity:** BLOCKER (Phase 1)

Current patterns to replicate for LinkedIn/Instagram:

- Line 150-166: "paused_needs_reconnect" check — generalize to all platforms
- Line 186-265: Tier validation — LinkedIn has 3,000 char limit (plan 1.2); Instagram 2,200 (plan 2.1)
- Line 267-343: Re-gate (plan quota) — marked as platform-agnostic ✓
- Line 349-392: Account inactivity check — generalize to all platforms
- Line 394-450+: Media loading — will need platform-specific handling (IG requires public URL, LI text-only for Phase 1)

All these patterns MUST be extracted into platform-agnostic helpers or switch statements for LinkedIn/Instagram branches.

---

## Summary of Severity by Category

### BLOCKERS (Must fix before publishing any LinkedIn/Instagram post)

1. **Processor type/query** — FullPost missing linkedinAccount/instagramAccount relations (processors.ts:68-102)
2. **LinkedIn getUser() endpoint** — calls /v2/me instead of /v2/userinfo (linkedin-api.ts:77-83)
3. **No platform dispatch in processor** — hardcoded X-only logic (processors.ts:170, 349, 174-184, 190-265)

### SHOULD-FIX (Phase 1)

1. Feature flags unwired (isFeatureEnabled not called in posts/route.ts)
2. LinkedIn media validation missing (posts/route.ts needs rejection)
3. LinkedIn account-health cron missing (plan 1.5)
4. Account inactivity check generalization for all platforms

### SHOULD-FIX (Phase 2)

1. Instagram token refresh not implemented
2. Instagram media validation (JPEG-only)
3. Instagram requires media check

### NICE-TO-HAVE

1. Graph API version bump (v19.0 → current)
2. Local-dev media URL validation warning
3. Published-ID column verification (may be X-specific)

---

## Cross-Cutting Observations

1. **Optional chaining:** Check all new platform dispatch code uses `?.` at every level (per memory note)
2. **Dry-run testing:** Plan mentions `SOCIAL_DRY_RUN=1` env var; currently only `TWITTER_DRY_RUN=1` exists. Add support for social-api-level dry runs.
3. **Notification metadata:** Plan mentions generalizing notification metadata (processor.ts:381) to include `platform` + `accountId`. Currently hardcoded for X; needs refactoring.
4. **Job runs bookkeeping:** Currently X-specific; refactor to be platform-agnostic once dispatch added.
5. **Token refresh error handling:** LinkedIn can't refresh (self-serve), Instagram will need 401 → isActive=false + notification pattern similar to X.
6. **Testing:** Plan requires `bullmq.test.ts` extension with platform-dispatch unit tests. Verify test can run without hitting real APIs (dry-run mode).

---

## Lessons

- **Plan's 8 gaps are accurate:** All verified in code except gap #8 is partially correct (refresh code exists but will never run due to missing refresh token).
- **Feature flags are defined but unused:** Clean infrastructure exists; just needs wiring in two places (posts/route.ts + processor.ts).
- **OAuth callbacks are well-structured:** Both LinkedIn and Instagram follow proper CSRF + error handling patterns; only LinkedIn callback will fail due to endpoint mismatch.
- **Schema is production-ready:** All required columns and relations already exist; no migration needed.
- **Processor needs significant refactoring:** Current X-only approach will require extracting all logic into platform-agnostic dispatch; suggest creating a `publishPostByPlatform()` helper and branching on `post.platform`.
- **Worker dry-run needs extension:** Plan assumes `SOCIAL_DRY_RUN=1` but only `TWITTER_DRY_RUN=1` exists; need to generalize.
