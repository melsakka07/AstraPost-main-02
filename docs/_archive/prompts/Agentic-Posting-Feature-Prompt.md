# Prompt: Agentic Posting — AI-Orchestrated Content Pipeline for AstraPost

> **Objective:** Design and implement "Agentic Posting" — a feature where the user provides a single topic and an AI-orchestrated pipeline handles research, content strategy, copywriting, image generation, and scheduling. The user's only responsibility is final approval. This feature lives under AI Tools in the dashboard sidebar at `/dashboard/ai/agentic`.

---

## Background

The 5-step pipeline structure (Research → Strategy → Write → Images → Review), the three-screen UX flow, and the "minimum input, maximum output" philosophy are all preserved — these were solid design choices.
What I fundamentally changed:

1. "Agents" are AI calls, not agents. Your sample described literal autonomous agents with negotiation and failure loops. In practice, this is a sequential chain of OpenRouter generateText() calls with structured JSON output. I made this explicit because if the prompt says "build a multi-agent framework," Claude will try to build one — adding weeks of unnecessary complexity. The word "agentic" describes the user experience, not the architecture.
2. No new publishing pipeline. Your sample implied Agentic Posting would have its own posting mechanism. I grounded it firmly in the existing infrastructure: the approve route creates standard posts/tweets/media rows, and the existing BullMQ publish-post worker does the actual publishing. Same pipeline, different content source. This saves enormous implementation time.
3. Full X tier integration. Your sample vaguely mentioned "4,000 characters for Premium." I wired it directly into the Strategy step using the tier system from your previous three prompts — canPostLongContent(), AI_LENGTH_OPTIONS, the 2,000-char cap. The strategy AI receives the exact tier and available formats as context, so it makes the right format decision automatically. The user never thinks about character limits.
4. Reuse inventory is explicit. The sample referenced generic components. My prompt has a table of 15 existing services/components that must be reused — image generation, storage, voice profiles, composer bridge, scheduling, notifications, drag-and-drop, date picker. This prevents Claude from rebuilding things that already work.
5. Single page, three states — not three routes. Your sample didn't specify routing. I made a deliberate call: one page at /dashboard/ai/agentic with state-driven rendering ("input" | "processing" | "review"). This enables smooth transitions between screens and keeps the URL stable.
6. SSE streaming with structured progress events. Rather than leaving the streaming format vague, I defined the exact SSE event format for each pipeline step — including partial progress events for writing and image generation. This gives Claude an unambiguous spec to implement.
7. Prompt engineering is its own phase (Phase 5). The prompts are what make or break this feature. I dedicated an entire phase to the four prompt templates with specific instructions about JSON output format, language handling (critical for your Arabic/MENA users), and quality standards.
   This is your fourth prompt in the series. The full implementation chain is now: Tier Detection → Badge UI → Dynamic Limits → Agentic Posting — each building on the previous one.

## Prerequisites — Verify Before Starting

This prompt builds on the complete X Subscription Tier system. Confirm these exist:

- `x_subscription_tier` on `x_accounts` table, `canPostLongContent()`, `getMaxCharacterLimit()` helpers
- `XSubscriptionBadge` component at `src/components/ui/x-subscription-badge.tsx`
- `AI_LENGTH_OPTIONS`, `getAvailableLengthOptions()` from `src/lib/x-post-length.ts`
- AI length selector and dynamic character limits integrated into the composer
- `src/lib/ai/length-prompts.ts` — length-specific AI prompt templates
- BullMQ daily tier refresh job running

If anything is missing, stop and inform the user.

---

## Context & Codebase

You are working on **AstraPost**, a production-ready AI-powered social media scheduling platform targeting Arabic-speaking content creators in the MENA region. Study the attached `README.md` and `CLAUDE.md` thoroughly.

**Infrastructure you MUST reuse — do not rebuild these:**

| Capability               | Existing Implementation                                                       | How Agentic Posting Uses It                                       |
| ------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **AI text generation**   | OpenRouter via `@openrouter/ai-sdk-provider` + Vercel AI SDK 5, streaming SSE | All copywriting and strategy calls                                |
| **AI image generation**  | Replicate API via `src/lib/services/ai-image.ts`                              | Image agent generates visuals for thread tweets                   |
| **AI preamble pipeline** | `src/lib/api/ai-preamble.ts` — auth → rate-limit → plan gate → quota → model  | Every AI route in the pipeline                                    |
| **Thread writer**        | `POST /api/ai/thread` — streaming thread generation                           | Reuse prompt patterns, not the endpoint directly                  |
| **Voice profile**        | `src/lib/ai/voice-profile.ts`                                                 | Personalize generated content to user's writing style             |
| **AI quota tracking**    | `src/lib/services/ai-quota.ts`                                                | Count agentic generation as AI usage                              |
| **Draft system**         | `posts` + `tweets` tables, existing draft CRUD                                | "Save as Draft" stores agentic output here                        |
| **Scheduling**           | BullMQ `publish-post` job, existing scheduling flow                           | "Schedule" uses the same pipeline                                 |
| **Image upload/storage** | `src/lib/storage.ts` — local (dev) / Vercel Blob (prod)                       | Store generated images                                            |
| **X subscription tier**  | `x_accounts.x_subscription_tier`, `canPostLongContent()`                      | Determines single-post length vs. thread format                   |
| **Best posting time**    | `GET /api/analytics/best-time`                                                | Suggest optimal schedule time                                     |
| **Composer bridge**      | `src/lib/composer-bridge.ts`                                                  | Hand off to Compose page for manual editing                       |
| **Notifications**        | `src/lib/services/notifications.ts`                                           | Notify user when agentic post is ready (if processing takes long) |
| **Correlation IDs**      | `src/lib/correlation.ts`                                                      | Track the full pipeline for observability                         |

**Key architectural constraints:**

