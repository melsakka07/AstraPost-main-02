# Subscription Plans, Pricing & Quota Audit — Revenue-Leakage Review

**Date:** 2026-06-03
**Scope:** Plan tiers, prices, per-plan feature gating, and per-plan quota tracking for **all** billable services — AI text generation, AI image generation, and agentic services.
**Method:** Source-of-truth review of the code base only. No assumptions from marketing copy or docs.
**Verdict:** Text generation is well-gated and leak-resistant (atomic, weighted counter). **Image generation and agentic image generation contain real revenue leaks.** Details and fixes below.

> **Remediation status (2026-06-03): ALL FINDINGS RESOLVED.**
>
> - **L-1, L-2, L-3 — FIXED** via the atomic, weighted image-quota counter (`user_image_counters` + `src/lib/services/ai-image-quota-atomic.ts`, migration `drizzle/0089_fast_frank_castle.sql`). Image credits consumed up-front weighted by `IMAGE_MODEL_COST`, released on failure/fallback; the agentic pipeline gates every image.
> - **L-4 — FIXED** — `enhance-topic` now consumes 1 text credit (releases on failure).
> - **L-5 — FIXED** (both halves) — `getMonthlyAiUsage` and `getMonthlyImageUsage` now read the authoritative weighted counters (`getAiUsageUnits` / `getImageUsageUnits`), so agentic/pdf/youtube (weight 5) and pro image models display the real consumption.
> - **L-6 — FIXED** — dead `checkAiQuotaDetailed` and the now-unused `checkAiImageQuotaDetailed` removed.
> - **L-7 — FIXED** — the image auto-prompt LLM call now records real token usage + cost; `trends` documented as intentionally quota-free (global 30-min cache, not per-user).
>
> See `docs/0-MY-LATEST-UPDATES.md` (2026-06-03).

---

## 1. Source-of-truth files

| Concern                                    | File                                            |
| ------------------------------------------ | ----------------------------------------------- |
| Plan limits + image-model cost weights     | `src/lib/plan-limits.ts`                        |
| Plan gates (feature + quota)               | `src/lib/middleware/require-plan.ts`            |
| Atomic text-quota counter                  | `src/lib/services/ai-quota-atomic.ts`           |
| Usage recording / display                  | `src/lib/services/ai-quota.ts`                  |
| AI route preamble (auth→gate→quota→model)  | `src/lib/api/ai-preamble.ts`                    |
| Prices (USD cents)                         | `src/lib/pricing.ts`                            |
| Stripe price-ID → plan mapping + lifecycle | `src/app/api/billing/webhook/route.ts`          |
| Monthly counter rollover                   | `src/app/api/cron/ai-counter-rollover/route.ts` |
| Image generation (start)                   | `src/app/api/ai/image/route.ts`                 |
| Image generation (complete + record)       | `src/app/api/ai/image/status/route.ts`          |
| Agentic pipeline (incl. image step)        | `src/lib/services/agentic-pipeline.ts`          |

---

## 2. Plan & price matrix (as defined in code)

Prices from `src/lib/pricing.ts`; limits from `PLAN_LIMITS` in `src/lib/plan-limits.ts`.

