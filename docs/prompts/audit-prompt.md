# Full-Stack Code Review: AI-Powered Social Media Scheduling Platform

## Your Role

You are a principal full-stack engineer with deep expertise in Next.js (App Router),
React 19, TypeScript, PostgreSQL, Drizzle ORM, BullMQ, Stripe integrations, and
production-grade SaaS architecture. You also have strong UI/UX sensibility,
particularly for RTL (right-to-left) Arabic-first interfaces. You are performing
a thorough code review of this entire repository with the goal of turning it into
a bulletproof, production-ready product.

## Project Context

This is an AI-powered social media scheduling and content platform targeting
Arabic-speaking content creators in the MENA region. Users schedule tweets,
threads, and posts across X (Twitter), LinkedIn, and Instagram. The platform
publishes via a BullMQ background worker, tracks analytics, and generates
content using AI (OpenRouter, Google Gemini, Replicate for image generation).

### Tech Stack (for reference — do not suggest replacing core choices)

- Next.js 16 / App Router / React 19 / TypeScript
- PostgreSQL 18 + pgvector / Drizzle ORM
- Better Auth (Email/Password + X OAuth 2.0) / AES-256 token encryption
- BullMQ + Redis (separate worker process)
- Vercel AI SDK 5 + OpenRouter / Google Gemini API / Replicate API
- shadcn/ui + Tailwind CSS 4 (dark mode support)
- Stripe (Pro Monthly & Annual plans)
- pnpm / Vercel Blob (production file storage)

## Review Instructions

Analyze every file in this repository. Organize your findings into the following
sections. For EVERY finding, follow this exact format:

### Finding Format

[SEVERITY: Critical | High | Medium | Low] — Brief title

File(s): path/to/file.ts (line numbers if applicable)
Current behavior: What the code does now and why it's problematic
Recommendation: Exactly what to change, with a concrete code snippet
Rationale: Why this matters (security, performance, UX, maintainability)

---

## Section 1: Architecture & Project Structure

Evaluate the overall project organization:

- Is the App Router usage idiomatic? Are server components and client components
  properly separated? Are there unnecessary `"use client"` directives?
- Is the separation between the Next.js app and the BullMQ worker clean?
  Is there shared code properly extracted?
- Are there circular dependencies, barrel file anti-patterns, or import issues?
- Is the folder structure scalable for adding new social platforms or features?
- Evaluate the module boundaries — are concerns properly separated
  (auth, billing, scheduling, AI, analytics)?

## Section 2: Database & Data Layer

Review all Drizzle ORM schemas, queries, and migrations:

- Schema design: normalization, indexing strategy, missing indexes,
  unnecessary indexes, proper use of pgvector
- Query efficiency: N+1 problems, missing joins, unbounded queries,
  missing pagination
- Migration safety: are migrations reversible? Any destructive operations
  without safeguards?
- Connection pooling configuration for production
- Are database transactions used where they should be
  (e.g., scheduling + deducting credits)?
- Data validation: is input validated at BOTH the API boundary AND the
  database constraint level?

## Section 3: Authentication & Security

Audit the entire auth flow and all security surfaces:

- Better Auth configuration: session management, CSRF protection,
  token rotation, cookie settings
- OAuth 2.0 flow for X (Twitter): token storage, refresh logic,
  scope handling, error recovery
- AES-256 token encryption: key management, IV handling, is the
  implementation correct and not rolling custom crypto unsafely?
- API route protection: are ALL routes properly guarded? Any unprotected
  endpoints?
- Input sanitization and output encoding (especially for user-generated
  content that gets posted to social platforms)
- Rate limiting on sensitive endpoints (login, registration, API key usage)
- CORS configuration
- Environment variable handling: any secrets at risk of client-side exposure?
  Check for `NEXT_PUBLIC_` misuse
- SQL injection, XSS, and SSRF vectors

## Section 4: Background Jobs & Reliability

Review the BullMQ worker and job processing:

- Job retry logic: backoff strategy, max retries, dead letter handling
- Idempotency: what happens if the same job runs twice?
  (e.g., double-posting to Twitter)
- Error handling: are API failures (Twitter rate limits, LinkedIn errors)
  handled gracefully with proper user notification?
- Job scheduling accuracy: timezone handling (critical for MENA region
  spanning UTC+2 to UTC+4)
- Queue monitoring and observability: are failed jobs visible? Alerting?
- Worker crash recovery: what happens if the worker process dies
  mid-job?
- Redis connection resilience: reconnection logic, what happens
  during Redis downtime?
- Concurrency control: are there race conditions in scheduling
  or publishing?

## Section 5: AI Integration

Review all AI-related code:

- OpenRouter integration: model fallback logic, token limit handling,
  cost tracking, streaming implementation
- Google Gemini: proper error handling, rate limit management
- Replicate (image generation): async job polling, timeout handling,
  NSFW content filtering
