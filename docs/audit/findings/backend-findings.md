# Backend Audit Findings

**Audit Date:** 2026-04-16
**Scope:** `src/app/api/`, `src/lib/`, `src/lib/queue/`, `scripts/`, `src/lib/schema.ts`

---

## Summary

| Severity  | Count  |
| --------- | ------ |
| Critical  | 3      |
| High      | 8      |
| Medium    | 10     |
| Low       | 8      |
| **Total** | **29** |

---

## Critical Findings

### B-C1: `console.log`/`console.error` Used in Client Components (CLAUDE.md Rule #11 Violation)

**Files:** 22 component files across `src/components/` and `src/app/`
**Severity:** Critical
**Rule Violated:** CLAUDE.md Hard Rule #11 — "Never use `console.log` or `console.error` — use `import { logger } from '@/lib/logger'`"

**Details:** 47 total instances of `console.log`/`console.error`/`console.warn` found across 28 files. After excluding legitimate uses (logger internals, env validation, error boundaries), 30 instances across 22 client-facing files violate the rule:

- `src/components/composer/composer.tsx` — 9 instances
- `src/components/dashboard/notification-bell.tsx` — 3 instances
- `src/components/dashboard/sidebar.tsx` — 1 instance
- `src/components/settings/voice-profile-form.tsx` — 2 instances
- `src/components/settings/profile-form.tsx` — 1 instance
- `src/components/settings/manage-subscription-button.tsx` — 1 instance
- `src/components/onboarding/onboarding-wizard.tsx` — 2 instances
- `src/components/queue/cancel-post-button.tsx` — 1 instance
- `src/components/ai/hashtag-generator.tsx` — 1 instance
- `src/components/analytics/export-button.tsx` — 1 instance
- `src/components/ui/github-stars.tsx` — 1 instance
- `src/components/composer/viral-score-badge.tsx` — 1 instance
- `src/components/composer/tweet-card.tsx` — 1 instance
- `src/components/composer/best-time-suggestions.tsx` — 1 instance
- `src/components/composer/ai-image-dialog.tsx` — 1 instance
- `src/components/roadmap/feedback-list.tsx` — 1 instance
- `src/components/referral/referral-cookie-processor.tsx` — 1 instance
- `src/components/admin/impersonation/impersonation-table.tsx` — 1 instance
- `src/app/(marketing)/pricing/page.tsx` — 1 instance
- `src/app/dashboard/inspiration/page.tsx` — 1 instance
- `src/app/go/[shortCode]/route.ts` — 1 instance (server route — should use `logger`)

**Legitimate uses (not violations):**

- `src/lib/env.ts` — 6 instances (env validation, runs before logger is available)
- `src/lib/logger.ts` — 3 instances (logger internals, pino fallback)
- `src/lib/storage.ts` — 1 instance (storage fallback)
- `src/app/error.tsx`, `src/app/dashboard/error.tsx`, `src/app/chat/error.tsx`, `src/app/admin/error.tsx` — 4 instances (Next.js error boundary convention — `console.error` is required by Next.js)

**Fix:** Replace all `console.error(error)` in client components with a client-safe logger wrapper. For error boundaries (`error.tsx`), `console.error` is the Next.js convention and should be kept. Create a `src/lib/client-logger.ts` that sends errors to an API endpoint or uses a structured logging service.

---

### B-C2: `getPlanLimits()` Called Directly in 7 Route Handlers (CLAUDE.md Rule #6 Violation)

**Files:**

- `src/app/api/admin/subscribers/[id]/route.ts` (line 9, 119)
- `src/app/api/team/invite/route.ts` (line 7, 37)
- `src/app/api/inspiration/bookmark/route.ts` (line 16, 120)
- `src/app/api/billing/usage/route.ts` (line 6, 28)
- `src/app/api/analytics/export/route.tsx` (line 14, 58)
- `src/app/api/ai/image/quota/route.ts` (line 15, 35)
- `src/app/api/billing/change-plan/preview/route.ts` (line 7, 75-76)

