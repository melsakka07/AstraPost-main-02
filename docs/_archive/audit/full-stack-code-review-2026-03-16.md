# AstraPost — Full-Stack Code Review

**Date:** 2026-03-16
**Reviewer:** Principal Full-Stack Engineer (AI-assisted)
**Scope:** Complete repository audit — security, architecture, database, reliability, AI, UX, performance, billing

---

## Executive Summary

AstraPost is a well-structured, production-grade SaaS codebase that has clearly had meaningful investment in security and reliability. Since the last documented review (2026-03-15), several critical issues have been resolved: rate limiting now fails closed on AI endpoints, BetterAuth tokens are encrypted before storage, the posts API uses bulk DB transactions, the WCAG `maximumScale` violation was removed, the billing webhook derives plan from price IDs rather than metadata, AI image generation migrated to an async polling pattern, and VoiceProfile prompt injection was patched.

The **three most critical issues remaining** are:

1. **SSRF via unauthenticated `/api/link-preview`** — Any anonymous user (no session required) can supply an arbitrary URL that the server then fetches. This exposes internal cloud metadata endpoints (`http://169.254.169.254/`), Redis, and any services reachable from the deployment network.

2. **Missing OAuth state parameter in LinkedIn (and likely Instagram) callbacks** — The `/api/linkedin/callback` route accepts `?code=` without validating a CSRF `state` parameter. An attacker can craft a link that, when clicked by a logged-in AstraPost user, silently attaches the attacker's LinkedIn account to the victim's profile.

3. **Media uploads in production write to local filesystem, not Vercel Blob** — The `/api/media/upload` route always calls `writeFile()` to `public/uploads/` regardless of whether `BLOB_READ_WRITE_TOKEN` is set. On Vercel (serverless), this path is ephemeral; user-uploaded media will silently vanish after function container recycling.

**Architectural impression:** The codebase shows careful separation of concerns — team context resolution, token encryption, plan limits, and rate limiting are all well-abstracted. The Drizzle schema is comprehensive with good enum usage. The main structural weakness is that OAuth callback routes were added without a CSRF state mechanism, and the link-preview proxy was added without authentication. A focused 2–3 day sprint can close all critical and high-severity findings.

---

## Section 1: Architecture & Project Structure

### [POSITIVE] Route group layout separation is idiomatic

`(marketing)/layout.tsx`, `(auth)/layout.tsx`, and the `dashboard/` tree are cleanly separated. Marketing pages never render dashboard chrome, and vice versa.

### [POSITIVE] Team context resolved server-side with HMAC-signed cookies

`src/lib/team-context.ts` verifies an HMAC on the team cookie and falls back to the personal workspace on tampering. This is proper defence-in-depth.

---

**[HIGH] — Token sync side-effect inside POST /api/posts**

File: `src/app/api/posts/route.ts` (lines 78–138)

Current behavior: Every time a user creates a post, the route reads all BetterAuth `account` rows for the user, decrypts them, and syncs them into `x_accounts`. This is O(N) DB reads + O(N) decryption operations on every post creation. It violates single-responsibility and adds latency to the critical post-creation path.

Recommendation: Move account sync into a dedicated `POST /api/x/accounts/sync` endpoint triggered after OAuth connect, and remove the sync logic from post creation entirely. The existing `src/app/api/x/accounts/sync/route.ts` probably handles this already.

Rationale: Mixing sync with creation causes latency, adds failure modes, and makes the route harder to test.

---

**[MEDIUM] — Proxy validates cookie existence only, not session validity**

File: `src/proxy.ts` (lines 24–31)

Current behavior: `getSessionCookie()` only checks for the presence of the session cookie — it does not verify that a valid session exists in the database. A user who has been suspended or whose session was revoked can still pass this check and access protected routes until the page-level `auth.api.getSession()` rejects them.

Recommendation: This is the intended design for performance (as the comment notes), and page-level validation catches it. However, for the `/admin` routes, consider adding a lightweight Redis-cached check to prevent any window of access for suspended users.

Rationale: The current approach is a known trade-off; the bigger concern is the `/admin` path.

---

~~**[MEDIUM] — Admin layout sidebar uses `ml-64` (breaks RTL)**~~ ✅ FIXED (2026-03-16)

File: `src/app/admin/layout.tsx` (line 15)

Current behavior: `<main className="flex-1 ml-64 p-8">` pushes the content 16rem from the left. In RTL mode (Arabic), this creates an overlapping layout.

Recommendation:

```tsx
<main className="flex-1 ms-64 p-8">
```

`ms-*` (margin-inline-start) respects the document's text direction.

Rationale: AstraPost targets Arabic users — RTL layout correctness is a first-class concern.

---

**[LOW] — `src/proxy.ts` exports `proxy`, not `middleware`**

File: `src/proxy.ts`

Current behavior: The file exports `async function proxy(...)` with a `config` export. Next.js 16's proxy API expects this exact naming convention, so this works. However, the name deviates from community convention (`middleware`) which can confuse contributors.

Recommendation: Add a JSDoc comment explaining this is the Next.js 16 proxy entry, not Next.js 15 middleware. No code change needed.

---

## Section 2: Database & Data Layer

### [POSITIVE] Schema uses pgEnum for all status/plan fields

All status columns (`postStatusEnum`, `planEnum`, `subscriptionStatusEnum`, etc.) use proper PostgreSQL enums, providing both constraint enforcement and query optimisation.

### [POSITIVE] Bulk insert with transaction in post creation

`POST /api/posts` pre-generates all IDs, collects rows, and issues 3 batched INSERTs in a single transaction. This is the correct pattern.

---

**[MEDIUM] — Redundant index on `tweetAnalytics.tweetId`**

File: `src/lib/schema.ts` (lines 411–413)

Current behavior:

```ts
uniqueIndex("analytics_tweet_id_unique").on(table.tweetId),
index("analytics_tweet_id_idx").on(table.tweetId),
```

