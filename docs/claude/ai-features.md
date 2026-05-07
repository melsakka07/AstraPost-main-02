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

### `POST /api/chat`

- **Purpose**: General conversational AI assistant (used by the in-app chat surface).
- **Quota Tracking**: `recordAiUsage(..., "chat", ...)` in `onFinish` callback after `streamText` completes.

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

### `POST /api/ai/agentic/[id]/regenerate`

- **Purpose**: Regenerates a single tweet within an existing agentic pipeline session, scoped to the original topic + voice.
- **Quota Tracking**: Routes through `aiPreamble({ quotaWeight: 5 })` (matches generation cost).

## 3. Media & Assets

### `POST /api/ai/image`

- **Purpose**: Initiates image generation via Replicate (Nano Banana models).
- **Details**: Supports styles (Photorealistic, Anime, etc.) and aspect ratios (1:1, 16:9, 9:16). Auto-generates prompt from tweet if not provided.
- **Quota Tracking**: Usage is NOT recorded on POST; client must poll `/api/ai/image/status` to finalize generation and record quota consumption.

### `GET /api/ai/image/status`

- **Purpose**: Polling endpoint to check Replicate generation status, cache the final result, and record image quota usage on success.
- **Quota Tracking**: Calls `recordAiUsage("image", ...)` after successful image save; invalidates sidebar cache to reflect updated quota.

### `GET /api/ai/image/download`

- **Purpose**: SSRF-safe image download proxy for retrieving generated images from trusted origins (replicate.delivery, replicate.com, vercel-storage.com). Validates URL hostname against a safelist before proxying.

## 4. Advanced Creators

### `POST /api/ai/calendar`

- **Purpose**: Generates a weekly Content Calendar strategy based on tone and topic.

### `POST /api/ai/template-generate`

- **Purpose**: Fills out a saved template format using user-provided input parameters.

### `POST /api/ai/variants`

- **Purpose**: Variant Generator to A/B test different phrasing of the same concept.

### `POST /api/ai/affiliate`

- **Purpose**: Generates promotional tweets for Amazon affiliate links.

### `POST /api/ai/bio`

- **Purpose**: Generates 3 X (Twitter) bio variants based on a user's goal (gain followers, attract clients, build authority, general) and niche.
- **Details**: Plan-gated via `checkBioOptimizerAccessDetailed` (Pro/Agency). Uses `OPENROUTER_MODEL` with `generateObject`. `quotaWeight: 1` (default).

### `POST /api/ai/summarize`

- **Purpose**: Summarizes long-form content or articles into concise posts.

### PDF → Thread (`/api/ai/pdf-to-thread/*`)

- **Feature**: Upload native PDF reports/documents (≤50 MB, ≤200 pages) and generate X threads from extracted text. Gated behind `canUsePdfToThread` (Pro Monthly, Pro Annual, Agency).
- **Plan required**: Pro Monthly+ (Pro Monthly, Pro Annual, Agency). Not available on Free or Trial.
- **Quota weight**: **5** (consumed at enqueue or sync generate time).
- **Endpoints**:
  - `POST /api/ai/pdf-to-thread/upload` — Multipart file upload with magic-byte (%PDF-) validation. Extracts native text-layer via pdf-parse v2. PII redaction applied. Stores to `pdfThreadJobs` table.
  - `POST /api/ai/pdf-to-thread/generate` — Sync thread generation (≤30,000 chars). Uses `buildSummarizePrompt({ variant: "report" })` with `pdf_to_thread:v1` prompt. Returns `{ tweets, title, sourceLanguage }`.
  - `POST /api/ai/pdf-to-thread/enqueue` — Async enqueue (>30,000 chars). Transitions DB row to `"queued"` and enqueues to `pdfThreadQueue`. Quota consumed at enqueue time.
  - `GET /api/ai/pdf-to-thread/[jobId]` — Poll job status and result.
  - `DELETE /api/ai/pdf-to-thread/[jobId]` — Cancel a queued/processing job.