**Severity:** Critical
**Rule Violated:** CLAUDE.md Hard Rule #6 — "Never call `getPlanLimits()` in route handlers — use `require-plan.ts` gate helpers only"

**Details:** 7 route handlers import and call `getPlanLimits()` directly. Some have comments justifying it as "display-only read" (billing/usage, ai/image/quota, billing/change-plan/preview), but the rule is absolute. The admin/subscribers route has no such justification.

**Fix:**

- For display-only reads (billing/usage, ai/image/quota, billing/change-plan/preview): Extract the plan metadata lookup into a dedicated service function `getPlanMetadata(plan: string)` that wraps `getPlanLimits()` — route handlers call the service, not `getPlanLimits()` directly.
- For `admin/subscribers/[id]` and `team/invite`: Use the plan gate helpers or move the logic to a service layer.
- For `inspiration/bookmark`: Use `checkPostLimitDetailed()` or similar gate.

---

### B-C3: Raw `new Response()` and Inline `Response.json()` Used for Error Responses (CLAUDE.md Rules #4, #12)

**Files:**

- `src/app/api/user/preferences/route.ts` — `new Response("Invalid request data", { status: 400 })` and `new Response("Internal Error", { status: 500 })`
- `src/app/api/user/profile/route.ts` — `new Response("Invalid request data", { status: 400 })` and `new Response("Internal Error", { status: 500 })`
- `src/app/api/community/contact/route.ts` — `Response.json({ error: "Too many requests..." }, { status: 429 })` and `Response.json({ error: "Invalid form data", details }, { status: 422 })`
- `src/app/api/media/upload/route.ts` — 5 instances: `new Response("No file uploaded", { status: 400 })`, `new Response("File too large", { status: 400 })`, `new Response("Unsupported file type...", { status: 400 })`, `new Response("Video/Image too large...", { status: 400 })`, `new Response("Internal Server Error", { status: 500 })`
- `src/app/api/team/invitations/[invitationId]/route.ts` — 3 instances: `new Response("Forbidden...", { status: 403 })`, `new Response("Invitation not found", { status: 404 })`, `new Response("Internal Server Error", { status: 500 })`
- `src/app/api/team/invite/[token]/route.ts` — 3 instances: `new Response("Invalid or expired invitation", { status: 404 })`, `new Response("Invitation expired", { status: 400 })`, `new Response("This invitation was sent to a different email address", { status: 403 })`
- `src/app/api/team/join/route.ts` — 5 instances: `new Response("Token is required", { status: 400 })`, `new Response("Invalid invitation token", { status: 404 })`, `new Response("Invitation is no longer valid", { status: 400 })`, `new Response("Invitation has expired", { status: 400 })`, `new Response("Internal Server Error", { status: 500 })`
- `src/app/api/team/members/route.ts` — `new Response("Internal Server Error", { status: 500 })`
- `src/app/api/x/accounts/sync/route.ts` — `new Response("Forbidden: Only team owner can sync accounts", { status: 403 })`
- `src/app/api/x/accounts/route.ts` — `new Response("Not Implemented", { status: 501 })`
- `src/app/api/posts/route.ts` — `new Response("Forbidden: Viewers cannot create posts", { status: 403 })`
- `src/app/api/posts/bulk/route.ts` — `Response.json({ error: error.message }, { status: 400 })`
- `src/app/api/user/export/route.ts` — `new Response("User not found", { status: 404 })`
- `src/app/api/billing/webhook/route.ts` — `new Response("Config Error", { status: 500 })`, `new Response("Webhook Error", { status: 400 })`, `new Response("Webhook Processing Error", { status: 500 })`

**Severity:** Critical
**Rule Violated:** CLAUDE.md Hard Rules #4 and #12

**Details:** The original audit only identified 2 files with `new Response()` violations. Cross-referencing reveals **14 route files** with 25+ instances of raw `new Response()` or inline `Response.json()` used for error responses instead of `ApiError.*` methods. The `billing/webhook/route.ts` uses raw `new Response()` for Stripe webhook responses — while some of these (e.g., `new Response(null, { status: 200 })` for webhook acknowledgment) are acceptable per Stripe's API contract, error responses should still use `ApiError` where possible.