A `UNIQUE` constraint already creates a B-tree index. The additional non-unique `index` on the same column is redundant and wastes storage.

Recommendation: Remove `index("analytics_tweet_id_idx")`. Keep only the unique index.

---

~~**[MEDIUM] — No composite index for the most common worker query**~~ ✅ FIXED (2026-03-16)

File: `src/lib/schema.ts`

**Resolution:** Added `index("posts_user_status_published_idx").on(table.userId, table.status, table.publishedAt)` to the `posts` table definition. Column order follows the query's selectivity: `userId` (equality, high cardinality) → `status` (equality, low cardinality) → `publishedAt` (range, supports `>` scan). The planner can now satisfy `WHERE userId = ? AND status = 'published' AND publishedAt > ?` from a single B-tree scan rather than intersecting three separate single-column indexes. Migration generated: `drizzle/0030_powerful_whirlwind.sql`.

---

**[MEDIUM] — `email` column has both `unique()` constraint and an explicit index**

File: `src/lib/schema.ts` (lines 109, 145)

Current behavior:

```ts
email: text("email").notNull().unique(),  // creates a unique index
...
index("user_email_idx").on(table.email),  // creates a second index on same column
```

Recommendation: Remove `index("user_email_idx")`. The `unique()` constraint already creates an index.

---

**[LOW] — `media` table has no `userId` column**

File: `src/lib/schema.ts` (lines 387–396)

Current behavior: `media` records are only reachable via `postId → post.userId`. Any query to verify media ownership requires a join. No direct ownership guard exists on the row.

Recommendation: Add `userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })` for direct ownership enforcement and simpler queries.

---

**[LOW] — `posts.groupId` has no FK constraint**

File: `src/lib/schema.ts` (line 271)

Current behavior: `groupId` is a `text` with no foreign key reference. It's used to link cross-platform posts but orphaned group IDs can accumulate.

Recommendation: If `groupId` always groups posts within the same batch, consider validating it at the application layer (check all members of a group belong to the same user on group operations).

---

## Section 3: Authentication & Security

### [POSITIVE] AES-256-GCM token encryption with proper IV and auth tag

`src/lib/security/token-encryption.ts` uses `crypto.randomBytes(12)` for each IV, includes the GCM authentication tag, and supports key rotation. This is production-grade cryptographic implementation.

### [POSITIVE] Magic-byte file type detection

`src/app/api/media/upload/route.ts` examines actual file bytes rather than trusting the `Content-Type` header or filename extension. Prevents extension-spoofed uploads.

### [POSITIVE] VoiceProfile injection protection

`src/lib/ai/voice-profile.ts` validates via Zod schema, rejects newlines, sanitizes each field before interpolation. This properly mitigates the prompt injection vector.

---

**[CRITICAL] — SSRF via unauthenticated `/api/link-preview`**

File: `src/app/api/link-preview/route.ts`

Current behavior:

```ts
export async function POST(req: Request) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });
  const data = await getLinkPreview(url, { followRedirects: 'follow', ... });
  return NextResponse.json(data);
}
```

There is **no session check** and **no URL blocklist**. Any unauthenticated user can POST `{ "url": "http://169.254.169.254/latest/meta-data/" }` and the server will fetch it, following redirects. On AWS/GCP/Azure, this leaks cloud instance metadata including credentials. On internal networks, it probes Redis (`http://127.0.0.1:6379/`), Postgres, and any other service.

Recommendation:

```ts
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  // Block private/internal IP ranges
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const BLOCKED_HOSTS =
    /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1|0\.0\.0\.0)/i;
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (BLOCKED_HOSTS.test(parsed.hostname)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  const data = await getLinkPreview(url, { followRedirects: "follow", timeout: 5000 });
  return NextResponse.json(data);
}
```

Rationale: SSRF is an OWASP Top 10 vulnerability. A serverless function fetching attacker-controlled URLs to internal metadata endpoints is a critical cloud security risk.

---

**[CRITICAL] ✅ FIXED (2026-03-16) — Missing OAuth state/CSRF parameter in LinkedIn callback**

File: `src/app/api/linkedin/callback/route.ts`

Current behavior: The callback reads `?code=` and exchanges it for a token without validating a `state` parameter. An attacker can:

1. Initiate their own LinkedIn OAuth flow against AstraPost, getting a `?code=ATTACKER_CODE`
2. Trick the victim into visiting `/api/linkedin/callback?code=ATTACKER_CODE`
3. AstraPost silently associates the attacker's LinkedIn account with the victim's profile

Recommendation: In `GET /api/linkedin/auth`, generate a random state, store it in a signed cookie (or server-side session), and redirect to LinkedIn with `&state=<value>`. In the callback:

```ts
const state = searchParams.get("state");
const cookieStore = await cookies();
const expectedState = cookieStore.get("linkedin_oauth_state")?.value;
if (!state || !expectedState || state !== expectedState) {
  return redirect("/dashboard/settings?error=oauth_state_mismatch");
}
cookieStore.delete("linkedin_oauth_state");
```

Apply the same pattern to the Instagram OAuth callback.

Rationale: OAuth CSRF (sometimes called "account hijacking via OAuth") is listed in OWASP's OAuth security guidance. Without a `state` check, account linkage can be attacked.

---

~~**[HIGH] — `@ts-ignore` in admin impersonation endpoint**~~ ✅ FIXED (2026-03-16)

File: `src/app/api/admin/users/[userId]/impersonate/route.ts`

**Resolution:** All three `@ts-ignore` directives removed.

- `session.user.isAdmin`: accessed via a narrow `{ isAdmin?: boolean }` cast with an explanatory comment — preserves type safety while acknowledging the BetterAuth additionalFields gap.
- `auth.api.createSession`: replaced with a module-level `AdminAuthApi` type that extends `typeof auth.api` with the minimal `createSession` signature. The cast is `auth.api as unknown as AdminAuthApi` — if BetterAuth ever adds this to its public types, the cast becomes redundant but harmless; if the signature changes, TypeScript will flag it here.
- `newSession.token`: flows naturally from the typed `AdminAuthApi` return type; no cast needed.