|                       | **Free**         | **Trial** (14 d) | **Pro Monthly**           | **Pro Annual**                    | **Agency**                                   |
| --------------------- | ---------------- | ---------------- | ------------------------- | --------------------------------- | -------------------------------------------- |
| Price                 | $0               | $0               | **$29/mo**                | **$290/yr** (~$24.17/mo, 17% off) | **$99/mo** / **$990/yr**                     |
| Stripe price-ID env   | —                | —                | `STRIPE_PRICE_ID_MONTHLY` | `STRIPE_PRICE_ID_ANNUAL`          | `STRIPE_PRICE_ID_AGENCY_MONTHLY` / `_ANNUAL` |
| Posts / month         | 20               | 20               | ∞                         | ∞                                 | ∞                                            |
| AI text gens / month  | 20               | 50               | 150                       | 150                               | ∞ (`-1`)                                     |
| AI images / month     | 10               | 25               | 50                        | 50                                | ∞ (`-1`)                                     |
| Image models          | base only¹       | base only¹       | all⁴                      | all⁴                              | all⁴                                         |
| X accounts            | 1                | 1                | 3                         | 3                                 | 10                                           |
| Instagram accounts    | 0                | 0                | 1                         | 1                                 | 5                                            |
| LinkedIn accounts     | 0                | 0                | 0                         | 0                                 | 5                                            |
| Schedule horizon      | 14 d             | 14 d             | 90 d                      | 90 d                              | ∞                                            |
| Pro AI tools²         | inspiration only | all              | all                       | all                               | all + LinkedIn                               |
| YouTube→thread / mo   | 0 (blocked)      | 30               | 30                        | 30                                | ∞                                            |
| YouTube max duration  | —                | 20 min           | 20 min                    | 20 min                            | 90 min                                       |
| Analytics retention   | 7 d              | 90 d             | 90 d                      | 90 d                              | 365 d                                        |
| Analytics export      | none             | csv_pdf          | csv_pdf                   | csv_pdf                           | white_label_pdf                              |
| Inspiration bookmarks | 5                | ∞                | ∞                         | ∞                                 | ∞                                            |
| Team members          | —                | —                | —                         | —                                 | 5                                            |

¹ base = `nano-banana-2`, `nano-banana` (cost weight 1).
² `PRO_TOOLS` = threads, video/gif, affiliate, viral score, best-times, voice profile, inspiration, calendar, url-to-thread, variants, competitor, reply, bio, agentic, tools, pdf-to-thread, youtube-to-thread.
⁴ all = base + `nano-banana-pro` (weight 3) + `gpt-image-2` (weight 5) — `IMAGE_MODEL_COST` in `plan-limits.ts:176`.

**Consistency check — PASS:** Stripe `getPlanFromPriceId()` (`webhook/route.ts:113`) maps all four price IDs server-side; client metadata is never trusted; unknown price IDs default to `pro_monthly` (fails safe, never grants Agency). `PricingTier` splits `agency_monthly`/`agency_annual` for display but both collapse to the single `agency` `PlanType` — intentional and consistent (Agency limits are billing-cycle independent).

---

## 3. Per-service gating & tracking matrix

Legend: **Gate** = feature/access check · **Quota** = what monthly budget it draws from · **Recorded** = how usage is persisted.

### 3a. Text generation (OpenRouter via `aiPreamble`)

| Endpoint                                | Feature gate                           | Quota (weight)          | Recorded          | Status                                    |
| --------------------------------------- | -------------------------------------- | ----------------------- | ----------------- | ----------------------------------------- |
| `ai/thread`                             | canUseAi                               | text ×1                 | `recordAiUsage`   | ✅                                        |
| `ai/translate`                          | canUseAi                               | text ×1                 | ✅                | ✅                                        |
| `ai/hashtags`                           | canUseAi                               | text ×1                 | ✅                | ✅                                        |
| `ai/inspire`, `ai/inspiration`          | canUseAi                               | text ×1                 | ✅                | ✅                                        |
| `ai/template-generate`                  | canUseAi                               | text ×1                 | ✅                | ✅                                        |
| `ai/refine`                             | canUseAi                               | text ×1                 | telemetry→record  | ✅                                        |
| `ai/calendar`                           | content_calendar                       | text ×1                 | ✅                | ✅                                        |
| `ai/variants`                           | variant_generator                      | text ×1                 | ✅                | ✅                                        |
| `ai/summarize`                          | url_to_thread                          | text ×1                 | ✅                | ✅                                        |
| `ai/reply`                              | reply_generator                        | text ×1                 | ✅                | ✅                                        |
| `ai/bio`                                | bio_optimizer                          | text ×1                 | ✅                | ✅                                        |
| `ai/affiliate`                          | affiliate_generator                    | text ×1                 | ✅                | ✅                                        |
| `ai/tools`                              | tools                                  | text ×1                 | ✅                | ✅                                        |
| `ai/score` (viral)                      | viral_score                            | **none** (skipQuota)    | record only       | ✅ by design³                             |
| `ai/trends`                             | canUseAi                               | **none** (skipQuota)    | record only       | ⚠️ see L-7                                |
| `ai/enhance-topic`                      | **none**                               | **none** (skipQuota)    | record as "tools" | ❌ **L-4**                                |
| `ai/agentic` (POST)                     | agentic_posting                        | text **×5**             | pipeline records  | ✅                                        |
| `ai/agentic/[id]/regenerate`            | agentic_posting                        | text ×5                 | ✅                | ✅                                        |
| `ai/pdf-to-thread/*` (enqueue/generate) | pdf_to_thread                          | text ×5                 | ✅                | ✅                                        |
| `ai/youtube-to-thread` + `/generate`    | youtube_to_thread + monthly + duration | text ×5 (preview skips) | ✅                | ✅ (preview returns metadata only — safe) |