**Fix:** Replace all raw `new Response()` error responses with `ApiError.*` methods:

- `new Response("...", { status: 400 })` → `ApiError.badRequest("...")`
- `new Response("...", { status: 403 })` → `ApiError.forbidden("...")`
- `new Response("...", { status: 404 })` → `ApiError.notFound("...")`
- `new Response("...", { status: 500 })` → `ApiError.internal("...")`
- `Response.json({ error }, { status: 429 })` → `createRateLimitResponse()` or `ApiError.tooManyRequests("...")`
- `Response.json({ error }, { status: 422 })` → `ApiError.badRequest("...")`
- Exception: `billing/webhook/route.ts` — `new Response(null, { status: 200 })` for Stripe acknowledgment is correct per Stripe's API contract

---

## High Findings

### B-H1: AI Score Endpoint Missing `recordAiUsage()` (CLAUDE.md Rule #7)

**File:** `src/app/api/ai/score/route.ts`
**Severity:** High
**Rule Violated:** CLAUDE.md Hard Rule #7 — "Every AI endpoint must call `recordAiUsage()` for billing tracking"

**Details:** The viral score endpoint uses `aiPreamble()` with `skipQuotaCheck: true` and never calls `recordAiUsage()`. While the comment says "scoring doesn't burn generation credits," it still consumes OpenRouter tokens and should be tracked for cost visibility.

**Fix:** Add `recordAiUsage()` call after successful generation with type `"viral_score"` (add to `aiGenerationTypeEnum`).

---

### B-H2: AI Image Endpoint Missing `recordAiUsage()` for Main Generation

**File:** `src/app/api/ai/image/route.ts`, `src/app/api/ai/image/status/route.ts`
**Severity:** High
**Rule Violated:** CLAUDE.md Hard Rule #7

**Details:** Neither the main image POST handler nor the image status polling endpoint calls `recordAiUsage()`. The original audit claimed the status endpoint records usage on success, but cross-referencing confirms it does NOT. This means image generation costs are completely untracked — if the user navigates away or the status poll fails, the generation cost goes entirely unrecorded.

**Fix:** Add a `recordAiUsage()` call in the main POST handler immediately after `startImageGeneration()` succeeds, with type `"image"`. This ensures tracking regardless of whether the user polls for status.

---

### B-H3: AI Agentic Approve Endpoint Missing `recordAiUsage()`

**File:** `src/app/api/ai/agentic/[id]/approve/route.ts`
**Severity:** High
**Rule Violated:** CLAUDE.md Hard Rule #7

**Details:** The approve endpoint creates posts from agentic sessions but does not call `recordAiUsage()`. The original agentic pipeline records usage, but the approve flow may trigger additional operations (scheduling, queue enqueuing) that should be tracked.

**Fix:** Add `recordAiUsage()` with type `"agentic_approve"` if any AI-related processing occurs during approval.

---

### B-H4: Multiple Routes Missing Rate Limiting

**Files:**

- `src/app/api/ai/score/route.ts` — No `checkRateLimit()`
- `src/app/api/ai/quota/route.ts` — No `checkRateLimit()`
- `src/app/api/ai/history/route.ts` — No `checkRateLimit()`
- `src/app/api/ai/image/status/route.ts` — No `checkRateLimit()` (polling endpoint)
- `src/app/api/notifications/route.ts` — No `checkRateLimit()`
- `src/app/api/affiliate/route.ts` — No `checkRateLimit()`
- `src/app/api/templates/route.ts` — No `checkRateLimit()`
- `src/app/api/feedback/route.ts` — No `checkRateLimit()` on POST
- `src/app/api/link-preview/route.ts` — No `checkRateLimit()`
- `src/app/api/user/profile/route.ts` — No `checkRateLimit()`
- `src/app/api/user/preferences/route.ts` — No `checkRateLimit()`

**Severity:** High

**Details:** 11 routes lack rate limiting. While some are read-only (quota, history, notifications, affiliate), they can still be abused for enumeration or DoS. Write endpoints (feedback, templates, profile, preferences) are more vulnerable.

