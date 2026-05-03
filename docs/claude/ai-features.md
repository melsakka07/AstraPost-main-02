# AI Features Reference

This document maps all backend AI generation and processing endpoints to their respective responsibilities.

## 1. Core Generation

### `POST /api/ai/thread`

- **Purpose**: Generates multi-tweet threads from a starting topic or prompt.
- **Support**: Tones (professional, casual, educational, etc.), Languages (ar, en, fr, de, etc.).

### `POST /api/ai/tools`

- **Purpose**: General AI writing tools applied to a single tweet.
- **Actions**: Hooks, CTAs, Rewrite.

### `POST /api/ai/hashtags`

- **Purpose**: AI Hashtag Generator (Component: `src/components/ai/hashtag-generator.tsx`).
- **Details**: Language-aware, regional prioritization (MENA for Arabic).

### `POST /api/ai/translate`

- **Purpose**: Translates a tweet into a selected target language.

### `POST /api/ai/reply`

- **Purpose**: Reply Generator.

## 2. Agentic Posting (Pro/Agency)

### `POST /api/ai/agentic`

- **Purpose**: Initiates the 5-step Agentic Posting pipeline via SSE streaming.
- **Pipeline**: Research → Strategy → Write → Images → Review.
- **Database**: `agenticPosts` table.
- **Quota Tracking**: Records usage for research, write, and image steps via `recordAiUsage()`. Image generation within the pipeline is tracked the same as standalone image generation.

### `POST /api/ai/agentic/[id]/regenerate`

- **Purpose**: Single-tweet regeneration within an existing agentic pipeline context.

### `POST /api/ai/agentic/[id]/approve`

- **Purpose**: Approves the generated agentic post content to be drafted, posted immediately, or scheduled.
- **Quota Tracking**: This endpoint does NOT record usage — it is a database + queue operation with no AI work. All quota consumption is already recorded during the generation pipeline (research, write, images steps).

## 3. Media & Assets

### `POST /api/ai/image`

- **Purpose**: Initiates image generation via Replicate (Nano Banana models).
- **Details**: Supports styles (Photorealistic, Anime, etc.) and aspect ratios (1:1, 16:9, 9:16). Auto-generates prompt from tweet if not provided.
- **Quota Tracking**: Usage is NOT recorded on POST; client must poll `/api/ai/image/status` to finalize generation and record quota consumption.

### `GET /api/ai/image/status`

- **Purpose**: Polling endpoint to check Replicate generation status, cache the final result, and record image quota usage on success.
- **Quota Tracking**: Calls `recordAiUsage("image", ...)` after successful image save; invalidates sidebar cache to reflect updated quota.

## 4. Advanced Creators

### `POST /api/ai/calendar`

- **Purpose**: Generates a weekly Content Calendar strategy based on tone and topic.

### `POST /api/ai/template-generate`

- **Purpose**: Fills out a saved template format using user-provided input parameters.

### `POST /api/ai/variants`

- **Purpose**: Variant Generator to A/B test different phrasing of the same concept.

### `POST /api/ai/affiliate`

- **Purpose**: Generates promotional tweets for Amazon affiliate links.

### `POST /api/ai/summarize`

- **Purpose**: Summarizes long-form content or articles into concise posts.

## 5. Evaluation & Inspiration

### `POST /api/ai/score`

- **Purpose**: Viral Score evaluator.
- **Details**: Scores content 0-100 based on hooks, value prop, CTA, readability, and emotion. Does not consume user quota.

### `POST /api/ai/inspire`

- **Purpose**: Content Inspiration (OpenRouter).
- **Actions**: Rephrase, change tone, expand, add takeaway, translate, counter-point.

### `POST /api/ai/trends`

- **Purpose**: Fetches AI-generated trending topics by category (Technology, Business, etc.) without requiring the X API.
- **Details**: Uses `OPENROUTER_MODEL_TRENDS` (web-search-capable model) → falls back to `OPENROUTER_MODEL_FREE` → `OPENROUTER_MODEL_AGENTIC` → `OPENROUTER_MODEL`. Plan-gated (Pro/Agency).

### `POST /api/ai/inspiration`

- **Purpose**: Fetches trending inspiration topics by niche. Cached for 6 hours.

