# Dashboard UI/UX Audit — Authenticated Experience

**Scope:** Code-level audit of 5 authenticated routes and their shared shell.
**Date:** 2026-05-28
**Method:** Source reading of page files, shared layout, design tokens, and dependent components. No code was modified.

**Routes audited**

1. `/dashboard` — `src/app/dashboard/page.tsx`
2. `/dashboard/compose` — `src/app/dashboard/compose/page.tsx`
3. `/dashboard/ai` — `src/app/dashboard/ai/page.tsx`
4. `/dashboard/ai/agentic` — `src/app/dashboard/ai/agentic/page.tsx`
5. `/dashboard/inspiration` — `src/app/dashboard/inspiration/page.tsx`

---

## 1. Executive Summary

### Architecture at a glance

- **Framework / routing:** Next.js 16 App Router. 4 of 5 pages are async **Server Components** that fetch on the server and hand `initialData`/props to client islands; `/dashboard/inspiration` is the exception — it is a full `"use client"` page (`page.tsx:1`).
- **Styling:** Tailwind CSS 4 + shadcn/ui. Semantic OKLCH tokens defined in `src/app/globals.css` (144 color values + 21 semantic tokens) and hex mirrors in `src/lib/tokens.ts`. Two custom utilities centralize layout: `.text-page-title` (fluid clamp, `globals.css:859`) and `.p-page` (`globals.css:871`).
- **Shell:** `src/app/dashboard/layout.tsx` composes `Sidebar` (desktop fixed + mobile vaul drawer), `DashboardHeader` (sticky topbar), and `BottomNav` (mobile only). Every page is wrapped in `DashboardPageWrapper` (`dashboard-page-wrapper.tsx:18`) per the mandatory frontend rule.
- **State:** No global store on these pages. Server Components fetch via Drizzle; client islands use local `useState` + `fetch`/`fetchWithAuth`. Cross-page handoff is done through `localStorage`/`sessionStorage` (composer drafts, inspiration → composer bridge).
- **Data fetching:** Server: `Promise.all` batches in `page.tsx`/`layout.tsx`. Client: SSE streaming for agentic (`agentic-posting-client.tsx:260`), plain `fetch` for inspiration and usage bars.

### Top strengths to preserve

1. **Consistent page chrome.** All 5 routes go through `DashboardPageWrapper`, giving identical icon-badge + title + description + actions slot and spacing (`mx-auto max-w-7xl space-y-4 sm:space-y-6 md:space-y-8`). Cohesion here is genuinely strong.
2. **Agentic flow is best-in-class.** `/dashboard/ai/agentic` has explicit screen states (input → processing → review → success), an estimated-time countdown, per-step progress bars, cancel **and** background modes, undo-on-remove with toast (`agentic-posting-client.tsx:483`), regenerate/discard confirmations, and crash recovery on mount (`:349`). This is the model the rest of the app should aspire to.
3. **Composer accessibility.** `tweet-card.tsx` throttles the char-count live region to every 10 chars / near-limit (`:533–:556`), labels every icon button, and enforces the 280 thread limit independent of tier (`:118–:122`). Keyboard shortcuts are first-class (`composer.tsx:1812`).
4. **Typography is centralized and fluid.** `.text-page-title` uses `clamp(1.25rem, 3vw + 0.5rem, 1.875rem)` so titles scale continuously rather than snapping at one breakpoint (`globals.css:859`).
5. **RTL/i18n discipline.** Logical properties throughout (`me-2`, `ms-2`, `border-s-4`, `start-0`), `rtl:scale-x-[-1]` on directional arrows, and the sidebar drawer flips side via a `dir` MutationObserver (`sidebar.tsx:370`).
6. **Shell-level accessibility foundations.** A bilingual skip-to-content link is the first focusable element on every page (`layout.tsx:206`), navigation states are programmatically exposed via `aria-current="page"` across the sidebar, bottom nav, and collapsible sections (`sidebar.tsx:172,219`, `bottom-nav.tsx:50`), and shadcn primitives ship `focus-visible:ring` on every interactive control (Button, Input, Tabs, Checkbox, Switch, …). These are the cross-cutting wins that make the per-page a11y work effective.
7. **`prefers-reduced-motion` is honored globally.** A site-wide media query neutralizes all transitions/animations — including Radix accordion, sheet, and dialog motion (`globals.css:433`). The agentic progress bars, spinners, and skeleton shimmers all degrade gracefully, which is rare and worth protecting.
8. **Comprehensive route-segment fallbacks.** Every dashboard segment ships both `loading.tsx` and `error.tsx` (35 files total), so each route has a real skeleton during navigation and an error boundary on failure — not a blank screen or a thrown stack.

