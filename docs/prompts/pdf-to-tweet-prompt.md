Two ready-to-paste prompts

Both are self-contained — paste into a fresh session, no setup required.

---

Prompt 1 — START building (use at kickoff)

You are implementing the PDF → Thread feature for AstraPost.

═══════════════════════════════════════════════════════════════
PRE-FLIGHT (do this first, in parallel — do not skip)
═══════════════════════════════════════════════════════════════

Read these files in this order. Run the first three in PARALLEL Read calls:

1. c:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02\CLAUDE.md
2. c:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02\.claude\rules\agent-orchestration.md
3. c:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02\docs\features\2026-05-05-pdf-to-thread.md ← THE PLAN

After reading the plan, also read on demand as needed:

- .claude/rules/ai-integration.md, billing.md, security.md, services.md, api-routes.md
- docs/claude/AI_Endpoints_Models_and_Prompts_Full_Audit_Report.md (for prompt patterns)
- docs/claude/architecture.md, ai-features.md, schema-consistency.md

The plan is THE SOURCE OF TRUTH. Do not improvise architecture — every file path, schema column, env var, plan flag, quota weight, and rollout step is specified. If something seems wrong, surface it before changing it; do not silently deviate.

═══════════════════════════════════════════════════════════════
HARD RULES THAT APPLY TO EVERY EDIT (from CLAUDE.md)
═══════════════════════════════════════════════════════════════

- pnpm (never npm). pnpm run check before any task is "done".
- Use ApiError from @/lib/api/errors — never NextResponse.json() or inline Response/JSON.
- Multi-table writes use db.transaction(); queue.add() AFTER the transaction commits.
- AI routes use aiPreamble({...}) — never manual auth/quota/model wiring.
- Never hardcode model names — env vars only.
- recordAiUsage() on every AI call.
- Plan gates via require-plan.ts helpers; never call getPlanLimits() in routes.
- exactOptionalPropertyTypes spread pattern; no any; no @ts-ignore.
- Polling useEffect = AbortController + 8s timeout + cleanup abort.
- logger._ (never console._); structured fields.
- Any src/lib/ module touching db.ts: import "server-only" as line 1.
- UI must be mobile-first, RTL/LTR safe, WCAG-compliant.

═══════════════════════════════════════════════════════════════
EXECUTION STRATEGY — USE SUB-AGENTS AGGRESSIVELY
═══════════════════════════════════════════════════════════════

The plan has 6 phases. Follow the agent strategy in Section 2 of the plan exactly.
Default heuristic: any phase with 3+ files or independent subtasks → spawn agents.

Per-phase agent dispatch (single-message parallel calls where independent):

PHASE 0 — Foundation (sequential, single agent)
→ db-migrator: schema additions (pdfThreadJobs table, types), plan-limits flag
on all 5 tiers, gate function, input-limits keys, generate + apply migration,
install pdf-parse + @types/pdf-parse.
→ After: confirm pnpm run check passes before moving on.

PHASE 1 — Backend ingestion + sync (parallel)
→ backend-dev: build /upload route, /generate route, ai-quota type union
→ ai-specialist: extract src/lib/ai/summarize-prompts.ts, add report variant,
refactor existing /api/ai/summarize to use the new helper
Both write to disjoint files — true parallel. Single message, two Agent calls.
→ After both complete: convention-enforcer + security-reviewer in parallel,
then test-runner.

PHASE 2 — Backend async (sequential, single agent)
→ backend-dev: queue + payload type, processor, /enqueue route, /[jobId] GET+DELETE,
register processor in scripts/worker.ts.
→ After: convention-enforcer + security-reviewer (parallel) → test-runner.

PHASE 3 — Frontend (parallel)
→ frontend-dev: page + 7 sub-components, polling hook, error UX, mobile + RTL
→ i18n-dev: en.json + ar.json keys (mark Arabic as DRAFT — needs human review)
Both run in parallel. Single message, two Agent calls.
→ After: convention-enforcer (frontend conventions) → test-runner.

PHASE 4 — Wiring + telemetry (parallel)
→ backend-dev: dashboard hub card update, sidebar nav entry, admin metrics
surface for the new type
→ frontend-dev: 402 modal wiring, error toast strings, send-to-composer flow
Single message, two Agent calls.