**Fix:** Add `checkRateLimit()` to all mutation endpoints. For polling endpoints (ai/image/status, notifications), implement a lighter rate limit or use client-side throttling.

---

### B-H5: `aiPreamble()` Not Used in AI Agentic Approve Route

**File:** `src/app/api/ai/agentic/[id]/approve/route.ts`
**Severity:** High

**Details:** The approve route uses raw `auth.api.getSession()` instead of `aiPreamble()`. While it does perform manual quota checks (`checkAiLimitDetailed`, `checkAiQuotaDetailed`), it bypasses the standardized preamble flow that handles session, plan, rate-limit, and quota in one call.

**Fix:** Use `aiPreamble()` with `skipQuotaCheck: false` to get consistent auth + plan + rate-limit handling, then add the additional agentic-specific checks after.

---

### B-H6: `link-preview` Route Has Manual JSON Parsing Instead of Zod Validation

**File:** `src/app/api/link-preview/route.ts`
**Severity:** High

**Details:** The link-preview endpoint manually parses the request body with `typeof` checks instead of using Zod `.safeParse()`. This is inconsistent with the API Route Checklist (step 4) and more error-prone.

**Fix:** Create a Zod schema for the request body and use `.safeParse()`.

---

### B-H7: `community/contact` Route Uses In-Memory Rate Limiting

**File:** `src/app/api/community/contact/route.ts`
**Severity:** High

**Details:** The contact form uses an in-memory `Map<string, number[]>` for rate limiting. In a serverless/multi-instance deployment (Vercel), this is completely ineffective — each instance has its own Map. The route also doesn't use the shared Redis-based `checkRateLimit()`.

**Fix:** Replace the in-memory rate limiter with `checkRateLimit()` from `@/lib/rate-limiter` using a dedicated type (e.g., `"contact"`).

---

### B-H8: `diagnostics` Endpoint Exposes Environment Configuration

**File:** `src/app/api/diagnostics/route.ts`
**Severity:** High

**Details:** The diagnostics endpoint is intentionally public (no auth) and returns boolean flags for whether env vars are set. While it doesn't expose values, an attacker can use this to fingerprint which services are configured (Stripe, OpenRouter, etc.) and target the application accordingly. The comment acknowledges this is intentional for the setup checklist, but it should be restricted.

**Fix:** Add a time-based or IP-based rate limit. Consider requiring a setup token or restricting to localhost in production. At minimum, add `checkIpRateLimit()`.

---

## Medium Findings

### B-M1: `user/preferences` Route Uses `.parse()` Instead of `.safeParse()`

**File:** `src/app/api/user/preferences/route.ts` (line 42)
**Severity:** Medium

**Details:** Uses `preferencesSchema.parse(body)` which throws on invalid input. While the catch block handles `ZodError`, this is inconsistent with the API Route Checklist which specifies `.safeParse()`.

**Fix:** Use `.safeParse()` and return `ApiError.badRequest()` on failure.

---

### B-M2: `user/profile` Route Uses `.parse()` Instead of `.safeParse()`

**File:** `src/app/api/user/profile/route.ts`
**Severity:** Medium

**Details:** Same issue as B-M1 — uses `.parse()` instead of `.safeParse()`.

**Fix:** Use `.safeParse()` and return `ApiError.badRequest()` on failure.

---

### B-M3: No Dead-Letter Queue Configuration for BullMQ

**File:** `src/lib/queue/client.ts`
**Severity:** Medium

**Details:** While `SCHEDULE_JOB_OPTIONS` and `ANALYTICS_JOB_OPTIONS` have proper retry/backoff/timeout configuration, there's no dead-letter queue (DLQ) pattern. Failed jobs are retained for 7 days via `removeOnFail: { age }`, but there's no automated mechanism to route permanently failed jobs to a DLQ for inspection or reprocessing.

**Fix:** Add a `failed` event listener in the worker that moves jobs exceeding max attempts to a dedicated DLQ or marks them in the database for admin review.

---

