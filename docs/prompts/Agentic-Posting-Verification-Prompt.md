# Prompt: Verify Agentic Posting Implementation — Step-by-Step Audit

> **Objective:** Systematically verify that the Agentic Posting feature has been implemented correctly and completely against the original specification. Walk through every file, every route, every component, and every architectural rule — reading the actual code, checking for compliance, and reporting findings. Do NOT modify any code. This is a read-only audit.

---

## Instructions

You are auditing the **Agentic Posting** feature implementation in **AstraPost**. The original specification is in `docs/features/Agentic-Posting-Feature-Prompt.md` (or provided as context). Your job is to:

1. Read the actual source files that were created or modified
2. Verify each requirement against what was actually implemented
3. Report a **pass/fail** status for each check with a brief explanation
4. At the end, produce a summary with a final compliance score and a prioritized list of any issues found

**Rules for this audit:**

- **Read every file before judging it** — use the `view` tool to read actual source code, do not guess or assume
- **Do NOT modify any files** — this is a read-only verification pass
- **Do NOT run `pnpm dev`** — you may run `pnpm lint`, `pnpm typecheck`, and `pnpm test` to verify build health
- **Be precise** — if a check fails, cite the exact line or pattern that's wrong and what it should be
- **Be fair** — minor naming differences or reasonable implementation alternatives are acceptable; flag only genuine spec violations, missing functionality, or architectural rule breaks

---

## Audit Procedure — Execute Each Section in Order

### Section 0: Build Health Check

Before inspecting any code, confirm the project compiles and tests pass.

**Run these commands and report the output:**

```bash
pnpm lint
pnpm typecheck
pnpm test
```

**Checks:**

- [ ] `pnpm lint` exits with 0 errors (warnings are acceptable)
- [ ] `pnpm typecheck` exits with 0 errors
- [ ] `pnpm test` exits with all tests passing (0 failures)

If any of these fail, report the errors verbatim and continue the audit — do not stop. Compilation errors in the agentic feature files are critical findings.

---

### Section 1: Database Schema

**Read:** `src/lib/schema.ts`

Search for the `agentic_posts` (or equivalent) table definition.

**Checks:**

- [ ] **Table exists** — an `agenticPosts` table (or equivalent name) is defined in the schema file
- [ ] **Required columns present:** `id` (varchar PK), `userId` (FK to user), `xAccountId` (FK to x_accounts), `topic` (text), `researchBrief` (jsonb), `contentPlan` (jsonb), `tweets` (jsonb), `qualityScore` (integer), `summary` (text), `status` (varchar with default `"generating"`), `postId` (FK to posts, nullable), `correlationId` (varchar), `createdAt` (timestamp), `updatedAt` (timestamp)
- [ ] **Foreign keys** — `userId` references `user.id` with `onDelete: "cascade"`, `xAccountId` references `xAccounts.id` with `onDelete: "cascade"`, `postId` references `posts.id`
- [ ] **Status values** — verify the code or comments indicate the valid statuses: `generating`, `ready`, `approved`, `posted`, `scheduled`, `failed`, `discarded`
- [ ] **Migration exists** — check the `drizzle/` directory for a migration file that adds this table. Verify it's the latest or near-latest migration.

---

### Section 2: Type Definitions

**Read:** `src/lib/ai/agentic-types.ts` (or wherever the types were placed)

**Checks:**

- [ ] **File exists** at the expected path
- [ ] **`ResearchBrief` type** — has fields: `topic`, `angles` (array with `title`, `description`, `viralPotential`), `trendingHashtags`, `keyFacts`, `recommendedAngle`
- [ ] **`ContentPlan` type** — has fields: `format` (`"single"` | `"thread"`), `lengthOption`, `tweetCount`, `tone`, `structure`, `imageSlots` (number array), `rationale`
- [ ] **`AgenticTweet` type** — has fields: `position`, `text`, `hashtags`, `hasImage`, `imagePrompt` (optional), `imageUrl` (optional), `charCount`
- [ ] **`AgenticPost` type** — has fields: `id`, `topic`, `research`, `plan`, `tweets`, `qualityScore`, `summary`, `createdAt`, `xAccountId`, `xSubscriptionTier`
- [ ] **Zod schemas** — corresponding Zod schemas exist for validation (not just TypeScript interfaces). Check that they're exported.