PHASE 5 — Final audit (parallel, then sequential)
Single message: convention-enforcer + security-reviewer (parallel, read-only).
→ Then test-runner sequentially: pnpm lint + typecheck + test.

PHASE 6 — Documentation (parallel with phase 5)
→ docs-writer: update README.md, AI audit doc, ai-features.md, architecture.md,
recent-changes.md, 0-MY-LATEST-UPDATES.md (top entry).
Run IN PARALLEL with Phase 5 audit (same single message as the parallel agents).

═══════════════════════════════════════════════════════════════
TASK TRACKING & CHECKPOINTS
═══════════════════════════════════════════════════════════════

Use TaskCreate at the start to track all 6 phases. Mark in_progress when starting
each phase, completed when it passes its quality gate. Update phase status
visibly so the user can see progress.

After EACH phase: 1. Run pnpm run check + pnpm test. Failures block the next phase — fix first. 2. State concisely (1–2 sentences) what was done and what's next. 3. If anything diverged from the plan, flag it explicitly.

Definition of Done for the whole feature (per Section 8.3 of the plan):
☐ pnpm run check passes (lint + typecheck)
☐ pnpm test passes (new + existing)
☐ No new any/console.\*/NextResponse.json()/hardcoded models
☐ Manual E2E walkthrough described to the user (golden path + 1 edge case + RTL)
☐ All 16 new files + 14 modified files + 6 doc files in Section 11 checklist exist
☐ Convention-enforcer + security-reviewer agents passed

═══════════════════════════════════════════════════════════════
GUARDRAILS
═══════════════════════════════════════════════════════════════

- Do NOT pnpm dev (CLAUDE.md user rule). Ask before any dev-server step.
- Do NOT commit unless I ask.
- Do NOT change anything outside the plan's file checklist (Section 11). If a file outside that list needs editing, stop and ask.
- Do NOT touch the Section 14 ("Considered & rejected: vision models") decision.
- Arabic translations are DRAFT only — flag clearly that a native speaker must review before launch. Do not mark i18n complete on machine translation alone.
- Treat Section 13 ("Out of scope") as a hard fence. No OCR, no DOCX, no video.

Begin with the pre-flight reads, then use TaskCreate to scaffold phases 0–6, then start Phase 0. Confirm Phase 0 is green before touching Phase 1.

---

---

Prompt 2 — RESUME building (use in any later session)

You are RESUMING the PDF → Thread feature build for AstraPost. State is unknown to you — the previous session ended at some unknown phase. Discover where things stand before doing any work.

═══════════════════════════════════════════════════════════════
STEP 1 — PRE-FLIGHT READS (parallel, single message)
═══════════════════════════════════════════════════════════════

Read in PARALLEL Read calls:

1. c:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02\CLAUDE.md
2. c:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02\.claude\rules\agent-orchestration.md
3. c:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02\docs\features\2026-05-05-pdf-to-thread.md
4. c:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02\docs\0-MY-LATEST-UPDATES.md (top 100 lines)

═══════════════════════════════════════════════════════════════
STEP 2 — STATE DISCOVERY (DELEGATE TO AN AGENT)
═══════════════════════════════════════════════════════════════

Spawn a `researcher` agent (read-only, fast) with this brief:

    "Audit progress on the PDF → Thread feature against the file checklist in Section 11 of docs/features/2026-05-05-pdf-to-thread.md. For each of the 16 new files and 14 modified files, report: EXISTS / PARTIAL / MISSING. For PARTIAL, list what's there vs what's missing per the plan's spec. Also check:
     - Has the migration drizzle/00XX_pdf_thread_jobs.sql been generated?
     - Is pdf-parse in package.json?
     - Does the pdfThreadJobs table exist in src/lib/schema.ts?
     - Does canUsePdfToThread exist in src/lib/plan-limits.ts (all 5 tiers)?
     - Does checkPdfToThreadAccessDetailed exist in require-plan.ts?
     - Are en.json and ar.json keys present?
     - Run: pnpm run check — does it pass on current state?
     Return a phase-by-phase verdict (Phase 0–6: complete / partial / not started) plus the single highest-priority next action. Cite file:line for every claim. Under 800 words, terse."