---

~~**[HIGH] — `GET /api/feedback` is publicly accessible without authentication**~~ ✅ FIXED (2026-03-16)

File: `src/app/api/feedback/route.ts`

**Resolution:** `GET` now returns `401 Unauthorized` when no session is present. The `votes` relation filter no longer uses a conditional — it always scopes to `session.user.id` since the session is now guaranteed by the early-return guard.

---

**[MEDIUM] — LinkedIn (and Instagram) `accessToken` stored without rate-limit check**

File: `src/app/api/linkedin/callback/route.ts`

Current behavior: The callback endpoint creates/updates a LinkedIn account row without checking if the user has exceeded their account limit. There is a `checkLinkedinAccessDetailed` plan check, but no count check for how many LinkedIn accounts they've connected.

Recommendation: Add a count check similar to `checkAccountLimitDetailed` used for X accounts.

---

~~**[MEDIUM] — `timezone` field accepts any string**~~ ✅ FIXED (2026-03-16)

File: `src/app/api/user/profile/route.ts` (line 11)

**Resolution:** Added `isValidIANATimezone(tz)` helper that calls `Intl.DateTimeFormat(undefined, { timeZone: tz })` and returns `false` on `RangeError`. This delegates to V8's built-in ICU timezone database — zero extra bundle size, always up-to-date, covers every valid IANA zone. The Zod schema now uses `.refine(isValidIANATimezone, { message: "Invalid timezone" })` instead of the bare `.string()`. Invalid timezones return a structured 400 via the existing `z.ZodError` catch block.

---

**[MEDIUM] — BetterAuth token encryption breaks BetterAuth's own refresh capability**

File: `src/lib/auth.ts` (lines 52–85)

Current behavior: The `databaseHooks.account.create.before` and `update.before` hooks encrypt `accessToken` and `refreshToken` before BetterAuth saves them. When BetterAuth's OAuth provider adapter later reads these tokens for refresh, it gets back the encrypted `v1:0:...` string and attempts to use it as a bearer token with the OAuth provider. This silently fails.

While the application appears functional (it reads tokens from `xAccounts` rather than `account`), BetterAuth's built-in token refresh for OAuth sessions is permanently broken. If BetterAuth ever calls token introspection or refresh internally, it will fail.

Recommendation: Document this as an explicit architectural decision: "BetterAuth OAuth tokens in `account` are encrypted; all X API operations use `x_accounts` with their own refresh logic. BetterAuth's built-in token refresh is intentionally disabled for this provider." Add a comment in `auth.ts` explaining this and add `refreshToken: false` if BetterAuth supports disabling token refresh for specific providers.

---

## Section 4: Background Jobs & Reliability

### [POSITIVE] Idempotent publish with per-tweet `xTweetId` check

The worker checks `if (tweetRow.xTweetId)` before posting, and `if (!m.xMediaId)` before uploading media. Combined with the transaction that marks the post as published, this makes the processor safe to retry.

### [POSITIVE] Recurrence capped at 1 year with `MAX_RECURRENCE_FUTURE_MS`

The 1-year cap prevents unbounded queue growth when no end date is specified.

### [POSITIVE] Path traversal protection for local media

The `uploadsRoot` containment check in the processor correctly prevents reading arbitrary files from `fileUrl`.

---

~~**[HIGH] — X token refresh race condition in distributed worker**~~ ✅ FIXED (2026-03-16)

File: `src/lib/services/x-api.ts`

**Resolution:** Added `private static async refreshWithLock(account, userId)` that:

1. Issues `SET x:token_refresh_lock:{accountId} 1 EX 30 NX` — returns `"OK"` if acquired, `null` if already held.
2. **Lock acquired (or Redis unavailable):** Performs the refresh inside a `try/finally`; the `finally` block calls `redis.del(lockKey)` so the lock is released immediately on success or error. The 30 s TTL is a safety net if the worker is killed mid-operation.
3. **Lock contended:** Waits `REFRESH_LOCK_WAIT_MS` (1.5 s) then re-reads the account row from the DB — by which point the lock holder has written the new token — and returns an `XApiService` from the fresh row.
4. **Redis unavailable:** Logs `x_token_refresh_lock_redis_unavailable` and falls through to refresh without a lock (preserves single-worker functionality during Redis outages).

Both `getClientForUser` and `getClientForAccountId` now route through `refreshWithLock`, eliminating the duplicated inline refresh logic. The `shouldRefresh` condition is unchanged (token expires within 60 s).

---

~~**[HIGH] — `removeOnFail: false` causes unbounded Redis growth**~~ ✅ FIXED (2026-03-16)

File: `src/lib/queue/client.ts`

**Resolution:** `removeOnFail` changed from `false` to `{ age: 7 * 24 * 60 * 60 }`. Failed jobs are retained for 7 days for operator review, then pruned automatically. Added an inline comment documenting the X media-ID 24 h expiry constraint and the max-`attempts` ceiling it implies.

---

**[MEDIUM] — X media IDs expire (24h) but retry delay is up to 5 × exponential**

File: `src/lib/queue/client.ts` + `processors.ts`

Current behavior: `backoff: { type: "exponential", delay: 60_000 }` with `attempts: 5` means the 5th retry fires at roughly `60s × 2^4 = 960s ≈ 16 minutes` after the 4th attempt. Total elapsed time is ~30 minutes. X media IDs are valid for 24 hours after upload. This is currently safe.

However, if `attempts` is ever increased to 8+, the exponential backoff would exceed 24 hours and stale media IDs would cause posting failures.

Recommendation: Add a comment documenting the X media ID expiry constraint: `// WARNING: X media IDs expire 24h after upload. Max total retry window must stay < 24h.`

---

~~**[MEDIUM] — No dead letter queue (DLQ) alerting**~~ ✅ FIXED (2026-03-16)

