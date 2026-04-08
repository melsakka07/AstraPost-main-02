# Compose Page Redesign — Implementation Plan

**Date:** 2026-04-08
**Status:** Ready for execution
**Scope:** Incremental improvements building on Phase 0-4 foundation (shipped 2026-04-05)
**Based on:** Feedback review in `compose-redsign-feedback.md` — all decisions follow that document's verdicts

---

## 0. Guiding Principles

This plan follows the feedback review's categorization of every redesign proposal:

| Category | Count | Action |
|----------|-------|--------|
| **Adopt** (high value, low cost) | 5 | Ship immediately |
| **Modify before adopting** | 3 | Adjust per feedback, then ship |
| **Skip** | 4 | Do NOT implement |

No ground-up layout restructuring. All changes are additive or CSS-level, preserving existing systems: auto-save, undo, SSE streaming, cross-page bridges, recurrence, multi-account posting, viral scoring, draft editing, and overwrite confirmation.

---

## Phase A — Quick Wins (Single PR)

All 5 items ship together. Zero architectural changes. Zero risk to existing features.

### A1. Increase textarea minimum height

- **File:** `src/components/composer/tweet-card.tsx:192`
- **Change:** `min-h-[120px]` → `min-h-[160px]`
- **Rationale:** Improves "writing space" perception. Current 120px is adequate but the 33% increase makes the textarea feel dominant without any layout change.
- **Risk:** Trivial. Single CSS class.

### A2. Change placeholder text

- **File:** `src/components/composer/tweet-card.tsx:189`
- **Change:** `"Start writing..."` → `"What's on your mind?"`
- **Rationale:** Warmer, more contextual tone matching creative intent rather than a generic form label.
- **Risk:** Trivial. Single string.

### A3. Switch section labels to sentence case

- **Files:**
  - `src/components/composer/composer.tsx:1817` — `"Content Tools (start here)"` label
  - `src/components/composer/composer.tsx:1955` — `"Publishing"` label
  - `src/components/composer/composer.tsx:2140` — `"Preview"` label (already sentence case, but verify)
- **Change:** Remove `uppercase tracking-wider` from all 3 labels. Change:
  - `"CONTENT TOOLS (START HERE)"` rendered via `text-xs font-medium uppercase tracking-wider` → `text-xs font-medium text-muted-foreground/70` (drop `uppercase tracking-wider`)
  - `"PUBLISHING"` rendered via same pattern → drop `uppercase tracking-wider`
  - `"PREVIEW"` in the preview section header → drop `uppercase tracking-wider`
- **Rationale:** Sentence case improves readability for all users (especially those with cognitive disabilities). Apple HIG recommends sentence case for section labels.
- **Risk:** Trivial. ~3 class changes.

### A4. Add thread connecting lines in preview