³ Viral score is Pro-gated and intentionally free of quota — acceptable.

**Text enforcement is sound:** `tryConsumeAiQuota` (`ai-quota-atomic.ts:32`) performs a single atomic `UPDATE … WHERE used + weight <= limit`, auto-creates/resets the period row, handles mid-month plan changes, and falls back to admin `ai_quota_grants`. Race-safe. Weights (×5 for agentic/pdf/youtube) correctly reflect higher cost. On generation failure routes call `releaseQuota()`. **No leakage in the text path.**

### 3b. Image generation (Replicate — **not** via `aiPreamble`)

| Endpoint                                          | Model gate                      | Quota check                                         | Recorded (type="image")            | Atomic?             |
| ------------------------------------------------- | ------------------------------- | --------------------------------------------------- | ---------------------------------- | ------------------- |
| `ai/image` (start) → `ai/image/status` (complete) | `checkImageModelAccessDetailed` | `checkAiImageQuotaDetailed(model)`                  | at **completion**, in status route | ❌ count-then-check |
| `ai/thread-first-image`                           | pdf/youtube feature gate        | `checkAiImageQuotaDetailed()` (no model ⇒ weight 1) | inside `generateAgenticImage`      | ❌                  |
| **agentic pipeline image step**                   | **none**                        | **NONE**                                            | inside `generateAgenticImage`      | ❌ **L-2**          |

---

## 4. Revenue-leakage findings (ranked)

### 🔴 L-1 — Image cost-weight is checked but never stored (Pro models massively under-counted)

**Severity: High.**

`checkAiImageQuotaDetailed(userId, model)` (`require-plan.ts:826–865`) computes
`weight = IMAGE_MODEL_COST[model]` and allows when `used + weight <= aiImagesPerMonth`,
where `used = count(*) of aiGenerations rows of type "image"`.

But on success the status route inserts **exactly one row per image regardless of model**
(`image/status/route.ts:276–291`), and `getMonthlyImageUsage` counts rows unweighted
(`ai-quota.ts:99–127`). So the weight only affects the _single_ incremental check — it is never persisted.

**Effect (Pro, limit 50):**

| Model             | weight | Generations actually allowed       | Intended (if weighted) | Over-grant |
| ----------------- | ------ | ---------------------------------- | ---------------------- | ---------- |
| `gpt-image-2`     | 5      | **46** (allowed while `used ≤ 45`) | 10                     | **~4.6×**  |
| `nano-banana-pro` | 3      | **48**                             | ~16                    | ~3×        |

A Pro user can generate ~46 `gpt-image-2` images (the most expensive Replicate model) for a budget meant to cover 10. This is the single largest cost exposure.

**Fix:** persist the weight. Either (a) write `weight` copies / a `cost` column on the `aiGenerations` image row and have `getMonthlyImageUsage` / the gate `SUM(cost)` instead of `COUNT(*)`; or (b) move images onto an atomic counter (see L-3) decremented by `IMAGE_MODEL_COST[model]`.

