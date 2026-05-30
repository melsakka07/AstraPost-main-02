# Recent Fixes & Changes

## 2026-05-31 — Wave 8 Task E: Composer Preview X/Twitter Thread Rewrite

### `src/components/composer/composer-preview.tsx` — full visual rewrite

- **Props**: Backward compatible — same `ComposerPreviewProps` interface. `session` retained but unused.
- **Single tweet**: 48px avatar, header with verified badge (BadgeCheck, sky-500), @handle, dot separator, "now" timestamp. Content with `whitespace-pre-wrap`. Media grid: 1 image (max-h-72 rounded-2xl), 2 side-by-side, 3 (1 large + 2), 4 (2x2). Video/GIF gets centered Play overlay. Link preview card with bordered X-style layout. Engagement row with 4 icons + 0 counts.
- **Thread desktop (>=640px)**: Stacked cards with `border-l-2 border-border` vertical connector lines between 40px avatars. Tweet numbering (1/N) top-right.
- **Thread mobile (<640px)**: Horizontal `snap-x snap-mandatory` carousel with 85vw snap-center cards.
- **Uploading**: `Skeleton` placeholders replace media grid when any item has `uploading: true`.
- **RTL/dark mode**: `dir="auto"`, semantic tokens (`bg-card`, `text-muted-foreground`, `border-border`).
- **Removed**: `ViralScoreBadge` (preview is visual-only). All new sub-components are file-private.
- **Icons added**: `BadgeCheck`, `MessageCircle`, `Repeat2`, `Heart`, `BarChart3`, `Play` from lucide-react.

### Audio format selection on Railway with yt-dlp 2026.03.17

`src/lib/services/youtube.ts:extractAudioViaYtDlp` now defaults to `--extractor-args "youtube:player_client=tv,android_vr,ios"` without cookies (avoids disabling iOS/android_vr clients). On failure, retries with mweb+web_safari clients + cookies if available. Returns `YoutubeAudioUnavailableError` with typed `reason` field for observability.

### Image constraint fix

`youtube-url-input.tsx` replaced inline `<Image width=112 height=64>` (16×9) with sized wrapper + `fill` to match YouTube hqdefault 4:3 ratio in flex layout.

---

## 2026-05-14 — Phase 4 Billing Audit: Webhook Trial-vs-Cancel (Finding #7)

### Trial-expired subscription deletion routing

`handleSubscriptionDeleted` in `src/app/api/billing/webhook/route.ts` now detects when a deleted subscription was an expired trial (not a paid cancellation) and routes to the trial-expired notification/email flow. Detection uses three signals:

1. `subscription.status === "incomplete_expired"` (Stripe sentinel for trial expiry before first payment)
2. Subscription had `trial_end` and was `canceled_at` within 24h of trial end (covers webhook backlog without admitting genuine paid cancellations)
3. Local DB `subRecord.status === "trialing"` (tiebreaker when Stripe signals are ambiguous)

When `isTrialExpiry` is true: sends `billing_trial_expired` notification + `TrialExpiredEmail`, and writes `planChangeLog` with reason `"trial_expired_via_deleted"`. When false: original paid cancellation path (`billing_subscription_cancelled` + `SubscriptionCancelledEmail` + reason `"subscription_deleted"`).

### Test coverage

New Vitest test in `route.test.ts` asserts trial-expired notification + `TrialExpiredEmail` fire (not cancellation variants) when a trialing-status subscription is deleted, and verifies `planChangeLog` reason is `"trial_expired_via_deleted"`.

---

## 2026-05-14 — Phase 2 Billing Audit: Quota Leak Sweep (Findings #4 + #4b)

### Moderation quota refund (#4)

All 16 AI routes that consume quota AND call `checkModeration` now release quota on moderation flag. Pattern: `await releaseQuota()` before `return modResult` (simple routes) or before enqueuing moderation message (stream routes).

### Stream failure quota leak (#4b)

