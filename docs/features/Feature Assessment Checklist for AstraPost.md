Feature Assessment Checklist for AstraPost

A practical scorecard for any new feature proposal. Run through each section before committing engineering time. If you can't answer a question, that's a research item, not a green light.

---

1. Strategic Fit (the "why bother" gate)

- Does it serve the MENA-Arabic-X creator core? If the feature is generic English-first, ask whether it pulls focus from your wedge.
- Which tier does it unlock? Free (acquisition), Trial (conversion), Pro (retention), Agency (expansion). A feature serving none of these is a vanity build.
- Does it differentiate from Buffer/Hootsuite/Typefully? If competitors have it, you're playing catch-up — fine, but rank it lower than greenfield differentiators.
- Does it move a pirate metric? Acquisition / Activation / Retention / Revenue / Referral — name the one. "It's cool" doesn't count.
- Does it leverage existing primitives? Agentic pipeline, voice profile, analytics snapshots, BullMQ, pgvector — reusing these is force-multiplying. Building a parallel system is debt.
- Will it still matter in 12 months? Some features chase a model/platform fad (e.g., a specific LLM trick) and rot fast.

2. User Value (the "would they actually use it" gate)

- Named user persona — solo MENA creator, agency operator, brand manager. Not "users."
- Specific pain it removes — describe the moment of frustration the feature eliminates. If you can't, the feature is solving a builder fantasy.
- Frequency of use — daily / weekly / monthly / once. Daily features earn loyalty; once-features are checkbox bloat.
- Manual workaround today — what does the user do without this feature? If "nothing, they live with it," demand is unproven.
- Discoverability path — where in the UI does the user encounter this? Hidden features have ~zero adoption.
- Does it create a "have to come back" loop? Scheduled features and analytics naturally do this; one-shot tools don't.
- Onboarding cost for the user — does it need new config, voice training, or learning a concept? Higher = lower adoption.

3. Business & Pricing (the "does the unit economics work" gate)

- Plan-tier placement decided — Free / Trial / Pro / Agency, with the canUse\* flag named.
- Quota weight justified — refine costs 1, agentic costs 5. New AI feature: pick a defensible number based on token cost and runtime.
- Worst-case monthly cost per user modeled — (tokens per call × calls per month × $/1K from MODEL_PRICING). Multiply by user count. If this number scares you at 1,000 paid users,  
  redesign.
- Marginal cost vs marginal revenue — does the feature push users to upgrade enough to cover its compute cost?
- Is it a moat or a marketing line? Agentic Posting is a moat. Hashtag suggestion is a marketing line. Both are fine — be honest about which.
- Upsell story — what's the "this is free up to X, $20/mo for unlimited" pitch?
- Will Free users abuse it? Rate limits in rate-limiter.ts plus quota weight need to make abuse unprofitable.
- External API costs? X Premium API ($200–5,000/mo), OpenAI moderation, Replicate per-image — model these per call, not per month.

4. Risk & Compliance (the "could this hurt us" gate)

- Brand-safety risk on auto-generated content — drafts vs auto-publish. Default: drafts. Auto-publish requires explicit user opt-in per post type.
- MENA cultural sensitivity — religion, politics, gender, Israel/Palestine, royal family commentary. If the feature could touch these unprompted, build a topic allowlist or block-list.
- Moderation pipeline runs? Every AI-generated artifact reaching the user must pass checkModeration(). No exceptions.
- Prompt-injection surface — does the feature ingest URLs, tweets, or external text? Wrap with wrapUntrusted() + redactPII() + INPUT_LIMITS.
- Platform TOS compliance — does it violate X's automation rules (mass DMs, follow/unfollow, engagement bots, near-duplicate posting)? Read the actual TOS, not vibes.
- GDPR / data residency — does it process EU user data? Store anything new long-term?
- PII leak surface — anything user-supplied that flows to a third-party LLM must be PII-redacted.
- Rate limit / DoS surface — can a single user (or attacker) burn your provider budget? Fail-closed in rate-limiter.ts for cost-sensitive types.
- Account-suspension risk for the user — auto-replies, near-duplicate posting, high-velocity posting. If the feature could get a user banned, that's worse than getting yourself banned.
- Audit trail — for billing/admin actions, logged to planChangeLog / aiGenerations / similar. No black-box state changes.

5. Technical Architecture (the "can we actually build it cleanly" gate)

- Reuses existing layer or introduces a parallel one? New parallel auth/quota/queue system = NO. New table for new domain = OK.
- Fits the 9-step API route checklist (auth → role → correlation → validate → rate → gate → logic → enqueue → return).
- Schema impact — new tables / columns / indexes. Migration plan + rollback plan.
- Multi-table writes wrapped in db.transaction() — and queue jobs enqueued after commit.
- server-only boundary respected for any module touching db.ts.
- AI calls go through aiPreamble() — not manual auth/quota/model wiring.
- Polling loops use AbortController + 8s timeout — no exceptions.
- Logger, not console — structured fields, with correlationId.
- exactOptionalPropertyTypes spread pattern for optional props.
- Idempotency — for any mutation that could be retried (jobs, webhooks, AI POSTs), define the dedup key.
- Failure modes named — what happens when OpenRouter is down, Redis is down, X API rate-limits, image gen times out? Each one needs a defined behavior, not "throw and pray."
- Background work uses BullMQ — never inline long-running operations in a request.
- Cron job? Schedule + secret + lock against double-runs.