### Top 10 issues ranked by severity

| #   | Severity      | Issue                                                                                                                                                                                                                                                                       | Evidence                                                                                       |
| --- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | **P0 (a11y)** | Dashboard stat cards + the failed-posts alert badge + setup checklist + AI-tools locked badges hardcode raw Tailwind palette colors (`emerald/blue/amber/purple/green-500`) instead of semantic tokens, bypassing the WCAG-tuned OKLCH scales. Maps to WCAG 1.4.3 / 1.4.11. | `page.tsx:207–230`, `page.tsx:448–449`, `setup-checklist.tsx:173–180`, `ai-tools-grid.tsx:154` |
| 2   | **P0 (a11y)** | Completed checklist steps render `<Link href="#">` with `pointer-events-none` — a focusable anchor to `#` that does nothing for keyboard users and pollutes tab order.                                                                                                      | `setup-checklist.tsx:169`                                                                      |
| 3   | **P1**        | **Composer is a 2,709-line god component** (`composer.tsx`). Unmaintainable, high regression risk, hard to test.                                                                                                                                                            | `composer.tsx` (whole file)                                                                    |
| 4   | **P1**        | **Two parallel tweet-editing stacks.** Composer (`sortable-tweet.tsx`/`tweet-card.tsx`) and agentic review (`agentic/tweet-card.tsx`, `agentic/x-thread-preview.tsx`) each reimplement DnD + char counting + X preview. Divergent behavior, double maintenance.             | `composer.tsx:42`, `review-screen.tsx:32–33`                                                   |
| 5   | **P1**        | **Inspiration is a 725-line client page** holding import, history, and bookmarks in one file with mixed persistence (history in `localStorage`, bookmarks in DB).                                                                                                           | `inspiration/page.tsx:104–113`, `:319`                                                         |
| 6   | **P1**        | Inspiration data-loss risk + scanability: history capped at 20 items in `localStorage` (`:232`) with no server backup; lost on cache clear, not synced across devices.                                                                                                      | `inspiration/page.tsx:118–124`                                                                 |
| 7   | **P1**        | `setActiveTab(v as any)` and `tweet: any` defeat the type system on user-facing surfaces.                                                                                                                                                                                   | `inspiration/page.tsx:387`, `sortable-tweet.tsx:8`                                             |
| 8   | **P2**        | Status-color inconsistency: agentic processing screen uses `warning-*` tokens (`processing-screen.tsx:208`) while AI-hub locked state uses `amber-500/amber-700` literals (`ai-tools-grid.tsx:154`) — same semantic meaning, two color systems.                             |                                                                                                |
| 9   | **P2**        | `/dashboard` reads as a metrics page, not an action launchpad. Four stat cards dominate above the fold; the primary "what do I do next" path (Quick Compose / empty-state CTAs) sits below.                                                                                 | `page.tsx:358–497`                                                                             |
| 10  | **P2**        | AI hub communicates **quota** well but not **capabilities/limitations** — each tool card is title + one-liner + lock badge; no "what this does / what it can't do" before the user commits.                                                                                 | `ai-tools-grid.tsx:161–181`                                                                    |

### Overall dashboard cohesion score: **7.5 / 10**

The shell, spacing, and typography are unusually consistent for a product this size, and `DashboardPageWrapper` enforces it structurally. Points are lost for (a) the design-token bypass in high-visibility surfaces (stat cards, badges), (b) two diverging tweet-editing implementations, and (c) two oversized components (composer, inspiration) that concentrate risk. The agentic flow pulls the average up; the dashboard landing and inspiration page pull it down.

---

## 2. Per-Page Deep Dive

### 2.1 `/dashboard` — Landing

**Component tree:** `DashboardPage` (RSC) → `DashboardPageWrapper` → `SetupChecklist`, conditional failed-posts `Alert`, `PostUsageBar`, stat-card grid (`Card` ×4 with `Tooltip`), upcoming-queue `Card`, `QuickCompose`.

**Findings**

