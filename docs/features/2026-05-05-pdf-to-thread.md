# PDF → Thread — Implementation Plan

**Date:** 2026-05-05
**Owner:** Backend + Frontend
**Estimated effort:** 1.5 weeks (≈ 8 working days)
**Tier:** Pro Monthly + Pro Annual + Agency
**Quota weight:** 5
**Entry point:** `/dashboard/ai` (new card) → dedicated page at `/dashboard/ai/pdf-to-thread`

---

## 0. Summary

Users upload a native PDF (≤ 50 MB, ≤ 200 pages). The server extracts text, validates the character budget, runs the existing summarize-style prompt with a new `report` variant, and returns an X thread (3–15 tweets, Arabic or English).

- **Sync path** when extracted text ≤ 30 000 chars — ~5–8 s, returns the thread immediately.
- **Async path** when extracted text > 30 000 chars — chunked summarize via BullMQ, SSE progress, ~30–90 s.
- **Required attestation**: user must check _"I own or have rights to this document"_ before the request fires (server re-validates).
- **No OCR**. Native (text-layer) PDFs only — scanned documents fail validation with a clear error.
- **No YouTube / video / audio.** Out of scope, deliberately.

This is a **single feature shipping in one PR series** — not a multi-modal umbrella. Naming everywhere is "PDF → Thread" / `pdf_to_thread` / `canUsePdfToThread`.

---

## 1. Decisions & Rationale

| Decision               | Choice                                                             | Why                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **New plan flag**      | `canUsePdfToThread` (not reuse `canUseUrlToThread`)                | Different cost (weight 5 vs 1) and different upgrade story. Future pricing flexibility.                                    |
| **Quota weight**       | `5`                                                                | Worst-case 30 K-char summarize at Claude Sonnet via OR ≈ $0.05 ≈ 5× a single-shot call. Matches agentic weight for parity. |
| **Plan tier**          | Pro Monthly + Pro Annual + Agency. Free + Trial = ✗                | Aligns with B2B agency ICP; trial users get URL→Thread for evaluation.                                                     |
| **PDF parser**         | `pdf-parse` (npm)                                                  | Pure-JS, no native deps, server-only. Returns `{ text, numpages, info }`. Fastest to integrate.                            |
| **Upload storage**     | Vercel Blob (prod) / local (dev) via existing `upload()` helper    | Consistent with media uploads. TTL cleanup runs daily via existing cron.                                                   |
| **Sync threshold**     | 30 000 chars (mirrors `INPUT_LIMITS.summarizeBody`)                | Matches existing `/api/ai/summarize`; predictable LLM latency.                                                             |
| **Async architecture** | BullMQ + new `pdfThreadQueue` + SSE endpoint                       | Mirrors existing agentic pattern; reuses worker process.                                                                   |
| **Prompt variant**     | Add `report` mode to existing summarize prompt                     | Reports differ from articles (exec summary, sections, takeaways).                                                          |
| **Tracking table**     | New `pdfThreadJobs` table (mirrors `agenticPosts`)                 | Status machine + correlation + result persistence.                                                                         |
| **Page placement**     | Dedicated page `/dashboard/ai/pdf-to-thread` (NOT a tab in writer) | Distinct UX (file upload vs URL paste); easier to gate; cleaner mobile.                                                    |
| **Pages cap**          | 200 (hard)                                                         | Caps token budget worst case. Most reports < 50 pages.                                                                     |
| **Size cap**           | 50 MB (hard)                                                       | Aligns with existing `media/upload` ABSOLUTE_MAX_BYTES.                                                                    |
| **Attestation**        | Required server-side, persisted on job row                         | Shifts copyright risk to user; needed for any future legal defense.                                                        |
| **Sidebar nav**        | New child item under "AI Tools" section                            | Discoverability; mirrors URL → Thread placement convention.                                                                |

---

## 2. Phasing & Agent Strategy

| Phase                           | Days | Primary Agent                                          | Parallel Agents                  | Deliverables                                            |
| ------------------------------- | ---- | ------------------------------------------------------ | -------------------------------- | ------------------------------------------------------- |
| **0. Foundation**               | 0.5  | `db-migrator`                                          | (none)                           | Schema + plan-limits + env + deps                       |
| **1. Backend ingestion + sync** | 2    | `backend-dev`                                          | `ai-specialist` (prompt variant) | `/api/ai/pdf-to-thread/upload` + sync `/generate` route |
| **2. Backend async (BullMQ)**   | 2    | `backend-dev`                                          | (none)                           | New queue + processor + SSE polling endpoint            |
| **3. Frontend**                 | 2    | `frontend-dev`                                         | `i18n-dev` (parallel)            | Page, form, progress UI, mobile/RTL polish              |
| **4. Wiring + telemetry**       | 1    | `backend-dev` + `frontend-dev` (parallel)              | (none)                           | Dashboard card, sidebar nav, admin metrics, error UX    |
| **5. Final audit**              | 0.5  | `convention-enforcer` + `security-reviewer` (parallel) | → `test-runner`                  | Convention + security check + lint/typecheck/tests      |
| **6. Docs**                     | 0.5  | `docs-writer`                                          | (parallel with 5)                | README, AI audit, CLAUDE.md, recent-changes             |

**Total: ≈ 8 days.**

> **Per CLAUDE.md hard rule #16:** docs (`AI_Endpoints_Models_and_Prompts_Full_Audit_Report.md`, `README.md`, files in `docs/claude/`) must be updated as part of Phase 6 — do not defer.

