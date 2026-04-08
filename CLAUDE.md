# AstraPost - AI Assistant Guidelines

## Agent Orchestration

When working on tasks that involve multiple files, systems, or concerns, always spin up
parallel sub-agents (via Task tool) to maximize throughput and reduce wall-clock time.

### When to spawn sub-agents

- **Multi-file changes**: If a task touches 3+ files, split the work across agents by
  concern (e.g., one for backend, one for frontend, one for tests).
- **Independent subtasks**: Any subtasks that have no data dependency on each other MUST
  run in parallel, not sequentially.
- **Research + Implementation**: Spawn one agent to research/read files while another
  scaffolds boilerplate or writes tests.
- **Lint / Typecheck / Test**: After making changes, spawn parallel agents for
  `lint`, `typecheck`, and `test` rather than running them one after another.

### How to split work

1. **Analyze the task** — identify independent subtasks and their dependency graph.
2. **Group by dependency** — tasks that depend on each other run in the same agent
   sequentially; independent groups run in separate agents in parallel.
3. **Define clear boundaries** — each sub-agent gets a specific, scoped instruction
   with the exact files to read/write so agents don't conflict on the same file.
4. **Aggregate results** — after all agents complete, review their outputs together
   before reporting back.

### Rules

- Never run independent work sequentially when it can be parallelized.
- Each sub-agent should have a single, clear responsibility.
- If a sub-agent's output is needed by another, wait for it to finish before
  spawning the dependent agent — do NOT use placeholder values or guess.
- Always run verification agents (lint, typecheck, tests) in parallel as the
  final step after all code changes are complete.
- When fixing errors, spawn one agent per distinct error/file rather than fixing
  them one at a time in a single thread.

## Project Overview

AstraPost is a production-ready AI-powered social media management platform for X (Twitter). It enables users to schedule tweets and threads, publish reliably via a background worker, track analytics, and generate content using AI — targeting Arabic-speaking content creators in the MENA region.

### Code Tracker
Please go check this file \docs\0-MY-LATEST-UPDATES.md to get the latest updates on the code and the changes made.

### Tech Stack

- **Framework**: Next.js 16 with App Router, React 19, TypeScript
- **AI Integration**: Vercel AI SDK 5 + OpenRouter (access to 100+ AI models)
- **AI Image Generation**: Replicate API (Flux models)
- **AI Chat**: Google Gemini API for chat features
- **Authentication**: Better Auth with X (Twitter) OAuth 2.0 only (email/password removed)
- **Database**: PostgreSQL 18 (pgvector) with Drizzle ORM
- **Queue**: BullMQ + Redis for background job processing
- **UI**: shadcn/ui components with Tailwind CSS 4
- **Billing**: Stripe (Pro Monthly / Pro Annual plans)
- **Storage**: Local filesystem (dev) / Vercel Blob (production)


## AI Integration with OpenRouter

### Key Points

- This project uses **OpenRouter** as the AI provider, NOT direct OpenAI
- OpenRouter provides access to 100+ AI models through a single unified API
- Default model: `openai/gpt-4o` (configurable via `OPENROUTER_MODEL` env var)
- Users browse models at: https://openrouter.ai/models
- Users get API keys from: https://openrouter.ai/settings/keys

### AI Implementation Files

**OpenRouter AI Integration** (via `@openrouter/ai-sdk-provider`)
- `src/app/api/ai/thread/route.ts` — AI thread writer endpoint
- `src/app/api/ai/translate/route.ts` — Translation endpoint
- `src/app/api/ai/affiliate/route.ts` — Amazon affiliate tweet generator
- `src/app/api/ai/tools/route.ts` — General AI writing tools
- `src/app/api/chat/route.ts` — General AI chat endpoint
- `src/app/api/ai/agentic/route.ts` — Agentic Posting SSE streaming endpoint (Pro/Agency only)
- `src/app/api/ai/agentic/[id]/approve/route.ts` — Approve/schedule/draft agentic post
- `src/app/api/ai/agentic/[id]/regenerate/route.ts` — Single-tweet regeneration
- Import: `import { openrouter } from "@openrouter/ai-sdk-provider"`

**Google Gemini AI Integration**
- `src/app/api/ai/inspire/route.ts` — AI content inspiration endpoint
- `src/app/api/ai/image/route.ts` — AI image generation endpoint (via Replicate)
- `src/lib/services/ai-image.ts` — Image generation service using Replicate API

**Twitter/X API Integration**
- `src/app/api/x/tweet-lookup/route.ts` — Public tweet import endpoint
- `src/lib/services/tweet-importer.ts` — Tweet import service with context retrieval
- Requires: `TWITTER_BEARER_TOKEN` environment variable