- **IA / orientation (3/5):** The page answers "how am I doing" before "what do I do next." Stats grid (`:358`) is the visual anchor; the actionable surfaces — `QuickCompose` and the empty-state CTAs — are below the fold on most viewports. The empty state _is_ well done: it branches on `hasXAccount` to show either "connect X" or "create post / generate AI" (`:423–:462`). The setup checklist (`SetupChecklist`) is the real onboarding driver and is appropriately placed first (`:341`).
- **Visual design (3/5):** **Hardcoded status colors.** `STAT_CARDS` define `border-s-emerald-500`, `text-blue-500`, `bg-amber-500/10`, `text-purple-500` (`page.tsx:207–230`). The project ships `success/info/warning/danger` OKLCH scales tuned for AA in both themes (`tokens.ts:100–191`), and the delta indicators on the _same cards_ correctly use `text-success-11`/`text-danger-11` (`page.tsx:391`). So the file is internally inconsistent — semantic tokens for deltas, raw palette for accents.
- **Metrics meaningfulness (4/5):** Stats are real, not decorative — published-today carries a day-over-day delta (`:261`), engagement carries a 30-vs-60-day delta (`:274`), and each has a tooltip explaining it (`:369–:376`). Good.
- **Empty/loading/error (3/5):** Empty states are excellent, and the route segment has a full `loading.tsx` skeleton + `error.tsx` boundary. The remaining gap is _inner_ Suspense boundaries: `SetupChecklist` is wrapped in `<Suspense fallback={null}>` (`:340`) and `PostUsageBar` returns `null` until loaded (`post-usage-bar.tsx:69`). After the route-level skeleton clears, these two islands pop in with no reserved height — a cumulative-layout-shift (CLS) risk on the highest-traffic page. Fix is local: give each a fixed-height skeleton instead of `null`.

**Dimension scores:** IA 3 · Visual 3 · Component quality 4 · Responsive 4 · A11y 3 · Performance 4 · Polish 4

---

### 2.2 `/dashboard/compose` — Composition

**Component tree:** `ComposePage` (RSC) → `DashboardPageWrapper` → `PostUsageBar` + dynamically-imported `Composer`. `Composer` (2,709 lines) → `ComposerAlerts`, `DndContext`/`SortableContext` → `SortableTweet` → `TweetCard`, plus lazy `AiToolsPanel`, `AiImageDialog`, `TemplatesDialog`, `ComposerPreview`, `BestTimeSuggestions`, `TargetAccountsSelect`, `SaveTemplateDialog`.

**Findings**

- **Editor UX (5/5):** Autosave to `localStorage` with a visible "auto-saved · {time ago}" label (`composer.tsx:1998–2005`); restore-draft prompt rather than silent overwrite (`:483`, `ComposerAlerts`). Per-tweet char count with length zones, a 280 milestone bar for premium single-posts, and tier-aware limits (`tweet-card.tsx:118–122`, `:533–:559`). Auto-numbering chip appears at 3+ tweets (`composer.tsx:2016`).
- **Keyboard / a11y (5/5):** Full shortcut set — ⌘↵ publish, ⌘D draft, ⌘K AI, ⌘⇧W/I/T/H tools (`composer.tsx:1812–1875`). DnD has `KeyboardSensor` + `sortableKeyboardCoordinates` so reordering is keyboard-operable (`:9–:20`). Every control in `tweet-card.tsx` has an `aria-label`; the live region is deliberately throttled (`:549`).
- **Media upload (3/5):** Single hidden `<input accept="image/*,video/*" multiple>` (`composer.tsx:1879–1888`). The `accept` is broad — no explicit MIME allowlist or size hint surfaced at the input; validation appears to live downstream in `handleFileUpload`. No visible drag-and-drop dropzone affordance for media (DnD is wired for tweet reordering, not file drop).
- **Scheduling (4/5):** `DatePicker`/`DateTimePicker` + `BestTimeSuggestions` give strong scheduling affordances; publish vs schedule is inferred from `scheduledDate` in the ⌘↵ handler (`:1818`).
- **Component quality (2/5):** **The god-component problem.** 2,709 lines, ~30 imports, dozens of `useState`, business logic (numbering, link previews, tier rules, AI bridge, draft persistence) all colocated. `SortableTweet` types its core prop as `tweet: any` (`sortable-tweet.tsx:8`), erasing type safety on the most-edited surface.
- **Responsive (4/5):** `grid-cols-1 ... lg:grid-cols-3` with the editor at `lg:col-span-2` (`composer.tsx:1878–1891`) — editor + preview side-by-side on desktop, stacked on mobile. Add-tweet button scales padding by breakpoint.

**Dimension scores:** IA 4 · Visual 4 · Component quality 2 · Responsive 4 · A11y 5 · Performance 3 (large bundle, mitigated by `dynamic`/`lazy`) · Polish 5

---

### 2.3 `/dashboard/ai` — AI Hub

