## Improvements (Quality + Reliability)
- [x] Make publishing idempotent: resume from `tweets.xTweetId` and avoid duplicate posts on retries.
- [x] Better retries: add BullMQ attempts + exponential backoff, persist `retryCount` and `lastErrorCode`.
- [x] Dead-letter queue + Retry button: show failed posts and allow retry from the UI.
- [x] More actionable errors: persist `failReason` with user-friendly 401/403 hints.
- [x] Token health checks: add a Settings button that calls `GET /api/x/health`.
## Enhancements (Product Features Worth Adding Next)
- [x] Real analytics (high impact): fetch `public_metrics` and show 14-day trends + top tweets.
- [x] Thread tools: add numbering 1/N, hook generator, CTA generator, rewrite, and translate (ar/en).
- [x] Content calendar: weekly calendar view with rescheduling.
- [x] Media support: video/GIF uploads + media processing + previews per tweet.
- [x] Multi-account support: connect multiple X accounts, select targets per post, and post per account.
- [x] Analytics upgrades: manual refresh and follower tracking per account.
## Dev/Infra Enhancements
- [x] Background worker as a service: run worker as a proper process (Docker Compose + `pnpm run worker`) with structured logs.
- [x] Observability: correlationId end-to-end (API → queue → worker) + Jobs screen with filters/pagination.
- [x] Security hardening: encrypt stored refresh + access tokens at rest, with rotation tooling.
