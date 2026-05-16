# AstraPost Code Wiki

Welcome to the AstraPost Code Wiki. This document provides a comprehensive overview of the project's architecture, major modules, key functions, dependencies, and instructions for local development.

## 1. Project Overview & Architecture

**AstraPost** is a full-featured AI-powered social media management SaaS platform built with the Modern Stack. It supports scheduling and generating content for X (Twitter), LinkedIn, and Instagram.

### Core Architecture

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui.
- **Backend**: Next.js API Routes (`src/app/api/`) acting as the serverless backend.
- **Database**: PostgreSQL (pgvector supported) using Drizzle ORM.
- **Authentication**: Better Auth with Google and X OAuth integrations.
- **Background Jobs**: BullMQ backed by Redis, running as a separate Node.js worker process (`scripts/worker.ts`).
- **AI Integration**: Vercel AI SDK communicating with OpenRouter (Anthropic/OpenAI) and Replicate (Nano Banana/GPT Image).
- **Billing**: Stripe (handled via `src/lib/stripe.ts` and `/api/billing/*` routes).
- **Observability**: Sentry for error tracking and structured logging with correlation IDs.

### High-Level Flow

1. **Client -> API**: The browser interacts with `/api/*` endpoints.
2. **API -> DB**: Endpoints query or mutate data using Drizzle ORM (`src/lib/db.ts`).
3. **API -> Queue**: Long-running or scheduled tasks (e.g., publishing posts, generating PDF threads, fetching analytics) are enqueued to BullMQ.
4. **Worker -> External APIs**: The standalone `worker.ts` process consumes jobs, executes AI pipelines, and posts to social networks via external APIs.

---

## 2. Major Modules & Responsibilities

The codebase is organized strictly into a Next.js App Router structure with a heavy reliance on the `src/lib/` folder for backend logic.

### 2.1. `src/app/` (Routing & Pages)

- **`(marketing)`**: Public-facing landing, pricing, and blog pages.
- **`(auth)`**: Login, registration, and password reset flows.
- **`dashboard/`**: The core authenticated user interface. Contains the `composer`, `queue`, `calendar`, `analytics`, and `ai` hubs. Gated by session checks.
- **`admin/`**: Super-admin dashboard for monitoring AI costs, managing users, reviewing audit logs, and overseeing the job queue. Gated by `requireAdmin()`.
- **`api/`**: Serverless API routes, grouped by domain (`auth`, `ai`, `posts`, `billing`, `analytics`, `x`, `team`, etc.).

### 2.2. `src/components/` (UI & Feature Components)

- **`ui/`**: Generic, reusable shadcn/ui components (buttons, dialogs, forms).
- **`composer/`**: The heart of the content creation UI. Implements drag-and-drop thread building, real-time AI generation via SSE, and media uploads.
- **`ai/`**: Components for AI tools (Agentic Posting, PDF-to-Thread, YouTube-to-Thread, Upsell banners).
- **`dashboard/`**: Dashboard layout shells, sidebar navigation (`sidebar.tsx`), and top bars.

### 2.3. `src/lib/` (Core Backend Logic)

This directory acts as the service layer, isolating business logic from HTTP transport.

- **`ai/`**: Prompt builders (`agentic-prompts.ts`, `template-prompts.ts`), PII redaction (`pii.ts`), language support (`arabic-prompt.ts`), and prompt injection guards (`untrusted.ts`).
- **`services/`**: External integrations and heavy logic. Includes `x-api.ts`, `ai-quota.ts`, `ai-image.ts`, `agentic-pipeline.ts`, `youtube.ts`, and `email.ts`.
- **`queue/`**: BullMQ configuration (`client.ts`) and job processors (`processors.ts`).
- **`middleware/`**: `require-plan.ts` enforces feature gating and quota limits based on the user's subscription tier.

---

## 3. Key Classes and Functions

### 3.1. API & Core Logic

