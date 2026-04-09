# AstraPost Architecture

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth: login, register, forgot/reset password
│   ├── (marketing)/              # Public: blog, changelog, community, docs, features, pricing, legal
│   ├── api/
│   │   ├── ai/                   # AI endpoints: thread, translate, affiliate, tools, agentic, image, inspire
│   │   ├── analytics/            # Follower, tweet analytics, viral analysis
│   │   ├── auth/[...all]/        # Better Auth catch-all
│   │   ├── billing/              # Stripe checkout & webhooks
│   │   ├── chat/route.ts         # AI chat (OpenRouter)
│   │   ├── inspiration/          # Tweet import & bookmarks
│   │   ├── media/upload/         # File upload
│   │   ├── posts/                # Post CRUD, reschedule, retry
│   │   └── x/                    # X account management & tweet lookup
│   ├── chat/                     # AI chat interface
│   ├── dashboard/                # Core app: affiliate, ai, analytics, calendar, compose, drafts, inspiration, jobs, onboarding, queue, settings
│   └── profile/                  # User profile
├── components/
│   ├── ai/                       # hashtag-generator, agentic-posting-client
│   ├── auth/                     # sign-in-button, sign-out-button, user-profile
│   ├── composer/                 # composer, tweet-card, ai-tools-panel, ai-image-dialog, etc.
│   ├── dashboard/                # sidebar
│   ├── inspiration/              # adaptation-panel, imported-tweet-card, manual-editor
│   ├── ui/                       # shadcn/ui primitives
│   └── [site-header, site-footer, theme-provider]
└── lib/
    ├── ai/                       # agentic-types, agentic-prompts
    ├── queue/                    # BullMQ client + processors
    ├── services/                 # agentic-pipeline, ai-image, analytics, tweet-importer, x-api
    ├── security/                 # token-encryption
    ├── [auth, auth-client, db, env, logger, plan-limits, rate-limiter, schema, session, storage, utils]
```

## Key Implementation Files

### AI Endpoints (OpenRouter)

- `src/app/api/ai/thread/route.ts` — Thread writer
- `src/app/api/ai/translate/route.ts` — Translation
- `src/app/api/ai/affiliate/route.ts` — Amazon affiliate tweets
- `src/app/api/ai/tools/route.ts` — General AI writing tools
- `src/app/api/chat/route.ts` — AI chat
- `src/app/api/ai/agentic/route.ts` — Agentic SSE streaming (Pro/Agency)
- `src/app/api/ai/agentic/[id]/approve/route.ts` — Approve/schedule/draft
- `src/app/api/ai/agentic/[id]/regenerate/route.ts` — Single-tweet regen

### Google Gemini AI

- `src/app/api/ai/inspire/route.ts` — Content inspiration
- `src/app/api/ai/image/route.ts` — Image generation (via Replicate)
- `src/lib/services/ai-image.ts` — Replicate API service

### Twitter/X API

- `src/app/api/x/tweet-lookup/route.ts` — Public tweet import
- `src/lib/services/tweet-importer.ts` — Import service with caching
- Requires `TWITTER_BEARER_TOKEN` env var