---

## 3. Phase 0 — Foundation (0.5 day)

### 3.1 Dependencies

```bash
pnpm add pdf-parse
pnpm add -D @types/pdf-parse
```

> `pdf-parse` is pure JS, no native bindings. It's server-only — never import in client code.

### 3.2 Schema additions — `src/lib/schema.ts`

Add new table after `agenticPosts` (around line 1572):

```typescript
export const pdfThreadJobs = pgTable(
  "pdf_thread_jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    correlationId: text("correlation_id").notNull(),
    status: text("status", {
      enum: ["uploading", "extracting", "queued", "processing", "ready", "failed"],
    })
      .notNull()
      .default("uploading"),
    fileUrl: text("file_url").notNull(), // Vercel Blob / local URL
    fileName: text("file_name").notNull(), // Sanitized original name
    fileSizeBytes: integer("file_size_bytes").notNull(),
    pageCount: integer("page_count"), // null until extraction completes
    charCount: integer("char_count"), // null until extraction completes
    language: text("language", { enum: ["ar", "en"] }).notNull(),
    tweetCount: integer("tweet_count").notNull().default(7),
    tone: text("tone").notNull().default("professional"),
    attestationAt: timestamp("attestation_at").notNull(), // when user checked the box
    threadResult: jsonb("thread_result").$type<{
      tweets: Array<{ text: string; charCount: number }>;
      title: string;
      sourceLanguage: "ar" | "en";
    } | null>(),
    error: text("error"), // populated on failure
    quotaConsumed: integer("quota_consumed").default(0),
    quotaReleased: boolean("quota_released").default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (t) => ({
    userIdx: index("pdf_thread_jobs_user_idx").on(t.userId, t.createdAt.desc()),
    statusIdx: index("pdf_thread_jobs_status_idx").on(t.status),
  })
);
```

**Add type exports at bottom of file:**

```typescript
export type PdfThreadJob = typeof pdfThreadJobs.$inferSelect;
export type NewPdfThreadJob = typeof pdfThreadJobs.$inferInsert;
```

**Generate migration:**

```bash
pnpm db:generate    # creates drizzle/00XX_pdf_thread_jobs.sql
pnpm db:migrate     # local apply (Vercel auto-applies on prod deploy)
```

### 3.3 Plan-limits flag — `src/lib/plan-limits.ts`

Add `canUsePdfToThread` to `PlanLimits` interface (around line 30):

```typescript
canUsePdfToThread: boolean;
```

Add to **every** plan block:

| Plan          | Value   |
| ------------- | ------- |
| `free`        | `false` |
| `trial`       | `false` |
| `pro_monthly` | `true`  |
| `pro_annual`  | `true`  |
| `agency`      | `true`  |

> **Critical:** all 5 blocks must include the flag or TypeScript will fail.

### 3.4 Plan gate — `src/lib/middleware/require-plan.ts`

Add after `checkUrlToThreadAccessDetailed` (around line 431):

```typescript
export const checkPdfToThreadAccessDetailed = makeFeatureGate(
  "pdf_to_thread",
  "canUsePdfToThread",
  "Convert PDFs into compelling threads — available on Pro"
);
```

### 3.5 Input limits — `src/lib/ai/input-limits.ts`

Add new caps:

```typescript
pdfReportBody: 30_000,    // matches summarizeBody — sync threshold
pdfReportChunk: 12_000,   // per-chunk size for async chunked summarize
```

### 3.6 Storage allowlist — `src/lib/storage.ts`

Confirm `.pdf` is in `ALLOWED_EXTENSIONS` (it is, per existing whitelist line 51-63). No change needed — but verify on review.

### 3.7 Env vars