- **`aiPreamble()`** (`src/lib/api/ai-preamble.ts`): The central gateway for all AI endpoints. Handles authentication, rate limiting, plan gating, atomic quota consumption, and OpenRouter model instantiation.
- **`runAgenticPipeline()`** (`src/lib/services/agentic-pipeline.ts`): Orchestrates the 5-step autonomous posting workflow (Research -> Strategy -> Writing -> Image Gen -> Review).
- **`proxy()`** (`src/proxy.ts`): Next.js middleware that enforces cookie-based auth protection on `/dashboard`, `/admin`, and sets `x-pathname` headers.

### 3.2. Database & Data Models

- **`db`** (`src/lib/db.ts`): The singleton Drizzle ORM instance.
- **`schema.ts`** (`src/lib/schema.ts`): Contains all table definitions (e.g., `user`, `posts`, `tweets`, `xAccounts`, `userAiCounters`) and Zod-compatible TypeScript types.

### 3.3. Job Processing (`src/lib/queue/processors.ts`)

- **`schedulePostProcessor`**: Publishes scheduled posts to X, handling media uploads and thread creation.
- **`youtubeThreadProcessor`**: Downloads audio via `yt-dlp`, transcribes it, and passes it to the AI for thread generation.
- **`analyticsProcessor`**: Periodically fetches updated engagement metrics from social APIs.

---

## 4. Dependency Relationships

- **Next.js API Routes <-> `src/lib/services`**: API routes strictly delegate business logic to services. For example, `/api/ai/thread` uses `aiPreamble()` and streaming utilities, rather than implementing AI logic directly.
- **Services <-> Database (`src/lib/db.ts`)**: Services use Drizzle ORM to perform DB operations. `tryConsumeAiQuota()` uses raw SQL for atomic row-level locks.
- **Worker Process <-> `src/lib/queue`**: The standalone `scripts/worker.ts` imports processors from `src/lib/queue/processors.ts` and connects to Redis to process background jobs independently of the Next.js web server.
- **Composer Bridge**: The `Composer` component uses `sessionStorage` (via `src/lib/composer-bridge.ts`) to receive pre-filled content from separate AI tool pages (like Inspiration or Template pages) without polluting the URL.

---

## 5. Development & Running Instructions

### 5.1. Prerequisites

- Node.js v20+
- `pnpm` v9+
- Docker & Docker Compose (for local Postgres and Redis)

### 5.2. Local Setup

1. **Clone and Install Dependencies**:

   ```bash
   pnpm install
   ```

2. **Environment Variables**:
   Run the interactive setup script to generate `.env` and configure required variables:

   ```bash
   pnpm run setup
   ```

   _Required variables include `POSTGRES_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, and `OPENROUTER_API_KEY`._

3. **Start Infrastructure**:
   Start PostgreSQL (pgvector) and Redis via Docker:

   ```bash
   docker-compose up -d postgres redis
   ```

4. **Database Migrations**:
   Apply Drizzle schema changes to the local database:

   ```bash
   pnpm run db:push
   # Or run migrations: pnpm run db:migrate
   ```

5. **Start Development Servers**:
   You need to run both the Next.js web server and the background worker:

   _Terminal 1 (Web Server):_

   ```bash
   pnpm run dev
   ```

   _Terminal 2 (Background Worker):_

   ```bash
   pnpm run worker
   ```

### 5.3. Testing & Code Quality

- **Type Checking & Linting**:
  ```bash
  pnpm run check
  ```
- **Unit Tests**:
  ```bash
  pnpm run test
  ```
- **End-to-End Smoke Tests**:
  ```bash
  pnpm run smoke:full
  ```

---

## 6. Important Conventions

- **Feature Gating**: Never access quotas directly. Use `checkAiLimitDetailed()` or `makeFeatureGate()` from `src/lib/middleware/require-plan.ts`.
- **API Errors**: Always throw or return `ApiError` static methods (e.g., `ApiError.badRequest()`) for consistent HTTP responses.
- **Database Transactions**: Multi-table writes must be wrapped in `db.transaction()`.
- **Localization**: All user-facing strings must use `next-intl` (English and Arabic are supported). Avoid hardcoding English text in components.

_For more details on AI orchestration and agent instructions, refer to `CLAUDE.md` in the repository root._