---

### Section 3: AI Prompt Templates

**Read:** `src/lib/ai/agentic-prompts.ts` (or wherever prompts were placed)

**Checks:**

- [ ] **File exists** at the expected path
- [ ] **Research prompt function** — `buildResearchPrompt()` (or equivalent) exists, accepts `topic` and `language`, returns a string. Verify the prompt asks for structured JSON output and includes the `ResearchBrief` field names.
- [ ] **Strategy prompt function** — `buildStrategyPrompt()` (or equivalent) exists, accepts the research brief, X subscription tier, language, and optional preferences. Verify the prompt passes the tier information so the AI knows available formats/lengths.
- [ ] **Writing prompt function** — `buildWritingPrompt()` (or equivalent) exists, accepts research brief, content plan, voice profile, and language. Verify it includes the voice profile when present.
- [ ] **Review prompt function** — `buildReviewPrompt()` (or equivalent) exists. Verify it asks for a quality score and issue detection.
- [ ] **JSON output instructions** — every prompt includes an explicit instruction to return valid JSON (e.g., `"Return ONLY valid JSON"` or equivalent). This is critical — without it, the AI will return markdown-wrapped JSON that breaks parsing.
- [ ] **Language support** — prompts instruct the AI to write content in the user's specified language (critical for Arabic/MENA users)
- [ ] **Character limit awareness** — the writing prompt enforces the correct character limits based on the content plan (≤280 per tweet in threads, correct limit for single posts based on tier)

---

### Section 4: Pipeline Service

**Read:** `src/lib/services/agentic-pipeline.ts` (or wherever the service was placed)

**Checks:**

- [ ] **File exists** at the expected path
- [ ] **Main function signature** — exports a `runAgenticPipeline()` (or equivalent) function that accepts: topic, xAccountId, xSubscriptionTier, voiceProfile, language, userId, and an `onProgress` callback
- [ ] **5-step sequential execution** — verify the function calls the 5 pipeline steps in order: Research → Strategy → Write → Images → Review
- [ ] **OpenRouter usage** — AI calls import from `@openrouter/ai-sdk-provider` (never `openai` directly). Check the import statements.
- [ ] **Image generation uses existing service** — Step 4 calls the existing `generateImage()` or `generateAgenticImage()` from `src/lib/services/ai-image.ts` — it does NOT implement its own Replicate client
- [ ] **Parallel image generation** — images are generated using `Promise.allSettled` or `Promise.all` (not sequentially one at a time)
- [ ] **Progress callbacks** — each step calls `onProgress()` with the step name and status (at minimum: `in_progress` and `complete`)
- [ ] **Error handling** — if a step fails, the function catches the error and stores partial state rather than throwing unhandled. Check for try/catch around each step or around the full pipeline.
- [ ] **Correlation ID** — a `correlationId` is generated (via `nanoid` or equivalent) and passed through the pipeline. Check for import from `@/lib/correlation` or `nanoid`.
- [ ] **Structured logging** — the service uses the logger from `@/lib/logger` (not `console.log`) for step progress and errors
- [ ] **AI quota tracking** — the service counts the generation toward the user's AI quota via `ai-quota.ts`
- [ ] **Voice profile injection** — if `voiceProfile` is non-null, it's included in the Step 3 (Write) prompt

---

### Section 5: API Routes

#### 5A: Orchestration Route

**Read:** `src/app/api/ai/agentic/route.ts`

**Checks:**

