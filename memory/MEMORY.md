# AstraPost Project Memory

## Key Architecture
- Next.js 16 + React 19 + TypeScript, App Router
- BullMQ + Redis for job queue; workers in `src/lib/queue/processors.ts`
- Drizzle ORM + PostgreSQL 18; schema in `src/lib/schema.ts`
- Better Auth for sessions; X OAuth tokens encrypted via AES-256-GCM in `src/lib/security/token-encryption.ts`
- OpenRouter (via `@openrouter/ai-sdk-provider`) for AI; Replicate for images; Gemini for chat/inspire
- Stripe for billing; plan limits in `src/lib/plan-limits.ts`
- `src/proxy.ts` is the Next.js 16 middleware (not `src/middleware.ts`)

## Known Issues (from 2026-03-15 code review)
See `docs/review/code-review-2026-03-15.md` for full findings.

### Critical/High Priority
- Rate limiter fails open on Redis error (ai-cost risk) — `src/lib/rate-limiter.ts:54`
- BetterAuth `account` table stores OAuth tokens in plaintext — `src/lib/schema.ts:86`
- N+1 inserts in post creation (780 queries worst case) — `src/app/api/posts/route.ts:250`
- `viewport: { maximumScale: 1 }` violates WCAG — `src/app/layout.tsx:26`
- `return null` on missing session in dashboard pages (should redirect) — multiple pages
- Marketing SiteHeader/Footer shown on all routes including dashboard — `src/app/layout.tsx`
- Stripe webhook assigns plan from metadata, not price ID verification — `billing/webhook/route.ts:67`
- Synchronous 2-minute poll for Replicate image generation — `src/lib/services/ai-image.ts:143`
- Prompt injection via voiceProfile jsonb field — `src/app/api/ai/thread/route.ts:78`

### Medium Priority
- 7 serial DB queries on analytics page (should use Promise.all)
- No pgEnum constraints on status/plan fields in schema
- 4x session lookups per POST /api/posts request
- Timezone not communicated to users for scheduled posts
- Missing `role="alert"` on dynamic error messages in auth forms
- Calendar page doesn't validate `?date=` search param

## Project Structure Notes
- Two Redis clients exist: `src/lib/queue/client.ts` and `src/lib/rate-limiter.ts` (should share)
- `xAccounts.refreshToken` (plaintext) and `refreshTokenEnc` (encrypted) both exist — legacy dual columns
- `getLimitsForPlan()` duplicated in composer.tsx — diverges from `plan-limits.ts`
- Inspiration history tab is session-memory only (not persisted)

## User Preferences
- Review output saved to `docs/review/` directory
