# Compose Page Redesign — Senior UX/UI Engineering Review

**Date:** 2026-04-07
**Reviewer:** Code-aware UX/UI audit (automated)
**Scope:** Evaluation of `docs/ux-audits/compose-redsign.md` against the current AstraPost compose page implementation
**Verdict:** Not ready for implementation planning — see Section 8

---

## 1. Executive Summary

The redesign document proposes 9 areas of change to the compose page, grounded in design principles from Material Design 3, Apple HIG, and patterns from Notion, Linear, and Buffer. The analysis is thoughtful and the underlying principles (progressive disclosure, center-stage writing, cognitive load reduction) are sound.

However, **approximately 6 of the 9 proposals overlap with work already shipped in Phases 0-4** (completed 2026-04-05). The redesign appears to have been written against a pre-audit snapshot of the UI. It also contains factual inaccuracies about the current implementation and does not address several critical features (auto-save, undo, SSE streaming, recurrence, multi-account posting, cross-page data bridges).

Five quick-win improvements were identified that provide genuine incremental value and can ship with low risk. The highest-impact proposal ("Center Stage" layout at 55-60% + 280px rail) carries the highest risk and needs prototype validation before committing.

---

## 2. Strengths — What Is Well-Reasoned

### 2.1 Cognitive Load Reduction (Proposal 8)

The principle of reducing visible interactive elements from ~18-20 to ~8-10 on first load is directionally correct. Research from Hick's Law supports this. The redesign's framing of three workflow stages (Writing, Enhancement, Publishing) is a useful mental model that could guide future refinements to the sidebar grouping.

### 2.2 Preview Improvements (Proposal 5)

The suggestion to add thread connecting lines in the preview is a genuine improvement. The current preview (`composer.tsx:2138-2202`) shows one tweet at a time via carousel, which loses the visual thread metaphor. Connecting lines would reinforce thread structure and match X's native display.

### 2.3 Real-Time Preview Feedback

The current preview already updates in real-time (it reads directly from `tweets[safePreviewIndex]`), validating the redesign's instinct. The call to show media layout and threaded structure in the preview is a worthwhile enhancement.

### 2.4 Mobile Bottom Sheet Pattern (Proposal 9)

The suggestion to use bottom sheets for AI tools on mobile aligns with established mobile patterns (Google Maps, Apple Music). This is already implemented.

### 2.5 Sentence Case Labels (Proposal 6)

The recommendation to switch section labels from `UPPERCASE` to sentence case is well-founded. The current `text-xs font-medium uppercase tracking-wider` styling (`composer.tsx:1817`) can feel heavy alongside other visual elements.

---

## 3. Already Implemented — Proposals That Overlap With Shipped Work

The following proposals are already live in the codebase as of Phase 0-4 (2026-04-05). The redesign should be updated to reflect this.

| Proposal                                 | Current Implementation                                                                                                          | File Reference                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Progressive disclosure for AI tools      | AI panel uses accordion expand inline on desktop; `AiToolsPanel` has internal pill tab switcher (`role="tablist"`) with 8 tools | `ai-tools-panel.tsx:36-45`, `composer.tsx:1884-1948` |
| No visible border on textarea            | `border-none focus-visible:ring-0` on textarea; focus state handled by parent Card                                              | `tweet-card.tsx:192`                                 |
| Templates as separate entry point        | `TemplatesDialog` is lazy-loaded via `React.lazy()` with `<Suspense>` boundary                                                  | `composer.tsx:39-41, 1837-1846`                      |
| Mobile AI tools as bottom sheet          | `<Sheet>` renders at `h-[60dvh]` with `AiToolsPanel` inside                                                                     | `composer.tsx:2205-2283`                             |
| "Save as Draft" as visible button        | Rendered as `<Button variant="outline">` (not a text link)                                                                      | `composer.tsx:2068`                                  |
| Tool ordering by workflow                | TOOLS array ordered: Write, Inspire, Template, Hook, CTA, Rewrite, Translate, #Tags                                             | `ai-tools-panel.tsx:36-45`                           |
| Character counter separated from toolbar | Counter lives in `CardFooter` right-aligned section, visually separated from left-aligned toolbar buttons                       | `tweet-card.tsx:412-473`                             |

---

## 4. Risks and Concerns

