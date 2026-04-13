# Prompt: Dynamic Character Limits & AI Length Options Based on X Subscription Tier

> **Objective:** Replace the hardcoded 280-character limit with a tier-aware dynamic system. Free X users keep the 280-char experience unchanged. X Premium users (Basic, Premium, Premium+) get a 2,000-character manual typing limit and three AI generation length options (Short, Medium, Long). Add a BullMQ recurring job for daily tier refresh, and a pre-publish tier verification in the worker to prevent unpublishable content.

---

## Prerequisites — Verify Before Starting

This prompt builds on two previous implementation phases. **Before writing any code**, confirm all of the following exist in the codebase:

**From Phase 1 (Tier Detection):**

- `x_subscription_tier` and `x_subscription_tier_updated_at` columns on the `x_accounts` table
- `fetchXSubscriptionTier()` in `src/lib/services/x-api.ts`
- `GET /api/x/subscription-tier` and `POST /api/x/subscription-tier/refresh` routes
- `xSubscriptionTierEnum` Zod schema in `src/lib/schemas/common.ts`
- `canPostLongContent()` and `getMaxCharacterLimit()` helpers

**From Phase 2 (Badge Visibility):**

- `XSubscriptionBadge` component at `src/components/ui/x-subscription-badge.tsx`
- Badge integrated in Settings, Composer (account selector + character counter area), Sidebar account switcher, and Queue error context
- `xSubscriptionTier` flowing through the Zustand store / data layer to all four surfaces

If anything is missing, stop and inform the user. Do not proceed with partial prerequisites.

---

## Context & Codebase

You are working on **AstraPost**, a production-ready AI-powered social media scheduling platform. Study the attached `README.md` and `CLAUDE.md` thoroughly — they are your source of truth.

**Critical architectural context for this feature:**

| Concern                            | Key Files                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| **AI thread writer endpoint**      | `src/app/api/ai/thread/route.ts` — `POST /api/ai/thread`                                           |
| **AI preamble (shared pipeline)**  | `src/lib/api/ai-preamble.ts` — auth → rate-limit → plan gate → model                               |
| **Composer**                       | `src/components/composer/composer.tsx`, `tweet-card.tsx`, `target-accounts-select.tsx`             |
| **Character counter / validation** | Inside `tweet-card.tsx` or `composer.tsx` — locate the exact 280-char check                        |
| **280-char warning message**       | Locate in composer components — the message starting with _"X Premium required for long posts..."_ |
| **BullMQ queue client**            | `src/lib/queue/client.ts` — job payload types defined here                                         |
| **BullMQ job processors**          | `src/lib/queue/processors.ts` — worker logic here                                                  |
| **Worker entry point**             | `scripts/worker.ts`                                                                                |
| **X API service**                  | `src/lib/services/x-api.ts` — `fetchXSubscriptionTier()` lives here                                |
| **Plan limits / gates**            | `src/lib/middleware/require-plan.ts`, `src/lib/plan-limits.ts`                                     |
| **Shared Zod schemas**             | `src/lib/schemas/common.ts`                                                                        |
| **Existing helpers**               | `canPostLongContent()`, `getMaxCharacterLimit()` — update these as needed                          |

**AI Integration stack:** OpenRouter via `@openrouter/ai-sdk-provider` + Vercel AI SDK 5. The AI thread writer uses streaming (SSE). Do NOT use direct OpenAI — always import from `@openrouter/ai-sdk-provider`.

---

## System Design — The Single-Variable Architecture

The user's **X subscription status** is the sole variable that controls available post lengths. AstraPost's own plan tiers (Free, Pro, Agency) do **not** gate post length — they gate AI features, analytics, and other tools via `require-plan.ts`. Post length is determined exclusively by the connected X account's subscription tier.

### Feature Matrix

| User's X Status                                     | Manual Typing Limit | AI Length Options                                    | Thread Mode           |
| --------------------------------------------------- | ------------------- | ---------------------------------------------------- | --------------------- |
| **Free X** (`None`)                                 | 280 characters      | Short (≤280) only                                    | Yes (each tweet ≤280) |
| **X Premium** (`Basic` / `Premium` / `PremiumPlus`) | 2,000 characters    | Short (≤280), Medium (281–1,000), Long (1,001–2,000) | Yes (each tweet ≤280) |

### Why 2,000 — Not 25,000

X Premium technically allows up to 25,000 characters. However, engagement data consistently shows diminishing returns beyond ~2,000 characters. By capping at 2,000, the platform nudges users toward content lengths that actually perform well. This is a product feature, not a limitation. Update the existing `getMaxCharacterLimit()` helper accordingly:

```typescript
export function getMaxCharacterLimit(tier: XSubscriptionTier | null): number {
  return canPostLongContent(tier) ? 2_000 : 280;
}
```

**Important:** This changes the return value from the previous phase (which returned 25,000). Update this now — the 2,000 cap is the final design decision.

---

## Implementation Phases

### Phase 1: Update Core Helpers & Add Length Option Types

**Files:** `src/lib/schemas/common.ts`, and a new file `src/lib/x-post-length.ts`

#### 1A: Update `getMaxCharacterLimit()`

Change the return value from `25_000` to `2_000` in the existing helper.

#### 1B: Define AI Length Options

Create `src/lib/x-post-length.ts` — a centralized module for all length-related types and logic:

```typescript
import { type XSubscriptionTier } from "@/lib/schemas/common";

// --- Length option definitions ---

export const AI_LENGTH_OPTIONS = {
  short: {
    id: "short",
    label: "Short",
    description: "Punchy, high-engagement tweet",
    maxChars: 280,
    minChars: 1,
    requiresPremium: false,
  },
  medium: {
    id: "medium",
    label: "Medium",
    description: "Nuanced take, mini-essay, or detailed opinion",
    maxChars: 1_000,
    minChars: 281,
    requiresPremium: true,
  },
  long: {
    id: "long",
    label: "Long",
    description: "Thought leadership, in-depth analysis, or storytelling",
    maxChars: 2_000,
    minChars: 1_001,
    requiresPremium: true,
  },
} as const;

export type AiLengthOptionId = keyof typeof AI_LENGTH_OPTIONS;

// --- Helpers ---

export function getAvailableLengthOptions(tier: XSubscriptionTier | null) {
  if (canPostLongContent(tier)) {
    return [AI_LENGTH_OPTIONS.short, AI_LENGTH_OPTIONS.medium, AI_LENGTH_OPTIONS.long];
  }
  return [AI_LENGTH_OPTIONS.short];
}

export function isLengthOptionAllowed(
  optionId: AiLengthOptionId,
  tier: XSubscriptionTier | null
): boolean {
  const option = AI_LENGTH_OPTIONS[optionId];
  return !option.requiresPremium || canPostLongContent(tier);
}
```

#### 1C: Add Zod Schema for Length Option

**File:** `src/lib/schemas/common.ts`

```typescript
export const aiLengthOptionEnum = z.enum(["short", "medium", "long"]);
export type AiLengthOptionId = z.infer<typeof aiLengthOptionEnum>;
```

Run `pnpm lint && pnpm typecheck`.

---

### Phase 2: AI Thread Writer Endpoint — Length-Aware Generation

**File:** `src/app/api/ai/thread/route.ts`

This endpoint currently generates threads (multi-tweet) where each tweet is ≤280 characters. Modify it to support **two generation modes**: Thread Mode (existing) and Single Post Mode (new).

#### 2A: Update the Request Schema

Add `lengthOption` and `mode` to the request body validation:

```typescript
const requestSchema = z.object({
  // ... existing fields: topic, tone, language, threadLength, etc.
  mode: z.enum(["thread", "single"]).default("thread"),
  lengthOption: aiLengthOptionEnum.default("short"),
});
```

- `mode: "thread"` — existing behavior, generates multi-tweet thread, each tweet ≤280 chars. The `lengthOption` field is ignored in thread mode.
- `mode: "single"` — new behavior, generates a single post at the specified length target.

#### 2B: Validate Length Option Against X Tier

After authentication (via `aiPreamble()` or session check), look up the user's selected X account and its `xSubscriptionTier`. **Before calling the AI:**

1. If `mode === "single"` and `lengthOption !== "short"`, verify that the target X account has a Premium tier (`canPostLongContent(tier)`).
2. If the tier doesn't support the requested length, return an appropriate error:
   ```typescript
   return ApiError.forbidden(
     "Medium and Long post options require an X Premium subscription. Your connected X account is on the Free tier."
   );
   ```
3. If the tier data is stale (check `x_subscription_tier_updated_at` — older than 24 hours), re-fetch it by calling `fetchXSubscriptionTier()` before validating. This is the **staleness threshold check** — lightweight and only triggered when the cached data is old.

#### 2C: Construct the AI Prompt Based on Length

The AI system prompt must be different for each length target. This is critical for output quality — you are not just changing a character count constraint, you are changing the writing style and structure.

**Short (≤280 chars) — System Prompt Guidance:**

- Focus on: one powerful idea, a hook that stops the scroll, punchy language
- Constraints: stay under 280 characters including any hashtags
- Style: concise, impactful, every word earns its place
- Techniques: rhetorical questions, bold statements, numbered lists (1-3 items max), strategic line breaks