- AI provider is **OpenRouter** — never import from `openai` directly
- Error responses use **`ApiError`** from `@/lib/api/errors` — never inline `Response` or `NextResponse`
- Multi-table writes in **`db.transaction()`**
- Plan gating via **`require-plan.ts`** — Agentic Posting should be gated behind Pro/Agency plans
- Dashboard pages use **`DashboardPageWrapper`**
- Every `/dashboard/*` route needs a **sidebar entry**
- Streaming uses Vercel AI SDK's `streamText()` — the existing thread writer already does this

---

## Feature Architecture

### What "Agentic" Means in This Context

This is **not** a multi-agent framework with autonomous agents negotiating with each other. It is a **sequential AI pipeline** — a chain of structured AI calls where each step's output feeds the next step's input. The "agentic" quality comes from the user experience: the user provides a single input and the system autonomously handles everything else, making decisions at each step without user intervention.

Technically, this is implemented as:

1. A single API route (`POST /api/ai/agentic`) that orchestrates the pipeline
2. Each "agent" is a call to OpenRouter with a specialized system prompt
3. The pipeline streams progress updates to the frontend via SSE
4. Image generation calls Replicate in parallel where possible
5. The final output is a complete post/thread ready for approval

### Pipeline Steps

```
User Input (topic)
       │
       ▼
┌──────────────────────────────────────────────────┐
│  Step 1 — RESEARCH                                │
│  AI call: analyze topic, find angles, trends      │
│  Output: ResearchBrief                            │
│  Model: Use a capable model via OpenRouter        │
│  Time: ~3-5s                                      │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│  Step 2 — STRATEGY                                │
│  AI call: decide format, structure, tone, images  │
│  Input: ResearchBrief + X tier + voice profile    │
│  Output: ContentPlan                              │
│  Time: ~2-3s                                      │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│  Step 3 — WRITE                                   │
│  AI call: generate the actual content             │
│  Input: ResearchBrief + ContentPlan               │
│  Output: ThreadContent (array of tweet objects)   │
│  Time: ~5-8s (streamed to frontend)               │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│  Step 4 — IMAGES (parallel)                       │
│  Replicate API: generate image for flagged tweets │
│  Input: image descriptions from ThreadContent     │
│  Output: image URLs attached to tweet objects     │
│  Time: ~10-20s (parallel, heaviest step)          │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│  Step 5 — REVIEW                                  │
│  AI call: final QA pass on complete output        │
│  Input: full ThreadContent + images               │
│  Output: AgenticPost (finalized, scored)          │
│  Time: ~2-3s                                      │
└──────────────┬───────────────────────────────────┘
               │
               ▼
        Frontend: Review Screen
```

**Estimated total pipeline time:** 25–40 seconds. This is long enough that the progress display is essential — not optional.

---

### Data Types

Define these in `src/lib/ai/agentic-types.ts`:

```typescript
// Step 1 output
interface ResearchBrief {
  topic: string;
  angles: Array<{ title: string; description: string; viralPotential: "high" | "medium" | "low" }>;
  trendingHashtags: string[];
  keyFacts: string[];
  recommendedAngle: string; // the angle the AI recommends
}

// Step 2 output
interface ContentPlan {
  format: "single" | "thread";
  lengthOption: "short" | "medium" | "long"; // from AI_LENGTH_OPTIONS
  tweetCount: number; // 1 for single, 3-10 for thread
  tone: string; // selected from existing TONE constants
  structure: string; // e.g., "hook → 3 value points → CTA"
  imageSlots: number[]; // indices of tweets that should have images (0-based)
  rationale: string; // one-line explanation of why this format was chosen
}

// Step 3 output (per tweet)
interface AgenticTweet {
  position: number;
  text: string;
  hashtags: string[];
  hasImage: boolean;
  imagePrompt?: string; // Replicate prompt for image generation
  imageUrl?: string; // filled in Step 4
  charCount: number;
}

// Step 5 output (final)
interface AgenticPost {
  id: string; // nanoid for tracking
  topic: string;
  research: ResearchBrief;
  plan: ContentPlan;
  tweets: AgenticTweet[];
  qualityScore: number; // 1-10
  summary: string; // one-line description for the review card
  createdAt: string;
  xAccountId: string;
  xSubscriptionTier: XSubscriptionTier;
}
```

---

### How X Subscription Tier Drives the Pipeline

The Strategy step (Step 2) uses the user's X tier to make format decisions. This logic is **fully automatic** — the user never thinks about character limits:

**Free X account (`None`):**

- Strategy agent decides between: single Short tweet (≤280) OR a thread (each tweet ≤280)
- If the topic is simple/punchy → single tweet
- If the topic requires depth → thread (3–7 tweets, each ≤280)
- The user is never told "you're limited" — the AI simply produces the right format

**Premium X account (`Basic` / `Premium` / `PremiumPlus`):**

- Strategy agent has full flexibility: single Short (≤280), Medium (281–1,000), Long (1,001–2,000), OR thread
- The AI picks the format that will perform best for the topic
- Longer single posts for thought leadership, threads for educational content, short for punchy takes

**Thread Mode rules (both tiers):**

- Every individual tweet in a thread is ≤280 characters, regardless of tier
- Thread mode is the universal way to express longer ideas
- The strategy agent includes numbering format (1/N), hook optimization, and CTA placement

Pass the tier as input to the Strategy step's system prompt so the AI can reason about available formats.

---

## Implementation Phases

### Phase 1: Foundation — API Route, Pipeline Service, and Database

#### 1A: Database Schema — Agentic Generations Table

**File:** `src/lib/schema.ts`

Create a new table to store agentic generation sessions (separate from the existing `ai_generations` table, which tracks individual AI calls — this tracks the full pipeline):

