# AstraPost — Feature & Plan Matrix

> Last updated: 2026-04-13

## Subscription Tiers

| Feature                   | Free           | Pro (Monthly/Annual)              | Agency          |
| ------------------------- | -------------- | --------------------------------- | --------------- |
| **Posts per Month**       | 20             | Unlimited                         | Unlimited       |
| **Schedule Threads**      | No             | Yes                               | Yes             |
| **Video / GIF Upload**    | No             | Yes                               | Yes             |
| **Max X Accounts**        | 1              | 3                                 | 10              |
| **Max Team Members**      | —              | —                                 | 5               |
| **LinkedIn Support**      | No             | No                                | Yes             |
| **Analytics Retention**   | 7 days         | 90 days                           | 365 days        |
| **Analytics Export**      | None           | CSV / PDF                         | White-label PDF |
| **Inspiration Bookmarks** | 5              | Unlimited                         | Unlimited       |
| **AI Generations/Month**  | 20             | 100                               | Unlimited       |
| **AI Images/Month**       | 10             | 50                                | Unlimited       |
| **AI Image Models**       | 2 (basic only) | All 3 models                      | All 3 models    |
| **Trial**                 | —              | 14-day trial → Pro Monthly limits | —               |

---

## AI Features by Tier

| AI Feature          | Free        | Pro              | Agency           |
| ------------------- | ----------- | ---------------- | ---------------- |
| Thread Writer       | Yes         | Yes              | Yes              |
| Translation         | Yes         | Yes              | Yes              |
| AI Chat             | Yes         | Yes              | Yes              |
| Hashtag Generator   | Yes         | Yes              | Yes              |
| Inspiration Engine  | Yes         | Yes              | Yes              |
| Image Generation    | Yes (basic) | Yes (all models) | Yes (all models) |
| Affiliate Generator | No          | Yes              | Yes              |
| Viral Score         | No          | Yes              | Yes              |
| Best Times Analysis | No          | Yes              | Yes              |
| Voice Profile       | No          | Yes              | Yes              |
| Content Calendar    | No          | Yes              | Yes              |
| URL to Thread       | No          | Yes              | Yes              |
| Variant Generator   | No          | Yes              | Yes              |
| Competitor Analyzer | No          | Yes              | Yes              |
| Reply Generator     | No          | Yes              | Yes              |
| Bio Optimizer       | No          | Yes              | Yes              |
| Agentic Posting     | No          | Yes              | Yes              |

---

## API Call Limits Summary

| Quota                      | Free   | Pro       | Agency    |
| -------------------------- | ------ | --------- | --------- |
| AI text generations/month  | 20     | 100       | Unlimited |
| AI image generations/month | 10     | 50        | Unlimited |
| Posts/month                | 20     | Unlimited | Unlimited |
| X accounts connected       | 1      | 3         | 10        |
| Team members               | 0      | 0         | 5         |
| Bookmarks                  | 5      | Unlimited | Unlimited |
| Analytics retention        | 7 days | 90 days   | 365 days  |

> **Trial note:** 14-day trial users receive Pro Monthly limits across all quotas.

---

## Full Feature Catalog

### Posting & Scheduling

- **Tweet Composer** — Single tweets and multi-tweet threads
- **Draft Posts** — Save and manage drafts
- **Scheduled Queue** — Visual queue with BullMQ worker
- **Content Calendar** — Visual calendar planning _(Pro/Agency)_
- **Bulk Operations** — Reschedule, retry, delete multiple posts
- **Media Upload** — Images, video, GIFs _(Pro/Agency)_

### AI Content Generation

- **Thread Writer** — 3–15 tweet threads, 7 tones, 10 languages
- **Translation** — Multi-language content rewriting
- **Affiliate Generator** — Amazon product tweet threads _(Pro/Agency)_
- **Image Generation** — Replicate/Flux, multiple styles & aspect ratios
  - Free: 2 basic models; Pro/Agency: all 3 (Nano Banana, Pro, Fallback)