**Component tree:** `AIHubPage` (RSC) → `DashboardPageWrapper` → quota `Card` (conditional) → `AiToolsGrid` → 9 tool cards (`Link` when unlocked, `<button>` opening `useUpgradeModal` when locked).

**Findings**

- **Discoverability (4/5):** Clean 1→2→3 column responsive grid (`ai-tools-grid.tsx:128`). Locked tools stay visible and become upgrade prompts rather than disappearing — good for plan discovery. Hub-and-spoke IA is correctly applied (sub-tools as cards, only the hub in the sidebar).
- **Cost/usage transparency (5/5):** The quota meter is genuinely good — used/limit, percentage, `Progress` bar, reset date, and escalating states (exhausted → destructive card + upgrade CTA; ≥80% → amber warning) (`ai/page.tsx:56–115`).
- **Capability communication (2/5):** Each card is icon + title + one-line description + "Try it"/lock CTA (`ai-tools-grid.tsx:161–181`). There is no upfront statement of what each tool produces, its limits, or examples — users must click in to learn. For an AI hub, this is the weakest UX dimension.
- **Visual consistency (3/5):** Locked badge uses `amber-500/amber-700` literals (`:154`) while the rest of the app expresses "warning" via `warning-*` tokens (see processing screen). The "Pro" badge uses `border-primary/30 text-primary` tokens correctly (`:144`).
- **Convention note:** This RSC calls `getPlanLimits()` directly (`ai/page.tsx:12,47`). The hard rule "never call `getPlanLimits()` in route handlers" targets API handlers, not RSC pages, so this is _technically_ compliant — but it's worth a deliberate confirmation since the gate helpers exist precisely to centralize this logic.

**Dimension scores:** IA 4 · Visual 3 · Component quality 4 · Responsive 5 · A11y 4 (locked cards are real `<button>`s with descriptive `aria-label`, `:193`) · Performance 5 · Polish 4

---

### 2.4 `/dashboard/ai/agentic` — Agentic Workflow

**Component tree:** `AgenticPostingPage` (RSC, fetches accounts + voice profile) → `DashboardPageWrapper` → `AgenticPostingClient` → state machine over `InputScreen` / `ProcessingScreen` / `ReviewScreen` / `SuccessScreen`, plus regenerate/discard `AlertDialog`s.

**Findings**

- **Progress feedback (5/5):** `ProcessingScreen` renders an ordered timeline with per-step state, elapsed time on complete, an animated progress bar on the in-progress step, and a live countdown of remaining seconds derived from per-step `estimatedMs` (`processing-screen.tsx:66–77`, `:168–:177`, `:185`). Best progress UX in the app.
- **Interrupt / rollback (5/5):** User can **cancel** (with confirm, `:99–112`), **run in background** (`:191–204`), **regenerate all** or **discard** with confirmation dialogs (`agentic-posting-client.tsx:651–693`), **undo** a removed tweet via toast action (`:483`), reorder via DnD, and re-edit per tweet. Backgrounded jobs resolve into a toast with a "review" action (`:141`).
- **Trust signals (4/5):** The "needs_input" pause when a topic is too broad surfaces angle suggestions before spending the full pipeline (`:117–123`, `processing-screen.tsx:206–222`) — strong "tell me before you act" behavior. Research/strategy/review steps echo summaries (recommended angle, format, quality score) so the user sees the agent's reasoning (`:165–:173`). Could go further: there's no explicit "here's the plan, approve before writing" gate — the pipeline runs end-to-end then shows the review.
- **Streaming UI (4/5):** True SSE consumption via `ReadableStream` reader + `TextDecoder` with buffered `\n\n` splitting (`:260–:281`). Progress is step-based rather than token-by-token, which is the right choice for a multi-stage pipeline. The aria-live summary is correctly attached to one status region, not every step (`processing-screen.tsx:114–120`).
- **Crash resilience (5/5):** On mount it queries `/api/ai/agentic` and rehydrates a `ready` or `generating` session (`:349–:398`).

