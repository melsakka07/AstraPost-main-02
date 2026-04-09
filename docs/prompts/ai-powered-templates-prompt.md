# AstraPost — AI-Powered Templates Feature Prompt

> **Purpose:** Use this prompt with an LLM (Claude, etc.) to upgrade the existing Templates feature in the AstraPost Composer from a static placeholder-based system to an AI-driven content generation flow. Paste this prompt along with your project's `README.md` and `CLAUDE.md` files.

---

## Context

You are working on **AstraPost**, an AI-powered social media scheduling platform. The project already has:

- **AI infrastructure:** OpenRouter via `@openrouter/ai-sdk-provider` + Vercel AI SDK 5 for streaming content generation. The shared AI pipeline lives in `src/lib/api/ai-preamble.ts` (handles auth, rate-limiting, plan gating, quota checking, and model instantiation). Google Gemini is used for chat/inspiration features.
- **Existing template system:** 5 built-in system templates (How-To Guide, Personal Story, Contrarian Take, Curated List, Product Launch) and user-saved custom templates. Templates currently work as static text with placeholders like `[SKILL]`, `[NUMBER]`, `[TOPIC]` that the user must manually find-and-replace.
- **Existing AI content generation patterns:** The AI Thread Writer (`POST /api/ai/thread`) already generates full tweet threads from a topic with tone/language selection and streaming output (tweets appear one by one via SSE). The AI Inspiration feature generates content ideas. The A/B Variant Generator produces multiple tweet angles.
- **Plan gating:** AI features are gated by plan via `require-plan.ts`. Free users have limited AI credits; Pro/Agency users have higher or unlimited quotas. AI usage is tracked in the `ai_generations` table.

### Tech Stack (relevant subset)

- **Framework:** Next.js 16 (App Router), React 19, TypeScript (strict mode)
- **AI:** OpenRouter + Vercel AI SDK 5 (streaming via `streamText()`)
- **UI:** shadcn/ui + Tailwind CSS 4, dark mode supported
- **Forms:** React Hook Form + Zod
- **State:** Zustand
- **Database:** PostgreSQL 18 + Drizzle ORM
- **Composer:** The tweet/thread composer is at `src/app/dashboard/compose/page.tsx` with components in `src/components/composer/`. Templates dialog is part of the composer sidebar under "Content Tools."

### Existing Template Files (read these during implementation)

- `src/components/composer/templates-dialog.tsx` (or similar) — the current template picker UI
- `src/lib/templates.ts` — template utilities and system template definitions
- `src/lib/schema.ts` — `templates` table schema (user-saved templates)
- `src/app/api/ai/thread/route.ts` — the existing AI thread writer (reference for streaming pattern)
- `src/lib/api/ai-preamble.ts` — shared AI route pipeline (use this for the new endpoint)
- `src/components/composer/composer.tsx` — main composer component

---

## Objective

