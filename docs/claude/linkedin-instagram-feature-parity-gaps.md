# LinkedIn & Instagram — Feature Parity Gap Analysis vs X

**Date:** 2026-05-19
**Status:** Reference document — scope decision locked: publishing-only parity for now
**Related plan:** `.claude/plans/linkedin-instagram-integration-sorted-cerf.md`

---

## Why this doc exists

The approved LinkedIn + Instagram integration plan delivers **publishing parity** only — a user can connect, schedule, and publish text + single image/video posts. Many other X-related features in AstraPost remain X-only and are **not** addressed by that plan.

This doc inventories the gap so:

1. Sales / support knows what to tell LinkedIn / Instagram customers.
2. Future planning has a starting point if "true feature parity" becomes a priority.
3. Engineers don't accidentally assume LinkedIn / Instagram posts get the same analytics or AI treatment as X.

---

## ✅ Works cross-platform after the publishing plan ships

| Feature                                                      | Why it works                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| Connect / disconnect accounts                                | OAuth flows already exist for both                           |
| Schedule a single post                                       | Publisher abstraction (Phase 2 of plan)                      |
| Schedule with single image or video                          | Phase 1+2 of plan                                            |
| Token auto-refresh, auto-deactivate on auth failure          | Phase 1+2 of plan                                            |
| Recurrence patterns, approval workflow                       | Logic is platform-agnostic                                   |
| Plan gates & quota enforcement                               | `require-plan.ts` already gates per-platform                 |
| AI hook generation, AI image generation, hashtag suggestions | Content-based, not platform-aware                            |
| Link previews in composer                                    | Generic HTML scraping                                        |
| Best-times suggestion (algorithm)                            | Algorithm is generic — but its data source isn't (see below) |

---

## ❌ Remains X-only after the publishing plan

| Feature                                             | File / location                                                         | Why it's X-only                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Engagement analytics (likes, retweets, impressions) | `src/lib/services/analytics.ts:84-107`                                  | `analyticsProcessor` calls X API only                               |
| `tweetAnalytics` table                              | `src/lib/schema.ts:609-639`                                             | Schema keyed on `xTweetId`                                          |
| Follower snapshots & growth charts                  | `src/lib/services/analytics.ts:206-210`, `schema.ts:456-471`            | `followerSnapshots` table is X-only; no LinkedIn/IG capture service |
| Best-times **data source**                          | `src/app/api/analytics/best-time/route.ts`                              | Reads from X-only analytics                                         |
| Trending topics                                     | `src/app/api/ai/trends/route.ts:30`                                     | Pulls from X API only ("trending on X")                             |
| Competitor analysis                                 | `src/lib/services/competitor-analysis.ts:52,104`                        | Searches X via Twitter API v2                                       |
| Tweet import / "inspired by tweet"                  | `src/lib/services/tweet-importer.ts:52,103-112`                         | Twitter API v2 only                                                 |
| AI thread generation                                | `src/app/api/ai/thread/route.ts:7,22`                                   | Hardcoded 280/2000 char fitter (LinkedIn: 3000, Instagram: 2200)    |
| Composer character counter                          | `src/components/composer/tweet-card.tsx:118-130`                        | Baseline 280; doesn't switch by selected platform                   |
| Tier display & tier refresh job                     | `src/lib/services/x-subscription.ts`, `src/lib/queue/processors.ts:909` | X Premium concept doesn't map to other platforms                    |
| Dashboard follower stats                            | `src/app/dashboard/page.tsx:41,131`                                     | Pulls `analytics[0].avg` from X-only data                           |

---

## Deferred by the publishing plan's own scope

These were intentionally cut for the first ship — separate effort if/when requested:

- **Instagram carousel** (multi-image) — single image only
- **Instagram Reels** — single video only, no Reels-specific lifecycle
- **Instagram Stories** — out of scope
- **LinkedIn organization (company page) posting** — person-only (`urn:li:person:...`)
- **LinkedIn Articles / long-form** — out of scope
- **Native multi-post threading** on LinkedIn / Instagram — neither platform supports it natively; the plan silently concatenates rows with `\n\n` instead

---

## Customer-facing implication

After the publishing plan ships, a user can **post** to all three platforms, but **LinkedIn and Instagram posts are second-class citizens for everything post-publish**:

- No engagement metrics shown in dashboard
- No follower growth tracking
- No AI generation tuned to platform character limits
- No competitor / trends signals from those platforms
- Composer still treats every post like a tweet (280-char counter)

Support copy suggestion: _"Scheduling and publishing to LinkedIn and Instagram is fully supported. Analytics, trends, and competitor insights for these platforms are planned but not yet available."_

---

## Roadmap for true feature parity (not approved — for future reference)

If parity becomes a priority, the work clusters into 5 phases:

1. **Analytics parity** — Generalize `tweetAnalytics` → `postAnalytics` with `platform` column. Build `linkedinAnalyticsService` (UGC posts API + reactions/comments/shares) and `instagramAnalyticsService` (Insights API for impressions, reach, engagement). Extend `analyticsProcessor` to fan out by `post.platform`.
2. **Follower snapshot parity** — Same generalization for `followerSnapshots`. Note LinkedIn's vanity-only follower API and Instagram's `follower_count` from Insights.
3. **AI generation parity** — Replace hardcoded 280 fitter in `src/app/api/ai/thread/route.ts` with `getCharLimit(platform, tier?)`. Tune prompt templates per platform (Instagram hashtag norms differ; LinkedIn favors paragraph form).
4. **Composer parity** — Make character counter and thread UI platform-aware. The composer already knows the selected accounts via `target-accounts-select.tsx`, so this is a presentation change, not state-model surgery.
5. **Discovery parity** — Pragmatic stance: LinkedIn doesn't expose useful trending APIs; Instagram Insights is limited. Likely accept this gap rather than build half-working features.

Estimated effort: ~2–3 weeks of focused work across phases 1–4. Phase 5 likely WONTFIX.

---

## Related docs

- Approved publishing plan: `.claude/plans/linkedin-instagram-integration-sorted-cerf.md`
- Architecture overview: `docs/claude/architecture.md`
- AI endpoints inventory: `docs/claude/AI_Endpoints_Models_and_Prompts_Full_Audit_Report.md`