- [ ] **File exists** at the expected path
- [ ] **POST handler exported** — the file exports a `POST` function
- [ ] **Authentication** — session is checked via `auth.api.getSession()` or `aiPreamble()`. Returns `ApiError.unauthorized()` if no session.
- [ ] **Plan gating** — the route calls `checkAgenticPosting()` (or equivalent gate from `require-plan.ts`). Pro/Agency only — Free users should get a 402 response.
- [ ] **Input validation** — request body is validated with Zod (topic, xAccountId, language, optional preferences)
- [ ] **Account ownership check** — the route verifies the `xAccountId` belongs to the authenticated user. If not, returns `ApiError.forbidden()` or `ApiError.notFound()`.
- [ ] **X tier lookup** — the route reads the `xSubscriptionTier` from the X account and passes it to the pipeline
- [ ] **Tier staleness check** — if `x_subscription_tier_updated_at` is older than 24 hours, the route re-fetches the tier before proceeding
- [ ] **SSE streaming** — the response uses SSE to stream progress events. Check for `new Response(stream, { headers: { "Content-Type": "text/event-stream", ... } })` or equivalent Vercel AI SDK streaming pattern.
- [ ] **Database row creation** — an `agentic_posts` row is created with status `"generating"` before the pipeline starts, and updated to `"ready"` (or `"failed"`) after
- [ ] **Error responses use `ApiError`** — no `new Response(JSON.stringify(...))` or `NextResponse.json()` for error cases

#### 5B: Approve Route

**Read:** `src/app/api/ai/agentic/[id]/approve/route.ts`

**Checks:**

- [ ] **File exists** at the expected path (dynamic `[id]` segment)
- [ ] **POST handler exported**
- [ ] **Authentication + ownership** — session check + verify the agentic post belongs to the user
- [ ] **Status guard** — returns an error if the agentic post status is not `"ready"`
- [ ] **Input validation** — validates `action` (`"post_now"`, `"schedule"`, `"save_draft"`), optional `scheduledAt`, and optional edited `tweets` array
- [ ] **`db.transaction()` usage** — the route creates `posts`, `tweets`, and `media` rows inside a single transaction. **This is a critical architectural rule.** Search for `db.transaction(` in the file.
- [ ] **BullMQ job enqueue** — if `action === "post_now"`, a BullMQ `publish-post` job is enqueued. Check for the queue client import and `.add()` call.
- [ ] **Draft support** — if `action === "save_draft"`, the post is created with `status: "draft"` (not published)
- [ ] **Schedule support** — if `action === "schedule"`, the post is created with `scheduledAt` set
- [ ] **Agentic post status update** — after creating the post, the `agentic_posts` row is updated with the `postId` and appropriate status
- [ ] **Error responses use `ApiError`**

#### 5C: Regenerate Route

**Read:** `src/app/api/ai/agentic/[id]/regenerate/route.ts`

**Checks:**

- [ ] **File exists** at the expected path
- [ ] **POST handler exported**
- [ ] **Authentication + ownership**
- [ ] **Input validation** — validates `tweetIndex` (number) and optional `regenerateImage` (boolean)
- [ ] **Uses stored context** — the regeneration call uses the stored `researchBrief` and `contentPlan` from the agentic post row (not re-running the full pipeline)
- [ ] **Updates the specific tweet** — only the tweet at the specified index is replaced in the `tweets` JSON array, not the entire thread
- [ ] **Error responses use `ApiError`**

---

### Section 6: Plan Gating

**Read:** `src/lib/middleware/require-plan.ts`

**Checks:**

- [ ] **New gate function exists** — search for `checkAgenticPosting` or a `makeFeatureGate()` call that gates agentic posting
- [ ] **Gated to Pro/Agency** — the gate allows Pro and Agency plans but blocks Free. Check the plan comparison logic.
- [ ] **14-day trial handled** — verify the gate function goes through `makeFeatureGate()` which handles trial-period logic automatically (per existing patterns in the file)
- [ ] **Returns HTTP 402** — the gate should return a 402 response with structured JSON including `upgrade_url` and `suggested_plan` (standard pattern in the file)

---

### Section 7: Sidebar Navigation

**Read:** `src/components/dashboard/sidebar.tsx`

**Checks:**

