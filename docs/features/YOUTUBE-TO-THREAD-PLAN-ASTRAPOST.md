# YouTube → Thread Implementation Plan for AstraPost

## Context

This plan adds a **YouTube Video → X/Twitter Thread** feature to AstraPost, adapting the proven Tube2Threads pipeline into AstraPost's existing architecture. The user pastes a YouTube URL, selects Deepgram or Whisper for transcription, and receives an 8-tweet thread via OpenRouter — all processed through BullMQ, gated behind Pro/Agency plans, and tracked with AstraPost's quota system.

**Target repo:** `C:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02`

## Key Architecture Decisions

| Decision                                          | Rationale                                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **BullMQ queue** (not Inngest)                    | AstraPost already has BullMQ + Redis worker infrastructure. Add a `youtube-to-thread` queue alongside the existing `publish-post` queue.    |
| **Drizzle ORM** (not Prisma)                      | AstraPost uses Drizzle. Add a `youtubeThreadJobs` table to the existing `src/lib/schema.ts`.                                                |
| **Better Auth** (not NextAuth)                    | Use `auth.api.getSession()` pattern already present in `aiPreamble`.                                                                        |
| **aiPreamble pattern**                            | All AI routes go through `src/lib/api/ai-preamble.ts` for auth → rate-limit → plan gate → quota check → API key guard. Follow this exactly. |
| **@openrouter/ai-sdk-provider + Vercel AI SDK 5** | Use `generateText()` from `ai` package (already imported across AstraPost). Do NOT use raw `fetch()` to OpenRouter.                         |
| **Pro/Agency plan gate**                          | Use `require-plan.ts`'s `makeFeatureGate()` pattern. Add `canUseYoutubeToThread` gate.                                                      |
| **Atomic quota**                                  | Use `tryConsumeAiQuota(userId, weight)` — weight 5 (same as PDF-to-thread and Agentic).                                                     |
| **Correlation IDs**                               | Generate at API entry, propagate to BullMQ job data and `job_runs` table.                                                                   |
| **Storage abstraction**                           | Use existing `src/lib/storage.ts` (local FS in dev, Vercel Blob in prod).                                                                   |
| **pnpm** (not npm)                                | AstraPost uses pnpm exclusively.                                                                                                            |

---

## Phase 1: Database & Configuration (8 files)

### 1.1 Add `youtubeThreadJobs` table to Drizzle schema

**File:** `src/lib/schema.ts` — add new table definition

```typescript
export const youtubeThreadJobs = pgTable(
  "youtube_thread_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    youtubeUrl: text("youtube_url").notNull(),
    youtubeVideoId: text("youtube_video_id").notNull(),
    provider: text("provider").notNull(), // "deepgram" | "whisper"
    status: text("status").notNull().default("pending"),
    // pending → downloading → transcribing → summarizing → completed → failed
    durationSeconds: integer("duration_seconds"),
    transcript: text("transcript"),
    thread: jsonb("thread"), // string[]
    errorMessage: text("error_message"),
    audioBlobPath: text("audio_blob_path"), // path in Vercel Blob or local FS
    correlationId: text("correlation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    userCreatedIdx: index("yt_jobs_user_created_idx").on(table.userId, desc(table.createdAt)),
    statusIdx: index("yt_jobs_status_idx").on(table.status),
    correlationIdx: index("yt_jobs_correlation_idx").on(table.correlationId),
  })
);
```

### 1.2 Generate and apply migration

```bash
pnpm run db:generate   # Creates migration SQL in drizzle/
pnpm run db:migrate    # Applies migration
```

### 1.3 Add environment variables

**File:** `src/lib/env.ts` — add to existing `env` object:

```typescript
// YouTube transcription (optional — feature disabled if unset)
YOUTUBE_DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY ?? "",
YOUTUBE_WHISPER_API_KEY: process.env.OPENAI_API_KEY ?? "", // reuse existing key
```

**File:** `env.example` — add entries:

```bash
# YouTube → Thread (Pro/Agency). Feature disabled when unset.
DEEPGRAM_API_KEY=          # https://console.deepgram.com — $200 free credit
# OPENAI_API_KEY above also used for Whisper transcription
```

### 1.4 Add plan gate

**File:** `src/lib/plan-limits.ts` — add to feature flags:

```typescript
// In the plan feature map (Free / Trial / Pro / Agency blocks):
canUseYoutubeToThread: false,  // Free
canUseYoutubeToThread: false,  // Trial
canUseYoutubeToThread: true,   // Pro Monthly & Annual
canUseYoutubeToThread: true,   // Agency
```

**File:** `src/lib/middleware/require-plan.ts` — add gate function:

```typescript
export const checkYoutubeToThreadAccess = makeFeatureGate("canUseYoutubeToThread");
```

