# AstraPost Architecture

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth: login, register, forgot/reset password
│   ├── (marketing)/              # Public: blog, changelog, community, docs, features, legal, pricing, resources, roadmap
│   ├── admin/                    # Admin panel (Dashboard, Users, Billing, System Health, Jobs, Notifications, Audit)
│   ├── brand/                    # Internal brand kit reference page (noindex)
│   ├── api/
│   │   ├── accounts/             # Connected social accounts (Instagram, LinkedIn)
│   │   ├── admin/                # Admin APIs (Subscribers, AI Usage, Teams, Impersonation, Billing Analytics, Notifications, Announcements, Activity Feed, Feature Flags, Promo Codes, Webhooks)
│   │   ├── affiliate/            # Affiliate link management
│   │   ├── ai/                   # AI endpoints (Thread, Inspire, Image, Agentic, Calendar, Tools, Translate, Affiliate, Score, PDF-to-Thread, YouTube-to-Thread, Hashtags, Reply, Summarize, Bio, Variants, Template-Generate, Trends, Refine, Feedback, Enhance-Topic, Thread-First-Image)
│   │   ├── analytics/            # Analytics (Followers, Engagement, Best Time, Competitor, Export)
│   │   ├── announcement/         # Public announcements
│   │   ├── auth/[...all]/        # Better Auth catch-all
│   │   ├── billing/              # Stripe checkout & webhooks, change-plan preview
│   │   ├── changelog/            # Changelog entries
│   │   ├── chat/                 # AI chat
│   │   ├── community/            # Contact form
│   │   ├── cron/                 # Scheduled jobs (Billing cleanup, AI cost alarm, AI counter rollover, Analytics cleanup, Trial expiry warning)
│   │   ├── diagnostics/          # System diagnostics
│   │   ├── feedback/             # Roadmap feedback
│   │   ├── inspiration/          # Tweet import & bookmarks
│   │   ├── instagram/            # Instagram OAuth (auth + callback)
│   │   ├── linkedin/             # LinkedIn OAuth (auth + callback)
│   │   ├── link-preview/         # Link preview generation
│   │   ├── log/                  # Client-side log ingestion
│   │   ├── media/                # File upload (Images, Videos)
│   │   ├── notifications/        # User notifications
│   │   ├── posts/                # Post CRUD, reschedule, retry, bulk upload
│   │   ├── queue/                # Queue SSE (real-time job status)
│   │   ├── referral/             # Referral tracking
│   │   ├── team/                 # Team management (Invite, Join, Members)
│   │   ├── templates/            # Agentic app templates
│   │   ├── user/                 # User profile, preferences, voice-profile, referrals
│   │   └── x/                    # X account management, subscription tier sync & tweet lookup
│   ├── chat/                     # AI chat interface
│   ├── dashboard/                # Core app: achievements, admin, affiliate, ai, analytics, calendar, compose, drafts, inspiration, jobs, onboarding, queue, referrals, settings
│   ├── go/[shortCode]/           # Affiliate link redirect
│   ├── join-team/                # Team invitation landing page
│   └── profile/                  # User profile public view
├── components/
│   ├── admin/                    # Admin components (Dashboard, Tables, Sidebars, Modals)
│   ├── affiliate/                # Affiliate components
│   ├── ai/                       # AI components (Hashtag Generator, Agentic Posting, PDF to Thread)
│   ├── analytics/                # Analytics components (Charts, Heatmaps, Drawers)
│   ├── auth/                     # Auth components (Sign-in, Profile)
│   ├── billing/                  # Billing components (Pricing cards, Payment forms)
│   ├── brand/                    # Brand primitives (Logo lockup, LogoMark sparkle, made-with-astrapost-footer, index)
│   ├── calendar/                 # Calendar components (Grid, Event cards)
│   ├── community/                # Community components (Contact form)
│   ├── composer/                 # Composer — thin 345-line shell (composer.tsx) orchestrating focused hooks (use-composer-{drafts,ai,data,publish,tweets,shortcuts,media,bridge}.ts) + subcomponents (composer-{editor,preview,ai-tools,dialogs,publishing-panel,alerts}.tsx); pure logic in composer-utils.ts
│   ├── dashboard/                # Dashboard layout (Sidebar, Header, Bottom Nav, Banners)
│   ├── drafts/                   # Draft components
│   ├── email/                    # Email templates (React Email)
│   ├── gamification/             # Gamification components (Badges, Progress)
│   ├── inspiration/              # Import & Adapt — thin 140-line shell (../app/dashboard/inspiration/page.tsx) orchestrating focused hooks (use-inspiration-{import,history,bookmarks,tabs,composer-bridge}.ts) + subcomponents (inspiration-{import-panel,history-list,bookmarks-list}.tsx, adaptation-panel, imported-tweet-card); pure logic in inspiration-utils.ts
│   ├── jobs/                     # Job tracking components
│   ├── marketing/                # Marketing components (Hero, Features)
│   ├── onboarding/               # Onboarding components (Wizard, Tour)
│   ├── queue/                    # Queue components (List, Post cards)
│   ├── referral/                 # Referral cookie processor
│   ├── referrals/                # Referral components (Links table)
│   ├── roadmap/                  # Roadmap components (Feedback list, Submit modal)
│   ├── settings/                 # Settings components (Profile form, Voice profile, Plan usage, Accounts)
│   └── ui/                       # shadcn/ui primitives
└── lib/
    ├── admin/                    # Admin utilities & middleware
    ├── ai/                       # AI prompts (summarize, template, inspire, agentic, arabic, length), voice-profile, PII redaction, prompt-injection defense, language blocks, text-fit, hashtag banlist, retry/timeout helpers, agentic types
    ├── api/                      # API error handling, AI preamble, idempotency
    ├── middleware/               # Plan gates, role checks
    ├── queue/                    # BullMQ client + processors
    ├── referral/                 # Referral utilities
    ├── schemas/                  # Shared Zod validation schemas
    ├── security/                 # Token encryption
    ├── services/                 # Business logic (Agentic, AI Image, Analytics, AI Quota, Moderation, Email, Plan Metadata, Stripe, X-API, Instagram, LinkedIn, YouTube, Transcription, Circuit Breaker, Notifications)
    ├── utils/                    # General utilities (cn, date formatting, time windows)
    └── tokens.ts                 # Color token constants (6 scales × 12 steps × 2 modes, charts, brand)
