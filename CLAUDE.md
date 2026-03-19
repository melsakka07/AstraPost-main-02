# AstroPost - AI Assistant Guidelines

## Project Overview

AstroPost is a production-ready AI-powered social media management platform for X (Twitter). It enables users to schedule tweets and threads, publish reliably via a background worker, track analytics, and generate content using AI — targeting Arabic-speaking content creators in the MENA region.

### Code Tracker
Please go check this file \docs\0-MY-LATEST-UPDATES.md to get the latest updates on the code and the changes made.

### Tech Stack

- **Framework**: Next.js 16 with App Router, React 19, TypeScript
- **AI Integration**: Vercel AI SDK 5 + OpenRouter (access to 100+ AI models)
- **AI Image Generation**: Replicate API (Flux models)
- **AI Chat**: Google Gemini API for chat features
- **Authentication**: Better Auth with Email/Password + X (Twitter) OAuth 2.0
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
│   │   ├── ai/                   # AI endpoints: thread, translate, affiliate, tools
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
│   │   ├── ai/                   # AI writing tools page (Thread Writer, Hashtag Generator)
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
│   │   └── hashtag-generator.tsx # AI hashtag generator component
│   ├── auth/                     # Authentication components
│   │   ├── sign-in-button.tsx    # Sign-in form
│   │   ├── sign-up-form.tsx      # Registration form
│   │   ├── forgot-password-form.tsx
│   │   ├── reset-password-form.tsx
│   │   ├── sign-out-button.tsx
│   │   └── user-profile.tsx
│   ├── analytics/                # Analytics-specific components
│   │   └── manual-refresh-button.tsx
│   ├── calendar/                 # Calendar components
│   │   └── reschedule-post-form.tsx
│   ├── composer/                 # Tweet/thread composer components
│   │   ├── ai-image-dialog.tsx   # AI image generation dialog
│   │   ├── composer.tsx
│   │   ├── sortable-tweet.tsx    # Draggable tweet card
│   │   ├── tweet-card.tsx        # Tweet card component
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
    ├── queue/                    # BullMQ queue client and job processors
    │   ├── client.ts
    │   └── processors.ts
    ├── services/                 # External service integrations
    │   ├── ai-image.ts           # AI image generation via Replicate
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
OPENROUTER_MODEL=openai/gpt-4o  # any model from openrouter.ai/models

# Google Gemini AI (for chat & inspiration features)
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key  # Alias for GEMINI_API_KEY

# Replicate API (for AI image generation)
REPLICATE_API_TOKEN=your-replicate-api-token

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

AstroPost includes several AI-powered features to help users create, analyze, and optimize content:

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

AstroPost supports content generation in multiple languages:
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

- `docs/business/starter-prompt.md` — AstroPost business context for AI prompts
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

4. **Styling Guidelines**

   - Stick to standard Tailwind CSS utility classes
   - Use shadcn/ui color tokens (e.g., `bg-background`, `text-foreground`)
   - Avoid custom colors unless explicitly requested
   - Support dark mode with appropriate Tailwind classes

5. **Authentication**

   - Server-side: Import from `@/lib/auth` (Better Auth instance)
   - Client-side: Import hooks from `@/lib/auth-client`
   - Protected routes should check session in Server Components
   - Use existing auth components from `src/components/auth/`

6. **Database Operations**

   - Use Drizzle ORM (imported from `@/lib/db`)
   - Schema is defined in `@/lib/schema`
   - Always run migrations after schema changes
   - PostgreSQL is the database (not SQLite, MySQL, etc.)
   - Key tables: `posts`, `tweets`, `x_accounts`, `job_runs`, `tweet_analytics`, `subscriptions`

7. **Queue & Worker**

   - BullMQ client is in `src/lib/queue/client.ts`
   - Job processors are in `src/lib/queue/processors.ts`
   - The worker runs as a separate process via `pnpm run worker`
   - Use `TWITTER_DRY_RUN=1` for testing without posting to real X

8. **Security**

   - X OAuth tokens are encrypted at rest — never store them as plaintext
   - Encryption logic is in `src/lib/security/token-encryption.ts`
   - Use `TOKEN_ENCRYPTION_KEYS` for key management and rotation

9. **File Storage**

   - Use the storage abstraction from `@/lib/storage`
   - Automatically uses local storage (dev) or Vercel Blob (production)
   - Import: `import { upload, deleteFile } from "@/lib/storage"`
   - Example: `const result = await upload(buffer, "avatar.png", "avatars")`
   - Storage switches based on `BLOB_READ_WRITE_TOKEN` environment variable

10. **API Routes**
    - Follow Next.js 16 App Router conventions
    - Use Route Handlers (`route.ts` files)
    - Return `Response` objects
    - Attach correlation IDs on scheduling-related endpoints via `src/lib/correlation.ts`

11. **AI Service Integration**
    - **OpenRouter**: Use for most AI features (thread writer, translation, etc.)
      - Import from `@openrouter/ai-sdk-provider`
      - Model format: `provider/model-name` (e.g., `openai/gpt-4o`)
    - **Google Gemini**: Use for chat and inspiration features
      - Requires `GEMINI_API_KEY` environment variable
      - Import from `@ai-sdk/google`
    - **Replicate**: Use for AI image generation
      - Requires `REPLICATE_API_TOKEN` environment variable
      - Supports Flux models for high-quality images

12. **Twitter/X API Integration**
    - For OAuth: Use existing `x-api.ts` service with encrypted tokens
    - For public data: Use `TWITTER_BEARER_TOKEN` environment variable
    - Tweet importer service (`tweet-importer.ts`) handles:
      - URL parsing for various X URL formats
      - Full conversation context retrieval
      - Redis caching (1-hour TTL)
      - Rate limit handling

13. **Plan-Based Limits**
    - Use `src/lib/plan-limits.ts` for feature restrictions
    - Free plan: Limited AI credits, 5 inspiration bookmarks
    - Pro/Agency: Unlimited features
    - Always check limits before resource-intensive operations

### Best Practices

- Read existing code patterns before creating new features
- Maintain consistency with the established file structure
- Always run `pnpm run check` before considering a task complete
- When modifying AI functionality, ensure OpenRouter is used (not direct OpenAI)
- Keep the BullMQ worker and Next.js app in sync on job payload types

### Common Tasks

**Adding a new dashboard page:**

1. Create `src/app/dashboard/[route]/page.tsx`
2. Use Server Components by default; add `"use client"` only if needed
3. Add the route to the sidebar in `src/components/dashboard/sidebar.tsx`

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