**Analytics & Insights**
- `src/app/api/analytics/viral/route.ts` — Viral content pattern analysis endpoint

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── login/                # Login page
│   │   ├── register/             # Registration page
│   │   ├── forgot-password/      # Forgot password page
│   │   └── reset-password/       # Reset password page
│   ├── (marketing)/              # Public marketing pages
│   │   ├── blog/                 # Blog listing
│   │   ├── changelog/            # Product changelog
│   │   ├── community/            # Community page
│   │   ├── docs/                 # Documentation page
│   │   ├── features/             # Features overview
│   │   ├── pricing/              # Pricing page
│   │   ├── resources/            # Resources page
│   │   └── legal/                # Privacy & Terms pages
│   ├── api/
│   │   ├── ai/                   # AI endpoints: thread, translate, affiliate, tools, agentic
│   │   │   └── agentic/          # Agentic Posting: SSE route + [id]/approve + [id]/regenerate
│   │   │   ├── image/            # AI image generation via Replicate
│   │   │   └── inspire/          # AI content inspiration via Gemini
│   │   ├── analytics/            # Follower & tweet analytics endpoints
│   │   │   └── viral/            # Viral content pattern analysis
│   │   ├── auth/[...all]/        # Better Auth catch-all route
│   │   ├── billing/              # Stripe checkout & webhook handlers
│   │   ├── chat/route.ts         # General AI chat endpoint (OpenRouter)
│   │   ├── diagnostics/          # System diagnostics endpoint
│   │   ├── inspiration/          # Tweet import & bookmark endpoints
│   │   │   └── bookmark/         # CRUD for inspiration bookmarks
│   │   ├── media/upload/         # File/media upload handler
│   │   ├── posts/                # Post CRUD, reschedule, retry
│   │   └── x/                   # X account management & health check
│   │       └── tweet-lookup/     # Public tweet import endpoint
│   ├── chat/                     # AI chat interface (protected)
│   ├── dashboard/                # Core app area (protected)
│   │   ├── affiliate/            # Affiliate tweet generator page
│   │   ├── ai/                   # AI writing tools hub page
│   │   │   └── agentic/          # Agentic Posting page (/dashboard/ai/agentic)
│   │   ├── analytics/            # Analytics dashboard page
│   │   │   └── viral/            # Viral Content Analyzer page
│   │   ├── calendar/             # Scheduling calendar page
│   │   ├── compose/              # Tweet/thread composer page
│   │   ├── drafts/               # Draft management page
│   │   ├── inspiration/          # Tweet import & inspiration page
│   │   ├── jobs/                 # Job run history & monitoring page
│   │   ├── onboarding/           # Onboarding wizard page
│   │   ├── queue/                # Post queue management page
│   │   └── settings/             # Account & connection settings page
│   ├── profile/                  # User profile page (protected)
│   └── layout.tsx                # Root layout
├── components/
│   ├── ai/                       # AI-powered components
│   │   ├── hashtag-generator.tsx # AI hashtag generator component
│   │   └── agentic-posting-client.tsx # Agentic Posting 3-screen UI (Input/Processing/Review)
│   ├── auth/                     # Authentication components
│   │   ├── sign-in-button.tsx    # X OAuth sign-in button (simplified)
│   │   ├── sign-out-button.tsx
│   │   └── user-profile.tsx
│   ├── analytics/                # Analytics-specific components
│   │   └── manual-refresh-button.tsx
│   ├── calendar/                 # Calendar components
│   │   └── reschedule-post-form.tsx
│   ├── composer/                 # Tweet/thread composer components
│   │   ├── ai-image-dialog.tsx   # AI image generation dialog (with progress bar)
│   │   ├── ai-tools-panel.tsx    # AI tools panel (Write/Hook/CTA/Rewrite/Translate/#Tags tabs)
│   │   ├── best-time-suggestions.tsx # Best time suggestions with loading skeleton
│   │   ├── composer.tsx
│   │   ├── sortable-tweet.tsx    # Draggable tweet card
│   │   ├── tweet-card.tsx        # Tweet card component (with link preview skeleton)
│   │   └── target-accounts-select.tsx
│   ├── dashboard/                # Dashboard layout components
│   │   └── sidebar.tsx
│   ├── inspiration/              # Inspiration feature components
│   │   ├── adaptation-panel.tsx  # Manual/AI adaptation panel
│   │   ├── imported-tweet-card.tsx # X-style tweet card
│   │   └── manual-editor.tsx     # Manual editor with similarity check
│   ├── onboarding/               # Onboarding wizard component
│   │   └── onboarding-wizard.tsx
│   ├── queue/                    # Queue management components
│   │   └── retry-post-button.tsx
│   ├── settings/                 # Settings page components
│   │   ├── connected-x-accounts.tsx
│   │   └── x-health-check-button.tsx
│   ├── ui/                       # shadcn/ui primitives
│   │   ├── alert.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── skeleton.tsx
│   │   ├── slider.tsx
│   │   ├── sonner.tsx
│   │   ├── spinner.tsx
│   │   ├── textarea.tsx
│   │   ├── mode-toggle.tsx       # Dark/light mode toggle
│   │   ├── progress.tsx
│   │   └── github-stars.tsx
│   ├── site-header.tsx           # Main navigation header
│   ├── site-footer.tsx           # Footer component
│   └── theme-provider.tsx        # Dark mode provider
└── lib/
    ├── ai/                       # AI types and prompt libraries
    │   ├── agentic-types.ts      # ResearchBrief, ContentPlan, AgenticTweet, PipelineProgressEvent
    │   ├── agentic-types.test.ts # Type shape validation tests
    │   └── agentic-prompts.ts    # Typed prompt builders for all 4 pipeline steps
    ├── queue/                    # BullMQ queue client and job processors
    │   ├── client.ts
    │   └── processors.ts
    ├── services/                 # External service integrations
    │   ├── agentic-pipeline.ts   # 5-step agentic pipeline service (Research→Strategy→Write→Images→Review)
    │   ├── agentic-pipeline.test.ts # Pipeline unit tests (5 tests)
    │   ├── ai-image.ts           # AI image generation via Replicate (+ generateAgenticImage)
    │   ├── analytics-engine.ts   # Analytics computation service
    │   ├── tweet-importer.ts     # Tweet import service with context
    │   ├── x-api.ts              # X (Twitter) API service
    │   └── analytics.ts          # Analytics service
    ├── security/                 # Security utilities
    │   └── token-encryption.ts   # AES-256 token encryption
    ├── auth.ts                   # Better Auth server config
    ├── auth-client.ts            # Better Auth client hooks
    ├── correlation.ts            # Correlation ID utilities
    ├── db.ts                     # Drizzle database connection
    ├── env.ts                    # Environment variable validation
    ├── logger.ts                 # Structured logger
    ├── plan-limits.ts            # Plan-based usage limits
    ├── rate-limiter.ts           # Redis-based rate limiting
    ├── schema.ts                 # Full Drizzle schema (all 15 tables)
    ├── session.ts                # Session helpers
    ├── storage.ts                # File storage abstraction (local / Vercel Blob)
    └── utils.ts                  # Shared utility functions (cn, etc.)
