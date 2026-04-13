---
paths:
  - "src/lib/queue/**/*"
  - "src/app/api/posts/**/*"
---

# Queue & Worker Rules

- BullMQ client: `src/lib/queue/client.ts` — define job payload types here
- Processors: `src/lib/queue/processors.ts` — add new job handlers here
- Worker runs separately via `pnpm run worker` (not part of Next.js)
- Use `TWITTER_DRY_RUN=1` env var for testing without posting to real X
- Job payload types in client.ts and processors.ts MUST stay in sync
- Write `job_runs` record with `correlationId` for observability
- Rate limiting via `src/lib/rate-limiter.ts` (Redis-based)