---

### 🔴 L-2 — Agentic pipeline generates images with **no** image-quota gate

**Severity: High.**

`agentic-pipeline.ts:274–304` calls `generateAgenticImage()` for every tweet with `hasImage && imagePrompt`, inside `Promise.allSettled`, with **no `checkAiImageQuotaDetailed` call**. `includeImages` defaults **on** (`preferences?.includeImages !== false`, line 107). Each image is recorded as `type:"image"` (counts toward _display_) but is never checked against `aiImagesPerMonth` before generation.

**Effect:** one agentic run costs **5 text credits** yet can emit _N_ images (one per tweet — easily 5–10) with **zero** image-quota enforcement. A user with 0 remaining image quota still gets a full illustrated thread. `thread-first-image` (the PDF/YouTube first-tweet image) _does_ gate correctly — the agentic pipeline is the gap.

**Fix:** before the image step, call `checkAiImageQuotaDetailed(userId)` per planned image (or consume an atomic image counter by `imageTweets.length`), and skip/trim images when the budget is exhausted. Surface a "image quota reached — text-only thread" progress event rather than silently generating.

---

### 🟠 L-3 — Image quota is non-atomic and recorded only at completion

**Severity: Medium (concurrency / rapid-fire abuse).**

Unlike text (atomic `userAiCounters`), images use `COUNT(*)` then compare, and the row is written only when the async prediction **succeeds** (`image/status/route.ts:276`). Between `POST /api/ai/image` and the first successful poll (~20 s), `used` does not move. Distinct-prompt requests bypass the dedup/idempotency guards, so a burst within the generation window all read the same `used` and all pass.

The only real backstop is the rate limiter (`ai_image`: free **10/min**, pro **30/min**, agency **60/min** — `rate-limiter.ts:14/23/32`). For a free user (10/month) a single burst can start ~10 generations before any records; for Pro this compounds with L-1.