```

## Environment Variables

Required environment variables (see `env.example`):

```env
# Database
POSTGRES_URL=postgresql://user:password@localhost:5432/db_name

# Better Auth
BETTER_AUTH_SECRET=32-char-random-string
BETTER_AUTH_URL=http://localhost:3000

# X (Twitter) OAuth
TWITTER_CLIENT_ID=your-client-id
TWITTER_CLIENT_SECRET=your-client-secret

# X (Twitter) API Bearer Token — Required for Inspiration feature
# Get it from: https://developer.twitter.com/en/portal/dashboard -> Your App -> Keys and Tokens -> Bearer Token
TWITTER_BEARER_TOKEN=your-bearer-token-here

# Security — token encryption (comma-separated 32-byte keys, first is primary)
TOKEN_ENCRYPTION_KEYS=base64key1=,base64key2=

# AI via OpenRouter (primary AI provider)
OPENROUTER_API_KEY=sk-or-v1-your-key
OPENROUTER_MODEL=openai/gpt-4o  # REQUIRED — any model from openrouter.ai/models

# Google Gemini AI (for chat & inspiration features)
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key  # Alias for GEMINI_API_KEY

# Replicate API (for AI image generation)
REPLICATE_API_TOKEN=your-replicate-api-token
# REQUIRED — Replicate model identifiers (override to swap models without code changes)
REPLICATE_MODEL_FAST=google/nano-banana-2       # default/fast model (free + pro plans)
REPLICATE_MODEL_PRO=google/nano-banana-pro      # premium quality model (pro plans only)
REPLICATE_MODEL_FALLBACK=google/nano-banana     # auto-fallback on generation failure

# Optional - for vector search only
OPENAI_EMBEDDING_MODEL="text-embedding-3-large"

# Queue (Redis)
REDIS_URL="redis://127.0.0.1:6379"

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe (optional — required for billing features)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_MONTHLY=
STRIPE_PRICE_ID_ANNUAL=

# File Storage (optional — leave empty for local dev, set for Vercel Blob in production)
BLOB_READ_WRITE_TOKEN=