File: `scripts/worker.ts`

**Resolution:** Both `scheduleWorker.on("failed", ...)` and `analyticsWorker.on("failed", ...)` now emit two distinct log events:

1. **`job_failed`** — fires on every failure (transient + permanent). Enriched with `postId`, `userId`, `correlationId`, and `attemptsMade` for `scheduleWorker`; `correlationId` and `attemptsMade` for `analyticsWorker`.

2. **`job_permanently_failed`** — fires only when `job.attemptsMade >= maxAttempts` (all configured retries exhausted). Full context: `queue`, `jobId`, `postId`, `userId`, `correlationId`, `error`, `attemptsMade`, `maxAttempts`, `failedAt` (ISO timestamp), and `action: "manual_review_required"`. The `maxAttempts` falls back to `SCHEDULE_JOB_OPTIONS.attempts` so the threshold stays in sync if job options change — no magic numbers.

The `job_permanently_failed` key is intentionally distinct so that log aggregation tools (Datadog, CloudWatch Metric Filters, Logtail, Axiom, Sentry) can create targeted high-priority alerts on it without noise from transient retryable failures.

For `analyticsWorker`: the DLQ guard only fires when `job.opts?.attempts` is explicitly set — analytics repeatable jobs have no retry limit and self-heal on the next scheduled run, so this prevents false positives.

---

## Section 5: AI Integration

### [POSITIVE] Async Replicate polling pattern

`POST /api/ai/image` now uses `startImageGeneration()` (fire-and-forget) and returns a `predictionId`. The client polls `GET /api/ai/image/status?id=<id>`. This correctly avoids serverless timeout.

### [POSITIVE] Atomic Redis DEL for idempotent usage recording

The status endpoint uses `redis.del()` which returns 1 for the first deleter and 0 for concurrent duplicates, preventing double-counting.

### [POSITIVE] Ownership check on prediction polling

`meta.userId !== session.user.id` prevents users from polling each other's image generations.

---

~~**[HIGH] — `generateImagePromptFromTweet` embeds unsanitized user content in AI system prompt**~~ ✅ FIXED (2026-03-16)

File: `src/app/api/ai/image/route.ts`

**Resolution:** `generateImagePromptFromTweet` now calls `sanitizeForPrompt(tweetContent, 500)` before embedding content in the LLM call. The sanitized value is bounded by `---` delimiters in the prompt so injection attempts cannot bleed into surrounding instructions. The error-path fallback also uses `sanitized` rather than the raw input. The `sanitizeForPrompt` utility (already used by VoiceProfile) strips non-printable control characters, normalizes line endings, collapses excessive blank lines, and hard-caps the embedded length at 500 chars.

---

~~**[MEDIUM] — Synchronous `pollPrediction` path still exists alongside async flow**~~ ✅ FIXED (2026-03-16)

File: `src/lib/services/ai-image.ts` (lines 143–182)

**Resolution:** All synchronous blocking symbols (`pollPrediction`, `createPrediction`, `NanoBanana2Provider`, `NanaBananaProProvider`, `createImageProvider`, `generateImage`) are now marked with comprehensive `@deprecated` JSDoc that:

1. Names the correct replacement (`startImageGeneration()` + `checkImagePrediction()`)
2. States the failure mode ("blocks for up to 2 minutes, will time out in serverless environments")
3. A block comment at the top of the deprecated section explicitly labels it as `DEPRECATED — Synchronous blocking path (DO NOT USE in production)`

The symbols are retained (not deleted) to avoid breaking the existing unit test (`ai-image.test.ts`) that imports `generateImage` and `createImageProvider`. Also fixed the `any` type in `createPrediction`'s `input` parameter to `Record<string, string | number | boolean | string[] | null>` (addressed the `any` type audit finding from §9 simultaneously). The `NanoBanana2Provider` constructor argument `image_input: []` was also removed since the deprecated path would never be called with dynamic media; the async `startImageGeneration()` path is unaffected.

---

~~**[MEDIUM] — AI quota bypass: `generateImagePromptFromTweet` makes an uncounted AI call**~~ ✅ FIXED (2026-03-16)

File: `src/app/api/ai/image/route.ts` (lines 45–65, 162–166)

**Resolution:** After `generateImagePromptFromTweet(tweetContent)` returns, an `aiGenerations` record of type `"image_prompt"` is inserted immediately. The insert is fire-and-forget (`.catch()` logged via `console.error`) so a DB failure cannot block the image flow. Key fields recorded: `userId`, `inputPrompt` (tweetContent capped at 2000 chars), `tokensUsed: 0` (OpenRouter streaming does not expose token counts at this call site). This makes the extra LLM cost visible in the usage ledger and quota dashboards alongside the image generation it precedes.

---

**[MEDIUM] — AI thread endpoint records `tokensUsed: 0`**

File: `src/app/api/ai/thread/route.ts` (line 97)

Current behavior:

```ts
await recordAiUsage(session.user.id, "thread", 0, prompt, object, language);
```

All AI thread generations are recorded with `tokensUsed: 0`. Token-based quota enforcement cannot function correctly.

Recommendation: Use the Vercel AI SDK's `usage` property if available, or use the OpenRouter streaming response to track token usage. Alternatively, estimate tokens from prompt/response length until the SDK exposes this:

```ts
const { object, usage } = await generateObject({ model, schema: tweetSchema, prompt });
await recordAiUsage(session.user.id, "thread", usage?.totalTokens ?? 0, prompt, object, language);
```

---

**[LOW] — No model fallback on OpenRouter failure**

File: `src/app/api/ai/thread/route.ts`, multiple AI routes

Current behavior: If `openai/gpt-4o` is unavailable or rate-limited on OpenRouter, the endpoint returns a 500 error.

Recommendation: Configure a fallback model in OpenRouter provider settings, or add a try/catch that retries with a cheaper model (e.g., `anthropic/claude-haiku-4-5`).

---