### `POST /api/ai/enhance-topic`

- **Purpose**: Enhances a raw topic string into a more robust prompt.

## 6. Post-Generation & Refinement

### `POST /api/ai/refine`

- **Purpose**: Iterative refinement — regenerates AI output based on user feedback (tone, length, hook, hashtags).
- **Details**: Loads original `aiGenerations` row, validates ownership, runs a scoped prompt. `quotaWeight: 0.5` (cheaper than fresh generation).

### `POST /api/ai/feedback`

- **Purpose**: Records 👍/👎 feedback on AI-generated content.
- **Details**: Owner-only (only the user who generated it). Data surfaced in admin AI metrics page.

## 7. Quota & Tracking

### `GET /api/ai/quota`

- **Purpose**: Retrieves the user's monthly AI usage counts (atomic counter-based).

### `GET /api/ai/image/quota`

- **Purpose**: Retrieves the user's monthly AI image generation counts and available models.

### `GET /api/ai/history`

- **Purpose**: Retrieves the user's historical AI generation log (`aiGenerations` table).

### `POST /api/admin/users/[userId]/grant-quota`

- **Purpose**: Admin manual quota top-up. Inserts a row into `aiQuotaGrants` table.
- **Details**: Owner/admin-only. `tryConsumeAiQuota` falls back to grants when base quota is exhausted.

## 8. Security & Safety Modules

### Prompt Injection Defense (`src/lib/ai/untrusted.ts`)

- `wrapUntrusted(label, content, max?, nonce?)` — wraps user-supplied content with `<<<UNTRUSTED...UNTRUSTED>>>` delimiters after sanitizing escape patterns (role tags, "ignore previous", system prompt, delimiter tokens, legacy tweet splitters).
- `JAILBREAK_GUARD` — appended to every system prompt; instructs the model to refuse instruction-override attempts.

### PII Redaction (`src/lib/ai/pii.ts`)

- `redactPII(text)` — regex-based detection and redaction of email addresses, phone numbers, credit card numbers, and IBANs.
- Returns `{ cleaned: string; redactions: string[] }` — applied on summarize (URL-fetched body) and inspire (user-pasted source).

### Input Limits (`src/lib/ai/input-limits.ts`)

- Centralized character limits for user-supplied inputs: topic (1,000), userContext (2,000), voiceProfile (2,000), summarizeBody (30,000), etc.
- Wired into Zod schemas so violations return 400 at the route boundary.

## 9. Reliability Helpers

### Retry & Timeout (`src/lib/ai/with-retry.ts`, `src/lib/ai/with-timeout.ts`)

- `withRetry(fn, { tries, baseMs })` — exponential backoff retry wrapper (default 2 tries, 250ms base).
- `withTimeout(promise, ms)` — `AbortSignal.timeout` wrapper (default 45s).
- Both default-wrapped in `aiPreamble`; custom routes compose them directly.

### Idempotency (`src/lib/api/idempotency.ts`)

- Reads `x-idempotency-key` header; caches `{ status, headers, body }` in Redis (5-min TTL).
- Applied to all `POST /api/ai/*` routes via `aiPreamble`.

### Replicate Poll Cap

- `GET /api/ai/image/status` uses Redis `firstPolledAt` timestamp — if prediction exceeds 90s, marks as failed and refunds quota via `releaseAiQuota`.

## 10. Quality Modules

### Char-Count Enforcement (`src/lib/ai/text-fit.ts`)

- `fitTweet(text, max?)` — sentence-aware truncation to 280 chars.
- `splitThread(longText, maxPerTweet?)` — sentence-aware split into tweet array.
- All thread/template/inspire routes apply post-generation. Prompts no longer ask the model to count characters.

### Language Blocks (`src/lib/ai/language.ts`)

- `buildLanguageBlock(language, context)` — centralized language instructions for "social" and "translation" contexts.
- Arabic-native blocks sourced from `arabic-prompt.ts` (single source of Arabic style guidance).

### Hashtag Hygiene (`src/lib/ai/hashtags.ts`)

- `BANNED_HASHTAGS` — English + Arabic spam tags (FollowBack, L4L, etc.).
- `filterHashtags()` + `menaBiasFilter()` — post-generation filtering with Arabic-script tag prioritization for `ar` locale.