**Medium (281–1,000 chars) — System Prompt Guidance:**

- Focus on: developed take with clear structure — opening hook, developed middle, strong closer
- Constraints: target 500–900 characters (leave room for editing), never exceed 1,000
- Style: conversational authority, smooth paragraph transitions
- Structure: 2-3 short paragraphs, or a hook → point → evidence → takeaway flow
- Techniques: storytelling opening, data points, contrarian framing, end with a call-to-action or question

**Long (1,001–2,000 chars) — System Prompt Guidance:**

- Focus on: thought leadership, in-depth analysis, storytelling, detailed explainers
- Constraints: target 1,200–1,800 characters, never exceed 2,000
- Style: authoritative yet accessible, clear section breaks using line breaks
- Structure: hook paragraph → 2-3 developed points → conclusion with takeaway
- Techniques: anecdotal opening, numbered insights, "Here's what most people miss:" patterns, end with a forward-looking statement or CTA

**Thread Mode — System Prompt Guidance (unchanged from existing):**

- Each tweet ≤280 characters
- Numbered format (1/N, 2/N...)
- First tweet is a compelling hook
- Smooth transitions between tweets
- Last tweet summarizes or has a CTA

Build these as template functions in a new file `src/lib/ai/length-prompts.ts` that returns the appropriate system prompt segment based on the length option. This keeps the route handler thin and the prompts maintainable.

#### 2D: Handle the AI Response

- For `mode: "thread"` — response handling is unchanged (streaming array of tweets).
- For `mode: "single"` — the AI returns a single text block. Validate that the output respects the character limit for the selected option. If the AI overshoots (it sometimes does), truncate gracefully or regenerate. **Do not silently publish content that exceeds the target range.**

#### 2E: Apply to Other AI Endpoints (if applicable)

Check whether these endpoints also generate tweet content that needs length awareness:

- `POST /api/ai/tools` — general AI writing tools
- `POST /api/ai/inspire` — content inspiration (rephrase, expand, etc.)
- `POST /api/ai/variants` — A/B variant generator

If any of these generate single-post content, apply the same `lengthOption` parameter and tier validation pattern. If they only produce ≤280-char output, leave them unchanged for now and add a `// TODO: add length options in future iteration` comment.

Run `pnpm lint && pnpm typecheck`.

---

### Phase 3: Composer — Dynamic Character Limit

This is the most user-facing change. The composer must feel different for Premium users without breaking the Free user experience.

#### 3A: Locate and Replace the Hardcoded 280-Char Limit

**Files:** `src/components/composer/composer.tsx`, `src/components/composer/tweet-card.tsx`

Search the codebase for every instance of the number `280` used as a character limit. Common patterns:

- `const MAX_CHARS = 280;`
- `if (text.length > 280)`
- Character counter displaying `${count}/280`
- Zod validation schemas with `.max(280)`

Replace each instance with a dynamic value derived from the selected X account's tier:

```typescript
const maxChars = getMaxCharacterLimit(selectedAccount?.xSubscriptionTier ?? null);
```

**Critical:** In Thread Mode, each individual tweet card still enforces 280 characters regardless of tier — threads are a multi-tweet format where each tweet is a standard-length post. The dynamic limit (2,000) applies only to **single-post mode** in the composer.

#### 3B: Dynamic Character Counter

**File:** `src/components/composer/tweet-card.tsx`

The character counter must adapt to the tier:

**For Free X users (280 limit):**

- Counter shows: `142/280`
- Turns yellow at 250, red at 280+
- Behavior unchanged from current implementation

**For Premium X users in single-post mode (2,000 limit):**

- Counter shows: `856/2,000`
- Add a **soft milestone marker at 280** — a subtle visual tick mark or color shift in the progress indicator, with a tiny label like "280" to show where the classic tweet length falls. This helps users who are used to thinking in 280-char units.
- Turns yellow at 1,800, red at 2,000+
- Below the counter, show the current length zone as a muted label:
  - 1–280: `"Short post"`
  - 281–1,000: `"Medium post"`
  - 1,001–2,000: `"Long post"`

**For Premium X users in Thread Mode:**

- Each tweet card shows `142/280` — same as Free users. The per-tweet limit doesn't change in threads.

#### 3C: Replace the 280-Char Warning Message

**Current message (for everyone):**

> _"X Premium required for long posts. One or more of your tweets exceeds 280 characters. Standard X accounts are limited to 280 characters per tweet — posts beyond this limit will only publish successfully on X Premium accounts. If you're on a standard account, these tweets will fail and appear as errors in your queue."_

**New behavior:**

