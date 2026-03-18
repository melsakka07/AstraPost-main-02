# Latest Updates

## 2026-03-18: Codebase Evaluation & Connection Leak Fix

### Code Quality Assessment
- Evaluated the codebase and gave it a 9.5/10 build quality rating.
- The project follows excellent state-of-the-art patterns (Next.js 16, App Router, Better Auth, Drizzle, Redis Rate Limiting, BullMQ).
- Deemed production-ready, with a few suggestions provided for AI Streaming, Optimistic UI, and performance tuning.

### Fixed Postgres Connection Leak
- **Issue**: Next.js Fast Refresh during development was creating a new Postgres client connection on every reload, eventually exhausting the local database connection pool.
- **Resolution**: Updated `src/lib/db.ts` to cache the `postgres` client instance in `globalThis._postgresClient`.
- **Files Changed**: `src/lib/db.ts`

### Next Steps
- Implement AI SDK `streamObject` for thread generation to improve perceived UI performance.
- Utilize React 19 `useOptimistic` for instant feedback on queue operations.

---

## 2026-03-18: 7 New AI Features (Pro/Agency)

Added 7 new AI-powered features gated behind the Pro/Agency plans.

### New Features
1. **AI Content Calendar** — Generate a weekly/monthly content plan with topics, times, tones, and briefs. Page: `/dashboard/ai/calendar`
2. **URL → Thread Converter** — Paste any article URL; AI scrapes and converts it to a Twitter thread. Tab in `/dashboard/ai`
3. **A/B Variant Generator** — Generate 3 angle variants (emotional/factual/question) of any tweet. Tab in `/dashboard/ai`
4. **Best Posting Time Predictor** — Analyzes own `tweet_analytics` with recency bias to return top 3 posting slots. API: `GET /api/analytics/best-time`
5. **Competitor Analyzer** — Fetch any public account's recent tweets via Bearer Token and generate a strategic AI analysis. Page: `/dashboard/analytics/competitor`
6. **Reply Suggester** — Paste a tweet URL; get 5 contextually relevant reply options with tone/goal control. Page: `/dashboard/ai/reply`
7. **Bio Optimizer** — Generate 3 bio variants under 160 chars optimized for a chosen goal. Page: `/dashboard/ai/bio`

### Files Changed
- `src/lib/plan-limits.ts` — 6 new boolean feature flags
- `src/lib/middleware/require-plan.ts` — 6 new `check*AccessDetailed()` functions
- `src/app/api/ai/calendar/route.ts` — new
- `src/app/api/ai/summarize/route.ts` — new
- `src/app/api/ai/variants/route.ts` — new
- `src/app/api/analytics/best-time/route.ts` — new
- `src/app/api/analytics/competitor/route.ts` — new
- `src/app/api/ai/reply/route.ts` — new
- `src/app/api/ai/bio/route.ts` — new
- `src/app/dashboard/ai/calendar/page.tsx` — new
- `src/app/dashboard/analytics/competitor/page.tsx` — new
- `src/app/dashboard/ai/reply/page.tsx` — new
- `src/app/dashboard/ai/bio/page.tsx` — new
- `src/app/dashboard/ai/page.tsx` — updated (2 new tabs: URL, Variants)
- `src/components/dashboard/sidebar.tsx` — 4 new navigation items

**Full documentation:** `docs/features/new-ai-features-2026-03-18.md`

---

## 2026-03-16: Replicate API Integration Fix

### Fixed 422 Unprocessable Entity Error
- **Issue**: Image generation was failing with `{"detail":"- version is required\n- Additional property model is not allowed\n"}`.
- **Root Cause**: The application was sending the `model` parameter in the body to the generic `/v1/predictions` endpoint, which expects a `version` hash and does not allow `model`.
- **Resolution**: Updated `src/lib/services/ai-image.ts` to use the model-specific endpoint `POST /v1/models/{owner}/{name}/predictions`. This endpoint correctly handles requests using the model name (always using the latest version) and does not require `version` or accept `model` in the body.
- **Verification**: Ran `pnpm test src/lib/services/__tests__/ai-image.test.ts` - all tests passed.
- **Documentation**: Updated `docs/technical/logs-and-issues/ai-image-replicate-fix.md` with detailed logs and solution.

### Next Steps
- Monitor Replicate usage to ensure the new endpoint integration is stable.
- Consider adding an integration test that hits the real Replicate API (with a mocked response or in a separate test suite) to verify contract compliance if issues persist.