Anonymous `catch {}` blocks inside `ReadableStream` handlers (thread single + thread, template-generate, agentic) now: (a) release quota, (b) log with `logger.error("ai_stream_failed", ...)`, (c) capture with `Sentry.captureException`. `recordAiUsage` is NOT called on the catch path per committed policy.

Routes without `releaseQuota` in preamble destructuring fixed: `refine`, `score`.

New Sentry imports added to: `thread`, `template-generate`, `agentic`.

### Verification

`pnpm run check` (0/0/2800 keys), `pnpm test` (34 files, 322/322). Grep confirms all 16 routes have `await releaseQuota` in moderation branches.

---

## 2026-05-14 — Phase 1 Billing Audit: Rate-Limiter, Marketing Alignment, Preview Prices, Rollover

### Rate-limiter arg-order bug (#5)

Four endpoints (YT cancel, PDF status, PDF cancel, PDF upload) passed `ctx.session.user.id` as the `plan` argument to `checkRateLimit`, causing all users to be throttled at free-tier limits. Fixed by resolving plan via `getUserPlanType(ctx.currentTeamId)`.

### Marketing alignment (#1, #2, #3)

EN + AR i18n claims aligned with code enforcement (lowered marketing to match code per user decision): Free posts 50→20, Pro X accounts 5→3, Agency X accounts Unlimited→10. Removed unsupported "Priority support" and "Dedicated account manager" claims from both locales and pricing table.

### Plan-change preview pricing (#8)

`change-plan/preview/route.ts` now uses `pricing.ts` functions instead of hardcoded `monthlyPrices` map.

### AI counter rollover sentinel (#11)

Unlimited-plan counter rows now deleted on rollover instead of set to `limit: 0`. Fixed docstring in `ai-quota-atomic.ts`.

### Verification

`pnpm run check` (0/0/2800 keys), `pnpm test` (322/322), audits clean.

---

## 2026-05-14 — Phase 4 Billing Audit: -1 Sentinel, enabledTools Refactor, Tier Proposals

### -1 sentinel for Agency AI quota (P3)

`plan-limits.ts` Agency `aiGenerationsPerMonth` changed from `Infinity` to `-1`. Updated all 8 consumers across `require-plan.ts`, `ai-quota-atomic.ts`, `ai-quota.ts`, `ai-counter-rollover/route.ts`, and `change-plan/preview/route.ts`. Consistent with existing `-1` sentinel pattern (`aiImagesPerMonth`, `maxInspirationBookmarks`).

### enabledTools refactor (P3)

18 `canUseXyz` booleans replaced with single `enabledTools: ToolKey[]` in `PlanLimits`. New `ToolKey` type (18 keys) + `PRO_TOOLS` constant in `plan-limits.ts`. `makeFeatureGate` factory checks `limits.enabledTools.includes(toolKey)`. Updated callers in `require-plan.ts` (18 gates), `dashboard/ai/page.tsx`, `change-plan/preview/route.ts`, and `require-plan.test.ts`.

### Starter & Team tier proposals (P3, proposal only)

No implementation. Starter ($9-12/mo) and Team ($49/mo) tiers proposed based on audit §3 recommendations.

---

## 2026-05-14 — Phase 3 Billing Audit: Pro Annual Parity, Schedule Horizon, Analytics, billingCycle

### Pro Annual feature parity (P2)

Pro Annual plan (`plan-limits.ts`) now has identical feature limits as Pro Monthly. `aiGenerationsPerMonth`: 150 (was 250), `maxXAccounts`: 3 (was 4), `youtubeToThreadMonthly`: 30 (was 50), `maxInstagramAccounts`: 1 (was 2). Annual = ~17% discount only, no extra features. Pricing table UI (`pricing-table.tsx`) updated to show matching 15-feature list for both Pro plans.

### Schedule horizon gate (P2)

New `maxScheduleHorizonDays` plan limit: free/trial 7 days, pro 90 days, agency Infinity. New `checkScheduleHorizonDetailed` gate in `require-plan.ts` enforced in `posts/route.ts` before scheduling. Blocks free/trial users from scheduling posts more than 7 days into the future.