Reuses `OPENROUTER_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `REDIS_URL`. Uses `OPENROUTER_MODEL_PDF_TO_THREAD` (optional, falls back to `OPENROUTER_MODEL`) for model selection.

### 3.8 Quota type registration — `src/lib/services/ai-quota.ts`

Add `"pdf_to_thread"` to the AI generation `type` union if it's typed there. Search for `"url_to_thread"` and add the new key wherever it appears.

---

## 4. Phase 1 — Backend Ingestion + Sync Path (2 days)

### 4.1 New route: `POST /api/ai/pdf-to-thread/upload` — file upload + extraction

**File:** `src/app/api/ai/pdf-to-thread/upload/route.ts`

**Responsibilities:**

1. Auth via `getTeamContext()`
2. Plan gate: `checkPdfToThreadAccessDetailed`
3. Rate limit: `checkRateLimit("media")`
4. Multipart parse — single field `file`, plus form fields `language`, `tweetCount`, `tone`, `attestation`
5. Magic-byte validation: PDF must start with `%PDF-` (bytes `25 50 44 46`)
6. Size check (50 MB hard)
7. Sanitize filename, upload to Blob/local via `upload()` (folder `pdf-uploads`)
8. Run `pdf-parse` to extract text + page count
9. Page count validation (≤ 200) — reject otherwise, delete uploaded blob
10. Empty-text validation — if extracted text < 200 chars, treat as scanned/image PDF and reject with code `PDF_NO_TEXT_LAYER`
11. Insert `pdfThreadJobs` row with `status: "extracting"`, `attestationAt: new Date()` (only if `attestation === "true"`)
12. Return `{ jobId, charCount, pageCount, syncEligible: charCount <= 30_000 }`

**Critical validations:**

- `attestation` field MUST be `"true"` — reject with 400 otherwise (`code: "ATTESTATION_REQUIRED"`)
- Magic bytes — never trust file extension alone
- Run `pdf-parse` inside a try/catch with a 15 s timeout via `withTimeout()` — corrupted PDFs can hang
- If `pdf-parse` throws, delete the blob and return `400` with `code: "PDF_PARSE_FAILED"`
- Wrap file upload + DB insert + blob cleanup in try/catch; on any error after upload, delete the blob

**Response shape (success):**

```typescript
{
  jobId: string;
  charCount: number;
  pageCount: number;
  syncEligible: boolean; // true if charCount <= 30_000
  fileName: string;
}
```

**Headers:** `x-correlation-id`

### 4.2 Sync route: `POST /api/ai/pdf-to-thread/generate` — synchronous thread generation

**File:** `src/app/api/ai/pdf-to-thread/generate/route.ts`

Mirrors `/api/ai/summarize` structure exactly. Key differences:

- Loads job by `jobId` (ownership-check); rejects unless `status === "extracting"`
- If `charCount > 30_000`, returns `409` with `code: "USE_ASYNC_PATH"` and the job stays in `extracting`
- `aiPreamble({ featureGate: checkPdfToThreadAccessDetailed, quotaWeight: 5 })`
- Re-extract text from blob (or cache in `pdfThreadJobs.extractedText` column — see optimization note)
- `redactPII()` → `wrapUntrusted("REPORT TEXT", cleanBody, INPUT_LIMITS.pdfReportBody)`
- Use the new **report-variant prompt** (see 4.4)
- `generateObject` with the same schema as `/summarize` (tweets, title, sourceLanguage)
- `recordAiUsage({ type: "pdf_to_thread", model, tokensIn, tokensOut, costEstimateCents, ... })`
- `await checkModeration(sanitized.tweets.join("\n"))`
- On success: update job row to `status: "ready"`, `threadResult: {...}`, `completedAt: now`
- On failure: update job to `status: "failed"`, `error: msg`, call `releaseQuota()`
- Return `{ jobId, tweets, title, redactions, sourceLanguage }`

**Optimization (recommended):** add `extractedText` text column to `pdfThreadJobs` and persist it in step 4.1, so generate doesn't re-fetch the blob and re-parse. Saves 1–3 s per call. Trade-off: stores ~30 K text per job; acceptable.

### 4.3 Optional column: `extractedText` on `pdfThreadJobs`

If choosing the optimization above, add to schema in Phase 0:

```typescript
extractedText: text("extracted_text"),   // null if too large to cache (> 200 KB)
```

Cache only if `text.length <= 200_000` (covers the async chunking budget too).

### 4.4 New prompt variant — `src/lib/ai/summarize-prompts.ts` (new file)

**Why a new file:** The existing prompt is inline in `/api/ai/summarize/route.ts`. Extract both variants here to keep prompt logic centralized and testable.

```typescript
import "server-only";
import { wrapUntrusted, JAILBREAK_GUARD } from "@/lib/ai/untrusted";
import { buildLanguageBlock } from "@/lib/ai/language";
import { getArabicToneGuidance } from "@/lib/ai/arabic-prompt";

interface BuildSummarizePromptArgs {
  variant: "article" | "report";
  language: "ar" | "en";
  tone: string;
  tweetCount: number;
  title: string;
  body: string; // Already PII-redacted + truncated
  bodyMaxChars: number; // INPUT_LIMITS.summarizeBody or pdfReportChunk
}

export const SUMMARIZE_PROMPT_VERSION = "summarize:v2"; // bump to v2 when shipping
export const PDF_TO_THREAD_PROMPT_VERSION = "pdf_to_thread:v1";

export function buildSummarizePrompt(args: BuildSummarizePromptArgs): string {
  const { variant, language, tone, tweetCount, title, body, bodyMaxChars } = args;
  const langBlock = buildLanguageBlock(language, "social");
  const toneGuidance = language === "ar" ? getArabicToneGuidance(tone) : `Tone: ${tone}.`;

  const intro =
    variant === "report"
      ? `You are an expert business analyst and social media writer for X (Twitter).\nRead the following REPORT or DOCUMENT and write a ${tweetCount}-tweet thread that surfaces the most actionable insights for a professional audience.`
      : `You are an expert social media writer for X (Twitter).\nRead the following article and write a ${tweetCount}-tweet thread that summarizes or comments on it.`;

  const reportSpecificRules =
    variant === "report"
      ? `\n- Lead with the SINGLE most important insight in tweet 1 (not a generic hook).\n- Quote specific numbers, percentages, or findings where present.\n- Each middle tweet covers ONE key insight or section — no rambling synthesis.\n- Avoid corporate jargon unless the source uses it.\n- Final tweet: a concrete takeaway or "what this means for you" framing.`
      : `\n- Make the thread engaging, informative, and shareable.\n- Start with a hook tweet that grabs attention.\n- End with a takeaway or call-to-action tweet.`;

  return `${intro}
${langBlock} ${toneGuidance}
Auto-detect the source language and note it in sourceLanguage.

${variant === "report" ? "DOCUMENT TITLE" : "ARTICLE TITLE"}: ${title}
${wrapUntrusted(variant === "report" ? "DOCUMENT TEXT" : "ARTICLE TEXT", body, bodyMaxChars)}

Constraints:
- Each tweet MUST be strictly under 800 characters.
- Do NOT include tweet numbering in the text.${reportSpecificRules}

${JAILBREAK_GUARD}`;
}
```

**Refactor existing `/api/ai/summarize/route.ts`** to use `buildSummarizePrompt({ variant: "article", ... })`. This removes prompt duplication.

### 4.5 Validation Zod schema — `src/lib/schemas/pdf-to-thread.ts`

```typescript
import { z } from "zod";
import { LANGUAGE_VALUES } from "@/lib/constants";