1. **Free X user exceeds 280 chars:** Show the existing warning message unchanged. Additionally, add a subtle suggestion: _"Tip: Use Thread Mode to split your content into multiple tweets."_

2. **Premium X user exceeds 2,000 chars:** Show a new warning: _"Your post exceeds the 2,000-character recommended limit. While your X Premium account supports up to 25,000 characters, posts beyond 2,000 characters tend to see significantly lower engagement. Consider trimming your content or converting to a thread."_ — Use a yellow/amber `Alert` tone, not a blocking red error. Allow the user to proceed if they choose (soft warning, not hard block).

3. **Premium X user between 281–2,000 chars in single-post mode:** No warning. This is expected behavior. The `XSubscriptionBadge` near the counter (from Phase 2) is sufficient context.

4. **Premium X user exceeds 280 in Thread Mode (per-tweet):** Show a per-tweet warning: _"This tweet exceeds 280 characters. Even with X Premium, individual tweets in a thread are limited to 280 characters. Shorten this tweet or move content to the next one."_

#### 3D: Mode Selector in Composer

If the composer doesn't already have a Thread/Single toggle, add one. If it does (likely — the composer supports both single tweets and threads), ensure the mode selection interacts correctly with the character limit:

- **Single Post mode selected + Free user:** 280-char limit, no length options
- **Single Post mode selected + Premium user:** 2,000-char limit, AI length options available
- **Thread Mode selected (any user):** Each tweet card enforces 280 chars

#### 3E: Multi-Account Mixed Tiers

When a user selects multiple target X accounts for a post (the multi-account feature exists):

1. Determine the **most restrictive** account's tier.
2. Apply that tier's character limit.
3. Show a contextual note if accounts have different tiers: _"Character limit set to 280 based on @freeaccount. To use longer posts, remove free-tier accounts or post separately."_
4. The `XSubscriptionBadge` next to each account in the selector (from Phase 2) makes the tier difference visible at a glance.

Run `pnpm lint && pnpm typecheck`.

---

### Phase 4: AI Length Selector UI in Composer

Add a length option selector that appears in the composer's AI generation panel for Premium X users.

#### 4A: Length Selector Component

**File:** `src/components/composer/ai-length-selector.tsx`

Create a new component:

```typescript
interface AiLengthSelectorProps {
  selectedLength: AiLengthOptionId;
  onLengthChange: (length: AiLengthOptionId) => void;
  xSubscriptionTier: XSubscriptionTier | null;
}
```

**Visual design:**

Render as a **segmented control** (3 horizontal buttons, only one active at a time) — similar to how tone selection might already work in the AI writer:

```
┌─────────┬──────────┬─────────┐
│  Short  │  Medium  │  Long   │
│  ≤280   │ 281–1K   │ 1K–2K   │
└─────────┴──────────┴─────────┘
```

**Behavior:**

- **Free X user:** Only "Short" is enabled. "Medium" and "Long" are visible but disabled (grayed out) with a lock icon and tooltip: _"Requires X Premium subscription"_. Showing disabled options (rather than hiding them) is a deliberate UX choice — it signals that the capability exists and gives Free users a reason to consider X Premium.
- **Premium X user:** All three options are enabled and selectable.
- Default selection: `"short"` for all users.
- Below the selector, show a one-line description of the selected option (from `AI_LENGTH_OPTIONS[selected].description`).

**Styling:**

- Use shadcn/ui `ToggleGroup` or a custom segmented control with Tailwind.
- Active segment: `bg-primary text-primary-foreground`
- Inactive segment: `bg-muted text-muted-foreground`
- Disabled segment: `opacity-50 cursor-not-allowed`
- Support dark mode.

#### 4B: Integrate Length Selector into Composer AI Panel

**File:** `src/components/composer/composer.tsx`

The composer has an inline AI panel (on desktop) for generating content. Add the `AiLengthSelector` into this panel:

1. Place it **after** the tone/language selectors and **before** the "Generate" button.
2. Only render it when the composer is in **Single Post mode** (not Thread Mode). In Thread Mode, the length is controlled by thread length (3–15 tweets), not by a length option.
3. Pass the selected X account's `xSubscriptionTier` to the component.
4. When the user clicks "Generate," include the `lengthOption` and `mode` values in the request to `POST /api/ai/thread`.

#### 4C: Also Integrate into the AI Writer Page

**File:** `src/app/dashboard/ai/writer/page.tsx` (or its client component)

The dedicated AI writer page (`/dashboard/ai/writer`) has a Thread tab. Add the length selector here as well, following the same pattern — visible in Single Post mode, hidden in Thread mode.

Run `pnpm lint && pnpm typecheck`.