- [ ] **Entry exists** — search for `"Agentic"` or `"agentic"` in the sidebar sections array
- [ ] **Under AI Tools section** — the entry is in the AI Tools group, not as a top-level item or under a different section
- [ ] **Route correct** — the `href` or `path` points to `/dashboard/ai/agentic`
- [ ] **Icon present** — an icon is assigned (Wand2, Sparkles, or another lucide-react icon)
- [ ] **"New" badge** — a `"New"` badge or label is present on the sidebar entry (or a reasonable alternative for feature launch visibility)

---

### Section 8: Page Component

**Read:** `src/app/dashboard/ai/agentic/page.tsx`

**Checks:**

- [ ] **File exists** at the expected path
- [ ] **Server Component** — the file does NOT start with `"use client"`. It should be a Server Component that fetches data and passes it to a client component.
- [ ] **`DashboardPageWrapper` used** — the page wraps content in `<DashboardPageWrapper>` with `icon`, `title`, and `description` props. Verify it's imported from `@/components/dashboard/dashboard-page-wrapper`.
- [ ] **Session check** — the page checks for authentication and redirects unauthenticated users
- [ ] **X accounts fetched** — the page fetches the user's connected X accounts (with subscription tier data) and passes them to the client component
- [ ] **Client component rendered** — a client component (e.g., `<AgenticPostingClient>`) is rendered with the necessary props

---

### Section 9: Client Component — Three-Screen State Machine

**Read:** `src/components/ai/agentic-posting-client.tsx` (or wherever the client component was placed)

This is the largest verification section. Read the full file before checking.

**Checks — General Architecture:**

- [ ] **`"use client"` directive** — file starts with `"use client"`
- [ ] **State machine** — the component manages a screen state with at least three values: `"input"`, `"processing"`, `"review"` (exact names may differ). Check for a `useState` or Zustand store.
- [ ] **No separate routes** — the three screens are rendered conditionally within this single component (not via React Router or Next.js routing)

**Checks — Screen 1 (Input):**

- [ ] **Topic input field** — a text input exists with placeholder text suggesting example topics
- [ ] **Generate button** — a primary CTA button that triggers the pipeline. Check that it's disabled when input is empty or too short.
- [ ] **Suggestion chips** — tappable topic suggestion chips are rendered below the input (dynamic from user history or static fallbacks)
- [ ] **Account selector** — the selected X account is displayed with the `XSubscriptionBadge`. If multiple accounts exist, the user can switch.
- [ ] **Advanced options** — a collapsible section with optional controls: tone, language, include images toggle, audience hint. Collapsed by default.
- [ ] **Submit triggers SSE** — submitting the form calls `POST /api/ai/agentic` and establishes an SSE connection for streaming progress

**Checks — Screen 2 (Processing):**

- [ ] **Timeline/progress display** — each pipeline step is visualized with a status indicator (complete ✅, in progress ⏳, pending ○, or equivalent visual pattern)
- [ ] **Step summaries** — completed steps show a brief summary of their output (e.g., the recommended angle from research, the format decision from strategy)
- [ ] **SSE event handling** — the component processes SSE events and updates the timeline in real-time. Check for `EventSource` or `fetch` with ReadableStream processing.
- [ ] **Cancel support** — a cancel option exists that aborts the SSE connection
- [ ] **Error display** — if a step fails, the error is shown inline on the failed step (not just a generic error screen)

**Checks — Screen 3 (Review):**