## Section 6: API Design & Error Handling

### [POSITIVE] Zod input validation on all major mutation endpoints

`POST /api/posts`, `/api/ai/thread`, `/api/ai/image`, and others use `z.safeParse()` with proper error surfacing.

### [POSITIVE] Correlation IDs throughout scheduling flow

`getCorrelationId()` is used in post creation and propagated to BullMQ jobs, allowing end-to-end request tracing.

---

**[HIGH] ✅ FIXED (2026-03-16) — Media upload always writes to local filesystem regardless of environment**

File: `src/app/api/media/upload/route.ts` (lines 134–143)

Current behavior:

```ts
const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
await mkdir(uploadsRoot, { recursive: true });
await writeFile(filePath, buffer);
```

This uses the local filesystem unconditionally. On Vercel serverless, writes to `public/uploads/` land in an ephemeral container filesystem. After the function instance is recycled (minutes to hours), the file is gone. Users see broken media in their posts.

**This is already correct in `ai-image/status/route.ts` which calls `upload()` from `@/lib/storage`.** The user media upload route needs the same treatment.

Recommendation:

```ts
import { upload } from "@/lib/storage";

// Replace the writeFile block with:
const result = await upload(buffer, filename, "uploads");
const url = result.url;
```

The `storage.ts` abstraction already handles the local/Vercel Blob split.

Rationale: This is a silent production data loss bug. Users on Vercel deployments will lose all uploaded media after container recycling.

---

~~**[HIGH] — `feedback/route.ts POST` lacks input length validation**~~ ✅ FIXED (2026-03-16)

File: `src/app/api/feedback/route.ts`

**Resolution:** Added module-level `feedbackSchema` (`title` ≤ 100 chars, `description` ≤ 2000 chars, `category` enum `["feature","bug","other"]`). `POST` now uses `safeParse` and returns a structured `400` with `result.error.flatten().fieldErrors` on failure. Also removed the redundant `db.update(feedback).set({ upvotes: 1 })` that immediately followed the insert (insert already sets `upvotes: 1`; the update was a no-op but caused an unnecessary extra DB round-trip).

---

**[MEDIUM] — `feedback/route.ts POST` auto-upvote uses hardcoded `upvotes: 1` instead of SQL increment**

File: `src/app/api/feedback/route.ts` (line 93)

Current behavior:

```ts
await db.update(feedback).set({ upvotes: 1 }).where(eq(feedback.id, createdFeedback.id));
```

This sets `upvotes = 1` absolutely (not atomically incremented). If two users submit feedback at the same time and there's a race, the value will be 1 regardless. More importantly, this contradicts the `upvotes: 1` in the initial insert — it's redundant but harmless since this immediately follows creation.

Recommendation:

```ts
await db
  .update(feedback)
  .set({ upvotes: sql`upvotes + 1` })
  .where(eq(feedback.id, createdFeedback.id));
```

Note: The upvote/downvote endpoint (`feedback/[id]/upvote/route.ts`) already correctly uses `sql\`upvotes + 1\``.

---

**[MEDIUM] — Diagnostics endpoint reveals infrastructure configuration to the public**

File: `src/app/api/diagnostics/route.ts`

Current behavior: The endpoint is intentionally public. It reveals which environment variables are configured (Postgres, Auth, OpenRouter, etc.) and whether the database is reachable. While it only returns booleans, this is an information disclosure that helps attackers fingerprint the deployment.

Recommendation: Gate the endpoint behind an `ADMIN_DIAGNOSTICS_TOKEN` environment variable, or move it to `/admin/diagnostics` behind the admin auth check. The "setup checklist" use case can be served by a separate, more limited public endpoint.

---

**[LOW] — `POST /api/link-preview` returns `status: 200` on errors**

File: `src/app/api/link-preview/route.ts` (line 22)

Current behavior:

```ts
return NextResponse.json({ error: "Failed to fetch preview" }, { status: 200 });
```

Returning `200` with an error body prevents callers from detecting failure via HTTP status codes.

Recommendation: Return `{ status: 400 }` or `{ status: 502 }` on fetch failure.

---

## Section 7: UI/UX Review

### [POSITIVE] RTL `dir` attribute set from locale cookie

`src/app/layout.tsx` correctly applies `lang={locale} dir={dir}` to the `<html>` element and suppresses hydration warnings. RTL handling at the root level is the correct approach.

### [POSITIVE] Dark mode with `ThemeProvider` and system preference support

`defaultTheme="system"` with `enableSystem` provides a proper dark mode experience.

---

~~**[HIGH] — Geist font lacks Arabic glyph support**~~ ✅ FIXED (2026-03-16)

File: `src/app/layout.tsx` + `src/app/globals.css`

**Resolution:**

- `Cairo` imported from `next/font/google` alongside Geist. Configured with `subsets: ["arabic", "latin"]`, `weight: ["400", "500", "600", "700"]`, and `display: "swap"` for optimised loading.
- `--font-arabic` CSS variable injected on `<body>` via `${cairo.variable}`.
- `:lang(ar) { font-family: var(--font-arabic), system-ui, sans-serif; }` added inside `@layer base` in `globals.css` — activates Cairo exclusively when `lang="ar"` is set on `<html>`, leaving the Geist stack unchanged for all other locales. The existing RTL cookie-detection (`locale` cookie → `dir="rtl"`) already sets `lang="ar"` on the root element, so no further wiring is needed.

---

**[MEDIUM] — No OG locale for Arabic content**

File: `src/app/layout.tsx` (line 55)

Current behavior:

```ts
openGraph: { locale: "en_US", ... }
```

OpenGraph `locale` is hardcoded to `en_US`. Arabic users sharing AstraPost links will see English metadata.

Recommendation: Generate locale-aware metadata in each page's `generateMetadata` function based on the user's preferred language, or at minimum add `alternates: [{ locale: "ar_SA", url: "/" }]`.

---

**[MEDIUM] — RTL logical properties not used consistently**