### 4.1 "Center Stage" Layout Would Break the Sidebar (Proposal 1) — HIGH RISK

The current layout is `grid grid-cols-1 lg:grid-cols-3 gap-6` with editor at `lg:col-span-2` (~67%) and sidebar at 1-col (~33%). On a 1440px display, the sidebar is approximately 400-500px wide.

The redesign proposes 55-60% for a centered textarea with a 280-320px right rail. This creates concrete problems:

- **AI tools panel won't fit.** `AiToolsPanel` renders 2-column grids for Tone/Language selectors (`grid grid-cols-1 sm:grid-cols-2 gap-4`). At 280px, these collapse to single-column, making the panel significantly taller and requiring more scrolling.
- **Recurrence controls won't fit.** The recurrence section uses a Select dropdown + DatePicker side by side (`composer.tsx:1999-2019`). At 280px, these must stack vertically.
- **Account selector with tier badges.** `TargetAccountsSelect` displays platform icons, @handles, and X subscription tier badges. At 280px, longer usernames would truncate.
- **The inline AI panel expansion becomes impractical.** Currently, when a user clicks an AI tool in the sidebar, the panel expands below within the same Card. At 280px, this pattern cannot accommodate the form fields.

The redesign cites Buffer and Hootsuite as references, but these tools have far fewer sidebar controls (no AI tools panel, no templates, no multi-account selector with tier badges, no recurrence).

**Recommendation:** Keep the current 2/3 + 1/3 grid. Achieve visual prominence for the textarea through increased padding, larger minimum height, and reduced visual noise — not layout restructuring.

### 4.2 Textarea Height Observation Is Inaccurate (Proposal 2)

The redesign states the textarea "appears relatively small" at "roughly 80-100px." The actual code shows `min-h-[120px]` (`tweet-card.tsx:192`). The proposed increase to 160px is a reasonable 33% bump, but the premise is factually wrong. This raises concerns about whether the redesign was verified against the running application or written from screenshots/memory.

### 4.3 Removing the "Now" Chip Is Counterproductive (Proposal 4)

The redesign calls "Now" redundant with the "Post to X" button's default behavior. This misses a workflow distinction: leaving the date empty and clicking "Post to X" publishes immediately via direct API call. Clicking "Now" in `BestTimeSuggestions` sets a specific timestamp, routing through the scheduling pipeline (BullMQ queue). Users who want scheduling observability (job history, retry capability) use "Now" deliberately.

### 4.4 Sticky "Post to X" Is Unnecessary Engineering (Proposal 4)

The "Post to X" button sits in the Publishing Card, which is the second card in the sidebar. On a typical 1080px-height viewport, the button is visible without scrolling. Adding `position: sticky` would create z-index and overflow complications within the Card structure. The engineering cost exceeds the UX benefit.

### 4.5 Moving Preview Below Compose Worsens Scheduling Discoverability (Proposal 5)

If the preview moves from the sidebar to below the compose area, the left column grows significantly taller (editor + alerts + thread controls + preview). The Publishing card in the sidebar would sit above the fold while the user's editing context is far below. This could worsen the scheduling discovery problem rather than improving it.

---

## 5. Critical Gaps — Features Not Addressed

The redesign does not mention the following systems, all of which must survive any layout change:

| Feature                    | Implementation                                                                                                                           | Risk If Overlooked                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Auto-save**              | localStorage with 1s debounce, restore on mount, `beforeunload` guard                                                                    | Data loss on layout restructure if save triggers change           |
| **Undo system**            | `previousTweetsRef` + `preStreamTweetsRef` snapshots with toast-based undo actions                                                       | Regression if AI interaction model changes                        |
| **SSE streaming**          | Thread generation streams tweets in real-time via `ReadableStream` with progress bar and `aria-live` announcements                       | Must accommodate streaming UI in any new toolbar/panel model      |
| **Cross-page bridges**     | `sessionStorage` payloads from AI Writer, Inspiration, Calendar, Reply Suggester; URL params `?draft=`, `?prefill=`, `?tone=`, `?topic=` | Pre-fill flows would break if layout assumptions change           |
| **Recurrence scheduling**  | Daily/weekly/monthly/yearly with end date picker, server-enforced 1-year max                                                             | Won't fit in 280px rail                                           |
| **Multi-account posting**  | `TargetAccountsSelect` with mixed X tiers, effective tier computation, token expiry warnings                                             | Mixed-tier warnings (`composer.tsx:1769-1775`) need sidebar space |
| **Viral Score Badge**      | `ViralScoreBadge` in preview header, auto-analyzes with 2s debounce                                                                      | Not mentioned; preview changes must preserve this                 |
| **Draft editing mode**     | Load via `?draft=<id>`, PATCH updates, editingDraftId state                                                                              | Draft → compose flow must remain intact                           |
| **Overwrite confirmation** | Triggers at 50+ chars before AI replaces content; uses `confirmOverwrite` + `pendingTweets` state                                        | Any AI interaction changes must preserve this guard               |