### Analytics retention at query time (P2)

`analytics/viral/route.ts` now caps query window at plan's `analyticsRetentionDays`. Also fixed: missing `checkViralScoreAccessDetailed` gate (was silently serving Pro feature to free users), NaN bypass in `parseInt` input validation. Export route already had retention enforcement via `getPlanMetadata`.

### subscriptions.billingCycle (P2)

New `billingCycleEnum` (`monthly | annual`) + nullable `billingCycle` column on `subscriptions` table. Webhook checkout handler populates from Stripe price `recurring.interval`. Migration: `drizzle/0081_blushing_living_lightning.sql`.

### user.trialExtendedAt (kept)

Decision: keep as write-only audit trail. No code changes.

---

## 2026-05-14 — Phase 1 Final: Pricing Table Per-Month Equivalent

`src/components/billing/pricing-table.tsx` lines 153, 174: Replaced hardcoded `perMonthEquivalent` (`"~$24/mo"`, `"~$83/mo"`) with computed values from `getMonthlyPrice()` + `formatPrice()`. Eliminates the last hardcoded price display — UI now derives from the single `PRICING` source of truth. Pro Annual: `~$24.17/mo` (was `~$24/mo`), Agency Annual: `~$82.50/mo` (was `~$83/mo`).

---

## 2026-05-14 — Phase 2 Billing Audit: Worker Re-Gate, Trial Cron, Quota Refund

### Worker plan re-gate (P1)

`scheduleProcessor` now re-checks the user's current plan limits before publishing. Scenario fixed: user on Pro schedules 200 posts, downgrades to Free (20 posts/month), worker would previously publish all 200 — now marks excess as `over_quota` with notification. Re-gate gracefully degrades on plan lookup failure (Redis down) — favors publishing since creation-time validation is the primary gate.

Schema: `postStatusEnum` gains `"over_quota"`. `notificationTypeEnum` gains `"post_over_quota"` and `"trial_expiring_soon"`.

### Trial expiry warning cron (P1)

New cron `src/app/api/cron/trial-expiry-warning/route.ts` closes the synthetic trial silence gap. Scans `user.trialEndsAt` for T-3 and T-1 windows daily. Sends in-app notification + email. Deduped via 48h lookback on existing notifications. Stripe-managed trials were already handled by webhook — this covers the free→trial→free synthetic flow.

### Quota refund-on-discard (P1)

Audit found 15 AI routes leaking quota on failure (13 never called `releaseQuota()`, 2 missed early-return paths). All 15 fixed to exhaustively release quota on every discard path: Zod validation failures, URL checks, AI provider errors, moderation flags. Pattern: destructure `releaseQuota` from preamble, call before every early return and in every catch block.

### Marketing↔plan-limits drift (P1, read-only)

Pricing table claims vs actual plan-limits values documented. Key drifts: Free tier overstates posts (50 vs 20), Pro Monthly overstates X accounts (5 vs 3), all AI credit counts are wrong, Agency hides LinkedIn/Instagram support entirely. See full report in Phase 2 output.

**Verification:** `pnpm run check` passes, `pnpm test` passes (34 files, 322 tests).

---

## 2026-05-14 — Phase 1 Billing Audit: Instagram/LinkedIn Account Gates + Pricing Fix

### Instagram account limit gate (P0 revenue leak)

Instagram was completely ungated — free users could connect unlimited Instagram accounts and bypass the X-account cap by publishing through Instagram. Fixed by adding `maxInstagramAccounts` to `PlanLimits` (free/trial: 0, pro_monthly: 1, pro_annual: 2, agency: 5) and `checkInstagramAccountLimitDetailed` gate in `require-plan.ts`.

Enforcement points:

- `src/app/api/instagram/callback/route.ts` — gate check BEFORE OAuth token exchange (redirects with `error=instagram_plan_limit`)
- `src/app/api/posts/route.ts` — gate check when selected accounts include Instagram (returns 402 via `createPlanLimitResponse`)