DO NOT start coding before the audit returns. Use its output to set TaskCreate state and to brief the user on where things stand.

═══════════════════════════════════════════════════════════════
STEP 3 — RESUMPTION PLAN
═══════════════════════════════════════════════════════════════

Based on the audit:

A. If any phase is PARTIAL → finish that phase first before advancing. Treat the half-built work as the source of truth; do not redo what's already there unless it's broken.

B. If pnpm run check fails on current state → diagnose and fix BEFORE writing any new code. Never build on top of a red baseline.

C. State the resumption plan concisely to the user: - Current phase: N (status) - Next action: [one specific thing] - Estimated remaining phases: [list]
Wait for user acknowledgment before executing.

═══════════════════════════════════════════════════════════════
STEP 4 — EXECUTION (SAME RULES AS START PROMPT)
═══════════════════════════════════════════════════════════════

Follow the per-phase agent strategy from Section 2 of the plan:

    Phase 0  → db-migrator (sequential)
    Phase 1  → backend-dev + ai-specialist (PARALLEL — single message, two Agent calls)
    Phase 2  → backend-dev (sequential)
    Phase 3  → frontend-dev + i18n-dev (PARALLEL)
    Phase 4  → backend-dev + frontend-dev (PARALLEL)
    Phase 5  → convention-enforcer + security-reviewer (PARALLEL) → test-runner
    Phase 6  → docs-writer (PARALLEL with Phase 5)

Default heuristic: any task with 3+ files or independent subtasks → spawn agents in parallel via a single message with multiple Agent tool calls. Sequential work only when there are real dependencies (db-migrator before backend-dev that depends on the schema; backend-dev before frontend-dev that consumes its types).

After EACH phase: 1. pnpm run check + pnpm test — must pass before next phase. 2. State concisely what was done + what's next. 3. Update TaskCreate task status visibly. 4. Flag any divergence from the plan explicitly.

═══════════════════════════════════════════════════════════════
HARD RULES (from CLAUDE.md — non-negotiable)
═══════════════════════════════════════════════════════════════

- pnpm (never npm). Never run `pnpm dev` — ask first.
- ApiError from @/lib/api/errors. No NextResponse.json(). No inline Response/JSON.
- Multi-table writes use db.transaction(). queue.add() AFTER commit.
- aiPreamble({...}) for AI routes. Never hardcode model names.
- recordAiUsage() on every AI call.
- Plan gates via require-plan.ts helpers; never call getPlanLimits() in routes.
- exactOptionalPropertyTypes spread; no any; no @ts-ignore.
- Polling useEffect = AbortController + 8s timeout + cleanup abort.
- logger._, never console._.
- Any src/lib/ module touching db.ts: import "server-only" as line 1.
- UI = mobile-first, RTL/LTR safe, WCAG.

═══════════════════════════════════════════════════════════════
GUARDRAILS
═══════════════════════════════════════════════════════════════

- The plan in docs/features/2026-05-05-pdf-to-thread.md is the source of truth. Do not improvise architecture. If something looks wrong, surface it before changing it.
- Do not touch Section 14 (Considered & rejected: vision models). That decision is locked.
- Section 13 (Out of scope) is a hard fence. No OCR, no DOCX, no video, no multi-doc, no auto-publish.
- Arabic translations stay DRAFT until a native speaker reviews. Don't mark i18n complete on machine translation alone.
- Do not commit unless asked.
- Do not edit files outside the plan's Section 11 file checklist without asking first.

═══════════════════════════════════════════════════════════════
START NOW
═══════════════════════════════════════════════════════════════

Begin Step 1 (parallel reads), then Step 2 (researcher agent for audit). Wait for the audit before proposing the resumption plan. Do not write any code before the user acknowledges the resumption plan.

---

Why these prompts work

Both prompts:

- Front-load context reads in parallel (Read calls + Agent calls in single messages)
- Pin every CLAUDE.md hard rule that has caused regressions in this codebase, so the LLM doesn't drift
- Make the plan document the source of truth, so two sessions always converge to the same architecture
- Lock out the rejected directions (vision models, OCR, scope creep) explicitly

The start prompt:

- Uses TaskCreate from the first turn so progress is visible to you
- Maps each phase to a specific agent strategy from the plan's Section 2
- Calls out which phases are parallel vs sequential, with single-message guidance for parallel calls
- Gates each phase on pnpm run check passing — no building on red

The resume prompt:

- Spawns a researcher agent first to discover state — never assumes the previous session left clean state
- Refuses to build on a failing baseline (forces a green check before any new code)
- Treats partial work as source of truth — won't blow away half-built phases
- Asks for acknowledgment before executing — gives you a chance to correct the audit's verdict if it misread state

Both encourage agent usage by being explicit about the parallel dispatch pattern (single message, multiple Agent tool calls) at every phase boundary, not just generically.

Save these somewhere stable — docs/features/2026-05-05-pdf-to-thread-PROMPTS.md would be a natural home.

✻ Cooked for 1m 24s

---

---

● Here is the prompt:

---

You are auditing the AstraPost codebase at C:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02 against the implementation plan at docs/features/2026-05-05-pdf-to-thread.md.
Your job: verify every item in the plan was implemented. For each item below, state whether it is PRESENT, PARTIAL, or MISSING. When partial or missing, cite the exact file and what's wrong. Be surgical — no speculation.

## Phase 0 — Foundation

### Schema (src/lib/schema.ts)

1. Does the `pdfThreadJobs` table exist with ALL of the following columns?
   - id (text, PK, randomUUID default)
   - userId (text, NOT NULL, references user.id ON DELETE CASCADE)
   - correlationId (text, NOT NULL)
   - status (text enum: "uploading" | "extracting" | "queued" | "processing" | "ready" | "failed", default "uploading")
   - fileUrl (text, NOT NULL)
   - fileName (text, NOT NULL)
   - fileSizeBytes (integer, NOT NULL)
   - pageCount (integer, nullable)
   - charCount (integer, nullable)
   - language (text enum: "ar" | "en", NOT NULL)
   - tweetCount (integer, NOT NULL, default 7)
   - tone (text, NOT NULL, default "professional")
   - attestationAt (timestamp, NOT NULL)
   - threadResult (jsonb, nullable, typed as { tweets: Array<{ text: string; charCount: number }>; title: string; sourceLanguage: "ar" | "en" })
   - error (text, nullable)
   - quotaConsumed (integer, default 0)
   - quotaReleased (boolean, default false)
   - createdAt (timestamp, NOT NULL, defaultNow)
   - updatedAt (timestamp, NOT NULL, defaultNow)
   - completedAt (timestamp, nullable)
2. Are the two indexes present? (userIdx on userId+createdAt desc, statusIdx on status)
3. Are `PdfThreadJob` and `NewPdfThreadJob` type exports present?
4. Does the optional `extractedText` column exist per Section 4.3?

### Migration

5. Does `drizzle/` contain a migration SQL file for pdf_thread_jobs?
6. Is the migration recorded in `drizzle/meta/_journal.json`?

### Plan limits (src/lib/plan-limits.ts)

7. Does `PlanLimits` interface include `canUsePdfToThread: boolean`?
8. Is `canUsePdfToThread` set in ALL 5 plan blocks (free, trial, pro_monthly, pro_annual, agency)?
9. Are the values correct? (free=false, trial=false, pro_monthly=true, pro_annual=true, agency=true)

### Plan gate (src/lib/middleware/require-plan.ts)

10. Does `checkPdfToThreadAccessDetailed` exist, using `makeFeatureGate("pdf_to_thread", "canUsePdfToThread", ...)`?

### Input limits (src/lib/ai/input-limits.ts)

11. Does `pdfReportBody: 30_000` exist?
12. Does `pdfReportChunk: 12_000` exist?

### Storage (src/lib/storage.ts)

13. Is `.pdf` in ALLOWED_EXTENSIONS? (should already be there — just verify)

### Quota type (src/lib/services/ai-quota.ts or wherever the type union lives)

14. Is `"pdf_to_thread"` added to the AI generation type union?

### Dependencies (package.json)

15. Is `pdf-parse` in dependencies?
16. Is `@types/pdf-parse` in devDependencies?

## Phase 1 — Backend Ingestion + Sync

### Upload route (src/app/api/ai/pdf-to-thread/upload/route.ts)

