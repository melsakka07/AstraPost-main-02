# AstraPost — Code Wiki

> **Auto-generated from codebase analysis** — Last updated: 2026-05-15

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [High-Level Architecture](#4-high-level-architecture)
5. [Core Library Modules (`src/lib/`)](#5-core-library-modules-srclib)
   - [5.1 Database & Schema](#51-database--schema)
   - [5.2 Authentication & Authorization](#52-authentication--authorization)
   - [5.3 AI Engine](#53-ai-engine)
   - [5.4 Queue & Background Jobs](#54-queue--background-jobs)
   - [5.5 External Services](#55-external-services)
   - [5.6 API Utilities & Middleware](#56-api-utilities--middleware)
   - [5.7 Billing & Plans](#57-billing--plans)
   - [5.8 Utility Modules](#58-utility-modules)
6. [Application Router (`src/app/`)](#6-application-router-srcapp)
   - [6.1 Layouts & Route Groups](#61-layouts--route-groups)
   - [6.2 Public Pages (Marketing & Auth)](#62-public-pages-marketing--auth)
   - [6.3 Dashboard Pages](#63-dashboard-pages)
   - [6.4 Admin Pages](#64-admin-pages)
7. [API Endpoints (`src/app/api/`)](#7-api-endpoints-srcappapi)
8. [Component Architecture (`src/components/`)](#8-component-architecture-srccomponents)
9. [Database Schema](#9-database-schema)
10. [Background Jobs & Workers](#10-background-jobs--workers)
11. [Internationalization (i18n)](#11-internationalization-i18n)
12. [Security Architecture](#12-security-architecture)
13. [Configuration & Environment](#13-configuration--environment)
14. [Running the Project](#14-running-the-project)
15. [Testing](#15-testing)
16. [Scripts Reference](#16-scripts-reference)
17. [Deployment](#17-deployment)
18. [Key Architectural Patterns](#18-key-architectural-patterns)
19. [Dependency Relationships](#19-dependency-relationships)

---

## 1. Project Overview

**AstraPost** is a production-grade SaaS platform for AI-powered social media management. It enables users to compose, schedule, publish, and analyze social media content across X (Twitter), LinkedIn, and Instagram — with a heavy emphasis on AI-assisted content generation. The platform is MENA-focused and Arabic-first, with full bilingual (EN/AR) support and RTL layout.

### Key Capabilities

| Domain                    | Features                                                                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Composer**              | Drag-and-drop thread builder, multi-account targeting, recurrence scheduling, drafts, auto-save, AI tools sidebar                                                                                  |
| **AI Generation**         | Thread writer, single-post writer, reply suggester, bio generator, hashtag generator, A/B variants, content scoring, translation, summarization, inspiration remixer, AI calendar, agentic posting |
| **AI Content Converters** | PDF-to-Thread, YouTube-to-Thread, URL-to-Thread                                                                                                                                                    |
| **AI Image**              | Multi-model image generation (Replicate Nano Banana, GPT Image), auto-prompt building, aspect ratio presets                                                                                        |
| **Scheduling**            | One-shot, recurring (daily/weekly/monthly), best-time-to-post suggestions                                                                                                                          |
| **Analytics**             | Follower tracking, engagement metrics, viral content analyzer, competitor analysis, best-time heatmap                                                                                              |
| **Team Collaboration**    | Team invites, role-based access, multi-account management                                                                                                                                          |
| **Billing (Stripe)**      | Free / Trial (14-day) / Pro Monthly / Pro Annual / Agency plans with granular quotas                                                                                                               |
| **Admin Panel**           | User management, impersonation, audit log, AI cost/usage monitoring, feature flags, announcements                                                                                                  |
| **Referral & Affiliate**  | Referral codes, affiliate dashboard, short-link redirects                                                                                                                                          |
| **Gamification**          | Achievement milestones, streak tracking                                                                                                                                                            |

---

## 2. Technology Stack

| Layer                 | Technology                           | Version |
| --------------------- | ------------------------------------ | ------- |
| **Framework**         | Next.js (App Router)                 | 16.1.6  |
| **Runtime**           | Node.js                              | 22      |
| **Language**          | TypeScript                           | 5.9.3   |
| **UI Library**        | React                                | 19.2.5  |
| **Styling**           | Tailwind CSS                         | 4       |
| **Component Library** | shadcn/ui (Radix UI primitives)      | latest  |
| **Database**          | PostgreSQL (with pgvector)           | 18      |
| **ORM**               | Drizzle ORM                          | 0.44.7  |
| **Migrations**        | drizzle-kit                          | 0.31.8  |
| **Cache / Queue**     | Redis (via ioredis + BullMQ)         | 5.70.4  |
| **Auth**              | Better Auth                          | 1.4.18  |
| **Payments**          | Stripe                               | 20.4.1  |
| **AI SDK**            | Vercel AI SDK (`ai`)                 | 5.0.183 |
| **AI Provider**       | OpenRouter (Anthropic/OpenAI models) | —       |
| **Image Generation**  | Replicate, Google GenAI              | —       |
| **Transcription**     | Deepgram, OpenAI Whisper             | —       |
| **Validation**        | Zod                                  | 4       |
| **State (client)**    | Zustand                              | 5       |
| **Charts**            | Recharts                             | 3       |
| **i18n**              | next-intl                            | 4.9.1   |
| **Email**             | Resend                               | 6.9.3   |
| **Monitoring**        | Sentry                               | 10.43.0 |
| **E2E Testing**       | Playwright                           | 1.58.2  |
| **Unit Testing**      | Vitest                               | 4.0.18  |
| **Package Manager**   | pnpm                                 | 9.x     |

---

## 3. Project Structure

```
AstraPost-main-02/
├── src/
│   ├── app/                       # Next.js App Router (pages, layouts, API routes)
│   │   ├── (marketing)/           # Public marketing pages (home, pricing, blog, docs, etc.)
│   │   ├── (auth)/                # Login / Register pages
│   │   ├── dashboard/            # Authenticated user dashboard
│   │   ├── admin/                # Admin panel (requires admin role)
│   │   ├── api/                  # ~100+ API route handlers
│   │   ├── chat/                 # AI Chat interface
│   │   ├── brand/                # Brand style guide page
│   │   ├── profile/              # Public user profile
│   │   ├── go/[shortCode]/       # Affiliate link redirector
│   │   └── layout.tsx            # Root layout (fonts, i18n, providers, SEO)
│   ├── components/               # ~170+ React components organized by domain
│   │   ├── ai/                   # AI tools (agentic, pdf-to-thread, youtube-to-thread, etc.)
│   │   ├── admin/                # Admin panel components
│   │   ├── analytics/            # Analytics charts & dashboards
│   │   ├── auth/                 # Auth-related UI
│   │   ├── billing/              # Pricing cards, plan change dialogs
│   │   ├── brand/                # Logo, LogoMark
│   │   ├── calendar/             # Content calendar
│   │   ├── composer/             # Post composer (drag-and-drop thread builder)
│   │   ├── dashboard/            # Sidebar, header, bottom-nav, notifications
│   │   ├── email/                # Transactional email templates
│   │   ├── inspiration/          # Inspiration feed & remixer
│   │   ├── marketing/            # Landing page mockups
│   │   ├── onboarding/           # Dashboard tour, onboarding wizard
│   │   ├── queue/                # Post queue views
│   │   ├── referral/             # Referral cookie processor
│   │   ├── settings/             # User settings (profile, billing, team, integrations)
│   │   └── ui/                   # shadcn/ui primitives (~45 components)
│   ├── i18n/                     # Internationalization
│   │   ├── request.ts            # Locale detection & message loading
│   │   └── messages/             # JSON translation files (en.json, ar.json, pseudo.json)
│   ├── lib/                      # Core business logic (~70 files)
│   │   ├── schema.ts             # Drizzle ORM schema (all tables, enums, relations)
│   │   ├── db.ts                 # Database client singleton
│   │   ├── auth.ts               # Better Auth server config
│   │   ├── auth-client.ts        # Better Auth client helpers
│   │   ├── ai/                   # AI prompt engineering (14 files)
│   │   ├── api/                  # API utilities (errors, idempotency, ai-preamble)
│   │   ├── queue/                # BullMQ client & processors
│   │   ├── services/             # External service integrations (15+ files)
│   │   ├── middleware/            # Plan gating, rate limiting
│   │   ├── security/             # Token encryption (AES-256-GCM)
│   │   ├── admin/                # Admin utilities (audit, rate-limit)
│   │   ├── schemas/              # Shared Zod sub-schemas
│   │   └── utils/                # Time, timezone utilities
│   └── proxy.ts                  # Next.js 16 middleware proxy (auth redirect, API versioning)
├── drizzle/                      # Drizzle migration SQL files (82 migrations)
│   └── meta/                     # Migration snapshots & journal
├── scripts/                      # 23 utility scripts (setup, worker, smoke tests, devops)
├── public/                       # Static assets (brand, images, PWA icons)
├── docs/                         # Internal documentation
├── tests/                        # E2E test specs
├── docker-compose.yml            # Local dev infrastructure (PostgreSQL + Redis + Worker)
├── package.json                  # Dependencies & scripts
├── next.config.ts                # Next.js config (Sentry, next-intl, PWA plugins)
├── tsconfig.json                 # Strict TypeScript configuration
├── drizzle.config.ts             # Drizzle Kit configuration
├── railway.json                  # Railway deployment config
├── nixpacks.toml                 # Nixpacks build config for worker
├── Dockerfile.worker             # Worker container
├── CLAUDE.md                     # AI agent instruction file
└── README.md                     # Comprehensive project readme
```

---

## 4. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Marketing │  │Dashboard │  │  Admin   │  │  Auth Pages   │   │
│  │  Pages    │  │  Pages   │  │  Pages   │  │               │   │
│  └────┬──────┘  └────┬─────┘  └────┬─────┘  └───────┬───────┘   │
└───────┼──────────────┼─────────────┼─────────────────┼───────────┘
        │              │             │                 │
   ┌────▼──────────────▼─────────────▼─────────────────▼───────────┐
   │                   Next.js 16 App Router                       │
   │  ┌──────────────────────────────────────────────────────┐    │
   │  │  proxy.ts  (middleware — auth redirect, API version) │    │
   │  └──────────────────┬───────────────────────────────────┘    │
   │                     │                                        │
   │  ┌──────────────────▼───────────────────────────────────┐    │
   │  │              API Routes  (~100+ endpoints)            │    │
   │  │  /api/auth  /api/ai  /api/posts  /api/billing         │    │
   │  │  /api/admin  /api/queue  /api/cron  /api/x ...        │    │
   │  └──────┬──────────────┬────────────────┬───────────────┘    │
   │         │              │                │                    │
   └─────────┼──────────────┼────────────────┼────────────────────┘
             │              │                │
     ┌───────▼───┐  ┌───────▼────┐  ┌───────▼──────┐
     │ PostgreSQL │  │   Redis    │  │  External    │
     │  (Drizzle) │  │  (BullMQ)  │  │  APIs        │
     └───────────┘  └─────┬──────┘  │  (X, Stripe,  │
                          │          │   OpenRouter,  │
                   ┌──────▼──────┐  │   Replicate,   │
                   │  Worker     │  │   Deepgram,    │
                   │  Process    │  │   Resend...)   │
                   │  (BullMQ)   │  └───────────────┘
                   └─────────────┘
```

### Data Flow (API Request Lifecycle)

```
Request → proxy.ts (auth cookie check / API versioning)
  → Route Handler
    → getTeamContext() / requireAdminApi()  (auth + role)
    → getCorrelationId()                    (tracing)
    → Zod schema validation                 (parsing)
    → checkRateLimit()                      (rate limiting)
    → getUserPlanType() → feature gate      (plan gating)
    → Business logic                        (DB operations)
    → BullMQ enqueue                        (post-deploy)
    → Response (x-correlation-id header)    (response)
```

---

## 5. Core Library Modules (`src/lib/`)

### 5.1 Database & Schema

#### [`src/lib/schema.ts`](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/schema.ts) (~1707 lines)

The single source of truth for the entire database schema. Defines all Drizzle ORM table definitions, enum types, relations, and TypeScript type exports.

**Tables defined (35+):**

| Table                     | Purpose                                                                         |
| ------------------------- | ------------------------------------------------------------------------------- |
| `user`                    | User accounts (name, email, image, plan, language, timezone, onboarding status) |
| `session`                 | Better Auth sessions                                                            |
| `account`                 | OAuth provider accounts (Google, X/Twitter)                                     |
| `verification`            | Email verification tokens                                                       |
| `xAccounts`               | Connected X/Twitter accounts (encrypted tokens)                                 |
| `linkedinAccounts`        | Connected LinkedIn accounts                                                     |
| `instagramAccounts`       | Connected Instagram accounts                                                    |
| `posts`                   | Scheduled/drafted/published posts                                               |
| `tweets`                  | Individual tweets within posts (for threads)                                    |
| `media`                   | Uploaded media files                                                            |
| `analyticsRefreshRuns`    | Analytics refresh job tracking                                                  |
| `tweetAnalytics`          | Per-tweet engagement metrics                                                    |
| `tweetAnalyticsSnapshots` | Time-series analytics snapshots                                                 |
| `followerSnapshots`       | Time-series follower count snapshots                                            |
| `aiGenerations`           | AI generation telemetry log                                                     |
| `aiQuotaGrants`           | Admin-granted additional AI quotas                                              |
| `userAiCounters`          | Per-user monthly AI usage counters                                              |
| `agenticPosts`            | Agentic posting session records                                                 |
| `subscriptions`           | Stripe subscription records                                                     |
| `stripeEventLog`          | Incoming Stripe webhook events                                                  |
| `promoCodes`              | Discount promo codes                                                            |
| `promoCodeRedemptions`    | Promo code usage log                                                            |
| `teamMembers`             | Team membership records                                                         |
| `teamInvitations`         | Pending team invitations                                                        |
| `milestones`              | User achievement milestones                                                     |
| `jobRuns`                 | Background job execution logs                                                   |
| `failedJobs`              | Dead-letter queue for failed jobs                                               |
| `pdfThreadJobs`           | PDF-to-thread job records                                                       |
| `youtubeThreadJobs`       | YouTube-to-thread job records                                                   |
| `adminAuditLog`           | Admin action audit trail                                                        |
| `moderationFlag`          | Content moderation flags                                                        |

#### [`src/lib/db.ts`](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/db.ts)

Drizzle ORM database client singleton using `postgres-js` with Neon serverless driver. Exports the `db` instance used by all server-side code.

#### [`src/lib/env.ts`](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/env.ts) (223 lines)

Zod-validated environment variable loader. Exports `getServerEnv()` (all server-side vars) and `getPublicEnv()` (client-safe vars). Validates: `DATABASE_URL`, `AUTH_SECRET`, `X_CLIENT_ID`/`X_CLIENT_SECRET`, `OPENROUTER_API_KEY`, `REPLICATE_API_TOKEN`, `STRIPE_SECRET_KEY`, `REDIS_URL`, `RESEND_API_KEY`, etc.

---

### 5.2 Authentication & Authorization

#### [`src/lib/auth.ts`](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/auth.ts)

Better Auth server configuration. Features:

- PostgreSQL adapter via Drizzle
- Google OAuth provider
- X (Twitter) OAuth provider (v2)
- Session management with cookie-based auth
- Email verification & password hashing
- Admin impersonation support

#### [`src/lib/auth-client.ts`](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/auth-client.ts)

Browser-side Better Auth client. Exports `authClient`, `signIn`, `signOut`, `signUp`, `useSession`.

#### [`src/lib/admin.ts`](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/admin.ts) (56 lines)

Admin guard functions:

- **`requireAdmin()`** — Server Component guard; redirects non-admin users to `/dashboard`
- **`requireAdminApi()`** — API route guard; returns session if admin, or `401` error response

#### [`src/lib/admin/audit.ts`](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/admin/audit.ts) (47 lines)

- **`logAdminAction(action, target, details)`** — Fire-and-forget audit log writer. Records admin actions with IP, User-Agent, and target info.

#### [`src/lib/admin/rate-limit.ts`](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/admin/rate-limit.ts) (60 lines)

IP-based rate limiter for admin endpoints:

- `read`: 120 req/min
- `write`: 30 req/min
- `destructive`: 10 req/min

#### [`src/lib/security/token-encryption.ts`](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/security/token-encryption.ts) (98 lines)

AES-256-GCM encryption for X (Twitter) OAuth tokens stored in the database. Supports multi-key rotation with versioned keys (`v1:` prefix). Exports: `encrypt()`, `decrypt()`, `isEncryptedToken()`, `isPrimaryKeyToken()`.

---

### 5.3 AI Engine

The AI subsystem is the largest and most complex part of the codebase. It consists of a centralized gateway (`ai-preamble`) and 14 prompt/utility files.

#### [`src/lib/api/ai-preamble.ts`](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/api/ai-preamble.ts) (331 lines) — **CENTRAL AI GATEWAY**

Every AI API route passes through the `aiPreamble()` function, which enforces a standardized pipeline:

1. **Auth check** — validates session
2. **DB user lookup** — fetches plan, voice profile, language
3. **Idempotency check** — `x-idempotency-key` header deduplication
4. **Rate limit check** — plan-based rate limiting
5. **Feature gate** — Pro-only route enforcement
6. **AI access plan check** — plan tier validation
7. **Atomic quota consumption** — `tryConsumeAiQuota()` with rollback
8. **Model instantiation** — OpenRouter with Anthropic prompt caching, fallback chains
9. Returns `AiPreambleResult` with: `model`, `session`, `dbUser`, `checkModeration`, `recordTelemetry`, `cacheIdempotent`, `withRetry`, `withTimeout`, `releaseQuota`

#### Prompt Engineering Files

| File                                                                                                                  | Lines | Purpose                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [agentic-prompts.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/ai/agentic-prompts.ts)     | 290   | 5-step agentic posting pipeline: `buildResearchPrompt`, `buildStrategyPrompt`, `buildWritingPrompt`, `buildReviewPrompt`, `buildImagePrompts` |
| [template-prompts.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/ai/template-prompts.ts)   | 277   | 8 pre-built content templates (news, hot-take, question, storytelling, how-to, personal-brand, motivational, listicle)                        |
| [inspire-prompts.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/ai/inspire-prompts.ts)     | 211   | Tweet remixing actions (rephrase, change_tone, expand_thread, add_take, translate, counter_point)                                             |
| [arabic-prompt.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/ai/arabic-prompt.ts)         | 88    | Centralized Arabic social media style rules (single source of truth for `ARABIC_SOCIAL_STYLE`, `ARABIC_TRANSLATION_STYLE`)                    |
| [length-prompts.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/ai/length-prompts.ts)       | 69    | Short (280c) / Medium (1000c) / Long (2000c) prompt guidance                                                                                  |
| [language.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/ai/language.ts)                   | 48    | Language-specific prompt block builder (English vs Arabic)                                                                                    |
| [summarize-prompts.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/ai/summarize-prompts.ts) | —     | Long-form content summarization prompts                                                                                                       |
| [voice-profile.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/ai/voice-profile.ts)         | —     | User voice/tone profile integration into prompts                                                                                              |

#### AI Safety & Resilience

| File                                                                                                          | Lines | Purpose                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [untrusted.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/ai/untrusted.ts)         | 69    | Prompt-injection defense: `wrapUntrusted()` wraps user content with `<<<UNTRUSTED...UNTRUSTED>>>` delimiters; `JAILBREAK_GUARD` blocks known injection patterns |
| [pii.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/ai/pii.ts)                     | —     | PII redaction: strips emails, phones, SSNs, credit cards before sending to AI                                                                                   |
| [input-limits.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/ai/input-limits.ts)   | 27    | Token budget caps: `INPUT_LIMITS` object with character limits per field type                                                                                   |
| [with-retry.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/ai/with-retry.ts)       | 38    | Exponential-backoff retry: `withRetry(fn, { tries: 2, baseMs: 250 })`                                                                                           |
| [with-timeout.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/ai/with-timeout.ts)   | 30    | Promise timeout: `withTimeout(promise, 45000)` via `AbortSignal.timeout()`                                                                                      |
| [agentic-types.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/ai/agentic-types.ts) | 107   | Zod schemas for agentic pipeline: `ResearchBrief`, `ContentPlan`, `AgenticTweet`, `PipelineProgressEvent`                                                       |

---

### 5.4 Queue & Background Jobs

#### [`src/lib/queue/client.ts`](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/queue/client.ts) (157 lines)

BullMQ queue definitions:

- **`scheduleQueue`** — post publishing jobs
- **`analyticsQueue`** — analytics refresh jobs
- **`xTierRefreshQueue`** — X subscription tier refresh
- **`tokenHealthQueue`** — access token health checks
- **`pdfThreadQueue`** — PDF-to-thread async generation
- **`youtubeThreadQueue`** — YouTube-to-thread async generation

Job payload types: `PublishPostPayload`, `AnalyticsJobPayload`, `RefreshXTiersJobPayload`, `TokenHealthJobPayload`, `PdfThreadJobPayload`, `YoutubeThreadJobPayload`

#### [`src/lib/queue/processors.ts`](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/queue/processors.ts) (1935 lines) — **LARGEST SINGLE FILE**

All BullMQ job processors:

- **`schedulePostProcessor`** — Publishes posts to X (handles media upload, thread posting, analytics tracking)
- **`recurrenceProcessor`** — Handles recurring post scheduling (daily/weekly/monthly/yearly)
- **`analyticsProcessor`** — Fetches tweet metrics and follower counts via X API
- **`refreshXTiersProcessor`** — Refreshes X subscription tier info
- **`tokenHealthCheckProcessor`** — Monitors access token expiry, sends warning emails
- **`pdfThreadProcessor`** — PDF-to-thread AI generation pipeline
- **`youtubeThreadProcessor`** — Downloads YouTube audio (yt-dlp), transcribes (Deepgram/Whisper), generates thread (OpenRouter)

#### [`src/lib/queue/backfill.ts`](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/queue/backfill.ts)

Job backfill utility for reconstructing missed or duplicate queue jobs.

---

### 5.5 External Services

#### Social Media APIs

| File                                                                                                                        | Lines | Description                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x-api.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/x-api.ts)                         | 630   | X (Twitter) API v2 client: `tweet()`, `unthread()`, `getMe()`, `getTweet()`, `getTweetAnalytics()`, `getFollowers()`, `getSubscriptionTier()`. Decrypts stored tokens, handles token refresh |
| [instagram-api.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/instagram-api.ts)         | 185   | Instagram Graph API client implementing `SocialApiService` interface                                                                                                                         |
| [social-api.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/social-api.ts)               | —     | `SocialApiService` interface defining the contract for social platform API services                                                                                                          |
| [x-subscription.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/x-subscription.ts)       | 49    | X subscription tier helpers: `canPostLongContent()`, `getMaxCharacterLimit()`, `getTierLabel()`                                                                                              |
| [x-error.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/x-error.ts)                     | —     | API error classification: `classifyRefreshError()`, `getBackoffForFailures()`                                                                                                                |
| [x-circuit-breaker.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/x-circuit-breaker.ts) | 105   | Circuit breaker for X API calls (Redis-based). Opens after N permanent failures                                                                                                              |

#### AI Services

| File                                                                                                                      | Lines | Description                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [ai-quota.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/ai-quota.ts)                 | 219   | AI usage tracking: `recordAiUsage()` logs full telemetry (tokens, model, cost, latency, prompt version); `estimateCost()` calculates cost |
| [ai-quota-atomic.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/ai-quota-atomic.ts)   | 286   | Atomic quota consumption: `tryConsumeAiQuota()` uses PostgreSQL row-level locks; `releaseAiQuota()` returns quota on failure              |
| [ai-image.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/ai-image.ts)                 | 662   | AI image generation via Replicate: model routing, prediction lifecycle management, fallback behavior                                      |
| [agentic-pipeline.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/agentic-pipeline.ts) | 436   | 5-step agentic posting orchestrator: Research → Strategy → Writing → Image Generation → Review. Streams SSE progress events               |
| [moderation.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/moderation.ts)             | 249   | Content moderation: primary uses OpenAI Moderation API, fallback uses pattern-based regex checks                                          |
| [transcription.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/transcription.ts)       | 237   | Audio transcription routing: Deepgram or OpenAI Whisper                                                                                   |
| [youtube.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/youtube.ts)                   | 891   | YouTube integration: URL validation, video metadata (innertube API), audio extraction via yt-dlp                                          |

#### Analytics & Email

| File                                                                                                                          | Lines | Description                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [analytics.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/analytics.ts)                   | 242   | Tweet metrics refresh: `updateTweetMetrics()`, `refreshFollowersAndMetricsForRuns()`                                                      |
| [analytics-engine.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/analytics-engine.ts)     | 109   | Best-time-to-post analytics: `BestTimeBucket` analysis by day/hour                                                                        |
| [admin-ai-metrics.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/admin-ai-metrics.ts)     | 356   | Admin AI analytics: `getDailyCosts()`, `getTopSpenders()`, `getFeatureCosts()`, `getModelMix()`, `getRouteLatency()`, `getFallbackRate()` |
| [email.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/email.ts)                           | 190   | Transactional email via Resend: post failures, token warnings, account deactivation, trial expiry, billing emails                         |
| [email-translations.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/services/email-translations.ts) | 13    | Email i18n: `getEmailTranslations(locale)`                                                                                                |

---

### 5.6 API Utilities & Middleware

| File                                                                                                                           | Lines | Description                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [api/errors.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/api/errors.ts)                           | —     | `ApiError` class: static factory methods `badRequest()`, `unauthorized()`, `forbidden()`, `notFound()`, `tooManyRequests()`, `internal()`, `validation()`                                                                                              |
| [api/idempotency.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/api/idempotency.ts)                 | —     | AI generation deduplication via `x-idempotency-key` header: `checkIdempotency()`, `cacheIdempotentResponse()`                                                                                                                                          |
| [api/version-middleware.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/api/version-middleware.ts)   | —     | API versioning middleware activated by `proxy.ts` for `/api/*` routes                                                                                                                                                                                  |
| [middleware/require-plan.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/middleware/require-plan.ts) | 827   | **Plan-gating middleware** — enforces feature access by plan tier. Functions: `checkAiLimitDetailed()`, `checkPostLimitDetailed()`, `checkAccountLimitDetailed()`, `createPlanLimitResponse()` (HTTP 402), `makeFeatureGate()`. Over 25 gated features |
| [plan-limits.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/plan-limits.ts)                         | 181   | Plan limit definitions: `PLAN_LIMITS` config for free (20 posts/mo, 20 AI/mo, 1 X account, 7d analytics), pro, agency. `getPlanLimits()`, `normalizePlan()`                                                                                            |
| [rate-limiter.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/rate-limiter.ts)                       | 188   | Redis-based rate limiting: `checkRateLimit(userId, plan, type)` — tiered limits: free (20/hr), pro (200/hr), agency (1000/hr). `createRateLimitResponse()` returns 429/503                                                                             |
| [storage.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/storage.ts)                                 | 225   | File upload service: `upload()` to Vercel Blob or local filesystem, `deleteFile()`, `sanitizeFilename()`, `validateFile()`                                                                                                                             |
| [cache.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/cache.ts)                                     | —     | Redis query caching: `cachedQuery()` with configurable TTL                                                                                                                                                                                             |
| [correlation.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/correlation.ts)                         | —     | Correlation ID generation via `getCorrelationId(req)`; returned in `x-correlation-id` response header                                                                                                                                                  |
| [logger.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/logger.ts)                                   | —     | Structured logger instance (used instead of `console.log` per project rules)                                                                                                                                                                           |

---

### 5.7 Billing & Plans

| File                                                                                                       | Lines | Description                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [stripe.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/stripe.ts)               | —     | Stripe client singleton                                                                                                                   |
| [pricing.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/pricing.ts)             | 119   | Centralized pricing: `PRICING` object with free, pro_monthly (2900¢), pro_annual (29000¢), agency_monthly (9900¢), agency_annual (99000¢) |
| [billing-utils.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/billing-utils.ts) | —     | Stripe billing helper utilities                                                                                                           |

### 5.8 Utility Modules

| File                                                                                                           | Lines | Description                                                                                            |
| -------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| [utils.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/utils.ts)                     | —     | General utilities (`cn()` for Tailwind class merging, date formatting)                                 |
| [utils/time.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/utils/time.ts)           | —     | Time utilities: `getMonthWindow()`                                                                     |
| [utils/timezone.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/utils/timezone.ts)   | —     | Timezone handling utilities                                                                            |
| [constants.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/constants.ts)             | 22    | `LANGUAGES`, `LANGUAGE_ENUM`, `TONE_ENUM`                                                              |
| [tokens.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/tokens.ts)                   | 211   | Design token system: color scales for brand, gray, success, warning, danger (light+dark), chart colors |
| [x-post-length.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/x-post-length.ts)     | 50    | AI length options: `AI_LENGTH_OPTIONS` (Short/Medium/Long), `getAvailableLengthOptions(tier)`          |
| [blog.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/blog.ts)                       | 193   | MDX blog post reader: `getAllBlogPosts()`, `getBlogPost(slug)` via `next-mdx-remote`                   |
| [export.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/export.ts)                   | 74    | CSV export: `downloadCsv()`, `fetchAndDownloadCsv()`                                                   |
| [breadcrumbs.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/breadcrumbs.ts)         | 65    | Admin breadcrumb generation                                                                            |
| [templates.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/templates.ts)             | —     | Client-side template CRUD                                                                              |
| [gamification.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/gamification.ts)       | —     | Re-exports `MILESTONES` from milestones module                                                         |
| [composer-bridge.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/composer-bridge.ts) | —     | Bridge between AI tool pages and the composer (sessionStorage IPC)                                     |
| [referral/utils.ts](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/lib/referral/utils.ts)   | —     | Referral program utilities                                                                             |

---

## 6. Application Router (`src/app/`)

### 6.1 Layouts & Route Groups

| Layout          | File                                                                                                         | Purpose                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Root**        | [layout.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/layout.tsx)               | Fonts (Geist Sans, Geist Mono, Cairo for Arabic), i18n with `next-intl` auto-detection, SEO metadata (OG, Twitter cards, hreflang), providers (Theme, Tooltip, Toaster, UpgradeModal), skip-to-content accessibility             |
| **(marketing)** | [layout.tsx](<file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/(marketing)/layout.tsx>) | Wraps with `SiteHeader` + `SiteFooter`. No auth required                                                                                                                                                                         |
| **(auth)**      | [layout.tsx](<file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/(auth)/layout.tsx>)      | Minimal passthrough. SEO metadata for auth pages                                                                                                                                                                                 |
| **dashboard**   | [layout.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/dashboard/layout.tsx)     | Requires authenticated session, enforces onboarding, loads team memberships, AI quotas, failed posts. Renders Sidebar, Header, banners (changelog, announcement, token, failure, trial, impersonation), BottomNav, DashboardTour |
| **admin**       | [layout.tsx](file:///c:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02/src/app/admin/layout.tsx)         | Requires admin role via `requireAdmin()`. Renders `AdminSidebar`, `GlobalAdminSearchWrapper`. `force-dynamic`                                                                                                                    |

### 6.2 Public Pages (Marketing & Auth)

| Route          | Page                       | Description                            |
| -------------- | -------------------------- | -------------------------------------- |
| `/`            | `(marketing)/page.tsx`     | Hero, social proof, features grid, CTA |
| `/features`    | Features overview          | Feature listing                        |
| `/pricing`     | Pricing                    | Pricing tiers with Stripe integration  |
| `/blog`        | Blog index                 | MDX blog listing                       |
| `/blog/[slug]` | Blog post                  | Individual MDX blog post               |
| `/changelog`   | Changelog                  | Product changelog                      |
| `/docs`        | Documentation              | Product documentation                  |
| `/roadmap`     | Roadmap                    | Public roadmap                         |
| `/login`       | `(auth)/login/page.tsx`    | Sign-in page                           |
| `/register`    | `(auth)/register/page.tsx` | Sign-up page                           |

### 6.3 Dashboard Pages (Authenticated)

| Route                      | Description                                                                 |
| -------------------------- | --------------------------------------------------------------------------- |
| `/dashboard`               | Main dashboard overview (quick compose, setup checklist, usage bars)        |
| `/dashboard/compose`       | Post composer (drag-and-drop thread builder with AI tools)                  |
| `/dashboard/queue`         | Post queue / scheduling view                                                |
| `/dashboard/calendar`      | Content calendar                                                            |
| `/dashboard/drafts`        | Drafts manager                                                              |
| `/dashboard/ai`            | AI tools hub                                                                |
| `/dashboard/ai/writer`     | AI thread/single-post writer                                                |
| `/dashboard/ai/agentic`    | Agentic AI posting workflow                                                 |
| `/dashboard/ai/bio`        | AI bio generator                                                            |
| `/dashboard/ai/reply`      | AI reply generator                                                          |
| `/dashboard/ai/calendar`   | AI calendar content generator                                               |
| `/dashboard/ai/history`    | AI generation history                                                       |
| `/dashboard/analytics`     | Self-analytics (with competitor + viral sub-tabs)                           |
| `/dashboard/jobs`          | Background job status                                                       |
| `/dashboard/affiliate`     | Affiliate dashboard                                                         |
| `/dashboard/referrals`     | Referral dashboard                                                          |
| `/dashboard/settings`      | Settings hub with tabs: Profile, Billing, Notifications, Team, Integrations |
| `/dashboard/settings/team` | Team management (invite members, manage roles)                              |

### 6.4 Admin Pages (`/admin` — requires admin role)

19 admin sections including: Subscribers, Billing, Agentic AI, AI Usage/Cost/Metrics, Audit Log, Announcements, Content, Feature Flags, Health, Impersonation, Jobs, Notifications, Teams, Affiliate, Referrals, Roadmap, Webhooks, Soft-Delete Recovery.

---

## 7. API Endpoints (`src/app/api/`)

### Authentication & Users

| Endpoint             | Method     | Description                                          |
| -------------------- | ---------- | ---------------------------------------------------- |
| `/api/auth/[...all]` | GET, POST  | Better Auth catch-all (Redis IP rate-limited: 5/min) |
| `/api/auth/register` | POST       | Registration                                         |
| `/api/user/profile`  | GET, PATCH | User profile CRUD                                    |
| `/api/user/delete`   | —          | Account deletion                                     |
| `/api/user/export`   | —          | Data export                                          |
| `/api/user/ai-usage` | —          | Current user's AI usage                              |
| `/api/user/teams`    | —          | User's                                               |
