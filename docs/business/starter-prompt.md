# AstroPost — AI Assistant Context

I'm working on **AstroPost**, a production-ready AI-powered social media management platform for X (Twitter). Here is the full context you need to assist effectively.

## What AstroPost Does

AstroPost lets users:
- Schedule tweets and multi-tweet threads with a calendar UI
- Publish content reliably via a BullMQ background worker with automatic retries
- Generate content using AI (thread writer, tweet improver, affiliate tweet generator, translation)
- Track analytics (impressions, likes, retweets, replies, link clicks, engagement rate)
- Manage multiple connected X accounts per user
- Subscribe to Pro plans via Stripe

## Current Application Structure

- **Authentication**: Better Auth with Email/Password + X (Twitter) OAuth 2.0
- **Database**: PostgreSQL 18 with Drizzle ORM — 15 tables covering users, posts, tweets, analytics, jobs, billing, and notifications
- **Queue**: BullMQ + Redis for background publishing and analytics refresh jobs
- **AI Integration**: OpenRouter (100+ models) via `@openrouter/ai-sdk-provider`
- **Billing**: Stripe Checkout for Pro Monthly and Pro Annual subscriptions
- **UI**: shadcn/ui components with Tailwind CSS 4, full dark mode support

## Current Routes

- `/` — Public landing page
- `/dashboard` — Main app (compose, calendar, queue, analytics, jobs, settings, onboarding)
- `/dashboard/compose` — Tweet/thread composer
- `/dashboard/calendar` — Scheduling calendar
- `/dashboard/queue` — Scheduled post queue
- `/dashboard/drafts` — Draft management
- `/dashboard/analytics` — Follower & tweet analytics
- `/dashboard/jobs` — BullMQ job run history & monitoring
- `/dashboard/ai` — AI writing tools
- `/dashboard/affiliate` — Amazon affiliate tweet generator
- `/dashboard/settings` — Connected X accounts & app settings
- `/dashboard/onboarding` — 4-step onboarding wizard
- `/chat` — General AI chat interface
- `/profile` — User profile page
- `/(auth)/login`, `/register`, `/forgot-password`, `/reset-password` — Auth pages
- `/(marketing)/pricing`, `/features`, `/blog`, `/docs`, `/changelog`, etc. — Public marketing pages

## Tech Stack

- Next.js 16 with App Router and React 19
- TypeScript (strict mode)
- Tailwind CSS 4
- Better Auth for authentication
- Drizzle ORM + PostgreSQL
- BullMQ + Redis
- Vercel AI SDK 5 + OpenRouter
- shadcn/ui components
- Stripe for billing
- Vitest + Playwright for testing

## Key Implementation Details

- AI endpoints are in `src/app/api/ai/` — always use `@openrouter/ai-sdk-provider`, never direct OpenAI
- The background worker runs separately via `pnpm run worker` (entry: `scripts/worker.ts`)
- X OAuth tokens are encrypted at rest via AES-256 (`src/lib/security/token-encryption.ts`)
- Correlation IDs flow end-to-end from API → queue job → worker → `job_runs` table
- File uploads use a storage abstraction in `src/lib/storage.ts` (local in dev, Vercel Blob in prod)

## Component Development Guidelines

**Always prioritize shadcn/ui components:**

1. **First Choice**: Use existing shadcn/ui components already in `src/components/ui/`
2. **Second Choice**: Install additional shadcn/ui components: `pnpm dlx shadcn@latest add <component-name>`
3. **Last Resort**: Only create fully custom components when shadcn/ui has no suitable option

Check the [shadcn/ui documentation](https://ui.shadcn.com/docs/components) before implementing alternatives.

## What I Need Help With

[Describe your specific task here — e.g., "Add a notification bell to the dashboard header" or "Build the CSV export for analytics data"]

## Request

Please help me implement the above within AstroPost's existing architecture. Ensure any new code:

- Follows the established file structure and naming conventions
- Uses Drizzle ORM for all database operations
- Uses OpenRouter (not direct OpenAI) for any AI features
- Runs `pnpm lint && pnpm typecheck` cleanly after changes
- Maintains TypeScript strict mode compliance

## Post-Implementation Documentation

After completing the implementation, document any new features in `/docs/features/`:

1. Create a markdown file for each major feature explaining what it does, how it works, key files involved, and usage examples
2. Update existing documentation if you modify existing functionality
3. Note any important architectural or design decisions made during implementation
