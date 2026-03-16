# AstraPost

> **AI-powered social media scheduling & content platform** — schedule tweets, threads, and posts across X (Twitter), LinkedIn, and Instagram. Publish reliably via a background worker, track analytics, and generate content with AI.

[![CI](https://github.com/your-org/astrapost/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/astrapost/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [1. Clone & Install](#1-clone--install)
  - [2. Configure Environment](#2-configure-environment)
  - [3. Start Infrastructure](#3-start-infrastructure)
  - [4. Run Database Migrations](#4-run-database-migrations)
  - [5. Start the App](#5-start-the-app)
- [Environment Variables Reference](#environment-variables-reference)
- [Available Scripts](#available-scripts)
- [Database Schema](#database-schema)
- [Architecture](#architecture)
- [Security](#security)
- [Testing](#testing)
- [CI/CD](#cicd)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**AstraPost** is a production-ready social media management platform built for X (Twitter), LinkedIn, and Instagram. It combines a polished Next.js 16 frontend with a Redis-backed BullMQ job queue for reliable publishing, encrypted credential storage, AI-assisted content writing (via OpenRouter + Google Gemini), AI image generation (via Replicate), and Stripe billing.

It targets Arabic-speaking content creators and social media managers in the MENA region — filling the gap left by English-first tools like Buffer and Hootsuite — while being fully extensible for English-language markets.

---

## Features

| Category | Capability |
|---|---|
| **Scheduling** | Smart calendar UI, 15-min increments, auto timezone detection, instant publish, recurring posts |
| **Thread Support** | Multi-tweet threads (up to 25 cards), drag-and-drop reorder |
| **Multi-Platform** | Publish to X (Twitter), LinkedIn, and Instagram from a single dashboard |
| **Background Worker** | BullMQ + Redis: reliable publishing, automatic retries (3 attempts, 5-min intervals) |
| **Real-time Queue** | Server-Sent Events (SSE) for live queue status updates |
| **Draft Management** | Auto-save every 30 seconds, searchable draft library, unlimited drafts |
| **AI Writing** | Thread writer, tweet improver, Amazon affiliate tweet generator, translation — via OpenRouter (100+ models) |
| **AI Image Generation** | Generate images via Replicate (Flux models) directly from the composer |
| **AI Hashtag Generator** | Language-aware, region-aware hashtag suggestions (MENA priority) |
| **AI Inspiration** | Content ideas and rephrase suggestions powered by Google Gemini |
| **Tweet Inspiration** | Import public tweets from X, adapt with AI or manually, bookmark for later |
| **Viral Score** | Real-time viral potential scoring for your tweets |
| **Viral Content Analyzer** | Analyze top-performing posts to identify hashtag, keyword, and timing patterns |
| **Best Time to Post** | Heatmap analysis showing optimal posting windows by day and hour |
| **Voice Profile** | Store your writing style to personalize AI-generated content |
| **Templates** | Save and reuse tweet/thread templates |
| **Analytics** | Per-tweet impressions, likes, retweets, replies, link clicks, engagement rate; 7/30/90-day aggregates; CSV/PDF export |
| **Multi-Account** | Connect and manage multiple X, LinkedIn, and Instagram accounts per user |
| **Team Collaboration** | Agency plan with team member invitations, role-based access, and post approval workflows |
| **Referral System** | Built-in referral program with credit tracking |
| **Achievements** | Gamification milestones to reward consistent creators |
| **Billing** | Stripe Checkout for Pro Monthly / Pro Annual / Agency plans, webhook handling, invoice history |
| **Auth** | Email/Password + X OAuth 2.0 + 2FA via Better Auth |
| **Security** | X OAuth tokens encrypted at rest (AES-256, rotatable keys) |
| **Observability** | End-to-end correlation IDs: API → queue → worker → `job_runs` table |
| **Media Uploads** | Images (4×, 5 MB each), video (512 MB), GIF (15 MB) |
| **Notifications** | In-app bell feed + email notifications (welcome, schedule confirmation, failure alerts) |
| **PWA** | Installable progressive web app with offline support |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Database** | [PostgreSQL 18](https://www.postgresql.org/) (`pgvector` image) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) |
| **Auth** | [Better Auth](https://www.better-auth.com/) — Email/Password + X OAuth 2.0 + 2FA |
| **Queue** | [BullMQ](https://bullmq.io/) + [Redis](https://redis.io/) (Alpine) |
| **Queue UI** | [Bull Board](https://github.com/felixmosh/bull-board) — web-based queue monitoring |
| **AI (Primary)** | [OpenRouter](https://openrouter.ai/) via [`@openrouter/ai-sdk-provider`](https://www.npmjs.com/package/@openrouter/ai-sdk-provider) + [Vercel AI SDK 5](https://sdk.vercel.ai/) |
| **AI (Chat/Inspiration)** | [Google Gemini](https://ai.google.dev/) via `@google/genai` |
| **AI Image Generation** | [Replicate](https://replicate.com/) — Flux models |
| **UI** | [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Radix UI) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Forms** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| **State** | [Zustand](https://zustand-demo.pmnd.rs/) |
| **Billing** | [Stripe](https://stripe.com/) |
| **Email** | [Resend](https://resend.com/) + [React Email](https://react.email/) |
| **Error Monitoring** | [Sentry](https://sentry.io/) |
| **Storage** | Local filesystem (dev) / [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) (production) |
| **PDF Export** | [@react-pdf/renderer](https://react-pdf.org/) |
| **PWA** | [next-pwa](https://github.com/DuCanhGH/next-pwa) |
| **Testing** | [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) |
| **Package Manager** | [pnpm](https://pnpm.io/) |
| **Containerisation** | [Docker Compose](https://docs.docker.com/compose/) |

---

## Project Structure

```
astrapost/
├── .github/
│   ├── workflows/
│   │   └── ci.yml              # CI pipeline (lint → typecheck → build)
│   └── ISSUE_TEMPLATE/         # Bug report & feature request templates
│
├── create-agentic-app/         # Standalone CLI tool for spinning up new projects (separate package)
│
├── docs/
│   ├── business/               # Business context & starter prompts
│   └── technical/              # AI, X API, react-markdown, BetterAuth docs
│
├── drizzle/                    # Generated SQL migration files
├── scripts/                    # Operational scripts (worker, smoke tests, token rotation)
│   ├── worker.ts               # BullMQ worker entry point
│   ├── smoke-full.ts           # Full boot + migrate + worker + smoke test
│   ├── rotate-token-encryption.ts
│   ├── encrypt-x-access-tokens.ts
│   └── seed-test-user.ts
│
├── public/                     # Static assets
│
└── src/
    ├── app/
    │   ├── (auth)/             # Login, register, forgot/reset password
    │   ├── (marketing)/        # Blog, pricing, docs, changelog, legal pages
    │   ├── api/
    │   │   ├── ai/             # AI endpoints: thread, translate, affiliate, tools, hashtags, score, image, inspire
    │   │   ├── analytics/      # Follower analytics, best times, viral analysis, refresh runs
    │   │   ├── auth/           # Better Auth catch-all route
    │   │   ├── billing/        # Stripe checkout, portal, webhooks, usage
    │   │   ├── inspiration/    # Bookmark CRUD
    │   │   ├── instagram/      # Instagram OAuth auth & callback
    │   │   ├── linkedin/       # LinkedIn OAuth auth & callback
    │   │   ├── media/          # File upload handling
    │   │   ├── posts/          # Post CRUD, reschedule, retry, bulk import
    │   │   ├── queue/          # SSE real-time queue updates
    │   │   ├── referral/       # Referral code validation
    │   │   ├── team/           # Team members, invitations, join
    │   │   ├── templates/      # Template CRUD
    │   │   ├── user/           # Profile, voice profile, AI usage, onboarding, delete, export
    │   │   └── x/              # X account management, health check, tweet lookup
    │   ├── chat/               # AI chat interface (protected)
    │   ├── dashboard/          # Core app area (protected)
    │   │   ├── achievements/   # Gamification milestones page
    │   │   ├── affiliate/      # Amazon affiliate tweet generator page
    │   │   ├── ai/             # AI writing tools page (Thread Writer, Hashtag Generator)
    │   │   ├── analytics/      # Analytics dashboard
    │   │   │   └── viral/      # Viral Content Analyzer page
    │   │   ├── calendar/       # Scheduling calendar page
    │   │   ├── compose/        # Tweet/thread composer page
    │   │   ├── drafts/         # Draft management page
    │   │   ├── inspiration/    # Tweet import & inspiration page
    │   │   ├── jobs/           # Job run history & monitoring page
    │   │   ├── onboarding/     # Onboarding wizard page
    │   │   ├── queue/          # Post queue management page
    │   │   ├── referrals/      # Referral program page
    │   │   └── settings/       # Account & connection settings page
    │   ├── profile/            # User profile page (protected)
    │   └── layout.tsx          # Root layout
    │
    ├── components/
    │   ├── admin/              # Admin sidebar and user management table
    │   ├── ai/                 # AI-powered components (hashtag generator)
    │   ├── analytics/          # Charts, heatmaps, export, top tweets, drawers
    │   ├── auth/               # Sign-in/up forms, user profile, sign-out
    │   ├── billing/            # Pricing card and pricing table
    │   ├── calendar/           # Reschedule form, calendar view, bulk import
    │   ├── composer/           # Tweet/thread composer, AI image dialog, viral score badge, templates
    │   ├── dashboard/          # Sidebar, header, notifications, quick compose, failure banners
    │   ├── email/              # React Email templates (post failure, etc.)
    │   ├── gamification/       # Milestone list component
    │   ├── inspiration/        # Imported tweet card, adaptation panel, manual editor
    │   ├── onboarding/         # Onboarding wizard + dashboard tour (driver.js)
    │   ├── queue/              # Retry/cancel post buttons, approval actions, realtime listener
    │   ├── roadmap/            # Feedback item and feedback list
    │   ├── settings/           # X accounts, LinkedIn, Instagram, profile, voice profile, team, security, plan usage
    │   └── ui/                 # shadcn/ui primitives + upgrade modal, trial banner, empty state
    │
    └── lib/
        ├── queue/              # BullMQ client & job processors
        ├── services/           # X API, LinkedIn API, Instagram API, analytics, AI image, best time, email, notifications
        ├── security/           # Token encryption (AES-256)
        ├── auth.ts             # Better Auth server config
        ├── auth-client.ts      # Better Auth client hooks
        ├── correlation.ts      # Correlation ID utilities
        ├── db.ts               # Drizzle DB connection
        ├── env.ts              # Environment variable validation
        ├── logger.ts           # Structured logger
        ├── plan-limits.ts      # Plan-based usage limits
        ├── rate-limiter.ts     # Redis-based rate limiting
        ├── schema.ts           # Full Drizzle schema (30+ tables)
        ├── session.ts          # Session helpers
        └── storage.ts          # File storage abstraction (local / Vercel Blob)
```

---

## Quick Start

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org/) | ≥ 20 | See `.nvmrc` for exact version |
| [pnpm](https://pnpm.io/) | ≥ 9 | `npm install -g pnpm` |
| [Docker](https://www.docker.com/) | any recent | Required for local Postgres + Redis |

---

### 1. Clone & Install

```bash
git clone https://github.com/your-org/astrapost.git
cd astrapost
pnpm install
```

---

### 2. Configure Environment

Copy the example file and fill in all required values:

```bash
cp env.example .env
```

See the [Environment Variables Reference](#environment-variables-reference) section below for a full description of every variable.

> **Minimum required for local development:**
> `POSTGRES_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEYS`

---

### 3. Start Infrastructure

```bash
docker compose up -d postgres redis
```

This spins up:
- **PostgreSQL 18** (`pgvector` image) on port `5432`
- **Redis** (Alpine) on port `6379`

---

### 4. Run Database Migrations

```bash
pnpm run db:migrate
```

---

### 5. Start the App

You need **two terminals** running concurrently:

**Terminal 1 — Next.js web server:**

```bash
pnpm dev
```

**Terminal 2 — BullMQ background worker:**

```bash
pnpm run worker
```

Open **http://localhost:3000** in your browser.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `BETTER_AUTH_SECRET` | ✅ | 32-character random secret for Better Auth |
| `BETTER_AUTH_URL` | ✅ | Base URL of the app (e.g. `http://localhost:3000`) |
| `TWITTER_CLIENT_ID` | ✅ | X (Twitter) OAuth 2.0 Client ID |
| `TWITTER_CLIENT_SECRET` | ✅ | X (Twitter) OAuth 2.0 Client Secret |
| `TOKEN_ENCRYPTION_KEYS` | ✅ | Comma-separated 32-byte keys (base64/hex). First key is primary. |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public URL of the app |
| `TWITTER_BEARER_TOKEN` | ⚠️ Inspiration only | Bearer token for importing public tweets. Get from [developer.twitter.com](https://developer.twitter.com/en/portal/dashboard) |
| `OPENROUTER_API_KEY` | ⚠️ AI only | Get from [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys) |
| `OPENROUTER_MODEL` | ⚠️ AI only | Default: `openai/gpt-4o`. Browse at [openrouter.ai/models](https://openrouter.ai/models) |
| `GEMINI_API_KEY` | ⚠️ AI only | Google Gemini API key (for chat & inspiration features) |
| `REPLICATE_API_TOKEN` | ⚠️ AI Image only | Replicate token for AI image generation via Flux models |
| `STRIPE_SECRET_KEY` | ⚠️ Billing only | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ Billing only | Stripe webhook signing secret |
| `STRIPE_PRICE_ID_MONTHLY` | ⚠️ Billing only | Stripe price ID for Pro Monthly plan |
| `STRIPE_PRICE_ID_ANNUAL` | ⚠️ Billing only | Stripe price ID for Pro Annual plan |
| `STRIPE_PRICE_ID_AGENCY_MONTHLY` | ⚠️ Billing only | Stripe price ID for Agency Monthly plan |
| `STRIPE_PRICE_ID_AGENCY_ANNUAL` | ⚠️ Billing only | Stripe price ID for Agency Annual plan |
| `RESEND_API_KEY` | ⚠️ Email only | Resend API key. If unset, emails are logged to console. Get from [resend.com](https://resend.com/api-keys) |
| `RESEND_FROM_EMAIL` | ⚠️ Email only | From address for outgoing emails (e.g. `noreply@yourdomain.com`) |
| `BLOB_READ_WRITE_TOKEN` | ⚠️ Production only | Vercel Blob token. Leave empty to use local storage in dev. |

### Generating `TOKEN_ENCRYPTION_KEYS`

Each key must be exactly **32 bytes**, encoded in base64 or hex:

```bash
# Generate a secure key (base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> ⚠️ **Never delete old keys.** To rotate keys: prepend a new key to the comma-separated list, then run `pnpm run tokens:rotate`.

### Setting up X (Twitter) OAuth

1. Go to [developer.twitter.com](https://developer.twitter.com/en/portal/dashboard)
2. Create a new App and enable **OAuth 2.0**
3. Set permissions to **Read and Write** and enable **Request email from users**
4. Add the `media.write` scope for media uploads
5. Set the callback URL to `http://localhost:3000/api/auth/callback/twitter`
6. Copy **Client ID** and **Client Secret** into your `.env`

---

## Available Scripts

```bash
# Development
pnpm dev                      # Start Next.js dev server (Turbopack)
pnpm run worker               # Start the BullMQ background worker

# Code Quality (always run before committing)
pnpm lint                     # Run ESLint
pnpm typecheck                # Run TypeScript type checker
pnpm run check                # Run lint + typecheck together
pnpm run format               # Auto-format with Prettier
pnpm run format:check         # Check formatting without writing

# Testing
pnpm test                     # Run Vitest unit tests
pnpm run smoke:full           # Full smoke suite: boot → migrate → worker → test → teardown

# Database
pnpm run db:generate          # Generate new migration from schema changes
pnpm run db:migrate           # Apply pending migrations
pnpm run db:push              # Push schema directly (dev shortcut)
pnpm run db:studio            # Open Drizzle Studio (database GUI)
pnpm run db:reset             # Drop all tables and re-push schema

# Build & Deploy
pnpm build                    # Run migrations + Next.js production build
pnpm run build:ci             # Next.js build only (no migrations, for CI)
pnpm start                    # Start production server

# Token Security
pnpm run tokens:encrypt-access  # One-time: encrypt existing plaintext X tokens
pnpm run tokens:rotate          # Re-encrypt all stored tokens with the current primary key
```

---

## Database Schema

AstraPost uses **Drizzle ORM** with PostgreSQL. Key tables:

| Table | Description |
|---|---|
| `user` | App users (Better Auth compatible) — includes timezone, language, plan, Stripe customer ID, referral code, 2FA, voice profile |
| `session` | Active user sessions |
| `account` | OAuth provider accounts (X, LinkedIn, Instagram) |
| `verification` | Email/token verification records |
| `x_accounts` | Connected X accounts with encrypted tokens, follower count, default flag |
| `linkedin_accounts` | Connected LinkedIn accounts with encrypted tokens |
| `instagram_accounts` | Connected Instagram accounts with long-lived tokens |
| `posts` | Scheduled/published/draft posts — platform, type, status, approval, recurrence, idempotency |
| `tweets` | Individual tweet cards within a post (ordered by `position`) |
| `media` | Uploaded media files linked to tweets |
| `tweet_analytics` | Latest analytics snapshot per tweet (impressions, likes, retweets, etc.) |
| `tweet_analytics_snapshots` | Historical analytics records over time |
| `social_analytics` | Cross-platform analytics (LinkedIn, Instagram) |
| `follower_snapshots` | Daily follower count snapshots per X account |
| `analytics_refresh_runs` | Audit log of analytics refresh jobs (multi-platform) |
| `team_members` | Agency team member records with roles |
| `team_invitations` | Pending team invitations |
| `ai_generations` | History of AI-generated content (thread, tweet improve, affiliate) |
| `inspiration_bookmarks` | Saved tweet inspirations |
| `subscriptions` | Stripe subscription records linked to users |
| `job_runs` | BullMQ job execution history with correlation IDs |
| `affiliate_links` | Amazon affiliate product data and generated promotional tweets |
| `affiliate_clicks` | Click tracking for affiliate links |
| `notifications` | In-app notification feed per user |
| `templates` | Saved tweet/thread templates |
| `milestones` | Gamification achievements per user |
| `feedback` | Product roadmap feature requests |
| `feedback_votes` | User votes on roadmap items |

To inspect or modify the schema interactively:

```bash
pnpm run db:studio
```

To generate and apply a new migration after schema changes:

```bash
pnpm run db:generate
pnpm run db:migrate
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Next.js)                    │
│  App Router  ·  React 19  ·  shadcn/ui  ·  Tailwind 4  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / Server Actions
┌────────────────────────▼────────────────────────────────┐
│                  Next.js API Routes                      │
│  /api/posts  ·  /api/ai/*  ·  /api/analytics/*          │
│  /api/billing/*  ·  /api/x/*  ·  /api/auth/*           │
│  /api/linkedin/*  ·  /api/instagram/*  ·  /api/team/*   │
└──────────┬───────────────────────────┬──────────────────┘
           │ Drizzle ORM               │ BullMQ enqueue
┌──────────▼───────────┐   ┌──────────▼──────────────────┐
│   PostgreSQL (pg18)   │   │     Redis (BullMQ Queue)     │
│  pgvector extension   │   │  publish-post  ·  analytics  │
└──────────────────────┘   └──────────┬──────────────────┘
                                       │ dequeue
                            ┌──────────▼──────────────────┐
                            │    Background Worker         │
                            │  scripts/worker.ts           │
                            │  · X / LinkedIn / Instagram  │
                            │  · Retry on failure          │
                            │  · job_runs audit trail      │
                            └─────────────────────────────┘
```

### Correlation ID Flow

Every scheduling request generates a `correlationId` (via `nanoid`) that travels:

```
POST /api/posts  →  x-correlation-id header
       ↓
BullMQ job data (correlationId field)
       ↓
Worker processor (logged on every step)
       ↓
job_runs table (correlationId column)
```

Use `/dashboard/jobs` to inspect job runs by correlation ID, duration, status, and errors.

---

## Security

### Token Encryption

X OAuth tokens (access + refresh) are **encrypted at rest** using AES-256-GCM before being stored in the database.

- Encryption is handled in `src/lib/security/token-encryption.ts`
- Keys are provided via `TOKEN_ENCRYPTION_KEYS` (comma-separated, first key is primary)
- **Key rotation** re-encrypts all stored tokens without requiring user re-authentication:

```bash
# 1. Prepend a new 32-byte key to TOKEN_ENCRYPTION_KEYS in your .env
# 2. Run rotation
pnpm run tokens:rotate
# 3. Keep old keys in the list indefinitely (needed to decrypt legacy data)
```

### Authentication

- Server-side session checks use Better Auth's `auth.api.getSession()`
- All protected routes and API handlers validate sessions before processing
- CSRF protection is handled by Better Auth
- Two-factor authentication (2FA) is supported via Better Auth

### Best Practices

- All secrets are loaded via validated environment variables (`src/lib/env.ts`)
- No secrets are ever logged or exposed to the client
- Docker volumes do not expose credentials outside the container network

---

## Testing

### Unit Tests (Vitest)

```bash
pnpm test
```

Tests are co-located with implementation files (e.g. `src/lib/services/analytics.test.ts`, `src/lib/services/x-api.test.ts`, `src/lib/services/ai-quota.test.ts`).

### Smoke Test Suite

Runs a complete integration verification: boots Docker services, applies migrations, starts the worker in dry-run mode, and verifies job history is written correctly.

```bash
pnpm run smoke:full
```

**What it verifies:**

- Postgres and Redis boot successfully
- DB migrations apply cleanly
- Worker starts and processes a publish job
- `job_runs` table is written with a valid `correlationId`

> The worker runs with `TWITTER_DRY_RUN=1` — it does **not** post to real X.

### Code Quality

```bash
pnpm run check         # ESLint + TypeScript (run this before every commit)
pnpm run format:check  # Prettier formatting check
```

---

## CI/CD

The GitHub Actions pipeline (`.github/workflows/ci.yml`) runs on every push and pull request to `main`/`master`:

```
Lint  →  TypeCheck  →  Build (build:ci)
```

The build step uses minimal stub environment variables so no real secrets are needed in CI.

---

## Troubleshooting

### Worker fails: `esbuild` host/binary mismatch

```
Host version "X" does not match binary version "Y"
```

```bash
pnpm install
# If still failing:
pnpm install --force
```

This is caused by platform mismatches in `esbuild` binaries. The repo is configured with `pnpm.onlyBuiltDependencies` to allow the `esbuild` postinstall script.

### Reset local database

```bash
docker compose down
docker compose up -d postgres redis
pnpm run db:migrate
```

### Next.js dev server fails: "You cannot use different slug names for the same dynamic path"

This error occurs when there are conflicting dynamic routes. Ensure all routes in the same directory use the same parameter name.

**Example conflict:**
```
app/api/team/invitations/[id]/route.ts
app/api/team/invitations/[invitationId]/route.ts  // CONFLICT!
```

**Solution:** Use consistent parameter names across all routes in the same directory.

### TypeScript errors in `.next/dev/types/validator.ts`

These are Next.js 16 + Turbopack generated type errors. They typically resolve once the dev server boots properly.

```bash
pnpm dev  # Start the dev server - errors should clear
```

If errors persist, try:
```bash
rm -rf .next
pnpm dev
```

### Worker analytics job fails with SQL query error

If the worker shows errors like "Failed query" when processing analytics jobs:

1. Check that the database schema is up to date:
   ```bash
   pnpm run db:migrate
   ```

2. Restart the worker after migration:
   ```bash
   pnpm run worker
   ```

### X OAuth callback not working

Ensure your Twitter Developer App's callback URL is set to:

```
http://localhost:3000/api/auth/callback/twitter
```

And that **OAuth 2.0** is enabled with **Read and Write** + **Request email from users** + **media.write** permissions.

> **Important:** Users who connected their X account before the `media.write` scope was added must reconnect to enable media uploads.

### AI features not working

- **OpenRouter**: Ensure `OPENROUTER_API_KEY` is set. Get a key at [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys).
- **AI Image Generation**: Ensure `REPLICATE_API_TOKEN` is set. Get one at [replicate.com](https://replicate.com/).
- **AI Inspiration/Chat**: Ensure `GEMINI_API_KEY` is set. Get one at [ai.google.dev](https://ai.google.dev/).

### Worker not processing jobs

1. Confirm Redis is running: `docker compose ps`
2. Check `REDIS_URL` in your `.env` matches the Docker service
3. Review worker logs for connection errors

### X API media upload errors (403 Forbidden)

If you see 403 errors when uploading media, your app is likely using the deprecated v1.1 upload endpoint (sunset June 2025). The codebase uses the v2 chunked upload API — ensure users reconnect their X accounts to receive tokens with the `media.write` scope.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feat/your-feature-name`
3. **Make** your changes and ensure all checks pass:
   ```bash
   pnpm run check   # lint + typecheck
   pnpm test        # unit tests
   ```
4. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat(composer): add emoji picker to tweet editor
   fix(worker): handle token expiry during retry
   docs(readme): update environment variables table
   ```
5. **Push** your branch and open a **Pull Request** against `main`
6. Fill in the PR template and describe your changes clearly

### Code Style

- TypeScript strict mode — no `any` unless absolutely necessary
- Tailwind CSS utility classes with shadcn/ui color tokens
- Server Components by default; use `"use client"` only when required
- Always run `pnpm run check` before pushing

---

## License

[MIT](./LICENSE) — built with ❤️ by [thunderlight](https://github.com/thunderlight)
