# AstroPost - AI Assistant Guidelines

## Project Overview

AstroPost is a production-ready AI-powered social media management platform for X (Twitter). It enables users to schedule tweets and threads, publish reliably via a background worker, track analytics, and generate content using AI — targeting Arabic-speaking content creators in the MENA region.

### Tech Stack

- **Framework**: Next.js 16 with App Router, React 19, TypeScript
- **AI Integration**: Vercel AI SDK 5 + OpenRouter (access to 100+ AI models)
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

- `src/app/api/ai/thread/route.ts` — AI thread writer endpoint
- `src/app/api/ai/translate/route.ts` — Translation endpoint
- `src/app/api/ai/affiliate/route.ts` — Amazon affiliate tweet generator
- `src/app/api/ai/tools/route.ts` — General AI writing tools
- `src/app/api/chat/route.ts` — General AI chat endpoint
- Package: `@openrouter/ai-sdk-provider` (not `@ai-sdk/openai`)
- Import: `import { openrouter } from "@openrouter/ai-sdk-provider"`

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
│   │   ├── analytics/            # Follower & tweet analytics endpoints
│   │   ├── auth/[...all]/        # Better Auth catch-all route
│   │   ├── billing/              # Stripe checkout & webhook handlers
│   │   ├── chat/route.ts         # General AI chat endpoint (OpenRouter)
│   │   ├── diagnostics/          # System diagnostics endpoint
│   │   ├── media/upload/         # File/media upload handler
│   │   ├── posts/                # Post CRUD, reschedule, retry
│   │   └── x/                   # X account management & health check
│   ├── chat/                     # AI chat interface (protected)
│   ├── dashboard/                # Core app area (protected)
│   │   ├── affiliate/            # Affiliate tweet generator page
│   │   ├── ai/                   # AI writing tools page
│   │   ├── analytics/            # Analytics dashboard page
│   │   ├── calendar/             # Scheduling calendar page
│   │   ├── compose/              # Tweet/thread composer page
│   │   ├── drafts/               # Draft management page
│   │   ├── jobs/                 # Job run history & monitoring page
│   │   ├── onboarding/           # Onboarding wizard page
│   │   ├── queue/                # Post queue management page
│   │   └── settings/             # Account & connection settings page
│   ├── profile/                  # User profile page (protected)
│   └── layout.tsx                # Root layout
├── components/
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
│   │   ├── composer.tsx
│   │   └── target-accounts-select.tsx
│   ├── dashboard/                # Dashboard layout components
│   │   └── sidebar.tsx
│   ├── onboarding/               # Onboarding wizard component
│   │   └── onboarding-wizard.tsx
│   ├── queue/                    # Queue management components
│   │   └── retry-post-button.tsx
│   ├── settings/                 # Settings page components
│   │   ├── connected-x-accounts.tsx
│   │   └── x-health-check-button.tsx
│   ├── ui/                       # shadcn/ui primitives
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
│   │   └── github-stars.tsx
│   ├── site-header.tsx           # Main navigation header
│   ├── site-footer.tsx           # Footer component
│   └── theme-provider.tsx        # Dark mode provider
└── lib/
    ├── queue/                    # BullMQ queue client and job processors
    │   ├── client.ts
    │   └── processors.ts
    ├── services/                 # External service integrations
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

# Security — token encryption (comma-separated 32-byte keys, first is primary)
TOKEN_ENCRYPTION_KEYS=base64key1=,base64key2=

# AI via OpenRouter
OPENROUTER_API_KEY=sk-or-v1-your-key
OPENROUTER_MODEL=openai/gpt-4o  # any model from openrouter.ai/models

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe (optional — required for billing features)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_MONTHLY=
STRIPE_PRICE_ID_ANNUAL=

# File Storage (optional — leave empty for local dev, set for Vercel Blob in production)
BLOB_READ_WRITE_TOKEN=
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

## Documentation Files

The project includes technical documentation in `docs/`:

- `docs/business/starter-prompt.md` — AstroPost business context for AI prompts
- `docs/technical/react-markdown.md` — Markdown rendering guide
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