- [ ] **Tweet cards rendered** — each tweet in the thread is displayed as a card with: text content, character count, position indicator, and image (if present)
- [ ] **Inline editing** — tweet cards support inline text editing (clicking Edit switches to an editable textarea). Check for a local editing state.
- [ ] **Per-tweet regeneration** — a "Rewrite" or "Regenerate" button exists per tweet that calls `POST /api/ai/agentic/{id}/regenerate`
- [ ] **Image preview** — AI-generated images are displayed inline within tweet cards
- [ ] **Image regeneration** — a "New Image" or equivalent button exists per tweet
- [ ] **Remove tweet** — a remove/delete button exists per tweet with undo support (toast or inline undo)
- [ ] **Add tweet** — an "Add Tweet" button appends a new empty tweet to the thread
- [ ] **Drag-and-drop reorder** — tweets can be reordered via drag-and-drop. Check for `@dnd-kit/core` imports or equivalent.
- [ ] **Post Now button** — a primary action button that calls the approve endpoint with `action: "post_now"`
- [ ] **Schedule button** — a secondary action button that reveals a date/time picker. Check for `DatePicker` or `react-day-picker` usage.
- [ ] **Save Draft** — a tertiary action (text link or ghost button) that calls the approve endpoint with `action: "save_draft"`
- [ ] **Discard** — a discard option with confirmation
- [ ] **Research insights panel** — a collapsible section showing the research brief data (angles, hashtags, facts)
- [ ] **Success state** — after approval, a success message with quick links ("Create Another", "View in Queue", etc.)

---

### Section 10: X Subscription Tier Integration

**Checks — verify across multiple files:**

- [ ] **Tier passed to pipeline** — in the orchestration route (`route.ts`), verify the `xSubscriptionTier` is read from the X account and passed to `runAgenticPipeline()`
- [ ] **Strategy prompt uses tier** — in `agentic-prompts.ts`, verify `buildStrategyPrompt()` includes the tier in the system prompt, informing the AI about available formats
- [ ] **Free tier format constraints** — in the strategy prompt, verify that Free users are limited to Short (≤280) single tweets or threads (≤280 per tweet). The prompt should NOT offer Medium or Long options for Free users.
- [ ] **Premium tier flexibility** — in the strategy prompt, verify that Premium users have access to all formats including Medium (281–1,000) and Long (1,001–2,000) single posts
- [ ] **Thread tweets always ≤280** — regardless of tier, verify the writing prompt enforces ≤280 characters per tweet in thread mode

---

### Section 11: Infrastructure Reuse Verification

This section verifies the "do not rebuild" rule — Agentic Posting should reuse existing services, not duplicate them.

**Checks:**

- [ ] **No duplicate Replicate client** — image generation calls the existing `src/lib/services/ai-image.ts` service, not a new Replicate implementation. Search for `replicate` imports in the agentic pipeline file — they should import from `ai-image.ts`, not from `replicate` directly.
- [ ] **No duplicate publishing logic** — the approve route creates rows in the existing `posts` and `tweets` tables and enqueues a standard `publish-post` BullMQ job. It does NOT make direct X API calls to publish.
- [ ] **No duplicate storage logic** — generated images are stored using the existing `upload()` from `@/lib/storage`, not a new storage implementation.
- [ ] **OpenRouter used** — search all new files for `openai` imports. None should exist. All AI calls must use `@openrouter/ai-sdk-provider`.
- [ ] **`ApiError` used exclusively** — search all new route files for `new Response(JSON.stringify` or `NextResponse.json(` used for error responses. None should exist — all errors must use `ApiError`.

---

### Section 12: Architectural Rule Compliance

Scan all new and modified files for violations of the project's mandatory rules.

**Checks:**

- [ ] **No `getPlanLimits()` in route handlers** — search all new route files (`src/app/api/ai/agentic/`) for `getPlanLimits` or `normalizePlan`. Neither should appear.
- [ ] **`exactOptionalPropertyTypes` compliance** — search for patterns like `prop={maybeUndefined}` in TSX files. The correct pattern is `{...(val !== undefined && { prop: val })}`. Check the client component and page component.
- [ ] **Multi-table writes in transactions** — the approve route writes to multiple tables. Verify `db.transaction()` wraps all writes.
- [ ] **Structured logger, not console.log** — search all new files in `src/lib/` and `src/app/api/` for `console.log`. None should exist. Logging should use `@/lib/logger`.
- [ ] **Correlation ID attached** — the orchestration route generates or receives a `correlationId` and passes it through the pipeline. If a BullMQ job is enqueued in the approve route, the `correlationId` should be included in the job data.

---

### Section 13: Tests

**Read:** Test files for the agentic feature (check these locations):

- `src/lib/services/agentic-pipeline.test.ts`
- `src/app/api/ai/agentic/[id]/approve/route.test.ts`
- `src/lib/ai/agentic-types.test.ts`