```typescript
export const agenticPosts = pgTable("agentic_posts", {
  id: varchar("id", { length: 36 }).primaryKey(), // nanoid
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  xAccountId: text("x_account_id")
    .notNull()
    .references(() => xAccounts.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  researchBrief: jsonb("research_brief"), // ResearchBrief JSON
  contentPlan: jsonb("content_plan"), // ContentPlan JSON
  tweets: jsonb("tweets"), // AgenticTweet[] JSON
  qualityScore: integer("quality_score"),
  summary: text("summary"),
  status: varchar("status", { length: 20 }).default("generating").notNull(),
  // "generating" | "ready" | "approved" | "posted" | "scheduled" | "failed" | "discarded"
  postId: text("post_id").references(() => posts.id), // linked post after approval
  correlationId: varchar("correlation_id", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

Generate and apply migration:

```bash
pnpm run db:generate
pnpm run db:migrate
```

#### 1B: Pipeline Service

**File:** `src/lib/services/agentic-pipeline.ts`

This is the core orchestration service. It does NOT handle HTTP concerns — it takes inputs and returns outputs. The API route calls this service.

```typescript
export async function runAgenticPipeline(params: {
  topic: string;
  xAccountId: string;
  xSubscriptionTier: XSubscriptionTier;
  voiceProfile: string | null;
  language: string;
  userId: string;
  onProgress: (step: PipelineStep, status: StepStatus, data?: unknown) => void;
}): Promise<AgenticPost>;
```

**Implementation structure:**

1. **Step 1 — Research:** Single `generateText()` call via OpenRouter. System prompt asks the AI to analyze the topic and return structured JSON (a `ResearchBrief`). Use a model that supports web search if available via OpenRouter (e.g., `perplexity/llama-3.1-sonar-large-128k-online`), otherwise use the default model with its training knowledge. Call `onProgress("research", "complete", brief)` when done.

2. **Step 2 — Strategy:** Single `generateText()` call. System prompt includes the research brief, the user's X tier, and instructions to decide format/structure. Returns structured JSON (`ContentPlan`). Call `onProgress("strategy", "complete", plan)`.

3. **Step 3 — Write:** Single `generateText()` call (or `streamText()` if you want to stream tweets appearing one by one — follow the pattern in the existing thread writer). System prompt includes research brief + content plan. Returns structured JSON array of `AgenticTweet` objects. Call `onProgress("writing", "complete", tweets)`.

4. **Step 4 — Images:** For each tweet where `hasImage === true`, call the existing `generateImage()` function from `src/lib/services/ai-image.ts`. Run image generations **in parallel** (`Promise.allSettled`). Attach resulting URLs to the tweet objects. Call `onProgress("images", "complete", tweets)`. If any image fails, mark that tweet's `imageUrl` as `null` — don't fail the whole pipeline.

5. **Step 5 — Review:** Single `generateText()` call. System prompt asks for a QA review of the complete output — grammar, character limit compliance, factual alignment with research, and a quality score (1–10). Returns a summary and score. Call `onProgress("review", "complete", result)`.

**Critical implementation details:**

- Every AI call uses the `openrouter()` function from `@openrouter/ai-sdk-provider`
- Every AI call logs via the structured logger with the `correlationId`
- If any step fails, store the partial state in the `agentic_posts` row (set status to `"failed"`) and include the error. The user can retry from the failed step, not from scratch.
- Count this toward AI quota via `ai-quota.ts`
- If the user has a voice profile (`src/lib/ai/voice-profile.ts`), inject it into the Step 3 (Write) system prompt so the generated content matches their style

#### 1C: API Route — Orchestration Endpoint

**File:** `src/app/api/ai/agentic/route.ts`

```
POST /api/ai/agentic
```

**Request body:**

```json
{
  "topic": "AI coding tools replacing traditional IDEs",
  "xAccountId": "uuid-of-connected-x-account",
  "language": "en",
  "preferences": {
    "tone": "informational",
    "includeImages": true,
    "audience": "developers"
  }
}
```

All fields in `preferences` are optional — the AI makes good defaults from the topic alone.

**Implementation:**

1. Use `aiPreamble()` or manually replicate its pipeline: auth → session → rate-limit → plan gate → quota check. **Gate this behind Pro/Agency plans** using `require-plan.ts` — add a new gate function: `checkAgenticPosting()`.
2. Validate the `xAccountId` belongs to the authenticated user (ownership check).
3. Look up the X account's `xSubscriptionTier`. If stale (>24h), re-fetch via `fetchXSubscriptionTier()`.
4. Look up the user's voice profile if one exists.
5. Generate a `correlationId` via `nanoid`.
6. Create an `agentic_posts` row with status `"generating"`.
7. Call `runAgenticPipeline()` — stream progress updates back to the client via SSE.
8. On completion, update the `agentic_posts` row with status `"ready"` and the full output.
9. Return the complete `AgenticPost` to the client.

**SSE streaming format** (follow the pattern in the existing thread writer):

```
data: {"step":"research","status":"in_progress"}

data: {"step":"research","status":"complete","data":{"angles":[...],"recommendedAngle":"..."}}

data: {"step":"strategy","status":"in_progress"}

data: {"step":"strategy","status":"complete","data":{"format":"thread","tweetCount":5}}

data: {"step":"writing","status":"in_progress"}

data: {"step":"writing","status":"streaming","tweet":{"position":0,"text":"Here's what most..."}}

data: {"step":"images","status":"in_progress","total":3}

data: {"step":"images","status":"progress","completed":1,"total":3}

data: {"step":"review","status":"complete","data":{"qualityScore":8,"summary":"..."}}