### LinkedIn account count limit (P0 revenue leak)

LinkedIn had a feature gate (`checkLinkedinAccessDetailed`, Agency-only) but no per-account-count cap. Agency users could connect unlimited LinkedIn accounts. Fixed by adding `maxLinkedinAccounts` to `PlanLimits` (0 for all plans except agency: 5) and `checkLinkedinAccountLimitDetailed` gate.

Enforcement point:

- `src/app/api/linkedin/callback/route.ts` — account-count check after feature gate (redirects with `error=linkedin_account_limit`)

### Pricing single-source fix (P0 data inconsistency)

`src/lib/pricing.ts` Pro Annual encoded three contradictory numbers: `monthlyPrice: 2300` ($23), `annualPrice: 29000` ($290 → $24.17/mo), and a comment claiming "$19/month when $228/year". Fixed by:

- Making `monthlyPrice` optional on `PricingConfig`
- Removing `monthlyPrice` from annual entries
- Deriving monthly equivalent in `getMonthlyPrice()` via `Math.round(annualPrice/12)`
- Replacing misleading comment with actual math

**Verification:** `pnpm run check` passes, `pnpm test` passes (34 files, 322 tests).

---

## 2026-05-08 — Token Refresh Failure Handling at Scale

Differentiated transient vs permanent token refresh failures, added circuit breaker, proactive email notifications, and dashboard health indicators. See `docs/0-MY-LATEST-UPDATES.md` for full details.

**New files:** `src/lib/services/x-error.ts`, `src/lib/services/x-circuit-breaker.ts`, `src/components/email/token-expiring-email.tsx`, `src/components/email/account-deactivated-email.tsx`
**Schema:** `drizzle/0076_whole_mac_gargan.sql` — added `consecutiveRefreshFailures`, `lastRefreshFailureAt`, `refreshFailureReason` to `x_accounts`
**Env vars:** `X_CIRCUIT_THRESHOLD` (default 5), `X_CIRCUIT_TIMEOUT_MS` (default 300000)

---

## 2026-05-07 — AI Hub UX: Breadcrumbs, Tab-Aware Writer, In-Place Upgrade Modal

### Architecture shift

- `/dashboard/ai/page.tsx` now resolves the user's effective plan server-side via `getUserPlanType()` + `getPlanLimits()`, computes a `lockedMap: Record<AiToolId, boolean>`, and delegates rendering to a new client component.
- New file: `src/components/ai/ai-tools-grid.tsx` — owns the canonical `TOOL_META` map (icon, href, isPro, feature key per tool ID). Renders locked cards as `<button>` calling `useUpgradeModal().openWithContext(...)` instead of a `<Link>`. Single source of truth for the AI tool catalog.

### Sub-page parity

- `dashboard/ai/writer`, `dashboard/ai/pdf-to-thread`, `dashboard/ai/youtube-to-thread` now follow the same Bio/Reply/Calendar pattern: `<Breadcrumb items={[{ label: t("title") }]} className="mb-2" />` rendered as the first child of `<DashboardPageWrapper>`. Hardcoded Home icon links to `/dashboard/ai`.

### Tab-aware writer

- `dashboard/ai/writer/page.tsx` — `<DashboardPageWrapper>` + `<Breadcrumb>` moved inside `AIWriterContent` so they read live `activeTab` state. New module-level `TAB_META` map maps each tab (`thread` / `url` / `variants` / `hashtags`) to its icon + i18n key pair. Header icon, title, description, and breadcrumb update live as the user switches tabs. Clicking "Hashtag Generator" on the hub now lands on a page identified as "Hashtag Generator" with the `Hash` icon, not generic "AI Writer".

### Pro-badge correctness

- URL→Thread and A/B Variants cards on the hub now show the Pro badge (previously omitted despite being Pro-gated). Lock badge replaces the Pro badge for Free/Trial users.

### Quota-exhausted UX

