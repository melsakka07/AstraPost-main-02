# AI Cost & Model Reference

> Last verified: 2026-04-12. All information is derived from source code — not inferred.

---

## AI Providers

### 1. OpenRouter (`@openrouter/ai-sdk-provider`)

All text generation. Model names are **always** resolved from environment variables — never hardcoded.

| Env Var                    | Purpose                                                     | Fallback Chain                                                              |
| -------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| `OPENROUTER_MODEL`         | Primary model for all general AI endpoints                  | — (required)                                                                |
| `OPENROUTER_MODEL_AGENTIC` | Dedicated model for Agentic Posting pipeline                | → `OPENROUTER_MODEL`                                                        |
| `OPENROUTER_MODEL_FREE`    | Cheap/free model for quota-exempt endpoints                 | → `OPENROUTER_MODEL`                                                        |
| `OPENROUTER_MODEL_TRENDS`  | Web-search-capable model for trends (e.g. Perplexity Sonar) | → `OPENROUTER_MODEL_FREE` → `OPENROUTER_MODEL_AGENTIC` → `OPENROUTER_MODEL` |

**Note**: A web-search-capable model (e.g. `perplexity/llama-3.1-sonar-large-128k-online`) configured for `OPENROUTER_MODEL_TRENDS` significantly improves trends quality by providing real-time data. Without it the model uses training data.

---

### 2. Replicate API (image generation — Google Gemini models)

All image generation runs through Replicate. The underlying models are Google Gemini image models hosted on Replicate. Model names are always resolved from env vars via `src/lib/services/ai-image.ts`.

| Env Var                    | Model Alias       | Underlying Model              | Resolution  | Plan Access               |
| -------------------------- | ----------------- | ----------------------------- | ----------- | ------------------------- |
| `REPLICATE_MODEL_FAST`     | `nano-banana-2`   | Google Gemini 2.5 Flash Image | 1K (1024px) | All plans                 |
| `REPLICATE_MODEL_PRO`      | `nano-banana-pro` | Google Gemini 3 Pro Image     | 2K (2048px) | Pro + Agency only         |
| `REPLICATE_MODEL_FALLBACK` | `nano-banana`     | Google Gemini 2.5 Flash Image | 1K (1024px) | All plans (auto-fallback) |

**Fallback behavior**: When `nano-banana-2` or `nano-banana-pro` fails for any reason _except_ content safety violations, the system auto-retries with `nano-banana`. Content safety violations are permanent — no fallback, user must adjust prompt.

**Credit protection**: `aiGenerations` table is only written on `succeeded` status. Users are never charged for model failures.

---

## Text Generation Endpoints (OpenRouter)

All endpoints use Vercel AI SDK 5 (`ai` package) and call `recordAiUsage()` for billing.