```

### Design Tokens

Color system in `src/app/globals.css` — 6 Radix-derived OKLCH scales (neutral, brand, info, success, warning, danger) at 12 calibrated steps per mode. 21 semantic tokens feed shadcn/ui. Raw scale utilities: `bg-brand-9`, `text-success-11`, `border-danger-6`, etc. `src/lib/tokens.ts` exposes hex constants via `as const` tuples for runtime contexts (Recharts, OG images, transactional emails). Regenerate via the Node.js script in `src/lib/tokens.ts`.

**Scales:** neutral (slate), brand (indigo #3E63DD), info (blue #0090FF), success (green #46A758), warning (amber #FFC53D), danger (red #E5484D).

### Internationalization (i18n)

Uses `next-intl` (ar/en). Message files live in `src/i18n/messages/{en,ar,pseudo}.json`. Two primary namespaces:

- **User-facing** — keys spread across `compose.*`, `ai.*`, `settings.*`, `dashboard.*`, `analytics.*`, `inspiration.*`, `drafts.*`, `calendar.*`, `onboarding.*`, `queue.*`, `affiliate.*`, `billing.*`, `nav.*`, `roadmap.*`, `common.*`
- **Admin (internal)** — `admin.*` namespace (~210 keys, added Wave 7 Task B), covering billing dialogs, roadmap table, notifications editor, health dashboard, admin dashboard, audit log table, date range picker, team dashboard, subscribers, feature flags, announcement form, activity feed, and error states

Components wire translations via `useTranslations()` from `next-intl`. All dropdown labels, table headers, button text, placeholders, aria-labels, and toast messages use `t()` calls — no hardcoded English strings in UI.

### Mobile / Responsive Patterns

**Touch targets (WCAG 2.5.5):** All primary interactive elements meet the 44px minimum. Button `icon-md` and `lg` variants are 44px. Inputs and SelectTriggers use `h-11 md:h-10` (44px mobile, 40px desktop). TabsTriggers have `min-h-11`. DropdownMenu items have increased padding for adequate touch area. Checkbox visual size is 20px.

**ResponsiveTable pattern:** All data tables wrap in `overflow-x-auto` — no horizontal page scroll at narrow viewports. Admin tables (affiliate-leaderboard, notification-history-table, agentic-sessions-table, impersonation-table, audit-log, teams, promo-codes, feature-flags, referrals, roadmap, ai-cost-charts, users-table, billing-overview, ai-usage, team-members-list, recent-affiliate-links) all follow this pattern.

**Safe-area pattern:** All mobile overlays and fixed-position elements include safe-area inset padding. `pb-safe` utility is applied to SheetContent, Admin mobile sidebar, and other bottom-fixed elements. Dialogs use `max-h-[calc(100dvh-2rem)]` with `overflow-y-auto` to stay within the viewport on notched devices.

**Mobile-first sizing:** Form controls use the `h-11 md:h-10` pattern — 44px touch target on mobile, 40px on desktop where precision matters more than tap area. AdminPageWrapper uses responsive spacing parity with DashboardPageWrapper.

### Accessibility

Accessibility patterns are applied repo-wide, building on Radix primitives' built-in a11y and verified against WCAG 2.1 AA.

**Keyboard:** All interactive components support full keyboard traversal with visible focus rings. Radix primitives (Dialog, Sheet, Drawer, DropdownMenu, CommandPalette) provide focus traps, Esc close, and arrow key navigation. Arrow key navigation is extended in CommandPalette (Up/Down/Home/End/Enter with `scrollIntoView`). Focus ring styles use `focus-visible:` (not `focus:`) to avoid rings on mouse clicks. Skip-to-content links are present in both dashboard and admin layouts.

**ARIA & semantics:** Icon-only buttons carry `aria-label` (pagination prev/next, theme switcher, MoreHorizontal dropdowns). Active navigation links carry `aria-current="page"`. Screen-reader-only text (`sr-only`) labels icon-only actions (e.g. roadmap "Actions" trigger). Heading hierarchy follows h1 per page via DashboardPageWrapper / AdminPageWrapper. `aria-live` regions are present on toasts, AI progress, pagination status, and upsell banners.

**Contrast:** Color tokens are OKLCH-calibrated to meet AA 4.5:1 (text) / 3:1 (large+UI) in both light and dark modes. The `--destructive` token lightness was lowered (0.626 to 0.556) in light mode to meet 4.5:1 on `--background`. Opacity modifiers on `text-muted-foreground` were removed from sidebar section headers (dashboard, admin, collapsible) and the agentic drag handle was increased from `/40` to `/70`.

**Motion:** A blanket `prefers-reduced-motion` kill-switch in `globals.css` neutralizes all animations (transitions, transforms, opacity fades) for users who request reduced motion. No per-component motion toggles are needed.

### Dashboard Sidebar IA

The dashboard sidebar (defined in `src/components/dashboard/sidebar-nav-data.ts`) is organized into 4 sections for regular users: **Overview** (Dashboard), **Create** (Compose, Drafts, Schedule -- merged Queue + Calendar with `?view=list|month|week|day` view tabs), **Grow** (Analytics, AI Tools, Inspiration, Agentic Posting), and **Account** (Settings, Achievements, Referrals, Affiliate Dashboard). Admin users see an additional **Admin** section (Jobs, History) appended below Account. The old `/dashboard/queue` and `/dashboard/calendar` routes redirect to `/dashboard/schedule` with query-param preservation. Mobile bottom nav surfaces the Create, Grow, and Account sections.

```