- Replaced blanket `pointer-events-none opacity-50` dimming with per-card lock badges + "Upgrade to continue" CTA. Cards remain readable; clicks open the upgrade modal with `code: "quota_exceeded"` context.

### i18n

- Added `ai_writer.tab_meta.{thread,url,variants,hashtags}.{title,description}` (8 leaves) and `ai_hub.{locked_overlay_title,locked_overlay_cta,quota_overlay_cta}` (3 leaves). +11 keys × 2 locales. Final count: 2672/2672.

---

## 2026-05-07 — YouTube-to-Thread: Full Implementation

Complete YouTube URL → Twitter thread feature shipped across schema, API routes, BullMQ worker, plan gates, and UI.

### Schema

- New table `youtubeThreadJobs` (21 columns, 2 indexes) — tracks YouTube processing from enqueue through completion. Columns: id, userId, status (queued/downloading/transcribing/generating/ready/failed), youtubeUrl, youtubeVideoId, youtubeTitle, durationSeconds, provider (deepgram/whisper), language, tweetCount, threadResult (JSON), transcript, error, errorCode (10 classified codes: VIDEO_PRIVATE, VIDEO_AGE_GATED, VIDEO_LIVE, VIDEO_TOO_LONG, VIDEO_NO_AUDIO, TRANSCRIPTION_FAILED, MODERATION_FLAGGED, PROVIDER_ERROR, CANCELLED, UNKNOWN), tone (professional/educational/casual/formal/enthusiastic, default casual), quotaConsumed, quotaReleased, thumbnailUrl, createdAt, updatedAt, completedAt.
- New enum value: `"youtube_to_thread"` in `aiGenerationTypeEnum`; new `"transcription"` type for quota tracking.

### API Routes

- `POST /api/ai/youtube-to-thread` — validate URL (yt-dlp metadata), gate (plan + monthly quota + duration cap), enqueue BullMQ job. Returns jobId + videoInfo preview (title, duration, thumbnail) for previewOnly mode.
- `GET /api/ai/youtube-to-thread/[jobId]` — poll status; returns threadResult, transcript (when ready), youtubeUrl, provider, language, durationSeconds, errorCode.
- `DELETE /api/ai/youtube-to-thread/[jobId]` — cancel job, atomically flip quotaReleased, release quota.
- `GET /api/ai/youtube-to-thread/history` — last 5 ready jobs (thumbnail, title, completedAt).
- `GET /api/ai/youtube-to-thread/capabilities` — returns `{ providers: { deepgram: boolean, whisper: boolean } }`.

### Worker (`youtubeThreadProcessor` in `src/lib/queue/processors.ts`)

5-phase pipeline: download audio via yt-dlp → transcribe (Deepgram or Whisper, auto-cleanup of temp file in `finally`) → generate thread (OpenRouter + tone prompt) → moderation check → persist + `recordAiUsage()` for both transcription and generation costs. Error classification via 10-code regex classifier. Temp audio file always cleaned up in finally block.

### Plan Gates

- `canUseYoutubeToThread` — boolean gate (Free/Trial blocked).
- `checkYoutubeToThreadMonthlyDetailed` — counts `aiGenerations WHERE type='youtube_to_thread'` for current month. Limits: Free=0, Trial=0, Pro Monthly=30, Pro Annual=50, Agency=∞.
- `checkYoutubeVideoDurationDetailed` — per-plan duration cap. Pro=1200s (20 min), Agency=5400s (90 min). Fires after `getVideoInfo()`, before any download.
- New field: `maxYoutubeVideoDurationSeconds` in `PlanLimits` interface.

### UI

- Page: `/dashboard/ai/youtube-to-thread` with state machine (idle → queued → downloading → transcribing → generating → ready/failed).
- URL input with live preview (thumbnail + title + duration) before submit.
- Tone selector (5 options), provider dropdown (hides unconfigured options).
- AbortController polling with ±500ms jitter, 8s timeout, 5-minute max.
- Cancel with confirm dialog (quota released atomically).
- Ready state: thumbnail + "Watch on YouTube" link, tweet cards with char counter + copy, transcript collapsible, meta footer (duration · provider · language · elapsed time).
- Regenerate button, Recent jobs list (last 5).
- ARIA live region for screen readers during progress phases.
- RTL-aware (ArrowLeft with rtl:rotate-180).