6. Performance & Cost at Runtime

- Latency budget — interactive (<1s), feedback-on-demand (<5s), background (no limit but progress UI). Where does this feature fall?
- Token budget per call — input cap via INPUT_LIMITS, output cap via maxTokens. Don't let users send 100K-token articles.
- Cache layer identified — Redis idempotency, response caching (trends 30min, inspiration 6h), nothing? Pick deliberately.
- Model selection — Free model (OPENROUTER_MODEL_FREE) for low-stakes, Agentic model for high-stakes. Don't burn Claude Opus on hashtag suggestions.
- Streaming vs blocking — streaming for >2s LLM calls (better UX, earlier abort).
- N+1 query check — especially for analytics-heavy features.
- Index plan — new query patterns need index analysis. EXPLAIN before merging.
- Bundle size impact — new heavy client deps? Dynamic-import them.

7. UX & Frontend (the "will it feel right" gate)

- Mobile-first responsive layout — fluid, not just media queries.
- RTL Arabic + LTR English both tested — including form inputs, drawers, calendars.
- WCAG color contrast verified for every new state.
- Loading / empty / error / success states all designed — not just the happy path.
- i18n strings added to both ar.json and en.json. No hardcoded English.
- Optimistic updates where safe — schedule, save draft, toggle. Roll back on error.
- Destructive actions confirmed — delete, publish-now, cancel-subscription. Two-tap minimum.
- Undo where reasonable — soft-delete with time window beats confirmation dialogs.
- Discoverability — where does the user find this? In-app tour entry, dashboard tile, contextual button?
- First-use empty state teaches the feature — don't drop users into an empty grid.

8. Observability & Operations

- Sentry-tagged errors with feature name.
- Structured log events named: feature_x_started, feature_x_completed, feature_x_failed.
- Success metric defined — how do you know it's working in prod? (e.g., "P50 completion < 8s, error rate < 1%, adoption > 15% of Pro users in 30 days").
- Dashboard / admin telemetry endpoint — for AI features, extends /api/admin/ai-usage.
- Kill switch — feature flag or per-user pause. Cron-driven autonomous features REQUIRE this.
- Cost alarm threshold updated — if the feature meaningfully changes daily AI spend, raise AI_DAILY_BUDGET_USD.
- Runbook for failure modes — written in docs/claude/recent-changes.md or docs/claude/runbooks/.

9. Quality Gates (the "is it actually done" gate)

- pnpm run check passes (lint + typecheck — no new any, no @ts-ignore)
- pnpm test passes with new unit tests for the feature
- Integration test for the happy path — at minimum
- Manual E2E in a browser — golden path + 1 edge case + RTL
- No new console.\* calls — logger only
- No new NextResponse.json() — Response.json() only
- No hardcoded model names — env vars only
- No getPlanLimits() in route handlers — gate helpers only
- Code review by convention-enforcer + security-reviewer

10. Documentation & Comms

- docs/0-MY-LATEST-UPDATES.md entry written
- CLAUDE.md updated if it changes architecture or hard rules
- AI audit doc updated if the feature adds an AI endpoint, prompt, or env var
- README.md updated if it changes plan limits, env vars, or the high-level feature list
- Stripe price ID / plan flag wired if it's gated
- i18n translations reviewed by an Arabic speaker before launch (not just machine-translated)
- Launch comms — in-app announcement, email, changelog post

11. Rollout Plan

- Behind a feature flag — never merge dark to all users
- Internal dogfooding — your own account uses it for at least 7 days before any external user
- % rollout schedule — 5% → 25% → 100% over 1–2 weeks for risky features
- Rollback plan — feature flag off + DB migration reversibility
- Success/failure decision date — set a "we kill this if X by Y" tripwire upfront

---

The "STOP" signals (any one of these = redesign before building)

- The cost model breaks at 1,000 paid users.
- The feature requires auto-publish to be useful.
- It depends on X Premium API and you haven't priced the tier.
- It's "agentic" but has no human approval gate.
- It can post about politics/religion/breaking news without a topic allowlist.
- The only metric for success is "users find it cool."
- It introduces a parallel auth/quota/queue system instead of using existing ones.
- You can't articulate the upsell story in one sentence.
- You can't name the failure modes when each external dependency goes down.

---

How to use this

1. Pre-greenlight: answer Section 1–4 in writing. If any section has unresolved STOP signals, redesign or shelve.
2. Pre-implementation: complete Section 5–7 as part of the plan in .claude/plans/.
3. Pre-merge: Section 8–9 are PR-blockers.
4. Pre-launch: Section 10–11 are launch-blockers.

Treat the checklist as a forcing function, not bureaucracy. If a feature flunks 3+ items in Section 4 (Risk), the answer is don't build it yet — not build it and hope. The cheapest bug is the one you didn't ship.