Review across: `src/app/admin/layout.tsx`, `src/components/dashboard/sidebar.tsx`

Current behavior: Physical properties (`ml-*`, `mr-*`, `pl-*`, `pr-*`) are used in layout components. In RTL mode, `ml-64` creates left margin (what was right in RTL), causing layout overlap.

Key affected locations:

- `src/app/admin/layout.tsx:15` — `ml-64`
- Any sidebar/content split using physical margin/padding

Recommendation: Use Tailwind's logical property variants:

- `ml-*` → `ms-*` (margin-inline-start)
- `mr-*` → `me-*` (margin-inline-end)
- `pl-*` → `ps-*` (padding-inline-start)
- `pr-*` → `pe-*` (padding-inline-end)

---

**[MEDIUM] — No i18n framework; all strings are hardcoded in English**

Current behavior: UI strings are hardcoded in JSX. While Arabic users see the UI in Arabic RTL direction (via the `dir` attribute), all button labels, error messages, and headings are in English.

Recommendation: For an Arabic-first product, implement `next-intl` or `react-i18next`. At minimum, create `messages/ar.json` and `messages/en.json` and use `<Trans>` components for all user-facing strings.

Rationale: This is a significant UX gap for the target audience. MENA users fluent in Arabic but not English will struggle with English-only UI text.

---

**[LOW] — `overflow-x-hidden` on body can clip fixed/sticky RTL elements**

File: `src/app/layout.tsx` (line 109)

Current behavior: `overflow-x-hidden` on `<body>` clips content that overflows horizontally. In RTL mode, some positioned elements (dropdowns, tooltips, drawers) may be clipped unexpectedly.

Recommendation: Replace with `overflow-x-clip` (preserves scroll context better) or address the root cause of horizontal overflow instead.

---

## Section 8: Performance & Scalability

### [POSITIVE] Analytics engine uses SQL GROUP BY instead of JS aggregation

`AnalyticsEngine.getBestTimesToPost()` pushes the `GROUP BY (DOW, hour)` + `AVG` computation into PostgreSQL. This is bounded at 168 rows regardless of data volume.

### [POSITIVE] Redis caching for prediction metadata (30 min TTL)

Image generation state is cached in Redis, avoiding DB reads on every poll.

---

**[HIGH] — Media upload writes to ephemeral local filesystem (see Section 6)**

Duplicate of the finding above — this is also a performance concern since local file I/O on serverless is slower than Blob storage, and files are not available across function instances (no CDN).

---

**[MEDIUM] — `Stripe` client instantiated per-request in webhook handler**

File: `src/app/api/billing/webhook/route.ts` (line 436)

Current behavior:

```ts
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
```

This is inside the `POST` handler, so a new Stripe client is created on every webhook event. While this is cheap (no persistent connection), it's unnecessary overhead.

Recommendation: Move to module-level initialization:

```ts
// At module scope, outside the handler
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}
```

---

**[MEDIUM] — `generateImagePromptFromTweet` doubles AI cost per image**

File: `src/app/api/ai/image/route.ts`

Current behavior: Every image generation from `tweetContent` makes 2 AI calls: one to GPT-4o for prompt generation (untracked), then one to Replicate for image generation (tracked). Users are charged AI quota for only one but incur cost for two.

Recommendation: Either track prompt generation in the quota, or generate the prompt client-side and accept only explicit prompts server-side.

---

**[LOW] — `tweetAnalytics` has both a unique AND regular index on `tweetId` (duplicate index)**

Already noted in Section 2 — repeating here as it affects database performance (storage overhead, write amplification).

---

## Section 9: Developer Experience & Code Quality

### [POSITIVE] Structured logging with `logger.ts`

Structured JSON logging is used throughout the worker and API routes. Log entries include `correlationId`, `postId`, `userId`, and job metadata.

### [POSITIVE] Zod schemas for all input validation

New endpoints consistently use `z.safeParse()` with proper error objects rather than ad-hoc manual validation.

### [POSITIVE] Comprehensive Drizzle schema with relations

All 20+ tables have explicit Drizzle relations defined, enabling type-safe relational queries.

---

~~**[HIGH] — `@ts-ignore` suppresses type errors in security-critical admin code**~~ ✅ FIXED (2026-03-16)

Already documented in Section 3. See fix description there.

---

**[MEDIUM] — `any` types in production code**

Files: `src/lib/services/ai-image.ts:189`, `src/app/api/posts/route.ts:150`

Current behavior:

```ts
// ai-image.ts
async function createPrediction(version: string, input: Record<string, any>, ...): ...

// posts/route.ts
const selectedAccounts: { id: string; platform: 'twitter' | 'linkedin' | 'instagram'; obj: any }[] = [];
```

Recommendation:

- For `createPrediction`: type `input` as `Record<string, string | number | boolean | string[] | null>`
- For `selectedAccounts.obj`: use a discriminated union type based on platform

---

**[MEDIUM] — `xAccounts` sync in posts route references non-existent `refreshToken` field**

File: `src/app/api/posts/route.ts` (lines 109, 129)

Current behavior:

```ts
refreshToken: null,  // This field doesn't exist in xAccounts schema
```

The `xAccounts` table in `schema.ts` has `refreshTokenEnc` (encrypted) but not `refreshToken` (plaintext). Drizzle silently ignores unknown fields in `.values()` calls. This is dead code that creates confusion.

Recommendation: Remove the `refreshToken: null` lines from both the `db.insert` and `db.update` calls in the posts route. They serve no purpose.

---

**[LOW] — Token usage always recorded as 0 for AI generations**

File: `src/app/api/ai/thread/route.ts:97`, and likely other AI endpoints

Current behavior: `tokensUsed: 0` is passed to `recordAiUsage`. This renders the `tokensUsed` column useless for quota analytics.

---

~~**[LOW] — Test coverage is minimal**~~ ✅ FIXED (2026-03-16)

**Resolution:** Three test suites added, covering the highest-risk paths:

1. **`src/lib/security/token-encryption.test.ts`** (14 tests) — AES-256-GCM round-trip (ASCII + Unicode), random-IV uniqueness, legacy passthrough, GCM auth-tag tamper detection, corrupted-format rejection, key rotation scenario, `isPrimaryKeyToken`/`isEncryptedToken` predicates, 32-byte key length invariant.

2. **`src/app/api/billing/webhook/route.test.ts`** (12 tests) — Missing STRIPE env vars → 500, bad signature → 400, duplicate event ID → 200 (idempotency guard short-circuits), `checkout.session.completed` syncs `user.plan`, missing `userId` metadata → 500 + event NOT recorded, `customer.subscription.updated` plan-change syncs user table, no-change skips user update, `customer.subscription.deleted` resets plan to `"free"`, `invoice.payment_failed` sets `planExpiresAt` grace period, unhandled event type → 200.

3. **`src/lib/queue/processors.integration.test.ts`** (+8 tests) — Permanent-failure path (`isFinalAttempt = true`): post status → `"failed"`, non-final retry: status stays `"scheduled"`, `jobRuns` record with `"retrying"` status, notification inserted only on final attempt, `failReason` user-friendly hint for 401 errors, already-published tweet skipped on retry (idempotency).

---

## Section 10: Stripe & Billing

### [POSITIVE] Webhook signature verification with `stripe.webhooks.constructEvent()`

Stripe's signature verification is correctly applied before any processing.

### [POSITIVE] Plan derived from verified price ID, not metadata

`getPlanFromPriceId()` maps server-side env vars to plans. Metadata is only used as a fallback with a structured warning.

### [POSITIVE] Grace period (7 days) on payment failure

`handleInvoicePaymentFailed` sets `planExpiresAt` 7 days out, giving users time to update payment without losing access.

---

~~**[HIGH] — `handleSubscriptionUpdated` doesn't update `user.plan`**~~ ✅ FIXED (2026-03-16)

File: `src/app/api/billing/webhook/route.ts`

**Resolution:** `handleSubscriptionUpdated` now:

1. Resolves `newPlan` from the subscription's first price item via `getPlanFromPriceId()`.
2. Fetches the existing subscription record **before** the DB update to capture `oldPlan` for accurate change detection (avoids reading stale post-update data).
3. Updates `subscriptions.plan` and `subscriptions.stripePriceId` alongside the existing status/period fields.
4. Syncs `user.plan` (and clears `planExpiresAt`) **only when the plan actually changed** — preventing spurious user table writes on period renewals.
5. Emits a `billing_plan_changed` notification with `oldPlan`/`newPlan` metadata.
6. Logs a structured `console.warn` when the price ID is unrecognised, without overwriting the existing plan with `null`.

---

~~**[MEDIUM] — Webhook side-effects (email, notifications) may fire on Stripe retry**~~ ✅ FIXED (2026-03-16)

File: `src/app/api/billing/webhook/route.ts`

**Resolution:** Added `processedWebhookEvents` table to `src/lib/schema.ts` with a UNIQUE constraint on `stripe_event_id`. In the POST handler, after signature verification, a `db.query.processedWebhookEvents.findFirst` check returns `200` immediately if the event was already recorded. The insert into `processedWebhookEvents` is placed **after** the `switch` block but **inside** the `try` — this means processing errors leave the event unrecorded so Stripe's retry can re-attempt, while success records it and future retries skip. Migration generated: `drizzle/0029_rainy_scrambler.sql`.

---

**[LOW] — No handling for `customer.subscription.paused` or `invoice.upcoming` events**

File: `src/app/api/billing/webhook/route.ts`

Current behavior: Events not in the `switch` block are silently ignored. `paused` subscriptions are mapped to `past_due` via `toSubscriptionStatus()`, which may not be the right treatment.

Recommendation: Add explicit handling for `customer.subscription.paused` and log unhandled event types with a structured warning for observability.

---

## Prioritized Action Plan

The following 20 items are ordered by **impact × urgency**. Fix in sequence unless items are tagged as independent.