### i18n

- New namespace `youtube_to_thread.*` (50+ keys in en.json/ar.json).
- `ai_history.type.youtube_to_thread` and `ai_history.type.transcription` — history page labels.

### Idempotency & Operations

- Same (userId, videoId) within 60s returns 409 with existingJobId.
- yt-dlp healthcheck at worker boot (logs yt_dlp_healthcheck_passed / yt_dlp_healthcheck_failed).
- 90-day TTL cleanup in billing-cleanup cron.
- AI history: `youtube_to_thread` and `transcription` types show translated labels and secondary badge in `/dashboard/ai/history`.

---

## 2026-05-06 — Documentation Audit & Sync

- **Doc/code drift fixed across 9 markdown files** — see `.claude/plans/2026-05-06-docs-audit-and-update.md` for full audit findings.
- **`.env.example` fully rewritten** to mirror `src/lib/env.ts` schema + all documented optional vars; aligned with `docker-compose.yml` defaults (`dev_user`/`dev_password`/port `5499`/`postgres_dev`).
- **README schema table updated**: added `pdfThreadJobs`; corrected migration count (0070+) and test count (34 files / 321 tests).
- **`docs/claude/scripts.md`** i18n key count refreshed (2,453 → 2,555); `db:reset` description corrected.
- **`docs/claude/env-vars.md`** added LinkedIn/Instagram/Sentry vars; flagged 8 vars currently unvalidated by `env.ts` (TODO).
- **`CLAUDE.md`** hard rule #2 tightened to clarify OpenAI moderation is not banned ("NOT OpenAI for text generation").
- **`ai-features.md`** added `POST /api/chat`, `GET /api/ai/image/quota`, `DELETE /api/ai/pdf-to-thread/[jobId]`, agentic regenerate detail.
- **`architecture.md`** added `dashboard/ai/pdf-to-thread` page and chat/image-quota routes.
- **`common-tasks.md`** replaced non-existent test paths with real ones (`thread`, `image`, `analytics-processor`).

---

## 2026-05-05 — PDF → Thread Feature

### Schema Changes

- New table: `pdfThreadJobs` (21 columns, 2 indexes) — tracks PDF processing lifecycle from upload through async generation
- New enum value: `"pdf_to_thread"` in `aiGenerationTypeEnum`

### Plan Limits

- New flag: `canUsePdfToThread` (Pro Monthly + Pro Annual + Agency)
- New gate: `checkPdfToThreadAccessDetailed`

### Queue

- New queue: `pdfThreadQueue`
- New processor: `pdfThreadProcessor` (2-pass chunked summarization: split → summarize chunks → combine into thread)
- Registered in `scripts/worker.ts` with concurrency 1, lockDuration 10 min

### AI

- New prompt variant: `"report"` in `src/lib/ai/summarize-prompts.ts` (`buildSummarizePrompt`)
- New input limits: `pdfReportBody` (30,000 chars), `pdfReportChunk` (12,000 chars)
- New prompt version: `pdf_to_thread:v1`

### Routes

- 4 new API routes under `/api/ai/pdf-to-thread/`: `upload`, `generate`, `enqueue`, `[jobId]`
- New page: `/dashboard/ai/pdf-to-thread` with 7 client components (state machine, dropzone, preview, attestation, options, progress, result)

### Dependencies

- New: `pdf-parse` v2 + `@types/pdf-parse`

---

## 2026-05-03 — Post-Implementation Audit & Bug Fixes

