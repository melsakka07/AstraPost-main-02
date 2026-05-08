# AstraPost Architecture

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth: login, register, forgot/reset password
│   ├── (marketing)/              # Public: blog, changelog, community, docs, features, pricing, legal
│   ├── admin/                    # Admin panel (Dashboard, Users, Billing, System Health, Jobs, Notifications, Audit)
│   ├── brand/                    # Internal brand kit reference page (noindex)
│   ├── api/
│   │   ├── admin/                # Admin APIs (Subscribers, AI Usage, Teams, Impersonation, Billing Analytics, Notifications)
│   │   ├── ai/                   # AI endpoints (Thread, Inspire, Image, Agentic, Calendar, Tools, Translate, Affiliate, Score, PDF-to-Thread, YouTube-to-Thread)
│   │   ├── analytics/            # Analytics (Followers, Engagement, Best Time, Competitor, Export)
│   │   ├── announcement/         # Public announcements
│   │   ├── auth/[...all]/        # Better Auth catch-all
│   │   ├── billing/              # Stripe checkout & webhooks, change-plan preview
│   │   ├── chat/                 # AI chat
│   │   ├── community/contact/    # Contact form
│   │   ├── cron/                 # Scheduled jobs (Billing cleanup)
│   │   ├── diagnostics/          # System diagnostics
│   │   ├── feedback/             # Roadmap feedback
│   │   ├── inspiration/          # Tweet import & bookmarks
│   │   ├── media/upload/         # File upload (Images, Videos)
│   │   ├── posts/                # Post CRUD, reschedule, retry, bulk upload
│   │   ├── team/                 # Team management (Invite, Join, Members)
│   │   ├── user/                 # User profile, preferences, voice-profile, referrals
│   │   └── x/                    # X account management, subscription tier sync & tweet lookup
│   ├── chat/                     # AI chat interface
│   ├── dashboard/                # Core app: achievements, affiliate, ai, analytics, calendar, compose, drafts, inspiration, jobs, onboarding, queue, referrals, settings, youtube-to-thread
│   ├── go/[shortCode]/           # Affiliate link redirect
│   ├── join-team/                # Team invitation landing page
│   └── profile/                  # User profile public view
├── components/
│   ├── admin/                    # Admin components (Dashboard, Tables, Sidebars, Modals)
│   ├── ai/                       # AI components (Hashtag Generator, Agentic Posting, PDF to Thread)
│   ├── analytics/                # Analytics components (Charts, Heatmaps, Drawers)
│   ├── auth/                     # Auth components (Sign-in, Profile)
│   ├── billing/                  # Billing components (Pricing cards, Payment forms)
│   ├── brand/                    # Brand primitives (Logo lockup, LogoMark sparkle, made-with-astrapost-footer, index)
│   ├── calendar/                 # Calendar components (Grid, Event cards)
│   ├── community/                # Community components (Contact form)
│   ├── composer/                 # Composer (Editor, Preview, AI Tools Panel, Best Time, Alerts)
│   ├── dashboard/                # Dashboard layout (Sidebar, Header, Bottom Nav, Banners)
│   ├── drafts/                   # Draft components
│   ├── email/                    # Email templates (React Email)
│   ├── gamification/             # Gamification components (Badges, Progress)
│   ├── inspiration/              # Inspiration components (Adaptation panel, Imported tweet card)
│   ├── jobs/                     # Job tracking components
│   ├── marketing/                # Marketing components (Hero, Features)
│   ├── onboarding/               # Onboarding components (Wizard, Tour)
│   ├── queue/                    # Queue components (List, Post cards)
│   ├── referral/                 # Referral components (Cookie processor, Links table)
│   ├── roadmap/                  # Roadmap components (Feedback list, Submit modal)
│   ├── settings/                 # Settings components (Profile form, Voice profile, Plan usage, Accounts)
│   └── ui/                       # shadcn/ui primitives
└── lib/
    ├── admin/                    # Admin utilities & middleware
    ├── ai/                       # AI prompts (summarize, template, inspire, agentic, arabic), voice-profile, PII redaction, prompt-injection defense, language blocks, text-fit, hashtag banlist, retry/timeout helpers
    ├── api/                      # API error handling, AI preamble
    ├── middleware/               # Plan gates, role checks
    ├── queue/                    # BullMQ client + processors
    ├── referral/                 # Referral utilities
    ├── schemas/                  # Shared Zod validation schemas
    ├── security/                 # Token encryption
    ├── services/                 # Business logic (Agentic, AI Image, Analytics, AI Quota Atomic, Moderation, Email, Plan Metadata, Stripe, X-API)
    ├── utils/                    # General utilities (cn, date formatting, time windows)
    └── tokens.ts                 # Color token constants (6 scales × 12 steps × 2 modes, charts, brand)
```

### Design Tokens

Color system in `src/app/globals.css` — 6 Radix-derived OKLCH scales (neutral, brand, info, success, warning, danger) at 12 calibrated steps per mode. 21 semantic tokens feed shadcn/ui. Raw scale utilities: `bg-brand-9`, `text-success-11`, `border-danger-6`, etc. `src/lib/tokens.ts` exposes hex constants via `as const` tuples for runtime contexts (Recharts, OG images, transactional emails). Regenerate via the Node.js script in `src/lib/tokens.ts`.

**Scales:** neutral (slate), brand (indigo #3E63DD), info (blue #0090FF), success (green #46A758), warning (amber #FFC53D), danger (red #E5484D).

```

