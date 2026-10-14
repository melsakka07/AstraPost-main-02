# AstraPost — User Feature Inventory

Complete, code-verified inventory of every feature available to end users.
**The code is the only source of truth** — every item below is backed by a
file reference that can be checked.

Sources of truth used:

| Fact                         | File                                                                 |
| ---------------------------- | -------------------------------------------------------------------- |
| Plans, quotas, enabled tools | `src/lib/plan-limits.ts`                                             |
| Feature gates (32)           | `GatedFeature` in `src/lib/middleware/require-plan.ts`               |
| AI tool list                 | `TOOL_META` / `TOOL_ORDER` in `src/components/ai/ai-tools-grid.tsx`  |
| Navigation (user features)   | `SIDEBAR_SECTIONS` in `src/components/dashboard/sidebar-nav-data.ts` |
| All API capabilities         | 185 route handlers under `src/app/api/`                              |
| All dashboard pages          | 32 pages under `src/app/dashboard/`                                  |
| Feature flags                | `DEFAULT_FLAGS` in `src/lib/feature-flags.ts`                        |
| Notification types (23)      | `notificationTypeEnum` in `src/lib/schema.ts`                        |

---

## 1. Plans & entitlements

Every user gets a **14-day free trial with full Pro feature access** (capped
quotas — `TRIAL_EFFECTIVE_PLAN = "trial"`). After the trial, limits apply per plan:

| Capability                      | Free             | Trial (14 days) | Pro ($29/mo, $290/yr) | Agency ($99/mo, $990/yr) |
| ------------------------------- | ---------------- | --------------- | --------------------- | ------------------------ |
| Posts / month                   | 20               | 20              | Unlimited             | Unlimited                |
| AI text generations / month     | 20               | 50              | 150                   | Unlimited                |
| AI images / month               | 10               | 25              | 50                    | Unlimited                |
| X accounts                      | 1                | 1               | 3                     | 10                       |
| Instagram accounts              | 0                | 0               | 1                     | 5                        |
| LinkedIn accounts               | 0                | 0               | 0                     | 5                        |
| Schedule horizon                | 14 days          | 14 days         | 90 days               | Unlimited                |
| Analytics retention             | 7 days           | 90 days         | 90 days               | 365 days                 |
| Analytics export                | —                | CSV/PDF         | CSV/PDF               | White-label PDF          |
| Enabled tools                   | Inspiration only | All Pro tools   | All Pro tools         | All Pro + LinkedIn       |
| Team members                    | —                | —               | —                     | 5                        |
| Inspiration bookmarks           | 5                | Unlimited       | Unlimited             | Unlimited                |
| YouTube → Thread                | —                | 30/mo, ≤20 min  | 30/mo, ≤20 min        | Unlimited, ≤90 min       |
| X API spend ceiling (per month) | $0.80            | $0.80           | $5.00                 | Unlimited                |

Plan gates (32) live in `src/lib/middleware/require-plan.ts`; limits in
`src/lib/plan-limits.ts`.

## 2. Content creation & scheduling

- **Compose** (`/dashboard/compose`) — tweet/thread editor:
  - Multi-tweet threads, live character counter (280 + tier limits, weighted length)
  - Image/video upload + **media library picker**, **link preview**
  - Keyboard shortcuts, auto-save **drafts**, save/load **tweet templates**
  - Target-account selector, AI tools panel, **best-time-to-post suggestions**,
    AI length selector, AI image dialog, publishing panel (post now / pick date-time)
- **Drafts** (`/dashboard/drafts`) — autosave, draft list, resume editing, delete
- **Schedule** (`/dashboard/schedule`) — calendar + list views, reschedule, **retry failed posts**
- **Bulk import** — CSV upload of posts, scheduled in bulk (`/api/posts/bulk`)
- **Templates** — reusable tweet/thread templates (`/api/templates`)

## 3. AI tools

12 tools from `ai-tools-grid.tsx` plus extras:

| Tool                | What it does                                                                                                      | Plan |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | ---- |
| Thread Writer       | Write full threads from a topic                                                                                   | Free |
| Hashtag Generator   | MENA-aware hashtags (banlist filtered)                                                                            | Free |
| URL → Thread        | Turn any article/link into a thread                                                                               | Pro  |
| PDF → Thread        | Upload PDF → extract text → generate thread (async job)                                                           | Pro  |
| YouTube → Thread    | 5-phase pipeline: download audio (yt-dlp) → transcribe (Deepgram/Whisper) → generate thread → moderation → save   | Pro  |
| Agentic Posting     | 5-step autonomous pipeline (Research → Strategy → Write → Images → Review), SSE live progress, approve/regenerate | Pro  |
| A/B Variants        | Generate A/B variants of a tweet                                                                                  | Pro  |
| Bio Optimizer       | 3 X bio variants                                                                                                  | Pro  |
| Reply Generator     | Suggested replies                                                                                                 | Pro  |
| AI Content Calendar | Full posting calendar                                                                                             | Pro  |
| AI Discovery        | Trending topics + YouTube content ideas                                                                           | Pro  |
| Import & Adapt      | Import an existing tweet by URL and adapt it                                                                      | Pro  |