data: {"step":"done","data":{...fullAgenticPost}}
```

#### 1D: API Route — Approve & Publish/Schedule

**File:** `src/app/api/ai/agentic/[id]/approve/route.ts`

```
POST /api/ai/agentic/{id}/approve
```

**Request body:**

```json
{
  "action": "post_now" | "schedule" | "save_draft",
  "scheduledAt": "2026-04-10T09:00:00Z",  // required if action is "schedule"
  "tweets": [...]  // the potentially edited tweets array (user may have edited inline)
}
```

**Implementation:**

1. Load the `agentic_posts` row, verify ownership, verify status is `"ready"`.
2. Create a `posts` row + `tweets` rows + `media` rows (for generated images) in a `db.transaction()`.
3. If `action === "post_now"`: enqueue a BullMQ `publish-post` job immediately.
4. If `action === "schedule"`: create the post with `status: "scheduled"` and `scheduledAt`.
5. If `action === "save_draft"`: create the post with `status: "draft"`.
6. Update the `agentic_posts` row: set `postId` to the created post, update status to `"posted"` / `"scheduled"` / `"approved"`.
7. Return the created post ID.

This reuses the **exact same publishing pipeline** as the regular composer — same `posts`/`tweets` schema, same BullMQ job, same worker processor. Agentic Posting is a content generation frontend, not a new publishing backend.

#### 1E: API Route — Regenerate Single Tweet

**File:** `src/app/api/ai/agentic/[id]/regenerate/route.ts`

```
POST /api/ai/agentic/{id}/regenerate
```

**Request body:**

```json
{
  "tweetIndex": 2,
  "regenerateImage": true
}
```

Regenerates just one tweet (and optionally its image) without rerunning the full pipeline. Uses the stored `researchBrief` and `contentPlan` to maintain consistency.

Run `pnpm lint && pnpm typecheck` after this phase.

---

### Phase 2: Frontend — The Three-Screen Experience

The UX follows a strict three-screen flow. Each screen is a distinct state, not a separate route — it's a single page (`/dashboard/ai/agentic`) with state-driven rendering.

#### 2A: Page Setup

**File:** `src/app/dashboard/ai/agentic/page.tsx`

Server component. Fetch the user's connected X accounts and pass them to the client component.

```typescript
export default async function AgenticPostingPage() {
  // session check, redirect if unauthenticated
  // fetch connected X accounts with subscription tiers
  // fetch voice profile existence (boolean)
  return (
    <DashboardPageWrapper
      icon={Wand2}  // or Sparkles from lucide-react
      title="Agentic Posting"
      description="Drop a topic. AI handles the rest."
    >
      <AgenticPostingClient xAccounts={accounts} hasVoiceProfile={hasVoice} />
    </DashboardPageWrapper>
  );
}
```

#### 2B: Sidebar Entry

**File:** `src/components/dashboard/sidebar.tsx`

Add "Agentic Posting" to the AI Tools section in `sidebarSections`:

- **Label:** "Agentic Posting"
- **Icon:** `Wand2` or `Sparkles` from `lucide-react` (choose whichever is consistent with the existing AI tools icons)
- **Route:** `/dashboard/ai/agentic`
- **Badge:** `"New"` badge (small, accent-colored) for the feature launch period — remove after 30 days
- **Position:** First item in the AI Tools section (this is the flagship AI feature)

#### 2C: Client Component — State Machine

**File:** `src/components/ai/agentic-posting-client.tsx`

The client component manages three visual states:

```typescript
type AgenticScreen = "input" | "processing" | "review";
```

Use `useState` (or a small Zustand store if the state becomes complex). Do not use React Router or separate routes — the three screens are rendered conditionally within a single page.

---

#### Screen 1 — Topic Input ("What should we post about?")

**Design intent:** One input field, one button. Everything else is optional and hidden by default. The screen should feel like a search engine home page — radically simple, confidence-inspiring.

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              ✨ What should we post about?                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  e.g., AI coding tools, sustainable fashion...      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [ AI coding tools ] [ Web3 gaming ] [ MENA startups ]     │
│                                                             │
│         ┌──────────────────────────┐                        │
│         │      ✨ Generate         │                        │
│         └──────────────────────────┘                        │
│                                                             │
│                 ▾ Advanced options                           │
│                                                             │
│  ┌─ Account: @username ● ──────────────────────────────┐   │
│  │  (auto-selected, shows XSubscriptionBadge)          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Components and behavior:**

1. **Headline:** `"What should we post about?"` — large, centered, using the app's heading font. Below it, a muted subline: `"AI will research, write, and create visuals — ready to post in seconds."`

2. **Topic Input:** A single-line `<input>` (not `<textarea>`) with generous padding (`py-4 px-6 text-lg`), full width, soft border, focus ring. Placeholder: `"e.g., AI coding tools, sustainable fashion, Web3 gaming..."`. Auto-focus on mount. Submit on Enter key.

3. **Suggestion Chips:** A row of 3–5 tappable chips below the input. Sources for chip content (in priority order):
   - User's recent agentic topics (from `agentic_posts` table)
   - Trending topics from the user's analytics (if viral analyzer data exists)
   - Hardcoded fallbacks relevant to MENA content creators (e.g., "AI tools", "startup funding", "content creation tips")

   Tapping a chip fills the input and immediately starts the pipeline (no need to click Generate).

4. **Generate Button:** Large, primary style, centered below the input. Disabled until input has ≥3 characters. Shows `Sparkles` icon. On click → transition to Screen 2.

5. **Advanced Options (collapsed by default):** A `"▾ Advanced options"` disclosure toggle. When expanded, reveals:
   - **Tone:** Dropdown selector using the existing tone constants from `src/lib/constants.ts` (Professional, Casual, Educational, etc.). Default: "Auto" (AI decides based on topic).
   - **Language:** Dropdown using the existing language constants. Default: user's profile language.
   - **Include Images:** Toggle switch, ON by default. When OFF, the image generation step is skipped.
   - **Audience hint:** Small text input, placeholder `"e.g., developers, marketers, students"`. Optional — the AI infers audience from the topic if not provided.

   These are progressive disclosure — power users can customize, but the defaults produce excellent results.

6. **Account Selector:** Below the input area, a compact account badge showing the selected X account's avatar, `@username`, and `XSubscriptionBadge`. If the user has multiple X accounts, it's tappable to switch. The tier badge tells the user at a glance which account is selected — they never need to think about character limits.

**What happens on submit:**

1. Validate: topic length ≥ 3 characters, X account selected.
2. Smooth transition animation: the input area slides up and compresses into a compact header bar showing the topic text. The processing screen appears below.
3. Fire `POST /api/ai/agentic` with SSE streaming.

---

#### Screen 2 — Processing ("Watch the magic")

**Design intent:** The user is a passive observer. No interaction required. Build trust through transparency — show what the AI is doing at each step, with just enough detail to feel informed without being overwhelmed.

**Layout — Vertical Timeline (recommended):**

```
┌─────────────────────────────────────────────────────────────┐
│  Topic: "AI coding tools"                         [Cancel]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ Research                                        3s      │
│     Found 4 trending angles. Recommended:                   │
│     "5 AI tools developers are adopting in 2026"            │
│                                                             │
│  ✅ Strategy                                        2s      │
│     Thread (5 tweets) · Educational tone · Images: 1, 3, 5 │
│                                                             │
│  ⏳ Writing tweet 3 of 5...                                 │
│     ████████████░░░░░░░░░░░░░░░░░░░░                       │
│                                                             │
│  ○  Generating images (3)                                   │
│                                                             │
│  ○  Final review                                            │
│                                                             │
│  ─────────────────────────────────────────                  │
│  Estimated: ~30 seconds remaining                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Components and behavior:**