| Endpoint                          | Method | Model Used                                         | Vercel AI Function                           | Response Type                                              | Use Case                                                                                                                             | Plan Gate                          | Quota Consumed               |
| --------------------------------- | ------ | -------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ---------------------------- |
| `/api/ai/thread`                  | POST   | `OPENROUTER_MODEL`                                 | `streamText`                                 | SSE stream (thread) / plain text (single)                  | Thread or single-post generation with tone, language, voice profile                                                                  | AI access + quota                  | Yes                          |
| `/api/ai/inspire`                 | POST   | `OPENROUTER_MODEL`                                 | `generateText`                               | JSON                                                       | Content adaptation from imported tweets — 6 actions: rephrase, change_tone, expand_thread, add_take, translate, counter_point        | Inspiration access + quota         | Yes                          |
| `/api/ai/score`                   | POST   | `OPENROUTER_MODEL`                                 | `generateObject`                             | JSON `{score, feedback}`                                   | Viral score prediction (0–100) + 3 actionable feedback points                                                                        | Viral score access                 | **No** (skipQuota)           |
| `/api/ai/translate`               | POST   | `OPENROUTER_MODEL`                                 | `generateObject`                             | JSON `{tweets[]}`                                          | Translate thread to target language, preserving meaning and tone                                                                     | AI access + quota                  | Yes                          |
| `/api/ai/trends`                  | GET    | `OPENROUTER_MODEL_TRENDS` → FREE → AGENTIC → MODEL | `generateText`                               | JSON `{trends[], cachedAt, expiresAt}`                     | Trending topics discovery on X per category; Redis-cached 30 min                                                                     | Agentic posting access             | **No** (skipQuota)           |
| `/api/ai/enhance-topic`           | POST   | `OPENROUTER_MODEL_FREE` → `OPENROUTER_MODEL`       | `generateText`                               | JSON `{enhanced}`                                          | Refine a raw topic into a compelling, specific description (<280 chars)                                                              | AI access                          | **No** (skipQuota)           |
| `/api/ai/inspiration`             | GET    | `OPENROUTER_MODEL`                                 | `generateObject`                             | JSON `{topics[{topic, hook}]}`                             | Generate 5 trending/evergreen topic ideas for a given niche; Redis-cached 6 hours                                                    | AI access + quota                  | Yes (fresh only, not cached) |
| `/api/ai/agentic`                 | POST   | `OPENROUTER_MODEL_AGENTIC` → `OPENROUTER_MODEL`    | `generateText` (×4 calls) + Replicate images | SSE stream (pipeline events)                               | **5-step Agentic Pipeline**: research → strategy → write → images → review; produces a full ready-to-publish thread                  | Agentic posting access + quota     | Yes                          |
| `/api/ai/agentic/[id]/regenerate` | POST   | `OPENROUTER_MODEL`                                 | `generateText`                               | JSON `{tweet, tweetIndex}`                                 | Regenerate a single tweet within an existing agentic session; optionally regenerate its image via Replicate                          | AI access + quota                  | Yes                          |
| `/api/chat`                       | POST   | `OPENROUTER_MODEL`                                 | `streamText`                                 | UI Message stream                                          | Free-form AI assistant chat with conversation history                                                                                | AI access + quota                  | Yes                          |
| `/api/ai/affiliate`               | POST   | `OPENROUTER_MODEL`                                 | `generateObject`                             | JSON `{tweet, hashtags, productTitle, affiliateUrl, ...}`  | Generate a high-converting affiliate tweet from a product URL (Amazon, Noon, AliExpress, other)                                      | AI access + quota                  | Yes                          |
| `/api/ai/bio`                     | POST   | `OPENROUTER_MODEL`                                 | `generateObject`                             | JSON `{variants[{text, goal, rationale}]}`                 | Generate 3 optimized X bio variants for different goals                                                                              | Bio optimizer access + quota       | Yes                          |
| `/api/ai/hashtags`                | POST   | `OPENROUTER_MODEL`                                 | `generateObject`                             | JSON `{hashtags[]}`                                        | Suggest 5–10 relevant trending hashtags for tweet content                                                                            | AI access + quota                  | Yes                          |
| `/api/ai/calendar`                | POST   | `OPENROUTER_MODEL`                                 | `generateObject`                             | JSON `{items[{day, time, topic, tweetType, tone, brief}]}` | Generate a content calendar (1–4 weeks, 1–14 posts/week) optimized for MENA posting times                                            | Content calendar access + quota    | Yes                          |
| `/api/ai/reply`                   | POST   | `OPENROUTER_MODEL`                                 | `generateObject`                             | JSON `{replies[{text, style}]}`                            | Generate 5 contextual replies to a tweet URL with configurable tone and goal                                                         | Reply generator access + quota     | Yes                          |
| `/api/ai/summarize`               | POST   | `OPENROUTER_MODEL`                                 | `generateObject`                             | JSON `{tweets[], title, sourceLanguage}`                   | Convert a URL article into an X thread (scrapes article via Cheerio)                                                                 | URL-to-thread access + quota       | Yes                          |
| `/api/ai/template-generate`       | POST   | `OPENROUTER_MODEL`                                 | `streamText`                                 | SSE stream                                                 | Generate content using a predefined template (single / thread-short / thread-long)                                                   | AI access + quota                  | Yes                          |
| `/api/ai/tools`                   | POST   | `OPENROUTER_MODEL`                                 | `generateObject`                             | JSON `{text}`                                              | Three writing tools in one endpoint: **hook** generator, **CTA** writer, tweet **rewriter**                                          | AI access + quota                  | Yes                          |
| `/api/ai/variants`                | POST   | `OPENROUTER_MODEL`                                 | `generateObject`                             | JSON `{variants[{text, angle, rationale}]}`                | Generate 3 alternative tweet versions using different angles (emotional, factual, question)                                          | Variant generator access + quota   | Yes                          |
| `/api/analytics/competitor`       | POST   | `OPENROUTER_MODEL`                                 | `generateObject`                             | JSON `{analysis}`                                          | Analyze a competitor's last 100 tweets fetched from X API v2; produces topics, tone, posting patterns, differentiation opportunities | Competitor analyzer access + quota | Yes                          |
| `/api/user/voice-profile`         | POST   | `OPENROUTER_MODEL`                                 | `generateObject`                             | JSON voice profile                                         | Analyze 3–10 sample tweets to extract writing style profile (tone, vocabulary, formatting habits, do/don'ts)                         | Pro plan (AI access)               | Yes                          |

---

## Image Generation Endpoints (Replicate)

| Endpoint               | Method | Models Used                                                                                     | Use Case                                                                                                                            | Plan Gate                        | Quota Consumed               |
| ---------------------- | ------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------- |
| `/api/ai/image`        | POST   | Replicate (`REPLICATE_MODEL_FAST` / `REPLICATE_MODEL_PRO`) + `OPENROUTER_MODEL` for auto-prompt | Async image generation; if no prompt provided, auto-generates one from tweet content via OpenRouter then fires Replicate prediction | Image model access + image quota | Yes (on status success only) |
| `/api/ai/image/status` | GET    | Replicate (single poll)                                                                         | Poll prediction status; records `aiGenerations` entry and decrements quota only on first `succeeded` poll                           | —                                | Yes (once, on success)       |

**Note on auto-prompt**: When `tweetContent` is provided instead of a direct `prompt`, the `/api/ai/image` route makes a preliminary OpenRouter call (`OPENROUTER_MODEL`) to generate an image prompt. This LLM call is recorded separately in `aiGenerations` as type `image_prompt`.

---

## Agentic Pipeline Detail (`/api/ai/agentic`)

The pipeline (`src/lib/services/agentic-pipeline.ts`) makes **4 sequential OpenRouter calls + N Replicate calls** per run, all using `OPENROUTER_MODEL_AGENTIC` (fallback: `OPENROUTER_MODEL`):

| Step        | AI Call                                    | Max Tokens | Timeout   | Output                                                            |
| ----------- | ------------------------------------------ | ---------- | --------- | ----------------------------------------------------------------- |
| 1. Research | OpenRouter `generateText`                  | 1200       | 45s       | `ResearchBrief` — angles, hashtags, key facts, recommended angle  |
| 2. Strategy | OpenRouter `generateText`                  | 400        | 30s       | `ContentPlan` — format, tweetCount, tone, imageSlots              |
| 3. Write    | OpenRouter `generateText`                  | 3000       | 90s       | `AgenticTweet[]` — full thread content                            |
| 4. Images   | Replicate `REPLICATE_MODEL_FAST` per tweet | —          | 60s/image | Image URLs attached to tweets (skipped if `includeImages: false`) |
| 5. Review   | OpenRouter `generateText`                  | 400        | 30s       | Quality score (0–10) + summary + issues                           |

A single agentic run = **4 OpenRouter calls** + **N Replicate calls** (N = image slot count from the content plan).

---

## Non-AI Utility Endpoints (no AI calls)

| Endpoint                       | Method | Purpose                                                    |
| ------------------------------ | ------ | ---------------------------------------------------------- |
| `/api/ai/quota`                | GET    | Returns current AI generation quota usage and limits       |
| `/api/ai/image/quota`          | GET    | Returns current image generation quota usage and limits    |
| `/api/ai/history`              | GET    | Returns user's AI usage history from `aiGenerations` table |
| `/api/ai/agentic`              | GET    | Returns latest active agentic session                      |
| `/api/ai/agentic`              | DELETE | Discards active agentic session                            |
| `/api/ai/agentic/[id]/approve` | POST   | Schedules/publishes approved agentic tweets                |
| `/api/ai/bio`                  | GET    | Returns connected X account username                       |
| `/api/user/voice-profile`      | GET    | Returns stored voice profile                               |
| `/api/user/voice-profile`      | DELETE | Clears stored voice profile                                |

---

## Summary

| Dimension                    | Count                                                        |
| ---------------------------- | ------------------------------------------------------------ |
| AI providers                 | 2 (OpenRouter, Replicate)                                    |
| OpenRouter model slots       | 4 (`MODEL`, `MODEL_AGENTIC`, `MODEL_FREE`, `MODEL_TRENDS`)   |
| Replicate model slots        | 3 (`FAST`, `PRO`, `FALLBACK`)                                |
| Endpoints that make AI calls | **21**                                                       |
| — OpenRouter text endpoints  | 20                                                           |
| — Replicate image endpoints  | 2 (one also uses OpenRouter for auto-prompt)                 |
| Endpoints that skip quota    | 3 (`/score`, `/trends`, `/enhance-topic`)                    |
| Streaming endpoints          | 3 (`/thread`, `/template-generate`, `/agentic` SSE pipeline) |
| Redis-cached AI responses    | 2 (`/trends` 30 min, `/inspiration` 6 hours)                 |

---

## Subscription Plans

> Source of truth: `src/lib/pricing.ts` (prices) · `src/lib/plan-limits.ts` (feature limits) · `src/lib/rate-limiter.ts` (rate limits)

### Pricing

| Plan                 | Monthly Price | Annual Price | Monthly Equivalent (Annual) | Savings         |
| -------------------- | ------------- | ------------ | --------------------------- | --------------- |
| **Free**             | $0            | —            | —                           | —               |
| **Pro (Monthly)**    | $29/mo        | —            | —                           | —               |
| **Pro (Annual)**     | —             | $290/yr      | ~$24/mo                     | ~17% vs monthly |
| **Agency (Monthly)** | $99/mo        | —            | —                           | —               |
| **Agency (Annual)**  | —             | $990/yr      | ~$83/mo                     | ~17% vs monthly |

> Note: `pro_monthly` and `pro_annual` share identical feature limits (`PLAN_LIMITS` in `plan-limits.ts`). The only difference is billing interval. Same applies to agency monthly vs annual.

---

### AI Quota Limits (Monthly, rolling)

These are the hard monthly caps tracked in the `aiGenerations` table.

| Limit                               | Free                           | Pro          | Agency        |
| ----------------------------------- | ------------------------------ | ------------ | ------------- |
| AI text generations / month         | 20                             | 100          | **Unlimited** |
| AI image generations / month        | 10                             | 50           | **Unlimited** |
| Available image models              | `nano-banana-2`, `nano-banana` | All 3 models | All 3 models  |
| Pro image model (`nano-banana-pro`) | No                             | Yes          | Yes           |

**Trial users** (14-day free trial) receive **Pro Monthly limits** for the duration of the trial. See `TRIAL_EFFECTIVE_PLAN` in `plan-limits.ts`.

---

### API Rate Limits (per user, sliding window via Redis)

These are short-window throttles enforced by `src/lib/rate-limiter.ts`, independent of the monthly quota above. Cost-sensitive endpoints (`ai`, `ai_image`, `tweet_lookup`) **fail closed** when Redis is unavailable — they return 503 rather than allow unbounded API charges.

| Endpoint Type                      | Free    | Pro     | Agency    | Window     |
| ---------------------------------- | ------- | ------- | --------- | ---------- |
| AI text (`/api/ai/*`, `/api/chat`) | 20 req  | 200 req | 1,000 req | per hour   |
| AI image (`/api/ai/image`)         | 10 req  | 30 req  | 60 req    | per minute |
| Post scheduling                    | 100 req | 500 req | 2,000 req | per hour   |
| Media upload                       | 20 req  | 100 req | 500 req   | per hour   |
| Auth                               | 5 req   | 20 req  | 50 req    | per 15 min |
| Tweet lookup                       | 20 req  | 100 req | 200 req   | per hour   |

---

### Feature Access by Plan

| Feature                   | Free   | Pro       | Agency          |
| ------------------------- | ------ | --------- | --------------- |
| Posts per month           | 20     | Unlimited | Unlimited       |
| Connected X accounts      | 1      | 3         | 10              |
| Schedule threads          | No     | Yes       | Yes             |
| Upload video / GIF        | No     | Yes       | Yes             |
| Analytics retention       | 7 days | 90 days   | 365 days        |
| Analytics export          | None   | CSV + PDF | White-label PDF |
| Best posting times        | No     | Yes       | Yes             |
| Inspiration bookmarks     | 5      | Unlimited | Unlimited       |
| Voice Profile             | No     | Yes       | Yes             |
| Viral Score               | No     | Yes       | Yes             |
| Affiliate tweet generator | No     | Yes       | Yes             |
| Content Calendar          | No     | Yes       | Yes             |
| URL → Thread              | No     | Yes       | Yes             |
| Variant Generator         | No     | Yes       | Yes             |
| Competitor Analyzer       | No     | Yes       | Yes             |
| Reply Generator           | No     | Yes       | Yes             |
| Bio Optimizer             | No     | Yes       | Yes             |
| Agentic Posting pipeline  | No     | Yes       | Yes             |
| Team members              | None   | None      | 5               |
| LinkedIn integration      | No     | No        | Yes             |

---

## Financial Analysis

> **Important assumptions** — this analysis uses estimates. Actual costs depend on the OpenRouter model you configure and real user behaviour. All figures are monthly USD unless stated.

---

### Assumptions

#### Subscriber Distribution (realistic SaaS conversion)

| Segment     | % of total | Rationale                                                  |
| ----------- | ---------- | ---------------------------------------------------------- |
| Free        | 60%        | Majority of sign-ups never convert                         |
| Pro Monthly | 25%        | Primary paying tier                                        |
| Pro Annual  | 10%        | Annual converts (billed as $290/yr → $24.17/mo equivalent) |
| Agency      | 5%         | Highest-value, smallest cohort                             |

#### API Cost Baseline

**OpenRouter (text generation)**

The actual cost per call depends entirely on the model configured in `OPENROUTER_MODEL`. Three realistic tiers:

| Model tier             | Example model                  | Cost per 1M tokens | Est. cost per AI call (~1,500 tokens) |
| ---------------------- | ------------------------------ | ------------------ | ------------------------------------- |
| **Budget**             | GPT-4o-mini, Llama 3.1 8B      | ~$0.20/M           | ~$0.0003                              |
| **Mid** _(used below)_ | GPT-4o, Llama 3.1 70B          | ~$1.00/M           | ~$0.0015                              |
| **Premium**            | Claude 3.5 Sonnet, GPT-4o full | ~$6.00/M           | ~$0.009                               |

_This analysis uses the **mid-tier** baseline ($0.0015/call) as the default. See the sensitivity table at the end._

**Replicate (image generation)**

Gemini image models on Replicate are billed per prediction. Conservative estimates:

- `nano-banana-2` (FAST): ~$0.04/image
- `nano-banana-pro` (PRO): ~$0.08/image
- _Analysis uses $0.04/image (most users on Fast model)_

#### Estimated Monthly Usage per User (at ~60% quota utilisation)

|                                 | Free       | Pro                             | Agency                          |
| ------------------------------- | ---------- | ------------------------------- | ------------------------------- |
| Text AI calls actually made     | ~12/mo     | ~60/mo                          | ~200/mo                         |
| Image generations actually made | ~3/mo      | ~20/mo                          | ~50/mo                          |
| API cost (text)                 | $0.018     | $0.09                           | $0.30                           |
| API cost (images)               | $0.12      | $0.80                           | $2.00                           |
| **Total API cost/user/mo**      | **~$0.14** | **~$0.89**                      | **~$2.30**                      |
| Revenue/user/mo                 | $0         | $29 (monthly) / $24.17 (annual) | $99 (monthly) / $82.50 (annual) |
| **Gross margin per paid user**  | —          | **~97%**                        | **~97%**                        |

---

### Infrastructure Costs

| Service                  | Provider              | 10–100 users | 1,000 users      | 20,000 users     |
| ------------------------ | --------------------- | ------------ | ---------------- | ---------------- |
| Hosting + serverless     | Vercel Pro            | $20/mo       | $50/mo           | $150–300/mo      |
| PostgreSQL               | Neon / Supabase       | $19/mo       | $25–69/mo        | $100–300/mo      |
| Redis                    | Upstash / Redis Cloud | $10/mo       | $25–50/mo        | $100–200/mo      |
| Domain + TLS             | Cloudflare / Vercel   | ~$2/mo       | ~$2/mo           | ~$5/mo           |
| **Total infrastructure** |                       | **~$51/mo**  | **~$102–171/mo** | **~$355–805/mo** |

---

### Scenario Analysis

#### 10 Subscribers (6 free · 2 pro monthly · 1 pro annual · 1 agency)

|                              | Value                                                |
| ---------------------------- | ---------------------------------------------------- |
| Monthly revenue              | $0 + (2 × $29) + (1 × $24.17) + (1 × $99) = **$181** |
| API costs                    | (6 × $0.14) + (3 × $0.89) + (1 × $2.30) = **$7.37**  |
| Infrastructure               | **$51**                                              |
| **Total costs**              | **$58.37**                                           |
| **Net profit**               | **$122.63**                                          |
| **Profit margin**            | **68%**                                              |
| Break-even paid users needed | ~2 Pro Monthly subscribers cover all infra           |

> ⚠️ At this scale revenue is healthy but absolute dollars are low. Infrastructure costs dominate.

---

#### 100 Subscribers (60 free · 25 pro monthly · 10 pro annual · 5 agency)

|                   | Value                                                  |
| ----------------- | ------------------------------------------------------ |
| Monthly revenue   | (25 × $29) + (10 × $24.17) + (5 × $99) = **$1,462**    |
| API costs         | (60 × $0.14) + (35 × $0.89) + (5 × $2.30) = **$51.15** |
| Infrastructure    | **$51**                                                |
| **Total costs**   | **$102**                                               |
| **Net profit**    | **$1,360**                                             |
| **Profit margin** | **93%**                                                |

> ✅ Comfortable at this scale. API costs are only 3.5% of revenue. Infrastructure is the larger cost concern.

---

#### 1,000 Subscribers (600 free · 250 pro monthly · 100 pro annual · 50 agency)

|                   | Value                                                   |
| ----------------- | ------------------------------------------------------- |
| Monthly revenue   | (250 × $29) + (100 × $24.17) + (50 × $99) = **$14,617** |
| API costs         | (600 × $0.14) + (350 × $0.89) + (50 × $2.30) = **$530** |
| Infrastructure    | **~$140**                                               |
| **Total costs**   | **$670**                                                |
| **Net profit**    | **$13,947**                                             |
| **Profit margin** | **95%**                                                 |
| MRR               | ~$14,617                                                |
| ARR run rate      | ~$175,400                                               |

> ✅ Economics are excellent. API + infra is 4.6% of revenue. This is the "sweet spot" for SaaS unit economics.

---

#### 20,000 Subscribers (12,000 free · 5,000 pro monthly · 2,000 pro annual · 1,000 agency)

|                   | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| Monthly revenue   | (5,000 × $29) + (2,000 × $24.17) + (1,000 × $99) = **$292,340**    |
| API costs         | (12,000 × $0.14) + (7,000 × $0.89) + (1,000 × $2.30) = **$10,730** |
| Infrastructure    | **~$600**                                                          |
| **Total costs**   | **$11,330**                                                        |
| **Net profit**    | **$281,010**                                                       |
| **Profit margin** | **96%**                                                            |
| MRR               | ~$292,340                                                          |
| ARR run rate      | ~$3,508,080                                                        |

> ✅ Margins improve at scale since infrastructure grows sublinearly. API costs are still only 3.7% of revenue.

---

### Model Sensitivity: What If You Use a Different OpenRouter Model?

At **1,000 subscribers**, here's how net profit changes by model tier:

| Model tier                  | API cost/call | Total API cost/mo | Net profit/mo | Margin  |
| --------------------------- | ------------- | ----------------- | ------------- | ------- |
| Budget (GPT-4o-mini)        | $0.0003       | ~$106             | ~$14,371      | **98%** |
| **Mid — baseline**          | $0.0015       | ~$530             | ~$13,947      | **95%** |
| Premium (Claude 3.5 Sonnet) | $0.009        | ~$3,180           | ~$11,297      | **77%** |

> Even with a premium model, margins remain very healthy. The risk is the **Agency plan's unlimited text generations** — a single heavy agency user making 1,000 calls/month with a premium model costs ~$9 in text API alone, still well below the $99/$82.50 revenue. At 50 agency users averaging 500 calls each with a premium model: $225/mo in text API from agency only — still fine.

---

### Risks and Recommendations

| Risk                                          | Severity   | Mitigation                                                                                                                           |
| --------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Agency plan abuse** (unlimited generations) | Medium     | The hourly rate limit (1,000 req/hr) acts as a practical ceiling. Monitor `aiGenerations` table for outliers.                        |
| **Free users subsidised by paid**             | Low        | Free users cost ~$0.14/mo each — 12,000 free users at scale = $1,680/mo, covered by ~58 Pro subscribers.                             |
| **Premium model cost spike**                  | Low–Medium | Use `OPENROUTER_MODEL_FREE` for quota-exempt endpoints (`/trends`, `/enhance-topic`) to reduce premium model exposure.               |
| **Replicate image cost at scale**             | Low        | Images have hard monthly quotas (10 free / 50 pro / unlimited agency) and rate limits.                                               |
| **Vercel serverless overages**                | Low–Medium | Agentic pipeline (5 AI calls + polling) and streaming endpoints have long runtimes. Monitor Vercel function duration billing.        |
| **Redis cost at scale**                       | Low        | Rate limiter + caching use Redis heavily. Upstash pay-per-use stays cheap; switch to a fixed-plan Redis instance above ~5,000 users. |

---

### Summary: Is the Pricing Sufficient?

| Plan           | Your price | Your API cost/user | Your infra share | **Net per user** | **Safe?**                                |
| -------------- | ---------- | ------------------ | ---------------- | ---------------- | ---------------------------------------- |
| Free           | $0         | ~$0.14             | ~$0.003          | **-$0.14**       | ✅ Subsidised by paid tiers — acceptable |
| Pro Monthly    | $29        | ~$0.89             | ~$0.14           | **~$27.97**      | ✅ 96% gross margin                      |
| Pro Annual     | $24.17/mo  | ~$0.89             | ~$0.14           | **~$23.14**      | ✅ 96% gross margin                      |
| Agency Monthly | $99        | ~$2.30             | ~$0.55           | **~$96.15**      | ✅ 97% gross margin                      |
| Agency Annual  | $82.50/mo  | ~$2.30             | ~$0.55           | **~$79.65**      | ✅ 97% gross margin                      |

**Conclusion**: Your pricing covers API and infrastructure costs by a very wide margin across all plans and all scale scenarios. The main financial risk is not unit economics but **growth capital** — infrastructure costs are front-loaded (you pay $51/mo fixed even with 1 user) while revenue scales with subscribers. The free tier is sustainable as long as paid conversion stays above ~5% of your total user base.

---

## Additional Financial Considerations

---

### 1. Stripe Payment Processing Fees

Stripe charges **2.9% + $0.30 per successful transaction**. This is a real cost deducted from gross revenue before you receive the money. It compounds the per-user economics.

| Plan           | Gross price | Stripe fee | **Net revenue received**      | Fee as % |
| -------------- | ----------- | ---------- | ----------------------------- | -------- |
| Pro Monthly    | $29.00      | $1.14      | **$27.86**                    | 3.9%     |
| Pro Annual     | $290.00     | $8.71      | **$281.29** ($23.44/mo equiv) | 3.0%     |
| Agency Monthly | $99.00      | $3.17      | **$95.83**                    | 3.2%     |
| Agency Annual  | $990.00     | $29.01     | **$960.99** ($80.08/mo equiv) | 2.9%     |

> **Annual billing is more Stripe-efficient** — one charge of 2.9%+$0.30 vs twelve monthly charges each carrying the $0.30 fixed fee. For a Pro user: annual saves ~$2.90/year in Stripe fees alone, which is why annual should always be priced at a meaningful discount to incentivise it.

**Updated net per user after Stripe fees:**

| Plan           | Net revenue | API cost | Infra share | **True net per user** |
| -------------- | ----------- | -------- | ----------- | --------------------- |
| Pro Monthly    | $27.86      | ~$0.89   | ~$0.14      | **~$26.83**           |
| Pro Annual     | $23.44/mo   | ~$0.89   | ~$0.14      | **~$22.41**           |
| Agency Monthly | $95.83      | ~$2.30   | ~$0.55      | **~$92.98**           |
| Agency Annual  | $80.08/mo   | ~$2.30   | ~$0.55      | **~$77.23**           |

---

### 2. Free Trial Period Cost

> Source: `src/lib/plan-limits.ts` — `TRIAL_EFFECTIVE_PLAN = "pro_monthly"` (14-day standard trial), `src/lib/referral/utils.ts` — `REFERRAL_TRIAL_DAYS = 21` (21-day trial for referred users).

During a free trial, users receive **Pro Monthly limits** (100 text generations, 50 images) while paying $0. This is an intentional acquisition cost.

**Cost per trialing user:**

- Duration: 14 days (standard) / 21 days (referred)
- API usage estimate at 60% quota utilisation pro-rated to trial length:
  - Standard 14-day trial: 14/30 × $0.89 = **~$0.42**
  - Referred 21-day trial: 21/30 × $0.89 = **~$0.62**

**Trial conversion economics** (industry benchmark: 15–25% free-to-paid conversion):

| Conversion rate | API cost paid per converted user | Effective CAC from trials |
| --------------- | -------------------------------- | ------------------------- |
| 10%             | $0.42 / 0.10 = **$4.20**         | Low — acceptable          |
| 20% _(target)_  | $0.42 / 0.20 = **$2.10**         | Very low                  |
| 5%              | $0.42 / 0.05 = **$8.40**         | Still below LTV by 60×+   |

**At 1,000 subscribers** — if ~15% are in an active trial at any point (~150 users):

- Trial API cost: 150 × $0.42 = **$63/mo** in unconverted API spend
- This is ~0.4% of revenue — negligible

> **Recommendation**: Trials are financially safe at any scale. The extended 21-day referred trial is also safe; the extra 7 days costs ~$0.21 more per user, well below the $5 referral credit benefit if they convert.

---

### 3. Referral Program Economics

> Source: `src/lib/referral/utils.ts` — `REFERRAL_CREDIT_AMOUNT = $5`, `REFERRAL_TRIAL_DAYS = 21`.

When a referred user makes their first paid subscription, the **referrer earns $5 in platform credits**.

| Event                                | Cost to you                               | Benefit                                   |
| ------------------------------------ | ----------------------------------------- | ----------------------------------------- |
| Referred user signs up               | $0                                        | Organic acquisition                       |
| Referred user gets 21-day trial      | ~$0.62 in API                             | Extended engagement window                |
| Referred user converts to paid       | **$5 referral credit** issued to referrer | New paying subscriber                     |
| Net cost of acquisition via referral | **~$5.62**                                | Subscriber with ~$27+ monthly net revenue |

**Referral payback period**: $5.62 cost ÷ $26.83 net revenue (Pro Monthly) = **payback in < 1 month**. Compared to paid advertising CAC of $50–200+ for SaaS, referral acquisition is extremely efficient.

**At scale** — if 20% of conversions come via referral:

- At 1,000 paid subscribers: 200 via referral × $5 = **$1,000 in referral credits** (one-time)
- These are platform credits, not cash — they reduce future invoice amounts, spreading the cost over time

---

### 4. Promo Code Revenue Dilution

> Source: `src/app/api/admin/promo-codes/route.ts` — supports `percentage` and `fixed` discount types, per-plan targeting, expiry dates, and redemption caps.

Promo codes reduce effective revenue. They are common for:

- Launch campaigns (e.g., 30% off first 3 months)
- Partnership deals (flat $10 off)
- Winback campaigns for churned users

**Impact modelling** — if 10% of Pro Monthly subscribers use a 20% discount promo:

| Subscribers | Affected users | Revenue lost/mo            |
| ----------- | -------------- | -------------------------- |
| 100 paid    | 10 users       | 10 × ($29 × 20%) = **$58** |
| 1,000 paid  | 100 users      | **$580**                   |
| 20,000 paid | 800 users      | **$4,640**                 |

> **Recommendation**: Set `maxRedemptions` caps on all promo codes. Avoid open-ended percentage discounts on the Agency plan. Track effective ARPU (revenue ÷ total subscribers) in your admin dashboard — a drop here flags excessive discounting before it becomes material.

---

### 5. Failed Payments & Grace Period Risk

> Source: `src/app/api/cron/billing-cleanup/route.ts` — users whose `planExpiresAt` passes are downgraded to free via a scheduled cron. Subscription statuses tracked: `active`, `past_due`, `trialing`, `cancelled`.

When a payment fails, Stripe retries before marking the subscription `past_due`. Your platform continues serving Pro/Agency features during this window — this is an intentional grace period that improves user experience but carries a cost.

**Industry benchmark**: 5–8% of SaaS subscribers experience a failed payment in any given month (typically recovered via Smart Retries). Of those, ~40–60% recover within the retry window; the rest churn.

**Grace period API exposure** — a user on Pro who fails payment but continues using the service for up to the grace window:

- Cost per past_due user per extra week: 7/30 × $0.89 = **~$0.21**
- At 1,000 paid subscribers with 6% experiencing payment failures: 60 users × $0.21 = **~$12.60/mo** in unbilled API costs
- Negligible at this scale, but worth monitoring at 20,000+ subscribers (~$252/mo)

> **Recommendation**: Keep the grace period short (3–7 days) and ensure Stripe Dunning emails (already set up: `PaymentFailedEmail`, `TrialEndingSoonEmail`) fire promptly. Enable Stripe Smart Retries in your Stripe Dashboard — these recover ~38% of failed payments automatically.

---

### 6. Churn, LTV, and SaaS Health Metrics

These are the metrics that determine the long-term financial health of the platform.

#### Monthly Churn Rate Benchmarks (B2C SaaS, content tools)

| Churn rate         | Avg subscriber lifetime | Assessment            |
| ------------------ | ----------------------- | --------------------- |
| 2% / mo            | ~50 months              | Exceptional           |
| 5% / mo _(target)_ | ~20 months              | Healthy for B2C       |
| 8% / mo            | ~12.5 months            | Concerning            |
| 12% / mo           | ~8 months               | Requires intervention |

#### Customer Lifetime Value (LTV)

Formula: `LTV = (Net Revenue per User per Month) × (1 / Monthly Churn Rate)`

At **5% monthly churn** and mid-tier model costs:

| Plan           | Net revenue/mo (after Stripe + API) | Monthly churn                     | **LTV**    |
| -------------- | ----------------------------------- | --------------------------------- | ---------- |
| Pro Monthly    | $26.83                              | 5%                                | **$537**   |
| Pro Annual     | $22.41/mo                           | ~2% (annual contracts churn less) | **$1,121** |
| Agency Monthly | $92.98                              | 3% (higher-intent buyers)         | **$3,099** |
| Agency Annual  | $77.23/mo                           | ~1.5%                             | **$5,149** |

> Annual plans produce 2–5× higher LTV than monthly plans for the same nominal price, because annual subscribers churn far less. This is why offering a meaningful annual discount (your current 17%) is strategically correct even though it lowers monthly revenue per user.

#### ARPU (Average Revenue Per User)

Including free users in the denominator (all registered users):

| Scale              | Paid conversion | Blended ARPU    |
| ------------------ | --------------- | --------------- |
| 100 subscribers    | 40%             | ~$14.62/user/mo |
| 1,000 subscribers  | 40%             | ~$14.62/user/mo |
| 20,000 subscribers | 40%             | ~$14.62/user/mo |

> ARPU stays constant at a fixed conversion rate. To grow revenue, you either grow subscriber count or improve conversion rate. Moving conversion from 40% to 50% would increase MRR at 1,000 users from $14,617 to $18,271 — a 25% revenue increase with zero new users.

---

### 7. Annual vs Monthly Billing: Cashflow Implications

Annual billing front-loads revenue but creates an obligation: if a user cancels mid-year and you have a refund policy, you owe them money.

| Scenario             | Monthly billing                           | Annual billing                           |
| -------------------- | ----------------------------------------- | ---------------------------------------- |
| Revenue recognition  | $29/month, 12 payments                    | $290 upfront, recognized at $24.17/month |
| Cash in hand month 1 | $29                                       | $290                                     |
| Refund risk          | None after each payment                   | Up to $290 if cancelled early            |
| Churn timing         | Can cancel any month                      | Committed for the year                   |
| Stripe fee           | 12 × ($29 × 2.9% + $0.30) = **$13.68/yr** | 1 × ($290 × 2.9% + $0.30) = **$8.71/yr** |

> **Recommendation**: Offer annual billing with a **no-refund or partial-refund policy** made clear at checkout. Even if you offer a pro-rated refund, the cash-flow benefit and churn reduction of annual plans outweighs the refund risk at typical cancellation rates (~5–10% of annual subscribers cancel before renewal).

**Cashflow comparison at 100 paid subscribers (50/50 monthly vs annual):**

| Month      | All monthly | 50/50 mix | All annual                      |
| ---------- | ----------- | --------- | ------------------------------- |
| Month 1    | $1,450      | $8,225    | $14,500 (entire year's revenue) |
| Month 2    | $1,450      | $725      | $0 (already collected)          |
| Month 12   | $1,450      | $725      | $0                              |
| Total yr 1 | $17,400     | $17,400   | $17,400                         |

Same annual total, but annual billing gives you **working capital on day 1** to invest in growth or cover fixed costs during slow months.

---

### 8. Break-Even Analysis

**Fixed monthly costs** (infrastructure only, not counting your own time):

| Scale        | Fixed infra/mo | Paid users needed to break even |
| ------------ | -------------- | ------------------------------- |
| Early stage  | $51            | **2 Pro Monthly** subscribers   |
| 1,000 users  | $140           | **5 Pro Monthly** subscribers   |
| 20,000 users | $600           | **22 Pro Monthly** subscribers  |

> Your break-even is extremely low. The real threshold to watch is **personal sustainability** (covering your own cost of living from the business), not infrastructure viability.

**Revenue milestones:**

| Monthly target                    | Paid subscribers needed (Pro Monthly) | Paid subscribers needed (blended avg $32/user) |
| --------------------------------- | ------------------------------------- | ---------------------------------------------- |
| $500/mo (side income)             | 18                                    | 16                                             |
| $3,000/mo (part-time replacement) | 104                                   | 94                                             |
| $10,000/mo (full-time business)   | 345                                   | 313                                            |
| $50,000/mo (growth stage)         | 1,724                                 | 1,563                                          |

---

### 9. Revenue Mix Optimisation

Not all revenue is equal. Agency users generate **3.4× more revenue** than Pro users but only **2.6×** the API cost. The ideal revenue mix maximises agency share.

**Impact of shifting 10% of Pro users to Agency** (at 1,000 subscribers):

| Metric          | Baseline | After shift        |
| --------------- | -------- | ------------------ |
| Pro paid users  | 350      | 315                |
| Agency users    | 50       | 85                 |
| Monthly revenue | $14,617  | $17,277            |
| API costs       | $530     | $559               |
| **Net profit**  | $13,947  | **$16,578** (+19%) |

> **Recommendation**: Invest in showcasing agency-tier features (team members, white-label PDF exports, LinkedIn integration, 10 X accounts) in your onboarding funnel. A single Pro→Agency upgrade at 1,000 users is worth **+$70/mo** in net revenue vs +$27/mo from a new Pro subscriber.

---

### 10. Cost per Feature: AI Endpoint Cost Contribution

Not all AI features cost the same. Understanding which features drive API costs helps you decide where to apply tighter quotas or where to invest in cheaper model alternatives.

| Feature                                     | Typical tokens/call | Cost/call (mid model) | Monthly API cost (Pro user, 60% quota used) |
| ------------------------------------------- | ------------------- | --------------------- | ------------------------------------------- |
| `/api/ai/agentic` (full pipeline)           | ~8,000–15,000       | ~$0.015               | High — 4 sequential LLM calls               |
| `/api/chat` (multi-turn)                    | ~2,000–5,000        | ~$0.005               | Moderate — grows with conversation length   |
| `/api/ai/thread` (streaming)                | ~1,500–3,000        | ~$0.003               | Moderate                                    |
| `/api/ai/summarize` (URL article)           | ~3,000–6,000        | ~$0.006               | Moderate — long article context             |
| `/api/ai/inspire`                           | ~800–1,500          | ~$0.0015              | Low                                         |
| `/api/ai/score`                             | ~600–1,000          | ~$0.001               | Very low (skipQuota)                        |
| `/api/ai/hashtags` / `/tools` / `/variants` | ~400–800            | ~$0.0008              | Very low                                    |
| `/api/ai/enhance-topic`                     | ~200–400            | ~$0.0003              | Near-zero (uses FREE model + skipQuota)     |
| `/api/ai/image` (Replicate)                 | —                   | ~$0.04/image          | Image-dominated cost                        |

> **Key insight**: The Agentic Posting pipeline is your most expensive single feature per call (~10× a normal text call), but it is gated behind Pro/Agency and consumed less frequently. It is also your highest-value feature, so the cost is justified. `/api/ai/enhance-topic` and `/api/ai/score` are essentially free since they use the free model slot and skip quota.

---

### 11. Operating Leverage at Scale

Operating leverage describes how profit grows faster than revenue as you scale, because fixed costs stay flat while variable costs grow proportionally less.

| Scale       | Revenue  | Variable costs (API) | Fixed costs (infra) | **Net profit** | **Margin** |
| ----------- | -------- | -------------------- | ------------------- | -------------- | ---------- |
| 100 subs    | $1,462   | $51                  | $51                 | $1,360         | 93%        |
| 1,000 subs  | $14,617  | $530                 | $140                | $13,947        | 95%        |
| 10,000 subs | $146,170 | $5,300               | $400                | $140,470       | 96%        |
| 20,000 subs | $292,340 | $10,730              | $600                | $281,010       | 96%        |

Infrastructure (fixed cost) grows at roughly **0.15× the rate of revenue**. API costs (variable) grow at roughly **0.037× the rate of revenue**. This means each new subscriber you add is more profitable than the last — the classic SaaS operating leverage curve.

> **Margin floor**: Even in a worst case (all users on Pro Monthly, all using a premium OpenRouter model, all hitting full quota), the margin floor is ~70%. The business is structurally sound regardless of model choice.

---

## One-Time Credit Pack Proposal

### Strategic Verdict: Yes — With Guardrails

A one-time top-up pack is a **strongly recommended addition** to your monetisation strategy. It solves a real friction point: a user who exhausts their monthly quota on day 18 currently has only two options — wait 12 days for the reset, or upgrade to the next plan tier. Both outcomes are bad. Waiting creates frustration and churn risk. Forcing an upgrade for someone who just had an unusually active month is heavy-handed and increases cancellation probability.

A credit pack gives you a **third option**: capture incremental revenue from a user who is already in a high-intent moment (they ran out mid-task) without pushing them into a recurring commitment they may not want.

**Supporting SaaS evidence:**

- Canva, Adobe Express, and similar creative SaaS tools all offer one-time credit top-ups alongside subscriptions. Canva's credit system contributes materially to revenue without cannibalising its Pro subscription base.
- "Usage spike" purchases convert at significantly higher rates than cold upgrade prompts because the user is at the point of immediate need.
- One-time payments have zero churn risk — there is no subscription to cancel.

**The one risk**: if packs are priced too cheaply per unit, regular users substitute packs for subscriptions, reducing your MRR predictability. The pricing design below addresses this directly.

---

### Proposed Pack Tiers

#### Design Principles

1. **Packs add quota only** — they do NOT unlock gated features (Agentic Posting, Viral Score, Voice Profile, Content Calendar, etc.). A free user who buys a pack stays on the free feature set with more API calls. Upgrading to Pro is still the only path to unlocking those features.
2. **Pack unit cost is always higher than the equivalent plan unit cost** — this ensures subscriptions remain better value for regular users.
3. **Packs expire** — unused credits expire after a fixed window, preventing indefinite stockpiling and keeping revenue recognition clean.
4. **Agency users never see pack prompts** — their quota is unlimited; packs are irrelevant.
5. **Trial users are treated as Free** for pack eligibility.

#### Pack Tiers

| Pack        | Text AI calls | Image generations | Validity | Price      | Your API cost | **Gross margin** |
| ----------- | ------------- | ----------------- | -------- | ---------- | ------------- | ---------------- |
| **Starter** | 15            | 5                 | 30 days  | **$5.99**  | $0.22         | 96%              |
| **Growth**  | 40            | 15                | 60 days  | **$12.99** | $0.66         | 95%              |
| **Power**   | 100           | 35                | 90 days  | **$24.99** | $1.55         | 94%              |

#### Anti-Cannibalization Proof

The key test: is buying packs repeatedly cheaper than upgrading to the next plan?

| Scenario                          | Pack cost                         | Plan cost                                        | Plan advantages                                                        |
| --------------------------------- | --------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| Free user buys 2 Starter Packs/mo | $11.98 → 30 text + 10 images      | Pro at $29 → 100 text + 50 images                | Pro gives 3.3× more text, 5× more images, AND unlocks all Pro features |
| Free user buys 2 Growth Packs/mo  | $25.98 → 80 text + 30 images      | Pro at $29 → 100 text + 50 images + all features | Pro is cheaper for similar quota AND unlocks everything                |
| Pro user buys 1 Power Pack/mo     | $24.99 top-up + $29 plan = $53.99 | Agency at $99 → unlimited + 10 accounts + team   | Agency is more economical if they need >2 Power Packs/mo               |

The price architecture naturally funnels regular users toward subscriptions. A free user who needs two Growth Packs per month is spending $26 — only $3 less than Pro, with none of the features. At that point the upgrade prompt writes itself.

#### Per-Unit Cost Comparison (ensuring packs cost more per credit than plans)

| Source           | Text credits | Image credits | Total price | Price per text credit | Price per image credit |
| ---------------- | ------------ | ------------- | ----------- | --------------------- | ---------------------- |
| Pro plan         | 100          | 50            | $29/mo      | $0.29                 | $0.58                  |
| Agency plan      | ∞            | ∞             | $99/mo      | —                     | —                      |
| **Starter Pack** | 15           | 5             | $5.99       | **$0.40** (+38%)      | **$1.20** (+107%)      |
| **Growth Pack**  | 40           | 15            | $12.99      | **$0.32** (+10%)      | **$0.87** (+50%)       |
| **Power Pack**   | 100          | 35            | $24.99      | **$0.25** (-14%)      | **$0.71** (+22%)       |

> The Power Pack text credit is slightly cheaper per unit than Pro — intentionally, since it is one-time, expires in 90 days, and does not renew or unlock features. A subscription is still better for anyone who will use it more than once. The expiry prevents bulk-buying as a subscription substitute.

---

### Who Should See Pack Purchase

| User state               | Show which packs                       | Trigger                                                    |
| ------------------------ | -------------------------------------- | ---------------------------------------------------------- |
| Free user (active trial) | None — push toward Pro upgrade instead | Trial creates upgrade momentum; don't dilute it with packs |
| Free user (post-trial)   | Starter, Growth                        | At 80% quota used or quota hit                             |
| Pro Monthly / Annual     | Growth, Power                          | At 80% quota used or quota hit                             |
| Agency                   | Never                                  | Unlimited quota — packs are irrelevant                     |
| Past-due (grace period)  | None — resolve payment first           | Confusing to sell packs to users with billing issues       |

---

### Financial Impact

#### Additional Revenue per Scenario (assuming 8% of eligible users buy one pack/month)

| Scale              | Eligible pack buyers | Avg pack price | **Pack MRR uplift** | % of existing MRR |
| ------------------ | -------------------- | -------------- | ------------------- | ----------------- |
| 10 subscribers     | ~5 free/pro users    | ~$9.99         | ~$4                 | +2%               |
| 100 subscribers    | ~55                  | ~$9.99         | ~$55                | +4%               |
| 1,000 subscribers  | ~550                 | ~$9.99         | ~$550               | +4%               |
| 20,000 subscribers | ~11,000              | ~$9.99         | ~$10,989            | +4%               |

> At 20,000 subscribers the pack revenue line adds ~$11K/month — nearly the entire infrastructure cost — from users who would otherwise generate $0 in additional revenue that month. This is pure incremental margin.

#### Higher conversion scenario (15% of eligible users buy one pack/month)

| Scale              | **Pack MRR uplift** | API cost of packs | **Net pack profit** |
| ------------------ | ------------------- | ----------------- | ------------------- |
| 1,000 subscribers  | ~$1,032             | ~$48              | **~$984**           |
| 20,000 subscribers | ~$20,600            | ~$957             | **~$19,643**        |

---

### Implementation Requirements

> The following is grounded in your actual codebase structure. No implementation is proposed here — this is a scoping reference.

#### What needs to change

**1. Database schema — new `credit_packs` table (or columns on `user`)**

The cleanest approach is a separate `purchasedCredits` table rather than adding columns to `user`, because users may buy multiple packs with different expiry dates.

```
purchasedCredits (
  id, userId, textCredits, imageCredits,
  textUsed, imageUsed,
  expiresAt, purchasedAt,
  stripePaymentIntentId
)
```

**2. Quota check in `src/lib/middleware/require-plan.ts` and `src/lib/services/ai-quota.ts`**

Currently, `checkAiQuotaDetailed()` counts `aiGenerations` rows for the month and compares to `getPlanLimits().aiGenerationsPerMonth`. The check needs a second step:

```
if (plan_quota_exhausted) {
  check purchasedCredits WHERE userId = ? AND expiresAt > NOW()
    AND (textUsed < textCredits) [or imageUsed < imageCredits for images]
  if credits available → allow and increment textUsed/imageUsed
  else → return quota_exceeded
}
```

**3. New Stripe checkout endpoint — one-time payment**

Your current `src/app/api/billing/checkout/route.ts` uses Stripe subscription mode. Pack purchases need `mode: 'payment'` (one-time) with a `price` pointing to a one-time Stripe Price object, not a recurring one.

A new route `POST /api/billing/credits/checkout` should handle this, separate from the subscription checkout to keep the flows clean.

**4. Stripe webhook handler addition**

Add a handler for `checkout.session.completed` (with `mode: 'payment'`) in `src/app/api/billing/webhook/route.ts` to insert into `purchasedCredits` on successful payment.

**5. Four new Stripe Products (one-time, not recurring)**

Create in Stripe Dashboard: Starter Pack, Growth Pack, Power Pack, each as a one-time Price. Store the Price IDs in `.env` as `STRIPE_PRICE_ID_PACK_STARTER`, `STRIPE_PRICE_ID_PACK_GROWTH`, `STRIPE_PRICE_ID_PACK_POWER`.

**6. UI surface**

Show a "Top up credits" CTA on the quota warning component when a user hits 80% or 100% of their quota, before or instead of the plan upgrade prompt (depending on the user's plan).

#### Complexity estimate

| Component                | Complexity                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------- |
| DB schema migration      | Low                                                                                 |
| Quota check modification | Medium — touches `require-plan.ts` and `ai-quota.ts` which are on the critical path |
| New checkout endpoint    | Low — mirrors existing checkout route                                               |
| Webhook handler          | Low — mirrors existing `payment_intent.succeeded` handler                           |
| UI integration           | Medium — needs to slot into existing quota warning components                       |
| **Total**                | **Medium** — 1–2 days of focused development                                        |

---

### Risks and Guardrails

| Risk                                                           | Severity   | Mitigation                                                                                                                                                                                                         |
| -------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **MRR cannibalisation**                                        | Low        | Pricing is designed so subscriptions are always better value for regular users. Monitor monthly: if pack revenue > 15% of MRR, re-evaluate pack pricing upward.                                                    |
| **Credit expiry frustration**                                  | Low–Medium | Send an email 7 days before expiry (add to your existing email system). Users who know credits are expiring are more likely to use them — which is good for engagement.                                            |
| **Free users unlocking Pro features via packs**                | None       | Explicitly enforce in the quota check: pack credits only satisfy the _quota_ gate (`checkAiQuotaDetailed`), never the _feature_ gate (`checkAiLimitDetailed`). These are already separate checks in your codebase. |
| **Agency users buying packs unnecessarily**                    | Low        | Hide the pack purchase UI entirely for `plan === 'agency'`. Server-side: ignore purchased credits for unlimited plans in the quota check.                                                                          |
| **Pack stockpiling (buying many packs before price increase)** | Low        | 90-day max expiry on Power Pack limits stockpiling window. Stripe one-time payments are non-refundable.                                                                                                            |
| **Quota check performance**                                    | Low        | The extra DB query for purchased credits only runs after plan quota is exhausted — the common path (quota not exhausted) has zero overhead.                                                                        |