**Dimension scores:** IA 5 · Visual 4 · Component quality 4 (well-decomposed into screens; the 696-line orchestrator is acceptable given it's pure state/handlers) · Responsive 4 · A11y 4 · Performance 4 · Polish 5

---

### 2.5 `/dashboard/inspiration` — Content Discovery

**Component tree:** `InspirationPage` (`"use client"`) → `Suspense` → `InspirationContent` → `DashboardPageWrapper` → `Tabs` (import / history / bookmarks) → URL `Input` + import `Button`, `ImportedTweetCard`, `AdaptationPanel`, history `<ul>`, bookmarks `<ul>` with `AlertDialog` delete.

**Findings**

- **Discovery pattern (2/5):** There is **no discovery** — the page is a single-URL importer, not a browse/search/feed experience. The user must already have a tweet URL (regex-validated against twitter/x/mobile patterns, `:127–135`). For a route literally named "inspiration," this is a mismatch between name and capability. No filters, no infinite scroll, no trending feed.
- **Save/bookmark (4/5):** Bookmarking is solid — POST to `/api/inspiration/bookmark`, optimistic local insert, success toast, delete behind an `AlertDialog` confirm (`:265–298`, `:684–711`).
- **Scanability (4/5):** History and bookmark items are `line-clamp-2` cards with handle + relative time + action badge (`:582–635`). Reasonable density.
- **Persistence inconsistency (P1):** History lives in `localStorage`, capped at 20 (`:104–124`, `:232`); bookmarks live in the DB. Two storage models for two adjacent tabs means history silently vanishes on cache-clear and never syncs across devices, while bookmarks persist. Confusing mental model.
- **Component quality (2/5):** 725-line single client component holding all three tabs, two storage layers, six `useCallback` handlers, and four `useEffect`s. `setActiveTab(v as any)` (`:387`) throws away the discriminated-union type that the `useState<"import" | "history" | "bookmarks">` already declares.
- **A11y (4/5):** Lists use `role="list"`, the URL input has a `<Label htmlFor>`, Enter submits when valid (`:418`), invalid-URL feedback is inline with an icon (`:443`). External links carry `rel="noopener noreferrer"` and `dir="ltr"` (`:621–629`).
- **Loading/error (4/5):** Dedicated skeleton grid during import (`:473–490`), success/error `Alert`s, distinct empty states per tab.

**Dimension scores:** IA 2 · Visual 4 · Component quality 2 · Responsive 4 · A11y 4 · Performance 4 · Polish 3

---

## 3. Cross-Cutting Issues

### 3.1 Inconsistencies between the 5 pages

- **Server vs client page boundary.** Four pages are RSC + client island; inspiration is fully client. The RSC pattern (fetch on server, pass `initialData`) is the documented standard (`.claude/rules/frontend.md`). Inspiration's all-client approach is the outlier and the largest single client file of the five.
- **Status-color systems collide.** Three different ways to say "warning/success" appear across the set:
  - Semantic tokens: `text-success-11`, `text-danger-11` (`page.tsx:391`), `warning-*` (`processing-screen.tsx:208`).
  - Raw palette: `emerald/blue/amber/purple-500` (`page.tsx:207–230`), `green-500` (`setup-checklist.tsx:178`), `amber-500/700` (`ai-tools-grid.tsx:154`).
  - shadcn destructive token: `border-destructive/50 bg-destructive/5` (`page.tsx:345`, `ai/page.tsx:58`).
    The destructive and `*-11` token usages are correct; the raw-palette usages are the drift.
- **Cross-page handoff via web storage.** Inspiration → composer passes tweets/attribution through `sessionStorage` (`inspiration/page.tsx:243–257`); QuickCompose → composer passes drafts through `localStorage` (`quick-compose.tsx:24`). Functional, but brittle and untyped — no shared serializer/validator, so a shape change in one side silently breaks the other.
- **Two char-count / preview implementations.** Composer's `tweet-card.tsx` and agentic's `agentic/tweet-card.tsx` + `x-thread-preview.tsx` are separate. A fix to (e.g.) the 280 boundary or the X preview must be made twice.

### 3.2 Duplication to refactor (see §5 for the top 3)

- DnD tweet list (composer `SortableContext`/`SortableTweet` vs agentic `SortableTweetCard`).
- X/tweet preview rendering (`ComposerPreview` vs `agentic/x-thread-preview`).
- Empty-state card pattern (dashboard `:425–461`, inspiration `:555–569`, history/bookmarks `:576`, `:645`) — repeated icon-in-circle + heading + description + CTA markup.

### 3.3 Design-token gaps

- No semantic token mapping for the dashboard's categorical stat accents (published/scheduled/queue/engagement). Because none exists, authors reach for `emerald/blue/amber/purple`. A `--stat-*` or reuse of `chartColors` (`tokens.ts:194`) would close this.
- "Locked / Pro-gated" has no dedicated token, so amber literals appear. A `--locked` / `warning`-token convention would unify `ai-tools-grid` with the processing screen.
- Touch-target sizing is applied ad hoc (`h-10 w-10` in inspiration `:511`, `min-h-[36px]` in history `:610`) rather than via a shared `size="icon"`-with-min-44px convention. Bottom nav at `h-14` with 6 cells (`bottom-nav.tsx:37`) yields ~52px height but sub-44px width per cell on narrow phones.

---

## 4. Prioritized Fix List

### P0 — Broken / blocking / accessibility

- **P0-1 — Replace hardcoded status palette with semantic tokens.**
  `page.tsx:207–230`, `setup-checklist.tsx:173–180`, `ai-tools-grid.tsx:154`.
  Pattern:
  ```tsx
  // before (page.tsx STAT_CARDS)
  { accent: "border-s-emerald-500", iconColor: "text-emerald-500", iconBg: "bg-emerald-500/10" }
  // after — use the AA-tuned semantic scale
  { accent: "border-s-success-9", iconColor: "text-success-11", iconBg: "bg-success-3" }
  ```
  This guarantees the same contrast the rest of the app already relies on, in both light and dark mode.
- **P0-2 — Fix completed-checklist anchors.** `setup-checklist.tsx:169`. A completed step should not be a focusable `<Link href="#">`. Render a non-interactive element:
  ```tsx
  {
    step.completed ? <div className="cursor-default ...">…</div> : <Link href={step.href}>…</Link>;
  }
  ```

### P1 — High-impact UX friction

- **P1-1 — Decompose the Composer.** Extract draft-persistence, AI-bridge, link-preview, and numbering logic into hooks (`use-composer-drafts.ts`, `use-composer-ai.ts`) and split the toolbar/footer into subcomponents. Target < 400 lines for the shell. Start by typing `SortableTweet`'s `tweet: any` against the existing `TweetDraft` interface (`composer.tsx:112`).
- **P1-2 — Unify the tweet-editing stack** (see §5.1) so composer and agentic share one sortable list + one preview.
- **P1-3 — Give inspiration history a real backend** (or explicitly scope it as ephemeral in the UI). Today the two tabs disagree on persistence; either move history to the same API as bookmarks, or label it "this device only."
- **P1-4 — Decide inspiration's identity.** Either rename/reposition it as "Import & Adapt" (matching what it does) or add the discovery layer the name promises (trending/search feed). The current name sets an expectation the code doesn't meet.
- **P1-5 — Replace `as any` casts** at `inspiration/page.tsx:387` with the already-declared union type.

### P2 — Polish & consistency

- **P2-1 — Reserve space for `Suspense fallback={null}` islands** (`SetupChecklist`, `PostUsageBar`) to prevent first-paint layout shift — render a fixed-height skeleton instead of `null`.
- **P2-2 — Add capability/limitation microcopy** to AI tool cards (a short "best for…" line) so users understand a tool before clicking.
- **P2-3 — Consolidate warning color** (`ai-tools-grid` amber literals → `warning-*` tokens) to match the processing screen.
- **P2-4 — Extract the repeated empty-state block** into one component (see §5.3).
- **P2-5 — Reconsider `/dashboard` above-the-fold ordering** — consider promoting Quick Compose / next-action beside the stats rather than below them.

---

## 5. Refactor Opportunities — Top 3 Shared Components That Should Exist

### 5.1 `<TweetEditorList>` — one sortable, char-counted tweet editor

**Today:** the composer (`sortable-tweet.tsx` + `tweet-card.tsx`) and the agentic review screen (`agentic/tweet-card.tsx` via `review-screen.tsx:32`) independently implement drag-reorder, per-tweet char counting, and edit/remove/add. The composer's version is the more mature (length zones, milestone bar, throttled live region) but the agentic version doesn't benefit from it.
**Proposed:** a headless `<TweetEditorList tweets onChange tier mode="composer"|"agentic">` owning DnD + counting + a11y, with slot props for the mode-specific footer actions. Eliminates the largest duplication and the risk of the two diverging on the 280-char rule.

### 5.2 `<XThreadPreview>` — one canonical tweet/thread renderer

**Today:** `ComposerPreview` (`composer.tsx:40`) and `agentic/x-thread-preview.tsx` (`review-screen.tsx:33`) both render the X-styled preview. Any visual change to how a tweet looks (avatar, handle, media grid, char overflow) must be done in both.
**Proposed:** a presentational `<XThreadPreview tweets account tier>` consumed by both surfaces.

### 5.3 `<EmptyState>` — icon-badge + heading + description + CTA(s)

**Today:** near-identical markup is hand-rolled in at least four places: dashboard upcoming-queue (`page.tsx:425–461`), inspiration import empty (`inspiration/page.tsx:555–569`), inspiration history/bookmarks empties (`:576`, `:645`). Each repeats the gradient circle + Lucide icon + `text-lg font-semibold` heading + muted description + optional buttons.
**Proposed:** `<EmptyState icon title description actions />`. Small, but it appears on every one of the audited pages and would standardize empty-state spacing/typography in one move.

---

## 6. WCAG 2.2 Conformance Map

This maps the findings above to specific success criteria so they can be tracked against a conformance target (assumed: **WCAG 2.2 Level AA**). "Pass" entries are confirmed strengths worth protecting in regression.

| SC                                                  | Level | Status     | Where                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------- | ----- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1.4.3 Contrast (Minimum)**                        | AA    | ⚠️ At risk | Hardcoded `*-500` palette on stat cards, failed-posts badge, locked badges bypasses the AA-tuned OKLCH scales (`page.tsx:207–230,448`, `ai-tools-grid.tsx:154`). Verify each pairing — `*-500` foregrounds on tinted `/10` backgrounds are the suspect cases, especially in dark mode.                   |
| **1.4.11 Non-text Contrast**                        | AA    | ⚠️ At risk | Same hardcoded accents are also used for icon glyphs and `border-s-*` rails — these are non-text UI requiring ≥3:1.                                                                                                                                                                                      |
| **2.4.3 Focus Order**                               | A     | ❌ Fail    | Completed checklist steps are focusable `<Link href="#">` with `pointer-events-none` — they sit in the tab order but do nothing (`setup-checklist.tsx:169`).                                                                                                                                             |
| **4.1.2 Name, Role, Value**                         | A     | ❌ Fail    | The same `href="#"` anchors expose a "link" role with no valid destination — assistive tech announces an actionable link that isn't.                                                                                                                                                                     |
| **2.5.8 Target Size (Minimum, new in 2.2)**         | AA    | ⚠️ At risk | Ad-hoc touch sizing: bottom nav at `h-14` with 6 cells yields sub-44px (and possibly sub-24px) cell width on narrow phones (`bottom-nav.tsx:37`); inspiration history actions at `min-h-[36px]` (`:610`). 2.2's bar is 24×24 CSS px; 44×44 (2.5.5 AAA / Apple HIG) is the better target for primary nav. |
| **2.4.7 Focus Visible**                             | AA    | ✅ Pass    | shadcn primitives ship `focus-visible:ring` on every interactive control (Button, Input, Tabs, Checkbox, Switch, Textarea, Slider).                                                                                                                                                                      |
| **2.4.1 Bypass Blocks**                             | A     | ✅ Pass    | Bilingual skip-to-content link is the first focusable element (`layout.tsx:206`).                                                                                                                                                                                                                        |
| **2.2.2 / 2.3.3 Animation**                         | A/AAA | ✅ Pass    | Global `prefers-reduced-motion` reset kills all transitions and Radix animations (`globals.css:433`).                                                                                                                                                                                                    |
| **4.1.3 Status Messages**                           | AA    | ✅ Pass    | Throttled char-count live region (`tweet-card.tsx:549`); single aria-live status on the agentic processing screen rather than one per step (`processing-screen.tsx:114–120`).                                                                                                                            |
| **3.3.1 / 3.3.3 Error Identification & Suggestion** | A/AA  | ✅ Pass    | Inspiration URL validation is inline, icon-flagged, and submit-gated (`inspiration/page.tsx:443`).                                                                                                                                                                                                       |
| **1.3.1 Info and Relationships**                    | A     | ✅ Pass    | `role="list"`, `<Label htmlFor>`, and `aria-current="page"` are applied across nav and lists.                                                                                                                                                                                                            |

**Net:** two confirmed Level-A failures (both rooted in the same `href="#"` anti-pattern — one fix clears both) and two AA contrast risks that need a contrast pass once tokens replace the literals. The pass column is unusually deep for a product this size.

---

## 7. Motion, Animation & Reduced-Motion

- **Global guarantee (strength).** The `prefers-reduced-motion: reduce` block (`globals.css:433`) is a blanket `*` reset, so no individual component can regress the contract — the agentic progress bar, spinners, skeleton shimmer, and Radix dialog/sheet transitions all flatten automatically. Keep this rule; do not move motion into JS-driven animation libraries (Framer-style `animate`) without re-checking the `useReducedMotion` equivalent, since the CSS reset won't catch JS-interpolated values.
- **Watch item.** The agentic countdown and progress bars communicate primarily through motion. Under reduced-motion they stop animating but still update numerically (`processing-screen.tsx:185`), which is correct — verify the per-step bar still conveys completed/in-progress via a static color/state, not motion alone, to avoid relying on animation as the sole status channel.
- **Polish opportunity.** First-paint pop-in of `null`-fallback islands (§2.1) reads as unintentional motion. Reserving height removes the jump and improves perceived performance independent of the reduced-motion setting.

---

## 8. Effort × Impact Matrix & Quick Wins

Reframes §4 by implementation cost so the team can sequence work. Effort is rough engineering days; impact is on the authenticated UX.

| Fix                                                                | Severity | Effort    | Impact | Quadrant                                   |
| ------------------------------------------------------------------ | -------- | --------- | ------ | ------------------------------------------ |
| P0-2 — Remove `href="#"` on completed steps                        | P0       | ~0.25d    | High   | **Quick win**                              |
| P0-1 — Swap stat/badge palette → semantic tokens                   | P0       | ~0.5d     | High   | **Quick win**                              |
| P2-3 — Locked badge amber literals → `warning-*`                   | P2       | ~0.25d    | Med    | **Quick win**                              |
| P2-1 — Reserve height for `null` Suspense islands                  | P2       | ~0.5d     | Med    | **Quick win**                              |
| P2-2 — AI tool-card capability microcopy                           | P2       | ~1d       | Med    | Fill-in                                    |
| P1-5 — Replace `as any` in inspiration tabs                        | P1       | ~0.25d    | Low    | Fill-in                                    |
| P1-3 — Back inspiration history with the DB                        | P1       | ~2d       | High   | **Major project**                          |
| P1-4 — Resolve inspiration's identity (rename vs. build discovery) | P1       | 0.25d–10d | High   | **Major project** (product decision first) |
| P1-2 — Unify tweet-editing stack (§5.1/5.2)                        | P1       | ~5d       | High   | **Major project**                          |
| P1-1 — Decompose the 2,709-line Composer                           | P1       | ~8d       | High   | **Major project**                          |

**Recommended first PR (≈1.5 days, ships the whole P0 surface + token consistency):** P0-1 + P0-2 + P2-3 + P2-1. These are mechanical, low-regression, and clear both Level-A a11y failures plus the highest-visibility visual-drift issues in one reviewable change. The god-component and inspiration-identity work should be scoped as separate initiatives, not bundled.

---

## 9. Verification & Success Metrics

How to confirm each fix landed and didn't regress — so "done" is observable, not asserted.

- **Contrast (P0-1, P2-3):** After swapping to semantic tokens, spot-check the four stat cards + locked badge in **both** light and dark mode with a contrast tool (target ≥4.5:1 text, ≥3:1 non-text). Add a lint guard: grep CI for raw `-(50|100|200|300|400|500|600|700|800|900)\b` Tailwind palette classes under `src/app/dashboard` and `src/components/dashboard` to prevent re-introduction.
- **Focus order (P0-2):** Keyboard-tab through `/dashboard` and confirm completed checklist steps are skipped (not focusable); verify with a screen reader that no phantom "link" is announced.
- **Layout shift (P2-1):** Measure CLS on `/dashboard` before/after via Lighthouse or the browser Performance panel; target CLS < 0.1. The two `null`-fallback islands are the only first-paint movers.
- **Reduced motion (regression guard):** Toggle OS "reduce motion" and reload the agentic flow — progress must still convey state without animation.
- **Composer decomposition (P1-1):** Behavior-lock with tests before refactor — autosave/restore, char-count zones, the 280-thread cap, and keyboard shortcuts (⌘↵/⌘D/⌘K) must pass identically pre- and post-split. Line-count is a proxy, not the goal; the real metric is "shell < 400 lines AND no behavior delta."
- **Token coverage (ongoing):** Track % of dashboard color usages routed through semantic tokens vs. raw palette as a single trend number; the audit's drift findings should converge it toward 100%.

> **Methodology note:** The shell-level a11y strengths (§ strengths 6–8), the global reduced-motion rule, and the route-segment `loading.tsx`/`error.tsx` coverage were verified directly against source during this enhancement pass (`layout.tsx:206`, `globals.css:433`, 35 route fallback files, `focus-visible:ring` across 9 `ui/` primitives). The hardcoded-palette finding was re-confirmed and extended (`page.tsx:448–449` added). No code was modified.

---

## Files Not Found

None — all five route files and every dependency referenced above were located and read. Heavy components (`composer.tsx` 2,709 lines, `inspiration/page.tsx` 725 lines) were analyzed by structure + targeted reads of their UX-bearing regions (state, effects, render, keyboard, media, char-count, a11y), not line-by-line in full.