17. Does the file exist?
18. Does it call `getTeamContext()` for auth?
19. Does it call `checkPdfToThreadAccessDetailed` for plan gate?
20. Does it call `checkRateLimit("media")` for rate limiting?
21. Does it parse multipart form data (file + language, tweetCount, tone, attestation)?
22. Does it validate PDF magic bytes (%PDF-)?
23. Does it enforce 50 MB size cap?
24. Does it sanitize the filename and upload via `upload()` to folder `pdf-uploads`?
25. Does it run `pdf-parse` to extract text + page count?
26. Does it enforce 200 page cap?
27. Does it reject with `PDF_NO_TEXT_LAYER` if extracted text < 200 chars?
28. Does it reject with `ATTESTATION_REQUIRED` if attestation !== "true"?
29. Does it insert a `pdfThreadJobs` row with status "extracting"?
30. Does it set `attestationAt: new Date()`?
31. Does `pdf-parse` call have a timeout wrapper (15 s)?
32. Does it delete the blob on any error after upload?
33. Does the success response return `{ jobId, charCount, pageCount, syncEligible, fileName }`?
34. Does the response include `x-correlation-id` header?

### Generate route (src/app/api/ai/pdf-to-thread/generate/route.ts)

35. Does the file exist?
36. Does it load the job by `jobId` and verify ownership?
37. Does it reject unless `status === "extracting"`?
38. Does it return 409 with `code: "USE_ASYNC_PATH"` if `charCount > 30_000`?
39. Does it use `aiPreamble({ featureGate: checkPdfToThreadAccessDetailed, quotaWeight: 5 })`?
40. Does it use `redactPII()` before the LLM call?
41. Does it use `wrapUntrusted("REPORT TEXT", cleanBody, INPUT_LIMITS.pdfReportBody)`?
42. Does it call `buildSummarizePrompt({ variant: "report", ... })` (the new report variant)?
43. Does it use `generateObject` with tweets/title/sourceLanguage schema?
44. Does it call `recordAiUsage({ type: "pdf_to_thread", ... })`?
45. Does it call `checkModeration()` on the result?
46. On success: does it update the job to `status: "ready"`, `threadResult`, `completedAt`?
47. On failure: does it update the job to `status: "failed"`, `error`, and call `releaseQuota()`?
48. Does the response return `{ jobId, tweets, title, redactions, sourceLanguage }`?

### Prompt extraction (src/lib/ai/summarize-prompts.ts)

49. Does this file exist with `import "server-only"` as its first line?
50. Does it export `SUMMARIZE_PROMPT_VERSION = "summarize:v2"` and `PDF_TO_THREAD_PROMPT_VERSION = "pdf_to_thread:v1"`?
51. Does it export `buildSummarizePrompt()` accepting `variant: "article" | "report"`?
52. Does the report variant include ALL report-specific rules (lead with insight, specific numbers, one insight per tweet, no corporate jargon, concrete takeaway final tweet)?
53. Was the existing `/api/ai/summarize/route.ts` refactored to use `buildSummarizePrompt({ variant: "article", ... })` instead of inline prompt?

### Validation schema (src/lib/schemas/pdf-to-thread.ts)

54. Does this file exist with `pdfToThreadGenerateSchema`?
55. Does it include `jobId: z.string().uuid()`, `language: z.enum(LANGUAGE_VALUES)`, `tweetCount: z.number().int().min(3).max(15).default(7)`, `tone:
z.string().min(1).max(40).default("professional")`?

## Phase 2 — Async Path (BullMQ)

### Queue client (src/lib/queue/client.ts)

56. Does `PdfThreadJobPayload` interface exist with `jobId`, `userId`, `correlationId`?
57. Does `pdfThreadQueue` exist (Queue with name "pdfThreadQueue")?
58. Does `PDF_THREAD_JOB_OPTIONS` exist with `attempts: 2`, exponential backoff 5s, and removeOnComplete/removeOnFail settings?

### Processor (src/lib/queue/processors.ts)

