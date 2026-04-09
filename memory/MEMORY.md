# AstraPost Project Memory

## Key Architecture

- Next.js 16 + React 19 + TypeScript, App Router
- BullMQ + Redis for job queue; workers in `src/lib/queue/processors.ts`
- Drizzle ORM + PostgreSQL 18; schema in `src/lib/schema.ts`
- Better Auth for sessions; X OAuth tokens encrypted via AES-256-GCM in `src/lib/security/token-encryption.ts`
- OpenRouter (via `@openrouter/ai-sdk-provider`) for AI; Replicate for images; Gemini for chat/inspire
- Stripe for billing; plan limits in `src/lib/plan-limits.ts`
- `src/proxy.ts` is the Next.js 16 middleware (not `src/middleware.ts`)

## Known Issues (from 2026-03-16 full audit)

Full audit: `docs/audit/full-stack-code-review-2026-03-16.md`

### Critical (Open)

- ✅ FIXED (2026-03-16): SSRF via `POST /api/link-preview` — added session auth + SSRF IP blocklist + protocol allowlist + fixed 200→400 error status
- ✅ FIXED (2026-03-16): OAuth CSRF on LinkedIn + Instagram — HttpOnly SameSite=lax state cookie in auth routes; validated + cleared on all exit paths in callbacks
- ✅ FIXED (2026-03-16): Media upload now uses `upload()` from `@/lib/storage` (Vercel Blob in prod / local in dev); `.mp4` added to `storage.ts` ALLOWED_EXTENSIONS

### High (Open)

- ✅ FIXED (2026-03-16): `handleSubscriptionUpdated` now syncs `user.plan` + `subscriptions.plan/stripePriceId` on upgrade/downgrade; pre-update record fetch for change detection; clears `planExpiresAt`; fires `billing_plan_changed` notification
- ✅ FIXED (2026-03-16): `GET /api/feedback` now requires session (401 guard); votes filter always scoped to session user
- ✅ FIXED (2026-03-16): Feedback POST has Zod schema (title≤100, description≤2000, category enum); structured 400 errors; removed redundant upvotes update
- ✅ FIXED (2026-03-16): `generateImagePromptFromTweet` sanitizes via `sanitizeForPrompt(tweetContent, 500)` + `---` delimiters; fallback also uses sanitized content
- ✅ FIXED (2026-03-16): Admin impersonation route — all 3 `@ts-ignore` removed; `AdminAuthApi` type + narrow `isAdmin` cast with comments
- ✅ FIXED (2026-03-16): X token refresh distributed lock — `refreshWithLock` private static with `SET EX 30 NX`; contended path waits+re-reads DB; Redis-down falls through; both getClient methods unified
- ✅ FIXED (2026-03-16): `removeOnFail: false` → `{ age: 7 * 24 * 60 * 60 }` in BullMQ `SCHEDULE_JOB_OPTIONS`
- ✅ FIXED (2026-03-16): Cairo font added for Arabic — `next/font/google`, `:lang(ar)` in globals.css

### Medium (Open)

- `handleSubscriptionUpdated` → plan divergence on upgrades — see High above (FIXED)
- ✅ FIXED (2026-03-16): Webhook idempotency — `processedWebhookEvents` table; guard + insert in POST handler; migration `0029_rainy_scrambler.sql`
- ✅ FIXED (2026-03-16): All 6 synchronous blocking symbols in `ai-image.ts` annotated `@deprecated` with banner; `createPrediction` any-type tightened
- ✅ FIXED (2026-03-16): DLQ alerting — `job_permanently_failed` log key in both worker `failed` handlers when retries exhausted; `maxAttempts` from `SCHEDULE_JOB_OPTIONS`
- ✅ FIXED (2026-03-16): Test suite — 39 new tests: `token-encryption.test.ts` (14), `billing/webhook/route.test.ts` (12), `processors.integration.test.ts` (+8 permanent-failure path)
- AI thread records `tokensUsed: 0` — quota analytics broken
- ✅ FIXED (2026-03-16): `timezone` validated via `Intl.DateTimeFormat` `.refine()` in `profileSchema` — `src/app/api/user/profile/route.ts`
- `xAccounts` sync references non-existent `refreshToken` field (dead code) — `posts/route.ts:109,129`
- ✅ FIXED (2026-03-16): Admin layout `ml-64` → `ms-64`
- No i18n framework; all strings hardcoded in English
- ✅ FIXED (2026-03-16): Composite index `posts_user_status_published_idx` on `(userId, status, publishedAt)` added; migration `0030_powerful_whirlwind.sql`
- ✅ FIXED (2026-03-16): `generateImagePromptFromTweet` now inserts `aiGenerations` record type `"image_prompt"` for quota observability
- Redundant index on `tweetAnalytics.tweetId` (unique + regular)
- Duplicate index on `user.email` (unique constraint + explicit index)

### Previously Fixed (2026-03-15 review)

- Rate limiter fails closed on AI/cost endpoints ✅
- BetterAuth tokens encrypted in account table ✅
- N+1 post creation replaced with bulk transaction ✅
- WCAG maximumScale violation removed ✅
- Marketing layout isolated from dashboard ✅
- Stripe webhook derives plan from price ID ✅
- Replicate async polling pattern implemented ✅
- VoiceProfile prompt injection patched ✅
- Two Redis clients consolidated ✅

## User Preferences

- Review output saved to `docs/audit/` directory (updated from `docs/review/`)