- **File:** `src/components/composer/composer.tsx:2138-2202`
- **Current:** Preview shows one tweet at a time via carousel (`previewIndex`, ChevronLeft/ChevronRight buttons).
- **Change:** When `tweets.length > 1`, render ALL tweets vertically stacked with a connecting line between them (mimicking X's native thread display). Replace the carousel with a scrollable thread preview.
- **Implementation:**
  1. Replace the single-tweet preview section with a `map()` over all tweets.
  2. Between consecutive tweets, render a thin vertical line (`w-0.5 h-4 bg-muted-foreground/30 mx-auto`).
  3. Keep the `ViralScoreBadge` on the first tweet only.
  4. Each tweet card in preview shows the same X-style layout (avatar, name, handle, content, media).
  5. Add `max-h-[400px] overflow-y-auto` to the thread container so it scrolls if the thread is long.
- **Preserve:** `ViralScoreBadge` component, media preview, link preview — all render identically per-tweet.
- **Rationale:** Reinforces thread metaphor. The carousel loses the visual thread structure that X itself displays.
- **Risk:** Low. Additive enhancement; data bindings unchanged.

### A5. Auto-suggest thread conversion at >280 chars

- **File:** `src/components/composer/tweet-card.tsx` or `src/components/composer/composer.tsx`
- **Current:** Users must manually click "Convert to Thread" or add a second tweet.
- **Change:** When `tweets.length === 1` (single-tweet mode) and the content exceeds 280 characters, show an inline hint below the textarea:
  ```
  This exceeds 280 characters. Convert to thread?
  [Convert to thread]
  ```
- **Implementation:**
  1. In `TweetCard`, after the `<Textarea>`, add a conditional block:
     ```tsx
     {tweets.length === 1 && isOverLimit(tweet.content) && !canPostLongContent(selectedTier) && (
       <div className="mt-1.5 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
         <AlertCircle className="h-3.5 w-3.5 shrink-0" />
         <span>This exceeds 280 characters.</span>
         <button
           type="button"
           className="font-medium text-primary hover:underline"
           onClick={onConvertToThread}
         >
           Convert to thread?
         </button>
       </div>
     )}
     ```
  2. Add `onConvertToThread` prop to `TweetCardProps` (callback that calls `addTweet()` in composer).
  3. Use `isOverLimit()` helper already defined in `tweet-card.tsx` and `canPostLongContent()` from `@/lib/services/x-subscription`.
  4. Only show when `totalTweets === 1` (don't nag in existing threads).
  5. Respect X Premium tier: if `canPostLongContent(selectedTier)` is true, don't show the hint (they can post up to 25K chars).
- **Rationale:** Progressive disclosure for thread creation. Users discover the thread feature organically at the exact moment they need it.
- **Risk:** Low. Additive UI; no state changes to existing flow.

### Phase A — Agent Execution Rules

```
Phase A can be executed as a single PR by one agent.
Order: A3 → A1 → A2 → A5 → A4 (labels first, then CSS, then string, then new UI, then preview refactor)
Run `pnpm lint && pnpm typecheck` after all changes.
No database migrations needed.
No dev server restart needed.
```

---

## Phase B — Modified Improvements (3 items, separate PRs)

These require adjustments per the feedback before they can ship safely.

### B1. Move preview to top of sidebar (above Content Tools)

- **Feedback adjustment:** Instead of moving preview below compose area (which worsens scheduling discoverability), make it the **first item** in the sidebar column — above the Content Tools card.
- **Current layout (sidebar column):**
  ```
  [Card: Content Tools] → [Card: Publishing] → [Preview section]
  ```
- **New layout (sidebar column):**
  ```
  [Preview section] → [Card: Content Tools] → [Card: Publishing]
  ```
- **Implementation:**
  1. In `composer.tsx`, move the preview `<div>` block (lines ~2138-2202) from the bottom of the sidebar column to the top, before the Content Tools `<Card>`.
  2. Keep all data bindings (`previewTweet`, `tweets`, `previewIndex`, etc.) identical.
  3. Keep `ViralScoreBadge` in the preview header.
  4. The preview section is currently a bare `<div className="bg-muted/50 rounded-lg p-4">`. Wrap it in a `<Card>` with `<CardContent>` for visual consistency with the other sidebar cards.
  5. Add the sentence-case "Preview" label (from A3) at the top of this card.
- **Preserve:**
  - Thread connecting lines (from A4) render in this relocated preview.
  - `ViralScoreBadge` remains visible.
  - Preview carousel navigation (ChevronLeft/ChevronRight) if A4 kept the carousel as a fallback for very long threads.
- **Risk:** Low. JSX reorder; no logic changes. Preview was already in the sidebar, just lower.

### B2. Content Tools — single-row labeled buttons (NOT icon-only)

- **Feedback adjustment:** Instead of icon-only toolbar (accessibility risk, loses `role="tablist"` semantics), convert the 2x2 grid + secondary grid to a **single-row of smaller labeled buttons**. Keep text labels for accessibility but reduce visual weight.
- **Current layout (Content Tools card):**
  ```
  [AI Writer] [Inspiration]      ← 2-col grid, outline buttons
  [Templates]                     ← standalone button
  [Hook] [CTA]                    ← 2x2 secondary grid, small buttons
  [Translate] [Hashtags]
  [Number tweets (1/N)]          ← standalone
  [Save as Template]             ← standalone
  ```
- **New layout (Content Tools card):**
  ```
  Content Tools
  [AI Writer ·] [Inspire ·] [Templates ·] [Hook ·] [CTA ·] [Translate ·] [#Tags ·]
  [☐ Number tweets (1/N)]   [Save as Template]
  ```
- **Implementation:**
  1. Replace the two `<div className="grid grid-cols-2">` blocks and the `<TemplatesDialog>` with a single flex-wrap row:
     ```tsx
     <div className="flex flex-wrap gap-1.5">
       <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => openAiTool("thread")}>
         <Sparkles className="h-3.5 w-3.5 text-primary" />Writer
       </Button>
       <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => openAiTool("inspire")}>
         <Lightbulb className="h-3.5 w-3.5 text-yellow-500" />Inspire
       </Button>
       <Suspense fallback={<Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" disabled>Templates</Button>}>
         <TemplatesDialog /* same props */ />
       </Suspense>
       <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => openAiTool("hook", ...)}>
         <Zap className="h-3.5 w-3.5" />Hook
       </Button>
       <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => openAiTool("cta")}>
         <Megaphone className="h-3.5 w-3.5" />CTA
       </Button>
       <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => openAiTool("translate")}>
         <Globe className="h-3.5 w-3.5" />Translate
       </Button>
       <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => openAiTool("hashtags", ...)}>
         <Hash className="h-3.5 w-3.5" />#Tags
       </Button>
     </div>
     ```
  2. Keep "Number tweets (1/N)" and "Save as Template" as secondary row below (smaller, muted).
  3. **Accessibility:** Keep `aria-label` on each button. The `AiToolsPanel` retains its `role="tablist"` internally — the sidebar buttons are just triggers, not tabs. The tab semantics live inside the panel itself.
  4. **Mobile:** The flex-wrap row naturally wraps on small screens. Each button remains touchable (h-8 = 32px minimum touch target).
- **Preserve:**
  - `AiToolsPanel` component is unchanged internally.
  - The inline expansion pattern (`isAiOpen && isDesktop`) remains.
  - Mobile Sheet pattern remains.
  - Lazy-loading of `TemplatesDialog` with `Suspense` remains.
- **Risk:** Medium. Visual change but no logic changes. Test on 320px viewport to ensure wrapping doesn't create awkward layouts.

### B3. Best-time suggestions visual integration with DateTimePicker

- **Feedback adjustment:** Instead of embedding `BestTimeSuggestions` inside `DateTimePicker` (high coupling, separate async data), style the existing component to **visually appear as part of** the date picker — shared background, reduced gap, integrated appearance.
- **Current:** `BestTimeSuggestions` is rendered as a separate `<div>` below the timezone note with its own header and spacing.
- **Implementation:**
  1. Remove the standalone header (`"Best times to post"` with `CalendarClock` icon) from `BestTimeSuggestions` when rendered in the composer. Add a `hideHeader?: boolean` prop (default `false`).
  2. Wrap both `DateTimePicker` and `BestTimeSuggestions` in a shared container with `bg-muted/30 rounded-lg p-3` background, creating visual grouping.
  3. Reduce spacing between the picker and the suggestions to `mt-2` (from `space-y-4` gap).
  4. When `isRestricted` (Free plan), the "Upgrade to see best times" button shares the same container style.
  5. The timezone note moves below the shared container as a subtle `text-xs text-muted-foreground/60` line.
- **Before:**
  ```
  Schedule for
  [DateTimePicker]
  Times are in Asia/Dubai (UTC+4)
  Best times to post
  [Now] [Sun 8AM] [Sun 4PM] [Wed 6PM]
  ```
- **After:**
  ```
  Schedule for
  ┌────────────────────────────────┐
  │ [DateTimePicker]               │
  │                                │
  │ [Now] [Sun 8AM] [Sun 4PM] ... │
  └────────────────────────────────┘
  Times in Asia/Dubai (UTC+4)
  ```
- **Preserve:**
  - `BestTimeSuggestions` component remains independent and reusable.
  - The "Now" chip is KEPT (feedback says it serves scheduling-pipeline workflow, not redundant).
  - Async data fetching is unchanged.
  - Free plan restriction flow is unchanged.
- **Risk:** Low. CSS/styling change only; no component refactoring.

### Phase B — Agent Execution Rules

```
Each B-item is a separate PR. They are independent and can be parallelized.
B1 (preview reposition) depends on A4 (thread lines in preview) being merged first.
B2 (content tools layout) is independent of A-changes.
B3 (best-time visual integration) is independent of A-changes.
Run `pnpm lint && pnpm typecheck` after each PR.
No database migrations needed.
```

---

## Phase C — Items EXPLICITLY Skipped

These items from the original redesign are **not implemented** per the feedback review. Do not create tickets or plans for them.

| # | Original Proposal | Why Skipped |
|---|-------------------|-------------|
| C1 | "Center Stage" 55-60% + 280px right rail | Sidebar controls (AI panel, recurrence, multi-account, best-time) require >280px. Current 67%/33% already gives textarea dominant weight. Needs prototype validation before committing engineering time. |
| C2 | Sticky "Post to X" button | Button is already visible in normal sidebar scroll on standard viewports (1080px+). Z-index and overflow complexity within Card structure is not justified. |
| C3 | Removing "Now" chip | It serves a legitimate scheduling-pipeline workflow: clicking "Now" routes through BullMQ queue (with job history, retry capability), while "Post to X" without a date publishes immediately via direct API. Different observability guarantees. |
| C4 | Removing "Compose" heading | Rendered by `DashboardPageWrapper`, the mandatory shell component for all dashboard pages. Removing it breaks the dashboard consistency pattern and violates the UI/UX Navigation Rules documented in CLAUDE.md. |

---

## Implementation Sequence

```
Week 1: Phase A (single PR — all 5 quick wins)
  ├── A3: Sentence case labels          (15 min)
  ├── A1: Textarea min-height increase  (5 min)
  ├── A2: Placeholder text change       (5 min)
  ├── A5: Auto-suggest thread           (1-2 hours)
  └── A4: Thread connecting lines       (2-4 hours)
  Total: ~4-6 hours

Week 2: Phase B (3 separate PRs, can be parallelized)
  ├── B1: Preview to top of sidebar     (0.5-1 hour, depends on A4)
  ├── B2: Content Tools single-row      (2-3 hours)
  └── B3: Best-time visual integration  (1-2 hours)
  Total: ~4-6 hours
```

---

## Feature Preservation Checklist

Every change must be verified against these critical systems. If any test fails, the change must be reverted or adjusted before merge.

| Feature | Verification | Applies to |
|---------|-------------|------------|
| **Auto-save** | Write content, wait 1s, reload page → content restored | All phases |
| **Undo system** | Generate AI thread, click undo in toast → previous content restored | A5, B2 |
| **SSE streaming** | Click "Generate Thread" → tweets stream in real-time with progress bar | B2 (button layout change) |
| **Cross-page bridges** | Navigate from AI Writer/Inspiration/Calendar with `?draft=` or `?prefill=` → content populates | B1 (preview move) |
| **Recurrence scheduling** | Set schedule + recurrence pattern + end date → persists on submit | B1, B3 |
| **Multi-account posting** | Select multiple accounts with mixed tiers → warnings show | B1 |
| **Viral Score Badge** | Write content → badge appears in preview header with score | A4, B1 |
| **Draft editing mode** | Load via `?draft=<id>` → PATCH updates work | All phases |
| **Overwrite confirmation** | Generate AI with >50 chars existing → AlertDialog triggers | B2 |
| **beforeunload guard** | Edit content, close tab → browser confirmation dialog | All phases |
| **Mobile AI Sheet** | On mobile, click AI tool → bottom sheet opens at 60dvh | B2 |
| **Hashtag chips inline** | Generate hashtags → chips appear under active tweet, click to add | B2 |
| **Link preview** | Paste URL → skeleton → preview card renders | A4, B1 |

---

## Files Modified (Summary)

| File | Phase | Changes |
|------|-------|---------|
| `src/components/composer/tweet-card.tsx` | A1, A2, A5 | `min-h-[160px]`, placeholder text, auto-suggest thread hint |
| `src/components/composer/composer.tsx` | A3, A4, B1, B2, B3 | Sentence case labels, thread preview, preview reposition, content tools layout, best-time styling |
| `src/components/composer/best-time-suggestions.tsx` | B3 | `hideHeader` prop, visual integration |

**New files:** None
**Deleted files:** None
**Database migrations:** None
**New dependencies:** None

---

## Acceptance Criteria

### Phase A — Quick Wins PR

- [ ] Textarea minimum height is 160px (verify in browser DevTools)
- [ ] Placeholder reads "What's on your mind?" on first tweet card
- [ ] Section labels use sentence case (no `UPPERCASE` anywhere in sidebar)
- [ ] Thread preview shows connecting lines between tweets (visible when `tweets.length > 1`)
- [ ] Single-tweet mode: typing >280 chars shows "Convert to thread?" hint
- [ ] Hint does NOT appear for X Premium users (long content allowed)
- [ ] Hint does NOT appear when already in a thread (`tweets.length > 1`)
- [ ] `pnpm lint` passes with zero errors
- [ ] `pnpm typecheck` passes with zero errors

### Phase B1 — Preview Reposition PR

- [ ] Preview section appears as first card in sidebar column
- [ ] Preview wrapped in `<Card>` for visual consistency
- [ ] ViralScoreBadge visible in preview header
- [ ] Thread connecting lines (from A4) render correctly in repositioned preview
- [ ] Publishing card remains accessible without excessive scrolling
- [ ] Cross-page bridges (`?draft=`, `?prefill=`) still populate content correctly

### Phase B2 — Content Tools Layout PR

- [ ] AI tools render as single-row flex-wrap of labeled buttons
- [ ] Each button has an icon + text label (not icon-only)
- [ ] Clicking any button opens `AiToolsPanel` inline (desktop) or Sheet (mobile)
- [ ] `AiToolsPanel` internal `role="tablist"` still works for screen readers
- [ ] TemplatesDialog still lazy-loads with Suspense boundary
- [ ] Buttons wrap gracefully on 320px viewport
- [ ] "Number tweets" and "Save as Template" remain as secondary row below
- [ ] SSE streaming still shows progress when generating
- [ ] Overwrite confirmation still triggers at 50+ chars

### Phase B3 — Best-Time Visual Integration PR

- [ ] DateTimePicker and BestTimeSuggestions share a visual container
- [ ] Header hidden when `hideHeader={true}` passed to BestTimeSuggestions
- [ ] "Now" chip is preserved (NOT removed)
- [ ] Free plan "Upgrade" button shares the container style
- [ ] Timezone note appears below the container, more subtle
- [ ] BestTimeSuggestions component remains independently usable (no breaking changes)

---

## Out of Scope — Future Considerations

These are ideas worth exploring AFTER this plan ships, but are explicitly not part of this implementation:

1. **"Center Stage" layout prototype** — Create a branch experiment with 60/40 split (not 55/60 + 280px rail) and test with real sidebar content (AI panel expanded, recurrence visible, multi-account selected). Only proceed if validation shows 280-320px accommodates all controls.

2. **Post-now / schedule radio toggle** — The redesign's proposal to replace the current DateTimePicker flow with a radio toggle ("Post now" vs "Schedule for later") that progressively reveals the date picker. This is a good UX pattern but requires careful handling of the recurrence controls, best-time suggestions, and the scheduling-pipeline vs direct-publish distinction.

3. **Overflow menu for secondary actions** — Moving "Save as Template", "Clear All", "Import from Inspiration" to a three-dot menu. This is viable but the three-dot menu must be keyboard-accessible and not rely solely on tooltips.

4. **Full thread preview instead of carousel** — A4 introduces connecting lines but keeps the scrollable thread in a bounded container. A future iteration could make the preview expandable/collapsible with a "Show full thread (N)" toggle.