1. **Compact Topic Header:** The topic text displayed at the top with a small "Cancel" text link (secondary, not prominent). Cancelling stops the pipeline and discards partial results.

2. **Timeline Steps:** Each step renders as a timeline item with:
   - **Status icon:** `✅` (complete, green), `⏳` (in progress, pulsing blue), `○` (pending, muted gray)
   - **Step name:** Research, Strategy, Writing, Images, Review
   - **Time taken:** Shown after completion (e.g., `3s`)
   - **Summary line:** 1–2 lines of the step's key output. Keep this concise:
     - Research: the recommended angle title
     - Strategy: format + tweet count + tone + image count
     - Writing: progress indicator (`tweet 3 of 5`)
     - Images: progress (`2 of 3 generated`)
     - Review: quality score

3. **Progress indicator:** The in-progress step shows a subtle animated state — use a thin indeterminate progress bar or pulsing dots. Not a spinner (spinners feel uncertain). A progress bar with estimated percentage (based on step position) feels more trustworthy.

4. **Estimated time:** Below the timeline, a muted line: `"~30 seconds remaining"` that updates as steps complete. Calculate based on average step times minus elapsed time.

5. **Cancel behavior:** Hitting Cancel shows a brief confirmation (`"Stop generating? Progress will be lost."`) via a small inline prompt (not a modal). If confirmed, abort the SSE connection, mark the `agentic_posts` row as `"discarded"`.

6. **Error handling:** If any step fails:
   - The failed step shows a red `✕` icon with the error message
   - A `"Retry"` button appears on the failed step
   - Steps after the failure remain as `○` (pending)
   - The user can retry just the failed step — the pipeline resumes from that point using cached outputs from previous steps

**Transition to Screen 3:** When the `"done"` SSE event arrives, the timeline smoothly fades/collapses and the Review screen slides in. Brief celebratory moment — a subtle `✨` animation or green flash on the final step before transitioning.

---

#### Screen 3 — Review & Approval ("Your post is ready")

**Design intent:** This is the decision screen. The user sees their complete post/thread, can make edits, and takes a single action (post, schedule, or save). The layout must feel like a preview of how the content will appear on X — building confidence in the output.

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  Your post is ready                     Quality: ★★★★★★★★☆☆│
│  "5 AI tools developers are adopting in 2026"               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Tweet 1/5 ─── @username ● ─────── 247/280 ──────────┐ │
│  │                                                        │ │
│  │  🧵 Here's what most developers don't know yet:        │ │
│  │                                                        │ │
│  │  5 AI coding tools are quietly replacing traditional   │ │
│  │  IDEs — and the shift is happening faster than anyone  │ │
│  │  expected.                                             │ │
│  │                                                        │ │
│  │  A thread 🧵👇                                         │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────┐              │ │
│  │  │         [AI Generated Image]         │              │ │
│  │  └──────────────────────────────────────┘              │ │
│  │                                                        │ │
│  │  [✏️ Edit] [🔄 Rewrite] [🖼 New Image] [✕ Remove]     │ │
│  └────────────────────────────────────────────────────────┘ │
│  │  (thread connector line)                                 │
│  ┌─ Tweet 2/5 ────────────────────── 263/280 ─────────────┐│
│  │  ...                                                    ││
│  └─────────────────────────────────────────────────────────┘│
│  ...                                                        │
│                                                             │
│  [ + Add Tweet ]                    [ 🔄 Regenerate All ]  │
│                                                             │
│  ┌──────────── Research Insights ▾ ─────────────────────┐  │
│  │ (collapsible — shows angles, hashtags, key facts)    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌────────────────┐   Save Draft        │
│  │  ✨ Post Now   │  │  📅 Schedule   │   Discard           │
│  └───────────────┘  └────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

**Components and behavior:**

**Thread Preview Cards:**

Reuse and extend existing tweet card patterns from the composer (`src/components/composer/tweet-card.tsx`). Each card shows:

1. **Header:** Tweet position (`1/5`), account handle with `XSubscriptionBadge`, character count (`247/280`)
2. **Body:** Tweet text with hashtags highlighted. Rendered as read-only text by default. Editable when Edit is clicked.
3. **Image:** If the tweet has an AI-generated image, show it inline below the text. Clickable to expand/zoom. If image generation failed, show a placeholder: `"Image couldn't be generated. [Retry] or [Upload your own]"`
4. **Thread connector:** A vertical line connecting cards, mimicking X's thread visual. Use a `border-l-2 border-muted` element between cards.