## Key Implementation Files

### AI Endpoints

- `src/app/api/ai/thread/route.ts` — Thread writer (OpenRouter)
- `src/app/api/ai/bio/route.ts` — Bio Optimizer (generates 3 X bio variants)
- `src/app/api/ai/image/route.ts` — Image generation (Replicate via Nano Banana)
- `src/app/api/ai/image/quota/route.ts` — Image quota read endpoint (used by sidebar usage meter)
- `src/app/api/ai/score/route.ts` — Viral Score evaluator
- `src/app/api/ai/agentic/route.ts` — Agentic SSE streaming
- `src/app/api/ai/agentic/[id]/approve/route.ts` — Approve agentic post to queue
- `src/app/api/ai/agentic/[id]/regenerate/route.ts` — Regenerate single tweet in agentic pipeline
- `src/app/api/ai/tools/route.ts` — General AI writing tools (Hooks, CTAs, Rewrite)
- `src/app/api/ai/translate/route.ts` — Translation service
- `src/app/api/ai/calendar/route.ts` — AI Content Calendar generator
- `src/app/api/chat/route.ts` — Conversational AI assistant
- `src/app/api/ai/quota/route.ts` — Usage tracking read endpoint
- `src/app/api/ai/pdf-to-thread/upload/route.ts` — PDF upload + text extraction
- `src/app/api/ai/pdf-to-thread/generate/route.ts` — Sync thread generation from PDF
- `src/app/api/ai/pdf-to-thread/enqueue/route.ts` — Async PDF thread enqueue to BullMQ
- `src/app/api/ai/pdf-to-thread/[jobId]/route.ts` — Job status poll + cancel
- `src/app/api/ai/youtube-to-thread/route.ts` — YouTube URL validation + metadata preview + job enqueue
- `src/app/api/ai/youtube-to-thread/[jobId]/route.ts` — Job status poll + result + cancel
- `src/app/api/ai/youtube-to-thread/history/route.ts` — Last 5 ready jobs for user
- `src/app/api/ai/youtube-to-thread/capabilities/route.ts` — Available transcription providers

### Core Services

- `src/lib/services/ai-quota.ts` — AI usage recording and retrieval
- `src/lib/services/ai-quota-atomic.ts` — Atomic quota consumption with race-condition prevention + admin grant fallback
- `src/lib/services/ai-image.ts` — Image generation orchestration
- `src/lib/services/moderation.ts` — Pre-publish content moderation
- `src/lib/services/agentic-pipeline.ts` — 5-step autonomous pipeline (Research→Strategy→Write→Images→Review)
- `src/lib/services/x-api.ts` — Twitter/X API client with per-account distributed lock token refresh
- `src/lib/services/x-error.ts` — Token refresh error classification (permanent/transient/rate-limited) + exponential backoff
- `src/lib/services/x-circuit-breaker.ts` — Redis-based circuit breaker for X API (opens after N consecutive permanent failures)
- `src/lib/services/youtube.ts` — YouTube URL parsing + metadata via yt-dlp, `getVideoInfo()`, `extractAudio()`
- `src/lib/services/transcription.ts` — Deepgram + Whisper adapter, cost calculation, provider routing
- `src/lib/queue/processors.ts` — BullMQ job execution (Publishing, Analytics, Token Health, X Tier Refresh, PDF-to-Thread, YouTube-to-Thread)

### BullMQ Processors

- `youtubeThreadProcessor` in `src/lib/queue/processors.ts` — 5-phase pipeline: download audio (yt-dlp) → transcribe (Deepgram/Whisper) → generate thread (OpenRouter) → moderation check → persist result

### AI Security & Quality Modules

- `src/lib/ai/untrusted.ts` — `wrapUntrusted()` + `JAILBREAK_GUARD` for prompt-injection defense
- `src/lib/ai/pii.ts` — PII redaction (email, phone, credit card, IBAN)
- `src/lib/ai/input-limits.ts` — Centralized character limits for user-supplied inputs
- `src/lib/ai/language.ts` — `buildLanguageBlock()` for centralized language instructions
- `src/lib/ai/text-fit.ts` — `fitTweet()` / `splitThread()` server-side char-count enforcement
- `src/lib/ai/hashtags.ts` — Hashtag banlist + MENA-bias filter
- `src/lib/ai/with-retry.ts` — Exponential backoff retry wrapper
- `src/lib/ai/with-timeout.ts` — `AbortSignal.timeout` wrapper
- `src/lib/api/idempotency.ts` — Redis-backed idempotency middleware for AI routes

### Auth & Authorization

- `src/lib/auth.ts` — Better Auth configuration
- `src/lib/team-context.ts` — Multi-account context resolver
- `src/lib/middleware/require-plan.ts` — Subscription feature gates
- `src/lib/admin.ts` — Admin role verification
```
