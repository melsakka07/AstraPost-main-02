# AstraPost AI Feature Proposals — 2026-07-15

**Status:** Research & Ideation (no code written)
**Author:** AI Engineering Strategy
**Grounded in:** Full codebase audit of 25 existing AI features, 46 API routes, service catalog (78 services × 5 plans), X API cost model, and billing infrastructure

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State — Complete AI Feature Inventory](#current-state--complete-ai-feature-inventory)
3. [AI Infrastructure Stack](#ai-infrastructure-stack)
4. [Constraints Every Proposal Must Respect](#constraints-every-proposal-must-respect)
5. [Proposed Features](#proposed-features)
6. [Prioritized Ranking](#prioritized-ranking)
7. [Quick Wins](#quick-wins)
8. [Single Strongest Recommendation](#single-strongest-recommendation)

---

## Executive Summary

AstraPost ships **25 AI features** across 46 API routes, powered by OpenRouter (text) + Replicate (images), with mature infrastructure: atomic dual-quota system, aiPreamble() gatekeeping, BullMQ async processing, SSE streaming agentic pipeline, content moderation, and X API cost metering (Phase 1 observe).

**The gap:** nearly all features are **content generation** tools (write this, translate that, summarize X). AstraPost has almost no **analytics-intelligence** features, no **dialect-awareness**, no **predictive/ML** capabilities, and limited **seasonal/cultural** tooling for its core MENA market. The moat is under-exploited.

**This document proposes 12 new AI features** — prioritized by (impact ÷ effort) — that fill these gaps while respecting X API cost constraints, reusing existing infrastructure, and targeting specific plan-tier upgrade motivations.

**Top recommendation:** Build the **MENA Trend Prediction Engine** first — it's the highest (impact ÷ effort) ratio: extends the existing Discovery Hub, costs zero additional X API calls, has strong MENA-moat differentiation, and creates a clear Pro → Agency upgrade path.

---

## Current State — Complete AI Feature Inventory

### All 25 AI Features (grouped by category)

| #   | Feature                                         | Type  | Model/Provider                           | Plan Gate             | Quota Weight | API Route                     |
| --- | ----------------------------------------------- | ----- | ---------------------------------------- | --------------------- | ------------ | ----------------------------- |
|     | **Core Text Generation (Free-tier accessible)** |       |                                          |                       |              |                               |
| 1   | Thread Writer                                   | text  | OPENROUTER_MODEL                         | canUseAi              | 1            | `/api/ai/thread`              |
| 2   | Translation                                     | text  | OPENROUTER_MODEL                         | canUseAi              | 1            | `/api/ai/translate`           |
| 3   | Hashtag Generator                               | text  | OPENROUTER_MODEL                         | canUseAi              | 1            | `/api/ai/hashtags`            |
| 4   | Refine Text                                     | text  | OPENROUTER_MODEL                         | canUseAi              | 1            | `/api/ai/refine`              |
| 5   | Topic Enhancer                                  | text  | OPENROUTER_MODEL_FREE → OPENROUTER_MODEL | canUseAi              | 1            | `/api/ai/enhance-topic`       |
| 6   | Template Fill                                   | text  | OPENROUTER_MODEL                         | canUseAi              | 1            | `/api/ai/template-generate`   |
| 7   | AI Chat                                         | text  | OPENROUTER_MODEL                         | canUseAi              | 1            | `/api/chat`                   |
| 8   | Content Inspiration                             | text  | OPENROUTER_MODEL                         | inspiration           | 1            | `/api/ai/inspire`             |
| 9   | Trending Topics                                 | text  | OPENROUTER_MODEL_TRENDS → fallback chain | canUseAi              | 0 (skip)     | `/api/ai/trends`              |
| 10  | Niche Inspiration                               | text  | OPENROUTER_MODEL                         | inspiration           | 1            | `/api/ai/inspiration`         |
|     | **Pro-Gated Text Generation**                   |       |                                          |                       |              |                               |
| 11  | Writing Tools (Hook/CTA/Rewrite)                | text  | OPENROUTER_MODEL                         | tools                 | 1            | `/api/ai/tools`               |
| 12  | A/B Variants                                    | text  | OPENROUTER_MODEL                         | variant_generator     | 1            | `/api/ai/variants`            |
| 13  | Reply Generator                                 | text  | OPENROUTER_MODEL                         | reply_generator       | 1            | `/api/ai/reply`               |
| 14  | Bio Optimizer                                   | text  | OPENROUTER_MODEL                         | bio_optimizer         | 1            | `/api/ai/bio`                 |
| 15  | Affiliate Tweets                                | text  | OPENROUTER_MODEL                         | affiliate_generator   | 1            | `/api/ai/affiliate`           |
| 16  | Content Calendar                                | text  | OPENROUTER_MODEL                         | content_calendar      | 1            | `/api/ai/calendar`            |
| 17  | URL-to-Thread                                   | text  | OPENROUTER_MODEL                         | url_to_thread         | 1            | `/api/ai/summarize`           |
| 18  | Viral Score                                     | text  | OPENROUTER_MODEL                         | viral_score           | 0 (skip)     | `/api/ai/score`               |
|     | **Image Generation**                            |       |                                          |                       |              |                               |
| 19  | Image Generation                                | image | Replicate (4 models)                     | image (model-gated)   | 1-5 (model)  | `/api/ai/image`               |
| 20  | Thread First Image                              | image | Replicate (nano-banana)                  | pdf/youtube_to_thread | 1            | `/api/ai/thread-first-image`  |
|     | **Heavy Features (quotaWeight: 5)**             |       |                                          |                       |              |                               |
| 21  | Agentic Posting (5-step pipeline)               | both  | OPENROUTER_MODEL_AGENTIC + Replicate     | agentic_posting       | **5**        | `/api/ai/agentic`             |
| 22  | PDF-to-Thread                                   | text  | OPENROUTER_MODEL_PDF_TO_THREAD           | pdf_to_thread         | **5**        | `/api/ai/pdf-to-thread/*`     |
| 23  | YouTube-to-Thread                               | text  | OPENROUTER_MODEL (queue)                 | youtube_to_thread     | **5**        | `/api/ai/youtube-to-thread/*` |
|     | **Discovery Hub**                               |       |                                          |                       |              |                               |
| 24  | YouTube Discovery                               | data  | YouTube Data API (not AI)                | ai_discovery          | 0            | `/api/ai/discover/youtube`    |
| 25  | X Trends Discovery                              | text  | OPENROUTER_MODEL_TRENDS → fallback       | ai_discovery          | 0            | `/api/ai/discover/trends`     |

### Plan Tier AI Quotas

| Plan            | Text/Month     | Images/Month   | Available Image Models         | Monthly Price       |
| --------------- | -------------- | -------------- | ------------------------------ | ------------------- |
| Free            | 20             | 10             | nano-banana-2, nano-banana     | $0                  |
| Trial (14 days) | 50             | 25             | nano-banana-2, nano-banana     | $0                  |
| Pro Monthly     | 150            | 50             | + nano-banana-pro, gpt-image-2 | $29/mo              |
| Pro Annual      | 150            | 50             | + nano-banana-pro, gpt-image-2 | $290/yr ($24.17/mo) |
| Agency          | Unlimited (-1) | Unlimited (-1) | + nano-banana-pro, gpt-image-2 | $99/mo              |

### Dashboard Pages (14 AI-related routes)

| Route                             | Feature                             | Plan Gate |
| --------------------------------- | ----------------------------------- | --------- |
| `/dashboard/ai`                   | AI Hub (quota meter + 12-tool grid) | —         |
| `/dashboard/ai/writer`            | Thread Writer                       | Free      |
| `/dashboard/ai/url-to-thread`     | URL to Thread                       | Pro       |
| `/dashboard/ai/pdf-to-thread`     | PDF to Thread                       | Pro       |
| `/dashboard/ai/youtube-to-thread` | YouTube to Thread                   | Pro       |
| `/dashboard/ai/agentic`           | Agentic Posting (SSE wizard)        | Pro       |
| `/dashboard/ai/variants`          | A/B Variants                        | Pro       |
| `/dashboard/ai/hashtags`          | Hashtag Generator                   | Free      |
| `/dashboard/ai/bio`               | Bio Generator                       | Pro       |
| `/dashboard/ai/reply`             | Reply Generator                     | Pro       |
| `/dashboard/ai/calendar`          | AI Calendar                         | Pro       |
| `/dashboard/ai/discover`          | Discovery Hub (YouTube + X Trends)  | Pro       |
| `/dashboard/ai/history`           | AI History (server-rendered)        | All       |
| `/dashboard/inspiration`          | Import & Adapt (3 tabs)             | Pro       |

---

## AI Infrastructure Stack

### Request Flow

```
User Request
  → Route handler (auth, Zod, rate-limit)
    → aiPreamble()  ← unified gatekeeper (11 routes)
      ├─ Session check (Better Auth)
      ├─ Idempotency check (Redis)
      ├─ Rate limiter (Redis)
      ├─ Plan gate (require-plan.ts)
      ├─ Atomic quota consume (UPDATE WHERE used+weight ≤ limit)
      └─ Model construction (OpenRouter native fallback + Anthropic caching)
    → AI call (generateText/generateObject/streamText via Vercel AI SDK)
    → recordTelemetry() → recordAiUsage() → ai_generations row
    → checkModeration() → moderateOutput() → moderation_flag row
    → Response.json()
    [on failure: releaseQuota()]
```

### Key Infrastructure Files

| System               | File                                                                   | Role                                                             |
| -------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Auth + quota gate    | `src/lib/api/ai-preamble.ts`                                           | Unified gatekeeper: session → rate-limit → plan → quota → model  |
| Text quota (atomic)  | `src/lib/services/ai-quota-atomic.ts`                                  | Atomic `UPDATE WHERE used+weight ≤ limit` + admin grant fallback |
| Image quota (atomic) | `src/lib/services/ai-image-quota-atomic.ts`                            | Same pattern, model-weighted (1/3/5), no grant fallback          |
| Billing telemetry    | `src/lib/services/ai-quota.ts`                                         | `recordAiUsage()` → ai_generations table + cache invalidation    |
| Plan limits          | `src/lib/plan-limits.ts`                                               | 5 tiers, tool keys, TRIAL_EFFECTIVE_PLAN                         |
| Plan gates           | `src/lib/middleware/require-plan.ts`                                   | 20+ gate functions for feature access                            |
| Content moderation   | `src/lib/services/moderation.ts`                                       | OpenAI Moderation API + regex fallback                           |
| Prompt security      | `src/lib/ai/untrusted.ts`                                              | `wrapUntrusted()` delimiter convention + escape redaction        |
| PII redaction        | `src/lib/ai/pii.ts`                                                    | Email/phone/credit-card/IBAN before AI providers                 |
| Arabic prompts       | `src/lib/ai/arabic-prompt.ts`                                          | Centralized Arabic style blocks + tone mappings                  |
| Hashtag filtering    | `src/lib/ai/hashtags.ts`                                               | 73 banned tags (EN+AR) + menaBiasFilter()                        |
| Agentic pipeline     | `src/lib/services/agentic-pipeline.ts`                                 | 5-step SSE: Research → Strategy → Write → Images → Review        |
| Queue processing     | `src/lib/queue/processors.ts`                                          | BullMQ: pdfThreadQueue + youtubeThreadQueue                      |
| X API cost meter     | `src/lib/services/x-budget-atomic.ts`                                  | Atomic budget tracking (Phase 1 observe-only)                    |
| Service catalog      | `src/lib/services/__tests__/service-catalog/service-catalog.config.ts` | 78 services × 5 plans, 228 tests                                 |

### X API Cost Reality (from `docs/claude/x-api-reference.md`)

| Action               | Cost                   | Rate Limit                          |
| -------------------- | ---------------------- | ----------------------------------- |
| Create post          | $0.015                 | 100/15min per user, 10k/24h per app |
| Create post w/ URL   | $0.200 (13×)           | same                                |
| Read own posts       | $0.001                 | 450/15min per app                   |
| Read 3rd-party posts | $0.005                 | 450/15min per app                   |
| User lookup          | $0.010                 | —                                   |
| Trends/news          | ~$0.010                | 75/15min                            |
| Full-archive search  | **$42k/mo Enterprise** | —                                   |

**Hard cap:** 2,000,000 post reads/month on pay-per-use. Rate limits bind regardless of spend.

---

## Constraints Every Proposal Must Respect

1. **MENA-first, Arabic-first.** Any feature that's equally useful to an English-only user in California is the wrong feature. Bias toward: Arabic dialect nuance, MENA cultural/seasonal context, RTL-aware output, regional trend awareness.

2. **X/Twitter is primary.** LinkedIn and Instagram are Agency-tier only (`linkedin` in `PRO_TOOLS`, but Instagram gating exists). Don't design features that only make sense on non-X platforms unless they're explicitly Agency-tier.

3. **X API reads cost real money.** Any feature reading X data at scale needs a cost story: caching (Redis with appropriate TTL), sharing across users (house account reads), or gating behind Pro/Agency where margins cover the cost. No "let's just call the API for every user."

4. **Full-archive search is off-limits.** `/2/tweets/search/all` = $42k/mo Enterprise. Any historical analysis must use `/search/recent` (7-day window) or cached alternatives.

5. **Every AI feature needs a plan gate + quota weight.** Say explicitly: which tier, why that tier, what quota weight, and how it drives upgrades or reduces churn.

6. **Reuse existing infrastructure.** Prefer extending: aiPreamble() gatekeeping, the agentic pipeline (5-step SSE), the Discovery Hub (two-tab pattern), BullMQ async processing, the dual atomic quota system, recordAiUsage() telemetry, and the voice profile system.

7. **Image generation is expensive (quota-wise).** Only propose image features if they're genuinely differentiated — we already have 4 models, editorial images, and agentic image generation.

8. **Rate limits are hard caps.** The X API 100-posts/15min per-user cap and 75-trends/15min cap constrain any feature doing bulk operations. Queue + pace, don't retry-spam.

---

## Proposed Features

### 1. MENA Trend Prediction Engine

**One-liner:** Predict which topics will trend in MENA regions 24-48h ahead, enabling pre-scheduled content that rides the wave before it peaks.

**User problem:** Content creators react to trends after they peak. By the time they see a trending topic, write a thread, and schedule it, the moment has passed. Proactive prediction lets them publish AS the trend rises.

**Why MENA/Arabic/X moat:**

- MENA trends have unique drivers: religious calendar events, regional news cycles, football (EGY/KSA leagues), Ramadan TV shows, oil/energy news
- Arabic-language trend detection is underserved — English tools don't catch Arabic hashtag velocity
- Regional WOEID-based trend data is cheap ($0.010/read) and highly cacheable
- Competitors (Buffer/Hootsuite/Typefully) have zero MENA trend intelligence

**Codebase mapping:**

- **Reuses:** Discovery Hub (`/dashboard/ai/discover` — add "Predictions" tab), trends API pattern (`/api/ai/trends` — extend with prediction mode), Redis caching (30-min TTL for live trends, 6h for predictions), X API cost meter (recordXUsage for trend reads)
- **New route:** `POST /api/ai/discover/predictions` — AI generates predictions from cached trend history + web search
- **New schema:** `trendPredictions` table (userId, subject, predictedTopics JSONB, confidence scores, validUntil, accuracy feedback)
- **New UI:** third tab in Discover client (`predictions-tab.tsx`), prediction cards with confidence badges, "Schedule for predicted peak" action
- **New prompt:** `src/lib/ai/trend-prediction-prompts.ts` — uses cached trend snapshots + web search to forecast
- **No new X API cost:** uses cached trend data + web search (OpenRouter), not live X API

**AI model:** `OPENROUTER_MODEL_TRENDS` (web-search capable). Quota weight: 1 per prediction generation. Plan gate: `ai_discovery` (Trial+Pro+Agency). Agency gets higher prediction frequency + longer horizon (72h vs 24h).

**Effort:** **M** (3-5 days). Key risks: prediction accuracy is inherently uncertain — needs confidence scoring + user feedback loop; web-search freshness may lag.

**Differentiation:** Buffer/Hootsuite show you what's trending NOW. AstraPost would tell you what WILL trend TOMORROW. No competitor does this for MENA/Arabic content.

---

### 2. Arabic Dialect-Aware Content Generation

**One-liner:** Generate content in specific Arabic dialects (Egyptian, Gulf, Levantine, Maghrebi, MSA) with appropriate idioms, slang, and cultural references — not just generic "Arabic."

**User problem:** Current Arabic generation uses MSA (Modern Standard Arabic) or generic Arabic. But X audiences in Egypt, Saudi, Morocco engage differently with dialect-specific content. A Saudi brand writing in Egyptian dialect sounds inauthentic; an Egyptian comedian writing in MSA sounds stiff.

**Why MENA/Arabic/X moat:**

- This is the definition of a MENA moat — zero English-speaking competitors will build this
- Arabic dialects are mutually intelligible but culturally distinct — dialect choice directly impacts engagement
- X is the primary platform for Arabic dialect content (more than LinkedIn/Instagram)
- Existing `arabic-prompt.ts` infrastructure already has Arabic style blocks — dialect-awareness is the natural extension

**Codebase mapping:**

- **Reuses:** `src/lib/ai/arabic-prompt.ts` (extend with dialect style blocks), Thread Writer (`/api/ai/thread` — add dialect parameter), voice profile system (dialect preference stored per user), aiPreamble() gatekeeping
- **New parameter:** `dialect` field on all text generation requests: `"msa" | "egyptian" | "gulf" | "levantine" | "maghrebi" | "auto"`
- **New prompt blocks:** ~5 dialect-specific style guides with vocabulary, particles, common expressions, and "don't-use" lists per dialect
- **New UI:** dialect selector dropdown in Composer + Writer + Agentic input screens (RTL-aware, Arabic-labeled)
- **Auto-detect mode:** analyze user's past tweets to detect their dominant dialect, default to that
- **No new routes needed** — extends existing generation endpoints with a new parameter

**AI model:** `OPENROUTER_MODEL` (needs strong Arabic multilingual performance). Quota weight: 1 (same as current text gen, just richer prompts). Plan gate: all plans (differentiation for Free tier to attract MENA users, upgrade path to Pro for higher quotas).

**Effort:** **S** (2-3 days). Key risks: LLM dialect quality varies — Egyptian and Levantine are well-represented in training data, Maghrebi (Darija) is weaker; needs dialect-specific eval set.

**Differentiation:** No social media scheduler — not Buffer, not Hootsuite, not Typefully — offers dialect-specific content generation. This is a pure AstraPost moat play.

---

### 3. AI Content Audit & Strategy Report

**One-liner:** Analyze a user's last 50-100 posts and generate a comprehensive audit: what topics work, optimal length, best posting times, tone consistency, engagement drivers — with actionable recommendations.

**User problem:** Users post content but don't know WHAT'S working. They lack the analytical skill to read their own X analytics and extract strategy insights. An AI audit bridges raw data → actionable strategy.

**Why MENA/Arabic/X moat:**

- Arabic content performance patterns differ from English (thread length, hashtag density, optimal posting times in AST timezone)
- MENA brands specifically need Ramadan campaign audits, Arabic/English mix analysis, dialect effectiveness scoring
- X analytics data is already being collected (owned reads = cheap $0.001) — this feature monetizes data we already have

**Codebase mapping:**

- **Reuses:** X analytics infrastructure (existing analytics routes + DB tables), aiPreamble() + recordAiUsage(), `src/lib/ai/arabic-prompt.ts` (Arabic-specific audit criteria), existing analytics components (charts, heatmaps)
- **New route:** `POST /api/ai/audit` — async job (BullMQ), quotaWeight: 5 (multi-step: fetch posts → analyze → generate report)
- **New processor:** `auditProcessor` in `processors.ts` — fetches posts via X API (max ~100 reads = $0.10), runs multi-pass AI analysis, generates structured report
- **New schema:** `contentAudits` table (userId, status, report JSONB, postsAnalyzed, period)
- **New UI:** `/dashboard/ai/audit` page + audit report component with sections: topic clusters, engagement heatmap, timing analysis, tone consistency, top/bottom performers, recommendations
- **X API cost:** ~$0.10 per audit (100 owned reads × $0.001) — negligible at Pro/Agency margins

**AI model:** `OPENROUTER_MODEL`. Quota weight: **5** (multi-pass analysis). Plan gate: `content_audit` (Pro+Agency, possibly 1 free audit for Trial). Agency gets monthly auto-audits + competitor comparison.

**Effort:** **L** (5-8 days). Key risks: X API read volume if many users run audits simultaneously (mitigation: rate-limit to 1 audit/day/user); report quality depends on having enough posts to analyze (minimum 20 posts).

**Differentiation:** Buffer's analytics shows you numbers. AstraPost's audit tells you WHAT TO DO differently. The strategy layer is what agencies charge $500+ for — productizing it justifies the Agency $99/mo tier.

---

### 4. Smart Best-Time-to-Post (Data-Driven)

**One-liner:** Replace the prompt-based content calendar with a data-driven model that analyzes the user's own follower activity patterns + engagement history to recommend optimal posting times.

**User problem:** The current AI Calendar generates a schedule based on general best practices ("post at 9 AM"). But every audience is different. A data-driven recommendation based on the user's ACTUAL engagement patterns would produce significantly better results.

**Why MENA/Arabic/X moat:**

- MENA timezone patterns are unique: dual peaks (pre-work + post-iftar during Ramadan), Friday prayer lulls, regional variation (Gulf vs. North Africa)
- Arabic content engagement patterns differ from English (different peak hours, different content-type preferences)
- X-owned analytics data is cheap ($0.001/read) — we can afford to crunch it

**Codebase mapping:**

- **Reuses:** X analytics infrastructure (tweet analytics, engagement data already stored), Content Calendar UI (`/dashboard/ai/calendar`), existing `best-time-heatmap.tsx` component
- **New route:** `POST /api/ai/best-time` — AI analyzes historical engagement patterns, returns optimal slots
- **New schema:** extend `contentCalendar` with `dataDriven: boolean` and `confidenceScore` fields
- **New UI:** enhanced calendar page with "Data-Driven" toggle, confidence heatmap overlay, per-day breakdown
- **X API cost:** batch read of own tweets (100 tweets × $0.001 = $0.10 per analysis). Cache for 7 days.
- **AI model:** `OPENROUTER_MODEL` (structured output: time slots + rationale + confidence). Quota weight: 1. Plan gate: `content_calendar` (Pro+).

**Effort:** **M** (3-4 days). Key risks: cold start for new users with <20 posts (fallback to generic best-practices); X API rate limits on analytics reads.

**Differentiation:** Typefully has a "best time" feature but it's generic (global averages). AstraPost's would be per-user, per-audience, with MENA-timezone awareness built in.

---

### 5. Voice Profile Auto-Learning

**One-liner:** Analyze a user's past 50 tweets to automatically extract their voice profile — tone, vocabulary, emoji usage, thread length preference, hashtag style — replacing manual voice profile setup.

**User problem:** The voice profile feature exists but requires manual configuration. Most users skip it, so AI-generated content sounds generic. Auto-learning removes the friction and makes every AI generation personally styled from day one.

**Why MENA/Arabic/X moat:**

- Arabic voice profiling is harder than English (diglossia — MSA vs. dialect mixing, code-switching with English/French)
- Competitors don't attempt voice profiling at all for Arabic
- Makes the entire AI suite more valuable for MENA users who code-switch

**Codebase mapping:**

- **Reuses:** Voice profile schema (`src/lib/ai/voice-profile.ts`), agentic pipeline (already reads voice profiles), `buildVoiceInstructions()`, user's tweet history via X API (owned reads)
- **New route:** `POST /api/ai/voice-profile/learn` — analyzes tweets, returns voice profile + style guide
- **New UI:** "Learn my voice" button on voice profile settings, preview of extracted style, confidence indicators per trait
- **X API cost:** ~50 owned reads × $0.001 = $0.05 per learning run. Cache extracted profile indefinitely.
- **AI model:** `OPENROUTER_MODEL`. Quota weight: 2 (structured extraction across multiple dimensions). Plan gate: `bio_optimizer` (Pro+ — pairs naturally with bio generation).

**Effort:** **S** (2-3 days). Key risks: Arabic code-switching may confuse extraction; extracted profile might overfit to recent tweets (needs "time decay" weighting).

**Differentiation:** Typefully has "voice" as a manual text field. Nobody auto-learns it — and definitely not for Arabic dialects. Makes agentic posting dramatically better with zero user effort.

---

### 6. Ramadan & Seasonal Content Planner

**One-liner:** Generate culturally-aware content calendars for Ramadan, Eid, Hajj season, White Friday (MENA Black Friday), and back-to-school — with appropriate tone shifts, religious sensitivity, and regional timing.

**User problem:** MENA content creators manually plan seasonal content. They struggle with: appropriate tone for religious occasions, region-specific timing (Ramadan starts differ by country), and balancing promotional vs. spiritual content during holy months.

**Why MENA/Arabic/X moat:**

- Pure MENA moat — no global competitor will build Ramadan-specific content planning
- Ramadan is the single biggest content season in MENA (TV shows, brand campaigns, influencer activity peaks)
- Seasonally drives upgrade motivation: Free users hit their 20-post quota during Ramadan week 1 → upgrade to Pro

**Codebase mapping:**

- **Reuses:** Content Calendar (`/api/ai/calendar` — add seasonal mode), aiPreamble(), Arabic prompt infrastructure
- **New route parameter:** `seasonalMode: "ramadan" | "eid" | "hajj" | "white_friday" | "back_to_school"` on calendar generation
- **New prompt blocks:** `src/lib/ai/seasonal-prompts.ts` — culturally-vetted templates for each season with appropriate tone guidance
- **New UI:** seasonal mode selector in Calendar page, pre-built calendar templates for each season, Ramadan-specific tone options (spiritual, family, humorous, promotional)
- **No new API routes** — extends existing `/api/ai/calendar` with seasonal parameter
- **No X API cost**

**AI model:** `OPENROUTER_MODEL`. Quota weight: 1 (same as calendar). Plan gate: `content_calendar` (Pro+). Could offer 1 free Ramadan calendar to Free users as seasonal acquisition play.

**Effort:** **S** (2-3 days). Key risks: religious sensitivity — must be carefully prompt-engineered to avoid inappropriate tone; needs review by Arabic-native speakers.

**Differentiation:** Buffer's "holiday calendar" is US/Europe-centric (Christmas, Thanksgiving). Nobody has Ramadan, Eid, Hajj content planning. This is AstraPost's home turf.

---

### 7. Competitor Content Intelligence

**One-liner:** Analyze competitor X accounts: what's working for them, posting patterns, engagement trends, content gaps you can exploit.

**User problem:** Users manually check competitor accounts. They can't systematically analyze what's working across multiple competitors, spot content gaps, or track competitor strategy changes over time.

**Why MENA/Arabic/X moat:**

- MENA markets have fewer competitors to track (more concentrated) → higher value per competitor analysis
- Arabic content analysis (dialect detection, cultural reference identification) requires MENA-specific AI
- Competitor analytics is a classic Agency-tier feature that agencies resell to clients

**Codebase mapping:**

- **Reuses:** X analytics infrastructure, aiPreamble() + recordAiUsage(), Import & Adapt pattern (fetch + analyze external content), existing competitor analyzer routes (`/api/competitor/*`)
- **New route:** `POST /api/ai/competitor/analyze` — async BullMQ job, quotaWeight: 5
- **New processor:** fetches competitor's recent tweets (~100 third-party reads × $0.005 = $0.50), runs AI analysis, generates structured report
- **New schema:** `competitorAnalyses` table (userId, competitorHandle, report JSONB, analyzedAt)
- **New UI:** `/dashboard/ai/competitor` page + analysis cards + comparison view (you vs. them)
- **X API cost:** ~$0.50 per analysis (100 third-party reads + user lookups). Agency only or capped at 5/month for Pro.
- **Plan gate:** `competitor_analyzer` (Pro limited, Agency unlimited). This is a clear upgrade driver.

**AI model:** `OPENROUTER_MODEL`. Quota weight: **5**. Plan gate: `competitor_analyzer` (Pro: 5/month, Agency: unlimited). Agency also gets: competitor comparison matrix, weekly auto-reports, trend overlap detection.

**Effort:** **L** (5-8 days). Key risks: X API cost at scale ($0.50/analysis × Agency users running daily = $15/mo per user — needs monitoring); scraping ethics (public data only, rate-limit respectful).

**Differentiation:** Hootsuite has "competitor tracking" but it's metric-only (follower count, post frequency). AstraPost's would be AI-powered content strategy analysis — "here's what they're doing that you're not."

---

### 8. Thread Performance Predictor

**One-liner:** Before publishing, predict which variant of a thread will perform best, using historical analytics patterns + content characteristics.

**User problem:** Users create multiple variants but guess which to publish. A pre-publication performance prediction lets them pick the highest-probability winner before spending their X API post cost.

**Why MENA/Arabic/X moat:**

- Arabic content performance patterns differ from English — a model trained on English tweets won't transfer
- MENA audience behavior (engagement patterns, sharing behavior) is distinct
- Builds on AstraPost's unique dataset of Arabic content + actual performance data

**Codebase mapping:**

- **Reuses:** Viral Score (`/api/ai/score` — extend scoring dimensions), A/B Variants (`/api/ai/variants`), analytics infrastructure, user's historical post performance data
- **New route:** `POST /api/ai/predict-performance` — takes thread variants, returns scored ranking with rationale
- **New prompt:** `src/lib/ai/performance-prompts.ts` — prompt-based prediction (not ML model) using content features + historical patterns + platform heuristics
- **New UI:** performance prediction badge on variant cards, "Predicted top performer" highlight, A/B test mode (publish two variants, compare actual performance)
- **X API cost:** zero for prediction. Only costs if user opts into A/B test mode (2 posts instead of 1).
- **AI model:** `OPENROUTER_MODEL`. Quota weight: 1. Plan gate: `variant_generator` (Pro+ — already gated).

**Effort:** **S** (2-3 days). Key risks: prompt-based prediction accuracy is inherently limited — set expectations with confidence scores; don't over-promise "AI knows what will go viral."

**Differentiation:** Nobody does pre-publication performance prediction for X threads. Typefully shows you analytics AFTER posting. This is "analytics before you publish."

---

### 9. Content Repurposing Engine

**One-liner:** Take one long-form piece (blog post, newsletter, video transcript) and produce multiple X-native formats: thread, single viral tweet, quote tweet, poll, and image carousel — all from one input.

**User problem:** Content creators write one long-form piece and want maximum X mileage from it. Today they manually adapt it into different formats. An engine that produces 5+ X-native variants from one input saves hours.

**Why MENA/Arabic/X moat:**

- Arabic long-form → short-form adaptation needs dialect-aware summarization (MSA article → dialect tweets)
- MENA creators often publish in Arabic on blogs/Medium and want X-native Arabic versions
- Extends the PDF/YouTube pipeline (which already does one-format output) to multi-format

**Codebase mapping:**

- **Reuses:** PDF-to-Thread pipeline (input → extract → generate pattern), URL-to-Thread, agentic pipeline (multi-step output), image generation (for carousel images)
- **New route:** `POST /api/ai/repurpose` — async BullMQ job, quotaWeight: 8 (multi-format generation)
- **New processor:** `repurposeProcessor` — extracts content → generates 5 formats in parallel (thread, viral tweet, quote tweet, poll, image carousel)
- **New schema:** `repurposedContent` table (sourceId, formats JSONB, status)
- **New UI:** `/dashboard/ai/repurpose` page — paste/upload input, select desired output formats, preview all variants
- **AI model:** `OPENROUTER_MODEL` for text, Replicate for carousel images. Quota weight: **8** (5 text gens + up to 3 images). Plan gate: `repurpose` (Pro: 5/month, Agency: 30/month).

**Effort:** **L** (5-8 days). Key risks: high quota cost may limit usage; parallel generation needs careful error handling (partial success acceptable); carousel image generation quality varies.

**Differentiation:** Typefully has "rewrite" (one variant). Nobody does one-input → five-format-X-native output. This is a content agency's workflow productized.

---

### 10. Cross-Platform Content Adaptation (Agency)

**One-liner:** Take X-optimized content and intelligently adapt it for LinkedIn (professional tone, longer form) and Instagram (visual-first, hashtag-heavy) — Agency-tier only.

**User problem:** Agency users manage brands across X, LinkedIn, and Instagram. They write once for X, then manually adapt for each platform — different tones, lengths, hashtag strategies, and media requirements.

**Why MENA/Arabic/X moat:**

- Arabic cross-platform adaptation is harder: LinkedIn Arabic is more formal, Instagram Arabic is more visual/casual
- MENA brands increasingly need multi-platform presence (X for news/engagement, Instagram for lifestyle, LinkedIn for B2B)
- Justifies the $99/mo Agency tier — this is what agencies actually do for clients

**Codebase mapping:**

- **Reuses:** Translation (tone adaptation pattern), AI preamble, voice profiles (per-platform voice), image generation (for Instagram visual adaptation), existing LinkedIn + Instagram account connections (Better Auth OAuth)
- **New route:** `POST /api/ai/cross-post/adapt` — takes X thread, returns LinkedIn + Instagram versions
- **New prompts:** `src/lib/ai/cross-platform-prompts.ts` — platform-specific adaptation rules for Arabic + English
- **New UI:** "Adapt for LinkedIn" / "Adapt for Instagram" buttons on thread results, platform preview cards
- **LinkedIn/Instagram publishing:** reuse existing queue infrastructure (if LinkedIn/Instagram publishing is already built)
- **AI model:** `OPENROUTER_MODEL`. Quota weight: 3 (2 platform adaptations). Plan gate: `linkedin` (Agency-only). This is a pure Agency upgrade driver.

**Effort:** **M** (4-6 days). Key risks: LinkedIn/Instagram publishing may not be fully built (verify before committing); adaptation quality needs platform-native review; rate limits on non-X platforms.

**Differentiation:** Buffer/Hootsuite offer cross-POSTING (same content, different platforms). AstraPost would offer cross-ADAPTATION (intelligently rewritten per platform). The difference is AI vs. copy-paste.

---

### 11. Hashtag Performance Prediction

**One-liner:** Not just generate hashtags — predict which will actually drive reach based on current trend velocity, saturation level, and historical performance for similar content.

**User problem:** The current hashtag generator suggests relevant hashtags, but doesn't distinguish between a high-velocity hashtag (trending NOW, will get impressions) and a saturated one (too many posts, yours will drown).

**Why MENA/Arabic/X moat:**

- Arabic hashtag dynamics are under-studied — English hashtag tools don't understand Arabic hashtag velocity
- MENA-specific hashtags (dialect hashtags, event hashtags, regional memes) need local knowledge
- Extends the existing hashtag generator (which already has MENA bias filtering) with data-driven scoring

**Codebase mapping:**

- **Reuses:** Hashtag Generator (`/api/ai/hashtags` — add performance scoring), `src/lib/ai/hashtags.ts` (menaBiasFilter, banned hashtags), trends infrastructure (trend velocity data), X API recent search (to estimate post volume per hashtag)
- **New route:** extends existing `POST /api/ai/hashtags` with `includePredictions: true` parameter
- **New prompt:** hashtag scoring prompt that weights: velocity (is it accelerating?), saturation (how many posts/hour?), relevance (does it match the content?), and longevity (will it still matter in 24h?)
- **New UI:** score badges on hashtag suggestions (🔥 High Velocity, 📈 Rising, 📉 Saturated), sort by predicted reach
- **X API cost:** ~$0.005-0.010 per hashtag velocity check (1 recent search). Cached for 15 min.
- **AI model:** `OPENROUTER_MODEL`. Quota weight: 1 (extends existing, no additional weight). Plan gate: `canUseAi` (all plans — but Pro gets velocity data, Free gets basic scoring).

**Effort:** **S** (2-3 days). Key risks: velocity estimation from recent search is approximate (7-day window, not real-time); saturated hashtag detection may have false positives.

**Differentiation:** Every tool generates hashtags. Nobody predicts which ones will actually perform. This turns hashtags from "suggestions" into "strategy."

---

### 12. AI Crisis/PR Response Assistant

**One-liner:** When a brand faces negative engagement or controversy on X, generate measured, brand-safe response options — with tone calibration, escalation flags, and legal-risk warnings.

**User problem:** Brands panic during X controversies. They either stay silent (look guilty) or respond poorly (make it worse). An AI assistant that generates CALM, brand-aligned responses — with clear warnings about sensitive topics — helps agencies manage client crises.

**Why MENA/Arabic/X moat:**

- MENA brand crises have cultural dimensions Western tools miss: religious sensitivity, regional political context, honor/shame dynamics
- Arabic crisis communication norms differ (more formal, more relationship-focused, different apology conventions)
- Agency users managing multiple brand accounts need this desperately — justifies Agency tier

**Codebase mapping:**

- **Reuses:** Reply Generator (response generation pattern), content moderation (`moderateOutput` — critical for this feature), voice profiles (brand-aligned tone), aiPreamble() + recordAiUsage()
- **New route:** `POST /api/ai/crisis/respond` — takes the triggering tweet + context, returns response options + risk analysis
- **New prompts:** `src/lib/ai/crisis-prompts.ts` — carefully engineered for de-escalation, brand protection, and cultural sensitivity. Includes CRISIS_RULES: never attack, never deny verifiable facts, always offer path to resolution
- **New UI:** crisis mode UI (distinct from regular reply generator — more serious, more structured, "Send for human review" default), risk level indicator per response option
- **New schema:** `crisisResponses` table (userId, triggerTweetId, context, options JSONB, selectedOption, reviewerId) — audit trail critical for agencies
- **Moderation:** DOUBLE moderation pass — once on input (ensure we're not engaging with hate speech), once on output (ensure response is appropriate)
- **AI model:** `OPENROUTER_MODEL`. Quota weight: 2 (extra moderation pass). Plan gate: `crisis_response` (Agency-only). NOT available on Free/Trial/Pro — this is a liability if misused.

**Effort:** **M** (4-5 days). Key risks: **LIABILITY** — AI-generated crisis responses could make situations worse. Mitigations: always flag "human review required," never auto-post, audit trail, clear disclaimers, moderation on both input and output. This feature needs legal review before shipping.

**Differentiation:** Nobody offers AI crisis response for social media. This is high-risk/high-reward — agencies would pay for it, but one bad response could be a PR disaster. Ship with extreme caution.

---

## Prioritized Ranking

Ranked by **(Impact × MENA-Moat) ÷ (Effort + Risk)**:

| Rank  | Feature                         | Impact | Effort | MENA Moat | Risk         | Score   | Tier Target     | Quick Win?   |
| ----- | ------------------------------- | ------ | ------ | --------- | ------------ | ------- | --------------- | ------------ |
| **1** | MENA Trend Prediction           | ★★★★★  | M      | ★★★★★     | Low          | **8.3** | Pro/Agency      | —            |
| **2** | Arabic Dialect-Aware Content    | ★★★★★  | S      | ★★★★★     | Low          | **8.3** | Free→Pro upsell | ✅ Quick Win |
| **3** | Ramadan & Seasonal Planner      | ★★★★★  | S      | ★★★★★     | Low          | **8.3** | Pro             | ✅ Quick Win |
| **4** | Voice Profile Auto-Learning     | ★★★★☆  | S      | ★★★★☆     | Low          | **6.7** | Pro             | ✅ Quick Win |
| **5** | Thread Performance Predictor    | ★★★★☆  | S      | ★★★☆☆     | Med          | **5.0** | Pro             | ✅ Quick Win |
| **6** | Hashtag Performance Prediction  | ★★★☆☆  | S      | ★★★★☆     | Low          | **5.0** | All→Pro upsell  | ✅ Quick Win |
| 7     | Smart Best-Time-to-Post         | ★★★★☆  | M      | ★★★★☆     | Low          | **4.0** | Pro             | —            |
| 8     | AI Content Audit                | ★★★★★  | L      | ★★★★☆     | Med          | **3.3** | Pro/Agency      | —            |
| 9     | Cross-Platform Adaptation       | ★★★★☆  | M      | ★★★☆☆     | Med          | **2.8** | Agency          | —            |
| 10    | Content Repurposing Engine      | ★★★★☆  | L      | ★★★☆☆     | Med          | **2.4** | Pro/Agency      | —            |
| 11    | Competitor Content Intelligence | ★★★★★  | L      | ★★★★☆     | High         | **2.3** | Agency          | —            |
| 12    | AI Crisis/PR Response           | ★★★☆☆  | M      | ★★★★☆     | **Critical** | **1.4** | Agency          | —            |

### Top 3 "Build Next"

1. **MENA Trend Prediction Engine** (#1) — Highest strategic value. Extends the Discovery Hub (already built), zero X API cost, pure MENA differentiation. Creates a feature Buffer/Hootsuite/Typefully cannot easily replicate. Pro users get 24h predictions; Agency gets 72h + accuracy feedback loop.

2. **Arabic Dialect-Aware Content Generation** (#2) — Highest (impact ÷ effort) ratio. Only 2-3 days to build, touches every existing generation endpoint, makes the ENTIRE AI suite better for Arabic users. This is the definition of a moat-deepening feature.

3. **Ramadan & Seasonal Content Planner** (#3) — Timely (Ramadan 2027 is ~January, but planning starts months before). Perfect seasonal acquisition play: offer 1 free Ramadan calendar to Free users, convert them to Pro when they hit their quota during Ramadan week 1. The seasonal calendar is a recurring annual retention mechanism.

---

## Quick Wins

These 5 features are all **S-effort (2-3 days), low-risk, and extend existing infrastructure** without new subsystems. Build them in a single sprint:

| #   | Quick Win                          | Why Cheap                                                                            | Upgrade Driver?                                              |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 1   | **Arabic Dialect-Aware Content**   | New parameter on existing endpoints + 5 prompt blocks. No new routes, no new schema. | Free users get basic MSA; Pro gets all 5 dialects → upgrade  |
| 2   | **Ramadan Seasonal Planner**       | Extends `/api/ai/calendar` with a seasonal parameter. No new routes.                 | Free gets 1 Ramadan calendar; Pro gets all seasons → upgrade |
| 3   | **Voice Profile Auto-Learning**    | New endpoint that reads tweets → extracts profile. Reuses voice profile schema.      | Free users can't save profiles → Pro upgrade                 |
| 4   | **Thread Performance Predictor**   | Extends `/api/ai/score` pattern. No new infrastructure.                              | Already Pro-gated (variant_generator)                        |
| 5   | **Hashtag Performance Prediction** | Extends `/api/ai/hashtags` with scoring parameter. No new routes.                    | Free gets basic scoring; Pro gets velocity data → upgrade    |

**Combined sprint estimate:** 8-12 days for all 5 quick wins. Each independently shippable.

---

## Single Strongest Recommendation

**Build the MENA Trend Prediction Engine first.**

**Why this one:**

1. **It's the only feature in the top tier that creates a COMPLETELY NEW capability** rather than enhancing an existing one. Dialect-aware content makes the writer better. Seasonal calendar makes the calendar better. Trend PREDICTION creates a new product category: "pre-content planning based on forecasted trends."

2. **Zero additional X API cost.** It runs entirely on cached trend data + web search (OpenRouter). Every other high-impact feature (competitor analysis, content audit) incurs X API read costs at scale. This one is pure margin.

3. **It extends the Discovery Hub** — your newest, shiniest AI feature (shipped 2026-07-13). Adding a third tab ("Predictions") to an existing two-tab UI is low-effort and high-visibility. Users already understand the Discover pattern.

4. **Clear upgrade path:** Free users see "Trending Now." Pro users see "Trending Now + Predictions (24h)." Agency users see "Trending Now + Predictions (72h) + Accuracy History." Every tier gets value; higher tiers get more.

5. **Competitive moat is real.** Trend prediction requires: cached historical trend data (we have it from the Discovery Hub), Arabic-language web search synthesis (we have it from `OPENROUTER_MODEL_TRENDS`), and MENA regional trend knowledge (we have it from the WOEID-based architecture). Buffer/Hootsuite have none of these three prerequisites.

6. **It ships in a week.** New prompt file, new API route (extending `/api/ai/discover/predictions`), new tab in the Discover client, new DB table for predictions + feedback. All patterns exist in the codebase today.

**Second choice if trend prediction hits a blocker:** Arabic Dialect-Aware Content. Cheaper, faster, makes everything else better. But it's an enhancement, not a new capability.

---

## Next Steps

1. **Review this proposal** — flag any misunderstood existing features, wrong assumptions, or missing constraints
2. **Select 1-3 features** to elaborate into full build plans (`.claude/plans/YYYY-MM-DD-feature-name.md`)
3. **For the top pick**, the build plan would include:
   - Schema design (Drizzle migration)
   - API route spec (following the 9-step checklist from CLAUDE.md)
   - Prompt engineering (`src/lib/ai/*-prompts.ts`)
   - Frontend components (following existing AI tool patterns)
   - Plan gate + quota weight + service catalog entry
   - Test plan (unit + service catalog + E2E smoke)

**Ask before elaborating any idea into a full build plan.** This document is the menu — you pick what to cook.
