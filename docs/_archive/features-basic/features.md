# AstraPost — Production Feature Roadmap

> **Purpose**: This document is a deep-review output of the entire AstraPost codebase. Every feature below was identified by reading actual source files — not guessing. Each item includes the exact gap found, the implementation approach, the files it touches, monetisation impact, and priority tier.
>
> **Legend**: 💰 Direct monetisation · 🔒 Security/compliance · ⚡ Performance/reliability · 🎨 UX/design · 🧪 Quality/testing · 🏗️ Architecture

---

## Table of Contents

1. [Executive Summary — Critical Bugs & Gaps](#executive-summary--critical-bugs--gaps)
2. [Code Quality & Architecture](#1-code-quality--architecture)
3. [Composer & Content Creation](#2-composer--content-creation)
4. [Scheduling & Calendar](#3-scheduling--calendar)
5. [Analytics & Reporting](#4-analytics--reporting)
6. [AI Features](#5-ai-features)
7. [Affiliate & Monetisation Engine](#6-affiliate--monetisation-engine)
8. [Billing & Subscription](#7-billing--subscription)
9. [Multi-Account & Team Collaboration](#8-multi-account--team-collaboration)
10. [Onboarding & Retention](#9-onboarding--retention)
11. [Notifications & Communication](#10-notifications--communication)
12. [Settings & Profile](#11-settings--profile)
13. [Security & Compliance](#12-security--compliance)
14. [Performance & Scalability](#13-performance--scalability)
15. [Marketing Site](#14-marketing-site)
16. [Infrastructure & Observability](#15-infrastructure--observability)
17. [Implementation Priority Matrix](#implementation-priority-matrix)

---

## Executive Summary — Critical Bugs & Gaps

After a thorough review of every source file — from the BullMQ processors to the Stripe webhook handler, from the Composer component to the analytics service — the following **bugs and critical gaps** were identified and must be fixed before any new features are added:

| #   | File                                                      | Bug                                                                                                                                                                         | Impact               |
| --- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| B1  | `src/app/dashboard/page.tsx` lines 37–40                  | Broken engagement-rate JOIN: `tweetAnalytics` is joined directly to `posts` but the correct path is `tweetAnalytics → tweets → posts`. Average engagement is always `null`. | Data accuracy        |
| B2  | `src/app/dashboard/ai/page.tsx` lines 36–39               | AI Writer reads `data.thread` but the API returns `data.tweets`. Output is always displayed as `{}`.                                                                        | Core feature broken  |
| B3  | `src/components/onboarding/onboarding-wizard.tsx` line 26 | `handleNext()` on final step navigates to `/dashboard` without calling any API to mark `onboardingCompleted = true`. Users see the wizard on every login.                   | Activation metric    |
| B4  | `src/app/dashboard/drafts/page.tsx` line 51               | Links to `/dashboard/compose?draft=${id}` but the Composer never reads this param. Clicking "Edit" opens a blank composer.                                                  | Core workflow broken |
| B5  | `src/app/(marketing)/pricing/page.tsx`                    | Plan limits are never enforced in any API route. Free users can use unlimited AI and scheduling.                                                                            | Revenue blocker      |
| B6  | All `/api/ai/*` routes                                    | No rate limiting on AI endpoints. A user can exhaust OpenRouter budget without restriction.                                                                                 | Cost/security        |
| B7  | `src/app/dashboard/page.tsx` lines 175–180                | Quick Compose card has a `<textarea>` and "Schedule" button that do nothing (static server component, no click handler).                                                    | UX dead end          |
| B8  | `src/components/dashboard/sidebar.tsx`                    | Sidebar is `fixed w-64` with no mobile breakpoint. On screens < md, it overlaps all content with no toggle.                                                                 | Mobile unusable      |

---

## 1. Code Quality & Architecture

### 1.1 Fix Broken Dashboard Engagement Rate JOIN 🧪 (Done)

**Gap**: `src/app/dashboard/page.tsx` lines 37–40 joins `tweetAnalytics` to `posts` directly.  
**Fix**:

```ts
db.select({ avg: sql<number>`avg(${tweetAnalytics.engagementRate})` })
  .from(tweetAnalytics)
  .innerJoin(tweets, eq(tweetAnalytics.tweetId, tweets.id))
  .innerJoin(posts, eq(tweets.postId, posts.id))
  .where(eq(posts.userId, userId));
```

**Files**: `src/app/dashboard/page.tsx` | **Effort**: XS | **Priority**: P0

---

### 1.2 Fix AI Writer Page Response Parsing 🧪 (Done)

**Gap**: `src/app/dashboard/ai/page.tsx` reads `data.thread` but `/api/ai/thread` returns `data.tweets`.  
**Fix**: Change `data.thread` → `data.tweets` in the AI Writer page. Also add `.join("\n\n---\n\n")` for readable output.  
**Files**: `src/app/dashboard/ai/page.tsx` | **Effort**: XS | **Priority**: P0

---

### 1.3 Fix Draft Editing (Round-trip from Drafts Page) 🎨 (Done)

**Gap**: Drafts link to `/dashboard/compose?draft=${post.id}` but the Composer ignores the `draft` param.  
**Fix**: Add `useSearchParams()` in the Composer. On mount, if `?draft=<postId>` present, fetch the post via new `GET /api/posts/:id` and hydrate `tweets` state. On submit, PATCH the existing post instead of creating a new one.  
**Files**: `src/components/composer/composer.tsx`, new `src/app/api/posts/[postId]/route.ts` | **Effort**: M | **Priority**: P0

---

### 1.4 Fix Onboarding Completion Persistence 🎨 (Done)

**Gap**: `onboardingCompleted` is never set to `true` in the DB.  
**Fix**: Add `await fetch("/api/user/onboarding-complete", { method: "POST" })` before `router.push("/dashboard")` in the wizard. Redirect back to wizard from `dashboard/layout.tsx` if `!onboardingCompleted`.  
**Files**: `src/components/onboarding/onboarding-wizard.tsx`, new `src/app/api/user/onboarding-complete/route.ts`, `src/app/dashboard/layout.tsx` | **Effort**: S | **Priority**: P0

---

### 1.5 Plan-Based Feature Gating 💰 🔒 (Done)

**Gap**: Zero enforcement of Free plan limits. Free users access unlimited AI and scheduling.  
**Implementation**: Create `src/lib/plan-limits.ts` (Free: 10 posts/month, 0 AI; Pro: unlimited). Create `src/lib/middleware/require-plan.ts` guard. Apply to all `/api/ai/*` routes and `/api/posts` scheduling action. Return `HTTP 402` with `{ error: "upgrade_required" }`. Show `<UpgradeModal>` on frontend for 402 responses.  
**Files**: `src/lib/plan-limits.ts` (new), `src/lib/middleware/require-plan.ts` (new), all `/api/ai/*`, `src/app/api/posts/route.ts`, new `src/components/ui/upgrade-modal.tsx` | **Effort**: M | **Priority**: P0 — Revenue blocker

---

### 1.6 Rate Limiting on All API Routes 🔒 ⚡ (Done)

**Gap**: No rate limiting on any route. AI endpoints hit OpenRouter (cost per call) without restriction.  
**Implementation**: `src/lib/rate-limiter.ts` backed by `ioredis` (already installed). Per-user sliding window: AI routes: 20 req/hr (Free) / 200 req/hr (Pro); post creation: 100 req/hr; media upload: 20 req/hr; auth routes: 5 req/15 min.  
**Files**: new `src/lib/rate-limiter.ts`, all `/api/ai/*`, `src/app/api/posts/route.ts`, `src/app/api/media/upload/route.ts` | **Effort**: M | **Priority**: P1

---

### 1.7 Input Sanitisation and Content Validation 🔒

**Gap**: Tweet content is not sanitised for XSS before DB insert. Media filenames not validated server-side.  
**Fix**: Add `.trim()` to all Zod text fields. Add `sanitizeTweetContent()` utility in `src/lib/utils.ts` (strip HTML tags). Validate media file extensions server-side in upload route.  
**Files**: `src/lib/utils.ts`, `src/app/api/posts/route.ts`, `src/app/api/media/upload/route.ts` | **Effort**: S | **Priority**: P1

---

### 1.8 Centralised Error Handling & Typed Job Data 🏗️ 🧪

**Gap**: Each API route has its own `try/catch` with inconsistent error shapes. `processors.ts` uses `any` casts extensively (`let post: any`, `(job.data as any)`, `(job.opts as any)`).  
**Fix**: Create `src/lib/api-helpers.ts` with `withAuth()` and `withErrorHandling()` HOFs. Standardise: `{ error: string, code: string, details?: unknown }`. Create `src/lib/queue/types.ts` with `ScheduleJobData` and `AnalyticsJobData` interfaces.  
**Files**: new `src/lib/api-helpers.ts`, new `src/lib/queue/types.ts`, `src/lib/queue/processors.ts`, all API routes | **Effort**: M | **Priority**: P2

---

## 2. Composer & Content Creation

### 2.1 Real-Time Tweet Preview with Actual User Avatar 🎨

**Gap**: `src/components/composer/composer.tsx` preview shows a grey placeholder and hardcoded "User Name / @handle". The user's X avatar and username are in `xAccounts`.  
**Fix**: Have `TargetAccountsSelect` return account details (avatar, username). Pass to `Composer` and render actual avatar in the preview panel.  
**Files**: `src/components/composer/target-accounts-select.tsx`, `src/components/composer/composer.tsx` | **Effort**: S | **Priority**: P2

---

### 2.2 Auto-Save Drafts (Every 30 Seconds) 🎨 ⚡

**Gap**: BRD specifies auto-save every 30s but it is not implemented. Content loss on refresh.  
**Implementation**: `useEffect` with `setInterval(30_000)` + `isDirty` flag in Composer. Auto-save calls PATCH on existing draft ID. Show subtle "Auto-saved" indicator. Store `draftId` in state for subsequent saves.  
**Files**: `src/components/composer/composer.tsx`, new `src/app/api/posts/[postId]/route.ts` (PATCH) | **Effort**: M | **Priority**: P2

---

### 2.3 URL-Aware Character Count (t.co 23-char normalisation) 🎨

**Gap**: `composer.tsx` line 316 uses `text.length`. Twitter normalises all URLs to 23 chars. Long URLs show false "over limit" warnings.  
**Fix**:

```ts
const twitterCharCount = (text: string) => {
  const urls = text.match(/https?:\/\/\S+/g) || [];
  return text.length + urls.reduce((s, u) => s + 23 - u.length, 0);
};
```

**Files**: `src/components/composer/composer.tsx`, `src/lib/utils.ts` | **Effort**: XS | **Priority**: P2

---

### 2.4 Drag-and-Drop Thread Reordering 🎨

**Gap**: Tweets can only be added/deleted, not reordered. BRD explicitly lists this as MVP.  
**Implementation**: `@dnd-kit/core` + `@dnd-kit/sortable` wrapping tweet cards. On drag end, update `tweets` array order.  
**Files**: `src/components/composer/composer.tsx`, `package.json` | **Effort**: M | **Priority**: P3

---

### 2.5 Emoji Picker 🎨

**Gap**: BRD lists emoji picker as MVP. Not implemented.  
**Implementation**: `emoji-mart` (tree-shakeable). Trigger via emoji button in `CardFooter`. Insert at cursor using `selectionStart`/`selectionEnd`.  
**Files**: `src/components/composer/composer.tsx`, `package.json` | **Effort**: S | **Priority**: P2

---

### 2.6 Link Preview Card 🎨

**Gap**: No URL unfurling in the composer preview. BRD lists this as MVP.  
**Implementation**: Detect URLs (debounced 500ms), call `/api/link-preview` which uses `cheerio` (already installed) to extract OG tags server-side. Render preview card in mobile preview column.  
**Files**: new `src/app/api/link-preview/route.ts`, `src/components/composer/composer.tsx` | **Effort**: M | **Priority**: P2

---

### 2.7 Content Templates Library 💰 🎨

**Gap**: No template system. Power users want to save re-usable thread structures.  
**Implementation**: New `templates` table (userId, title, tweetsJson, createdAt). "Save as Template" button in Composer. "Load Template" dialog in sidebar. Free: 3 templates; Pro: unlimited.  
**Schema**: New `templates` table | **Files**: `src/lib/schema.ts`, new `src/app/api/templates/route.ts`, new `src/app/dashboard/templates/page.tsx` | **Effort**: M | **Priority**: P3

---

### 2.8 Best-Time-to-Post Suggestions 💰 🎨

**Gap**: No intelligent scheduling assistance. Analytics data already exists to power this.  
**Implementation**: `src/lib/services/best-time.ts` queries `tweetAnalytics` grouped by hour-of-day/day-of-week. Expose as `GET /api/analytics/best-times`. Show top 3 clickable slots in Composer sidebar. Pro-only.  
**Files**: new `src/lib/services/best-time.ts`, new `src/app/api/analytics/best-times/route.ts`, `src/components/composer/composer.tsx` | **Effort**: M | **Priority**: P2

---

### 2.9 Quick Compose Widget — Functional (Dashboard) 🎨

**Gap**: Dashboard Quick Compose card is a static server component with a non-functional "Schedule" button.  
**Fix**: Extract `<QuickCompose>` as a client component. Submit to `POST /api/posts`. Keep it single-tweet only (link to full Compose for threads).  
**Files**: new `src/components/dashboard/quick-compose.tsx`, `src/app/dashboard/page.tsx` | **Effort**: S | **Priority**: P1

---

## 3. Scheduling & Calendar

### 3.1 Full Calendar View (Month/Week/Day) 🎨 💰

**Gap**: Calendar shows only next 7 days in a card list. No month view, no navigation, no click-to-create.  
**Implementation**: Extract `<CalendarGrid>` client component. Month/week/day toggle via URL param `?view=month&date=2026-03`. Clickable empty day cells pre-fill Compose page with selected date. Post count badges per day.  
**Files**: `src/app/dashboard/calendar/page.tsx`, new `src/components/calendar/calendar-grid.tsx`, new `src/components/calendar/calendar-controls.tsx` | **Effort**: L | **Priority**: P3

---

### 3.2 Drag-and-Drop Calendar Reschedule 🎨

**Gap**: Reschedule requires form input. Drag-to-reschedule is standard in competing tools.  
**Implementation**: Use `@dnd-kit` on calendar grid. On drop, call existing `PATCH /api/posts/[postId]/reschedule`.  
**Files**: `src/components/calendar/calendar-grid.tsx`, existing reschedule route | **Effort**: M | **Priority**: P3

---

### 3.3 Post Cancellation Endpoint 🎨 (Done)

**Gap**: `"cancelled"` status exists in schema but no UI or API to cancel a scheduled post.  
**Fix**: `PATCH /api/posts/:id` with `{ action: "cancel" }` — removes BullMQ job (`scheduleQueue.remove(postId)`) and sets status to `"cancelled"`. Add Cancel button to queue cards.  
**Files**: new `src/app/api/posts/[postId]/route.ts`, `src/app/dashboard/queue/page.tsx`, `src/lib/queue/client.ts` | **Effort**: S | **Priority**: P1

---

### 3.4 Recurring Post Scheduling 💰

**Gap**: No recurrence support. Daily motivational posts require manual creation each time.  
**Implementation**: Add `recurrence`, `recurrenceEnd` columns to `posts`. On publish success in processor, if recurrence set, enqueue next occurrence. Show recurrence badge in queue/calendar.  
**Schema**: Add columns to `posts` | **Files**: `src/lib/schema.ts`, `src/lib/queue/processors.ts`, `src/app/api/posts/route.ts` | **Effort**: L | **Priority**: P4

---

### 3.5 Bulk Scheduling (CSV Import) 💰

**Gap**: No bulk import. Agencies need to schedule many posts at once.  
**Implementation**: CSV upload (columns: `scheduled_at`, `content`, `thread_position`) via `/api/posts/bulk`. Validate all rows, show preview table before confirm. Pro/Agency only.  
**Files**: new `src/app/api/posts/bulk/route.ts`, new `src/app/dashboard/queue/import/page.tsx` | **Effort**: H | **Priority**: P3

---

### 3.6 Real-Time Queue Status (SSE) ⚡ 🎨

**Gap**: Queue page is static. Posts scheduled for "now" stay shown as "scheduled" until manual refresh.  
**Implementation**: Server-Sent Events endpoint `GET /api/posts/status-stream`. Client polls for active posts; updates badge on status change (`published` / `failed`) without full reload.  
**Files**: new `src/app/api/posts/status-stream/route.ts`, new `src/components/queue/live-queue-status.tsx`, `src/app/dashboard/queue/page.tsx` | **Effort**: M | **Priority**: P2

---

## 4. Analytics & Reporting

### 4.1 Interactive Charts with Recharts 🎨 💰

**Gap**: Analytics page uses raw `<div>` bars with inline `height` style. No axis labels, no tooltips, no values on hover, no legend. This is the most visually weak part of the app.  
**Implementation**: Install `recharts`. Replace raw bars with `<AreaChart>` (follower growth), `<BarChart>` (impressions), `<LineChart>` (engagement trend). Add proper tooltips and responsive containers.  
**Files**: `src/app/dashboard/analytics/page.tsx`, new `src/components/analytics/` chart components, `package.json` | **Effort**: M | **Priority**: P2

---

### 4.2 Date Range Picker (7d / 30d / 90d / Custom) 🎨

**Gap**: Ranges hard-coded as 14d impressions and 30d followers. No UI to change.  
**Implementation**: URL param `?range=7d|30d|90d`. Segmented control in page header. Custom range via shadcn date-range picker.  
**Files**: `src/app/dashboard/analytics/page.tsx`, new `src/components/analytics/date-range-selector.tsx` | **Effort**: S | **Priority**: P2

---

### 4.3 Per-Tweet Detailed Analytics Drawer 🎨

**Gap**: Clicking top tweets in analytics does nothing.  
**Implementation**: `<TweetAnalyticsDrawer>` (shadcn `Sheet`). Fetch snapshot history via `GET /api/analytics/tweet/:xTweetId`. Mini line chart of engagement over time. "Boost this" quick-compose button.  
**Files**: new `src/components/analytics/tweet-analytics-drawer.tsx`, new `src/app/api/analytics/tweet/[xTweetId]/route.ts` | **Effort**: M | **Priority**: P3

---

### 4.4 CSV and PDF Export 💰

**Gap**: Listed as Pro feature on pricing page but not implemented anywhere.  
**Implementation**: `GET /api/analytics/export?format=csv|pdf`. CSV: Node string serialisation of `tweetAnalytics + tweets`. PDF: `@react-pdf/renderer` with branded report. Pro-gated. Export button on analytics page.  
**Files**: new `src/app/api/analytics/export/route.ts`, new `src/components/analytics/export-button.tsx`, `package.json` | **Effort**: M | **Priority**: P3

---

### 4.5 Content Performance Score 💰 🎨

**Gap**: No aggregated quality metric per post.  
**Implementation**: Compute "Content Score" (0–100) per post: engagement rate + impressions relative to follower count + retweet rate. Display as badge on tweet cards in analytics. Power a "What's Working" summary block.  
**Files**: `src/lib/services/analytics.ts`, `src/app/dashboard/analytics/page.tsx` | **Effort**: M | **Priority**: P3

---

### 4.6 Competitor Benchmark Tracking (Agency) 💰

**Gap**: Only own-account analytics. Agencies need to compare against competitors.  
**Implementation**: Agency users add up to 5 public X handles. Use existing `client.getUser()` + `client.getFollowerCount()` to snapshot weekly. Store in new `benchmark_accounts` table. Comparison chart.  
**Schema**: New `benchmark_accounts` table | **Files**: new `src/app/dashboard/analytics/benchmarks/page.tsx`, `src/lib/services/analytics.ts` | **Effort**: H | **Priority**: P4

---

## 5. AI Features

### 5.1 AI Usage Tracking & Monthly Quota 💰 (Done)

**Gap**: `ai_generations` table exists with `tokensUsed` column but nothing writes to it. No quota enforcement.  
**Implementation**: After every AI endpoint success, insert into `ai_generations`. Create `src/lib/services/ai-quota.ts` to check monthly count. Free: 5 calls/month; Pro: unlimited. Show usage meter in sidebar ("AI Credits: 3/5 used").  
**Files**: all `/api/ai/*` routes, new `src/lib/services/ai-quota.ts`, `src/components/dashboard/sidebar.tsx`, new `src/app/api/user/ai-usage/route.ts` | **Effort**: M | **Priority**: P1

---

### 5.2 AI Content Inspiration Feed 💰 🎨

**Gap**: No content discovery tool. Users often don't know what to write.  
**Implementation**: `GET /api/ai/inspiration` (niche + language params). OpenRouter generates 5 trending topic suggestions + hook for each. Cache in Redis (TTL: 6h) to reduce cost. "Get Ideas" button in Compose sidebar.  
**Files**: new `src/app/api/ai/inspiration/route.ts`, new `src/components/composer/inspiration-panel.tsx` | **Effort**: M | **Priority**: P3

---

### 5.3 AI Viral Score Before Posting 💰 🎨

**Gap**: No pre-publish quality signal. Users have no idea if a tweet will perform.  
**Implementation**: `POST /api/ai/score` — returns `{ score: 72, reasons: ["Strong hook", "Missing CTA"] }`. Trigger debounced (2s pause). Show score badge in preview panel. Pro-only — free users see blurred badge with "Upgrade to unlock".  
**Files**: new `src/app/api/ai/score/route.ts`, new `src/components/composer/viral-score-badge.tsx`, `src/components/composer/composer.tsx` | **Effort**: M | **Priority**: P2

---

### 5.4 AI Writing Memory (User Voice Profile) 💰

**Gap**: Every AI generation starts from scratch with no knowledge of the user's style.  
**Implementation**: Add `voiceProfile` JSON column to `user` table. "Train My AI" section in Settings: paste 3–5 best tweets. Prepend voice profile to system prompt in all AI routes. Show "AI trained on your voice" badge.  
**Schema**: Add `voiceProfile jsonb` to `user` | **Files**: new `src/app/api/user/voice-profile/route.ts`, `src/app/dashboard/settings/page.tsx`, all `/api/ai/*` routes | **Effort**: L | **Priority**: P4

---

### 5.5 AI Hashtag Generator 🎨

**Gap**: No hashtag recommendation. Especially valuable for Arabic content where hashtag strategy differs.  
**Implementation**: "Suggest Hashtags" button in Composer footer. `POST /api/ai/hashtags` returns 5–10 ranked hashtags. One-click append respecting the 280-char limit.  
**Files**: new `src/app/api/ai/hashtags/route.ts`, `src/components/composer/composer.tsx` | **Effort**: S | **Priority**: P2

---

### 5.6 AI Generation History Page 💰 🎨

**Gap**: `aiGenerations` schema table exists but there is no UI to view past generations.  
**Implementation**: `/dashboard/ai/history` page. Searchable, filterable table of last 50 generations (type, language, date). "Re-use" button pre-fills Composer. Pro feature.  
**Files**: new `src/app/dashboard/ai/history/page.tsx` | **Effort**: M | **Priority**: P3

---

### 5.7 AI Content Calendar Suggestions 💰 🎨

**Gap**: No AI-powered scheduling suggestions leveraging existing analytics data.  
**Implementation**: "Generate Week Plan" button on calendar page. AI receives user's top-performing tweet patterns and suggests 5–7 topic ideas for the week with recommended posting times. Click a suggestion to open pre-filled Composer.  
**Files**: new `src/app/api/ai/calendar-plan/route.ts`, `src/app/dashboard/calendar/page.tsx` | **Effort**: H | **Priority**: P3

---

### 5.8 Multi-Language Expansion (Beyond AR/EN) 🎨 💰

**Gap**: Language selector only shows Arabic and English.  
**Implementation**: Add FR, ES, TR, DE, UR, HI to the language enum in Composer and AI routes. No infrastructure changes — just update the selector and AI prompt instructions.  
**Files**: `src/components/composer/composer.tsx`, all `/api/ai/*` routes | **Effort**: S | **Priority**: P2

---

## 6. Affiliate & Monetisation Engine

### 6.1 Affiliate Link History & Library 💰 🎨

**Gap**: `affiliateLinks` table exists but the Affiliate page shows no history.  
**Implementation**: Paginated "Recent Affiliates" table below the generator. Columns: productTitle, affiliateUrl, date, wasScheduled. "Schedule Tweet" button sends stored tweet to Composer.  
**Files**: `src/app/dashboard/affiliate/page.tsx`, new `src/app/api/affiliate/route.ts` (GET) | **Effort**: M | **Priority**: P2

---

### 6.2 Affiliate Click Tracking (Redirect Shortener) 💰

**Gap**: `affiliateLinks.wasScheduled` is a boolean but no click data is tracked.  
**Implementation**: `/go/:linkId` resolves to affiliate URL and records a click event in new `affiliate_clicks` table (linkId, ipHash, userAgent, clickedAt). Display click counts in affiliate history. Drives Agency plan value.  
**Schema**: New `affiliate_clicks` table | **Files**: new `src/app/go/[linkId]/route.ts`, `src/lib/schema.ts` | **Effort**: M | **Priority**: P3

---

### 6.3 Multi-Platform Affiliate Support (Noon, AliExpress) 💰

**Gap**: Only Amazon URLs are properly handled.  
**Implementation**: URL pattern matching for Noon, AliExpress, ClickBank, Commission Junction. Platform-specific tag injection. New `user_affiliate_tags` table (userId, platform, tag).  
**Schema**: New `user_affiliate_tags` table | **Effort**: M | **Priority**: P3

---

### 6.4 Batch Affiliate Campaign Scheduler 💰

**Gap**: Only one product at a time.  
**Implementation**: CSV paste or upload → generate + schedule tweets for all products at configurable intervals (e.g., every 2h). Pro/Agency plan.  
**Files**: new `src/app/dashboard/affiliate/campaign/page.tsx`, new `src/app/api/affiliate/batch/route.ts` | **Effort**: H | **Priority**: P4

---

## 7. Billing & Subscription

### 7.1 Annual Billing Toggle on Pricing Page 💰 🎨 (Done)

**Gap**: `pro_annual` and `agency_annual` plans are defined in the checkout API and env vars but not shown in the UI. Only a text note: "Contact sales for 20% off".  
**Fix**: Monthly/annual toggle at top of pricing cards. Annual shows 20% discounted rates with "Save 20%" badge. Toggle switches `plan` ID passed to checkout.  
**Files**: `src/app/(marketing)/pricing/page.tsx` | **Effort**: S | **Priority**: P1

---

### 7.2 In-App Upgrade Prompts (Contextual Upsell) 💰 🎨 (Done)

**Gap**: No upgrade prompts exist in the app.  
**Implementation**: Once plan gating (1.5) is in place: `<UpgradeModal>` for AI features on Free plan; banner in queue at 10 posts; blurred analytics sections with "Unlock with Pro" overlay.  
**Files**: new `src/components/ui/upgrade-modal.tsx`, new `src/components/ui/upgrade-banner.tsx`, all gated pages | **Effort**: M | **Priority**: P1

---

### 7.3 Stripe Customer Portal (Self-Service Billing) 💰 (Done)

**Gap**: Settings shows current plan but no way to manage subscription (cancel, update card, download invoices).  
**Implementation**: `POST /api/billing/portal` creates Stripe Customer Portal session and redirects. "Manage Subscription" button in Settings (when `stripeCustomerId` exists).  
**Files**: new `src/app/api/billing/portal/route.ts`, `src/app/dashboard/settings/page.tsx` | **Effort**: S | **Priority**: P1

---

### 7.4 Trial Period Enforcement & Countdown Banner 💰 (Done)

**Gap**: Landing page promises "14-day free trial" but there is no `trialEndsAt` in the schema or any enforcement.  
**Implementation**: Add `trialEndsAt timestamp` to `user`. Set on registration. Persistent top-banner counting down days remaining. When trial ends, gate Pro features with upgrade modal.  
**Schema**: Add `trialEndsAt` to `user` | **Files**: `src/lib/schema.ts`, `src/app/dashboard/layout.tsx`, new `src/components/ui/trial-banner.tsx` | **Effort**: M | **Priority**: P1

---

### 7.5 Plan Usage Indicators in Settings 💰 🎨 (Done)

**Gap**: Settings shows plan badge only. No usage data, no progress toward limits.  
**Implementation**: Progress bars: Posts this month (Free: 10 cap), X Accounts (Free: 1, Pro: 3), AI calls. Upgrade CTA when near limit.  
**Files**: `src/app/dashboard/settings/page.tsx`, new `src/app/api/billing/usage/route.ts` | **Effort**: M | **Priority**: P1

---

### 7.6 Referral Programme 💰

**Gap**: No referral system. Arabic creator communities are highly networked — referrals could be a major growth lever.  
**Implementation**: `referralCode` + `referredBy` on `user`. Referral link `/r/ABC123`. When referred user upgrades, both get 1 month free (Stripe coupon). `/dashboard/referral` page with stats.  
**Schema**: Add referral columns to `user` | **Files**: new `src/app/dashboard/referral/page.tsx`, new `src/app/api/referral/route.ts`, `src/app/api/billing/webhook/route.ts` | **Effort**: H | **Priority**: P4

---

### 7.7 Missing Stripe Webhook Events 🔒

**Gap**: Webhook only handles 3 events. Missing: `invoice.payment_failed` (dunning), `invoice.payment_succeeded` (renewal), `customer.subscription.trial_will_end`.  
**Fix**: Add handlers for all relevant events. For `payment_failed` → notification + email. For `trial_will_end` → conversion email 3 days before expiry.  
**Files**: `src/app/api/billing/webhook/route.ts` | **Effort**: S | **Priority**: P2

---

## 8. Multi-Account & Team Collaboration

### 8.1 Plan-Based X Account Limits 🔒 💰 (Done)

**Gap**: Multiple accounts are supported in the schema but no server-side limit enforcement (Free: 1, Pro: 3, Agency: 10).  
**Fix**: Check user plan and current `xAccounts` count before allowing new connection. Return `403` with upgrade prompt if at limit.  
**Files**: `src/app/api/x/accounts/route.ts` | **Effort**: S | **Priority**: P1

---

### 8.2 Team Members & Role-Based Access (Agency) 💰 🔒

**Gap**: Pricing page advertises "Team Members (Up to 5)" for Agency but there is zero implementation.  
**Implementation**: New `team_members` table (ownerId, memberId, role: owner/admin/editor/viewer, invitedAt, acceptedAt). Email invitation flow. RBAC middleware: editors compose/schedule, viewers read-only, admins manage accounts + billing.  
**Schema**: New `team_members` table | **Files**: `src/lib/schema.ts`, new `src/app/dashboard/settings/team/page.tsx`, new `src/app/api/team/*` | **Effort**: XL | **Priority**: P3

---

### 8.3 Post Approval Workflow (Agency) 💰

**Gap**: All posts go directly to scheduled. Agencies need editor → admin review.  
**Implementation**: `requiresApproval boolean` on posts. `"awaiting_approval"` status. Admin notification + approve/reject UI. Only approved posts enter BullMQ queue.  
**Schema**: Add `requiresApproval`, `approvedBy`, `approvedAt` to `posts` | **Effort**: H | **Priority**: P4

---

### 8.4 Mobile-Responsive Sidebar 🎨 (Done)

**Gap**: Sidebar is `fixed w-64` with no mobile handling. Overlaps all content on small screens.  
**Fix**: On `< md`: off-canvas `Sheet` (shadcn/ui) with hamburger toggle in layout header. `ml-64` offset on main content only for `md+`.  
**Files**: `src/components/dashboard/sidebar.tsx`, `src/app/dashboard/layout.tsx` | **Effort**: M | **Priority**: P1

---

## 9. Onboarding & Retention

### 9.1 Functional Onboarding Wizard Steps 🎨 (Done)

**Gap**: Steps 1–4 are decorative mockups. X OAuth never verifies completion. Compose step has a disconnected `<textarea>`.  
**Fix**: Step 1: Real OAuth redirect → return to `?step=2`, verify `xAccounts` in DB. Step 2: Real mini-Composer, saves draft. Step 3: Functional datetime picker. Step 4: Actual AI demo call. Mark `onboardingCompleted = true` on finish.  
**Files**: `src/components/onboarding/onboarding-wizard.tsx` | **Effort**: M | **Priority**: P1

---

### 9.2 In-App Setup Checklist on Dashboard 🎨

**Gap**: No first-run guidance on the dashboard.  
**Implementation**: Collapsible "Get Started" checklist card (localStorage dismissal): ☐ Connect X ☐ Schedule first tweet ☐ Try AI Writer ☐ Explore Analytics ☐ Upgrade to Pro. Dynamic completion checks.  
**Files**: new `src/components/dashboard/setup-checklist.tsx`, `src/app/dashboard/page.tsx` | **Effort**: S | **Priority**: P2

---

### 9.3 User Goal Setting During Onboarding 🎨

**Gap**: Onboarding collects no user intent. No personalisation based on role.  
**Implementation**: "What's your goal?" step: "Grow my audience" / "Promote my business" / "Earn with affiliates" / "Manage clients". Store in `userGoal` column on `user`. Use to personalise sidebar shortcuts and AI prompt defaults.  
**Schema**: Add `userGoal text` to `user` | **Files**: `src/components/onboarding/onboarding-wizard.tsx`, `src/app/dashboard/page.tsx` | **Effort**: M | **Priority**: P3

---

### 9.4 Contextual Empty States with Action CTAs 🎨

**Gap**: Empty states are plain text. Miss the opportunity to guide users.  
**Implementation**: Reusable `<EmptyState>` component with SVG illustration, headline, description, and primary action button.  
**Files**: new `src/components/ui/empty-state.tsx`, applied to queue, drafts, analytics, calendar, dashboard pages | **Effort**: S | **Priority**: P2

---

### 9.5 Keyboard Shortcuts 🎨

**Gap**: No keyboard shortcuts for core workflows.  
**Implementation**: `useKeyboardShortcuts` hook. `Cmd+N` → New Post; `Cmd+S` → Save Draft (in Composer); `Cmd+Enter` → Schedule/Post Now; `?` → shortcuts cheatsheet modal.  
**Files**: new `src/hooks/use-keyboard-shortcuts.ts`, `src/app/dashboard/layout.tsx`, `src/components/composer/composer.tsx` | **Effort**: M | **Priority**: P3

---

## 10. Notifications & Communication

### 10.1 In-App Notification Bell UI 🎨

**Gap**: `notifications` schema and relations are fully defined but there is **zero UI** for them anywhere.  
**Implementation**: Bell icon in dashboard header showing unread count badge. `GET /api/notifications` (paginated). `PATCH /api/notifications/:id` (mark read). Popover listing recent notifications.  
**Files**: new `src/app/api/notifications/route.ts`, `src/components/dashboard/sidebar.tsx`, new `src/components/ui/notification-bell.tsx` | **Effort**: M | **Priority**: P2

---

### 10.2 Post Failure Push + Email Notification 🔒 🎨

**Gap**: Failed posts appear in the Queue page only. No proactive alert.  
**Fix**: When `scheduleProcessor` reaches final failed attempt, insert `notification` row (type: `post_failed`) and send an email with the fail reason and a "Retry" deep link.  
**Files**: `src/lib/queue/processors.ts`, new `src/lib/services/email.ts` | **Effort**: M | **Priority**: P2

---

### 10.3 Welcome Email Sequence 🎨 💰

**Gap**: No welcome email on registration.  
**Implementation**: BullMQ job triggered on user creation: Day 0 welcome email (connect X CTA + feature highlights). Day 3 "tips" email if X not yet connected. Day 7 "how to grow" guide with pricing CTA.  
**Files**: `src/lib/auth.ts` (better-auth hooks), `src/lib/queue/processors.ts`, new `src/lib/services/email.ts` | **Effort**: M | **Priority**: P2

---

### 10.4 Monthly Analytics Digest Email 💰

**Gap**: BRD mentions monthly digest but nothing is implemented.  
**Implementation**: BullMQ cron job on 1st of month. For Pro/Agency: email analytics summary (top tweet, follower change, total impressions). For Free: include upgrade CTA comparing their metrics to Pro features.  
**Files**: `src/lib/queue/processors.ts`, `scripts/worker.ts`, new `src/lib/services/email.ts` | **Effort**: M | **Priority**: P4

---

## 11. Settings & Profile

### 11.1 Edit Profile (Name, Timezone, Language) 🎨

**Gap**: Settings displays name and email as read-only text. `user.timezone` and `user.language` exist in the schema but there is no form to edit them. Timezone affects scheduling accuracy directly.  
**Fix**: Editable profile card: name input, timezone searchable dropdown (`Intl.supportedValuesOf('timeZone')`), language select. Submit to `PATCH /api/user/profile`.  
**Files**: `src/app/dashboard/settings/page.tsx`, new `src/app/api/user/profile/route.ts` | **Effort**: S | **Priority**: P2

---

### 11.2 Avatar Upload 🎨

**Gap**: User avatar from OAuth only. No way to update it.  
**Fix**: Avatar upload button in profile card → `/api/media/upload` (already exists) → `PATCH /api/user/profile` updates `user.image`.  
**Files**: `src/app/dashboard/settings/page.tsx`, `src/app/api/media/upload/route.ts` | **Effort**: S | **Priority**: P3

---

### 11.3 Two-Factor Authentication (2FA) 🔒

**Gap**: Email/password only. No 2FA. Table-stakes for B2B users.  
**Implementation**: `better-auth`'s built-in 2FA TOTP plugin. QR code setup in Security settings. Require 2FA on next login once enabled.  
**Files**: `src/lib/auth.ts`, `src/app/dashboard/settings/page.tsx` | **Effort**: M | **Priority**: P3

---

### 11.4 API Key Management (Developer Access) 💰

**Gap**: No public API or developer access tier.  
**Implementation**: "Developer" section in Settings (Agency plan). Generate personal API key. Keys hashed in new `api_keys` table. `/api/v1/*` endpoints accept `Authorization: Bearer <key>`. Opens B2B/developer market.  
**Schema**: New `api_keys` table | **Effort**: XL | **Priority**: P4

---

### 11.5 GDPR — Data Export & Account Deletion 🔒

**Gap**: BRD mentions GDPR compliance but only cascade FK deletes exist. No data export or self-service deletion.  
**Implementation**: `GET /api/user/data-export` → ZIP of all user data as JSON. `DELETE /api/user/account` → hard delete all data + cancel Stripe subscription. "Danger Zone" section in Settings.  
**Files**: new `src/app/api/user/data-export/route.ts`, `src/app/dashboard/settings/page.tsx` | **Effort**: M | **Priority**: P3

---

## 12. Security & Compliance

### 12.1 Idempotency Keys on Post Creation 🔒

**Gap**: Double-click "Schedule Post" on slow network creates two identical posts.  
**Fix**: Accept `Idempotency-Key` header. Cache responses in Redis for 24h keyed by `userId:idempotency-key`.  
**Files**: `src/app/api/posts/route.ts`, new `src/lib/idempotency.ts`, `src/components/composer/composer.tsx` | **Effort**: M | **Priority**: P2

---

### 12.2 CSRF Protection Audit 🔒

**Gap**: API routes use `getSession` for auth but do not validate `Origin` or use CSRF tokens explicitly.  
**Fix**: Ensure `better-auth` CSRF protection is enabled in `src/lib/auth.ts`. Add `Origin` check middleware for all state-mutating routes.  
**Files**: `src/lib/auth.ts`, new `src/middleware.ts` | **Effort**: S | **Priority**: P1

---

### 12.3 Audit Log for Security Events 🔒

**Gap**: No audit trail for sensitive actions (token rotation, plan changes, team member additions, login).  
**Implementation**: New `audit_logs` table (userId, action, targetId, metadata, ipAddress, createdAt). Write entries for: login, plan change, X account connect/disconnect, token rotation, team invite.  
**Schema**: New `audit_logs` table | **Effort**: M | **Priority**: P3

---

### 12.4 Token Expiry Health Check & Reconnect Warning ⚡ 🔒

**Gap**: Token refresh exists in `XApiService` but if refresh fails the error is silently swallowed until the post fails at publish time.  
**Implementation**: Daily cron job tests all active X account tokens. Failed → set `isActive = false`, write notification. Dashboard banner: "Your X account @handle needs to be reconnected" with a Reconnect button.  
**Files**: `src/lib/queue/processors.ts`, new `src/components/dashboard/token-warning-banner.tsx`, `src/app/dashboard/layout.tsx` | **Effort**: M | **Priority**: P2

---

## 13. Performance & Scalability

### 13.1 Database Query N+1 Prevention ⚡

**Gap**: `analytics/page.tsx` — snapshots query fetches all rows and groups in JS (should use SQL `GROUP BY`). `queue/page.tsx` — two separate queries for scheduled + failed can be combined with `status IN (...)`.  
**Fix**: Refactor to SQL aggregation. Add missing indexes: `posts.updatedAt`, `ai_generations.(userId, createdAt)`.  
**Files**: `src/app/dashboard/analytics/page.tsx`, `src/app/dashboard/queue/page.tsx`, `src/lib/schema.ts` (add indexes) | **Effort**: M | **Priority**: P2

---

### 13.2 Redis Caching for Expensive Queries ⚡

**Gap**: Analytics queries run on every page load with no caching.  
**Implementation**: `src/lib/cache.ts` using `ioredis`. Cache analytics aggregations (5 min per userId + accountId + range), best-times (1h), AI inspiration (6h). Invalidate on new post published.  
**Files**: new `src/lib/cache.ts`, `src/app/dashboard/analytics/page.tsx`, relevant API routes | **Effort**: M | **Priority**: P3

---

### 13.3 Image Optimisation for Media Uploads ⚡

**Gap**: Media files stored as-is. No compression before X API upload or CDN storage.  
**Implementation**: Use `sharp` in upload handler: resize to max 1200px, convert to WebP 85%, strip EXIF data for privacy.  
**Files**: `src/app/api/media/upload/route.ts`, `package.json` | **Effort**: M | **Priority**: P3

---

### 13.4 Next.js Streaming & Suspense for Dashboard ⚡ 🎨

**Gap**: Dashboard is a single async Server Component. All 5 DB queries must complete before any UI renders.  
**Fix**: Wrap each metric card in `<Suspense fallback={<Skeleton />}>` as individual streaming Server Components. Page shell renders instantly.  
**Files**: `src/app/dashboard/page.tsx`, `src/app/dashboard/loading.tsx` | **Effort**: M | **Priority**: P3

---

### 13.5 React Query for Client-Side Data Fetching ⚡

**Gap**: Client components use raw `fetch` with no caching, no stale-while-revalidate, no optimistic updates.  
**Implementation**: Add `@tanstack/react-query`. Automatic request deduplication, background refetch on focus, optimistic updates for post status changes.  
**Files**: `package.json`, `src/app/layout.tsx` (add `QueryClientProvider`), refactor Affiliate + AI Writer + queue client pages | **Effort**: L | **Priority**: P4

---

### 15.6 Redis Persistence Configuration ⚡ 🔒 (Done)

**Gap**: `docker-compose.yml` uses `redis:alpine` with no persistence. Redis restart = all pending BullMQ jobs lost.  
**Fix**: Add `--appendonly yes` (AOF) to Redis config. Mount a volume for Redis data.  
**Files**: `docker-compose.yml` | **Effort**: XS | **Priority**: P1

---

## 14. Marketing Site

### 14.1 Social Proof & Testimonials Section 💰 🎨

**Gap**: Landing page says "Join thousands of creators" but shows no proof.  
**Implementation**: 3–5 testimonial quotes with avatar + @handle. Live signup count from `SELECT COUNT(*) FROM user`. "Featured in" logo strip.  
**Files**: `src/app/page.tsx` | **Effort**: S | **Priority**: P2

---

### 14.2 MDX Blog with SEO Content 💰 🎨

**Gap**: `/blog` is a static placeholder. Content marketing is critical for organic MENA acquisition.  
**Implementation**: Set up `next-mdx-remote` or Contentlayer for MDX posts in `/content/blog/`. Arabic-language posts on X growth tips, scheduling strategy, affiliate marketing.  
**Files**: `src/app/(marketing)/blog/page.tsx`, new `/content/blog/*.mdx` | **Effort**: M | **Priority**: P3

---

### 14.3 Populate Changelog, Docs, Community Pages 🎨

**Gap**: These routes exist but render placeholder content.  
**Implementation**: Changelog: version history JSON in `/public/data/`. Docs: static MDX-based pages. Community: link to Discord/Twitter. Resources: curated links.  
**Files**: `src/app/(marketing)/changelog/page.tsx`, `docs/page.tsx`, `community/page.tsx`, `resources/page.tsx` | **Effort**: M | **Priority**: P3

---

### 14.4 SEO Metadata & Open Graph Tags 🎨

**Gap**: Root layout has `title: "AstraPost"` with no description, no OG image, no Twitter card meta, no structured data.  
**Implementation**: `generateMetadata()` exports for each marketing page. `/public/og-image.png`. `<script type="application/ld+json">` for product schema. Review `robots.ts` and `sitemap.ts` for completeness.  
**Files**: `src/app/layout.tsx`, each `(marketing)` page, `src/app/robots.ts`, `src/app/sitemap.ts` | **Effort**: M | **Priority**: P2

---

## 15. Infrastructure & Observability

### 15.1 Sentry Integration for Error Tracking ⚡ (Done)

**Gap**: No error tracking service. Silent failures in worker are invisible.  
**Implementation**: `@sentry/nextjs`. Capture unhandled rejections in worker, API route errors, React errors via `error.tsx`. Add `user` context to Sentry scope on auth.  
**Files**: new `sentry.client.config.ts`, `sentry.server.config.ts`, `next.config.ts` | **Effort**: S | **Priority**: P1

---

### 15.2 Structured Logging & Remove console.\* Calls 🏗️

**Gap**: `console.error` and `console.log` are scattered throughout the codebase alongside the existing `logger` utility.  
**Fix**: Replace all `console.*` with `logger.*`. Add log levels (debug/info/warn/error). Emit JSON-structured logs in production compatible with Datadog/Logtail.  
**Files**: `src/lib/logger.ts`, all `src/app/api/*`, `src/lib/queue/processors.ts` | **Effort**: S | **Priority**: P2

---

### 15.3 Admin Dashboard 🏗️ 💰

**Gap**: BRD mentions admin dashboard (user management, MRR, API usage) but nothing is implemented.  
**Implementation**: Gated by `isAdmin boolean` on `user`. Pages: `/admin/users` (table, plan, dates, suspend/impersonate), `/admin/metrics` (MRR chart, signups/day, churn rate), `/admin/jobs` (global BullMQ monitor).  
**Schema**: Add `isAdmin boolean` to `user` | **Effort**: H | **Priority**: P3

---

### 15.4 BullMQ Dashboard (Bull Board) ⚡

**Gap**: No live queue introspection beyond the basic `jobs` page.  
**Implementation**: Mount `@bull-board/nextjs` at `/admin/queues` (admin-only). Real-time queue depth, job details, retry controls, dead-letter inspection.  
**Files**: new `src/app/admin/queues/` | **Effort**: S | **Priority**: P3

---

### 15.5 CI/CD Enhancements 🧪 🏗️

**Gap**: CI runs lint, typecheck, build — but no test step, no security audit, no deployment.  
**Implementation**: Add `pnpm test` to CI. Add `pnpm audit --audit-level=high` security step. Add deploy job (Vercel CLI) conditional on `main` branch. Cache `node_modules` and build artefacts.  
**Files**: `.github/workflows/ci.yml` | **Effort**: M | **Priority**: P2

---

### 15.6 Expand Test Coverage 🧪

**Gap**: Test files exist (`bullmq.test.ts`, `analytics.test.ts`, `x-api.test.ts`) but coverage is likely low.  
**Implementation**: Unit tests for `processors.ts` (mock XApiService + db), `token-encryption.ts` (round-trip), `api/posts` (schema validation). E2E Playwright tests for: register → onboarding → compose → schedule; checkout flow; analytics page. Aim for 80%+ coverage on `src/lib/*`.  
**Files**: `src/lib/queue/bullmq.test.ts`, new `src/lib/queue/processors.test.ts`, new `tests/e2e/*.spec.ts` | **Effort**: H | **Priority**: P3

---

### 15.7 Environment Variable Validation on Boot 🔒 (Done)

**Gap**: `checkEnv()` exists in `src/lib/env.ts` but is never called automatically. Missing vars cause cryptic runtime errors.  
**Fix**: Call `checkEnv()` in `next.config.ts` or `instrumentation.ts` so the server fails fast with a clear message on startup.  
**Files**: `next.config.ts`, `src/lib/env.ts` | **Effort**: XS | **Priority**: P1

---

## Implementation Priority Matrix

| Priority | ID   | Feature                                        | Effort | Revenue Impact | UX Impact |
| -------- | ---- | ---------------------------------------------- | ------ | -------------- | --------- | ------ |
| **P0**   | B1   | Fix dashboard engagement rate JOIN             | XS     | —              | High      |
| **P0**   | B2   | Fix AI Writer response parsing (`data.tweets`) | XS     | —              | High      |
| **P0**   | B3   | Fix onboarding completion persistence          | S      | —              | High      |
| **P0**   | B4   | Fix draft editing in Composer                  | M      | —              | High      |
| **P0**   | 1.5  | Plan-based feature gating                      | M      | Critical       | Medium    |
| **P1**   | 7.1  | Annual billing toggle on pricing               | S      | Critical       | Low       |
| **P1**   | 7.3  | Stripe Customer Portal                         | S      | High           | High      |
| **P1**   | 7.4  | Trial period enforcement                       | M      | Critical       | Medium    |
| **P1**   | 7.5  | Plan usage indicators                          | M      | Very High      | High      |
| **P1**   | 8.1  | X account plan limits                          | S      | Very High      | Low       |
| **P1**   | 5.1  | AI usage tracking & quota                      | M      | Critical       | Medium    |
| **P1**   | 7.2  | In-app upgrade prompts                         | M      | Critical       | Medium    |
| **P1**   | 3.3  | Post cancellation endpoint                     | S      | —              | High      |
| **P1**   | 9.1  | Functional onboarding wizard                   | M      | High           | High      |
| **P1**   | 8.4  | Mobile-responsive sidebar                      | M      | —              | High      |
| **P1**   | 1.6  | Rate limiting on API routes                    | M      | High           | —         |
| **P1**   | 15.1 | Sentry error tracking                          | S      | —              | High      | (Done) |
| **P1**   | 15.6 | Redis persistence (AOF)                        | XS     | —              | High      | (Done) |
| **P1**   | 15.7 | Env validation on boot                         | XS     | —              | Medium    | (Done) |
| **P2**   | 2.9  | Functional Quick Compose widget                | S      | —              | High      |
| **P2**   | 2.1  | Real tweet preview with avatar                 | S      | —              | High      |
| **P2**   | 2.3  | URL-aware character count                      | XS     | —              | Medium    |
| **P2**   | 2.5  | Emoji picker                                   | S      | —              | Medium    |
| **P2**   | 2.6  | Link preview card                              | M      | —              | High      |
| **P2**   | 2.8  | Best-time-to-post suggestions                  | M      | High           | High      |
| **P2**   | 4.1  | Recharts analytics charts                      | M      | High           | High      |
| **P2**   | 4.2  | Date range picker                              | S      | Medium         | High      |
| **P2**   | 5.3  | AI Viral Score badge                           | M      | High           | High      |
| **P2**   | 5.5  | AI hashtag generator                           | S      | Medium         | High      |
| **P2**   | 5.8  | Multi-language expansion                       | S      | High           | Medium    |
| **P2**   | 6.1  | Affiliate link history                         | M      | High           | High      |
| **P2**   | 7.7  | Missing Stripe webhook events                  | S      | High           | —         |
| **P2**   | 10.1 | Notification bell UI                           | M      | —              | High      |
| **P2**   | 10.2 | Post failure notification + email              | M      | —              | High      |
| **P2**   | 10.3 | Welcome email sequence                         | M      | High           | Medium    |
| **P2**   | 11.1 | Edit profile / timezone                        | S      | —              | High      |
| **P2**   | 12.1 | Idempotency keys                               | M      | —              | Medium    |
| **P2**   | 12.2 | CSRF protection audit                          | S      | —              | —         |
| **P2**   | 12.4 | Token expiry health check                      | M      | —              | High      |
| **P2**   | 13.1 | DB query N+1 fixes                             | M      | —              | Medium    |
| **P2**   | 14.1 | Social proof section                           | S      | High           | Medium    |
| **P2**   | 14.4 | SEO metadata + OG tags                         | M      | High           | Medium    |
| **P2**   | 15.2 | Structured logging                             | S      | —              | Medium    |
| **P2**   | 15.5 | CI/CD test + audit steps                       | M      | —              | High      |
| **P2**   | 9.2  | Setup checklist on dashboard                   | S      | —              | High      |
| **P2**   | 9.4  | Contextual empty states                        | S      | —              | High      |
| **P3**   | 2.2  | Auto-save drafts                               | M      | —              | High      |
| **P3**   | 2.4  | Drag-and-drop thread reorder                   | M      | —              | Medium    |
| **P3**   | 2.7  | Content templates library                      | M      | High           | High      |
| **P3**   | 3.1  | Full calendar view (month/week)                | L      | Medium         | High      |
| **P3**   | 3.2  | Drag-to-reschedule on calendar                 | M      | —              | High      |
| **P3**   | 3.5  | CSV bulk scheduling import                     | H      | High           | Medium    |
| **P3**   | 4.3  | Per-tweet analytics drawer                     | M      | Medium         | High      |
| **P3**   | 4.4  | CSV / PDF export                               | M      | High           | Medium    |
| **P3**   | 4.5  | Content performance score                      | M      | Medium         | High      |
| **P3**   | 5.2  | AI inspiration feed                            | M      | Medium         | High      |
| **P3**   | 5.6  | AI generation history page                     | M      | Medium         | Medium    |
| **P3**   | 5.7  | AI content calendar suggestions                | H      | High           | High      |
| **P3**   | 6.2  | Affiliate click tracking                       | M      | Very High      | Medium    |
| **P3**   | 6.3  | Multi-platform affiliate support               | M      | High           | Medium    |
| **P3**   | 8.2  | Team members & RBAC                            | XL     | Critical       | Medium    |
| **P3**   | 9.3  | User goal setting                              | M      | Medium         | High      |
| **P3**   | 9.5  | Keyboard shortcuts                             | M      | —              | Medium    |
| **P3**   | 11.3 | 2FA authentication                             | M      | Medium         | —         |
| **P3**   | 11.5 | GDPR data export & deletion                    | M      | —              | Medium    |
| **P3**   | 12.3 | Audit log                                      | M      | —              | Low       |
| **P3**   | 13.2 | Redis query caching                            | M      | —              | Medium    |
| **P3**   | 13.3 | Image optimisation (sharp)                     | M      | —              | Medium    |
| **P3**   | 13.4 | Streaming Suspense dashboard                   | M      | —              | High      |
| **P3**   | 14.2 | MDX blog                                       | M      | Very High      | —         |
| **P3**   | 14.3 | Changelog / docs / community                   | M      | Medium         | Medium    |
| **P3**   | 15.3 | Admin dashboard                                | H      | High           | High      |
| **P3**   | 15.4 | BullMQ Bull Board                              | S      | —              | High      |
| **P3**   | 15.6 | Expand test coverage (unit + E2E)              | H      | —              | High      |
| **P4**   | 3.4  | Recurring post scheduling                      | L      | Medium         | High      |
| **P4**   | 3.6  | Real-time queue SSE                            | M      | —              | High      |
| **P4**   | 4.6  | Competitor benchmark tracking                  | H      | High           | —         |
| **P4**   | 5.4  | AI writing memory / voice profile              | L      | High           | High      |
| **P4**   | 6.4  | Batch affiliate campaign                       | H      | Very High      | High      |
| **P4**   | 7.6  | Referral programme                             | H      | High           | Low       |
| **P4**   | 8.3  | Post approval workflow                         | H      | High           | Medium    |
| **P4**   | 10.4 | Monthly analytics digest email                 | M      | Medium         | Medium    |
| **P4**   | 11.2 | Avatar upload                                  | S      | —              | Medium    |
| **P4**   | 11.4 | API key management                             | XL     | High           | —         |
| **P4**   | 13.5 | React Query client data layer                  | L      | —              | Medium    |

---

## Estimated Revenue Impact (12-Month Projection)

| Feature Group                            | Mechanism                          | Incremental MRR Estimate |
| ---------------------------------------- | ---------------------------------- | ------------------------ |
| Plan gating + upgrade prompts (1.5, 7.2) | Convert trial users hitting limits | +$4,000–$12,000          |
| Annual billing toggle (7.1)              | Improve LTV by 20% on conversions  | +$2,000–$6,000           |
| Trial enforcement + countdown (7.4)      | Convert time-limited free users    | +$3,000–$8,000           |
| AI usage metering (5.1)                  | Drive free → Pro at quota limit    | +$4,000–$10,000          |
| Stripe billing portal (7.3)              | Reduce churn (-5–10%)              | -5% churn                |
| Team collaboration (8.2)                 | Unlock Agency plan at $99/mo       | +$5,000–$15,000          |
| Affiliate click tracking (6.2)           | Justify Pro/Agency upgrade         | +$1,000–$3,000           |
| Best-time suggestions (2.8)              | Flagship Pro differentiator        | +$2,000–$6,000           |
| MDX Blog / SEO (14.2)                    | Organic acquisition                | +500–2,000 users/year    |
| Viral Score badge (5.3)                  | Visible in-composer Pro value      | +$2,000–$5,000           |

---

_Document version: 2.0 — March 2026_  
_Based on full codebase audit of AstraPost (branch: genspark_ai_developer)_  
_Next review: after P0 and P1 items are shipped_