# Email (Resend) - Optional
# Get your API key from: https://resend.com/api-keys
# If not set, emails will be logged to console only
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Polar payment processing (optional)
POLAR_WEBHOOK_SECRET=
POLAR_ACCESS_TOKEN=
POLAR_SERVER=sandbox  # or "production"
```

## Available Scripts

```bash
pnpm dev                      # Start dev server (DON'T run this yourself — ask the user)
pnpm run worker               # Start the BullMQ background worker
pnpm build                    # Run migrations + Next.js production build
pnpm run build:ci             # Build without database (for CI/CD pipelines)
pnpm start                    # Start production server
pnpm lint                     # Run ESLint (ALWAYS run after changes)
pnpm typecheck                # TypeScript type checking (ALWAYS run after changes)
pnpm run check                # Run lint + typecheck together
pnpm run db:generate          # Generate database migrations
pnpm run db:migrate           # Run database migrations
pnpm run db:push              # Push schema changes to database
pnpm run db:studio            # Open Drizzle Studio (database GUI)
pnpm run db:reset             # Reset database (drop all tables)
pnpm test                     # Run Vitest unit tests
pnpm run smoke:full           # Full smoke test suite (boot → migrate → worker → test → teardown)
pnpm run tokens:rotate        # Rotate X API token encryption keys
pnpm run tokens:encrypt-access # One-time: encrypt existing plaintext X tokens
```

## AI Features Overview

AstraPost includes several AI-powered features to help users create, analyze, and optimize content:

### 1. AI Thread Writer
- **Endpoint**: `POST /api/ai/thread`
- **Purpose**: Generate Twitter threads from a topic
- **Tones**: Professional, casual, educational, inspirational, humorous, viral, controversial
- **Languages**: Arabic, English, French, German, Spanish, Italian, Portuguese, Turkish, Russian, Hindi
- **Thread Length**: 3-15 tweets (configurable)

### 2. AI Image Generation
- **Endpoint**: `POST /api/ai/image`
- **Service**: Replicate API (Flux models)
- **Purpose**: Generate AI images for tweets
- **Features**:
  - Style selection (Photorealistic, Anime, Digital Art, etc.)
  - Aspect ratio options (1:1, 16:9, 9:16)
  - Regional preferences (MENA optimized for Arabic users)
  - Direct integration with Composer

### 3. AI Hashtag Generator
- **Component**: `src/components/ai/hashtag-generator.tsx`
- **Purpose**: Generate relevant hashtags for tweet content
- **Features**:
  - Language-aware generation
  - Regional hashtag prioritization (MENA for Arabic)
  - Copy individual or all hashtags
  - Remove unwanted tags

### 4. AI Inspiration
- **Endpoint**: `POST /api/ai/inspire`
- **Service**: Google Gemini API
- **Purpose**: Generate content ideas based on topic and tone
- **Actions**: Rephrase, change tone, expand to thread, add takeaway, translate, counter-point

### 5. Inspiration Feature (Tweet Import)
- **Endpoint**: `POST /api/x/tweet-lookup`
- **Purpose**: Import public tweets from X/Twitter URLs
- **Features**:
  - Full tweet context (parent tweets, top replies)
  - Manual editor with similarity checking (Levenshtein distance)
  - AI-powered adaptation options
  - Bookmark system for saved inspirations
  - Direct send to Composer

### 6. Viral Content Analyzer
- **Endpoint**: `GET /api/analytics/viral?days=90`
- **Purpose**: Analyze top-performing tweets to identify viral patterns
- **Analysis Dimensions**:
  - Top hashtags with engagement rates
  - High-performing keywords (2-word phrases)
  - Tweet length performance (short/medium/long)
  - Best posting days and hours
  - Content type performance (questions, links, quotes, statistics, threads)
  - AI-generated actionable insights

### 7. Agentic Posting *(Pro/Agency only)*
- **Route**: `/dashboard/ai/agentic`
- **Endpoints**: `POST /api/ai/agentic` (SSE), `POST /api/ai/agentic/[id]/approve`, `POST /api/ai/agentic/[id]/regenerate`
- **Pipeline service**: `src/lib/services/agentic-pipeline.ts`
- **Types**: `src/lib/ai/agentic-types.ts`
- **Prompts**: `src/lib/ai/agentic-prompts.ts`
- **UI component**: `src/components/ai/agentic-posting-client.tsx`
- **Purpose**: Drop a topic — AI autonomously researches, plans, writes, generates images, and reviews a ready-to-publish post
- **5-step pipeline** (streamed via SSE):
  1. **Research** — viral angle analysis, MENA/Arabic cultural rules, broad-topic detection
  2. **Strategy** — tier-aware format selection (thread vs single tweet vs long post)
  3. **Write** — voice-profile-injected copywriting with per-format char limits
  4. **Images** — `generateAgenticImage()` wraps Replicate; persisted to `agentic-images/` via `upload()`
  5. **Review** — 8-point editorial checklist; `passed: true` requires score ≥ 6 + no violations
- **Three-screen UX**: Input → Processing (vertical timeline) → Review (editable cards + sticky action bar)
- **Approve actions**: Post Now / Schedule / Save Draft — creates standard `posts`/`tweets`/`media` rows via `db.transaction()`
- **Database**: `agenticPosts` table (migration `0038_tiny_rocket_raccoon.sql`)
- **Plan gate**: `checkAgenticPostingAccessDetailed` — Pro/Agency only, enforced via `aiPreamble`
- **Recovery**: GET `/api/ai/agentic` returns latest session; client auto-restores review/generating state on mount
- **Error handling**: Too-broad topic emits `needs_input` SSE + suggestion chips; 402 quota error shows date-aware reset message

## AI Tone & Style Options

The AI writer supports multiple tones for different content strategies:
- **Professional**: Business-focused, formal language
- **Casual**: Conversational, friendly tone
- **Educational**: Informative, teaching-oriented
- **Inspirational**: Motivational, uplifting content
- **Humorous**: Funny, entertaining posts
- **Viral**: Optimized for shareability and engagement
- **Controversial**: Thought-provoking, discussion-starting

## AI Language Support

AstraPost supports content generation in multiple languages:
- **Arabic (ar)**: Primary target language with RTL support
- **English (en)**: Default language
- **French (fr)**
- **German (de)**
- **Spanish (es)**
- **Italian (it)**
- **Portuguese (pt)**
- **Turkish (tr)**
- **Russian (ru)**
- **Hindi (hi)**

## Recent Fixes & Known Issues

### Fixed Issues (2026-04-08)

1. **AI Usage Double-Counting in Billing API**
   - **Root cause:** `GET /api/billing/usage` counted ALL `ai_generations` rows (including images) for `usage.ai`, while images were also tracked separately in `usage.aiImages` — double-counting images
   - **Fix:** Added `ne(aiGenerations.type, "image")` to the text-only AI count query
   - **Files:** `src/app/api/billing/usage/route.ts`

2. **4 Untracked AI Endpoints (No Quota Recording)**
   - **Root cause:** 4 endpoints called AI models but never called `recordAiUsage()`, making their consumption invisible to the billing system
   - **Endpoints fixed:**
     - `/api/ai/inspiration` — added `recordAiUsage(..., "inspiration", ...)` (only for non-cached responses)
     - `/api/user/voice-profile` — added `recordAiUsage(..., "voice_profile", ...)`
     - `/api/ai/agentic/[id]/regenerate` — added quota checks (`checkAiLimitDetailed` + `checkAiQuotaDetailed`) + `recordAiUsage` for both text (`"agentic_regenerate"`) and image (`"image"`) generations
     - `/api/chat` — added `onFinish` callback on `streamText` to `recordAiUsage(..., "chat", ...)` after stream completes
   - **Files:** `src/app/api/ai/inspiration/route.ts`, `src/app/api/user/voice-profile/route.ts`, `src/app/api/ai/agentic/[id]/regenerate/route.ts`, `src/app/api/chat/route.ts`

### Fixed Issues (2026-04-06)

1. **14-day Trial Unlimited Access Bug**
   - **Root cause:** All gate functions in `require-plan.ts` had `if (context.isTrialActive) return { allowed: true }` which bypassed ALL limits including quotas, giving trial users unlimited Agency-tier access for 14 days
   - **Fix:** Replaced blanket bypass with `effectivePlan` resolution — trial users now get Pro Monthly limits (100 AI text, 50 images, 3 accounts) instead of unlimited access. Added `TRIAL_EFFECTIVE_PLAN` constant in `plan-limits.ts` and `effectivePlan` field to `PlanContext` interface
   - **Files:** `src/lib/middleware/require-plan.ts`, `src/lib/plan-limits.ts`

2. **Pricing Page Misrepresentation**
   - Removed Instagram claims (not implemented anywhere in codebase)
   - Fixed "Multi-platform Support (X, LinkedIn, Instagram)" core feature to "X (Twitter) Scheduling"
   - Expanded feature lists: Free (3→7 items), Pro (5→15 items), Agency (5→7 items) to surface 17+ hidden features
   - Added 14-day trial banner on pricing page
   - Fixed annual savings from "~20%" to "17%"
   - Replaced "Priority Support for all plans" with "Community & Email Support"
   - **Files:** `src/components/billing/pricing-table.tsx`, `src/app/(marketing)/pricing/page.tsx`

### Fixed Issues (2026-03-31)

1. **Onboarding Infinite Loop**
   - **Root cause:** `onboarding-wizard.tsx` checked `currentStep === 5` to call `/api/user/onboarding-complete`, but the wizard only has 4 steps (`steps.length === 4`). The onboarding-complete API never fired, so `onboardingCompleted` stayed `false` and `OnboardingRedirect` kept redirecting to `/dashboard/onboarding`.
   - **Fix:** Changed condition to `currentStep === steps.length` (line 260 of `onboarding-wizard.tsx`)
   - Updated file: `src/components/onboarding/onboarding-wizard.tsx`

2. **Radix UI Hydration Mismatch (Dashboard Header + Onboarding)**
   - **Root cause:** `NotificationBell` and `UserProfile` in `dashboard-header.tsx` use Radix UI `DropdownMenu` (calls `useId()` internally) and were SSR'd, while `AccountSwitcher` was already wrapped with `dynamic({ ssr: false })`. This inconsistent SSR strategy shifted React's `useId()` counter between server and client, causing ALL downstream Radix components (including the onboarding wizard's `Select` dropdowns) to get mismatched IDs.
   - **Fix:** Wrapped both `NotificationBell` and `UserProfile` with `next/dynamic({ ssr: false })`. Added `<Suspense>` boundary around `OnboardingWizard` (which uses `useSearchParams()`).
   - Updated files: `src/components/dashboard/dashboard-header.tsx`, `src/app/dashboard/onboarding/page.tsx`

### Fixed Issues (2026-03-12)

### New Feature Implementations (March 2026)

1. **AI Image Generation** (Phase 2-3)
   - Created Replicate API integration (`src/lib/services/ai-image.ts`)
   - Added AI image dialog component (`src/components/composer/ai-image-dialog.tsx`)
   - Added image generation API endpoint (`src/app/api/ai/image/route.ts`)
   - Integrated with Composer for seamless workflow

2. **Inspiration Feature** (Phase 4-5)
   - Created tweet importer service (`src/lib/services/tweet-importer.ts`)
   - Added Inspiration page (`src/app/dashboard/inspiration/page.tsx`)
   - Created X-style tweet card component (`src/components/inspiration/imported-tweet-card.tsx`)
   - Created adaptation panel with Manual/AI tabs (`src/components/inspiration/adaptation-panel.tsx`)
   - Created manual editor with similarity checking (`src/components/inspiration/manual-editor.tsx`)
   - Added bookmark API endpoints (`src/app/api/inspiration/bookmark/`)
   - Added tweet lookup API endpoint (`src/app/api/x/tweet-lookup/route.ts`)

3. **AI Hashtag Generator** (Bonus Feature)
   - Created hashtag generator component (`src/components/ai/hashtag-generator.tsx`)
   - Updated AI Writer page with tabbed interface
   - Language-aware generation with regional prioritization

4. **Viral Content Analyzer** (Feature 3.10)
   - Created viral analysis API endpoint (`src/app/api/analytics/viral/route.ts`)
   - Created Viral Analyzer dashboard page (`src/app/dashboard/analytics/viral/page.tsx`)
   - Added to sidebar navigation
   - Multi-dimensional analysis: hashtags, keywords, length, timing, content types

### New Feature Implementations (April 2026)

1. **Agentic Posting** (`/dashboard/ai/agentic`) — Pro/Agency only
   - 5-step autonomous pipeline: Research → Strategy → Write → Images → Review
   - SSE streaming endpoint `POST /api/ai/agentic` emits step progress events
   - Approve endpoint creates standard posts/tweets/media in a single transaction
   - Three-screen UX: Input (topic + advanced options) → Processing (timeline) → Review (editable cards)
   - Too-broad topic detection with suggestion chips; session recovery on page reload
   - Full Vitest test suite: 23 tests across pipeline service, approve route, and type shapes
   - New DB table `agenticPosts` (migration `0038_tiny_rocket_raccoon.sql`)
   - New files: `src/lib/ai/agentic-types.ts`, `src/lib/ai/agentic-prompts.ts`, `src/lib/services/agentic-pipeline.ts`, `src/components/ai/agentic-posting-client.tsx`

2. **Compose Page UX Overhaul** (Phases 0–2, 2026-04-04–05)
   - **Phase 0**: 8 quick wins — auto-save label delay, char counter thresholds, etc.
   - **Phase 1**: Extracted `AiToolsPanel` component; replaced card-swap with accordion expand; removed redundant toolbar AI buttons; moved "Save as Template" to Content Tools card
   - **Phase 2-A**: Hashtag chips now inline only — panel closes after generation
   - **Phase 2-B**: Link preview loading skeleton in `TweetCard`
   - **Phase 2-C**: AI Image dialog replaced bare spinner with quadratic ease-out progress bar (0→90% over 15s, "Taking longer than usual…" after 25s)
   - **Phase 2-D**: `beforeunload` guard extended to also warn during active media uploads
   - **Phase 2-E**: Unified `DateTimePicker` component — date + time in one popover (replaces separate DatePicker + Select)
   - New files: `src/components/composer/ai-tools-panel.tsx`, `src/components/ui/date-time-picker.tsx`

### Bug Fixes

1. **Duplicate Pricing Pages**
   - Removed `src/app/(marketing)/pricing/page.tsx` (duplicate)
   - Kept `src/app/pricing/page.tsx` (Server Component with full layout)
   - Next.js error: "You cannot have two parallel pages that resolve to the same path"

2. **Next.js 16 Middleware Migration**
   - Migrated from deprecated `src/middleware.ts` to `src/proxy.ts`
   - Updated auth protection to use Next.js 16 proxy API
   - Added admin route protection (`/admin/*`) and improved redirect logic with callbackUrl

2. **Dynamic Route Conflicts**
   - Fixed conflicting dynamic routes in team API:
     - `src/app/api/team/invitations/[id]/` → removed (kept `[invitationId]/`)
     - `src/app/api/team/members/[id]/` → removed (kept `[memberId]/`)
   - These conflicts caused Next.js error: "You cannot use different slug names for the same dynamic path"
   - Newer implementations use `getTeamContext()` for better team authorization

3. **Analytics Query Error**
   - Fixed incorrectly defined `analytics` relation in `tweetRelations` (schema.ts)
   - Removed broken relation that caused SQL query failures in analytics worker

4. **TypeScript & ESLint**
   - Fixed unused imports in pricing components
   - Fixed `currentPlan` prop passing with conditional spread
   - All import order warnings auto-fixed with `pnpm lint --fix`

5. **X (Twitter) API Media Upload 403 Error** (2026-03-14)
   - Fixed 403 Forbidden errors when uploading media via X API
   - Root cause: Using deprecated v1.1 endpoint (`upload.twitter.com/1.1/media/upload.json`) which was sunset on June 9, 2025
   - Solution: Migrated to v2 chunked upload endpoints (`api.x.com/2/media/upload/*`)
   - Added `media.write` OAuth scope to configuration
   - Replaced `uploadMedia` method with proper v2 implementation using raw multipart body
   - Updated `next.config.ts` to use `serverExternalPackages` instead of deprecated `experimental.serverComponentsExternalPackages`
   - **Full documentation:** `docs/technical/x-api-media-upload-fix.md`
   - **Important:** All existing users must reconnect their X accounts to receive new OAuth tokens with `media.write` scope

6. **AI Image Generation 422 Error** (2026-03-14)
   - Fixed 422 Unprocessable Entity errors when generating images via Replicate API
   - Root cause: Using hardcoded version hash IDs that were invalid or outdated
   - Solution: Changed from version hashes to model owner/name format (`google/nano-banana-2`, `google/nano-banana-pro`)
   - This approach always uses the latest stable version of the models
   - Models now working: `google/nano-banana-2` (Gemini 2.5 Flash), `google/nano-banana-pro` (Gemini 3 Pro)
   - **Full documentation:** `docs/technical/ai-image-replicate-fix.md`

### TypeScript Errors in `.next/dev/types/validator.ts`

TypeScript may show errors in `.next/dev/types/validator.ts` when running `pnpm typecheck`. These are:
- **Generated files** from Next.js 16 + Turbopack
- **Known issues** with the current Next.js version
- **Not actual code errors** - they resolve once the dev server boots properly

If you see these errors, start the dev server:
```bash
pnpm dev
```

The errors should clear after Next.js generates fresh types.

## Documentation Files

The project includes technical documentation in `docs/`:

- `docs/business/starter-prompt.md` — AstraPost business context for AI prompts
- `docs/technical/react-markdown.md` — Markdown rendering guide
- `docs/technical/x-api-media-upload-fix.md` — X (Twitter) API media upload 403 fix documentation
- `docs/technical/ai-image-replicate-fix.md` — AI Image Generation Replicate API model fix documentation
- `docs/replicate_api_i2i_nano-banana-pro.md` — Replicate Nano Banana Pro model API reference
- `docs/enhancments.md` — Planned enhancements and roadmap

## Guidelines for AI Assistants

### CRITICAL RULES

1. **ALWAYS run lint and typecheck** after completing changes:

   ```bash
   pnpm lint && pnpm typecheck
   ```

2. **NEVER start the dev server yourself**

   - If you need dev server output, ask the user to provide it
   - Don't run `pnpm dev` or `npm run dev`

3. **Use OpenRouter, NOT OpenAI directly**

   - Import from `@openrouter/ai-sdk-provider`
   - Use `openrouter()` function, not `openai()`
   - Model names follow OpenRouter format: `provider/model-name`

4. **NEVER hardcode AI model names in code** *(enforced 2026-04-01)*

   - All AI model identifiers must come from environment variables — no hardcoded strings, no `|| "fallback-model"` patterns
   - OpenRouter model: always `process.env.OPENROUTER_MODEL!` (required env var)
   - Replicate image models: always `process.env.REPLICATE_MODEL_FAST!`, `REPLICATE_MODEL_PRO!`, `REPLICATE_MODEL_FALLBACK!`
   - The mapping from internal logical names → provider identifiers lives exclusively in `src/lib/services/ai-image.ts` (`startImageGeneration()`)
   - Adding a new AI model = add it to `.env` + `env.ts` + the mapping function — never as a literal string in a route

5. **Styling Guidelines**

   - Stick to standard Tailwind CSS utility classes
   - Use shadcn/ui color tokens (e.g., `bg-background`, `text-foreground`)
   - Avoid custom colors unless explicitly requested
   - Support dark mode with appropriate Tailwind classes

6. **Authentication**

   - Server-side: Import from `@/lib/auth` (Better Auth instance)
   - Client-side: Import hooks from `@/lib/auth-client`
   - Protected routes should check session in Server Components
   - Use existing auth components from `src/components/auth/`

7. **Database Operations**

   - Use Drizzle ORM (imported from `@/lib/db`)
   - Schema is defined in `@/lib/schema`
   - Always run migrations after schema changes
   - PostgreSQL is the database (not SQLite, MySQL, etc.)
   - Key tables: `posts`, `tweets`, `x_accounts`, `job_runs`, `tweet_analytics`, `subscriptions`

8. **Queue & Worker**

   - BullMQ client is in `src/lib/queue/client.ts`
   - Job processors are in `src/lib/queue/processors.ts`
   - The worker runs as a separate process via `pnpm run worker`
   - Use `TWITTER_DRY_RUN=1` for testing without posting to real X

9. **Security**

   - X OAuth tokens are encrypted at rest — never store them as plaintext
   - Encryption logic is in `src/lib/security/token-encryption.ts`
   - Use `TOKEN_ENCRYPTION_KEYS` for key management and rotation

10. **File Storage**

   - Use the storage abstraction from `@/lib/storage`
   - Automatically uses local storage (dev) or Vercel Blob (production)
   - Import: `import { upload, deleteFile } from "@/lib/storage"`
   - Example: `const result = await upload(buffer, "avatar.png", "avatars")`
   - Storage switches based on `BLOB_READ_WRITE_TOKEN` environment variable

11. **API Routes**
    - Follow Next.js 16 App Router conventions
    - Use Route Handlers (`route.ts` files)
    - Return `Response` objects
    - Attach correlation IDs on scheduling-related endpoints via `src/lib/correlation.ts`

12. **AI Service Integration**
    - **OpenRouter**: Use for most AI features (thread writer, translation, etc.)
      - Import from `@openrouter/ai-sdk-provider`
      - Model format: `provider/model-name` (e.g., `openai/gpt-4o`)
    - **Google Gemini**: Use for chat and inspiration features
      - Requires `GEMINI_API_KEY` environment variable
      - Import from `@ai-sdk/google`
    - **Replicate**: Use for AI image generation
      - Requires `REPLICATE_API_TOKEN` environment variable
      - Requires `REPLICATE_MODEL_FAST`, `REPLICATE_MODEL_PRO`, `REPLICATE_MODEL_FALLBACK` env vars
      - Model identifiers are fully controlled via `.env` — never hardcode them in code
      - Model mapping lives in `startImageGeneration()` in `src/lib/services/ai-image.ts`

13. **Twitter/X API Integration**
    - For OAuth: Use existing `x-api.ts` service with encrypted tokens
    - For public data: Use `TWITTER_BEARER_TOKEN` environment variable
    - Tweet importer service (`tweet-importer.ts`) handles:
      - URL parsing for various X URL formats
      - Full conversation context retrieval
      - Redis caching (1-hour TTL)
      - Rate limit handling

14. **Plan-Based Limits**
    - Use `src/lib/plan-limits.ts` for feature restrictions
    - Free plan: Limited AI credits, 5 inspiration bookmarks
    - Pro/Agency: Unlimited features
    - Always check limits before resource-intensive operations
    - **IMPORTANT:** Plan information comes from TWO sources — `user.plan` column (manual override, always wins) and `subscriptions` table (Stripe billing records)
    - For admin comped accounts or manual upgrades, set `user.plan` directly in the database — see [docs/technical/admin-access.md](docs/technical/admin-access.md#manual-plan-overrides-admin-comped-accounts) for details

15. **API Error Responses** *(architectural rule — do not bypass)*
    - Always use `ApiError` from `@/lib/api/errors` for error responses in route handlers:
      ```typescript
      import { ApiError } from "@/lib/api/errors";
      if (!session) return ApiError.unauthorized();
      if (!post)    return ApiError.notFound("Post");
      if (!allowed) return ApiError.forbidden("Viewers cannot edit posts");
      ```
    - Never write `new Response(JSON.stringify({ error: "..." }), { status: N })` inline
    - Never write `NextResponse.json({ error: "..." }, { status: N })` inline
    - This ensures consistent error shape, status codes, and wording across all routes

16. **Multi-Table Writes Must Use Transactions** *(data integrity rule)*
    - Any route handler that writes to **more than one table** in a single request MUST wrap all writes in `db.transaction()`:
      ```typescript
      await db.transaction(async (tx) => {
        await tx.insert(posts).values(postRow);
        await tx.insert(tweets).values(tweetRows);
        await tx.insert(media).values(mediaRows);
      });
      ```
    - This prevents orphaned records if an insert fails partway through
    - Code review trigger: if you see two `db.insert()` / `db.delete()` calls in the same handler without a `db.transaction()` wrapper, it's a bug

17. **`getPlanLimits()` in Route Handlers Is a Bug**
    - Route handlers must NEVER call `getPlanLimits()` or `normalizePlan()` directly
    - All plan/quota enforcement must go through `require-plan.ts` helpers (`checkXFeatureDetailed`, `checkAiQuotaDetailed`, etc.)
    - If you need a new gate, add a `makeFeatureGate()` call in `require-plan.ts`
    - Direct use of `getPlanLimits` in a route file bypasses trial-period logic and standardised 402 responses

18. **Shared Zod Schemas**
    - Route-specific schemas live in the route file
    - Schemas used by 2+ routes belong in `src/lib/schemas/common.ts`
    - Shared enums (language, tone) are in `src/lib/constants.ts` — import from there, never re-declare inline

### Best Practices

- Read existing code patterns before creating new features
- Maintain consistency with the established file structure
- Always run `pnpm run check` before considering a task complete
- When modifying AI functionality, ensure OpenRouter is used (not direct OpenAI)
- Keep the BullMQ worker and Next.js app in sync on job payload types

### UI/UX Navigation Rules (MANDATORY)

These rules exist to prevent orphaned pages and navigation redundancy. Apply them on every new page or feature.

1. **Every `/dashboard/*` route needs a sidebar entry** — every page under `/dashboard/` must either have its own entry in `sidebarSections` (in `src/components/dashboard/sidebar.tsx`) or be reachable via a page that does. Never create a page without a navigation path. Orphaned pages waste development effort and confuse users.

2. **Sidebar is the single source of truth for navigation** — if a page is linked from a hub/overview card, it must still have its own sidebar entry (or the hub must be the sidebar entry, not both). Never have two sidebar items pointing at parent/child pages where one is just a link to the other.

3. **Hub pages are supplementary, not primary nav** — overview/launcher pages (like `/dashboard/ai`) are useful for discovery but their cards must not duplicate what is already directly accessible in the sidebar at the same level. Hub → page is one path; sidebar entry is the other. Pick one per tool, not both.

4. **Use `DashboardPageWrapper` for every dashboard page** — all pages under `/dashboard/` must use `<DashboardPageWrapper icon={...} title="..." description="...">` from `@/components/dashboard/dashboard-page-wrapper`. Never wrap a dashboard page in a raw `<div>`. This ensures consistent header styling, spacing, and layout across the entire app.

### Common Tasks

**Adding a new dashboard page:**

1. Create `src/app/dashboard/[route]/page.tsx`
2. Use Server Components by default; add `"use client"` only if needed
3. Wrap page content in `<DashboardPageWrapper icon={...} title="..." description="...">` — never a raw `<div>`
4. Add the route to `sidebarSections` in `src/components/dashboard/sidebar.tsx` — no exceptions
5. If the page is a sub-tool of a hub page, the hub must be the sidebar entry; do not list both the hub AND the sub-tool as peer sidebar items

**Adding a new API route:**

1. Create `src/app/api/[route]/route.ts`
2. Export HTTP method handlers (`GET`, `POST`, etc.)
3. Return `Response` objects with proper TypeScript types
4. Add correlation ID header where appropriate

**Adding authentication to a page:**

1. Import auth instance: `import { auth } from "@/lib/auth"`
2. Get session: `const session = await auth.api.getSession({ headers: await headers() })`
3. Redirect unauthenticated users with `redirect("/login")`

**Working with the database:**

1. Update schema in `src/lib/schema.ts`
2. Generate migration: `pnpm run db:generate`
3. Apply migration: `pnpm run db:migrate`
4. Import `db` from `@/lib/db` to query

**Adding a new BullMQ job type:**

1. Define the job payload type in `src/lib/queue/client.ts`
2. Add a processor handler in `src/lib/queue/processors.ts`
3. Enqueue jobs from the relevant API route
4. Write a `job_runs` record with `correlationId` for observability

**Working with file storage:**

1. Import: `import { upload, deleteFile } from "@/lib/storage"`
2. Upload: `const result = await upload(fileBuffer, "filename.png", "folder")`
3. Delete: `await deleteFile(result.url)`
4. Local files are saved to `public/uploads/` and served at `/uploads/`

## Package Manager

This project uses **pnpm** (see `pnpm-lock.yaml`). When running commands:

- Use `pnpm` instead of `npm` where possible
- Scripts defined in `package.json` work with `pnpm run [script]`

### Code Initial Test
To test the initial functionality of the code, run the following command:
`pnpm lint && pnpm typecheck`