### B-M4: `aiGenerations` Table Missing `createdAt` Index for Time-Range Queries

**File:** `src/lib/schema.ts` (aiGenerations table)
**Severity:** Medium

**Details:** The `aiGenerations` table has an index on `userId` but not on `createdAt`. Monthly usage queries (`getMonthlyAiUsage`) filter by both `userId` and `createdAt` range, meaning Postgres must scan all user records and filter by date.

**Fix:** Add a composite index `ai_gen_user_created_idx` on `(userId, createdAt)`.

---

### B-M5: `processedWebhookEvents` Table Has No Retention Cleanup

**File:** `src/lib/schema.ts` (processedWebhookEvents table)
**Severity:** Medium

**Details:** The table comment says "rows are never cleaned up in the hot path" and suggests "A periodic job or manual maintenance query can prune rows older than 90 days." But no such job exists. This table will grow unboundedly.

**Fix:** Add a cleanup step to the existing `billing-cleanup` cron job that deletes `processedWebhookEvents` older than 90 days.

---

### B-M6: `inspiration/bookmark` Route Calls `getPlanLimits()` for Write Operation

**File:** `src/app/api/inspiration/bookmark/route.ts` (line 120)
**Severity:** Medium

**Details:** The bookmark route uses `getPlanLimits()` to check bookmark limits before creating a bookmark. This should use a plan gate helper.

**Fix:** Create a `checkBookmarkLimitDetailed()` gate in `require-plan.ts` or use an existing quota mechanism.

---

### B-M7: `verification` Table Missing Indexes

**File:** `src/lib/schema.ts` (verification table)
**Severity:** Medium

**Details:** The `verification` table (used by Better Auth for email verification, password reset, etc.) has no indexes. The `identifier` column is queried frequently during verification flows.

**Fix:** Add an index on `verification.identifier` and a composite index on `(identifier, expiresAt)` for cleanup queries.

---

### B-M8: Media Upload Uses `new Response()` Instead of `ApiError` for Validation Errors

**File:** `src/app/api/media/upload/route.ts`
**Severity:** Medium

**Details:** The upload route has proper file size validation (absolute max check, per-type size enforcement, file type validation) but uses raw `new Response()` for all error responses instead of `ApiError.*` methods. This is a subset of B-C3 but called out separately because the validation logic itself is correct — only the response formatting violates the rules.

**Fix:** Replace `new Response("No file uploaded", { status: 400 })` with `ApiError.badRequest("No file uploaded")`, and similarly for all other error responses in this file.

---

### B-M9: `analytics/export` Route Uses `getPlanLimits()` for Display

**File:** `src/app/api/analytics/export/route.tsx` (line 14, 58)
**Severity:** Medium

**Details:** Uses `getPlanLimits()` to determine export format limits. Should use a service function.

**Fix:** Extract to a service function as described in B-C2.

---

### B-M10: Missing `x-correlation-id` Header on Many Routes

**Files:** Most routes that don't use `aiPreamble()` or `getCorrelationId()`
**Severity:** Medium

**Details:** The API Route Checklist (step 9) says to set `x-correlation-id` header when relevant. Many routes that perform database writes or enqueue jobs don't set this header, making it harder to trace requests through logs.

**Fix:** Add `getCorrelationId(req)` and set the response header on all mutation routes.

---

## Low Findings

### B-L1: `IORedis` Connection Typed as `any`

**File:** `src/lib/queue/client.ts` (line 14, 22, 33, 46)
**Severity:** Low

**Details:** `connection as any` is used in all Queue constructors. This suppresses TypeScript checking on the Redis connection.

**Fix:** Create a properly typed connection wrapper or use `as unknown as IORedis.Redis` with a type assertion that's more specific.

---

### B-L2: `user` Table Uses Text IDs Instead of UUIDs

**File:** `src/lib/schema.ts` (user table)
**Severity:** Low

**Details:** The schema comment acknowledges this: "to maintain consistency with the existing user table which uses text IDs." All related tables also use text IDs. While not a bug, UUIDs would provide better uniqueness guarantees.