- **Sync threshold**: 30,000 characters. PDFs ≤30K chars are generated synchronously; larger PDFs use the async BullMQ path.
- **Async path**: BullMQ `pdfThreadQueue` + `pdfThreadProcessor` with 2-pass chunked summarization: (1) split text at paragraph/sentence boundaries into ≤12K char chunks, (2) summarize each chunk via OpenRouter, (3) final pass combines partial summaries into a coherent thread.
- **Database**: `pdfThreadJobs` table (status lifecycle: `uploading` → `extracting` → `extracted` → sync `generating` → `ready`, or async `queued` → `processing` → `ready` → `failed`).
- **Safety**: Magic-byte validation at upload, PII redaction via `redactPII()`, prompt injection defense via `buildSummarizePrompt({ variant: "report" })` + `JAILBREAK_GUARD`, moderation check on output. Rights attestation checkbox required before upload.

### YouTube → Thread (`/api/ai/youtube-to-thread/*`)

- **Feature**: Paste a YouTube video URL, select a transcription provider (Deepgram or Whisper), and generate an X thread from the video transcript. Gated behind `canUseYoutubeToThread` (Pro Monthly, Pro Annual, Agency).
- **Plan required**: Pro Monthly+ (Pro Monthly, Pro Annual, Agency). Not available on Free or Trial.
- **Quota weight**: **5** (consumed at enqueue time).
- **Endpoints**:
  - `POST /api/ai/youtube-to-thread` — Validates YouTube URL and returns metadata preview when `previewOnly: true` (no quota consumption). Standard mode creates DB row and enqueues BullMQ job. Idempotency check prevents duplicate jobs for the same (user, videoId) within 60s (returns 409 with `existingJobId`). Returns `{ jobId, status: "queued", videoTitle, durationSeconds, thumbnailUrl }`.
  - `GET /api/ai/youtube-to-thread/[jobId]` — Poll job status and result. Returns `transcript` when status is `ready` and `errorCode` for classified failures.
  - `DELETE /api/ai/youtube-to-thread/[jobId]` — Cancel a queued/processing job. Sets `errorCode: "CANCELLED"`.
  - `GET /api/ai/youtube-to-thread/history` — Returns last 5 ready jobs for the current user (`{ items: [{ id, youtubeVideoId, thumbnailUrl, title, completedAt }] }`).
  - `GET /api/ai/youtube-to-thread/capabilities` — Returns available transcription providers for the current user.
- **Always async** (no sync path) — YouTube download + transcription takes 15-90+ seconds.
- **Async path**: BullMQ `youtubeThreadQueue` + `youtubeThreadProcessor` with 5-phase pipeline: (1) yt-dlp downloads audio, (2) Deepgram/Whisper transcribes, (3) OpenRouter generates thread via `generateObject`, (4) moderation check, (5) persist result + record AI usage.
- **Database**: `youtubeThreadJobs` table (status lifecycle: `queued` → `downloading` → `transcribing` → `generating` → `ready` → `failed`).
- **Transcription providers**: Deepgram (`YOUTUBE_DEEPGRAM_API_KEY`) or OpenAI Whisper (reuses `OPENAI_API_KEY`). Cost calculation: ~$0.12 per 20 min (Deepgram), variable per Whisper usage.
- **Duration caps by plan** (enforced after `getVideoInfo()` before download, gate: `checkYoutubeVideoDurationDetailed()`):
  - Pro Monthly / Pro Annual: 20 min max per video (1200s) → ~$0.12 Deepgram cost
  - Agency: 90 min max per video (5400s) → ~$0.53 Deepgram cost
