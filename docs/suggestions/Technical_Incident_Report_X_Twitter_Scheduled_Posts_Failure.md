Here is the detailed technical report regarding the scheduled posts failure.

---

# Technical Incident Report: X (Twitter) Scheduled Posts Failure

## Table of Contents

1. [Incident Analysis](#incident-analysis)
2. [Immediate Remediation (Short-Term Fix)](#immediate-remediation-short-term-fix)
3. [Architectural Solution: Unified OAuth Flow](#architectural-solution-unified-oauth-flow)
4. [Implementation Blueprint](#implementation-blueprint)
   - [Backend Changes](#backend-changes)
   - [Frontend Changes](#frontend-changes)
   - [Queue/Worker Changes (Retry Policy)](#queueworker-changes-retry-policy)
5. [Migration and Rollout Strategy](#migration-and-rollout-strategy)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Handling the `offline.access` Scope Consent](#handling-the-offlineaccess-scope-consent)

---

## Incident Analysis

### **Problem Statement**

Scheduled tweets and threads are failing to publish at their designated times. Users observe that their scheduled content remains in the queue (or is marked as failed) and does not appear on their X (Twitter) timeline. The background queue processor attempts to execute the job but encounters a fatal authorization error, preventing the payload from being delivered to the X API.

### **Observations**

Based on the provided worker logs from the Railway environment (`logs02.txt` and `logs03.txt`) and the internal application architecture, the following technical sequence was observed:

1. **Queue Execution Initialization:**
   The background worker (`scripts/worker.ts`) successfully polls the `schedule-queue` and picks up the pending post.
   _Log evidence:_ `[inf] schedule_job_started`
2. **OAuth 2.0 Token Refresh Failure:**
   Before dispatching the payload to the X API, the application attempts to initialize the `XApiService` (`src/lib/services/x-api.ts`). Because X OAuth 2.0 Access Tokens have a short TTL (2 hours / 7200 seconds), the system routinely relies on the stored Refresh Token (`refreshTokenEnc` in the `xAccounts` database table) to negotiate a fresh Access Token via `twitterClient.refreshOAuth2Token()`.
   This negotiation is being actively rejected by the X Authorization Server (typically resulting in a HTTP 400 or 401 response).
   _Log evidence:_ `[wrn] x_token_refresh_failed`
3. **Downstream API Failure:**
   Because the service fails to acquire a valid Bearer token, the subsequent call to the `v2.tweet` endpoint is aborted or unauthorized.
   _Log evidence:_ `[err] x_tweet_post_failed`
4. **Job Termination:**
   The uncaught exception bubbles up to the job processor, marking the background job as failed and preventing the database from marking the scheduled post as `published`.
   _Log evidence:_ `[err] schedule_job_failed` followed by `[err] job_failed`

**Technical Root Causes for Refresh Token Invalidation:**

- **Permission Scope Mutation:** If the OAuth App permissions in the Twitter Developer Portal were recently modified (e.g., changing from "Read-only" to "Read and Write"), X automatically and immediately revokes all previously issued tokens for security reasons.
- **Manual Revocation:** The user manually revoked the application's access from their X account settings.
- **Refresh Token Expiration:** Under certain OAuth 2.0 policies (like prolonged inactivity or single-use token rotation desyncs), the refresh token itself can expire or become invalid.

### **Root Cause: The "Two-Session" Problem**

While the three causes listed above explain _why_ the refresh token became invalid in the first place, AstraPost's two-session architecture explains _why the system couldn't self-heal_ when the user subsequently logged back in. The token invalidation is the trigger; the two-session design is the amplifier.

Currently, AstraPost maintains two separate OAuth sessions:

1. **Authentication Session:** Created at login. Used strictly for verifying identity.
2. **API Integration Session:** Created explicitly in "Settings -> Connect X Account". Used for elevated scopes (`tweet.write`, `offline.access`) required by the background worker.

Because these two sessions are completely independent, a user logging back into the app using X refreshes their _Authentication Session_ but does **not** update their _API Integration Session_. Consequently, users think their X account is connected (since they just logged in with it), but the background worker's `xAccounts` token remains expired, leading to the silent failures observed in the queue.

### **Immediate Remediation (Short-Term Fix)**

_The following steps are for affected users and support staff to restore scheduled posting capabilities today, prior to the architectural fix being deployed._

1. **Verify Twitter Developer App Permissions:** Ensure the OAuth App permissions in the Twitter Developer Portal are set to "Read and Write" and that the scopes include `offline.access`.
2. **Manual Reconnection:** The affected user must navigate to the AstraPost **Settings** page, click **Disconnect** on their X account, and then click **Connect X Account** to initiate a fresh OAuth 2.0 flow. This writes new, valid tokens to the `xAccounts` table.
3. **Reschedule Jobs:** Navigate to the AstraPost **Calendar** or **Queue**, locate the failed posts, and reschedule them for a future time.

---

## Architectural Solution: Unified OAuth Flow

Since AstraPost uses X as its **sole login provider** and every user who logs in is expected to also post via X, the correct architectural choice is **Approach A: Unified Single OAuth Flow**.

The idea here is to eliminate the two-session problem entirely by requesting all necessary permissions — both identity verification and posting capabilities — in a single OAuth 2.0 Authorization Code flow at login time.

**Why this approach?**

- It is simpler and eliminates an entire class of desynchronization bugs.
- It provides the most seamless user experience: the user never has to think about "connecting" versus "logging in" — they are the same action.
- Every login automatically refreshes the posting credentials in the background. The problem described in the incident report becomes structurally impossible.

---

## Implementation Blueprint

### Backend Changes

**Step 1: Define the Unified Scope Set**
In the authentication configuration, ensure the OAuth scope string includes everything both flows currently request independently:

```typescript
const UNIFIED_X_SCOPES = [
  "tweet.read", // Read tweets (needed for identity + integration)
  "tweet.write", // Post tweets (needed for scheduled posting)
  "users.read", // Read user profile (needed for identity)
  "offline.access", // Issue a long-lived Refresh Token (critical for background worker)
  // NOTE: If future features require new scopes (e.g. dm.write), adding them here
  // will invalidate all existing tokens and force all users to re-authenticate.
].join(" ");
```

**Step 2: Handle the Callback to Serve Both Purposes**
Update the OAuth callback handler so that it not only establishes the application session but also persists the background worker tokens to the `xAccounts` table on _every_ login. The callback must handle both the insert (for first-time users) and update (for returning users) paths via an upsert pattern.

_Prerequisite: Ensure a composite unique constraint exists on `[userId, xUserId]` in the `xAccounts` schema to support the upsert operation safely._

```typescript
// 1. Exchange the authorization code for tokens
// 2. Fetch the user's X profile to identify them
// 3. PURPOSE A — Authentication: Create or resume the app session
// 4. PURPOSE B — API Integration: Upsert `xAccounts` table with the fresh tokens
await db
  .insert(xAccounts)
  .values({
    id: crypto.randomUUID(),
    userId: user.id,
    xUserId: xProfile.id,
    xUsername: xProfile.username,
    accessTokenEnc: encrypt(accessToken),
    refreshTokenEnc: encrypt(refreshToken),
    tokenExpiresAt: newExpiresAt,
    isActive: true,
  })
  .onConflictDoUpdate({
    target: [xAccounts.userId, xAccounts.xUserId], // Assuming a unique constraint
    set: {
      accessTokenEnc: encrypt(accessToken),
      refreshTokenEnc: encrypt(refreshToken),
      tokenExpiresAt: newExpiresAt,
      isActive: true,
      updatedAt: new Date(),
    },
  });
```

### Frontend Changes

**Step 3: Settings Page & Onboarding Adjustments**
The shift to a unified flow has cascading effects on the frontend UI that must be addressed:

- **The Settings/Accounts Page:** The separate "Connect X Account" button must be deprecated and hidden (while keeping the backend route intact as a safety net). Furthermore, the "Disconnect" button must be redefined. Under the unified flow, the X account _is_ the user's identity. Disconnecting it is semantically equivalent to logging out. The UI should replace the "Disconnect" button with a read-only account status display (showing the linked @username, token health, and last refresh time).
- **The Onboarding Flow:** For first-time users, the legacy flow involved a post-login step to "Connect your X account". This step is now entirely redundant. The onboarding UI, tutorial tooltips, and setup wizards must be rewritten to skip account connection and drop the user directly into product usage (e.g., the dashboard or composer).

**Step 4: Error States & State Preservation**
To handle edge cases where a token is revoked _while_ a user is logged in (e.g., they manually revoked the app in Twitter settings), the frontend needs robust error handling:

- **Global Warning Banner:** Add a global `<TokenWarningBanner />` to `src/app/dashboard/layout.tsx` that prompts the user to "Reconnect Now" if `isActive === false`.
- **Contextual Component Errors:** Audit conditional UI elements (like the Post Composer or Scheduler). If the user is actively composing a post and the backend discovers the token is invalid, catch the specific error and display an inline message (e.g., _"Your X connection has expired. Please reconnect to schedule posts."_) rather than a generic "Something went wrong" toast.
- **State Preservation on Reconnect:** Because clicking "Reconnect Now" initiates a full OAuth redirect (effectively logging the user out and back in), the UX copy should set expectations: _"⚠️ Connection to X account @username has expired. Scheduled posts will fail. Click below to briefly redirect to X and reauthorize."_
  - _URL Preservation:_ The OAuth `state` parameter must encode the user's current URL path so the callback can return them to their exact location.
  - _Data Preservation:_ The reconnect button's click handler should save any volatile client-side state (such as unsaved form data in the composer) to `localStorage` or `sessionStorage` before the redirect, and restore it upon return, preventing frustrating data loss.

### Queue/Worker Changes (Retry Policy)

**Step 5: Differentiated Retry for Authorization Failures**
Currently, the worker (`src/lib/queue/processors.ts`) treats a 401/400 OAuth token failure as a permanent error (`isFinalAttempt = true`), marking the post as `failed` immediately. This forces the user to manually reschedule the post even after they log back in.

To enable system self-healing, the worker must differentiate between an API rejection (e.g., duplicate content) and an authorization gap:

- **Status Differentiation:** When catching a permanent authorization error (400/401 on token refresh), do not mark the `posts` table status as `failed`. Instead, mark the account `isActive: false` (as defined in Step 4) and set the post status to `paused_needs_reconnect`.
- **Delayed BullMQ Retry:** Rather than throwing an error that exhausts BullMQ's default retry counter, instruct BullMQ to delay the job (e.g., using `job.moveToDelayed(Date.now() + 15 * 60 * 1000, job.token)` or throwing a specific custom error caught by a custom backoff strategy) for a longer window, such as 72 hours.
- **Pre-flight Token Check:** On subsequent retries of a `paused_needs_reconnect` job, the processor should first check the `xAccounts` table. If `isActive` is still false, it should immediately delay the job again without attempting to hit the X API. If `isActive` is true (meaning the user has logged back in), it resumes normal processing.
- **Frontend Integration:** Posts with `paused_needs_reconnect` should appear in the Calendar and Queue with a yellow "Waiting for reconnection" badge instead of a red "Failed" badge. Upon a successful login callback, the frontend should show a toast: _"Paused posts have been automatically re-queued and will publish shortly."_

---

## Migration and Rollout Strategy

When deploying the unified flow, consider the following migration paths:

- **Existing Users with Valid Tokens:** These users will not be disrupted. Their background worker will continue functioning normally. On their next natural login, the unified callback will seamlessly overwrite their tokens with fresh ones.
- **Existing Users with Expired Tokens:** Users currently experiencing the incident simply need to log out and log back in. The new callback will create fresh tokens in `xAccounts` and restore `isActive: true`. Communicate to affected users that a simple re-login will resolve their scheduling failures.
- **Database Schema Compatibility:** The unified flow writes to existing fields (`accessToken`, `refreshTokenEnc`, `tokenExpiresAt`, `isActive`). Verify that no application-level checks or constraints assume `xAccounts` records are exclusively created via the legacy "Connect Account" flow.
- **Session Invalidation:** Depending on session management (e.g., JWT vs. database-backed), deploying the new callback logic will likely not invalidate existing sessions. Existing logged-in users will remain logged in with their old sessions until they expire, at which point the unified flow will take effect on their next login. _Alternative strategy:_ If rapid remediation is required across the user base, consider aggressively force-invalidating all existing sessions upon deployment. This causes brief disruption but guarantees 100% of users immediately pass through the new unified callback on their next visit, resolving the problem instantly.

---

## Post-Deployment Verification

To confirm the architectural fix is operational and prevent future silent failures, the following verification steps must be executed immediately post-deployment.

**1. Log-Level Verification:**

- Have a test user (or the originally affected user) log out and log back in via X.
- Check the application logs for the callback handler to confirm the `xAccounts` upsert executed successfully.
- Schedule a test post for a few minutes in the future.
- Monitor the background worker logs. You should observe the sequence: `schedule_job_started` → successful token refresh (or direct token usage) → successful post delivery. The absence of `x_token_refresh_failed` confirms the fix.

**2. Database-Level Verification:**

- After the test login, query the `xAccounts` table for the test user.
- Verify that `isActive` is `true`.
- Verify that `tokenExpiresAt` reflects a timestamp approximately two hours in the future from the exact login time.
- Verify that `updatedAt` (or `lastRefreshedAt`) matches the login timestamp. This rules out silent database write failures (e.g., a missing unique constraint causing an upsert to fail).

**3. Ongoing Observability:**

- Configure an alert in the logging infrastructure (e.g., Railway) to trigger if the `x_token_refresh_failed` log event occurs more than 3 times within a 1-hour window.
- Under the unified flow, this event should be exceedingly rare (only occurring if a user manually revokes the app in their X settings mid-session). If the alert fires frequently, it indicates a regression or an upstream change in X's token rotation policy requiring immediate investigation.

---

## Handling the `offline.access` Scope Consent

Under Approach A, every login request includes the `offline.access` scope, which triggers X to issue a refresh token. X's OAuth 2.0 implementation uses **single-use rotating refresh tokens** by default.

This means every time AstraPost uses a refresh token to get a new access token, X invalidates the old refresh token and issues a new one. The application must persist this new refresh token atomically. If it fails to do so (due to a DB error or race condition), the old token is dead, the new token is lost, and the background worker is locked out until the user manually logs in again.

**Requirement:** The token refresh logic in `src/lib/services/x-api.ts` must use an atomic persistence mechanism. Currently, the system uses a Redis distributed lock (`refreshWithLock`) to prevent concurrent background jobs from attempting to refresh the same token simultaneously. This lock must be maintained.

**Resilience Upgrade:** To protect against process-level failures (e.g., the server crashing after X issues the token but before AstraPost writes it to the database), the refresh-and-persist operation should be wrapped in a strict database transaction. Furthermore, the application should log the new refresh token's fingerprint (a hash, not the token itself) immediately upon receipt to provide an audit trail for diagnosing "impossible" token loss scenarios.

Please make sure to test the new logic thoroughly in a controlled environment before deploying it to production. Also use pnpm run lint && pnpm run typecheck to ensure the code quality.