## Key Implementation Files

### AI Endpoints

- `src/app/api/ai/thread/route.ts` — Thread writer (OpenRouter)
- `src/app/api/ai/bio/route.ts` — Bio Optimizer (generates 3 X bio variants)
- `src/app/api/ai/image/route.ts` — Image generation (Replicate via Nano Banana)
- `src/app/api/ai/image/status/route.ts` — Replicate generation polling + quota recording
- `src/app/api/ai/image/download/route.ts` — SSRF-safe image download proxy
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
- `src/app/api/ai/history/route.ts` — AI generation history
- `src/app/api/ai/hashtags/route.ts` — AI Hashtag Generator
- `src/app/api/ai/reply/route.ts` — Reply Generator
- `src/app/api/ai/summarize/route.ts` — Content summarization
- `src/app/api/ai/template-generate/route.ts` — Template-based thread generation
- `src/app/api/ai/variants/route.ts` — A/B variant generator
- `src/app/api/ai/affiliate/route.ts` — Affiliate link tweet generator
- `src/app/api/ai/trends/route.ts` — Trending topics discovery
- `src/app/api/ai/inspiration/route.ts` — Trending inspiration by niche
- `src/app/api/ai/inspire/route.ts` — Content inspiration (rephrase, expand, counter-point)
- `src/app/api/ai/refine/route.ts` — Iterative refinement based on user feedback
- `src/app/api/ai/feedback/route.ts` — Records AI output feedback (thumbs up/down)
- `src/app/api/ai/enhance-topic/route.ts` — Raw topic to robust prompt enhancer
- `src/app/api/ai/thread-first-image/route.ts` — Editorial 16:9 image for first tweet of a thread
- `src/app/api/ai/pdf-to-thread/upload/route.ts` — PDF upload + text extraction
- `src/app/api/ai/pdf-to-thread/generate/route.ts` — Sync thread generation from PDF
- `src/app/api/ai/pdf-to-thread/enqueue/route.ts` — Async PDF thread enqueue to BullMQ
- `src/app/api/ai/pdf-to-thread/[jobId]/route.ts` — Job status poll + cancel
- `src/app/api/ai/pdf-to-thread/history/route.ts` — PDF job history
- `src/app/api/ai/youtube-to-thread/route.ts` — YouTube URL validation + metadata preview + job enqueue
- `src/app/api/ai/youtube-to-thread/[jobId]/route.ts` — Job status poll + result + cancel
- `src/app/api/ai/youtube-to-thread/history/route.ts` — Last 5 ready jobs for user
- `src/app/api/ai/youtube-to-thread/capabilities/route.ts` — Available transcription providers