- **Variant Generator** — Multiple versions of a tweet _(Pro/Agency)_
- **Reply Generator** — AI-crafted responses to mentions _(Pro/Agency)_
- **Bio Optimizer** — Profile bio enhancement _(Pro/Agency)_
- **Template Generator** — Reusable content templates
- **Summarization** — Condense long content
- **Topic Enhancement** — Expand and refine topics
- **Trend Analysis** — Detect trending topics

### Agentic Posting _(Pro/Agency only)_

A 5-step SSE streaming pipeline:

1. Research
2. Strategy
3. Write
4. Images
5. Review

Each step is streamed live. Users can approve, regenerate individual tweets, or schedule the full thread.

### Analytics

- **Follower Trends** — Growth over time
- **Viral Content Analysis** — Top tweet breakdown (hashtags, keywords, timing)
- **Best Times to Post** — Engagement window analysis _(Pro/Agency)_
- **Competitor Analyzer** — Competitive benchmarking _(Pro/Agency)_
- **Individual Tweet Analytics** — Per-tweet performance
- **Self Stats** — Account-level metrics
- **Export** — CSV/PDF _(Pro)_, White-label PDF _(Agency)_
- **Retention** — 7 days _(Free)_, 90 days _(Pro)_, 365 days _(Agency)_

### Inspiration Engine

- Import tweets from X
- Actions per tweet: Rephrase, Tone Shift, Expand, Translate, Counter-point
- Bookmark limit: 5 _(Free)_, Unlimited _(Pro/Agency)_

### Voice Profile _(Pro/Agency)_

- Custom tone and writing style personalization
- Applied across all AI generation features

### Team Management _(Agency only)_

- Up to 5 team members
- Invite by email with token-based join flow
- Switch active team context
- Shared X account access within team

### Multi-Platform

| Platform    | Status                                  |
| ----------- | --------------------------------------- |
| X (Twitter) | Full support (all tiers)                |
| LinkedIn    | Agency only                             |
| Instagram   | Auth flow present (partial/in-progress) |

### Referral & Affiliate Program

- Personal referral code for all users
- Affiliate dashboard with earnings tracking
- Referral analytics (clicks, signups, conversions)

### Settings & Account

- X account management (OAuth 2.0, multi-account)
- User preferences
- Data export
- Account deletion
- Onboarding flow
- Announcements & notifications
- AI usage tracker
- System diagnostics

---

## API Routes Reference

### Auth & User

| Method     | Route                           | Description           |
| ---------- | ------------------------------- | --------------------- |
| `ALL`      | `/api/auth/[...all]`            | Better Auth catch-all |
| `GET/POST` | `/api/user/profile`             | User profile          |
| `POST`     | `/api/user/delete`              | Account deletion      |
| `POST`     | `/api/user/export`              | Data export           |
| `POST`     | `/api/user/onboarding-complete` | Mark onboarding done  |
| `GET/POST` | `/api/user/preferences`         | User preferences      |
| `GET`      | `/api/user/ai-usage`            | AI usage tracking     |
| `POST`     | `/api/user/voice-profile`       | Voice profile         |
| `GET`      | `/api/user/teams`               | User teams            |
| `POST`     | `/api/user/set-referrer`        | Referral tracking     |

### X (Twitter) Management

| Method           | Route                              | Description          |
| ---------------- | ---------------------------------- | -------------------- |
| `GET/POST`       | `/api/x/accounts`                  | List / add accounts  |
| `GET/PUT/DELETE` | `/api/x/accounts/[id]`             | Account operations   |
| `GET/POST`       | `/api/x/accounts/default`          | Default account      |
| `POST`           | `/api/x/accounts/sync`             | Sync accounts        |
| `GET`            | `/api/x/health`                    | Account health check |
| `GET`            | `/api/x/tweet-lookup`              | Import tweets        |
| `GET`            | `/api/x/subscription-tier`         | Check X tier         |
| `POST`           | `/api/x/subscription-tier/refresh` | Refresh X tier       |

### AI Features