---

## 6. Accessibility Impact

### 6.1 Icon-Only Toolbar Risks Regression (Proposal 3)

The current sidebar uses labeled `<Button>` elements ("AI Writer", "Hook", "CTA") that are inherently accessible. The `AiToolsPanel` uses `role="tablist"` with `role="tab"` and `aria-selected` for each tool. Replacing these with icon-only toolbar buttons would require:

- `aria-label` on every icon button
- Tooltip-driven discovery (tooltips are not accessible to all assistive technologies; screen readers skip them)
- Loss of the semantic tab structure

**Recommendation:** If reducing visual weight, keep text labels but make them smaller — do not go icon-only.

### 6.2 Hiding Mobile Preview Reduces Discoverability (Proposal 9)

The current mobile layout shows the preview inline in the single-column stack. Hiding it behind a tap-icon requires the user to know the icon exists. This trades content visibility for vertical space. The trade-off may be acceptable but needs user testing before shipping.

### 6.3 Positive: Sentence Case Labels (Proposal 6)

Switching from `UPPERCASE` to sentence case improves readability for all users and is particularly helpful for users with cognitive disabilities who find all-caps text harder to parse.

---

## 7. Technical Feasibility

| Proposal                           | Effort   | Risk    | Notes                                                                                                                     |
| ---------------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| "Center Stage" layout              | 3-5 days | High    | Requires redesigning all sidebar components for 280px; AI panel, recurrence, and account selector affected                |
| Icon toolbar for Content Tools     | 2-3 days | Medium  | Must preserve `role="tablist"` and labeled buttons; popover/expand behavior already exists                                |
| Best-time inside date picker       | 3-4 days | Medium  | `DateTimePicker` and `BestTimeSuggestions` are separate components with independent async data; combining adds complexity |
| Preview repositioning              | 0.5 days | Low     | CSS/JSX reorder; data bindings unchanged                                                                                  |
| Textarea height increase           | 5 min    | Trivial | Single CSS class change in `tweet-card.tsx:192`                                                                           |
| Placeholder text change            | 5 min    | Trivial | Single string change in `tweet-card.tsx:189`                                                                              |
| Section labels to sentence case    | 15 min   | Trivial | ~3 label changes in `composer.tsx`                                                                                        |
| Thread connecting lines in preview | 1-2 days | Low     | Additive enhancement to existing preview carousel                                                                         |
| Auto-suggest thread at >280 chars  | 1 day    | Low     | Inline hint below textarea when `content.length > 280` and single-tweet mode                                              |

---

## 8. Prioritized Recommendations

### Adopt (High Value, Low Cost)

These can ship immediately with minimal risk:

1. **Increase textarea `min-h` from 120px to 160px** — improves "writing space" perception. One CSS class change in `tweet-card.tsx:192`.

2. **Change placeholder to "What's on your mind?"** — warmer, more contextual tone. One string change in `tweet-card.tsx:189`.

3. **Switch section labels to sentence case** — replace `uppercase tracking-wider` with `capitalize` or sentence-case text in `composer.tsx:1817` and similar labels.

4. **Add thread connecting lines in preview** — reinforces thread metaphor. Additive enhancement to the preview carousel section (`composer.tsx:2138-2202`).

5. **Auto-suggest thread conversion at >280 chars** — when the user exceeds 280 characters in single-tweet mode, show an inline hint: "This exceeds 280 characters. Convert to thread?" This is progressive disclosure for thread creation.

### Modify Before Adopting

These are good ideas that need adjustment:

6. **Preview position:** Instead of moving below compose area, make preview the **first** item in the sidebar (above Content Tools). This puts visual feedback at the top of the sidebar where it's seen immediately, without pushing Publishing controls further down.