### Core Services

- `src/lib/services/ai-quota.ts` — AI usage recording and retrieval
- `src/lib/services/ai-quota-atomic.ts` — Atomic quota consumption with race-condition prevention + admin grant fallback
- `src/lib/services/ai-image.ts` — Image generation orchestration
- `src/lib/services/moderation.ts` — Pre-publish content moderation (OpenAI API + regex fallback)
- `src/lib/services/agentic-pipeline.ts` — 5-step autonomous pipeline (Research→Strategy→Write→Images→Review)
- `src/lib/services/x-api.ts` — Twitter/X API client with per-account distributed lock token refresh
- `src/lib/services/x-error.ts` — Token refresh error classification (permanent/transient/rate-limited) + exponential backoff
- `src/lib/services/x-circuit-breaker.ts` — Redis-based circuit breaker for X API (opens after N consecutive permanent failures)
- `src/lib/services/x-subscription.ts` — X subscription tier sync
- `src/lib/services/youtube.ts` — YouTube URL parsing + metadata via yt-dlp, `getVideoInfo()`, `extractAudio()`
- `src/lib/services/transcription.ts` — Deepgram + Whisper adapter, cost calculation, provider routing
- `src/lib/services/analytics.ts` — Analytics service
- `src/lib/services/analytics-engine.ts` — Analytics computation engine
- `src/lib/services/best-time.ts` — Best time to post computation
- `src/lib/services/tweet-importer.ts` — Tweet import from X
- `src/lib/services/social-api.ts` — Social API abstractions
- `src/lib/services/instagram-api.ts` — Instagram Business API client (via Facebook Graph API)
- `src/lib/services/linkedin-api.ts` — LinkedIn posting API client
- `src/lib/services/competitor-analysis.ts` — Competitor analytics
- `src/lib/services/affiliate-stats.ts` — Affiliate statistics
- `src/lib/services/plan-metadata.ts` — Plan metadata helpers
- `src/lib/services/email.ts` — Email sending (Resend)
- `src/lib/services/email-translations.ts` — Email i18n
- `src/lib/services/notifications.ts` — User notifications
- `src/lib/services/article-fetcher.ts` — Article content fetching
- `src/lib/services/request-dedup.ts` — Request deduplication
- `src/lib/services/admin-ai-metrics.ts` — Admin AI metrics aggregation
- `src/lib/queue/processors.ts` — BullMQ job execution (Publishing, Analytics, Token Health, X Tier Refresh, PDF-to-Thread, YouTube-to-Thread)