| Method     | Route                             | Description                  |
| ---------- | --------------------------------- | ---------------------------- |
| `POST`     | `/api/ai/thread`                  | Generate tweet threads       |
| `POST`     | `/api/ai/translate`               | Translate content            |
| `POST`     | `/api/ai/affiliate`               | Affiliate content            |
| `POST`     | `/api/ai/tools`                   | General AI writing tools     |
| `POST`     | `/api/ai/image`                   | Image generation             |
| `GET/POST` | `/api/ai/image/quota`             | Image quota tracking         |
| `GET`      | `/api/ai/image/status`            | Image generation status      |
| `POST`     | `/api/ai/inspire`                 | Inspiration engine (Gemini)  |
| `POST`     | `/api/ai/score`                   | Viral score analysis         |
| `POST`     | `/api/ai/hashtags`                | Hashtag generation           |
| `POST`     | `/api/ai/reply`                   | Reply generation             |
| `POST`     | `/api/ai/variants`                | Content variants             |
| `POST`     | `/api/ai/bio`                     | Bio optimization             |
| `POST`     | `/api/ai/calendar`                | Content calendar             |
| `POST`     | `/api/ai/summarize`               | Content summarization        |
| `POST`     | `/api/ai/template-generate`       | Template generation          |
| `POST`     | `/api/ai/trends`                  | Trend analysis               |
| `POST`     | `/api/ai/enhance-topic`           | Topic enhancement            |
| `POST`     | `/api/ai/inspiration`             | Inspiration variants         |
| `POST`     | `/api/ai/history`                 | AI history tracking          |
| `GET`      | `/api/ai/quota`                   | AI quota limits              |
| `POST`     | `/api/ai/agentic`                 | Start agentic pipeline (SSE) |
| `POST`     | `/api/ai/agentic/[id]/approve`    | Approve / schedule / draft   |
| `POST`     | `/api/ai/agentic/[id]/regenerate` | Regenerate single tweet      |

### Posts & Scheduling

| Method           | Route                            | Description         |
| ---------------- | -------------------------------- | ------------------- |
| `GET/POST`       | `/api/posts`                     | List / create posts |
| `GET/PUT/DELETE` | `/api/posts/[postId]`            | Post operations     |
| `PUT`            | `/api/posts/[postId]/reschedule` | Reschedule post     |
| `POST`           | `/api/posts/[postId]/retry`      | Retry failed post   |
| `POST`           | `/api/posts/bulk`                | Bulk operations     |

### Analytics

| Method | Route                       | Description           |
| ------ | --------------------------- | --------------------- |
| `GET`  | `/api/analytics/followers`  | Follower trends       |
| `GET`  | `/api/analytics/viral`      | Viral tweet analysis  |
| `GET`  | `/api/analytics/best-times` | Best posting times    |
| `GET`  | `/api/analytics/best-time`  | Single best time      |
| `GET`  | `/api/analytics/tweet/[id]` | Tweet analytics       |
| `GET`  | `/api/analytics/self-stats` | User stats            |
| `POST` | `/api/analytics/refresh`    | Manual refresh        |
| `GET`  | `/api/analytics/runs`       | Analytics run history |
| `POST` | `/api/analytics/competitor` | Competitor analysis   |

### Billing & Subscriptions

| Method | Route                              | Description           |
| ------ | ---------------------------------- | --------------------- |
| `POST` | `/api/billing/checkout`            | Create Stripe session |
| `POST` | `/api/billing/webhook`             | Stripe webhooks       |
| `POST` | `/api/billing/portal`              | Customer portal link  |
| `GET`  | `/api/billing/status`              | Subscription status   |
| `POST` | `/api/billing/validate-promo`      | Validate promo code   |
| `POST` | `/api/billing/change-plan`         | Change subscription   |
| `GET`  | `/api/billing/change-plan/preview` | Preview plan change   |
| `GET`  | `/api/billing/usage`               | Usage tracking        |

### Team Management