- **Regenerate quota leak (P1)**: `agentic/[id]/regenerate/route.ts` was bypassing `aiPreamble` and burning 1 unit instead of 5. Fixed by routing through `aiPreamble({ quotaWeight: 5 })`.
- **Dead 429 fallback code (P2)**: Removed unreachable try/catch blocks in `thread/route.ts` and `bio/route.ts` that tested `preamble.fallbackModel` (always `null` after Phase 3's OpenRouter native fallback).
- **Reply handle stripping (P4)**: `reply/route.ts` now strips `@mentions` from the tweet being replied to (P18 spec).
- **Test coverage gap**: 40 new tests across 3 previously-untested security/revenue-critical modules: `pii.test.ts` (11), `untrusted.test.ts` (19), `ai-quota-atomic.test.ts` (10).
- **`.env.example`**: All 50+ environment variables documented with comments and grouped by category.

## 2026-05-01–03 — AI Stack Phases 0–6 Complete

All 7 phases of the AI security, cost integrity, reliability, monetization, differentiation, and growth roadmap shipped (~8 weeks of work in ~3 days). See `.claude/plans/in-my-codebase-please-cosmic-crane-suggestions-claude.md` for full plan.

**Phase 0 — Stop the Bleeding:** Atomic quota counter (`userAiCounters` + `tryConsumeAiQuota`), affiliate generator gate, image tier env fix, input-token caps, daily cost alarm, reviewer model swap + threshold ≥7, chat system prompt, benefit-led 402 messages.

**Phase 1 — Trust & Safety Floor:** `wrapUntrusted()` + `JAILBREAK_GUARD` on all routes, PII redaction (`redactPII`), pre-publish content moderation, `data_collection: deny`, voice profile rendering, legacy delimiter migration, affiliate `#ad` enforcement.

**Phase 2 — Cost Integrity & Observability:** `aiGenerations` schema extended (model, subFeature, cost, promptVersion, feedback, latency, fallbackUsed), `recordAiUsage` refactored to options-object, `/admin/ai-cost` dashboard, correlation ID propagation, prompt versioning.

**Phase 3 — Reliability & Quality Engine:** OpenRouter-native Anthropic prompt caching, system/user message split on top-5 routes, native fallback chain (removed bespoke 429 handlers), `withRetry` + `withTimeout` + idempotency middleware, Replicate 90s poll cap, `streamObject` migration for template-generate + inspire.

**Phase 4 — Monetization Capture:** Agentic 5× quota weight, Pro Monthly 100→150 / Pro Annual 150→250, admin quota grant endpoint (`aiQuotaGrants`), AI tools gated for Free, refine endpoint + feedback UI, reply 3 typed / bio diversity, score tier labels, trial image cap (25 images, locked models), image model cost weighting, 402 usage anchor stats.

**Phase 5 — Premium Differentiators:** Voice variants (default/professional/casual), agentic Steps 3 & 5 streaming, trends inline Generate CTA, calendar bulk-schedule, server-side char-count enforcement (`fitTweet`/`splitThread`), centralized language blocks, hashtag banlist + MENA bias, few-shot examples, trends evidenceUrl, translate mode param, reply handle stripping.

**Phase 6 — Growth Engine:** Referral codes + credit tracking, "Made with AstraPost" footer + Pro opt-out, admin trial extension endpoint + bilingual Resend email, Enterprise marketing card on `/pricing`.

**Quality gate:** 34 test files, 321 tests, 0 lint errors, 0 type errors, 2,555 i18n keys matched (en/ar).

## 2026-04-25

- **AI Billing Fairness Audit**: Fixed three quota-tracking bugs: (1) Image usage was recorded only in status endpoint, not POST handler, to prevent double-counting on client retries. (2) Agentic images were bypassing quota gates — added `userId` parameter to `generateAgenticImage()` and calls `recordAiUsage()` in agentic-pipeline integration. (3) Agentic approve endpoint was incorrectly recording usage for a non-AI operation (DB+queue only) — removed `recordAiUsage()` call. Pattern: Use `recordAiUsage(userId, "image", ...)` for all image endpoints (standalone and agentic); avoid recording for metadata/approval operations.

## 2026-04-24

- **Agent Orchestration Improvements**: Convention-enforcer checklist updated with 3 missing rules (optional chaining depth, AbortController polling, viewer check must use ApiError.forbidden). Added 6 new orchestration patterns + Agent Decision Matrix to agent-orchestration.md. All 11 agent files now have "Do NOT use this agent when" + handoff guidance. Plan template created at `.claude/plans/TEMPLATE.md`. Cross-references added to 4 rule files. Quick Agent Selection table added to CLAUDE.md. New `docs-writer` Haiku agent added. Canonical posts route viewer check fixed to use `ApiError.forbidden()`.

## 2026-04-22

- **OG Image Route**: Created `src/app/og-image.png/route.tsx` (1200×630 branded image via `next/og`, edge runtime) — fixes 404 errors from bot crawlers.
- **Hydration Error #418**: Replaced `&apos;` HTML entities with plain apostrophes in `agentic-posting-client.tsx` and `not-found.tsx` to eliminate server-client HTML mismatches.

## 2026-04-11

- **Admin-Only Pages**: `/dashboard/jobs` and `/dashboard/ai/history` now restricted to admin users only. Sidebar hides these items for non-admins. Page-level `requireAdmin()` guard redirects non-admins to `/dashboard`. Uses existing `isAdmin` field on user table via Better Auth session.

## 2026-04-10

- **Billing Phase 6**: Shared IP rate limiting (`checkIpRateLimit()`), billing analytics admin page (`/admin/billing/analytics`), webhook retry monitoring with admin alerts, `subscriptions.plan` NOT NULL constraint, `plan_change_log` 1-year retention policy
- **Migration**: `drizzle/0043_odd_justin_hammer.sql` — generated, NOT YET APPLIED (subscriptions.plan NOT NULL + processedWebhookEvents retry tracking columns)
- **Billing Final Gaps**: `plan_change_log` audit table, grace period auto-enforcement cron, `subscriptions.trialEnd` persistence
- **Cron Infrastructure**: Vercel cron job at `/api/cron/billing-cleanup` (daily 2am UTC), `CRON_SECRET` env var
- **Migration**: `drizzle/0042_right_swarm.sql` — applied to dev and production
- **Post-review hardening**: `handleSubscriptionUpdated` plan change wrapped in `db.transaction()`, `handleInvoicePaymentFailed` now logs grace period trigger to `plan_change_log` (8 audit locations total)

## 2026-04-09

- **Billing Hardening**: 19 fixes across security, race conditions, error handling, rate limiting, accessibility (see billing-implementation-progress.md)

## 2026-04-08

- **AI Usage Double-Counting**: Added `ne(aiGenerations.type, "image")` to billing usage query
- **4 Untracked AI Endpoints**: Added `recordAiUsage()` to `/api/ai/inspiration`, `/api/user/voice-profile`, `/api/ai/agentic/[id]/regenerate`, `/api/chat`

## 2026-04-06

- **14-day Trial Unlimited Access Bug**: Replaced blanket `isTrialActive` bypass with `effectivePlan` resolution — trial users now get Pro Monthly limits
- **Pricing Page Misrepresentation**: Removed Instagram claims, fixed feature counts, corrected annual savings to 17%

## 2026-04-04–05

- **Compose Page UX Overhaul**: Extracted `AiToolsPanel`, accordion expand, unified `DateTimePicker`, progress bar for AI image generation, `beforeunload` guard for uploads

## 2026-03-31

- **Onboarding Infinite Loop**: Fixed `currentStep === 5` → `currentStep === steps.length`
- **Radix UI Hydration Mismatch**: Wrapped `NotificationBell`/`UserProfile` with `dynamic({ ssr: false })`

## 2026-03-14

- **X API Media Upload 403**: Migrated from deprecated v1.1 to v2 chunked upload endpoints, added `media.write` OAuth scope
- **AI Image 422 Error**: Changed from version hashes to model owner/name format for Replicate

## Known Issues

- TypeScript errors in `.next/dev/types/validator.ts` are auto-generated by Next.js 16 + Turbopack — not real code errors. Run `pnpm dev` to regenerate.