### BullMQ Processors

- `youtubeThreadProcessor` in `src/lib/queue/processors.ts` — 5-phase pipeline: download audio (yt-dlp) → transcribe (Deepgram/Whisper) → generate thread (OpenRouter) → moderation check → persist result

### AI Security & Quality Modules

- `src/lib/ai/untrusted.ts` — `wrapUntrusted()` + `JAILBREAK_GUARD` for prompt-injection defense
- `src/lib/ai/pii.ts` — PII redaction (email, phone, credit card, IBAN)
- `src/lib/ai/input-limits.ts` — Centralized character limits for user-supplied inputs
- `src/lib/ai/language.ts` — `buildLanguageBlock()` for centralized language instructions
- `src/lib/ai/text-fit.ts` — `fitTweet()` / `splitThread()` server-side char-count enforcement
- `src/lib/tweet-char.ts` — canonical client char-count helper (weighted length, tier max, 280 thread cap, zone/severity); single source consumed by composer + all AI surfaces via the `src/hooks/use-tweet-char-count.ts` hook
- `src/lib/ai/hashtags.ts` — Hashtag banlist + MENA-bias filter
- `src/lib/ai/with-retry.ts` — Exponential backoff retry wrapper
- `src/lib/ai/with-timeout.ts` — `AbortSignal.timeout` wrapper
- `src/lib/api/idempotency.ts` — Redis-backed idempotency middleware for AI routes
- `src/lib/ai/arabic-prompt.ts` — Arabic-native style guidance (single source of truth)
- `src/lib/ai/voice-profile.ts` — Voice profile analysis
- `src/lib/ai/agentic-types.ts` — Agentic pipeline type definitions
- `src/lib/ai/agentic-prompts.ts` — Agentic pipeline prompt templates
- `src/lib/ai/inspire-prompts.ts` — Content inspiration prompt templates
- `src/lib/ai/length-prompts.ts` — Thread length prompt variants
- `src/lib/ai/template-prompts.ts` — Template-based generation prompts
- `src/lib/ai/summarize-prompts.ts` — Summarization prompt templates

### Auth & Authorization

- `src/lib/auth.ts` — Better Auth configuration
- `src/lib/team-context.ts` — Multi-account context resolver
- `src/lib/middleware/require-plan.ts` — Subscription feature gates (X/Instagram/LinkedIn account limits, post limits, AI quota, 19 boolean feature gates)
- `src/lib/admin.ts` — Admin role verification
```