### 1.5 Add quota weight constant

**File:** `src/lib/plan-limits.ts` or a new constants section:

```typescript
export const YOUTUBE_THREAD_QUOTA_WEIGHT = 5; // same as Agentic + PDF-to-thread
```

### 1.6 Add yt-dlp version pin

**File:** `package.json` — add config field:

```json
"astrapost": {
  "ytdlpVersion": "2024.12.06"
}
```

### 1.7 Add npm dependency

```bash
# No new npm packages needed — yt-dlp runs as subprocess via child_process.exec.
# If yt-dlp-wrapper preferred, add: pnpm add yt-dlp-wrap
# Recommendation: keep child_process.exec (zero deps, same as Tube2Threads)
```

### 1.8 Verification

- `pnpm run db:generate` produces a migration file
- `pnpm run db:migrate` applies without errors
- `pnpm typecheck` passes
- `youtube_thread_jobs` table visible in Drizzle Studio

---

## Phase 2: Core Library Modules (4 files)

### 2.1 yt-dlp wrapper

**File:** `src/lib/youtube.ts` (new)

Named exports:

- `validateYoutubeUrl(url)` — rejects playlists/channels/handles, returns `{ valid, videoId }`
- `getVideoDuration(url)` — calls `yt-dlp --print duration`, timeout 15s
- `extractAudio(url, outputPath)` — `yt-dlp -f "bestaudio[ext=m4a]/bestaudio"` (no ffmpeg needed)
- `verifyYtDlpVersion(expected)` — checks installed version against pinned

Auto-detect yt-dlp binary location at module load (check `YT_DLP_PATH` env → common pip paths → PATH).

### 2.2 Deepgram transcription client

**File:** `src/lib/services/deepgram.ts` (new)

Named export: `transcribeWithDeepgram(audioBuffer: Buffer)`

Sends raw audio to `https://api.deepgram.com/v1/listen?model=base&smart_format=true`. Detects m4a vs mp3 via magic bytes, sets correct Content-Type (`audio/mp4` for m4a, `audio/mpeg` for mp3). Returns `{ transcript, durationSeconds, cost }`.

### 2.3 Whisper transcription client

**File:** `src/lib/services/whisper-transcribe.ts` (new)

Named export: `transcribeWithWhisper(audioBuffer: Buffer)`

Sends audio as FormData to `https://api.openai.com/v1/audio/transcriptions` (model: `whisper-1`, `response_format: verbose_json`). Returns `{ transcript, durationSeconds, cost }`.

### 2.4 Transcription provider router

**File:** `src/lib/services/transcription.ts` (new)

Named export: `transcribe(audioBuffer, provider: "deepgram" | "whisper")`

Routes to Deepgram or Whisper module. Callers import only this file.

### 2.5 OpenRouter summarization (adapt existing)

**File:** `src/lib/ai/youtube-thread.ts` (new)

Named export: `generateYoutubeThread(transcript: string)`

Uses the existing `@openrouter/ai-sdk-provider` + `generateText()` from Vercel AI SDK 5 (NOT raw fetch). System prompt demands exactly 8 tweets ≤ 280 chars. Validates output: exactly 8 items, each ≤ 280 chars. Retries once with stricter prompt on failure. Returns `{ tweets: string[], tokensUsed, costEstimateCents }`.

**Pattern to follow** (from existing AstraPost AI routes):

```typescript
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

const result = await generateText({
  model: openrouter(env.OPENROUTER_MODEL),
  system: SYSTEM_PROMPT,
  prompt: transcript,
  maxTokens: 2000,
  temperature: 0.7,
});
```

### 2.6 Verification

- `pnpm typecheck` passes
- Manual test: call `validateYoutubeUrl` with valid/invalid URLs via `pnpm tsx`

---

## Phase 3: BullMQ Queue + Worker (2 files)

### 3.1 Queue definition

**File:** `src/lib/queue/youtube-thread.ts` (new)

Named exports:

- `youtubeThreadQueue` — BullMQ Queue instance
- `enqueueYoutubeThread(jobData)` — adds job to queue
- `YoutubeThreadJobData` type — `{ jobId, url, provider, userId, correlationId }`

Follow pattern from existing `src/lib/queue/` files.

### 3.2 Worker processor

**File:** `scripts/worker.ts` — add new processor registration

Add a new processor for `youtube-thread` queue alongside the existing `publish-post` processor:

```
Worker processes:
1. Download audio via yt-dlp → update status "downloading"
2. Upload audio to storage (Vercel Blob / local FS) → update status "transcribing"
3. Call transcription provider → save transcript → update status "summarizing"
4. Call OpenRouter summarization → validate → update status "completed"
5. Log to ai_generations table (using existing recordAiUsage pattern)
6. On failure: update status "failed", log error
```