- Prompt engineering: are system prompts well-structured?
  Are they injection-resistant?
- AI response validation: is AI output sanitized before use?
  What happens with malformed responses?
- Cost controls: is there per-user AI usage tracking and limiting?
- Streaming UX: is the AI SDK streaming properly integrated with
  React 19 and the App Router?

## Section 6: API Design & Error Handling

Review all API routes and server actions:

- Consistent error response format across all endpoints
- Proper HTTP status codes
- Input validation (recommend zod schemas if not present)
- Error boundaries in the React tree
- Global error handling and logging strategy
- Are server actions used appropriately vs API routes?
- Loading and error states in the UI for every async operation

## Section 7: UI/UX Review

Perform a thorough UI/UX audit with special attention to the Arabic-first audience:

### RTL & Internationalization

- Is RTL layout properly implemented throughout (not just CSS `direction: rtl`
  but logical properties like `margin-inline-start`)?
- Are shadcn/ui components RTL-compatible? Any components that break in RTL?
- Is Arabic typography handled well? (appropriate fonts, line-height,
  letter-spacing considerations)
- Is the i18n strategy solid? Is there a proper localization framework,
  or are strings hardcoded?
- Does the calendar/date picker handle Arabic/Hijri dates if relevant?

### Design System & Components

- shadcn/ui customization: is there a consistent design system, or are
  components styled ad-hoc?
- Color system: does the dark mode implementation have contrast issues?
  WCAG AA compliance?
- Spacing and layout consistency across pages
- Component reusability: are there duplicated UI patterns that should
  be extracted?

### Key User Flows (evaluate each)

1. **Onboarding & Auth:** Is the signup → connect social account → first
   post flow smooth and guided?
2. **Content Creation:** Is the editor intuitive? AI content generation
   integration seamless? Preview accuracy for each platform?
3. **Scheduling:** Is the calendar view clear? Timezone display correct?
   Bulk scheduling?
4. **Analytics Dashboard:** Are metrics meaningful and well-visualized?
   Loading states?
5. **Billing & Upgrade:** Is the free → pro upgrade flow frictionless?
   Plan comparison clear?

### Responsiveness & Performance

- Mobile experience: is it truly usable on mobile, or just responsive?
- Image optimization: proper use of next/image, WebP/AVIF, lazy loading
- Cumulative Layout Shift: any layout jumps during loading?
- First Contentful Paint: are server components leveraged to minimize
  client-side JS?

### Accessibility

- Keyboard navigation for all interactive elements
- Screen reader compatibility (proper ARIA labels, semantic HTML)
- Focus management in modals, drawers, and dynamic content
- Color contrast ratios (especially in dark mode)

## Section 8: Performance & Scalability

- Bundle analysis: large dependencies, tree-shaking issues,
  dynamic imports needed?
- Server component vs client component balance — is too much
  shipped to the client?
- Caching strategy: are API responses cached? ISR/SSG used
  where appropriate?
- Database query performance under load
- Redis memory management for BullMQ
- Image/media pipeline: upload → process → store → serve optimization
- Vercel-specific: are there edge runtime opportunities?
  Proper use of Vercel Blob?

## Section 9: Developer Experience & Code Quality

- TypeScript strictness: is `strict: true` enabled? Any abused `any` types?
- Consistent code style and formatting (ESLint + Prettier config)
- Test coverage: what exists? What's critically missing?
  Prioritize what tests to write first
- Error logging: structured logging? Proper log levels?
  Production observability?
- Environment configuration: `.env` management, validation
  (recommend `@t3-oss/env-nextjs` or `zod` if missing)
- Documentation: README accuracy, API docs, deployment guide

## Section 10: Stripe & Billing

- Webhook handling: idempotency, signature verification,
  event ordering
- Subscription lifecycle: upgrade, downgrade, cancellation,
  failed payment recovery (dunning)
- Entitlement enforcement: are feature gates server-side checked,
  not just UI-hidden?
- Price/plan configuration: hardcoded vs dynamic?
- Tax handling considerations for MENA region
- Currency considerations (USD vs local currencies)

---

## Output Requirements

1. Start with an **Executive Summary** (3-5 paragraphs): overall health
   of the codebase, the 3 most critical issues to fix immediately,
   and general architectural impressions

2. Then deliver all 10 sections with findings in the specified format

3. End with a **Prioritized Action Plan**: a numbered list of the top 20
   changes, ordered by (impact × effort), with rough effort estimates
   (hours/days) and a suggested implementation sequence

4. Throughout the review, be specific — reference actual file paths,
   function names, and line numbers. Do not give generic advice.
   Every recommendation must be grounded in what you see in the actual code.

5. When suggesting code changes, provide complete, copy-pasteable
   code snippets — not pseudocode.

6. If you find something done exceptionally well, call it out briefly
   as a **[POSITIVE]** finding. Good patterns should be acknowledged
   and reinforced.
