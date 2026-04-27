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
│   │   ├── ai/                   # AI endpoints (Thread, Inspire, Image, Agentic, Calendar, Tools, Translate, Affiliate, Score)
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
│   ├── dashboard/                # Core app: achievements, affiliate, ai, analytics, calendar, compose, drafts, inspiration, jobs, onboarding, queue, referrals, settings
│   ├── go/[shortCode]/           # Affiliate link redirect
│   ├── join-team/                # Team invitation landing page
│   └── profile/                  # User profile public view
├── components/
│   ├── admin/                    # Admin components (Dashboard, Tables, Sidebars, Modals)
│   ├── ai/                       # AI components (Hashtag Generator, Agentic Posting)
│   ├── analytics/                # Analytics components (Charts, Heatmaps, Drawers)
│   ├── auth/                     # Auth components (Sign-in, Profile)
│   ├── billing/                  # Billing components (Pricing cards, Payment forms)
│   ├── brand/                    # Brand primitives (Logo lockup, LogoMark sparkle)
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
    ├── ai/                       # AI prompts, template configs, voice-profile extraction
    ├── api/                      # API error handling, AI preamble
    ├── middleware/               # Plan gates, role checks
    ├── queue/                    # BullMQ client + processors
    ├── referral/                 # Referral utilities
    ├── schemas/                  # Shared Zod validation schemas
    ├── security/                 # Token encryption
    ├── services/                 # Business logic (Agentic, AI Image, Analytics, Email, Plan Metadata, Stripe, X-API)
    ├── utils/                    # General utilities (cn, date formatting)
    └── tokens.ts                 # Color token constants (6 scales × 12 steps × 2 modes, charts, brand)
```

### Design Tokens

Color system in `src/app/globals.css` — 6 Radix-derived OKLCH scales (neutral, brand, info, success, warning, danger) at 12 calibrated steps per mode. 21 semantic tokens feed shadcn/ui. Raw scale utilities: `bg-brand-9`, `text-success-11`, `border-danger-6`, etc. `src/lib/tokens.ts` exposes hex constants via `as const` tuples for runtime contexts (Recharts, OG images, transactional emails). Regenerate with `tmp_tokens/astrapost-tokens/generate.py`.

**Scales:** neutral (slate), brand (indigo #3E63DD), info (blue #0090FF), success (green #46A758), warning (amber #FFC53D), danger (red #E5484D).

```

## Key Implementation Files

### AI Endpoints

- `src/app/api/ai/thread/route.ts` — Thread writer (OpenRouter)
- `src/app/api/ai/image/route.ts` — Image generation (Replicate via Nano Banana)
- `src/app/api/ai/score/route.ts` — Viral Score evaluator
- `src/app/api/ai/agentic/route.ts` — Agentic SSE streaming
- `src/app/api/ai/agentic/[id]/approve/route.ts` — Approve agentic post to queue
- `src/app/api/ai/tools/route.ts` — General AI writing tools (Hooks, CTAs, Rewrite)
- `src/app/api/ai/translate/route.ts` — Translation service
- `src/app/api/ai/calendar/route.ts` — AI Content Calendar generator
- `src/app/api/chat/route.ts` — Conversational AI assistant
- `src/app/api/ai/quota/route.ts` — Usage tracking read endpoint

### Core Services

- `src/lib/services/ai-quota.ts` — AI usage recording and retrieval
- `src/lib/services/ai-image.ts` — Image generation orchestration
- `src/lib/services/plan-metadata.ts` — Plan limits retrieval
- `src/lib/services/x-api.ts` — Twitter/X API client
- `src/lib/queue/processors.ts` — BullMQ job execution (Publishing, Analytics)

### Auth & Authorization

- `src/lib/auth.ts` — Better Auth configuration
- `src/lib/team-context.ts` — Multi-account context resolver
- `src/lib/middleware/require-plan.ts` — Subscription feature gates
- `src/lib/admin.ts` — Admin role verification
```
