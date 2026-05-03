# Recent Fixes & Changes

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

**Quality gate:** 31 test files, 280 tests, 0 lint errors, 0 type errors, 2,453 i18n keys matched (en/ar).

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