---

### Phase 5: BullMQ Recurring Job — Daily Tier Refresh

Add a background job that refreshes X subscription tiers for all connected accounts once per day. This ensures the cached tier stays fresh even if users don't manually refresh.

#### 5A: Define the Job Type

**File:** `src/lib/queue/client.ts`

Add a new job type:

```typescript
export interface RefreshXTiersJobPayload {
  triggeredBy: "scheduler"; // distinguishes from manual refreshes
}
```

Add a new queue name or use the existing queue with a distinct job name (follow the existing pattern in the file — check whether the project uses one shared queue or multiple named queues).

#### 5B: Add the Processor

**File:** `src/lib/queue/processors.ts`

Add a processor for the tier refresh job:

1. Query all `x_accounts` rows where `x_subscription_tier_updated_at` is older than 24 hours OR is null.
2. For each account, call `fetchXSubscriptionTier()` with a short delay between calls (e.g., 500ms) to avoid hammering the X API rate limit.
3. Log each refresh result via the structured logger.
4. If a token is expired (401 from X API), log a warning but do not fail the job — skip that account and continue.
5. Write a summary to the `job_runs` table for observability (total accounts checked, updated, skipped, errors).

#### 5C: Schedule the Recurring Job

**File:** `scripts/worker.ts`

In the worker entry point, add a BullMQ repeatable job that runs the tier refresh daily:

```typescript
await queue.add(
  "refresh-x-tiers",
  { triggeredBy: "scheduler" },
  {
    repeat: { pattern: "0 4 * * *" }, // 4:00 AM UTC daily — low-traffic time
    removeOnComplete: 50, // keep last 50 completed jobs
    removeOnFail: 20,
  }
);
```

Follow the existing pattern in `worker.ts` for how repeatable jobs are registered (if any exist). If this is the first repeatable job, set the pattern carefully and add a comment explaining the schedule.

#### 5D: Staleness Check Before AI Generation

This is not a new job — it's a lightweight inline check. In the AI thread writer route (`POST /api/ai/thread`), before validating the length option against the tier:

1. Read `x_subscription_tier_updated_at` for the target account.
2. If it's older than 24 hours, call `fetchXSubscriptionTier()` to refresh it.
3. Use the freshly fetched tier for validation.

This ensures that even if the daily job hasn't run yet, the tier is verified before generating content that may be unpublishable.

Run `pnpm lint && pnpm typecheck`.

---

### Phase 6: Worker Pre-Publish Tier Verification

This prevents the scenario where a user generates a 1,200-char post, saves it as a draft, their X Premium lapses, and the worker attempts to publish content that X will reject.

#### 6A: Add Tier Check to the Publish Processor

**File:** `src/lib/queue/processors.ts`

In the existing `publish-post` job processor (or equivalent), add a pre-publish check:

1. Before calling the X API to publish, load the target X account's `xSubscriptionTier`.
2. Check: does the post content length exceed 280 characters AND is the account on the Free tier?
3. **If yes — content too long for tier:**
   - Do NOT attempt to publish (it will fail at X's API anyway).
   - Mark the job as failed with a clear, structured error:
     ```json
     {
       "code": "TIER_LIMIT_EXCEEDED",
       "message": "Post exceeds 280 characters but the target X account (@username) is on the Free tier. X Premium is required for posts longer than 280 characters.",
       "postLength": 1247,
       "accountTier": "None",
       "maxAllowed": 280
     }
     ```
   - Write this to the `job_runs` table for observability.
   - This error should surface in the Queue page with the contextual failure tip banner (already implemented in Phase 2's Queue integration).
4. **If no — content within tier limit:** Proceed with publishing as normal.

#### 6B: Handle Tier Change Notifications

When the daily refresh job (Phase 5) detects a tier **downgrade** (e.g., `Premium` → `None`), check if the user has any pending/scheduled posts that exceed 280 characters:

1. Query `posts` table for that user's posts with status `scheduled` or `pending`, joined with `tweets` to check character lengths.
2. If any post exceeds the new limit, create an in-app notification (using the existing `notifications` service at `src/lib/services/notifications.ts`):
   > _"Your X Premium subscription for @username is no longer active. You have N scheduled posts that exceed 280 characters — these will fail to publish. Please edit or convert them to threads before their scheduled time."_
3. Optionally, send an email notification using the existing Resend email service if the user has email notifications enabled.

This is a proactive grace period — the user gets warned before posts actually fail.

Run `pnpm lint && pnpm typecheck`.

---

### Phase 7: Update Existing Warning & Error Messages

#### 7A: Queue Page Failure Banners

**Files:** Queue components in `src/components/queue/`

The Queue page already has contextual failure tip banners (401/403/rate-limit/duplicate). Add a new banner type for `TIER_LIMIT_EXCEEDED`:

- **Icon:** The `XSubscriptionBadge` (gray, indicating Free tier) at `size="md"`
- **Title:** `"Post too long for Free X account"`
- **Body:** `"This post is {length} characters but @{username} is on the Free X tier (280-character limit). Edit the post to shorten it, convert it to a thread, or upgrade to X Premium."`
- **Actions:** Two buttons:
  - `"Edit Post"` → navigates to composer with the post loaded
  - `"Convert to Thread"` → if technically feasible, auto-split the content into a thread (nice-to-have; if too complex, just offer the edit button)

#### 7B: Tier Downgrade Toast

When a user's tier changes from Premium to Free (detected by the daily refresh or manual refresh), show a toast notification via `sonner` (already in the project):

> _"Your X Premium subscription for @username is no longer active. Medium and Long post options have been disabled."_

This should trigger on the frontend when the Zustand store detects the tier change (after a refresh API call completes with a different tier than what was stored).

Run `pnpm lint && pnpm typecheck`.

---

### Phase 8: Verification Tests (Vitest)

Add focused tests to confirm the new logic. Follow existing test patterns — co-locate tests with implementation files.

#### 8A: Length Option Helpers

**File:** `src/lib/x-post-length.test.ts`

```
- getAvailableLengthOptions("None")        → returns [short] only
- getAvailableLengthOptions(null)           → returns [short] only
- getAvailableLengthOptions("Basic")        → returns [short, medium, long]
- getAvailableLengthOptions("Premium")      → returns [short, medium, long]
- getAvailableLengthOptions("PremiumPlus")  → returns [short, medium, long]
- isLengthOptionAllowed("medium", "None")   → false
- isLengthOptionAllowed("medium", "Premium")→ true
- isLengthOptionAllowed("short", "None")    → true
- isLengthOptionAllowed("long", null)       → false
```

#### 8B: Updated `getMaxCharacterLimit`

**File:** Update existing test file or add to `src/lib/x-post-length.test.ts`

```
- getMaxCharacterLimit("None")          → 280
- getMaxCharacterLimit(null)            → 280
- getMaxCharacterLimit("Basic")         → 2_000
- getMaxCharacterLimit("Premium")       → 2_000
- getMaxCharacterLimit("PremiumPlus")   → 2_000
```

**Note:** This verifies the updated return value (2,000 instead of the previous 25,000).

#### 8C: AI Route Tier Validation

**File:** `src/app/api/ai/thread/route.test.ts` (create or extend)

Mock the session, X account data, and AI response. Test:

1. `mode: "single", lengthOption: "medium"` with Free tier → returns 403 error
2. `mode: "single", lengthOption: "medium"` with Premium tier → proceeds to generation
3. `mode: "single", lengthOption: "short"` with Free tier → proceeds (short is universal)
4. `mode: "thread"` with Free tier → proceeds (thread mode is universal)
5. `mode: "single", lengthOption: "long"` with stale tier (>24h) → triggers re-fetch before validation

#### 8D: Pre-Publish Tier Check

**File:** `src/lib/queue/processors.test.ts` (extend existing)

Mock the post data and X account tier. Test:

1. Post with 500 chars + Free tier → job fails with `TIER_LIMIT_EXCEEDED`
2. Post with 500 chars + Premium tier → job proceeds
3. Post with 200 chars + Free tier → job proceeds (within 280 limit)
4. Post with 200 chars + Premium tier → job proceeds

Run `pnpm test` to confirm all tests pass.

---

## Architectural Rules — MUST Follow

1. **`ApiError` for all error responses** — never `new Response(JSON.stringify(...))` or `NextResponse.json()`.
2. **`db.transaction()` for multi-table writes** — wrap any multi-table operations.
3. **Never call `getPlanLimits()` in route handlers** — use `require-plan.ts` for AstraPost plan gates. Post length gating is separate (based on X tier, not AstraPost plan).
4. **`exactOptionalPropertyTypes`** — use the conditional spread pattern for optional props.
5. **Server Components by default** — `"use client"` only when genuinely needed.
6. **Tailwind + shadcn/ui color tokens** — support dark mode everywhere.
7. **OpenRouter for AI** — import from `@openrouter/ai-sdk-provider`, never direct OpenAI.
8. **Structured logger** — `@/lib/logger`, not `console.log`.
9. **Run `pnpm lint && pnpm typecheck` after every phase.**
10. **Never start the dev server** — ask the user if you need runtime output.
11. **Read existing code before modifying** — understand current patterns in each file before making changes.
12. **AI prompts in dedicated file** — `src/lib/ai/length-prompts.ts`, not inline in the route handler.

---

## What NOT To Do

- **Do NOT remove Thread Mode for anyone.** It stays available to all users as a universal feature.
- **Do NOT allow posts over 2,000 characters.** The 25,000 X Premium limit exists but we intentionally cap at 2,000 for engagement reasons. The only exception is the soft warning at 2,000 that allows the user to proceed — but the AI should never generate beyond 2,000.
- **Do NOT gate length options behind AstraPost plan tiers** (Free/Pro/Agency). Length is gated solely by X subscription tier.
- **Do NOT poll the X API continuously.** Daily BullMQ job + staleness check before generation is sufficient.
- **Do NOT install new npm packages.** Use existing dependencies (fetch, BullMQ, Zod, shadcn/ui, sonner, date-fns).
- **Do NOT modify the AI streaming mechanism.** The SSE streaming pattern for the thread writer must be preserved. Single-post mode can stream too (progressive text display) or return a complete response — follow whichever pattern is simpler given the existing infrastructure.

---

## Deliverables Checklist

- [x] **`getMaxCharacterLimit()` updated** — returns 2,000 (not 25,000) for Premium tiers
- [x] **`src/lib/x-post-length.ts` created** — `AI_LENGTH_OPTIONS`, `getAvailableLengthOptions()`, `isLengthOptionAllowed()`
- [x] **`aiLengthOptionEnum` Zod schema** added to `common.ts`
- [x] **`POST /api/ai/thread` updated** — accepts `mode` and `lengthOption`, validates against X tier, staleness check
- [x] **`src/lib/ai/length-prompts.ts` created** — length-specific AI system prompt templates (Short, Medium, Long, Thread)
- [x] **Composer: dynamic character limit** — 280 for Free, 2,000 for Premium in single-post mode, 280 per tweet in thread mode
- [x] **Composer: character counter** — adaptive counter with 280 milestone marker for Premium, length zone labels
- [x] **Composer: warning messages updated** — Free users get existing message + thread tip, Premium users get soft 2,000 warning, thread mode gets per-tweet warning
- [x] **Composer: multi-account mixed tier** — most restrictive tier applied, contextual note shown
- [x] **`AiLengthSelector` component created** — segmented control with disabled states for Free users
- [x] **Length selector integrated** — in composer AI panel (single-post mode only) and AI writer page
- [x] **BullMQ recurring job** — `refresh-x-tiers` runs daily at 4 AM UTC (`scripts/worker.ts`), `refreshXTiersProcessor` queries stale accounts with 500ms inter-call delay
- [x] **Worker pre-publish tier check** — `TIER_LIMIT_EXCEEDED` structured error in `scheduleProcessor`, post marked `failed`, job run recorded, user notification created, `UnrecoverableError` thrown
- [x] **Tier downgrade notification** — `refreshXTiersProcessor` detects Premium→Free downgrade, queries scheduled posts >280 chars, inserts `tier_downgrade_warning` notification
- [x] **Queue failure banner** — `queue-content.tsx` detects `TIER_LIMIT_EXCEEDED` in `failReason`, shows `XSubscriptionBadge` + "Edit Post" / "Convert to Thread" action buttons
- [x] **Tier downgrade toast** — `notification-bell.tsx` fires `toast.warning()` with "View Queue" action when `tier_downgrade_warning` notification is received
- [x] **Vitest tests pass** — 147 tests across 14 files, all passing (2026-03-31)
- [x] **`pnpm lint && pnpm typecheck && pnpm test`** — all three pass cleanly (2026-03-31)

---

## Verification Report — 2026-03-31

**Verified by:** Claude Code
**Method:** Direct file inspection of all implementation files

### Phase 1 ✅ Complete

- `src/lib/services/x-subscription.ts`: `getMaxCharacterLimit()` correctly returns `2_000` for Premium tiers (was 25,000 in initial Phase 6 of tier detection feature).
- `src/lib/x-post-length.ts`: `AI_LENGTH_OPTIONS`, `getAvailableLengthOptions()`, `isLengthOptionAllowed()` all present and correct.
- `src/lib/schemas/common.ts`: `aiLengthOptionEnum` and `AiLengthOptionId` type exported.

### Phase 2 ✅ Complete

- `src/app/api/ai/thread/route.ts`: Request schema includes `mode` and `lengthOption`. Tier validation blocks non-short options for Free accounts with correct `ApiError.forbidden()`. Staleness check (24h) triggers inline `XApiService.fetchXSubscriptionTier()` before validation. Length-specific prompts built via `getLengthPrompt()` from `src/lib/ai/length-prompts.ts`. Single-post streaming uses plain text (`Content-Type: text/plain`); thread mode uses SSE.

### Phase 3 ✅ Complete

- `src/components/composer/tweet-card.tsx`: `maxChars` computed via `getMaxCharacterLimit(tier)`. Thread mode enforces 280 regardless of tier (`isThreadMode ? 280 : getMaxCharacterLimit(tier)`). Character counter shows dynamic limit with length zone labels.

### Phase 4 ✅ Complete

- `src/components/composer/ai-length-selector.tsx`: Segmented control (Short/Medium/Long) with lock icons and tooltips for disabled options. Uses `canPostLongContent()` to gate Medium/Long.
- `src/components/composer/composer.tsx`: `AiLengthSelector` integrated, `aiLengthOption` state sent to API only in single-post mode.
- `src/app/dashboard/ai/writer/page.tsx`: Thread/Single Post mode toggle integrated (per updates log).

### Phase 5 ✅ Complete

- `src/lib/queue/client.ts`: `RefreshXTiersJobPayload`, `xTierRefreshQueue` defined.
- `src/lib/queue/processors.ts`: `refreshXTiersProcessor` queries accounts with stale tier (`>24h` or null), calls `fetchXSubscriptionTier()` per account with 500ms delay, logs summary.
- `scripts/worker.ts`: `xTierRefreshWorker` created, repeatable job scheduled at `0 4 * * *` UTC with `removeOnComplete: { count: 50 }` and `removeOnFail: { count: 20 }`.
- **Staleness check in route:** `src/app/api/ai/thread/route.ts` performs inline tier refresh if cached data >24h old before validating length option. ✅

### Phase 6 ✅ Complete

- `src/lib/queue/processors.ts` (`scheduleProcessor`): Pre-publish check iterates `post.tweets`, compares `content.length` against `maxAllowedChars` (280 or 2,000 based on tier). On failure: post set to `failed` with `failReason`, job run inserted, `notifications` record created (`type: "post_failed"`), `UnrecoverableError` thrown.
- **Tier downgrade notification:** `refreshXTiersProcessor` detects downgrade, queries scheduled posts, creates `tier_downgrade_warning` notification with `postIds` metadata. ✅

### Phase 7 ✅ Complete

- `src/components/queue/queue-content.tsx`: `getFailureTip()` checks `failReason.toLowerCase().includes("tier_limit_exceeded")`, sets `isTierLimit: true`. Banner shows `XSubscriptionBadge` + descriptive message + "Edit Post" and "Convert to Thread" buttons.
- `src/components/dashboard/notification-bell.tsx`: Detects `tier_downgrade_warning` notification type, fires `toast.warning()` with "View Queue" action button and tracks seen IDs to prevent duplicate toasts.

### Phase 8 ✅ Complete (fixed 2026-03-31)

All test files existed but had failures. Root cause: **Zod v4** uses a stricter UUID regex requiring RFC-4122 compliant UUIDs (version `[1-8]` in position 3, variant `[89ab]` in position 4). Test IDs like `00000000-0000-0000-0000-000000000001` fail this check. Fixed by replacing with proper v4-format UUIDs.

Two additional tests were added to `route.test.ts`:

- Stale tier (>24h) triggers `fetchXSubscriptionTier()` re-fetch before validation
- Fresh tier (<24h) skips the re-fetch

Five `getMaxCharacterLimit()` tests added to `x-post-length.test.ts` (Phase 8B requirement).

**Final result:** 147 tests / 14 test files — all passing. `pnpm lint && pnpm typecheck && pnpm test` ✅

---

## Summary

This implementation transforms AstraPost from a 280-char-only platform into a tier-aware content creation tool:

| What Changes           | Free X Users           | Premium X Users                  |
| ---------------------- | ---------------------- | -------------------------------- |
| **Manual typing**      | 280 chars (unchanged)  | Up to 2,000 chars                |
| **AI generation**      | Short only (unchanged) | Short + Medium + Long            |
| **Thread Mode**        | Available (unchanged)  | Available (unchanged)            |
| **Character counter**  | `N/280` (unchanged)    | `N/2,000` with 280 milestone     |
| **Pre-publish check**  | 280 enforced           | Tier re-verified, 2,000 enforced |
| **Background refresh** | N/A                    | Daily tier sync via BullMQ       |

The architecture is clean: **one variable (X subscription tier) controls one behavior (post length)**. No entangling with AstraPost's own plan system, no complex feature matrices, no user confusion.

Implement all phases in order. Run `pnpm lint && pnpm typecheck` after each phase. Run `pnpm test` after Phase 8 to confirm all tests pass.