| Method       | Route                                  | Description        |
| ------------ | -------------------------------------- | ------------------ |
| `GET/POST`   | `/api/team/members`                    | Team members       |
| `GET/DELETE` | `/api/team/members/[memberId]`         | Member operations  |
| `POST`       | `/api/team/invite`                     | Send invite        |
| `GET`        | `/api/team/invite/[token]`             | Accept invite      |
| `GET/DELETE` | `/api/team/invitations/[invitationId]` | Manage invitations |
| `POST`       | `/api/team/switch`                     | Switch active team |
| `POST`       | `/api/team/join`                       | Join team          |

### Inspiration & Content

| Method       | Route                            | Description      |
| ------------ | -------------------------------- | ---------------- |
| `POST`       | `/api/inspiration/bookmark`      | Bookmark tweets  |
| `GET/DELETE` | `/api/inspiration/bookmark/[id]` | Manage bookmarks |

### Media & Queue

| Method | Route               | Description                   |
| ------ | ------------------- | ----------------------------- |
| `POST` | `/api/media/upload` | File upload                   |
| `GET`  | `/api/queue/sse`    | SSE streaming for job updates |

### Referrals & Affiliates

| Method | Route                    | Description            |
| ------ | ------------------------ | ---------------------- |
| `POST` | `/api/referral/validate` | Validate referral code |
| `POST` | `/api/affiliate`         | Affiliate operations   |

### Misc

| Method           | Route                       | Description             |
| ---------------- | --------------------------- | ----------------------- |
| `POST`           | `/api/chat`                 | AI chat (OpenRouter)    |
| `POST`           | `/api/feedback`             | User feedback           |
| `GET/POST`       | `/api/feedback/[id]/upvote` | Feedback votes          |
| `POST`           | `/api/link-preview`         | Link preview generation |
| `POST`           | `/api/notifications`        | Notifications           |
| `GET`            | `/api/templates`            | Templates               |
| `GET/PUT/DELETE` | `/api/templates/[id]`       | Template operations     |
| `GET`            | `/api/diagnostics`          | System diagnostics      |
| `POST`           | `/api/announcement`         | Announcements           |
| `POST`           | `/api/community/contact`    | Community contact       |

### Cron

| Method | Route                       | Description                                |
| ------ | --------------------------- | ------------------------------------------ |
| `POST` | `/api/cron/billing-cleanup` | Billing cleanup & grace period enforcement |

---

## Dashboard Pages

### User Dashboard

| Route                     | Description                  |
| ------------------------- | ---------------------------- |
| `/dashboard/compose`      | Tweet composer               |
| `/dashboard/queue`        | Scheduled queue              |
| `/dashboard/drafts`       | Draft posts                  |
| `/dashboard/calendar`     | Content calendar             |
| `/dashboard/analytics`    | Tweet analytics              |
| `/dashboard/inspiration`  | Inspiration feed & bookmarks |
| `/dashboard/ai`           | AI tools hub                 |
| `/dashboard/affiliate`    | Affiliate program dashboard  |
| `/dashboard/referrals`    | Referral program             |
| `/dashboard/achievements` | Achievement badges           |
| `/dashboard/jobs`         | Background job status        |
| `/dashboard/settings`     | Account settings             |
| `/dashboard/onboarding`   | Onboarding flow              |

### Admin Dashboard

| Route                  | Description                  |
| ---------------------- | ---------------------------- |
| `/admin/subscribers`   | User management              |
| `/admin/billing`       | Billing overview & analytics |
| `/admin/feature-flags` | Feature flag controls        |
| `/admin/announcement`  | System announcements         |
| `/admin/roadmap`       | Product roadmap              |
| `/admin/teams`         | Team management              |
| `/admin/referrals`     | Referral analytics           |
| `/admin/ai-usage`      | AI usage analytics           |
| `/admin/health`        | System health monitoring     |
| `/admin/content`       | Content moderation           |
| `/admin/agentic`       | Agentic posting analytics    |
| `/admin/affiliate`     | Affiliate program admin      |
| `/admin/notifications` | Admin notifications          |
| `/admin/audit`         | Audit log viewer             |
| `/admin/impersonation` | Impersonation logs           |
| `/admin/jobs`          | Job monitoring               |