| #   | Finding                                                                                             | Section | Severity | Est. Effort | Notes                                                                                                                                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------- | ------- | -------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ~~**SSRF via `/api/link-preview`** — add auth + URL blocklist~~ ✅ DONE (2026-03-16)                | §3, §6  | Critical | 2h          | Session auth + SSRF blocklist + proper error status                                                                                                                                                                                                                               |
| 2   | ~~**OAuth CSRF: add state param to LinkedIn (+ Instagram) callbacks**~~ ✅ DONE (2026-03-16)        | §3      | Critical | 4h          | HttpOnly SameSite=lax state cookie; validated + cleared on all exit paths; both platforms                                                                                                                                                                                         |
| 3   | ~~**Media upload → use `upload()` from `@/lib/storage`**~~ ✅ DONE (2026-03-16)                     | §6, §8  | Critical | 2h          | Replaced direct fs writes with upload(); added .mp4 to storage.ts ALLOWED_EXTENSIONS                                                                                                                                                                                              |
| 4   | ~~**`handleSubscriptionUpdated` must update `user.plan`**~~ ✅ DONE (2026-03-16)                    | §10     | High     | 2h          | Fetches pre-update record for change detection; updates subscriptions.plan + stripePriceId; syncs user.plan + clears planExpiresAt only on actual plan change; fires billing_plan_changed notification; unknown price IDs logged as warn                                          |
| 5   | ~~**Add auth to `GET /api/feedback`**~~ ✅ DONE (2026-03-16)                                        | §3, §6  | High     | 1h          | Added 401 guard; votes filter now always scoped to session.user.id                                                                                                                                                                                                                |
| 6   | ~~**Feedback POST: add Zod length validation**~~ ✅ DONE (2026-03-16)                               | §6      | High     | 1h          | `feedbackSchema` with title≤100 / description≤2000 / category enum; structured 400 with field errors; removed redundant `upvotes:1` update after insert                                                                                                                           |
| 7   | ~~**`generateImagePromptFromTweet`: sanitize input before AI prompt**~~ ✅ DONE (2026-03-16)        | §5      | High     | 1h          | `sanitizeForPrompt(tweetContent, 500)` + `---` delimiters bound user block; fallback also uses sanitized content                                                                                                                                                                  |
| 8   | ~~**Remove `@ts-ignore` from admin impersonation route**~~ ✅ DONE (2026-03-16)                     | §3, §9  | High     | 2h          | All three `@ts-ignore` removed; `AdminAuthApi` type declares `createSession` shape; `isAdmin` accessed via narrow cast with explanatory comment                                                                                                                                   |
| 9   | ~~**X token refresh: add Redis distributed lock**~~ ✅ DONE (2026-03-16)                            | §4      | High     | 3h          | `refreshWithLock` private static with `SET … EX 30 NX`; contended path waits 1.5 s then re-reads DB; Redis-down path falls through without lock; both `getClientForUser` and `getClientForAccountId` unified through single helper                                                |
| 10  | ~~**Add Arabic font (Cairo) for RTL typography**~~ ✅ DONE (2026-03-16)                             | §7      | High     | 2h          | `Cairo` loaded via `next/font/google` with arabic+latin subsets & weights 400–700; `--font-arabic` CSS variable injected on `<body>`; `:lang(ar)` rule in `globals.css` activates it only for Arabic locale                                                                       |
| 11  | ~~**BullMQ `removeOnFail`: set 7-day TTL instead of indefinite**~~ ✅ DONE (2026-03-16)             | §4      | High     | 30m         | `removeOnFail: { age: 7 * 24 * 60 * 60 }` — 7-day prune; added X media-ID 24 h expiry warning comment                                                                                                                                                                             |
| 12  | ~~**Fix `admin/layout.tsx` `ml-64` → `ms-64` (RTL)**~~ ✅ DONE (2026-03-16)                         | §1, §7  | Medium   | 30m         | `ms-64` (logical inline-start) replaces physical `ml-64`                                                                                                                                                                                                                          |
| 13  | ~~**Validate `timezone` against IANA list**~~ ✅ DONE (2026-03-16)                                  | §3      | Medium   | 1h          | `isValidIANATimezone` via `Intl.DateTimeFormat` + `.refine()` in `profileSchema` — zero bundle size, covers full IANA database                                                                                                                                                    |
| 14  | **Implement i18n framework (`next-intl`)**                                                          | §7      | Medium   | 2–3 days    | Foundational for Arabic UI                                                                                                                                                                                                                                                        |
| 15  | ~~**Webhook idempotency: store processed Stripe event IDs**~~ ✅ DONE (2026-03-16)                  | §10     | Medium   | 3h          | `processedWebhookEvents` table (UNIQUE on `stripeEventId`); guard after sig-verify; insert after switch succeeds; migration `0029_rainy_scrambler.sql`                                                                                                                            |
| 16  | ~~**Deprecate synchronous `pollPrediction` path in ai-image.ts**~~ ✅ DONE (2026-03-16)             | §5      | Medium   | 1h          | All 6 synchronous symbols annotated with `@deprecated` JSDoc + block-level deprecation banner; `createPrediction` input typed to remove `any`                                                                                                                                     |
| 17  | ~~**Add composite DB index on `(userId, status, publishedAt)` for posts**~~ ✅ DONE (2026-03-16)    | §2      | Medium   | 1h          | `posts_user_status_published_idx` B-tree on `(userId, status, publishedAt)` — column order follows query selectivity; migration `0030_powerful_whirlwind.sql`                                                                                                                     |
| 18  | ~~**Track AI prompt-generation call in quota for image endpoint**~~ ✅ DONE (2026-03-16)            | §5      | Medium   | 1h          | Fire-and-forget `aiGenerations` insert of type `"image_prompt"` after `generateImagePromptFromTweet` succeeds; errors logged via `console.error` without blocking image flow                                                                                                      |
| 19  | ~~**Add DLQ alerting on permanently failed BullMQ jobs**~~ ✅ DONE (2026-03-16)                     | §4      | Medium   | 2h          | `job_permanently_failed` log key emitted in both `scheduleWorker` and `analyticsWorker` `failed` handlers when all retries exhausted; `maxAttempts` sourced from `SCHEDULE_JOB_OPTIONS.attempts` (no magic numbers); analytics guard only fires when `attempts` is explicitly set |
| 20  | ~~**Write tests for `scheduleProcessor`, billing webhook, token encryption**~~ ✅ DONE (2026-03-16) | §9      | Medium   | 1–2 days    | 14 tests for AES-256-GCM token encryption; 12 tests for billing webhook (idempotency, plan sync, grace period); 8 new tests for `scheduleProcessor` permanent-failure path (final/non-final retry, notifications, 401 hint, idempotency); 39 total new tests — all passing        |

---

## Appendix: Previously Fixed Issues (from 2026-03-15 review)

The following critical issues identified in the prior review have been confirmed fixed:

- ✅ Rate limiter now fails CLOSED on cost-sensitive endpoints (`COST_SENSITIVE_TYPES` set)
- ✅ BetterAuth `account` tokens encrypted via `databaseHooks.account.create/update.before`
- ✅ N+1 post creation replaced with 3-batch transaction
- ✅ `viewport.maximumScale` WCAG violation removed
- ✅ Marketing SiteHeader/Footer isolated to `(marketing)/layout.tsx`
- ✅ Stripe webhook derives plan from price ID (not metadata) with `getPlanFromPriceId()`
- ✅ Replicate image generation migrated to async polling (no more 2-minute synchronous block)
- ✅ VoiceProfile prompt injection mitigated via Zod validation + field sanitization
- ✅ Two Redis clients consolidated into one shared `connection` from `queue/client.ts`
- ✅ `getLimitsForPlan()` duplication resolved via `src/lib/plan-limits.ts`