Extras (verified via API routes): AI **image generation** (Replicate, status
polling, SSRF-safe download), **AI Chat assistant** (`/chat`), **Translate**
(ar/en), **Summarize**, **Enhance Topic**, **Refine with feedback**, **Viral
Score**, **Thread First Image** (16:9), **Template Generate**, **Trending
inspiration by niche**, **AI usage page**, **AI history page** (flag
`ai_history_page`), AI output feedback, **voice profile** (AI learns your style).

## 4. Analytics (`/dashboard/analytics`)

Followers growth, impressions, engagement rate, top tweets, per-tweet analytics
drawer, viral score + viral-hour charts, **best-time heatmap**, **competitor
analysis**, insights cards, manual refresh, date-range + account selectors,
**export CSV/PDF** (Pro) / white-label PDF (Agency).

## 5. Inbox (`/dashboard/inbox`)

Mentions, replies, quote-tweets (unread badge in sidebar); filter bar; mark read;
archive; **bulk actions**; in-app **reply composer** (Pro: `inbox_reply` gate);
**AI reply suggestions** (`/api/inbox/[id]/ai-suggestions`).

## 6. Social accounts

- **X (Twitter)** — OAuth connect, default account, sync, **health check**,
  **X Premium tier sync**, tweet lookup; 1/3/10 accounts by plan; monthly X API
  spend ceiling.
- **Instagram** — OAuth connect + disconnect. Publishing behind flag
  `instagram_publishing` = **off (coming soon)**.
- **LinkedIn** — OAuth connect + disconnect. Publishing behind flag
  `linkedin_publishing` = **off (coming soon)**; `linkedin` tool is Agency-only.

## 7. Settings (`/dashboard/settings`)

Profile form, **voice profile**, privacy settings, notification preferences,
connected accounts, **plan usage meter**, billing (upgrade/downgrade with
preview, **promo codes**, Stripe checkout + portal, cancel), **team management**
(invite, roles, switch team), resume onboarding, replay product tour, X account
health check.

## 8. Growth & community

- **Referrals** — flag `referral_program` = **on**: codes, reward credits,
  trial-extension rewards (`referral_credit_earned`, `referral_trial_extended`).
- **Affiliate dashboard** — affiliate links (Amazon/Noon/AliExpress/other) with
  short links (`/go/[shortCode]`), click stats, funnel/trends.
- **Achievements** — gamification: badges, milestones, progress.
- **Roadmap feedback** — submit feature requests + upvote.
- **Announcements & Changelog** — in-app news and product updates.
- **Community contact** — contact form.
- **Notifications** — 23 event types: post failed, post over quota, account
  inactive, tier-downgrade warning, token expiring soon, billing events
  (checkout, payment failed/succeeded, trial end, grace period, plan change,
  cancellation, reactivation, accounts over limit, posts moved to draft),
  webhook failure, referral rewards.

## 9. Account & data

Sign-up / login / password reset (email-password + **X OAuth** sign-in,
`trustedProviders: ["twitter"]`), team switching, **export your data**,
**delete account**, AI usage summary, onboarding wizard (resume/skip + tour).

## 10. Public pages (pre-login)

Pricing, features, blog, docs, resources, legal, roadmap, changelog, community,
announcement — under `src/app/(marketing)/` + `src/app/(auth)/`.

## 11. Admin-only (not user features)

Users (suspend, grant quota, extend trial, impersonate), subscribers, billing
overview/analytics/transactions, AI usage & cost, operations center, X cost,
queue jobs, feature-flag toggles, promo codes, roadmap moderation,
notifications & announcements, webhooks (+replay, DLQ), audit log, teams,
referral/affiliate management, activity feed, soft-delete recovery, health &
diagnostics — under `/admin` and `/dashboard/admin`, guarded by `requireAdmin()`.

---

## Feature flag status (today)

| Flag                   | Status                |
| ---------------------- | --------------------- |
| `ai_image_generation`  | On                    |
| `instagram_publishing` | **Off — coming soon** |
| `linkedin_publishing`  | **Off — coming soon** |
| `referral_program`     | On                    |
| `team_collaboration`   | On                    |
| `promo_codes`          | On                    |
| `ai_history_page`      | On                    |

Everything else listed above is live. When a flag or limit changes, update this
file — the code remains the source of truth.
