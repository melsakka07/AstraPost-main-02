# Content Tools Card — UX Audit & Unified Panel Implementation Plan

**Date**: 2026-04-07 (v2 — Unified Inline Panel Approach)
**Scope**: `/dashboard/compose` → Content Tools sidebar card
**Goal**: Unify all 7 tools under a single, consistent inline accordion panel pattern with minimum friction
**Files Analyzed**: `composer.tsx`, `ai-tools-panel.tsx`, `inspiration-panel.tsx`, `templates-dialog.tsx`, `tweet-card.tsx`, `hashtag-generator.tsx`

---

## Table of Contents

1. [Current State: 7 Feature UX Flows](#1-current-state-7-feature-ux-flows)
2. [Interaction Pattern Matrix (Before)](#2-interaction-pattern-matrix-before)
3. [UX Inconsistencies Identified](#3-ux-inconsistencies-identified)
4. [Expert Assessment: Unified Inline Panel Feasibility](#4-expert-assessment-unified-inline-panel-feasibility)
5. [Target State: Unified Interaction Model](#5-target-state-unified-interaction-model)
6. [Responsive Design & Mobile-First Strategy](#6-responsive-design--mobile-first-strategy)
7. [User Experience Flow Diagrams (Before vs After)](#7-user-experience-flow-diagrams-before-vs-after)
8. [Recommendations](#8-recommendations)
9. [Phased Implementation Plan (with Agent Strategy)](#9-phased-implementation-plan-with-agent-strategy)

---

## 1. Current State: 7 Feature UX Flows

### 1.1 AI Writer

| Aspect | Detail |
|--------|--------|
| **Trigger** | Full-width button → `openAiTool("thread")` |
| **UI Surface** | Desktop: inline accordion below button grid / Mobile: bottom Sheet (60dvh) |
| **Inputs** | Topic, Tone, Language, Length (single) or Tweet Count + Numbering (thread) |
| **Output** | Replaces ALL tweet cards via SSE streaming |
| **Loading** | Spinner + streaming progress bar with tweet count |
| **Overwrite Guard** | AlertDialog if existing content > 50 chars |
| **402 Handling** | Opens upgrade modal with plan context |

**Flow**: Click → Panel expands → Fill topic/tone/language → Generate → Overwrite guard (if needed) → SSE streams tweet cards live → Panel closes with toast

### 1.2 Inspiration

| Aspect | Detail |
|--------|--------|
| **Trigger** | Full-width button → opens centered **Dialog** (NOT inline panel) |
| **UI Surface** | Centered Dialog (small) — **different pattern from all other tools** |
| **Inputs** | Niche select (10 options) |
| **Output** | List of topic cards with hook text |
| **Loading** | Spinner on "Get Ideas" button |
| **Handoff** | Click topic → Dialog closes → AI Writer opens with pre-filled topic → **Auto-generates without user confirmation** |

**Flow**: Click → Dialog opens → Pick niche → Get Ideas → Click topic card → Dialog closes → AI Writer auto-fires → SSE streams into composer

### 1.3 Templates

| Aspect | Detail |
|--------|--------|
| **Trigger** | Full-width button (lazy-loaded) → opens centered **Dialog** (max-w-2xl) — **another different pattern** |
| **UI Surface** | Large centered Dialog with two internal views (List → Generate) |
| **Inputs** | View 1: Category filter + tab (System/My Templates). View 2: Topic, Tone, Language, Format |
| **Output** | SSE-generated tweets replace all composer content |
| **Loading** | "Generating content... N tweets ready" progress block |
| **Overwrite Guard** | AlertDialog in composer (after dialog closes) if existing content > 50 chars |

**Flow**: Click → Dialog opens → Browse/filter templates → Click template → Generate view → Fill topic/tone → Generate → SSE collects tweets → Dialog closes → Overwrite guard (if needed) → Tweets replace composer content

### 1.4 Hook

| Aspect | Detail |
|--------|--------|
| **Trigger** | Small button in 2x2 grid → `openAiTool("hook")` |
| **UI Surface** | Desktop: inline accordion / Mobile: bottom Sheet |
| **Inputs** | Topic (optional -- falls back to tweet[0] content), Tone, Language |
| **Output** | Replaces `tweets[0].content` only -- **always tweet[0], ignores active tweet** |
| **Loading** | Spinner on Generate button |
| **Overwrite Guard** | **MISSING** -- silently replaces first tweet content |

**Flow**: Click → Panel expands (Hook tab pre-selected) → Optionally enter topic → Generate → First tweet content replaced → Panel closes with toast

### 1.5 Translate

| Aspect | Detail |
|--------|--------|
| **Trigger** | Small button in 2x2 grid → `openAiTool("translate")` |
| **UI Surface** | Desktop: inline accordion / Mobile: bottom Sheet |
| **Inputs** | Target language (auto-detected from content) |
| **Output** | Replaces content of ALL non-empty tweets (preserves media) |
| **Loading** | Spinner on Generate button |
| **Overwrite Guard** | **MISSING** -- silently replaces all tweet content with translations |
| **Smart Default** | Arabic content → suggests English; Latin content → suggests Arabic |

**Flow**: Click → Panel expands (Translate tab pre-selected, target auto-detected) → Adjust target language if needed → Generate → All tweets translated in-place → Panel closes with toast

### 1.6 Hashtags

| Aspect | Detail |
|--------|--------|
| **Trigger** | Small button in 2x2 grid → `openAiTool("hashtags", activeTweetId)` |
| **UI Surface** | Desktop: inline accordion **(opens briefly then closes)** -- **unique jarring behavior** |
| **Inputs** | None editable -- displays read-only tweet content |
| **Output** | Inline clickable chips BELOW the targeted tweet card -- **different location than all other tools** |
| **Loading** | Spinner on Generate button |
| **Unique Behavior** | Panel closes immediately after generation; chips appear on tweet card in main column |
| **Chip Interaction** | Click chip → appends tag to tweet → chip disappears |

**Flow**: Click → Panel opens (showing tweet content) → Generate → **Panel closes immediately** → Chips appear below targeted tweet (different location!) → Click chips to add hashtags one by one

### 1.7 CTA (Call to Action)

| Aspect | Detail |
|--------|--------|
| **Trigger** | Small button in 2x2 grid → `openAiTool("cta")` |
| **UI Surface** | Desktop: inline accordion / Mobile: bottom Sheet |
| **Inputs** | Tone, Language only -- **no topic input, no content context** |
| **Output** | Appends text to the LAST tweet's content (with `\n\n` separator) |
| **Loading** | Spinner on Generate button |
| **No Overwrite Guard** | Appends (non-destructive) -- acceptable |

**Flow**: Click → Panel expands (CTA tab pre-selected) → Adjust tone/language → Generate → CTA text appended to last tweet → Panel closes with toast

---

## 2. Interaction Pattern Matrix (Before)

| Feature | UI Pattern | Opens Where | Input Complexity | Output Target | Destructive? | Overwrite Guard | Mobile |
|---------|------------|-------------|------------------|---------------|-------------|-----------------|--------|
| AI Writer | Accordion panel | Inline / Sheet | High (4-6 fields) | All tweets | YES | ✅ AlertDialog | Sheet |
| Inspiration | **Dialog** | **Center screen** | Low (1 select) | → AI Writer | YES (via AI Writer) | ✅ (via AI Writer) | **Dialog** |
| Templates | **Dialog (2 views)** | **Center screen** | High (4 fields) | All tweets | YES | ✅ AlertDialog | **Dialog** |
| Hook | Accordion panel | Inline / Sheet | Low (1-3 fields) | Tweet[0] only | YES | **❌ Missing** | Sheet |
| Translate | Accordion panel | Inline / Sheet | Minimal (1 select) | All non-empty tweets | YES | **❌ Missing** | Sheet |
| Hashtags | **Accordion → Chips** | **Inline then closes** | None (read-only) | Targeted tweet | No (additive) | N/A | Sheet → Chips |
| CTA | Accordion panel | Inline / Sheet | Minimal (2 selects) | Last tweet | No (append) | N/A | Sheet |

**Problems visible at a glance:**
- 3 different UI paradigms (accordion, dialog, dialog-with-views)
- 2 different mobile patterns (Sheet vs Dialog)
- 2 missing overwrite guards
- 1 tool with jarring open-then-close behavior

---

## 3. UX Inconsistencies Identified

### 3.1 CRITICAL: Missing Overwrite Guards (Hook + Translate)

**Problem**: Hook replaces `tweets[0].content` and Translate replaces ALL tweet content WITHOUT any confirmation. AI Writer and Templates both have AlertDialog guards when content > 50 chars, but Hook and Translate silently destroy user-written content.

**Impact**: HIGH -- Users lose manually crafted content with no undo.

**Code References**:
- Hook: `composer.tsx:921-923` -- `updateTweet(first.id, data.text)` with no guard
- Translate: `composer.tsx:979-985` -- `setTweets(next)` with no guard
- Contrast with AI Writer: `composer.tsx:785-791` -- has `confirmOverwrite` AlertDialog

---

### 3.2 CRITICAL: Three Different UI Paradigms

**Problem**: The 7 tools use 3 completely different interaction patterns:

1. **Accordion Panel** (AI Writer, Hook, CTA, Translate, Hashtags) -- inline expansion below the card
2. **Centered Dialog** (Inspiration) -- modal overlay with its own flow
3. **Multi-View Dialog** (Templates) -- modal with internal navigation (list → generate)

Users switching between tools must mentally adapt to different interaction models. This creates cognitive friction, especially for first-time users who cannot predict what will happen when they click a button.

**Impact**: MEDIUM-HIGH -- Reduces feature discoverability and increases learning curve.

---

### 3.3 HIGH: Hook Always Targets Tweet[0], Ignoring Active Tweet

**Problem**: In a 10-tweet thread, Hook always replaces tweet #1 regardless of which tweet the user is editing. The Hashtags tool already correctly uses `activeTweetId` -- Hook should do the same.

**Code Reference**: `composer.tsx:921-923` -- hardcoded `tweets[0]` instead of `aiTargetTweetId`

**Impact**: MEDIUM -- Causes confusion in multi-tweet workflows.

---

### 3.4 MEDIUM: Hashtags Panel Opens Then Immediately Closes

**Problem**: When using Hashtags, the panel opens to show a read-only view of the tweet content, the user clicks Generate, and then the panel immediately closes (`composer.tsx:1014`). The chips appear below the tweet card in a completely different location (main editor column). The transition from "panel interaction" to "inline chip interaction" is jarring and spatially disconnected.

**Impact**: MEDIUM -- Users may not notice where the hashtags appeared.

---

### 3.5 MEDIUM: Inspiration Auto-Fires Without User Review

**Problem**: Clicking a topic in the Inspiration dialog triggers a chain: close dialog → open AI Writer → `useEffect` at `composer.tsx:1057-1064` auto-fires `handleAiRun()`. The user doesn't get to review/edit the topic before generation starts.

**Impact**: MEDIUM -- Removes user agency in the content creation flow.

---

### 3.6 LOW-MEDIUM: CTA Has No Context of Existing Content

**Problem**: CTA generates a call-to-action using only Tone and Language -- it has no input for the tweet topic and doesn't read existing tweet content (`composer.tsx:929-934`). The generated CTA may be generic and unrelated to the thread's subject.

**Impact**: LOW-MEDIUM -- Reduces CTA relevance.

---

### 3.7 LOW-MEDIUM: No Undo/History for Any Tool

**Problem**: None of the 7 tools offer an undo mechanism. Once AI Writer replaces a 10-tweet thread, the original content is gone. Auto-save mitigates this slightly, but only if the user had previously saved.

**Impact**: LOW-MEDIUM -- Mitigated by auto-save and overwrite guard, but no explicit undo.

---

### 3.8 LOW: Inconsistent Empty-State Messaging

**Problem**: Translate shows "Add content to your tweet(s) to enable translation" (`ai-tools-panel.tsx:212-216`), Hashtags shows "No content yet..." (`ai-tools-panel.tsx:190-193`), but Hook silently fails or produces poor results when both topic and tweet content are empty.

**Impact**: LOW -- Edge case but affects polish.

---

## 4. Expert Assessment: Unified Inline Panel Feasibility

### Can All 7 Tools Use the Inline Accordion Panel?

| Tool | Currently | Can Fully Inline? | Verdict | Rationale |
|------|-----------|-------------------|---------|-----------|
| **AI Writer** | Inline panel | Already is | ✅ Keep | Gold standard -- all other tools should match this |
| **Hook** | Inline panel | Already is | ✅ Keep + fix targeting | Just needs `activeTweetId` and overwrite guard |
| **CTA** | Inline panel | Already is | ✅ Keep + add context | Just needs thread content passed to API |
| **Translate** | Inline panel | Already is | ✅ Keep + add guard | Just needs overwrite confirmation |
| **Hashtags** | Inline (briefly) | Yes | ✅ Fix -- stop closing panel | Keep panel open, show chips inside panel |
| **Inspiration** | Dialog | **YES -- perfect fit** | ✅ Convert to inline tab | Niche select + topic cards fit naturally in sidebar |
| **Templates** | Large Dialog | **Partially** | ⚠️ Hybrid approach | Browse in dialog, generate in inline panel |

### Detailed Analysis: Inspiration → Inline Tab

The current Inspiration dialog (`inspiration-panel.tsx`) is actually very simple:
- 1 niche `<Select>` with 10 options (line 70-77)
- 1 "Get Ideas" button (line 79-82)
- A scrollable list of clickable topic cards, max-height 300px (line 85-107)

This fits **perfectly** as a new tab in `AiToolsPanel`. Benefits:
- **Same spatial context** as all other tools -- no modal jump
- **Solves the auto-fire problem** -- user picks topic → it pre-fills the Write tab → user edits → clicks Generate manually
- The niche select + scrollable topic list fits naturally in the sidebar width (~280px)
- Mobile: same Sheet pattern as everything else -- zero special handling needed
- Removes 112 lines of dedicated Dialog component code

**New flow**: Click Inspiration button → Panel opens with Inspire tab → Pick niche → Get Ideas → Topic cards appear → Click one → Panel switches to Write tab with pre-filled topic → User can edit → Clicks Generate

### Detailed Analysis: Templates → Hybrid Approach

Templates is the **one tool** where a full inline conversion would hurt UX. Here's why:

**Why Template Browsing Cannot Be Inlined:**
- Template browsing needs a 2-column card grid (`templates-dialog.tsx:613`) with category filter pills (line 596-608), System/My Templates tabs (line 579-587), and pagination (line 792-823)
- The sidebar is ~280px wide -- cramming a 2-column grid with badges, descriptions, and action buttons into this space would make cards unreadable
- Template browsing is fundamentally a **discovery/selection** flow, not a configuration flow -- it benefits from full viewport width
- The current `max-w-2xl` dialog (672px) is already the minimum comfortable size for the card grid

**Why Template Generation CAN Be Inlined:**
- The template generate form (`templates-dialog.tsx:394-501`) is just: Topic input + Tone/Language/Format selects -- functionally identical to the AI Writer form
- Currently, this form lives inside the dialog (View 2), duplicating the same input pattern that already exists in `AiToolsPanel`
- Moving generation to the inline panel means the user sees the exact same UI whether they're using AI Writer, a Template, or Inspiration

**Recommended Hybrid:**
1. Template **browsing** stays as a dialog (picker/selector pattern)
2. Template **generation** moves to the inline panel -- after picking a template, the dialog closes and `AiToolsPanel` opens with a new "Template" tab, pre-filled with the template's config
3. This way, the **generation step** (the part users spend time with) follows the exact same inline panel pattern as every other tool

**New flow**: Click Templates button → Browse dialog opens → Pick template → Dialog closes → Panel opens with Template tab (topic/tone/format pre-filled from template config) → User fills topic → Clicks Generate → SSE streams into composer

---

## 5. Target State: Unified Interaction Model

### 5.1 The One Rule

> **Every tool's generation step happens in the same inline accordion panel.**

No exceptions. The panel is always in the same place (below the Content Tools button grid on desktop, bottom Sheet on mobile), always has the same structure (tab pills → form fields → Generate button), and always behaves the same way (shows loading → applies result → closes with undo toast).

### 5.2 Interaction Pattern Matrix (After)

| Feature | UI Pattern | Opens Where | Inputs | Output Target | Guard | Mobile |
|---------|------------|-------------|--------|---------------|-------|--------|
| AI Writer | **Inline panel** (Write tab) | Sidebar / Sheet | Topic, Tone, Lang, Length | All tweets | ✅ AlertDialog + Undo | Sheet |
| Inspiration | **Inline panel** (Inspire tab) | Sidebar / Sheet | Niche → pick topic → Write tab | All tweets | ✅ AlertDialog + Undo | Sheet |
| Templates | **Dialog browse → Inline panel** (Template tab) | Dialog → Sidebar / Sheet | Browse → Topic, Tone, Lang, Format | All tweets | ✅ AlertDialog + Undo | Dialog → Sheet |
| Hook | **Inline panel** (Hook tab) | Sidebar / Sheet | Topic, Tone, Lang | Active tweet | ✅ Overwrite guard + Undo | Sheet |
| Translate | **Inline panel** (Translate tab) | Sidebar / Sheet | Target language | All non-empty tweets | ✅ Confirmation + Undo | Sheet |
| Hashtags | **Inline panel** (#Tags tab) -- **stays open** | Sidebar / Sheet | Read-only content | Targeted tweet (chips) | N/A (additive) | Sheet |
| CTA | **Inline panel** (CTA tab) | Sidebar / Sheet | Tone, Lang (+ auto context) | Last tweet (append) | N/A (additive) | Sheet |

### 5.3 The Unified Mental Model

```
Every tool:  Button → Inline Panel (pre-tabbed) → Configure → Generate → Result + Undo Toast
                                                                          ↑
Templates adds one pre-step:  Browse Dialog → Pick → Dialog closes ───────┘
```

### 5.4 Panel Tab Layout (8 tabs total -- up from 6)

Current tabs: `[Write] [Hook] [CTA] [Rewrite] [Translate] [#Tags]`

New tabs: `[Write] [Inspire] [Template] [Hook] [CTA] [Rewrite] [Translate] [#Tags]`

**8 tabs may seem like a lot** -- but the pill buttons are compact (each ~60-80px), and on mobile they already `flex-wrap`. The panel is already scrollable. With 8 tabs:
- Desktop sidebar (~280px): fits 4-5 pills per row, wraps to 2 rows -- acceptable
- Mobile sheet: wraps naturally, user sees all tabs

If this feels crowded in testing, we can group them: `[Write ▾]` (Write/Inspire/Template) `[Edit ▾]` (Hook/CTA/Rewrite) `[Transform ▾]` (Translate/#Tags) -- but start with flat pills and test first.

---

## 6. Responsive Design & Mobile-First Strategy

### 6.1 Current Responsive Architecture

The Composer page uses a 2-breakpoint layout (`composer.tsx:1303`):

```
grid-cols-1                  →  Mobile (<1024px): single column, sidebar stacks BELOW editor
lg:grid-cols-3               →  Desktop (>=1024px): editor = 2/3, sidebar = 1/3
```

AI panel rendering is split by `isDesktop = useMediaQuery("(min-width: 768px)")`:
- **Desktop (>=768px)**: AI panel renders inline inside the Content Tools card (`composer.tsx:1562`)
- **Mobile (<768px)**: AI panel renders in a bottom `<Sheet>` at 60dvh (`composer.tsx:1856-1908`)

**Current responsive problems**:

| Issue | Description | Severity |
|-------|-------------|----------|
| **Tablet dead zone** | 768px-1024px: `isDesktop` is `true` (inline panel renders) but grid is still single-column — sidebar + inline panel stack below a full-width editor, making the panel very wide and wasting vertical space | MEDIUM |
| **Content Tools not accessible on mobile without scrolling** | On mobile, Content Tools card is BELOW the editor column — users must scroll past all tweet cards to reach AI tools, which is the primary interaction point | HIGH |
| **Inspiration Dialog ignores Sheet pattern** | On mobile, Inspiration opens a centered Dialog (not a Sheet) — feels inconsistent with Hook/CTA/etc. which use bottom Sheet | MEDIUM |
| **Templates Dialog not optimized for small screens** | Template browse dialog uses `max-w-2xl` and 2-column card grid — on small screens this grid collapses to 1 column but the dialog still takes modal focus with no swipe-to-dismiss | LOW |
| **8-tab pill row on narrow screens** | Adding Inspire + Template tabs (8 total) means the pill row wraps to 2+ rows on narrow panels — acceptable but could feel cramped | LOW |
| **No swipe gestures** | Bottom Sheet has no swipe-to-dismiss or swipe-between-tabs — standard mobile patterns users expect | LOW |

### 6.2 Responsive Breakpoint Strategy (Target State)

We adopt a **3-tier** responsive strategy aligned with real device widths:

| Tier | Breakpoint | Devices | Layout |
|------|-----------|---------|--------|
| **Mobile** | `< 640px` (sm) | Phones | Single column, Sheet-based tools, FAB for quick access |
| **Tablet** | `640px - 1024px` (sm-lg) | Tablets, small laptops | Single column with collapsible sidebar panel, Sheet for tools |
| **Desktop** | `>= 1024px` (lg) | Laptops, monitors | 2/3 + 1/3 grid, inline sidebar panel |

**Key change**: Align `isDesktop` threshold with the grid breakpoint:
- Current: `isDesktop = useMediaQuery("(min-width: 768px)")` — misaligned with `lg:grid-cols-3` at 1024px
- Target: `isDesktop = useMediaQuery("(min-width: 1024px)")` — matches the grid breakpoint exactly

This eliminates the tablet dead zone: below 1024px, ALL devices use the Sheet pattern.

### 6.3 Mobile-First: Floating Action Button (FAB) for AI Tools

**Problem**: On mobile, Content Tools are below the fold — users must scroll past all tweet cards to access them.

**Solution**: Add a Floating Action Button (FAB) anchored to the bottom-right corner on mobile. Tapping it opens the AI Tools Sheet directly.

```
MOBILE LAYOUT (< 1024px):
┌─────────────────────────┐
│  Editor Column           │
│  ┌─────────────────────┐ │
│  │ Tweet 1             │ │
│  │ Tweet 2             │ │
│  │ ...                 │ │
│  └─────────────────────┘ │
│                          │
│  [Content Tools card]    │  ← still here for scrolled access
│  [Publishing card]       │
│                          │
│                    ┌───┐ │
│                    │✨ │ │  ← FAB: floating, always visible
│                    └───┘ │
└─────────────────────────┘

TAP FAB → Bottom Sheet opens with AI Tools Panel
          Same panel as sidebar, same tabs, same behavior
```

**FAB design**:
- Position: `fixed bottom-6 right-6` (respects safe area: `bottom-safe`)
- Size: `h-12 w-12` circle with `Sparkles` icon
- Shadow: `shadow-lg` for elevation
- Z-index: above content but below Sheet overlay
- **Hidden on desktop** (`lg:hidden`) -- sidebar is always visible
- Badge indicator: show a small dot when AI panel was previously open (helps users find their in-progress work)
- Keyboard: `Ctrl+Shift+A` to toggle (same shortcut works on all devices)

### 6.4 Mobile Sheet Enhancements

The current bottom Sheet (`60dvh`) is functional but needs polish for the unified panel:

| Enhancement | Detail | Priority |
|-------------|--------|----------|
| **Dynamic height** | Adjust Sheet height based on active tab's content: Inspire tab with topic cards needs 70dvh; Translate tab with 1 select needs 40dvh. Use `min-h-[40dvh] max-h-[80dvh]` with content-driven auto-height | HIGH |
| **Swipe-to-dismiss** | Sheet already supports this via Radix `SheetContent` — just ensure it's not accidentally suppressed | LOW |
| **Tab scrolling** | 8 tabs in the pill row: on narrow screens, make the tab row horizontally scrollable with `overflow-x-auto` + hide scrollbar. Active tab auto-scrolls into view | HIGH |
| **Sticky Generate footer** | Generate/Cancel buttons already pinned at Sheet bottom — keep this pattern. Add Undo toast above the Sheet when triggered | KEEP |
| **Safe area** | Use `pb-safe` on Sheet content for phones with gesture bars (already present: `pb-safe` at line 1858) | KEEP |
| **Template browse dialog on mobile** | Use Sheet instead of Dialog for template browsing on mobile (Radix Dialog doesn't feel native on phones). Render as full-screen Sheet with `h-[90dvh]` | MEDIUM |

### 6.5 Tablet-Specific Considerations

At 640px-1024px (tablets in portrait/landscape):

- Grid remains single-column (`grid-cols-1`) — sidebar stacks below editor
- AI tools use the **Sheet pattern** (not inline) — because `isDesktop` threshold moves to 1024px
- Content Tools card in the stacked sidebar remains accessible by scrolling
- FAB provides instant access without scrolling
- Template browse: full Sheet on portrait tablets; Dialog on landscape tablets (>= 768px width + landscape orientation is comfortable for cards)

### 6.6 Desktop Sidebar Responsiveness

At >= 1024px, the sidebar column is `1/3` of the grid (~350px on a 1080px viewport, ~450px on 1440px):

| Screen Width | Sidebar Width | Tab Row Behavior | Notes |
|-------------|---------------|------------------|-------|
| 1024px | ~330px | Wraps to 2 rows (4+4 tabs) | Acceptable — tabs are compact pills |
| 1280px | ~410px | Fits 6-7 tabs on 1 row, wraps last 1-2 | Good |
| 1440px+ | ~460px+ | All 8 tabs on 1 row | Optimal |

If testing reveals the 2-row wrap at 1024px feels too cramped, we can:
1. Use abbreviated labels: `[Write] [Ideas] [Tmpl] [Hook] [CTA] [Redo] [Lang] [#Tags]`
2. Or group into 3 dropdowns (Create/Edit/Transform) -- but only if actually needed after testing

### 6.7 Responsive Behavior Per Tool (Target State)

| Tool | Mobile (< 1024px) | Desktop (>= 1024px) |
|------|-------------------|---------------------|
| **AI Writer** | FAB or scroll → Sheet (Write tab) | Sidebar inline panel (Write tab) |
| **Inspiration** | FAB or scroll → Sheet (Inspire tab) | Sidebar inline panel (Inspire tab) |
| **Templates** | FAB or scroll → full Sheet browse → Sheet (Template tab) | Sidebar button → Dialog browse → inline panel (Template tab) |
| **Hook** | FAB or scroll → Sheet (Hook tab) | Sidebar inline panel (Hook tab) |
| **CTA** | FAB or scroll → Sheet (CTA tab) | Sidebar inline panel (CTA tab) |
| **Translate** | FAB or scroll → Sheet (Translate tab) | Sidebar inline panel (Translate tab) |
| **Hashtags** | FAB or scroll → Sheet (#Tags tab) → chips on tweet card | Sidebar inline panel (#Tags tab) → chips on tweet card |

**Consistency achieved**: Every tool on every screen size follows the same flow:
`Trigger → Panel (Sheet on mobile / Inline on desktop) → Configure → Generate → Result`

### 6.8 Touch Interaction Patterns

| Pattern | Implementation | Where |
|---------|----------------|-------|
| **Tap target sizing** | All interactive elements >= 44x44px touch target (WCAG 2.5.8) | Buttons, tab pills, chips, topic cards |
| **Scroll momentum** | Native `-webkit-overflow-scrolling: touch` on topic card lists and template grids | Sheet content, template browse |
| **Input focus handling** | On mobile Sheet, auto-focus first input after Sheet animation completes (300ms delay) to avoid keyboard-triggered layout shift | All tabs with text inputs |
| **Keyboard avoidance** | Sheet should use `dvh` units (already `60dvh`) so the Sheet height accounts for virtual keyboard; content scrolls within the Sheet | Sheet content |
| **Pinch-to-zoom prevention** | `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">` prevents accidental zoom on double-tap of small elements | Root layout |

### 6.9 Responsive Changes Required Per Phase

| Phase | Responsive Tasks | Files |
|-------|-----------------|-------|
| **0** | Change `isDesktop` threshold from 768px to 1024px; Add FAB component (mobile only) | `composer.tsx`, new `components/composer/ai-fab.tsx` |
| **1** | Ensure Inspire tab works in Sheet; auto-scroll tab row to active tab; topic cards scrollable | `ai-tools-panel.tsx` |
| **2** | Template browse: use Sheet instead of Dialog on mobile; Template tab works in Sheet | `templates-dialog.tsx`, `composer.tsx` |
| **3** | Target highlighting works on both layouts; hashtag chips touch-friendly (44px targets) | `tweet-card.tsx`, `ai-tools-panel.tsx` |
| **4** | Keyboard shortcuts: skip on touch devices (no Ctrl key); show FAB tooltip instead | `composer.tsx` |

---

## 7. User Experience Flow Diagrams (Before vs After)

### 6.1 AI Writer (No Change)

```
BEFORE & AFTER (already the gold standard):

  [AI Writer] button
       │
       ▼
  ┌─────────────────────────────────────────┐
  │  AI TOOLS PANEL (Write tab)              │
  │  Topic: [________________________]       │
  │  Tone:  [Professional ▾]  Lang: [En ▾]  │
  │  Length: ○ Short ● Medium ○ Long         │
  │  [Cancel]  [✨ Generate]                 │
  └───────────────┬─────────────────────────┘
                  │
     ┌────────────┴────────────┐
     │ Content > 50ch?         │
     │ YES → AlertDialog       │──► Confirm or Cancel
     │ NO  → proceed           │
     └────────────┬────────────┘
                  │
     SSE streams → tweets appear → panel closes
     Toast: "Thread generated!" [Undo]  ← NEW: undo button
```

### 6.2 Inspiration (CHANGED: Dialog → Inline Tab)

```
BEFORE:                                    AFTER:
┌──────────────┐                          ┌──────────────┐
│ Inspiration  │                          │ Inspiration  │
└──────┬───────┘                          └──────┬───────┘
       │ click                                   │ click
       ▼                                         ▼
┌─────────────────────┐               ┌───────────────────────────────────┐
│  DIALOG (centered)  │               │  AI TOOLS PANEL (Inspire tab)     │
│                     │               │  [Write] [Inspire●] [Template]... │
│  Niche: [Tech ▾]   │               │                                   │
│  [Get Ideas]        │               │  Niche: [Technology ▾] [Get Ideas]│
│                     │               │                                   │
│  ┌───────────────┐  │               │  ┌───────────────────────────┐    │
│  │ Topic + Hook  │  │               │  │ "AI in 2026"              │    │
│  └───────┬───────┘  │               │  │  "You won't believe..."   │    │
│          │ click     │               │  └───────────────┬───────────┘    │
│  Dialog closes       │               │  ┌───────────────┴───────────┐    │
│  Auto-fires AI ← ⚠️  │               │  │ "Remote Work Trends"      │    │
└──────────────────────┘               │  │  "The truth about..."     │    │
                                       │  └───────────────┬───────────┘    │
                                       │                  │ click           │
                                       │  Tab switches to Write            │
                                       │  Topic pre-filled ← user CAN edit │
                                       │  [Cancel]  [✨ Generate]          │
                                       └──────────────────────────────────┘

KEY IMPROVEMENTS:
✅ Same inline panel as every other tool
✅ User can edit topic before generating
✅ No modal/dialog context switch
✅ Same mobile Sheet pattern
```

### 6.3 Templates (CHANGED: Full Dialog → Browse Dialog + Inline Panel)

```
BEFORE:                                    AFTER:
┌───────────┐                             ┌───────────┐
│ Templates │                             │ Templates │
└─────┬─────┘                             └─────┬─────┘
      │ click                                   │ click
      ▼                                         ▼
┌──────────────────────┐               ┌──────────────────────┐
│  DIALOG (max-w-2xl)  │               │  DIALOG (max-w-2xl)  │  ← Browse stays as dialog
│                      │               │  (browse only)        │
│  VIEW 1: Browse      │               │                      │
│  [System] [My]       │               │  [System] [My]       │
│  Filter pills        │               │  Filter pills        │
│  ┌────┐ ┌────┐       │               │  ┌────┐ ┌────┐      │
│  │Card│ │Card│       │               │  │Card│ │Card│       │
│  └──┬─┘ └────┘       │               │  └──┬─┘ └────┘      │
│     │ click           │               │     │ click          │
│     ▼                 │               │     ▼                │
│  VIEW 2: Generate     │               │  Dialog CLOSES       │  ← Generation moves out
│  Topic: [____]        │               └──────────────────────┘
│  Tone/Lang/Format     │                     │
│  [Generate with AI]   │                     ▼
│  (SSE inside dialog)  │               ┌──────────────────────────────────┐
│     │ done             │               │  AI TOOLS PANEL (Template tab)   │
│  Dialog closes        │               │  [Write] [Inspire] [Template●].. │
└──────────────────────┘               │                                   │
                                       │  Template: "Thread Hook Formula"  │
                                       │  Topic: [________________________]│
                                       │  Tone:  [Professional ▾]         │
                                       │  Lang:  [English ▾]              │
                                       │  Format:[Thread 3-5 tweets ▾]    │
                                       │                                   │
                                       │  [Cancel]  [✨ Generate with AI]  │
                                       └──────────────────────────────────┘

KEY IMPROVEMENTS:
✅ Generation step matches all other tools (same panel, same position)
✅ Browse dialog is only used where it genuinely needs space (card grid)
✅ User can switch tabs to Write/Hook/etc. without leaving panel
✅ Same mobile Sheet for generation; dialog only for browsing
```

### 6.4 Hook (CHANGED: Targets Active Tweet + Overwrite Guard)

```
BEFORE:                                    AFTER:
  [Hook] button                              [Hook] button
       │                                          │
       ▼                                          ▼
  Panel opens (Hook tab)                    Panel opens (Hook tab)
  Topic: [optional]                         Target: "Tweet #5" ← shows which tweet
  Tone/Language                             Topic: [optional]
  [Generate]                                Tone/Language
       │                                    [Generate]
       ▼                                          │
  Replaces tweet[0] ← ALWAYS!              ┌─────┴──────────────┐
  No confirmation ← ⚠️                      │ Active tweet > 50ch?│
  Toast: "Hook generated!"                  │ YES → AlertDialog   │
                                            │ NO  → proceed       │
                                            └─────┬──────────────┘
                                                  │
                                            Replaces ACTIVE tweet ← correct!
                                            Toast: "Hook generated!" [Undo]
```

### 6.5 Translate (CHANGED: Adds Confirmation)

```
BEFORE:                                    AFTER:
  [Translate] button                         [Translate] button
       │                                          │
       ▼                                          ▼
  Panel opens (Translate tab)               Panel opens (Translate tab)
  Target: [Arabic ▾]                        Target: [Arabic ▾]
  [Generate]                                Affects: 5 tweets ← NEW: shows scope
       │                                    [Generate]
       ▼                                          │
  ALL tweets replaced ← ⚠️ silently!              ▼
  Toast: "Thread translated!"               ┌─────────────────────────┐
                                            │ Confirmation:            │
                                            │ "Translate 5 tweets      │
                                            │  to Arabic?"             │
                                            │ [Cancel] [Translate]     │
                                            └─────────┬───────────────┘
                                                      │
                                            All tweets translated
                                            Toast: "Translated!" [Undo]
```

### 6.6 Hashtags (CHANGED: Panel Stays Open)

```
BEFORE:                                    AFTER:
  [Hashtags] button                          [Hashtags] button
       │                                          │
       ▼                                          ▼
  Panel opens (#Tags tab)                   Panel opens (#Tags tab)
  Shows tweet content                       Shows tweet content
  [Generate]                                [Generate]
       │                                          │
       ▼                                          ▼
  Panel CLOSES immediately ← jarring!       Panel STAYS OPEN ← consistent!
  Chips appear on tweet card                ┌────────────────────────────┐
  (different location!) ← confusing!        │ Generated hashtags:         │
                                            │ [#AI ✓] [#Tech] [#2026]   │
                                            │                            │
                                            │ Click to add to tweet.     │
                                            │ [Done]                     │
                                            └────────────────────────────┘
                                            Chips also shown on tweet card
                                            (dual display -- panel + inline)
```

### 6.7 CTA (CHANGED: Gets Thread Context)

```
BEFORE:                                    AFTER:
  [CTA] button                               [CTA] button
       │                                          │
       ▼                                          ▼
  Panel opens (CTA tab)                     Panel opens (CTA tab)
  Tone: [Professional ▾]                    Context: "Your thread about..."  ← auto-summary
  Language: [English ▾]                     Tone: [Professional ▾]
  ← NO topic/context! → generic CTA        Language: [English ▾]
  [Generate]                                [Generate]
       │                                          │
       ▼                                          ▼
  Generic CTA appended to last tweet        Contextual CTA appended to last tweet
  Toast: "CTA added!"                       Toast: "CTA added!" [Undo not needed -- append]
```

---

## 7. Recommendations

### R1: Add Overwrite Guards to Hook and Translate (Critical)

**Problem**: Hook replaces active tweet content and Translate replaces ALL tweet content WITHOUT confirmation.

**Solution**: Add the same `confirmOverwrite` AlertDialog pattern used by AI Writer.
- Hook: check if target tweet's `content.length > 50`
- Translate: always confirm with scope info: "This will translate N tweet(s) to {language}. Continue?"

**Implementation**:
- Reuse existing `confirmOverwrite` + `pendingTweets` state pattern from `composer.tsx:785-791`
- Hook guard goes in `handleAiRun` at line 902, before the fetch
- Translate guard goes in `handleAiRun` at line 955, before the fetch

**Effort**: Small
**Files**: `composer.tsx`

---

### R2: Make Hook Target the Active Tweet

**Problem**: Hook always replaces `tweets[0]` regardless of which tweet the user is editing.

**Solution**:
1. Change button: `openAiTool("hook")` → `openAiTool("hook", activeTweetId ?? tweets[0]?.id)`
2. In `openAiTool`: add `"hook"` to the `tool === "rewrite" || tool === "hashtags"` branch so it also sets `aiTargetTweetId`
3. In `handleAiRun` hook branch: change `tweets[0]` to `tweets.find(t => t.id === aiTargetTweetId) ?? tweets[0]`

**Effort**: Minimal -- 3-line change
**Files**: `composer.tsx`

---

### R3: Give CTA Thread Context

**Problem**: CTA generates blind (no content context) → generic CTAs.

**Solution**: Auto-send first tweet content (or concatenated thread summary, max 500 chars) as `context` field in the API call body. The API route already accepts arbitrary extra fields -- just add `context` to the prompt.

**Implementation**:
- `composer.tsx` CTA branch (line 929): add `context: tweets.map(t => t.content).filter(Boolean).join(' ').slice(0, 500)`
- `src/app/api/ai/tools/route.ts`: include `context` in the system prompt for CTA tool

**Effort**: Small
**Files**: `composer.tsx`, `src/app/api/ai/tools/route.ts`

---

### R4: Convert Inspiration from Dialog to Inline Panel Tab

**Problem**: Inspiration uses a centered Dialog -- different pattern from all other tools.

**Solution**: Add "Inspire" as a new tab in `AiToolsPanel`. The tab contains:
- Niche `<Select>` + "Get Ideas" button (same as current dialog)
- Scrollable topic card list (max-height 200px in panel)
- Clicking a topic card → switches to Write tab with topic pre-filled (user clicks Generate manually)

**Implementation**:
1. Add `"inspire"` to `AiToolType` union in `ai-tools-panel.tsx`
2. Add `{ id: "inspire", label: "Inspire", Icon: Lightbulb }` to TOOLS array
3. Move Inspiration UI from `inspiration-panel.tsx` into a new conditional block in `AiToolsPanel`
4. Add niche state + fetch logic as new props on `AiToolsPanelProps` (or manage locally via internal state since fetch is self-contained)
5. On topic card click: call `onTopicChange(topic)` + `onToolChange("thread")` -- this pre-fills and switches tab
6. Remove the auto-fire `useEffect` at `composer.tsx:1057-1064`
7. Replace `<InspirationPanel>` button in composer with `openAiTool("inspire")`
8. Delete `inspiration-panel.tsx` (or keep as deprecated reference)

**Effort**: Medium
**Files**: `ai-tools-panel.tsx`, `composer.tsx`, delete `inspiration-panel.tsx`

---

### R5: Convert Template Generation to Inline Panel Tab (Hybrid)

**Problem**: Template generation uses a Dialog form -- different pattern from all other tools.

**Solution**: Split Templates into two parts:
1. **Browse** stays as a Dialog (needs space for card grid) -- but the generate view is removed from the dialog
2. **Generate** moves to a new "Template" tab in `AiToolsPanel`

**Implementation**:
1. Add `"template"` to `AiToolType` union
2. Add `{ id: "template", label: "Template", Icon: LayoutTemplate }` to TOOLS array
3. Add new props to `AiToolsPanelProps`: `templateConfig: TemplatePromptConfig | null`, `templateFormat: OutputFormat`, `onFormatChange: (v: OutputFormat) => void`
4. In `AiToolsPanel`, when `aiTool === "template"` and `templateConfig` exists, show: Template name header + Topic input + Tone/Language/Format selects (same inputs as current dialog View 2, reusing existing form fields)
5. In `templates-dialog.tsx`: change `handleSystemTemplateClick` to NOT switch to View 2. Instead: set `selectedConfig` in parent state via new `onTemplateSelect(config)` callback → close dialog → call `openAiTool("template")`
6. In `composer.tsx`: add `templateConfig` state, wire it to `AiToolsPanel`
7. The `handleAiRun` function gets a new `aiTool === "template"` branch that calls `POST /api/ai/template-generate` (move SSE logic from `templates-dialog.tsx:209-324`)
8. Remove the generate view from `templates-dialog.tsx` (keep list view only)

**Effort**: Medium-Large
**Files**: `ai-tools-panel.tsx`, `composer.tsx`, `templates-dialog.tsx`

---

### R6: Keep Hashtag Panel Open After Generation

**Problem**: Panel closes immediately after hashtag generation; chips appear in a different spatial context.

**Solution**: After generation, keep panel open and show chips inside the panel. Dual display: chips appear both in the panel (primary) and on the tweet card (secondary).

**Implementation**:
1. In `composer.tsx` hashtags branch (line 1013-1014): remove `setIsAiOpen(false)`
2. In `ai-tools-panel.tsx`: add a new section below the read-only content display that renders `generatedHashtags` as clickable chip buttons when `aiTool === "hashtags"`
3. Add new props: `generatedHashtags: string[]`, `onHashtagClick: (tag: string) => void`
4. Each chip click calls `onHashtagClick` (same handler as tweet card chips)
5. Show chip count: "Click to add (3 remaining)"
6. Add a "Done" button at the bottom to close the panel
7. Keep the tweet-card chips as well -- they stay visible after the panel closes via "Done"

**Effort**: Medium
**Files**: `ai-tools-panel.tsx`, `composer.tsx`

---

### R7: Add Undo-via-Toast for All Destructive Operations

**Problem**: No way to recover after any destructive AI operation.

**Solution**: Before any destructive operation, snapshot `tweets` state. After completion, show toast with "Undo" action button (5-second window). Clicking Undo restores the snapshot.

**Implementation**:
1. Add `previousTweetsRef = useRef<TweetDraft[] | null>(null)` in composer
2. Before destructive operations (AI Writer, Hook, Translate, Templates, Rewrite), save: `previousTweetsRef.current = structuredClone(tweets)`
3. Replace simple `toast.success(...)` calls with:
   ```typescript
   toast.success("Thread generated!", {
     action: {
       label: "Undo",
       onClick: () => {
         if (previousTweetsRef.current) {
           setTweets(previousTweetsRef.current);
           previousTweetsRef.current = null;
           toast.info("Changes undone");
         }
       },
     },
     duration: 5000,
   });
   ```
4. Non-destructive tools (CTA append, Hashtags) don't need undo

**Effort**: Medium
**Files**: `composer.tsx`

---

### R8: Add Visual Feedback for Output Target

**Problem**: Users can't predict WHICH tweet(s) will be affected by a tool.

**Solution**: When the AI panel is open, highlight the target tweet card(s) with a subtle ring:
- AI Writer / Template / Inspire: All cards → `ring-2 ring-primary/20`
- Hook / Rewrite / Hashtags: Only `aiTargetTweetId` card → `ring-2 ring-primary/30`
- CTA: Only last tweet card → `ring-2 ring-primary/20`
- Translate: All non-empty cards → `ring-2 ring-primary/20`

**Implementation**:
1. Pass `aiTool`, `aiTargetTweetId`, `isAiOpen` down to `SortableTweet` / `TweetCard`
2. Compute `isTargeted` per card based on tool + card position
3. Apply conditional `ring-2 ring-primary/20 transition-all` class

**Effort**: Small-Medium
**Files**: `composer.tsx`, `sortable-tweet.tsx` or `tweet-card.tsx`

---

### R9: Unified Empty-State Messaging

**Problem**: Inconsistent behavior when tools are used on empty content.

**Solution**: Add inline validation in `AiToolsPanel` with consistent amber alert styling.

| Tool | Requires Content? | Empty-State Message |
|------|-------------------|---------------------|
| Write / Inspire | No (topic is input) | N/A |
| Template | No (topic is input) | N/A |
| Hook | No (topic optional) | N/A |
| CTA | No (generates standalone) | N/A |
| Translate | Yes | "Add content to your tweets first" |
| Hashtags | Yes | "Add content to this tweet first" |
| Rewrite | Yes | "Add content to this tweet first" |

Generate button is already disabled for empty required content (`ai-tools-panel.tsx:91-97`). Just add consistent visual messaging.

**Effort**: Small
**Files**: `ai-tools-panel.tsx`

---

### R10: Keyboard Shortcuts + Tooltips

**Problem**: Power users must mouse-click through the button grid.

**Solution**: Add `Ctrl+Shift+W/I/T/H` shortcuts for Write/Inspire/Translate/Hashtags. Show hints in button tooltips.

**Effort**: Small
**Files**: `composer.tsx`

---

## 8. Phased Implementation Plan (with Agent Strategy)

### Phase 0: Safety & Data Protection ✅ COMPLETE (2026-04-07)
> **Priority**: CRITICAL -- prevents data loss
> **Status**: COMPLETED
> **All changes in one file**: `composer.tsx`

| # | Task | Rec | Files | Status |
|---|------|-----|-------|--------|
| 0.1 | Add overwrite guard to Hook | R1 | `composer.tsx` | ✅ Done |
| 0.2 | Add translate confirmation dialog | R1 | `composer.tsx` | ✅ Done |
| 0.3 | Make Hook target active tweet (not always tweet[0]) | R2 | `composer.tsx` | ✅ Done |
| 0.4 | Implement undo-via-toast for all destructive tools | R7 | `composer.tsx` | ✅ Done |

#### LLM Agent Strategy (Phase 0)

**Agent Count**: 1 agent (all changes are in `composer.tsx` and interdependent)
**Agent Type**: `general-purpose`

**Key Implementation Rules**:
- All changes are in `handleAiRun()` function and `openAiTool()` in `composer.tsx`
- Add `previousTweetsRef = useRef<TweetDraft[] | null>(null)` near other refs
- For Hook guard: reuse existing `confirmOverwrite` + `pendingTweets` state pattern -- check `aiTargetTweetId` content length > 50
- For Translate guard: add a new `confirmTranslate` boolean state + AlertDialog (separate from overwrite guard because the messaging is different: "Translate N tweets?" vs "Replace content?")
- For Hook targeting: add `"hook"` to the `if ((tool === "rewrite" || tool === "hashtags") && tweetId)` branch in `openAiTool()`, and change the button call to `openAiTool("hook", activeTweetId ?? tweets[0]?.id)`
- For undo toast: snapshot `previousTweetsRef.current = structuredClone(tweets)` before every destructive fetch, then use `toast.success(msg, { action: { label: "Undo", onClick: restore } })` with `duration: 5000`
- Destructive tools that need undo: `thread`, `hook`, `translate`, `rewrite`, `template`
- Non-destructive tools that DON'T need undo: `cta` (append), `hashtags` (additive chips)
- Run `pnpm lint && pnpm typecheck` after all changes

**Acceptance Criteria**:
- [x] Hook shows AlertDialog when target tweet has > 50 chars of content
- [x] Hook replaces the currently-focused tweet, not always tweet[0]
- [x] Translate shows confirmation "Translate N tweets to {language}?"
- [x] All destructive operations show toast with "Undo" button (5s window)
- [x] Clicking Undo restores previous tweet state
- [x] Lint + typecheck pass

---

### Phase 1: Unify Inspiration into Inline Panel ✅ **COMPLETED 2026-04-07**
> **Priority**: HIGH -- eliminates Dialog inconsistency, fixes auto-fire
> **Estimated Effort**: 2-3 hours
> **Core principle**: Inspiration becomes a tab in `AiToolsPanel`

| # | Task | Rec | Files | Effort | Status |
|---|------|-----|-------|--------|--------|
| 1.1 | Add `"inspire"` to `AiToolType` union type | R4 | `ai-tools-panel.tsx` | 5 min | ✅ Done |
| 1.2 | Add Inspire tab UI in AiToolsPanel (niche select + fetch + topic cards) | R4 | `ai-tools-panel.tsx` | 60 min | ✅ Done |
| 1.3 | Wire Inspiration button in composer to `openAiTool("inspire")` | R4 | `composer.tsx` | 15 min | ✅ Done |
| 1.4 | Handle topic selection: switch to Write tab with pre-filled topic | R4 | `ai-tools-panel.tsx`, `composer.tsx` | 20 min | ✅ Done |
| 1.5 | Remove auto-fire `useEffect` at composer.tsx:1057-1064 | R4 | `composer.tsx` | 5 min | ✅ Done |
| 1.6 | Remove or deprecate `inspiration-panel.tsx` | R4 | delete file | 5 min | ✅ Done |
| 1.7 | Add unified empty-state validation messages | R9 | `ai-tools-panel.tsx` | 20 min | ✅ Done (pre-existing) |

#### LLM Agent Strategy (Phase 1)

**Agent Count**: 2 agents in parallel
**Agent Types**: Both `general-purpose`

**Agent 1 -- AiToolsPanel changes (1.1, 1.2, 1.7)**:
- Add `"inspire"` to the `AiToolType` union: `export type AiToolType = "thread" | "inspire" | "hook" | "cta" | "rewrite" | "translate" | "hashtags";`
- Add `{ id: "inspire", label: "Inspire", Icon: Lightbulb }` to the TOOLS array (position 2, after "thread")
- Add new props to `AiToolsPanelProps`: `inspirationTopics: Array<{topic: string; hook: string}>`, `isLoadingInspiration: boolean`, `inspirationNiche: string`, `onNicheChange: (v: string) => void`, `onFetchInspiration: () => void`, `onInspirationSelect: (topic: string, hook: string) => void`
- When `aiTool === "inspire"`, render: niche select (10 options) + "Get Ideas" button + scrollable topic card list (max-h-[200px] overflow-y-auto)
- Each topic card: clickable `<button>` with `p-2.5 border rounded-lg hover:bg-muted/50 cursor-pointer` -- shows topic title (bold) + hook text (italic, muted)
- On topic card click: call `onInspirationSelect(topic, hook)` which parent handles
- Add empty-state messages for Translate/Hashtags/Rewrite tabs (amber info boxes) when content is empty
- Import `Lightbulb` from lucide-react

**Agent 2 -- Composer wiring (1.3, 1.4, 1.5, 1.6)**:
- Add inspiration state to composer: `const [inspirationTopics, setInspirationTopics] = useState<Array<{topic: string; hook: string}>>([])`, `const [inspirationNiche, setInspirationNiche] = useState("Technology")`, `const [isLoadingInspiration, setIsLoadingInspiration] = useState(false)`
- Add `handleFetchInspiration` async function: fetch from `/api/ai/inspiration?niche=${inspirationNiche}&language=${aiLanguage}`, set topics in state, handle 402 with upgrade modal
- Add `handleInspirationSelect(topic, hook)`: set `aiTopic = topic`, `aiHook = hook`, switch to `openAiTool("thread")` -- but WITHOUT auto-firing (user clicks Generate manually)
- Replace `<InspirationPanel ... />` button with `<Button variant="outline" onClick={() => openAiTool("inspire")}><Lightbulb />Inspiration</Button>`
- Remove the auto-fire `useEffect` at line 1057-1064 (the `pendingInspirationRef` logic)
- Remove `pendingInspirationRef` declaration
- Delete or empty `inspiration-panel.tsx`
- Pass all inspiration props to `AiToolsPanel`
- Run `pnpm lint && pnpm typecheck` after changes

**Acceptance Criteria**:
- [x] Clicking "Inspiration" opens the inline panel with Inspire tab (not a Dialog)
- [x] User can pick niche, fetch ideas, see topic cards -- all inside the panel
- [x] Clicking a topic card switches to Write tab with topic pre-filled
- [x] User must manually click Generate (no auto-fire)
- [x] Mobile: Inspiration works in the bottom Sheet, same as all other tools
- [x] Empty-state messages appear consistently for content-dependent tools
- [x] `inspiration-panel.tsx` is removed; no Dialog import remains
- [x] Lint + typecheck pass

---

### Phase 2: Unify Template Generation into Inline Panel (Hybrid) ✅ **COMPLETED 2026-04-07**
> **Priority**: HIGH -- last Dialog-based generation flow to eliminate
> **Estimated Effort**: 3-4 hours
> **Actual Effort**: ~3 hours
> **Core principle**: Browse in Dialog, Generate in inline panel

| # | Task | Rec | Files | Effort |
|---|------|-----|-------|--------|
| 2.1 | Add `"template"` to `AiToolType` union type | R5 | `ai-tools-panel.tsx` | ✅ Done |
| 2.2 | Add Template tab UI in AiToolsPanel (name header + topic/tone/lang/format) | R5 | `ai-tools-panel.tsx` | ✅ Done |
| 2.3 | Add template state + generation handler to composer | R5 | `composer.tsx` | ✅ Done |
| 2.4 | Modify TemplatesDialog: remove generate view, add `onTemplateSelect` callback | R5 | `templates-dialog.tsx` | ✅ Done |
| 2.5 | Wire template selection: dialog closes → inline panel opens with Template tab | R5 | `composer.tsx` | ✅ Done |
| 2.6 | Move SSE template generation logic from TemplatesDialog to composer's handleAiRun | R5 | `composer.tsx`, `templates-dialog.tsx` | ✅ Done |
| 2.7 | Give CTA access to thread context | R3 | `composer.tsx`, `api/ai/tools/route.ts` | ✅ Done |

**Implementation Summary**:
- Added `"template"` to `AiToolType` with LayoutTemplate icon
- Created Template tab UI in AiToolsPanel with template info header, topic input, and format selector
- Added template state management in composer (templateConfig, templateFormat)
- Refactored TemplatesDialog to pure browse/select component (removed generate view)
- Implemented CTA context feature for better relevance (first 500 chars of thread content)
- All generation now happens through composer's unified handleAiRun with SSE streaming

**Acceptance Criteria**:
- [x] Clicking a System Template in the browse dialog closes the dialog and opens the inline panel with Template tab pre-filled
- [x] Template tab shows: template name, topic input, tone/language/format selects
- [x] Clicking Generate in the Template tab streams tweets into the composer (same as AI Writer)
- [x] "My Templates" direct insert still works (bypasses generation)
- [x] "Re-generate" on My Templates opens inline panel with Template tab
- [x] CTA generates contextually relevant text based on thread content
- [x] Overwrite guard + undo toast work for template generation
- [x] Templates dialog is now a pure browse/select component (no generate view)
- [x] Lint + typecheck pass

**Technical Notes**:
- AI SDK v5 (not v6) — `generateObject` is still correct for this version
- Import order warnings fixed with `pnpm lint --fix`
- All Phase 2 tasks complete

---

### Phase 3: Visual Feedback & Polish ✅ **COMPLETED 2026-04-07**
> **Priority**: MEDIUM -- improves clarity, completes the unified experience
> **Estimated Effort**: 2-3 hours
> **Actual Effort**: ~2 hours

| # | Task | Rec | Files | Effort |
|---|------|-----|-------|--------|
| 3.1 | Highlight target tweet cards when AI panel is open | R8 | `composer.tsx`, `tweet-card.tsx`, `sortable-tweet.tsx` | ✅ Done |
| 3.2 | Keep hashtag panel open with chips inside panel | R6 | `ai-tools-panel.tsx`, `composer.tsx` | ✅ Done |
| 3.3 | Standardize all toast messages | -- | `composer.tsx` | ✅ Done |
| 3.4 | Show scope info in panel (e.g. "Affects: Tweet #3" or "Affects: All 5 tweets") | -- | `ai-tools-panel.tsx` | ✅ Done |

**Implementation Summary**:
- Added `isAiTarget` prop to TweetCard and SortableTweet with ring-2 ring-primary/20 styling
- Computed isAiTarget logic in composer based on aiTool and tweet properties
- Added scope indicator below AI panel tabs with Target icon
- Hashtag panel now stays open after generation with inline chips
- All toast messages standardized with tool name prefix
- Added "N remaining" counter and Done button for hashtag chips

**Acceptance Criteria**:
- [x] When AI panel is open, target tweet cards glow with a subtle ring
- [x] Panel shows "Affects: ..." scope indicator below tabs
- [x] Hashtag panel stays open after generation; chips appear inside panel
- [x] Clicking "Done" in hashtag panel closes it; chips remain on tweet card
- [x] All toasts follow consistent format with Undo where appropriate
- [x] Lint + typecheck pass

---

### Phase 4: Power User Features ✅ **COMPLETED 2026-04-07**
> **Priority**: LOW -- nice-to-have polish
> **Estimated Effort**: 1-2 hours
> **Actual Effort**: ~1 hour

| # | Task | Rec | Files | Effort |
|---|------|-----|-------|--------|
| 4.1 | Keyboard shortcuts: Ctrl+Shift+W (Write), Ctrl+Shift+I (Inspire), Ctrl+Shift+T (Translate), Ctrl+Shift+H (Hashtags) | R10 | `composer.tsx` | ✅ Done |
| 4.2 | Show shortcut hints in button tooltips | R10 | `composer.tsx` | ⚠️ Deferred (requires Tooltip wrapping) |
| 4.3 | Remember last-used tone per tool (not just global) | -- | `ai-tools-panel.tsx`, localStorage | ✅ Done |
| 4.4 | Add "Regenerate" action in success toast | -- | `composer.tsx` | ⚠️ Deferred (Sonner doesn't support multiple actions natively) |

**Implementation Summary**:
- Added keyboard shortcuts: Ctrl+Shift+W/I/T/H for Write/Inspire/Translate/Hashtags
- Implemented per-tool tone memory using localStorage key `"astra-ai-tone-prefs"`
- Each tool now remembers its last-used tone when switching between tools

**Deferred Items (requires additional research/dependencies)**:
- Task 4.2: Tooltips would require wrapping all tool buttons with `<Tooltip>` component
- Task 4.4: Sonner library doesn't natively support multiple actions in toasts (would need custom toast components)

**Technical Notes**:
- useKeyboardShortcuts hook already supports `shift` modifier for Ctrl+Shift combinations
- Tone preferences stored as JSON object with tool name as key
- ESLint warning for exhaustive-deps resolved with inline comment

**Acceptance Criteria**:
- [x] Ctrl+Shift+W/I/T/H open respective tools from anywhere in the composer
- [ ] Hovering over tool buttons shows keyboard shortcut tooltip (deferred - requires Tooltip component wrapping)
- [x] Switching to Hook then back to Write preserves each tool's last-used tone
- [ ] Success toast has both "Undo" and "Regenerate" action buttons (deferred - Sonner limitation)
- [x] Lint + typecheck pass

---

## Summary: Priority & Effort Matrix

| Phase | Focus | Recs | Effort | Agents | Priority |
|-------|-------|------|--------|--------|----------|
| **0** | Safety: guards + undo + hook targeting | R1, R2, R7 | 1-2 hrs | 1 | CRITICAL |
| **1** | Unify Inspiration → inline tab | R4, R9 | 2-3 hrs | 2 parallel | HIGH |
| **2** | Unify Template generation → inline tab (hybrid) + CTA context | R5, R3 | 3-4 hrs | 3 parallel | HIGH |
| **3** | Visual feedback: target highlighting, hashtag panel, toast consistency | R8, R6 | 2-3 hrs | 2 parallel | MEDIUM |
| **4** | Power user: shortcuts, tooltips, per-tool prefs, regenerate | R10 | 1-2 hrs | 1 | LOW |

**Total estimated effort**: 9-14 hours across 5 phases
**Total agents needed**: 9 agents across all phases (parallelized within each phase)

---

## Appendix A: File Reference

| File | Path | Phase Impact |
|------|------|-------------|
| Composer | `src/components/composer/composer.tsx` | 0, 1, 2, 3, 4 |
| AI Tools Panel | `src/components/composer/ai-tools-panel.tsx` | 1, 2, 3 |
| Inspiration Panel | `src/components/composer/inspiration-panel.tsx` | 1 (DELETE) |
| Templates Dialog | `src/components/composer/templates-dialog.tsx` | 2 (simplify) |
| Tweet Card | `src/components/composer/tweet-card.tsx` | 3 |
| Sortable Tweet | `src/components/composer/sortable-tweet.tsx` | 3 |
| AI Tools API | `src/app/api/ai/tools/route.ts` | 2 (CTA context) |
| AI Length Selector | `src/components/composer/ai-length-selector.tsx` | -- (no change) |

## Appendix B: Tab Layout Evolution

```
BEFORE (6 tabs):
[Write] [Hook] [CTA] [Rewrite] [Translate] [#Tags]

AFTER (8 tabs):
[Write] [Inspire] [Template] [Hook] [CTA] [Rewrite] [Translate] [#Tags]

Grouping option (if 8 feels crowded -- test first):
[Create ▾] [Edit ▾] [Transform ▾]
  Write       Hook      Translate
  Inspire     CTA       #Tags
  Template    Rewrite
```

## Appendix C: State Changes Summary

### New State in `composer.tsx`

```typescript
// Phase 0
const previousTweetsRef = useRef<TweetDraft[] | null>(null);
const [confirmTranslate, setConfirmTranslate] = useState(false);

// Phase 1
const [inspirationTopics, setInspirationTopics] = useState<Array<{topic: string; hook: string}>>([]);
const [inspirationNiche, setInspirationNiche] = useState("Technology");
const [isLoadingInspiration, setIsLoadingInspiration] = useState(false);

// Phase 2
const [templateConfig, setTemplateConfig] = useState<TemplatePromptConfig | null>(null);
const [templateFormat, setTemplateFormat] = useState<OutputFormat>("thread-short");
```

### Removed State

```typescript
// Phase 1 -- removed
const pendingInspirationRef = useRef<...>(null);  // no longer needed (no auto-fire)

// Phase 2 -- moved from templates-dialog.tsx to composer.tsx
// (generation state now lives in composer, not in dialog)
```

### New/Modified Props on `AiToolsPanelProps`

```typescript
// Phase 1
inspirationTopics: Array<{topic: string; hook: string}>;
isLoadingInspiration: boolean;
inspirationNiche: string;
onNicheChange: (v: string) => void;
onFetchInspiration: () => void;
onInspirationSelect: (topic: string, hook: string) => void;

// Phase 2
templateConfig: { id: string; name: string; description: string; placeholderTopic: string } | null;
templateFormat: string;
onFormatChange: (v: string) => void;

// Phase 3
generatedHashtags: string[];
onHashtagClick: (tag: string) => void;
onHashtagsDone: () => void;
```