- **Safety**: yt-dlp URL validation rejects playlists/channels/shorts, moderation check on output. JAILBREAK_GUARD on generation prompt.
- **Error codes** (`error_code` column): `VIDEO_PRIVATE`, `VIDEO_AGE_GATED`, `VIDEO_LIVE`, `VIDEO_TOO_LONG`, `VIDEO_NO_AUDIO`, `TRANSCRIPTION_FAILED`, `MODERATION_FLAGGED`, `PROVIDER_ERROR`, `CANCELLED`, `UNKNOWN`. Client maps these to localized messages via `youtube_to_thread.errors.*` i18n keys.
- **Transcript preview**: GET `[jobId]` response includes the `transcript` field when status is `ready`. The result UI renders a collapsible "Show transcript" section.
- **Regenerate**: Ready state offers a "Regenerate" button that re-submits the same URL/options.
- **Recent jobs**: Idle state shows the last 5 ready jobs fetched from the `/history` endpoint. Thumbnail and title shown in job cards.
- **Tone selector**: 5 tone options (professional, educational, casual, formal, enthusiastic) available in the options form. Uses dedicated `youtube_to_thread.options.tone_professional`, `tone_educational`, `tone_casual`, `tone_formal`, `tone_enthusiastic` i18n keys (not shared with PDF-to-Thread).
- **Provider capability detection**: On mount, fetches `/api/ai/youtube-to-thread/capabilities` to determine available transcription providers. Unavailable providers are hidden; if only one is available, it's auto-selected.
- **Polling jitter**: Recursive `setTimeout` with ±500ms random jitter replaces fixed `setInterval` to prevent thundering herd on the status endpoint.
- **RTL support**: Back navigation arrow icons include `rtl:rotate-180` for Arabic layout.
- **Long video warning**: Preview card shows a warning (`text-warning-9`) when `durationSeconds > 900` (15 min). i18n key: `youtube_to_thread.url_input.long_video_warning`.
- **Result UI metadata footer**: Below tweet cards, a muted line displays `{duration} · {provider} · {language}` plus "Generated in Ns" (frozen elapsed timer from job start).
- **Thumbnail preview**: Result view shows a thumbnail image derived from `youtubeVideoId` (`https://i.ytimg.com/vi/{videoId}/hqdefault.jpg`) with a "Watch on YouTube" external link. Thumbnail also appears in the preview card before submission and in the Recent jobs list.
- **AI history labels**: Jobs recorded with `type: "youtube_to_thread"` (the thread) and `type: "transcription"` (audio cost) appear in `/dashboard/ai/history` with proper translated labels via `CONTENT_TYPES` (secondary badge variant).
- **Monthly count cap** (`youtubeToThreadMonthly`): Free/Trial=0, Pro Monthly=30, Pro Annual=50, Agency=Infinity. Gated by `checkYoutubeToThreadMonthlyDetailed()` counting `aiGenerations WHERE type='youtube_to_thread'` for the current month. Returns 402 on exhaustion.
- **Job history TTL**: `youtube_thread_jobs` rows older than 90 days are auto-deleted by the billing-cleanup cron.
- **yt-dlp healthcheck**: Worker boot verifies `yt-dlp --version` and logs a fatal diagnostic if the binary is missing, preventing cryptic ENOENT errors on YouTube-to-Thread jobs.
- **Rate limiting**: Handled by `aiPreamble()` which applies the global "ai" rate limit bucket to all AI endpoints including YouTube-to-Thread.

## 5. Evaluation & Inspiration

### `POST /api/ai/score`

- **Purpose**: Viral Score evaluator.
- **Details**: Scores content 0-100 based on hooks, value prop, CTA, readability, and emotion. Does not consume user quota.

### `POST /api/ai/inspire`

- **Purpose**: Content Inspiration (OpenRouter).
- **Actions**: Rephrase, change tone, expand, add takeaway, translate, counter-point.

### `GET /api/ai/trends`

- **Purpose**: Fetches AI-generated trending topics by category (Technology, Business, etc.) without requiring the X API.
- **Details**: Uses `OPENROUTER_MODEL_TRENDS` (web-search-capable model) → falls back to `OPENROUTER_MODEL_FREE` → `OPENROUTER_MODEL_AGENTIC` → `OPENROUTER_MODEL`. Uses `skipQuotaCheck: true` — available to all plans including Free. Cached for 30 minutes.

### `GET /api/ai/inspiration`

- **Purpose**: Fetches trending inspiration topics by niche. Cached for 6 hours.

### `POST /api/ai/enhance-topic`

- **Purpose**: Enhances a raw topic string into a more robust prompt.

## 6. Post-Generation & Refinement

### `POST /api/ai/refine`

- **Purpose**: Iterative refinement — regenerates AI output based on user feedback (tone, length, hook, hashtags).
- **Details**: Loads original `aiGenerations` row, validates ownership, runs a scoped prompt. `quotaWeight: 1`.

### `POST /api/ai/feedback`

- **Purpose**: Records 👍/👎 feedback on AI-generated content.
- **Details**: Owner-only (only the user who generated it). Data surfaced in admin AI metrics page.

## 7. Quota & Tracking

### `GET /api/ai/quota`

- **Purpose**: Retrieves the user's monthly AI usage counts (atomic counter-based).

### `GET /api/ai/image/quota`

- **Purpose**: Retrieves the user's monthly AI image generation counts and the list of image models available on their plan.

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