Each step wrapped in try/catch. On failure after 5 retries (BullMQ default), write to `failed_jobs` table.

The worker already imports and uses `src/lib/services/` modules — follow the same pattern.

Correlation ID must flow: API → job data → every worker log line → `job_runs` table.

### 3.3 Verification

- `pnpm typecheck` passes
- Start worker: `pnpm run worker` — queue appears in Bull Board UI
- Enqueue test job manually via script

---

## Phase 4: API Routes (2 files)

### 4.1 POST /api/ai/youtube-to-thread

**File:** `src/app/api/ai/youtube-to-thread/route.ts` (new)

Follow the **exact** `aiPreamble` pattern used by all existing AI routes:

```typescript
export async function POST(request: NextRequest) {
  // 1. aiPreamble (auth → rate-limit → plan gate → quota → API key guard)
  const preamble = await aiPreamble({
    request,
    planGate: checkYoutubeToThreadAccess,
    quotaWeight: YOUTUBE_THREAD_QUOTA_WEIGHT,
    skipQuotaCheck: false,
  });
  if (preamble instanceof Response) return preamble;
  const { user } = preamble;

  // 2. Validate body (Zod: url + provider enum)
  // 3. Validate YouTube URL (reject playlists/channels/handles)
  // 4. Check video duration (yt-dlp --print duration, reject > 5400s)
  // 5. Create youtubeThreadJobs row (status: "pending")
  // 6. Enqueue BullMQ job
  // 7. Return 201 { jobId, correlationId }
}
```

**Rate limit:** Reuse the existing rate limiter in `aiPreamble`.

**Quota:** Weight 5, consumed atomically via `tryConsumeAiQuota` inside `aiPreamble`.

### 4.2 GET /api/ai/youtube-to-thread/[id]

**File:** `src/app/api/ai/youtube-to-thread/[id]/route.ts` (new)

Returns job status + result. User-scoped (only own jobs). Uses `auth.api.getSession()`.

```typescript
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // 1. Auth check
  // 2. Find job by id + userId
  // 3. Return { job } or 404
}
```

### 4.3 Verification

- `pnpm typecheck` passes
- Manual curl: POST returns 401 unauthenticated
- Manual curl: POST with session returns 402 if on Free plan
- Manual curl: POST with Pro session returns 201 with jobId

---

## Phase 5: Frontend (4 files)

### 5.1 YouTube URL input component

**File:** `src/components/composer/youtube-url-input.tsx` (new)

`"use client"` component. Props: `onJobCreated?: (jobId: string) => void`.

- Text input for YouTube URL
- Radio group: Deepgram / Whisper
- Submit button with loading state
- Validation feedback inline
- On success: navigates to job detail page or calls callback
- Plan gate: if user is Free, show upgrade CTA instead of form

Follow existing shadcn/ui patterns in the composer.

### 5.2 Thread viewer component

**File:** `src/components/composer/youtube-thread-viewer.tsx` (new)

`"use client"` component. Props: `tweets: string[]`.

- 8 numbered tweet cards using `role="list"` (WCAG)
- Character counter per tweet
- "Copy Thread" button with clipboard API + "Copied!" feedback
- Matches existing thread preview styling in the composer

### 5.3 Job status component

**File:** `src/components/composer/youtube-job-status.tsx` (new)

`"use client"` component. Props: `status: string`.

- Progress indicator with step label
- Skeleton for in-progress states
- Error display for failed state
- Auto-polling via custom hook

### 5.4 YouTube-to-Thread page (tab in AI Writer)

**File:** `src/app/dashboard/ai/writer/youtube/page.tsx` (new) or add to existing writer page as a tab

**Option A** — New tab in the existing AI Writer (`/dashboard/ai/writer`):
Add a "YouTube" tab alongside the existing "Thread", "URL", "Variants", "Hashtags" tabs.

**Option B** — New page at `/dashboard/ai/writer/youtube`:
Dedicated page with YouTube URL input + job history.

Recommend **Option A** — add as a tab in the existing AI Writer page. Follow the same tab pattern already used for Thread/URL/Variants.

### 5.5 Job polling hook

**File:** `src/hooks/use-youtube-job-polling.ts` (new)

Polls `GET /api/ai/youtube-to-thread/[id]` every 2 seconds. Clears on "completed" or "failed". Used by the job status component.

### 5.6 Verification

- `pnpm typecheck` passes
- `pnpm build` succeeds
- Manual flow: Pro user → AI Writer → YouTube tab → paste URL → submit → see progress → view thread → copy

---

## Phase 6: Polish & Integration (3 files)

### 6.1 Record AI usage for cost tracking

In the worker processor, after summarization completes, call the existing `recordAiUsage()` function:

```typescript
await recordAiUsage({
  userId,
  model: env.OPENROUTER_MODEL,
  type: "text",
  subFeature: "youtube_to_thread",
  tokensIn: result.usage?.promptTokens ?? 0,
  tokensOut: result.usage?.completionTokens ?? 0,
  costEstimateCents: Math.round(cost * 100),
  latencyMs: Date.now() - startTime,
  success: true,
});
```

The transcription cost should also be tracked as a separate `ai_generations` row with `type: "transcription"` and `provider: "deepgram" | "whisper"`.

### 6.2 Add to navigation

**File:** appropriate sidebar/navigation component — add link to YouTube → Thread if user has Pro/Agency plan.

### 6.3 Add to onboarding / feature discovery

If AstraPost has a feature announcement or "What's New" section, add YouTube → Thread.

### 6.4 Verification

- `pnpm run check` (lint + typecheck + i18n) passes
- Full E2E flow with a real YouTube URL
- Quota counter decrements correctly
- `ai_generations` row written with correct `subFeature: "youtube_to_thread"`
- `job_runs` row written with correlation ID
- Bull Board shows queue processing

---

## File Inventory

| #   | File                                                | Action    | Phase                              |
| --- | --------------------------------------------------- | --------- | ---------------------------------- |
| 1   | `src/lib/schema.ts`                                 | modify    | 1 — Add youtubeThreadJobs table    |
| 2   | `drizzle/*.sql`                                     | generated | 1 — Migration                      |
| 3   | `src/lib/env.ts`                                    | modify    | 1 — Add DEEPGRAM_API_KEY           |
| 4   | `env.example`                                       | modify    | 1 — Document new vars              |
| 5   | `src/lib/plan-limits.ts`                            | modify    | 1 — Add canUseYoutubeToThread flag |
| 6   | `src/lib/middleware/require-plan.ts`                | modify    | 1 — Add gate function              |
| 7   | `package.json`                                      | modify    | 1 — Add ytdlpVersion pin           |
| 8   | `src/lib/youtube.ts`                                | new       | 2 — yt-dlp wrapper                 |
| 9   | `src/lib/services/deepgram.ts`                      | new       | 2 — Deepgram client                |
| 10  | `src/lib/services/whisper-transcribe.ts`            | new       | 2 — Whisper client                 |
| 11  | `src/lib/services/transcription.ts`                 | new       | 2 — Provider router                |
| 12  | `src/lib/ai/youtube-thread.ts`                      | new       | 2 — OpenRouter summarization       |
| 13  | `src/lib/queue/youtube-thread.ts`                   | new       | 3 — BullMQ queue                   |
| 14  | `scripts/worker.ts`                                 | modify    | 3 — Add processor                  |
| 15  | `src/app/api/ai/youtube-to-thread/route.ts`         | new       | 4 — POST endpoint                  |
| 16  | `src/app/api/ai/youtube-to-thread/[id]/route.ts`    | new       | 4 — GET status endpoint            |
| 17  | `src/components/composer/youtube-url-input.tsx`     | new       | 5 — URL input UI                   |
| 18  | `src/components/composer/youtube-thread-viewer.tsx` | new       | 5 — Thread display                 |
| 19  | `src/components/composer/youtube-job-status.tsx`    | new       | 5 — Progress indicator             |
| 20  | `src/hooks/use-youtube-job-polling.ts`              | new       | 5 — Polling hook                   |
| 21  | `src/app/dashboard/ai/writer/` (tab)                | modify    | 5 — Add YouTube tab                |

**Total: 11 new files, 10 modified files**

---

## AstraPost Integration Patterns (CRITICAL)

These patterns MUST be followed — they are non-negotiable for AstraPost code:

1. **Route handlers**: Always start with `const preamble = await aiPreamble({...})`. Never duplicate auth/plan/quota logic.
2. **Errors**: Always use `throw ApiError("unauthorized")` or `ApiError("forbidden", "message")` from `@/lib/api/errors`. Never inline `new Response(JSON.stringify(...))`.
3. **Plan gates**: Always via `makeFeatureGate()` in `require-plan.ts`. Returns HTTP 402 with structured upgrade JSON.
4. **Quota**: Always via `tryConsumeAiQuota(userId, weight)` for atomic consumption.
5. **AI calls**: Always via `generateText()` from Vercel AI SDK 5 + `@openrouter/ai-sdk-provider`. Never use raw `fetch()`.
6. **DB writes**: Multi-table writes always in `db.transaction()`.
7. **Correlation IDs**: Generate at API entry, propagate everywhere.
8. **TypeScript**: `exactOptionalPropertyTypes` is ON. Optional props use `{...(val !== undefined && { prop: val })}`.
9. **Imports**: Follow existing import ordering. Use `@/` path alias.
10. **Package manager**: Always `pnpm`, never `npm`.