59. Does `pdfThreadProcessor` exist and is it exported?
60. Does it load the job row and skip if `status !== "queued"`?
61. Does it set status to "processing"?
62. Does it implement chunked summarize (split text by `pdfReportChunk`, summarize each chunk, combine)?
63. Does it call `checkModeration()` on the final result?
64. Does it call `recordAiUsage()` on success?
65. Does it update the job to `status: "ready"` with `threadResult` and `completedAt` on success?
66. Does it update the job to `status: "failed"` with `error` message on failure?
67. Does it call `releaseAiQuota(userId, 5)` on failure?
68. Does it re-throw the error so BullMQ can retry?

### Worker registration (scripts/worker.ts)

69. Is `pdfThreadProcessor` registered as a worker (or in the worker's processor list)?
70. Does it use `PDF_THREAD_JOB_OPTIONS`?

### Enqueue route (src/app/api/ai/pdf-to-thread/enqueue/route.ts)

71. Does the file exist?
72. Does it call `aiPreamble({ featureGate: checkPdfToThreadAccessDetailed, quotaWeight: 5 })` to consume quota BEFORE enqueue?
73. Does it load the job by `jobId`, verify ownership, and require `status === "extracting"`?
74. Does it update the job to `status: "queued"` and `quotaConsumed: 5`?
75. Does it enqueue `pdfThreadQueue.add(...)` AFTER the DB transaction commits? (CRITICAL: CLAUDE.md hard rule #13)
76. Does the response return `{ jobId, status: "queued" }`?

### Job status endpoint (src/app/api/ai/pdf-to-thread/[jobId]/route.ts)

77. Does the GET handler exist and return `{ status, charCount, pageCount, threadResult, error, createdAt, completedAt }`?
78. Does it verify ownership?
79. Does the DELETE handler exist and set `status: "failed"` with `error: "user_cancelled"`?
80. Does DELETE attempt `job.remove()` for any in-flight BullMQ job?

### SSE/stream endpoint

81. Per Section 5.4 Option B (the recommended approach): was Option B chosen (plain JSON polling, no SSE)? If Option A was used instead, is there an SSE endpoint at `src/app/api/ai/pdf-to-thread/[jobId]/stream/route.ts`?

## Phase 3 — Frontend

### Page (src/app/dashboard/ai/pdf-to-thread/page.tsx)

82. Does the server component exist?
83. Does it use `DashboardPageWrapper` with `FileText` icon?
84. Does it render `<PdfToThreadClient />`?

### Client component (src/components/ai/pdf-to-thread/pdf-to-thread-client.tsx)

85. Does the file exist?
86. Does it implement the full state machine: idle → uploading → extracted → (sync) generating → done OR (async) queued → processing → done, plus error state?
87. Does it implement client-side validation BEFORE upload (file.size <= 50MB, file.type === application/pdf + name ends in .pdf, magic bytes via FileReader)?
88. Does it POST FormData to `/api/ai/pdf-to-thread/upload` with `attestation: "true"`?
89. Does it branch on `syncEligible` (POST `/generate` vs POST `/enqueue`)?
90. For async: does poll use `AbortController` + 8 s timeout (CLAUDE.md hard rule #10)? Every 5 s interval?
91. Does it render `ThreadResultPreview` on done?

### Sub-components — verify EACH exists:

92. `src/components/ai/pdf-to-thread/pdf-dropzone.tsx` — drag-drop + click-to-upload + upload progress
93. `src/components/ai/pdf-to-thread/pdf-preview-card.tsx` — file name, size, page count, char count, sync/async indicator
94. `src/components/ai/pdf-to-thread/attestation-checkbox.tsx` — required checkbox with rights text
95. `src/components/ai/pdf-to-thread/generation-options.tsx` — language toggle, tweet count slider (3–15), tone select
96. `src/components/ai/pdf-to-thread/progress-indicator.tsx` — for async path, polled status with phase labels
97. `src/components/ai/pdf-to-thread/thread-result-preview.tsx` — tweet cards, copy-each, "Send to Composer" CTA

### Dashboard hub card (src/app/dashboard/ai/page.tsx)

98. Is a "PDF → Thread" card present in the AI tools array?
99. Does it use `FileText` icon, proper href `/dashboard/ai/pdf-to-thread`, `isPro: true`?

### Sidebar nav (src/components/dashboard/sidebar-nav-data.ts)

100. Is there a child entry under "AI Tools" section for `/dashboard/ai/pdf-to-thread`?
101. Does it use `FileText` icon and `proOnly: true`?

### Error UX (src/components/ai/pdf-to-thread/ or the client component)

102. Is each error code mapped to the correct UI behavior?
     - ATTESTATION_REQUIRED → inline error on checkbox
     - PDF_NO_TEXT_LAYER → toast with clear message
     - PDF_PARSE_FAILED → toast
     - PDF_TOO_LARGE (size or pages) → toast with limit value
     - 402 → upgrade modal (existing pattern from writer)
     - 429 → toast about rate limiting
     - async failure (status=failed) → error message + retry button

### Mobile + RTL

103. Is the dropzone replaced by tap-to-upload on mobile (file input button as primary)?
104. Do number+unit segments use `dir="ltr"` in Arabic layout?
105. Do tweet cards use logical text alignment (text-start/text-end) instead of left/right?
106. Is loading spinner present with `aria-label` from i18n?

## Phase 4 — i18n

### English (src/i18n/messages/en.json)

107. Under `ai_hub.tools`, does `pdf_to_thread` exist with `title` and `description`?
108. Under `ai_hub.pdf_to_thread`, do ALL of the following key groups exist?
     - `title`, `description`
     - `upload.drop_or_click`, `upload.max_size`, `upload.uploading`, `upload.extracting`
     - `preview.pages`, `preview.characters`, `preview.sync_ready`, `preview.async_required`
     - `options.language`, `options.tweet_count`, `options.tone`
     - `attestation.label`, `attestation.required`
     - `generate`
     - `progress.queued`, `progress.processing`, `progress.ready`
     - `result.tweet_count`, `result.copy_tweet`, `result.send_to_composer`, `result.regenerate`
     - `errors.no_text_layer`, `errors.parse_failed`, `errors.too_many_pages`, `errors.too_large`, `errors.rate_limited`, `errors.generation_failed`, `errors.upload_failed`

109. Does `sidebar.ai.pdf_to_thread` exist?

### Arabic (src/i18n/messages/ar.json)

110. Do all the same keys from 107–109 exist in ar.json?

## Phase 5 — Tests

### Unit tests

111. `src/lib/ai/summarize-prompts.test.ts` — snapshot tests for both variants × both languages?
112. `src/lib/queue/pdf-thread.test.ts` — mocked OpenRouter, processor state transitions?
113. `src/app/api/ai/pdf-to-thread/upload/route.test.ts` — magic-byte rejection, page-cap rejection, attestation enforcement?

### Quality gates

114. Does `pnpm run check` pass? (Run it)
115. Does `pnpm test` pass? (Run it)
116. Are there any new `any` types?
117. Are there any `console.log` or `console.error` calls in the new files?
118. Are there any `NextResponse.json()` calls in the new route files?
119. Do all DB transactions commit before any `queue.add()` calls?
120. Does every `src/lib/` file that imports from `db.ts` have `import "server-only"` as its first line?
121. Does the polling `useEffect` use `AbortController` + 8 s timeout?

## Phase 6 — Documentation

### Verify each doc file is updated:

122. `docs/0-MY-LATEST-UPDATES.md` — has a "PDF → Thread" entry?
123. `docs/claude/AI_Endpoints_Models_and_Prompts_Full_Audit_Report.md` — lists the 2 new endpoints, the new gate, the new prompt version?
124. `docs/claude/ai-features.md` — describes PDF → Thread?
125. `docs/claude/architecture.md` — mentions the new queue + table?
126. `docs/claude/recent-changes.md` — notes the migration and new plan flag?
127. `README.md` — updated plan limits table and feature gates table?

---

## Output format

For each numbered item (1–127), output exactly:

[PRESENT/PARTIAL/MISSING] <item #>: <one-line summary of what was found, or what's missing>

Then at the end, a summary with three lists:

- **PRESENT** (count)
- **PARTIAL** (count) — with brief note on what's incomplete
- **MISSING** (count) — with file path or note on what needs to be created/added

Do not repeat the plan content. Do not suggest fixes — just report gaps.

This prompt is exhaustive (127 checkpoints) and maps 1:1 to every deliverable in the plan. Each checkpoint asks a specific, falsifiable question about the code, so the LLM can't hand-wave.