Transform the template system from a **static placeholder flow** (user picks a template → manually edits `[PLACEHOLDER]` text) into an **AI-driven generation flow** (user picks a template → provides a topic and minimal context → AI generates ready-to-publish content shaped by that template's structure).

The current flow requires the user to do the creative work of filling in placeholders. The new flow should make the AI do the creative work while the user provides direction.

---

## Current Flow (Being Replaced)

1. User opens Templates dialog in the Composer sidebar.
2. User picks a system template (e.g., "How-To Guide").
3. Template text with placeholders is inserted into the editor: `"Here's how to master [SKILL] in [NUMBER] steps: 1. [STEP_1] 2. [STEP_2]..."`
4. User manually finds and replaces every `[PLACEHOLDER]` with real content.
5. User publishes.

**Problems:** Tedious, defeats the purpose of having AI in the platform, produces inconsistent quality, users often leave placeholders unfilled.

---

## New Flow (To Be Implemented)

1. User opens the Templates dialog in the Composer sidebar.
2. User selects a system template (e.g., "How-To Guide").
3. Instead of inserting placeholder text, a **generation form** appears with:
   - **Topic** (required text input): What the content is about. Example: "Time management for remote developers."
   - **Tone** (optional select): Reuse the existing tone options from the AI Thread Writer (Professional, Casual, Educational, Inspirational, Humorous, Viral, Controversial). Default to a sensible tone per template (e.g., Educational for How-To Guide).
   - **Language** (optional select): Reuse the existing language options (Arabic, English, French, etc.). Default to the user's profile language.
   - **Output format** (optional select): "Single Tweet", "Thread (3–5 tweets)", "Thread (5–10 tweets)". Default varies by template (e.g., How-To Guide defaults to thread, Contrarian Take defaults to single tweet).
4. User clicks **"Generate with AI"**.
5. AI generates content **structured according to the selected template's pattern** and streams it into the Composer (using the same streaming pattern as the AI Thread Writer — tweets appear one by one).
6. User reviews, edits if desired, and publishes.

**The key insight:** Each system template becomes an AI prompt template — a structured instruction that tells the AI _how_ to shape the output (not just _what_ to write about). The template defines the content structure; the user provides the topic; the AI does the writing.

---

## Requirements

### Backend

**New API Endpoint: `POST /api/ai/template-generate`**

- Use the `aiPreamble()` pipeline from `src/lib/api/ai-preamble.ts` for auth, rate-limiting, plan gating, quota tracking, and model instantiation.
- Request body (validate with Zod):
  ```
  {
    templateId: string     // system template identifier (e.g., "how-to-guide")
    topic: string          // user's topic (required, 3–500 chars)
    tone: string           // optional, defaults per template
    language: string       // optional, defaults to user's profile language
    outputFormat: "single" | "thread-short" | "thread-long"  // optional
  }
  ```
- For each system template, define a **structured AI prompt** that instructs the model to generate content following that template's pattern. These prompt templates should be stored in a dedicated file (e.g., `src/lib/ai/template-prompts.ts`), not inline in the route handler. Each prompt template should:
  - Describe the content structure (e.g., "Write a how-to thread with a hook tweet, numbered steps, and a closing CTA").
  - Include the user's topic, tone, and language.
  - Specify tweet-level constraints (280 chars per tweet for X, or appropriate limits for other platforms).
  - Request the output in a parseable format (e.g., tweets separated by a delimiter, or JSON array) so they can be streamed into the Composer as individual tweet cards.
- Use `streamText()` from the Vercel AI SDK for streaming output (same pattern as the thread writer).
- Track the generation in the `ai_generations` table with type `"template"` (or a new type value).
- Deduct from the user's AI quota.
- Return a streaming response.

**Template Prompt Design (one per system template):**

Each system template should map to a carefully crafted AI prompt. Here are the 5 templates and what their AI prompts should produce:

| Template            | AI Prompt Goal                                                                                                                                                                                 | Default Tone  | Default Format |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------- |
| **How-To Guide**    | A step-by-step instructional thread. Hook tweet stating the skill/outcome, numbered steps (one per tweet), closing tweet with encouragement or CTA.                                            | Educational   | Thread (3–5)   |
| **Personal Story**  | A narrative thread. Hook tweet with a relatable or surprising opener, body tweets telling the story chronologically, closing tweet with the lesson or takeaway.                                | Casual        | Thread (3–5)   |
| **Contrarian Take** | A bold single tweet or short thread. Opening tweet with the contrarian opinion stated clearly, optional supporting tweets with evidence/reasoning, closing with a question or call for debate. | Viral         | Single Tweet   |
| **Curated List**    | A listicle thread. Hook tweet framing the list ("X tools/books/tips for Y"), numbered items (one per tweet with a brief description of each), closing tweet with a summary or bonus pick.      | Professional  | Thread (5–10)  |
| **Product Launch**  | A launch announcement thread. Hook tweet with the big news, feature/benefit tweets, social proof or early results tweet, closing with CTA (link, signup, etc.).                                | Inspirational | Thread (3–5)   |

The AI prompts should be detailed enough to consistently produce well-structured content but flexible enough to handle any topic. Reference the project's existing AI prompt patterns in the thread writer for style.

### Frontend

**Updated Templates Dialog:**

- When the user selects a system template, transition from the template list view to a **generation form view** within the same dialog (or as a second step/panel — do not open a separate modal).
- The generation form contains:
  - Template name and brief description at the top (so the user remembers what they picked).
  - **Topic** text input (required). Placeholder text should be template-specific. Examples: "e.g., Time management for remote developers" for How-To Guide, "e.g., How I landed my first freelance client" for Personal Story.
  - **Tone** select dropdown (pre-filled with the template's default tone, changeable).
  - **Language** select dropdown (pre-filled with user's language, changeable).
  - **Output format** select (pre-filled with the template's default, changeable).
  - **"Generate with AI"** button.
  - **"← Back to Templates"** link to go back to the template picker.
- While generating: show a loading/streaming state. If the composer uses the same streaming pattern as the thread writer (tweets appearing one by one), replicate that behavior here.
- After generation: close the dialog and populate the Composer with the generated content (tweets/thread). The user can then edit any tweet before publishing.
- If the user already has content in the Composer, show a confirmation dialog: "This will replace your current content. Continue?" (same pattern used elsewhere in the Composer).

**"My Templates" Tab — No Change:**

- User-saved templates continue to work as before (static insertion, no AI generation). These are the user's own pre-written content — AI generation doesn't apply here.
- Optionally, in a future iteration, allow users to save a generated result as a custom template. This is not required now but keep the architecture open to it.

**Quota & Plan UI:**

- If the user is on the free plan and has exhausted their AI quota, the "Generate with AI" button should be disabled with a message like "AI quota reached. Upgrade to Pro for more." Link to the pricing page or show the upgrade modal.
- Catch 402 responses from the API and display the upgrade modal (same pattern as other AI features).

---

## Technical Constraints & Conventions

Follow all project conventions from `CLAUDE.md`:

1. **AI route pattern:** Use `aiPreamble()` — do not duplicate auth/rate-limit/plan logic.
2. **API errors:** Use `ApiError` from `@/lib/api/errors`.
3. **Streaming:** Use `streamText()` from Vercel AI SDK 5 with the OpenRouter provider. Follow the exact same streaming response pattern used in `src/app/api/ai/thread/route.ts`.
4. **Zod validation:** Validate all inputs. Shared enums for tone and language are in `src/lib/constants.ts` — import from there, never redeclare.
5. **AI generations tracking:** Insert a record into the `ai_generations` table with the appropriate type.
6. **Quota:** Deduct from AI quota using the existing quota service (`src/lib/services/ai-quota.ts`).
7. **Server Components by default.** `"use client"` only where needed (the dialog and form are client components).
8. **Styling:** shadcn/ui components + Tailwind CSS utilities. Support dark mode.
9. **Toasts:** Use `sonner` for success/error notifications.
10. **No new dependencies** unless absolutely necessary. Everything needed (Vercel AI SDK, OpenRouter, shadcn/ui form components, Zod) is already installed.
11. **Run `pnpm lint && pnpm typecheck`** after every batch of changes.

---

## Implementation Phases

### Phase 1 — Backend: AI Template Prompt Engine & API Route

**Goal:** Build the API endpoint and the template prompt definitions.

Tasks:

1. Read the existing template system files (`src/lib/templates.ts`, the templates dialog component) and the AI thread writer (`src/app/api/ai/thread/route.ts`) to understand current patterns.
2. Create `src/lib/ai/template-prompts.ts`:
   - Define a `TemplatePromptConfig` type: `{ id, name, description, defaultTone, defaultFormat, placeholderTopic, buildPrompt(topic, tone, language, format) → string }`.
   - Implement the 5 system template prompt configs with detailed, well-crafted prompts.
   - Export a `getTemplatePrompt(templateId)` lookup function.
3. Create `POST /api/ai/template-generate` route at `src/app/api/ai/template-generate/route.ts`:
   - Use `aiPreamble()` for the auth/plan/quota pipeline.
   - Validate the request body with Zod.
   - Look up the template prompt config by `templateId`.
   - Build the full AI prompt by calling `buildPrompt()` with the user's inputs.
   - Call `streamText()` with the OpenRouter model and return the streaming response.
   - Track the generation in `ai_generations`.
4. Run `pnpm lint && pnpm typecheck`.
5. Create the progress tracking document.

### Phase 2 — Frontend: Updated Templates Dialog with Generation Form

**Goal:** Replace the static template insertion with the AI generation form.

Tasks:

1. Modify the Templates dialog component:
   - Add a state to track the selected system template (`selectedTemplate: TemplatePromptConfig | null`).
   - When a system template card is clicked, instead of inserting text into the editor, transition to the generation form view.
   - Build the generation form (topic input, tone/language/format selects, generate button).
   - Pre-fill defaults from the template config.
2. Implement the "Generate with AI" button handler:
   - Call `POST /api/ai/template-generate` with the form data.
   - Handle the streaming response (reuse/adapt the streaming logic from the thread writer's frontend).
   - On completion, insert the generated tweets into the Composer.
   - Handle the "replace existing content?" confirmation if the Composer is not empty.
3. Handle error states:
   - 402 (plan gate): show the upgrade modal.
   - Network/server errors: show an error toast.
   - Loading state: disable the button, show a spinner or streaming indicator.
4. Ensure "My Templates" tab continues to work as before (no changes to user-saved templates).
5. Run `pnpm lint && pnpm typecheck`.
6. Update the progress document.

### Phase 3 — Polish, Edge Cases & Quality

**Goal:** Refine the UX, test edge cases, and ensure quality.

Tasks:

1. **Prompt quality tuning:** Test each of the 5 templates with various topics. Refine the AI prompts in `template-prompts.ts` to improve output quality, consistency, and adherence to tweet character limits. Pay attention to Arabic content generation quality since this is a MENA-focused platform.
2. **Empty/edge states:**
   - What if the user submits a very vague topic (e.g., "stuff")? The AI should still produce reasonable output, but consider adding a minimum character count on the topic input (e.g., 10 chars).
   - What if the AI produces content exceeding 280 chars per tweet? The prompt should instruct the model to stay within limits, but add a frontend warning if a generated tweet exceeds the limit.
3. **Accessibility:** Ensure the form is keyboard-navigable and screen-reader friendly. Labels on all inputs.
4. **Mobile responsiveness:** The generation form should work well on mobile within the dialog/drawer.
5. **AI generation history:** Verify that template-based generations appear in the AI History page (`/dashboard/ai/history`) with the correct type label.
6. **Quota display:** If the user is near their AI quota limit, show remaining credits near the generate button.
7. Final `pnpm lint && pnpm typecheck`.
8. Update the progress document with final status.

---

## Progress Tracking

Create `docs/features/ai-templates-progress.md` at the start:

```markdown
# AI-Powered Templates — Implementation Progress

## Status: In Progress

## Phase 1 — Backend: AI Template Prompt Engine & API Route

- **Status:** Not Started
- **Files Created:**
- **Files Modified:**
- **Decisions & Notes:**

## Phase 2 — Frontend: Updated Templates Dialog with Generation Form

- **Status:** Not Started
- **Files Created:**
- **Files Modified:**
- **Decisions & Notes:**

## Phase 3 — Polish, Edge Cases & Quality

- **Status:** Not Started
- **Files Created:**
- **Files Modified:**
- **Decisions & Notes:**

## Prompt Quality Notes

[Track refinements to each template's AI prompt here]

## Changelog

| Date | Phase | Change |
| ---- | ----- | ------ |
```

---

## What NOT To Do

- **Do not remove the "My Templates" (user-saved) functionality.** It stays as-is. Only system templates get the AI generation upgrade.
- **Do not create a separate page for AI template generation.** It should live within the existing Templates dialog in the Composer sidebar — the user's workflow should not change location.
- **Do not build a separate AI streaming mechanism.** Reuse the exact streaming pattern from the AI Thread Writer (`src/app/api/ai/thread/route.ts` and its frontend consumer). Consistency matters.
- **Do not duplicate the `aiPreamble()` logic.** Use the shared pipeline.
- **Do not hardcode tone/language options.** Import them from `src/lib/constants.ts`.
- **Do not skip quota tracking.** Every AI template generation must be tracked in `ai_generations` and deducted from the user's quota.
- **Do not over-engineer the prompt system.** 5 well-crafted prompt templates in a single file is sufficient. No need for a prompt management UI, prompt versioning, or dynamic prompt editing.

---

## Deliverables Checklist

- [ ] `src/lib/ai/template-prompts.ts` — 5 template prompt configs with `buildPrompt()` functions
- [ ] `src/app/api/ai/template-generate/route.ts` — streaming AI generation endpoint using `aiPreamble()`
- [ ] Updated templates dialog component — generation form replaces static insertion for system templates
- [ ] Streaming output populates the Composer with generated tweets
- [ ] "Replace existing content?" confirmation dialog when Composer is not empty
- [ ] 402 handling with upgrade modal for quota-exceeded users
- [ ] AI generations tracked in `ai_generations` table with type `"template"`
- [ ] Tone, language, and format selects with template-specific defaults
- [ ] "My Templates" tab unchanged and still functional
- [ ] Template-specific placeholder text on the topic input
- [ ] Mobile responsive generation form
- [ ] Dark mode support
- [ ] Progress document fully updated
- [ ] `pnpm lint && pnpm typecheck` passes cleanly