**Checks:**

- [ ] **Pipeline service tests exist** — at least one test file covers the pipeline service
- [ ] **Happy path test** — a test mocks all 5 steps and verifies a complete `AgenticPost` is returned
- [ ] **Image failure test** — a test verifies the pipeline completes even when image generation fails for some tweets
- [ ] **Approve route tests exist** — tests cover `post_now`, `schedule`, and `save_draft` actions
- [ ] **Ownership test** — a test verifies that accessing another user's agentic post returns 403
- [ ] **Type validation tests exist** — Zod schemas are tested with valid and invalid payloads
- [ ] **All tests pass** — run `pnpm test` and confirm 0 failures in agentic-related test files

---

### Section 14: Responsive Design & Accessibility

**Read:** The client component and any sub-components.

**Checks:**

- [ ] **Mobile layout** — search for responsive Tailwind classes (`sm:`, `md:`, `lg:`, `xl:`) that adapt the layout for different screen sizes. The three-screen flow should work on mobile.
- [ ] **Touch targets** — interactive elements (buttons, chips, action icons) have adequate size for touch (min 44×44px equivalent via padding)
- [ ] **Dark mode** — verify shadcn/ui color tokens are used (`bg-background`, `text-foreground`, `bg-muted`, etc.) instead of hardcoded colors. Search for hardcoded color values like `bg-white`, `text-black`, `#ffffff` — these break dark mode.
- [ ] **Aria attributes** — search for `aria-label`, `aria-live`, `role` attributes on key interactive elements. At minimum: the Generate button, the timeline (processing screen), and tweet cards (review screen).
- [ ] **Keyboard navigation** — check that the topic input submits on Enter, and that the action bar buttons are focusable

---

## Final Report Format

After completing all sections, produce a summary report in this exact format:

```
# Agentic Posting — Implementation Audit Report

## Build Health
- Lint: PASS / FAIL (N errors)
- Typecheck: PASS / FAIL (N errors)
- Tests: PASS / FAIL (N passed, N failed)

## Section Results

| # | Section | Checks | Passed | Failed | Skipped |
|---|---------|--------|--------|--------|---------|
| 0 | Build Health | 3 | ? | ? | 0 |
| 1 | Database Schema | 5 | ? | ? | 0 |
| 2 | Type Definitions | 6 | ? | ? | 0 |
| 3 | AI Prompt Templates | 8 | ? | ? | 0 |
| 4 | Pipeline Service | 12 | ? | ? | 0 |
| 5 | API Routes | 24 | ? | ? | 0 |
| 6 | Plan Gating | 4 | ? | ? | 0 |
| 7 | Sidebar Navigation | 5 | ? | ? | 0 |
| 8 | Page Component | 6 | ? | ? | 0 |
| 9 | Client Component (3 Screens) | 26 | ? | ? | 0 |
| 10 | X Tier Integration | 5 | ? | ? | 0 |
| 11 | Infrastructure Reuse | 5 | ? | ? | 0 |
| 12 | Architectural Rules | 5 | ? | ? | 0 |
| 13 | Tests | 7 | ? | ? | 0 |
| 14 | Responsive & Accessibility | 5 | ? | ? | 0 |
|   | **TOTAL** | **119** | **?** | **?** | **?** |

## Compliance Score: ?/119 (?%)

## Critical Issues (must fix before ship)
1. ...
2. ...

## Non-Critical Issues (should fix, not blocking)
1. ...
2. ...

## Observations (implementation choices that differ from spec but are acceptable)
1. ...
2. ...
```

**Scoring guidance:**

- **≥ 95% (113+/119):** Ship-ready. Minor polish only.
- **85–94% (101–112/119):** Nearly complete. Fix critical issues, then ship.
- **70–84% (83–100/119):** Significant gaps. Prioritize critical issues before proceeding.
- **< 70% (<83/119):** Incomplete implementation. Major rework needed.

**Begin the audit now. Read each file carefully, check each item, and produce the final report.**