**Per-Tweet Actions (visible on hover/focus, compact icon row):**

- **Edit** (pencil icon): Switches the card to inline edit mode — the text becomes an editable `<textarea>`. Character counter updates in real-time. "Save" and "Cancel" appear. No modal, no navigation.
- **Rewrite** (refresh icon): Calls `POST /api/ai/agentic/{id}/regenerate` for just this tweet. Shows a brief loading state on the card, then replaces the text. The rest of the thread is untouched.
- **New Image** (image icon): Regenerates just this tweet's image via the same endpoint with `regenerateImage: true`. Or opens the existing `ai-image-dialog.tsx` for manual upload.
- **Remove** (X icon): Removes the tweet from the thread. Shows undo toast for 5 seconds (follow existing toast-based undo pattern from the composer).
- **Drag handle** (grip dots): Enables drag-and-drop reordering. Use `@dnd-kit/core` (already in the project for the composer's sortable tweets).

**Global Actions:**

- **Add Tweet:** Appends a blank tweet card to the thread. The user can type manually or click "AI Fill" to have the AI generate content consistent with the thread.
- **Regenerate All:** Reruns the full pipeline with the same topic but requests a different creative angle. Confirm first: `"Regenerate the entire thread? Your edits will be lost."`
- **Change Topic:** Returns to Screen 1 with the input pre-filled.

**Research Insights Panel:**

A collapsible section below the thread preview (collapsed by default). When expanded, shows:

- The recommended angle and why it was chosen
- Trending hashtags found during research
- Key facts/stats used in the content
- The quality score with a brief explanation

This builds trust — the user can see the research that informed the content.

**Action Bar (sticky at bottom on mobile, fixed footer on desktop):**

- **Post Now** — Primary button, prominent. On click: calls the approve endpoint with `action: "post_now"`. Shows a toast: `"Thread posted! 🎉"` with a `"View on X"` link.
- **Schedule** — Secondary button. On click: reveals an inline date/time picker (not a modal). Use the existing `DatePicker` component (`react-day-picker v9`). Show suggested optimal times from `GET /api/analytics/best-time` if available. Once a time is selected, the button updates to `"Schedule for Apr 10, 9:00 AM"` — one more click to confirm.
- **Save Draft** — Tertiary text link. Saves as a draft in the existing draft system. Toast: `"Saved as draft. Open in Compose anytime."`
- **Discard** — Small text link. Confirm: `"Discard this thread? This can't be undone."` Marks the `agentic_posts` row as `"discarded"`.

**After approval:** Transition to a brief success state — the action bar transforms to show:

- `"✓ Thread posted"` or `"✓ Scheduled for Apr 10, 9:00 AM"`
- Three quick links: `"Create Another"` (back to Screen 1), `"View in Queue"`, `"Go to Calendar"`

Run `pnpm lint && pnpm typecheck`.

---

### Phase 3: Image Generation Integration

#### 3A: Extend the Existing Image Service

**File:** `src/lib/services/ai-image.ts`

The existing image service generates images via Replicate. Extend it (or add a wrapper) for agentic use:

```typescript
export async function generateAgenticImage(params: {
  prompt: string;
  style?: "photorealistic" | "digital-art" | "infographic" | "editorial";
  aspectRatio?: "16:9" | "1:1";
}): Promise<{ url: string } | { error: string }>;
```

**Requirements:**

- Default aspect ratio: `16:9` (1200×675px) — optimal for X timeline display
- Default style: `"editorial"` — clean, professional, attention-grabbing
- The prompt should be enhanced by prepending a quality prefix: `"Professional social media image, high quality, modern design: "` + the AI-generated image prompt from Step 3
- Handle Replicate API timeouts gracefully — return `{ error: "..." }` instead of throwing
- Images should be stored via the existing `upload()` function from `@/lib/storage`

#### 3B: Parallel Image Generation in Pipeline

In the pipeline service (`agentic-pipeline.ts`), Step 4 generates images in parallel:

```typescript
const imagePromises = tweets
  .filter((t) => t.hasImage && t.imagePrompt)
  .map(async (tweet) => {
    const result = await generateAgenticImage({
      prompt: tweet.imagePrompt!,
      style: "editorial",
    });
    return { position: tweet.position, result };
  });

const imageResults = await Promise.allSettled(imagePromises);
```

Stream progress updates as each image completes (`"images progress: 2/3"`).

#### 3C: Image Preview in Review Cards

In the tweet card on the Review screen, render the generated image:

- Full-width within the card, below the text
- Subtle rounded corners (`rounded-lg`)
- Loading skeleton while images are still generating (if the user reaches the review screen before all images are done — which shouldn't happen, but handle gracefully)
- On hover: show a subtle overlay with `"🖼 New Image"` and `"✕ Remove Image"` buttons

Run `pnpm lint && pnpm typecheck`.

---

### Phase 4: Edge Cases, Error Handling & Polish

#### 4A: Topic Handling

In the Research step's system prompt, add logic for vague topics:

- If the AI determines the topic is too broad (e.g., "technology", "news"), it should return `angles` with 3–4 specific subtopic suggestions instead of a research brief
- The pipeline pauses and sends a special SSE event: `{"step":"research","status":"needs_input","data":{"suggestions":[...]}}`
- The frontend shows the suggestions as tappable chips: `"Your topic is broad. Pick a specific angle:"`
- The user taps one, and the pipeline resumes from Step 1 with the narrowed topic

#### 4B: Network/API Failure Recovery

If the SSE connection drops mid-pipeline:

1. The pipeline continues server-side (it's not dependent on the SSE connection)
2. The `agentic_posts` row stores the state at each step
3. When the user refreshes the page, check for any `agentic_posts` with status `"generating"` — if found, show the processing screen with the current state loaded from the database
4. If the pipeline completed while the user was disconnected, show the review screen directly

#### 4C: Quota Exhaustion

If the user's AI quota is exhausted mid-pipeline (e.g., they had enough quota for the research step but not for writing):

- The pipeline stops gracefully at the failed step
- The error message explains: `"AI generation quota reached. Your progress has been saved. Upgrade your plan or wait for quota reset to continue."`
- The partial state is saved — when the user has quota again, they can resume

#### 4D: Responsive Design

- **Desktop (≥1024px):** Full-width timeline on Screen 2, two-column layout on Screen 3 (thread preview left, research insights right)
- **Tablet (768–1023px):** Single column, research insights as a collapsible bottom drawer
- **Mobile (<768px):** Full-width single column. Sticky bottom action bar. Swipe between tweet cards in the review screen. Topic input takes full screen.

#### 4E: Accessibility

- All interactive elements are keyboard navigable (Tab, Enter, Escape)
- Timeline steps have `role="status"` and `aria-live="polite"` for screen reader updates
- Tweet cards in review have `role="article"` with appropriate labels
- The Generate button has `aria-label="Generate AI post about [topic]"`
- All images have alt text (from the AI-generated image prompt)

#### 4F: Loading States

- Screen 1 → Screen 2 transition: input field smoothly compresses into the header (use Tailwind `transition-all duration-300`)
- Screen 2 → Screen 3 transition: timeline fades out, review cards fade in (`transition-opacity duration-500`)
- Image loading: skeleton placeholder with shimmer animation
- Action button loading: disabled state with spinner while the approve API call is in flight

Run `pnpm lint && pnpm typecheck`.

---

### Phase 5: AI Prompt Engineering

**File:** `src/lib/ai/agentic-prompts.ts`

This is the quality backbone of the entire feature. Poor prompts produce generic, low-engagement content. Excellent prompts produce content users are proud to post.

Create structured prompt templates for each pipeline step. Each template is a function that takes the relevant context and returns a system prompt string.

#### 5A: Research Prompt

```typescript
export function buildResearchPrompt(topic: string, language: string): string;
```

The system prompt should instruct the AI to:

- Analyze the topic and identify 3–5 specific angles with viral potential
- Consider what's currently driving engagement on X/Twitter for this topic
- Return structured JSON matching the `ResearchBrief` type
- Rank angles by engagement potential
- Include relevant hashtags that are actually used on X (not made-up)
- If the topic is too vague, return a `"too_broad": true` flag with suggested narrower topics

#### 5B: Strategy Prompt

```typescript
export function buildStrategyPrompt(
  brief: ResearchBrief,
  tier: XSubscriptionTier,
  language: string,
  preferences?: { tone?: string; audience?: string }
): string;
```

The system prompt should:

- Explain the available formats based on tier (pass the exact character limits)
- Instruct the AI to choose the format that will generate the highest engagement for this specific topic
- For threads: decide length (3–7 tweets optimal, 10 max), hook strategy, CTA placement
- For single posts: decide length option (short/medium/long)
- Decide which tweet positions get images and what kind of images
- Return structured JSON matching `ContentPlan`

#### 5C: Writing Prompt

```typescript
export function buildWritingPrompt(
  brief: ResearchBrief,
  plan: ContentPlan,
  voiceProfile: string | null,
  language: string
): string;
```

The system prompt should:

- Generate content that follows the content plan exactly
- Enforce character limits strictly (per-tweet for threads, total for single posts)
- If a voice profile exists, match the user's writing style
- Craft a scroll-stopping hook for the first tweet
- Use hashtags sparingly (2–3 max per tweet, not in every tweet)
- For each image-flagged tweet, write a detailed `imagePrompt` that will produce an engaging visual
- Return structured JSON matching `AgenticTweet[]`
- Write in the specified language (critical for MENA/Arabic users — RTL content must feel natural, not translated)

#### 5D: Review Prompt

```typescript
export function buildReviewPrompt(
  brief: ResearchBrief,
  tweets: AgenticTweet[],
  plan: ContentPlan
): string;
```

The system prompt should:

- Check each tweet for: character limit compliance, grammar, clarity, factual alignment with the research brief
- Verify the thread flows logically and the hook is compelling
- Score the overall quality (1–10) with brief justification
- Generate a one-line summary of the thread
- If any issues are found, flag them specifically (which tweet, what problem)
- Return structured JSON with `qualityScore`, `summary`, and `issues[]`

**Critical prompt engineering rules:**

- Every prompt must specify the output format as JSON with the exact field names
- Every prompt must include `"Return ONLY valid JSON. No markdown, no explanation, no preamble."`
- Add a `"language"` instruction to every prompt — content must be in the user's language, but the JSON keys must always be in English
- For Arabic content specifically: instruct the AI to write natively in Arabic (not translated) and to use region-appropriate references and cultural context

Run `pnpm lint && pnpm typecheck`.

---

### Phase 6: Verification Tests (Vitest)

#### 6A: Pipeline Service Tests

**File:** `src/lib/services/agentic-pipeline.test.ts`

Mock OpenRouter and Replicate. Test:

1. **Happy path:** Mock all 5 steps returning valid JSON → pipeline produces a complete `AgenticPost`
2. **Research returns "too broad"** → pipeline pauses with `needs_input` status
3. **Image generation partial failure** → pipeline completes, affected tweets have `imageUrl: null`
4. **Step 3 exceeds character limit** → verify the review step flags the issue
5. **Free tier formatting** → verify strategy step never produces `medium` or `long` single posts

#### 6B: Approve Route Tests

**File:** `src/app/api/ai/agentic/[id]/approve/route.test.ts`

1. **Post now** → creates `posts` + `tweets` + `media` rows + BullMQ job
2. **Schedule** → creates post with `scheduledAt` set
3. **Save draft** → creates post with `status: "draft"`
4. **Ownership check** → returns 403 if agentic post belongs to another user
5. **Wrong status** → returns 400 if agentic post status is not `"ready"`

#### 6C: Type Validation Tests

**File:** `src/lib/ai/agentic-types.test.ts`

Validate the Zod schemas for `ResearchBrief`, `ContentPlan`, `AgenticTweet`, and `AgenticPost` against sample payloads — both valid and invalid.

Run `pnpm test`.

---

## Architectural Rules — MUST Follow

1. **`ApiError` for all error responses** — never `new Response(JSON.stringify(...))` or `NextResponse.json()`
2. **`db.transaction()` for multi-table writes** — the approve route writes to `posts`, `tweets`, `media`, and `agentic_posts` — all in one transaction
3. **Never call `getPlanLimits()` in route handlers** — gate Agentic Posting via a new `checkAgenticPosting()` function in `require-plan.ts`
4. **`exactOptionalPropertyTypes`** — use conditional spread for optional props
5. **Server Components by default** — `"use client"` only for the interactive client component
6. **Tailwind + shadcn/ui color tokens** — dark mode everywhere
7. **OpenRouter for AI** — import from `@openrouter/ai-sdk-provider`
8. **`DashboardPageWrapper`** — required for the page
9. **Sidebar entry** — required for navigation
10. **Structured logger** — `@/lib/logger` for all pipeline step logging with `correlationId`
11. **Run `pnpm lint && pnpm typecheck` after every phase**
12. **Never start the dev server** — ask the user if needed
13. **Reuse existing infrastructure** — do not rebuild image generation, storage, scheduling, or publishing. Use what exists.

---

## What NOT To Do

- **Do NOT build a "real" multi-agent framework** with autonomous agents, message passing, or agent negotiation. This is a sequential pipeline with structured AI calls. The word "agentic" describes the UX (user provides one input, system does everything), not the technical architecture.
- **Do NOT create a new publishing pipeline.** Agentic Posting generates content and creates `posts`/`tweets` rows — the existing BullMQ `publish-post` worker handles actual publishing. Same pipeline, different content source.
- **Do NOT add new AI providers.** Use OpenRouter exclusively for text generation and Replicate for images — both are already configured.
- **Do NOT install new npm packages** unless absolutely necessary. `@dnd-kit/core`, `lucide-react`, `sonner`, `react-day-picker`, and all shadcn/ui components are already available.
- **Do NOT create separate routes for each screen.** The three screens (input, processing, review) are state-driven renders within a single page component at `/dashboard/ai/agentic`.
- **Do NOT skip the Research and Review steps** to speed up the pipeline. They are what makes the output high-quality. The research grounds the content in reality; the review catches errors. Both are essential.
- **Do NOT hardcode topics or suggestions.** Suggestion chips should be dynamic (user history + analytics data) with static fallbacks only as a last resort.

---

## Deliverables Checklist

- [ ] **`agentic_posts` table** — schema added, migration applied
- [ ] **`src/lib/ai/agentic-types.ts`** — all pipeline types defined with Zod schemas
- [ ] **`src/lib/ai/agentic-prompts.ts`** — prompt templates for all 5 pipeline steps
- [ ] **`src/lib/services/agentic-pipeline.ts`** — orchestration service with progress callbacks
- [ ] **`POST /api/ai/agentic`** — SSE-streaming orchestration route with plan gate
- [ ] **`POST /api/ai/agentic/[id]/approve`** — approve/schedule/draft with transaction
- [ ] **`POST /api/ai/agentic/[id]/regenerate`** — single-tweet regeneration
- [ ] **Plan gate** — `checkAgenticPosting()` added to `require-plan.ts` (Pro/Agency only)
- [ ] **Sidebar entry** — "Agentic Posting" in AI Tools section with `"New"` badge
- [ ] **Page component** — `src/app/dashboard/ai/agentic/page.tsx` with `DashboardPageWrapper`
- [ ] **Client component** — `src/components/ai/agentic-posting-client.tsx` with 3-screen state machine
- [ ] **Screen 1 (Input)** — topic input, suggestion chips, advanced options, account selector
- [ ] **Screen 2 (Processing)** — SSE-driven timeline, step progress, cancel support
- [ ] **Screen 3 (Review)** — tweet cards, inline edit, per-tweet regenerate, drag reorder, image preview, action bar
- [ ] **Image generation** — parallel Replicate calls, storage via existing service, failure handling
- [ ] **X tier integration** — strategy step uses tier to decide format, character limits enforced
- [ ] **Voice profile integration** — writing step uses stored voice profile if available
- [ ] **Scheduling** — inline date picker with best-time suggestions
- [ ] **Error handling** — partial failure recovery, quota exhaustion, network resilience
- [ ] **Responsive design** — desktop, tablet, mobile layouts
- [ ] **Accessibility** — keyboard nav, aria labels, screen reader support
- [ ] **Vitest tests** — pipeline service, approve route, type validation
- [ ] **`pnpm lint && pnpm typecheck && pnpm test`** — all pass cleanly

---

## Summary

Agentic Posting transforms AstraPost from a tool where users _write and schedule_ content into one where they _approve and publish_ AI-generated content. The user's workflow changes from:

**Before:** Think of topic → Research → Write tweet → Edit → Find image → Attach → Schedule → Post
**After:** Enter topic → Wait 30 seconds → Review → Post

The technical architecture is deliberately simple — a sequential pipeline of OpenRouter AI calls + Replicate image generation, streamed to the frontend via SSE, stored in the database at each step for resilience, and published through the existing BullMQ worker. No new publishing infrastructure, no multi-agent frameworks, no new AI providers. The magic is in the prompt engineering and the UX.

Implement all phases in order. Run `pnpm lint && pnpm typecheck` after each phase. Run `pnpm test` after Phase 6.