**Fix:** introduce an atomic image counter analogous to `tryConsumeAiQuota` (decrement at _start_, release on failure — the status route already proves failures don't charge). This also cleanly carries the L-1 weight.

---

### 🟠 L-4 — `enhance-topic` is an ungated, quota-free LLM call for any logged-in user

**Severity: Medium.**

`ai/enhance-topic/route.ts:41` uses `aiPreamble({ skipQuotaCheck: true })` with **no feature gate**. `checkAiLimitDetailed` only checks `canUseAi`, which is `true` for **every** plan including Free. Result: any authenticated user — including Free and expired-trial — can call OpenRouter unlimited times (bounded only by the 20/hr `ai` rate limit). It records as `type:"tools"` but consumes no budget.

**Fix:** either consume text quota (`skipQuotaCheck:false`, weight 1) or gate it behind `checkToolsAccessDetailed`. If it must stay free (it's a tiny helper that prefers the free model), document that decision explicitly and keep the rate limit tight.

---

### 🟡 L-5 — Two divergent text-usage accounting systems (enforcement ≠ display)

**Severity: Low (trust/telemetry, not a leak — enforcement is the stricter one).**

- **Enforcement:** atomic, weighted `userAiCounters` (agentic/pdf/youtube = 5).
- **Display:** `getMonthlyAiUsage` = unweighted `COUNT(*)` of `aiGenerations` rows where `type != "image"` (`ai-quota.ts:69`), surfaced by `/api/ai/quota` and the sidebar.

A user who runs one agentic post consumes **5** from the counter but sees only **+1** in the displayed usage; meanwhile `enhance-topic`/`image_prompt`/`tools` rows inflate the displayed count without consuming the counter. The two numbers drift apart. Enforcement remains correct, but the dashboard, admin AI metrics, and `createPlanLimitResponseWithStats` can mislead users and support.

**Fix:** make display read the authoritative `userAiCounters.used`/`limit`, or weight the row-count query consistently. Pick one ledger as canonical for both enforcement and display.

---

### 🟡 L-6 — `checkAiQuotaDetailed` is dead/legacy

`checkAiQuotaDetailed` (row-count text gate, `require-plan.ts:536`) is referenced only in `require-plan.ts` and its test — **no route uses it**. Real enforcement is the atomic counter inside `aiPreamble`. Leaving it exported invites a future caller to wire it as a second gate and double-count. **Fix:** delete it, or annotate clearly as non-enforcing.

---

### 🟡 L-7 — Uncounted auxiliary LLM calls

- `ai/image` auto-prompt (`generateImagePromptFromTweet`, `image/route.ts:186`) runs an OpenRouter call recorded as `type:"image_prompt"`, `tokensUsed:0`, no quota. Bounded by the image quota that follows, but its text cost is unbilled.
- `ai/trends` (`skipQuotaCheck:true`) is gated by `canUseAi` only (free included) and consumes no budget; it does record usage. Lower risk than L-4 (heavier feature, same rate limit) but same class.

**Fix:** capture real token usage on the image auto-prompt and decide whether trends should consume quota or be Pro-gated.

---

## 5. Edge cases reviewed (and their verdict)

| Edge case                               | Handling                                                                                                                                         | Verdict    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| **Trial (14 d)**                        | `effectivePlan = "trial"` via `getPlanContext`; capped 50 text / 25 image; **base image models only** → L-1 weight leak does **not** reach trial | ✅         |
| **Trial expiry**                        | `trialExpired` flips effective plan to free; audit row written idempotently (`require-plan.ts:147`)                                              | ✅         |
| **Grace period** (`planExpiresAt` past) | Treated as free immediately (`require-plan.ts:113`); atomic counter limit refreshed down on next consume                                         | ✅         |
| **Mid-month upgrade**                   | `refreshLimitAndConsume` raises the counter limit and retries                                                                                    | ✅         |
| **Mid-month downgrade**                 | counter limit lowered; if already over, next consume blocked                                                                                     | ✅         |
| **Downgrade w/ excess accounts/posts**  | webhook deactivates excess IG/LinkedIn, moves excess scheduled posts to draft, notifies on X/team over-limit (`webhook/route.ts:464–654`)        | ✅         |
| **Monthly reset**                       | `getMonthWindow` self-resets both text-counter and image row-window; cron is belt-and-suspenders                                                 | ✅         |
| **Concurrent text gens**                | atomic `UPDATE … WHERE used+weight<=limit`                                                                                                       | ✅         |
| **Concurrent image gens**               | non-atomic count-then-check                                                                                                                      | ❌ **L-3** |
| **Failed image gen**                    | no row written on failure → not charged                                                                                                          | ✅         |
| **Unknown Stripe price ID**             | logged + defaults to `pro_monthly` (never grants Agency)                                                                                         | ✅         |
| **Webhook idempotency**                 | `processedWebhookEvents` insert-first guard                                                                                                      | ✅         |

---

## 6. Remediation priority

1. **L-1** — persist image cost weight (`SUM(cost)` not `COUNT(*)`). _Highest $ impact._
2. **L-2** — gate agentic-pipeline images against image quota.
3. **L-3** — atomic image counter (subsumes L-1 cleanly; closes the concurrency window).
4. **L-4** — gate or charge `enhance-topic`.
5. **L-5 / L-6 / L-7** — unify the display ledger, remove the dead gate, count auxiliary LLM calls.

**Suggested implementation note:** L-1 + L-2 + L-3 are one coherent change — introduce `tryConsumeImageQuota(userId, weight)` mirroring `ai-quota-atomic.ts`, decrement by `IMAGE_MODEL_COST[model]` at generation start in `ai/image`, `thread-first-image`, **and** the agentic pipeline, and `releaseImageQuota` on failure. That single counter fixes weighting, the agentic gap, and the race simultaneously, and gives display a single authoritative source.

---

_Audit limited to gating/tracking correctness. It does not assess Replicate/OpenRouter unit economics or whether the per-plan numeric limits are themselves priced correctly — only that the services are gated and tracked as the plan definitions intend._