7. **Content Tools visual weight:** Instead of icon-only toolbar (accessibility risk), convert the 2x2 grid to a **single-row of smaller labeled buttons**. Keep text labels but reduce font size and padding. This achieves the "lighter" feel without sacrificing discoverability.

8. **Best-time suggestions proximity:** Instead of embedding inside the DateTimePicker component (high coupling), style the existing `BestTimeSuggestions` to visually appear as part of the date picker (shared background, reduced gap). This achieves the "integrated" appearance with zero component refactoring.

### Skip

These should not proceed in their current form:

9. **"Center Stage" 55-60% + 280px rail.** The sidebar controls (AI panel, recurrence, multi-account, best-time suggestions) require more than 280px. The current 67% editor + 33% sidebar already gives the textarea dominant visual weight. Prototype and validate with users before committing engineering time.

10. **Sticky "Post to X" button.** The button is already visible in normal sidebar scroll on standard viewports. The z-index and overflow complexity is not justified.

11. **Removing "Now" chip.** It serves a legitimate scheduling-pipeline workflow that the redesign did not account for.

12. **Removing "Compose" heading.** This is rendered by `DashboardPageWrapper`, the mandatory shell component for all dashboard pages. Removing it breaks the dashboard consistency pattern and violates the UI/UX Navigation Rules documented in CLAUDE.md.

---

## 9. Verdict

**The redesign is not ready for implementation planning** in its current form, for four reasons:

1. **Outdated baseline.** ~6 of 9 proposals overlap with Phase 0-4 work already shipped (2026-04-05). The redesign must be updated to reflect the current state before meaningful incremental improvements can be scoped.

2. **Factual inaccuracies.** The textarea height claim (80-100px vs. actual 120px), the assertion that borders are visible in resting state (they use `border-none`), and the claim that templates lack a separate entry point (`TemplatesDialog` is lazy-loaded) indicate the redesign was not verified against the source code.

3. **Critical feature blindspots.** Auto-save, undo, SSE streaming, cross-page bridges, recurrence, multi-account posting, viral scoring, and draft editing are all absent. An implementation that does not account for these features risks serious regression.

4. **Highest-impact proposal lacks validation.** The "Center Stage" layout is presented as self-evident without user research, heatmap data, or task-completion metrics. The current 67% allocation already gives the textarea dominant visual weight.

---

## 10. Recommended Next Steps

1. **Update the redesign** to reflect the current codebase (post Phase 0-4). Remove proposals that are already shipped.

2. **Ship the 5 quick wins** (Section 8, items 1-5) in a single PR. These provide genuine value with minimal risk and no architectural changes.

3. **Prototype the "Center Stage" layout** as a Figma mockup or branch experiment. Test it with real sidebar content (AI panel expanded, recurrence visible, multi-account selected) to validate that 280-320px accommodates the controls. If it doesn't, explore intermediate options (e.g., 60/40 split instead of current 67/33).

4. **Write a revised proposal** scoped to incremental improvements that build on the Phase 0-4 foundation rather than proposing a ground-up redesign. Focus on the 3 "Modify" items (preview positioning, Content Tools visual weight, best-time proximity) as Phase 5 candidates.

---

## Appendix: File References

| File                                                  | Role                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| `src/components/composer/composer.tsx`                | Main orchestrator, 60+ state variables, grid layout, sidebar cards   |
| `src/components/composer/tweet-card.tsx`              | Individual tweet editor: textarea, media, toolbar, character counter |
| `src/components/composer/ai-tools-panel.tsx`          | 8-tool AI panel with pill tab switcher, streaming progress           |
| `src/components/composer/best-time-suggestions.tsx`   | "Now" + suggested time slot buttons                                  |
| `src/components/composer/target-accounts-select.tsx`  | Multi-account selector with tier badges                              |
| `src/components/composer/ai-image-dialog.tsx`         | AI image generation modal with progress bar                          |
| `src/components/ui/date-time-picker.tsx`              | Unified date + time popover                                          |
| `src/components/dashboard/dashboard-page-wrapper.tsx` | Mandatory page shell (icon, title, description)                      |
| `src/components/dashboard/sidebar.tsx`                | Navigation structure with Compose entry                              |
| `docs/ux-audits/compose-redsign.md`                   | The redesign proposal under review                                   |