export const pdfToThreadGenerateSchema = z.object({
  jobId: z.string().uuid(),
  language: z.enum(LANGUAGE_VALUES),
  tweetCount: z.number().int().min(3).max(15).default(7),
  tone: z.string().min(1).max(40).default("professional"),
});

export type PdfToThreadGenerateInput = z.infer<typeof pdfToThreadGenerateSchema>;
```

The upload route uses `FormData` parsing (not Zod) since it's multipart.

---

## 5. Phase 2 — Async Path (BullMQ) (2 days)

### 5.1 Queue registration — `src/lib/queue/client.ts`

Add to existing file:

```typescript
export interface PdfThreadJobPayload {
  jobId: string; // pdfThreadJobs.id
  userId: string;
  correlationId: string;
}

export const pdfThreadQueue = new Queue<PdfThreadJobPayload>("pdfThreadQueue", {
  connection: redis,
});

export const PDF_THREAD_JOB_OPTIONS: JobsOptions = {
  attempts: 2, // 2 tries — failed PDFs are usually unrecoverable
  backoff: { type: "exponential", delay: 5_000 },
  removeOnComplete: { count: 500, age: 24 * 3600 },
  removeOnFail: { age: 7 * 24 * 3600 },
};
```

### 5.2 Processor — `src/lib/queue/processors.ts`

Add new processor:

```typescript
export const pdfThreadProcessor = async (job: Job<PdfThreadJobPayload>) => {
  const { jobId, userId, correlationId } = job.data;
  logger.info("pdf_thread_job_start", { jobId, userId, correlationId });

  // 1. Load job row
  const [row] = await db.select().from(pdfThreadJobs).where(eq(pdfThreadJobs.id, jobId));
  if (!row || row.status !== "queued") {
    logger.warn("pdf_thread_job_skipped", { jobId, status: row?.status });
    return;
  }

  // 2. Set status = processing
  await db.update(pdfThreadJobs).set({ status: "processing", updatedAt: new Date() })
    .where(eq(pdfThreadJobs.id, jobId));

  try {
    // 3. Chunked summarize
    const text = row.extractedText ?? await fetchAndExtract(row.fileUrl);  // helper
    const chunks = chunkText(text, INPUT_LIMITS.pdfReportChunk);           // ~12 K each
    const partialSummaries: string[] = [];

    for (const chunk of chunks) {
      const partial = await summarizeChunk(chunk, row.language);            // small generateText call
      partialSummaries.push(partial);
    }

    // 4. Final pass: combine partials → final thread
    const combined = partialSummaries.join("\n\n");
    const result = await generateThreadFromCombined({
      combined,
      title: row.fileName,
      language: row.language,
      tweetCount: row.tweetCount,
      tone: row.tone,
    });

    // 5. Moderation
    await checkModeration(result.tweets.map(t => t.text).join("\n"));

    // 6. Persist + record usage
    await db.update(pdfThreadJobs).set({
      status: "ready",
      threadResult: result,
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(pdfThreadJobs.id, jobId));

    await recordAiUsage({
      userId,
      type: "pdf_to_thread",
      model: process.env.OPENROUTER_MODEL!,
      subFeature: "async_chunked",
      tokensIn: ...,
      tokensOut: ...,
      promptVersion: PDF_TO_THREAD_PROMPT_VERSION,
      latencyMs: Date.now() - startTs,
      language: row.language,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("pdf_thread_job_failed", { jobId, error: msg });
    await db.update(pdfThreadJobs).set({
      status: "failed",
      error: msg,
      updatedAt: new Date(),
    }).where(eq(pdfThreadJobs.id, jobId));
    // Quota was already consumed at enqueue time — release it
    await releaseAiQuota(userId, 5);
    throw err;  // BullMQ retry
  }
};
```

**Register processor** in `scripts/worker.ts` alongside existing processors.

### 5.3 Async enqueue route: `POST /api/ai/pdf-to-thread/enqueue`

**File:** `src/app/api/ai/pdf-to-thread/enqueue/route.ts`

- Auth, plan gate, rate limit (same as sync)
- `aiPreamble({ featureGate: checkPdfToThreadAccessDetailed, quotaWeight: 5 })` — quota consumed here, BEFORE enqueue
- Load job row by `jobId`, ownership-check, require `status === "extracting"`
- Update row: `status: "queued"`, `quotaConsumed: 5`
- Enqueue: `await pdfThreadQueue.add("pdfThread", { jobId, userId, correlationId }, PDF_THREAD_JOB_OPTIONS)` — **AFTER** transaction commits per CLAUDE.md hard rule #13
- Return `{ jobId, status: "queued" }`

> **Critical (CLAUDE.md #13):** the queue add happens _outside_ any `db.transaction()`. The status update is its own atomic write.

### 5.4 SSE progress endpoint: `GET /api/ai/pdf-to-thread/[jobId]/stream`

**File:** `src/app/api/ai/pdf-to-thread/[jobId]/stream/route.ts`

Mirrors agentic SSE pattern. **Important:** to avoid Upstash Redis connection exhaustion, use **polling** (not true streaming) with the existing 10 s interval pattern from `queue-realtime-listener.tsx:8`.

**Two options:**

**Option A — True SSE:** `ReadableStream` polls the DB every 2 s, emits events on status change, closes on terminal status. Use only if you have low concurrent user counts.

**Option B (recommended) — Plain JSON polling:** Frontend polls `GET /api/ai/pdf-to-thread/[jobId]` every 5 s with `AbortController` (8 s timeout per CLAUDE.md hard rule #10). Simpler, scales better.

**Go with B.** Add:

**File:** `src/app/api/ai/pdf-to-thread/[jobId]/route.ts`

- `GET`: returns `{ status, charCount, pageCount, threadResult, error, createdAt, completedAt }`. Ownership-check.
- `DELETE`: marks job `status: "failed"` with `error: "user_cancelled"`. Best-effort BullMQ `job.remove()` if still queued.

---

## 6. Phase 3 — Frontend (2 days)

### 6.1 Page — `src/app/dashboard/ai/pdf-to-thread/page.tsx`

Server component. Renders `<PdfToThreadClient />`. Wrap in `<DashboardPageWrapper icon={FileText} title={t("title")}>`.

```typescript
import { getTranslations } from "next-intl/server";
import { FileText } from "lucide-react";
import { DashboardPageWrapper } from "@/components/dashboard/page-wrapper";
import { PdfToThreadClient } from "@/components/ai/pdf-to-thread/pdf-to-thread-client";

export default async function PdfToThreadPage() {
  const t = await getTranslations("ai_hub.pdf_to_thread");
  return (
    <DashboardPageWrapper icon={FileText} title={t("title")} description={t("description")}>
      <PdfToThreadClient />
    </DashboardPageWrapper>
  );
}
```

### 6.2 Client component — `src/components/ai/pdf-to-thread/pdf-to-thread-client.tsx`

State machine:

```
idle → uploading → extracted → (sync) generating → done
                            → (async) queued → processing → done
                  → error
```

**Sub-components:**

| Component             | File                        | Purpose                                                             |
| --------------------- | --------------------------- | ------------------------------------------------------------------- |
| `PdfDropzone`         | `pdf-dropzone.tsx`          | Drag-drop + click-to-upload, file preview, upload progress          |
| `PdfPreviewCard`      | `pdf-preview-card.tsx`      | Shows file name, size, page count, char count, sync/async indicator |
| `AttestationCheckbox` | `attestation-checkbox.tsx`  | Required checkbox with rights confirmation                          |
| `GenerationOptions`   | `generation-options.tsx`    | Language toggle, tweet count slider (3–15), tone select             |
| `ProgressIndicator`   | `progress-indicator.tsx`    | For async path — polled status with phase labels                    |
| `ThreadResultPreview` | `thread-result-preview.tsx` | Tweet cards, copy-each, "Send to Composer" CTA                      |

**Critical client-side validations BEFORE upload:**

- `file.size <= 50 * 1024 * 1024` → toast otherwise
- `file.type === "application/pdf"` AND name ends in `.pdf`
- Read first 4 bytes via `FileReader`; verify `%PDF` magic bytes — guard against renamed-extension uploads

**Upload flow:**

```typescript
1. User selects file → client-side validation
2. POST FormData to /api/ai/pdf-to-thread/upload (with `attestation: "true"`)
3. Receive { jobId, charCount, pageCount, syncEligible }
4. Show PdfPreviewCard; user adjusts options
5. User clicks "Generate Thread":
   - if syncEligible: POST /generate, await result, render
   - else: POST /enqueue, then poll /[jobId] every 5 s with AbortController (8 s timeout)
6. On done: render ThreadResultPreview
```

**Polling pattern (canonical per CLAUDE.md hard rule #10):**

```typescript
useEffect(() => {
  if (status !== "queued" && status !== "processing") return;
  const abortRef = { current: null as AbortController | null };

  const tick = async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const timeoutId = setTimeout(() => ac.abort(), 8_000);

    try {
      const res = await fetch(`/api/ai/pdf-to-thread/${jobId}`, { signal: ac.signal });
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data.status);
      if (data.status === "ready") setResult(data.threadResult);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        logger.warn("poll_failed", { error: err.message }); // client-side logger
      }
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const interval = setInterval(tick, 5_000);
  tick(); // immediate first call

  return () => {
    clearInterval(interval);
    abortRef.current?.abort();
  };
}, [jobId, status]);
```

### 6.3 Dashboard hub card — `src/app/dashboard/ai/page.tsx`

Add a new entry in the AI tools array (around line 35-81):

```typescript
{
  icon: FileText,                       // lucide
  titleKey: "tools.pdf_to_thread.title",
  descriptionKey: "tools.pdf_to_thread.description",
  href: "/dashboard/ai/pdf-to-thread",
  isPro: true,
  badgeKey: "badges.pro",
  // Optional: showQuotaWeight: 5
}
```

> **Sort order suggestion:** place between URL → Thread and Variants — natural progression of "ingestion-style" features.

### 6.4 Sidebar nav — `src/components/dashboard/sidebar-nav-data.ts`

Add as a child item under the "AI Tools" section, after "URL → Thread":

```typescript
{
  href: "/dashboard/ai/pdf-to-thread",
  labelKey: "sidebar.ai.pdf_to_thread",
  icon: FileText,
  proOnly: true,
}
```

### 6.5 402 plan-limit handling

Reuse the existing modal pattern at `src/app/dashboard/ai/writer/page.tsx:174-193`. Wrap fetch calls in a helper that detects `res.status === 402` and opens the upgrade modal with the parsed payload.

### 6.6 Error UX

| Error code                      | UI behavior                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `ATTESTATION_REQUIRED`          | Inline error on checkbox, scroll to it                                           |
| `PDF_NO_TEXT_LAYER`             | Toast: "This PDF has no extractable text — likely a scan. We don't support OCR." |
| `PDF_PARSE_FAILED`              | Toast: "We couldn't read this PDF — try a different file."                       |
| `PDF_TOO_LARGE` (size or pages) | Toast with the limit value                                                       |
| 402                             | Upgrade modal (existing pattern)                                                 |
| 429                             | Toast: "Rate limit reached — try again in a minute"                              |
| Async failure (status=`failed`) | Show error message + retry button                                                |

### 6.7 Mobile + RTL

- **Drag-drop** falls back to tap-to-upload on mobile (always show the file input button as primary)
- File-size and page count display: use `dir="ltr"` for the number+unit segment even in Arabic (numbers in ar-locale render best LTR)
- Tweet preview cards: use `text-start` / `text-end` (logical) instead of `text-left`/`text-right`
- Test at 320 px width (smallest target)
- Loading spinner uses `animate-spin` with `aria-label` from i18n
- Tab order goes: file → attestation → language → tweet count → tone → submit

---

## 7. Phase 4 — i18n (parallel with frontend)

### 7.1 Add to `src/i18n/messages/en.json` under `ai_hub`:

```json
{
  "tools": {
    "pdf_to_thread": {
      "title": "PDF → Thread",
      "description": "Upload a PDF report and get a ready-to-publish X thread."
    }
  },
  "pdf_to_thread": {
    "title": "PDF → Thread",
    "description": "Turn reports, whitepapers, and decks into engaging X threads.",
    "upload": {
      "drop_or_click": "Drop a PDF here or click to upload",
      "max_size": "Max 50 MB · 200 pages · text-layer PDFs only",
      "uploading": "Uploading…",
      "extracting": "Reading your PDF…"
    },
    "preview": {
      "pages": "{count, plural, one {# page} other {# pages}}",
      "characters": "{count, number} characters extracted",
      "sync_ready": "Ready — generation takes ~10 seconds",
      "async_required": "Long document — generation takes ~1 minute"
    },
    "options": {
      "language": "Output language",
      "tweet_count": "Number of tweets",
      "tone": "Tone"
    },
    "attestation": {
      "label": "I own or have rights to this document",
      "required": "Please confirm rights to proceed"
    },
    "generate": "Generate thread",
    "progress": {
      "queued": "Queued for processing…",
      "processing": "Generating your thread…",
      "ready": "Done!"
    },
    "result": {
      "tweet_count": "{count, plural, one {# tweet} other {# tweets}}",
      "copy_tweet": "Copy tweet",
      "send_to_composer": "Send to Composer",
      "regenerate": "Regenerate"
    },
    "errors": {
      "no_text_layer": "This PDF has no extractable text. Scanned documents and image-only PDFs aren't supported.",
      "parse_failed": "We couldn't read this PDF. Try a different file.",
      "too_many_pages": "This PDF has {pageCount} pages. The maximum is 200.",
      "too_large": "This file is too large. The maximum is 50 MB.",
      "rate_limited": "Too many requests — please wait a moment.",
      "generation_failed": "Generation failed. Your quota was refunded.",
      "upload_failed": "Upload failed. Please try again."
    }
  }
}
```

### 7.2 Add Arabic equivalents to `src/i18n/messages/ar.json`

**Translation principles per `docs/claude/` design rules:**

- Use Modern Standard Arabic (فصحى معاصرة)
- Arabic punctuation marks (، ؛ ؟)
- Western numerals (0–9)
- Have a native Arabic speaker review BEFORE merge — do not ship machine translation only

**Initial draft (review required):**

```json
{
  "tools": {
    "pdf_to_thread": {
      "title": "PDF إلى ثريد",
      "description": "ارفع تقريراً بصيغة PDF واحصل على ثريد جاهز للنشر."
    }
  },
  "pdf_to_thread": {
    "title": "PDF إلى ثريد",
    "description": "حوّل التقارير والأبحاث والعروض إلى ثريدات تفاعلية على X.",
    "upload": {
      "drop_or_click": "اسحب ملف PDF هنا أو انقر للرفع",
      "max_size": "الحد الأقصى 50 ميجابايت · 200 صفحة · ملفات PDF نصية فقط",
      "uploading": "جارٍ الرفع…",
      "extracting": "نقرأ ملفك…"
    },
    ...
  }
}
```

### 7.3 Sidebar i18n

Add `sidebar.ai.pdf_to_thread` to both files.

---

## 8. Phase 5 — Final audit + testing (0.5 day)

### 8.1 Unit tests

| File                                                | Tests                                                             |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| `src/lib/ai/summarize-prompts.test.ts`              | Snapshot test both variants × both languages                      |
| `src/lib/queue/pdf-thread.test.ts`                  | Mock OpenRouter, verify processor state transitions               |
| `src/app/api/ai/pdf-to-thread/upload/route.test.ts` | Magic-byte rejection, page-cap rejection, attestation enforcement |

### 8.2 Integration test

End-to-end with a tiny native-text PDF fixture:

1. Upload → expect `jobId`, `syncEligible: true`
2. Generate → expect `tweets.length === requested`
3. Quota debited by 5 in `aiGenerations`
4. `pdfThreadJobs.status === "ready"`

### 8.3 Required quality gates (per CLAUDE.md Definition of Done)

- [ ] `pnpm run check` passes
- [ ] `pnpm test` passes
- [ ] Manual E2E in browser: golden path + 1 edge case + RTL
- [ ] Convention enforcer + security reviewer (parallel) agents pass
- [ ] No new `any`, no new `console.*`, no `NextResponse.json()`
- [ ] All `db.transaction()` uses commit before any `queue.add()` (CLAUDE.md #13)
- [ ] `import "server-only"` at top of `pdf-parse` consumer (CLAUDE.md #14)
- [ ] Polling `useEffect` uses `AbortController` + 8 s timeout (CLAUDE.md #10)

### 8.4 Security checks (security-reviewer agent)

- Magic-byte validation present
- Filename sanitized via `sanitizeFilename()`
- `wrapUntrusted()` used on PDF text body
- `redactPII()` runs before LLM call
- File ownership re-checked on every status read
- Blob URL is server-trusted (no path traversal in fileUrl)
- Attestation timestamp persisted (audit trail)

---

## 9. Phase 6 — Documentation (parallel with Phase 5)

Update in this order:

| File                                                               | Update                                                                                                                                       |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/0-MY-LATEST-UPDATES.md`                                      | Top entry: "PDF → Thread feature shipped" with date + key files                                                                              |
| `docs/claude/AI_Endpoints_Models_and_Prompts_Full_Audit_Report.md` | Add 2 new endpoints in Section 2.A; add `canUsePdfToThread` to Section 3 gate matrix; add `PDF_TO_THREAD_PROMPT_VERSION` prompt to Section 9 |
| `docs/claude/ai-features.md`                                       | Add feature description                                                                                                                      |
| `docs/claude/architecture.md`                                      | Add the new queue + table to the diagram                                                                                                     |
| `docs/claude/recent-changes.md`                                    | Append migration note (new table + new plan flag)                                                                                            |
| `README.md`                                                        | Add row to Plan Limits table (PDF → Thread availability per tier); update Feature Gates table                                                |
| `CLAUDE.md`                                                        | If a new hard rule emerges (it shouldn't), add it. Otherwise no change.                                                                      |

---

## 10. Rollout plan

1. **Internal dogfood (3 days)** — your account + 2 ops accounts only, behind a feature flag check (e.g., `process.env.PDF_TO_THREAD_ENABLED === "true"` OR a per-user override in `user.featureFlags` JSONB). Feed real reports through it.
2. **Beta (1 week)** — release to all Agency tier users via feature flag. Monitor: error rate, latency P50/P95, quota consumption rate, moderation flag rate.
3. **General release** — flip flag for all Pro+ users. Email announcement to Pro+. Add to changelog. Post in #launches.
4. **Kill switch** — feature flag off, async jobs already in-flight should still complete. UI hides the entry point but `/dashboard/ai/pdf-to-thread` returns 404 when disabled.

---

## 11. Master file checklist

### New files

- [ ] `drizzle/00XX_pdf_thread_jobs.sql` (auto-generated)
- [ ] `src/app/api/ai/pdf-to-thread/upload/route.ts`
- [ ] `src/app/api/ai/pdf-to-thread/generate/route.ts`
- [ ] `src/app/api/ai/pdf-to-thread/enqueue/route.ts`
- [ ] `src/app/api/ai/pdf-to-thread/[jobId]/route.ts`
- [ ] `src/app/dashboard/ai/pdf-to-thread/page.tsx`
- [ ] `src/components/ai/pdf-to-thread/pdf-to-thread-client.tsx`
- [ ] `src/components/ai/pdf-to-thread/pdf-dropzone.tsx`
- [ ] `src/components/ai/pdf-to-thread/pdf-preview-card.tsx`
- [ ] `src/components/ai/pdf-to-thread/attestation-checkbox.tsx`
- [ ] `src/components/ai/pdf-to-thread/generation-options.tsx`
- [ ] `src/components/ai/pdf-to-thread/progress-indicator.tsx`
- [ ] `src/components/ai/pdf-to-thread/thread-result-preview.tsx`
- [ ] `src/lib/ai/summarize-prompts.ts` (extracts existing prompt + adds report variant)
- [ ] `src/lib/schemas/pdf-to-thread.ts`
- [ ] Tests as listed in 8.1

### Modified files

- [ ] `src/lib/schema.ts` — add `pdfThreadJobs` table + types
- [ ] `src/lib/plan-limits.ts` — add `canUsePdfToThread` to interface + all 5 plan blocks
- [ ] `src/lib/middleware/require-plan.ts` — add `checkPdfToThreadAccessDetailed`
- [ ] `src/lib/ai/input-limits.ts` — add `pdfReportBody` and `pdfReportChunk`
- [ ] `src/lib/queue/client.ts` — add `pdfThreadQueue`, payload type, options
- [ ] `src/lib/queue/processors.ts` — add `pdfThreadProcessor`
- [ ] `scripts/worker.ts` — register processor
- [ ] `src/lib/services/ai-quota.ts` — add `"pdf_to_thread"` to type union
- [ ] `src/app/api/ai/summarize/route.ts` — refactor to use new `buildSummarizePrompt({ variant: "article" })`
- [ ] `src/app/dashboard/ai/page.tsx` — add new card
- [ ] `src/components/dashboard/sidebar-nav-data.ts` — add child entry
- [ ] `src/i18n/messages/en.json` — add keys
- [ ] `src/i18n/messages/ar.json` — add keys (Arabic-speaker review required)
- [ ] `package.json` — `pdf-parse` + `@types/pdf-parse`

### Documentation updates

- [ ] `docs/0-MY-LATEST-UPDATES.md`
- [ ] `docs/claude/AI_Endpoints_Models_and_Prompts_Full_Audit_Report.md`
- [ ] `docs/claude/ai-features.md`
- [ ] `docs/claude/architecture.md`
- [ ] `docs/claude/recent-changes.md`
- [ ] `README.md`

---

## 12. Risk register

| Risk                                    | Likelihood | Impact | Mitigation                                                                                        |
| --------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------- |
| Scanned PDFs uploaded → bad UX          | High       | Medium | Empty-text check returns clear error; UI message explains "no OCR"                                |
| Arabic-mixed PDFs render reversed       | Medium     | Medium | `pdf-parse` handles bidi; test fixture with Arabic+English mixed PDF in Phase 5                   |
| Quota gaming via async cancel           | Low        | Low    | Cancel doesn't refund quota (intentional — work was started)                                      |
| Blob storage cost spike                 | Low        | Medium | Daily cron deletes blobs for jobs older than 7 days                                               |
| Worker concurrency overload             | Medium     | High   | BullMQ default concurrency=1 per worker; add per-user concurrency cap (max 1 in-flight async job) |
| Copyright complaint                     | Low        | Medium | Attestation timestamp + audit log; legal page disclaimer; respond-to-takedown process             |
| `pdf-parse` breaks on Next 16 turbopack | Low        | Medium | Verify on Phase 0 day; fallback to `pdfjs-dist` if needed                                         |

---

## 13. Out of scope (explicitly)

- OCR for scanned PDFs
- DOCX, PPTX, EPUB, or other formats
- YouTube, podcast, audio, video ingestion
- Image extraction from PDFs to inline in tweets
- Multi-document (combining 2+ PDFs into one thread)
- Saved templates / "remember my preferences"
- Auto-publish (always returns to Composer for review)

These can become future features but **must not creep into this implementation**.

---

## 14. Considered & rejected: vision/document models for PDF ingestion

**Date considered:** 2026-05-05
**Proposal:** Replace the `pdf-parse` → text extraction → text-LLM summarize pipeline with a single call to a vision-capable OpenRouter model (`deepseek/deepseek-v4-pro` was suggested) that natively ingests PDFs and performs OCR.

**Decision: Rejected for this feature. Re-evaluate if/when we add OCR/scanned-PDF support as a Phase 2 enhancement.**

### Reasoning

1. **Solves a problem we explicitly scoped out.** The whole point of "native text-layer PDFs only" was to ship a focused feature in 1.5 weeks with predictable per-call cost. Bringing in a vision model to handle scanned PDFs is OCR scope creep, which we deferred deliberately.

2. **Cost economics likely break weight 5.** Vision-capable models that ingest PDFs typically render each page as image tokens (~1,500–4,000 tokens/page for vision encoders). A 30-page report = ~45 K–120 K vision tokens vs. ~10 K text tokens after `pdf-parse`. That's 5–10× the LLM cost per call. To preserve unit economics we'd need to raise quota weight to ~20+, which inverts the pricing story we agreed on.

3. **Pdf-parse already gives us clean text for free.** For native text-layer PDFs (the only kind we support), `pdf-parse` extracts in ~1 s with zero LLM cost. Sending those same characters as vision tokens is paying premium pricing for output we already have.

4. **Provider-claim verification was incomplete.** At time of consideration there was no confirmed evidence that `deepseek/deepseek-v4-pro` exists with the claimed capabilities, is exposed via OpenRouter, or has competitive pricing for document input. "Vision input" in marketing copy frequently means images-only, not multi-page document parsing.

5. **The architecture doesn't actually depend on which model is used.** Per CLAUDE.md hard rule #3, the model name lives in `OPENROUTER_MODEL` (env var only), never hardcoded in route handlers. Switching to a better text model post-launch is a one-line env change with zero code impact. The architectural decision is "extract text client-side of LLM, then summarize" — not "use model X."

6. **Provider lock-in risk.** Pinning the architecture to a single provider's vision feature creates a dependency that breaks if pricing changes, the model is deprecated, or OpenRouter routing degrades. Text extraction + text LLM is portable across every model in the catalog.

### Conditions to revisit

Reopen this decision **only** when all of the following are true:

- The "OCR for scanned PDFs" feature is explicitly greenlit as a successor to PDF → Thread (out-of-scope item #1 above)
- A vision-capable OpenRouter model has a published model card listing PDF/document input modality
- That model's published pricing for document tokens, when applied to a 30-page worst-case input, is < 2× our current text-pipeline cost
- Real benchmark data (not vendor claims) shows acceptable Arabic + mixed-script accuracy

When all four hold, file a new feature plan — do not graft vision input onto this one.

### What we WILL keep flexible

- `OPENROUTER_MODEL` is the only knob that matters for model selection. Any improvement in text-summarization quality from any provider (DeepSeek, Anthropic, Google, OpenAI, Mistral) is a configuration change after launch — not a re-architecture. A/B testing models against each other is encouraged once the feature is live.