**Fix:** No action needed now — this is a known architectural decision. Document it as a tech debt item for future consideration.

---

### B-L3: No Database Connection Pool Configuration Visible

**File:** `src/lib/db.ts`
**Severity:** Low

**Details:** The Drizzle ORM client configuration wasn't fully visible in this audit, but connection pool settings (max connections, idle timeout) should be explicitly configured for production.

**Fix:** Verify and document connection pool settings in `db.ts`.

---

### B-L4: `session` Table `token` Column Has Index But Is Already `unique()`

**File:** `src/lib/schema.ts` (session table, line 261)
**Severity:** Low

**Details:** The `session` table has both `.unique()` on the `token` column and a separate `index("session_token_idx")`. The unique constraint already creates an index, so the explicit index is redundant.

**Fix:** Remove the redundant `index("session_token_idx")`.

---

### B-L5: No Input Sanitization on `ai/score` Content Before Embedding in Prompt

**File:** `src/app/api/ai/score/route.ts` (line 52)
**Severity:** Low

**Details:** User content is embedded directly in the prompt via template literal: `"${content}"`. While `generateObject` with a structured schema provides some protection, the content could still influence the model's behavior. Compare with `ai/image/route.ts` which uses `sanitizeForPrompt()`.

**Fix:** Use `sanitizeForPrompt()` from `@/lib/ai/voice-profile` before embedding content in the prompt.

---

### B-L6: `affiliate/clicks` Stores IP Addresses Without Anonymization

**File:** `src/lib/schema.ts` (affiliateClicks table)
**Severity:** Low

**Details:** The `affiliateClicks` table stores full IP addresses. Depending on GDPR/privacy requirements, these should be hashed or truncated.

**Fix:** Consider hashing IP addresses before storage, or document the privacy implications.

---

### B-L7: Additional Routes Use `.parse()` Instead of `.safeParse()`

**Files:**

- `src/app/api/ai/trends/route.ts` — Uses `JSON.parse()` for cached/raw data
- `src/app/api/ai/inspiration/route.ts` — Uses `JSON.parse()` for cached data
- `src/app/api/ai/image/status/route.ts` — Uses `JSON.parse()` for prediction metadata
- `src/app/api/ai/agentic/[id]/regenerate/route.ts` — Uses `JSON.parse()` for tweet parsing
- `src/app/api/posts/bulk/route.ts` — Uses `Papa.parse()` (CSV parsing, acceptable)
- `src/app/api/team/members/[memberId]/route.ts` — Uses `.parse()` for Zod validation
- `src/app/api/admin/announcement/route.ts` — Uses `.parse()` for Zod validation
- `src/app/api/announcement/route.ts` — Uses `.parse()` for Zod validation

**Severity:** Low

**Details:** While B-M1 and B-M2 cover `user/preferences` and `user/profile`, additional routes also use `.parse()` instead of `.safeParse()` for Zod validation. The `JSON.parse()` calls in AI routes are for internal data parsing (cached results, prediction metadata) and are less critical since the data comes from the system itself, not user input. However, the Zod `.parse()` calls in team/members and announcement routes should be converted to `.safeParse()` for consistency with the API Route Checklist.

**Fix:** Convert Zod `.parse()` calls to `.safeParse()` with `ApiError.badRequest()` error handling. `JSON.parse()` calls for internal data can remain but should be wrapped in try/catch.

---

### B-L8: Team Routes Use `new Response()` for All Error Responses

**Files:**

- `src/app/api/team/invitations/[invitationId]/route.ts`
- `src/app/api/team/invite/[token]/route.ts`
- `src/app/api/team/join/route.ts`
- `src/app/api/team/members/route.ts`

**Severity:** Low

**Details:** This is a subset of B-C3 but worth calling out separately. The entire team API module consistently uses `new Response("...", { status: N })` for all error responses instead of `ApiError.*` methods. This suggests the team routes were written before the `ApiError` pattern was established or by a contributor who wasn't aware of the convention.

**Fix:** Replace all `new Response()` error responses in team routes with `ApiError.*` methods as specified in B-C3.
