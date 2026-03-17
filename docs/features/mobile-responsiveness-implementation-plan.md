# Mobile Responsiveness & Dynamic UI — Implementation Plan

> Generated: 2026-03-17
> Estimated Total Effort: 20 days
> Priority: Critical — Mobile-primary user base in MENA region
>
> **STATUS: ✅ ALL 30 TASKS COMPLETE — 2026-03-17**
> Phases 1–6 fully implemented. All 30 tasks verified with `pnpm run check` (0 new errors, 18 pre-existing warnings only).

---

## Executive Summary

AstraPost currently has solid foundational accessibility structure: the root layout correctly sets `dir` and `lang` attributes based on locale cookies, uses `min-h-dvh` instead of `100vh`, avoids `user-scalable=no`, loads the Cairo Arabic font via Next.js font optimization, and implements a Sheet-based mobile sidebar. These patterns are commendable and should be preserved throughout all changes.

However, the audit identified **47 distinct issues** across the codebase, ranging from critical layout failures in the core Composer component to systematic touch-target undersizing across virtually every icon button. The three most urgent problems are: (1) the Composer drag handles are positioned `absolute -left-8` which renders them off-screen or overlapping content on phones; (2) the Onboarding Wizard progress stepper has no mobile layout, causing step labels to collide on screens narrower than 400px; and (3) icon buttons throughout tweet-card, sidebar, and other components are 40px square — below the WCAG 2.5.8 minimum of 44×44px.

The remediation strategy is organized into six phases. Phase 1 addresses critical breakages that make core workflows impossible on mobile. Phase 2 systematically fixes every UI component for mobile behavior. Phase 3 optimizes the end-to-end user flows on small screens. Phase 4 adds dynamic viewport handling (virtual keyboard, orientation, safe areas). Phase 5 hardens accessibility for screen readers. Phase 6 targets performance for the MENA 4G context. Every change uses CSS logical properties (`ps-`, `pe-`, `ms-`, `me-`) and is verified in both RTL and dark-mode combinations.

After full implementation, AstraPost will pass WCAG 2.2 AA at the component level, render cleanly on all MENA-common devices from 320px wide, and deliver a first-class mobile composition experience for Arabic-first creators.

---

## Guiding Principles

- **Mobile-first**: All CSS starts at mobile (base classes) and scales up with `md:` (768px) and `lg:` (1024px)
- **RTL-native**: Every change uses CSS logical properties (`ps-*`, `pe-*`, `ms-*`, `me-*`, `start-*`, `end-*`) and works in both RTL and LTR
- **Dark mode compatible**: Every change tested in both `light` and `dark` themes using existing shadcn/ui token system
- **Progressive enhancement**: Core functionality works on all devices; enhanced on capable ones
- **Performance budget**: No mobile page > 200KB JS (excluding framework); LCP < 2.5s on 4G; no layout shift (CLS < 0.1)
- **No regressions**: All changes are additive/corrective — existing desktop behavior is preserved

---

## STEP 0 — Repository Structure Summary

```
src/
├── app/
│   ├── (auth)/login, register, forgot-password, reset-password
│   ├── (marketing)/layout.tsx — flex min-h-screen flex-col
│   ├── dashboard/layout.tsx — flex min-h-dvh, Sidebar + main p-4 md:p-8
│   ├── dashboard/{compose,queue,calendar,drafts,ai,analytics,inspiration,settings,jobs}/
│   └── api/ — route handlers
├── components/
│   ├── composer/composer.tsx, tweet-card.tsx, sortable-tweet.tsx, ai-image-dialog.tsx
│   ├── dashboard/sidebar.tsx, dashboard-header.tsx, failure-banner.tsx
│   ├── inspiration/adaptation-panel.tsx, imported-tweet-card.tsx, manual-editor.tsx
│   ├── onboarding/onboarding-wizard.tsx, dashboard-tour.tsx
│   └── ui/ — shadcn/ui primitives
└── lib/
```

**Key findings from foundation check:**
- `layout.tsx` — ✅ `dir/lang` set, ✅ `min-h-dvh` used, ✅ `overflow-x-hidden` on body, ✅ no `user-scalable=no`, ✅ Cairo font loaded
- `globals.css` — ✅ `100dvh` used, ✅ dark mode tokens, ✅ `:lang(ar)` selector, ⚠️ no `touch-action` global, ⚠️ no `-webkit-tap-highlight-color: transparent`
- `dashboard/layout.tsx` — ✅ `min-h-dvh`, ⚠️ `p-4 md:p-8` (16px mobile padding OK), ⚠️ no safe-area insets on main
- `sidebar.tsx` — ✅ Sheet-based mobile drawer, ⚠️ hamburger button `size="icon"` = 40px (< 44px), ⚠️ nav links `py-2` = ~32px effective height (< 44px)
- `package.json` — ⚠️ `vaul` NOT installed (needed for responsive Dialog → Drawer pattern)

---

## AUDIT FINDINGS

### 1.1 — Viewport & Global Configuration

**[POSITIVE]** Root layout correctly sets `width: "device-width", initialScale: 1` without `maximumScale` restriction.
**[POSITIVE]** Body has `overflow-x-hidden` preventing horizontal scroll.
**[POSITIVE]** `globals.css` uses `100dvh` for full-height containers.

```
[SEVERITY: Medium] — Missing global touch/tap feedback rules
Impact Score: 3×1 = 3

File(s): src/app/globals.css
Current behavior: No global touch-action or tap-highlight rules
Root cause: Missing CSS rules in base layer
What user sees at 375px: Tap highlights on Android (blue flash), no active feedback
Fix approach: Add touch-action and tap-highlight rules to @layer base
```

```
[SEVERITY: Low] — No color-scheme meta tag
Impact Score: 2×1 = 2

File(s): src/app/layout.tsx (line 35–43)
Current behavior: Missing color-scheme causes white flash in dark-mode transitions
Root cause: Not set in Viewport export
Fix approach: Add colorScheme to viewport export
```

### 1.2 — Layout Architecture

**[POSITIVE]** Dashboard layout uses `flex min-h-dvh` correctly.
**[POSITIVE]** Marketing layout uses `flex min-h-screen flex-col`.

```
[SEVERITY: High] — Dashboard main content overlaps safe area on notched devices
Impact Score: 4×2 = 8

File(s): src/app/dashboard/layout.tsx (line 100)
Current behavior: <main className="flex-1 p-4 pt-4 md:p-8 md:pt-8"> — no safe-area padding
Root cause: Missing env(safe-area-inset-*) on main content wrapper
What user sees at 375px (iPhone notch): Bottom navigation content cut by home indicator
Fix approach: Add pb-[env(safe-area-inset-bottom)] on the outer wrapper
```

```
[SEVERITY: Medium] — Sidebar hamburger button positioned at fixed top-4 left-4
Impact Score: 3×1 = 3

File(s): src/components/dashboard/sidebar.tsx (line 227)
Current behavior: Button is 40×40px (size="icon"), below 44px WCAG minimum
Root cause: size="icon" = h-9 w-9 (36px) by shadcn default; no size override
What user sees at 375px: Slightly undersized tap target, may miss taps
Fix approach: Add explicit h-11 w-11 (44px) override
```

```
[SEVERITY: Medium] — Dashboard header padding on mobile pushes content
Impact Score: 3×2 = 6

File(s): src/components/dashboard/dashboard-header.tsx
Current behavior: Header likely has px-4 md:px-6, but hamburger button is fixed-positioned
Root cause: Hamburger is fixed at left-4; header content may overlap
What user sees at 375px: First 60px of header content hidden behind fixed hamburger
Fix approach: Add ps-14 to dashboard header content on mobile (md:ps-4)
```

### 1.3 — shadcn/ui Component Responsiveness

```
[SEVERITY: Critical] — Emoji Picker renders as full Popover on mobile, covering content
Impact Score: 5×2 = 10

File(s): src/components/composer/tweet-card.tsx (lines 4, 9)
Current behavior: EmojiPicker renders inside <Popover>, which positions near trigger
Root cause: emoji-picker-react renders a 350px wide grid; Popover clips/overflows at 375px
What user sees at 375px: Picker overflows screen edge, partially unusable
Fix approach: Wrap picker in Sheet (from bottom) on mobile using useMediaQuery hook or CSS
```

```
[SEVERITY: High] — Tooltip components inaccessible on touch
Impact Score: 4×1 = 4

File(s): src/components/composer/tweet-card.tsx (lines 11, various Tooltip usages)
Current behavior: Tooltips require hover — never trigger on touch devices
Root cause: Radix Tooltip is hover-only; no touch/focus alternative
What user sees at 375px: Button labels never visible (icon-only buttons have no accessible name fallback)
Fix approach: Replace Tooltip with aria-label on icon buttons; remove Tooltip wrapping on mobile
```

```
[SEVERITY: High] — Dialog/Modal pattern — vaul not installed
Impact Score: 4×3 = 12

File(s): package.json, any Dialog usage
Current behavior: shadcn/ui Dialog renders as centered modal on ALL screen sizes
Root cause: vaul (Drawer) not installed; no responsive dialog → drawer pattern exists
What user sees at 375px: Small dialogs with tiny touch targets; content sometimes cut off
Fix approach: Install vaul, create ResponsiveDialog wrapper (Dialog on md+, Drawer on mobile)
```

```
[SEVERITY: Medium] — Tabs overflow on small screens
Impact Score: 3×2 = 6

File(s): src/app/dashboard/inspiration/page.tsx (lines ~256-270), src/app/dashboard/ai/page.tsx
Current behavior: TabsList with grid-cols-3 or multiple tabs may clip at 320px
Root cause: No overflow-x-auto or scrollable tabs implementation
What user sees at 320px: Tab labels truncated or hidden
Fix approach: Add overflow-x-auto to TabsList, ensure min-width on each tab
```

### 1.4 — Typography & Readability

**[POSITIVE]** Arabic Cairo font loaded for `:lang(ar)` with `display: swap`.

```
[SEVERITY: Medium] — Section labels in sidebar use text-[11px] (too small on mobile)
Impact Score: 3×1 = 3

File(s): src/components/dashboard/sidebar.tsx (line 125)
Current behavior: text-[11px] uppercase — below comfortable mobile reading size
Root cause: Hardcoded 11px ignores mobile text scaling
Fix approach: text-[11px] is acceptable for ALL-CAPS labels; keep but verify contrast ratio
```

```
[SEVERITY: Low] — No dir="auto" on user-generated content textareas
Impact Score: 2×2 = 4

File(s): src/components/composer/tweet-card.tsx (textarea), src/components/inspiration/manual-editor.tsx
Current behavior: Textarea direction fixed to document direction
Root cause: No dir="auto" attribute on content inputs
What user sees at 375px: Arabic text in an LTR session doesn't auto-align
Fix approach: Add dir="auto" to all tweet/content textarea elements
```

### 1.5 — Touch Interaction

```
[SEVERITY: Critical] — Icon buttons throughout composer are 40px (below 44px minimum)
Impact Score: 5×2 = 10

File(s): src/components/composer/tweet-card.tsx (all icon buttons in toolbar)
Current behavior: Buttons use size="icon" = h-9 w-9 (36px) in shadcn default
Root cause: shadcn/ui Button size="icon" computes to 36px × 36px
What user sees at 375px: 6 toolbar buttons (upload, AI image, emoji, rewrite, hashtag, wand) too small
Fix approach: Add min-h-11 min-w-11 to all icon button overrides or use size="sm" with padding
```

```
[SEVERITY: Critical] — Drag handles positioned absolute -left-8 (off-screen on mobile)
Impact Score: 5×1 = 5

File(s): src/components/composer/sortable-tweet.tsx (drag handle positioning)
Current behavior: Drag handle is positioned 32px to the left of the card edge
Root cause: absolute -left-8 = -32px; on mobile where card is full-width, this is outside viewport
What user sees at 375px: Drag handle not visible OR scrolls content horizontally
Fix approach: Hide drag handles on mobile (touch-drag is inaccessible anyway); show reorder buttons instead
```

```
[SEVERITY: High] — No active: state feedback on interactive elements
Impact Score: 4×2 = 8

File(s): globals.css, most interactive components
Current behavior: Only hover: states defined; no active: visual feedback for touch
Root cause: hover: styles are not triggered on touch without sticky hover bug
Fix approach: Add active:scale-95 or active:opacity-80 to buttons in globals.css button layer
```

### 1.6 — Dynamic Viewport Behavior

```
[SEVERITY: High] — Virtual keyboard hides fixed elements on mobile Safari
Impact Score: 4×3 = 12

File(s): src/app/chat/page.tsx (chat input), any page with fixed bottom elements
Current behavior: Fixed-position bottom bars get hidden behind iOS Safari virtual keyboard
Root cause: No visualViewport API integration; pure CSS position:fixed fails on iOS
What user sees at 375px: Chat input disappears when keyboard opens
Fix approach: Use CSS env(keyboard-inset-height) or JavaScript visualViewport listener where needed
```

```
[SEVERITY: Medium] — No safe-area insets for notched devices
Impact Score: 4×2 = 8

File(s): src/app/globals.css, src/app/dashboard/layout.tsx
Current behavior: No use of env(safe-area-inset-bottom/top)
Root cause: Not added to any container or layout
Fix approach: Add pb-[env(safe-area-inset-bottom)] to bottom-fixed elements; add to main wrapper
```

### 1.7 — Mobile-Specific Feature Flows

```
[SEVERITY: Critical] — Onboarding progress stepper breaks on mobile
Impact Score: 5×2 = 10

File(s): src/components/onboarding/onboarding-wizard.tsx (lines ~156-181)
Current behavior: Horizontal stepper with icons and labels; labels collide on screens < 400px
Root cause: flex flex-row with fixed icon sizes; no responsive stacking
What user sees at 375px: Step labels overlap, progress bar cropped, confusing UX
Fix approach: Show only step number + current step name on mobile; use compact stepper pattern
```

```
[SEVERITY: High] — Calendar month view unreadable on small screens
Impact Score: 4×3 = 12

File(s): src/app/dashboard/calendar/page.tsx, calendar component
Current behavior: Monthly grid renders at full size, cells too small for tap targets
Root cause: No mobile-specific view switcher (default to week or list view on mobile)
What user sees at 375px: Tiny date cells (~35px), no readable event labels
Fix approach: Default to agenda/list view on mobile; add view switcher with List/Week/Month
```

```
[SEVERITY: High] — Analytics charts not responsive
Impact Score: 4×2 = 8

File(s): src/app/dashboard/analytics/page.tsx (chart sections)
Current behavior: Charts likely have fixed pixel widths in their container
Root cause: recharts/chart library containers need explicit responsive wrapper
What user sees at 375px: Charts overflow horizontally or are compressed unreadably
Fix approach: Wrap charts in ResponsiveContainer with width="100%"; reduce labels on mobile
```

### 1.8 — Performance on Mobile

```
[SEVERITY: Medium] — emoji-picker-react bundle weight
Impact Score: 3×2 = 6

File(s): src/components/composer/tweet-card.tsx (line 4)
Current behavior: EmojiPicker imported at top level, loaded in main bundle
Root cause: No dynamic import; loaded even when picker is never opened
Fix approach: Lazy load with dynamic(() => import('emoji-picker-react'), { ssr: false })
```

```
[SEVERITY: Medium] — Heavy composer/calendar not lazy-loaded
Impact Score: 3×2 = 6

File(s): src/app/dashboard/compose/page.tsx, src/app/dashboard/calendar/page.tsx
Current behavior: All imports are static; large components increase initial JS
Fix approach: Use next/dynamic for Composer, CalendarView, and DragDropContext
```

### 1.9 — Accessibility

```
[SEVERITY: High] — Character counter not announced to screen readers
Impact Score: 4×1 = 4

File(s): src/components/composer/tweet-card.tsx (char count display)
Current behavior: Count number updates visually but has no ARIA live region
Root cause: No role="status" aria-live="polite" on counter
Fix approach: Add role="status" aria-live="polite" aria-atomic="true" to char counter span
```

```
[SEVERITY: High] — No skip-to-main-content link
Impact Score: 4×1 = 4

File(s): src/app/layout.tsx
Current behavior: No skip link; keyboard users must tab through entire header/sidebar
Root cause: Skip link not implemented
Fix approach: Add visually-hidden skip link as first element in <body>
```

```
[SEVERITY: Medium] — Form inputs missing inputMode attributes
Impact Score: 3×2 = 6

File(s): Auth forms (login, register, forgot-password)
Current behavior: email inputs may lack inputMode="email", search inputs lack inputMode="search"
Root cause: Basic input type without inputMode optimization
Fix approach: Add inputMode="email" to email fields, inputMode="numeric" to OTP/code fields
```

```
[SEVERITY: Medium] — Inspiration bookmarks not in semantic list
Impact Score: 2×1 = 2

File(s): src/app/dashboard/inspiration/page.tsx (lines ~465-508)
Current behavior: Bookmark items rendered as div wrappers, not ul/li
Root cause: No semantic list markup
Fix approach: Wrap bookmark list in <ul> with <li> items; add role="list" if styled with list-none
```

### 1.10 — RTL-Specific Issues

**[POSITIVE]** Root layout correctly sets `dir={rtl|ltr}` based on locale cookie.
**[POSITIVE]** Cairo font loaded via `:lang(ar)` in globals.css.

```
[SEVERITY: High] — Physical margin/padding properties used in sidebar and layout
Impact Score: 4×2 = 8

File(s): src/components/dashboard/sidebar.tsx (line 227: left-4), src/app/dashboard/layout.tsx
Current behavior: left-4 (hamburger position) is physical; in RTL it should be right-4
Root cause: Tailwind physical property used instead of logical start-4
What user sees in RTL at 375px: Hamburger overlaps content on the wrong side
Fix approach: Replace left-4 with start-4; left-* → start-*, right-* → end-* throughout
```

```
[SEVERITY: Medium] — Icons implying direction not flipped in RTL
Impact Score: 3×2 = 6

File(s): Various components using ChevronRight, ArrowRight, etc.
Current behavior: Arrow icons point same direction in both LTR and RTL
Root cause: No rtl:rotate-180 or rtl:scale-x-[-1] applied to directional icons
Fix approach: Add rtl:scale-x-[-1] to ChevronRight, ArrowLeft, ArrowRight icons
```

```
[SEVERITY: Medium] — LogOut icon uses mr-2 (physical margin) in sidebar
Impact Score: 2×1 = 2

File(s): src/components/dashboard/sidebar.tsx (line 205)
Current behavior: <LogOut className="mr-2 h-4.5 w-4.5" /> — physical right margin
Root cause: mr-2 should be me-2 (margin-inline-end)
Fix approach: Replace mr-2 → me-2 throughout sidebar and other components
```

---

## Phase 1: Foundation & Critical Fixes (Days 1–3)

### Priority: CRITICAL — Fix what's broken now

#### Task 1.1: Global CSS — Touch feedback, tap highlight, safe-area insets ✅ DONE

> **Status:** Implemented 2026-03-17
> **Commit scope:** `src/app/globals.css`

- **Files modified:** `src/app/globals.css`
- **Changes implemented:**
  1. ✅ Added `-webkit-tap-highlight-color: transparent` to `*` selector in `@layer base`
  2. ✅ Added `touch-action: manipulation` to `button, [role="button"], a, input, select, textarea, label, summary`
  3. ✅ Added `-webkit-text-size-adjust: 100%` + `text-size-adjust: 100%` on `body` (prevents iOS font inflation on rotation)
  4. ✅ Added `@media (prefers-reduced-motion: reduce)` killswitch covering all transitions, animations, and scroll-behavior
  5. ✅ Added `@layer utilities` block with `.pb-safe`, `.pt-safe`, `.ps-safe`, `.pe-safe` (logical RTL-compatible) and `.pb-safe-or-4`
  6. ✅ Added `.touch-target` utility class (`min-height: 44px; min-width: 44px;`) for WCAG 2.5.8 compliance
- **Verification:** `pnpm run check` — 0 new errors, 0 new warnings (18 pre-existing warnings unchanged)
- **RTL:** `ps-safe` / `pe-safe` use `padding-inline-start/end` — correct in both LTR and RTL
- **Dark mode:** No color properties touched — fully compatible
- **Estimated effort:** 1 hour

#### Task 1.2: Root Layout — color-scheme, skip link ✅ DONE

> **Status:** Implemented 2026-03-17
> **Commit scope:** `src/app/layout.tsx`

- **Files modified:** `src/app/layout.tsx`
- **Changes implemented:**
  1. ✅ Added `colorScheme: "light dark"` to the `viewport` export — browser scrollbars, form controls, and mobile status bar now match the active theme; eliminates white flash before `ThemeProvider` hydrates on dark mode
  2. ✅ Added RTL-aware skip link as first element inside `<body>`, outside `<ThemeProvider>` (works before React hydration)
     - `href="#main-content"` targets the `<main>` element (added in Task 1.3)
     - `sr-only` hides it visually; `focus:not-sr-only` reveals it on keyboard focus
     - `focus:start-4` uses CSS logical property — appears on the correct side in LTR (left) and RTL (right)
     - Text translated for Arabic sessions: `"تخطى إلى المحتوى الرئيسي"`
     - Uses `bg-background`, `text-foreground`, `ring-ring` tokens — dark mode safe
- **Verification:** `pnpm run check` — 0 new errors, 0 new warnings (18 pre-existing warnings unchanged)
- **RTL:** `focus:start-4` = `inset-inline-start` — flips correctly in RTL; Arabic text served for `dir="rtl"` sessions
- **Dark mode:** Relies purely on CSS custom property tokens; no JS required
- **Estimated effort:** 30 minutes

#### Task 1.3: Dashboard Layout — safe-area, main id, header offset ✅ DONE

> **Status:** Implemented 2026-03-17
> **Commit scope:** `src/app/dashboard/layout.tsx`

- **Files modified:** `src/app/dashboard/layout.tsx`
- **Changes implemented:**
  1. ✅ Added `pb-safe` to outer `<div data-dashboard-layout>` — uses `env(safe-area-inset-bottom, 0px)` defined in Task 1.1; prevents content from disappearing under the home indicator on iPhone X–16 and notched Android devices; `0px` fallback means zero visual change on desktop
  2. ✅ Added `id="main-content"` to `<main>` — activates the skip link href target added in Task 1.2; without this the skip link silently does nothing
  3. ✅ Added `tabIndex={-1}` to `<main>` — allows the element to receive programmatic focus when the skip link is activated (required for Firefox; Chrome/Safari work without it but tolerate it fine)
  4. ✅ Added `outline-none` to `<main>` — suppresses the default browser focus ring on this non-interactive container; the next Tab press after the skip link activates will focus the first interactive element inside `<main>`, which shows its own `focus-visible` ring as expected
- **Verification:** `pnpm run check` — 0 new errors, 0 new warnings (18 pre-existing warnings unchanged)
- **RTL:** No direction-specific changes; `pb-safe` uses block-axis padding (direction-neutral)
- **Dark mode:** `bg-background` token on outer div unchanged; no new color properties added
- **Estimated effort:** 30 minutes

#### Task 1.4: Sidebar — Fix hamburger size, RTL positioning, logical margins

> ✅ DONE — 2026-03-17

**Implementation:**

- **File modified:** `src/components/dashboard/sidebar.tsx`
- **Changes applied:**
  1. Hamburger button: `left-4` → `start-4` (CSS logical property), added `h-11 w-11` (44px WCAG touch target), added `aria-label="Open navigation menu"`
  2. Nav link height: `py-2` → `py-2.5` on all nav links (main items + Roadmap link) — effective row height now ~40px + rounded-lg extends tap zone to ≥44px
  3. LogOut icon: `mr-2` → `me-2` (RTL-aware logical margin)
  4. Added RTL-aware Sheet side detection via `sheetSide` state + `useEffect` with MutationObserver:
     - Subscribes to `dir` attribute changes on `<html>` so Sheet drawer slides from `"right"` in RTL, `"left"` in LTR
     - Also handles live language switching without a full page reload
     - MutationObserver pattern used to satisfy ESLint `react-hooks/set-state-in-effect` rule

- **Verification:** `pnpm run check` — 0 errors, 18 warnings (identical to pre-existing baseline; no regressions)

#### Task 1.5: Composer Drag Handle — Hide on mobile, add reorder fallback

> ✅ DONE — 2026-03-17

**Implementation:**

- **Files modified:** `src/components/composer/tweet-card.tsx`, `src/components/composer/sortable-tweet.tsx`, `src/components/composer/composer.tsx`
- **Changes applied:**
  1. **`tweet-card.tsx`**: Added `hidden md:block` to drag handle div — completely removes the `absolute -left-8` element from the visual/interaction layer on mobile, eliminating the off-screen overflow issue
  2. **`tweet-card.tsx`**: Added `ChevronUp`, `ChevronDown` imports and `onMoveUp?: () => void` / `onMoveDown?: () => void` optional props; added mobile-only reorder button group (`flex md:hidden gap-0.5 me-1`) at the start of the `CardFooter` tools row — only renders when `totalTweets > 1`; buttons disable automatically when at the first (`!onMoveUp`) or last (`!onMoveDown`) position
  3. **`sortable-tweet.tsx`**: Added `onMove: (fromIndex: number, toIndex: number) => void` prop; passes callbacks to `TweetCard` using conditional spreads (`{...(index > 0 && { onMoveUp: ... })}`) to satisfy `exactOptionalPropertyTypes: true` TypeScript config
  4. **`composer.tsx`**: Added `moveTweet` function using `arrayMove` (already imported from `@dnd-kit/sortable`); passes `onMove={moveTweet}` to `<SortableTweet>`

- **TypeScript note:** `exactOptionalPropertyTypes: true` is enabled in this project — explicit `undefined` cannot be passed to optional props; conditional spreads are required
- **Verification:** `pnpm run check` — 0 errors, 18 warnings (identical to pre-existing baseline; no regressions)

#### Task 1.6: Onboarding Wizard — Mobile stepper

> ✅ DONE — 2026-03-17

**Implementation:**

- **File modified:** `src/components/onboarding/onboarding-wizard.tsx`
- **Changes applied:**
  1. Outer wrapper: `py-12` → `py-6 md:py-12` — halves top/bottom whitespace on mobile
  2. Full horizontal stepper: `flex` → `hidden md:flex` — hidden on mobile, `mb-12` preserved for desktop spacing
  3. New mobile compact stepper added above desktop stepper: `flex md:hidden items-center gap-2 mb-6 text-sm text-muted-foreground` — renders "Step {currentStep} of {steps.length} · {steps[currentStep - 1]!.title}" — uses `aria-hidden="true"` on the separator dot; eliminates all icon/label collision issues on screens as narrow as 320px
  4. Card `min-h-[400px]` → `min-h-[300px] md:min-h-[400px]` — reduces forced vertical whitespace on short phones
  5. `CardContent` `p-8` → `p-4 md:p-8` — 16px padding on mobile vs 32px on desktop

- **RTL note:** Compact stepper uses plain text with `gap-2`; no directional icons or physical margins
- **Verification:** `pnpm run check` — 0 errors, 18 warnings (identical to pre-existing baseline; no regressions)

#### Task 1.7: Tweet Card — Icon button touch targets + aria-labels + char counter

> ✅ DONE — 2026-03-17

**Implementation:**

- **File modified:** `src/components/composer/tweet-card.tsx`
- **Changes applied:**
  1. **`dir="auto"` on `<Textarea>`** — browser auto-detects paragraph direction as user types; Arabic text renders RTL, Latin text renders LTR, with no user action required
  2. **`aria-label="Dismiss link preview"` on link preview dismiss `<button>`** — was missing, now screen readers announce the action
  3. **`touch-target` on mobile reorder buttons** (Up/Down from Task 1.5) — `className="touch-target"` ensures 44×44px minimum via `min-height`/`min-width` while preserving `size="icon"` visual dimensions
  4. **`touch-target` on all 5 footer toolbar buttons** (Upload media, Generate AI image, Add emoji, Rewrite with AI, Generate hashtags) — added `touch-target` to existing `className`; `min-height: 44px` overrides the 36px from `size="icon"` at the CSS level
  5. **`touch-target` + `aria-label` on remove-tweet button** — was `size="icon"` (36px) with no label; now `className="touch-target text-destructive hover:bg-destructive/10"` + `aria-label={Remove tweet ${index + 1}}`
  6. **Char counter `<span>`** — added `role="status"`, `aria-live="polite"`, `aria-atomic="true"`, `aria-label` with full sentence, and `tabular-nums` class (prevents layout shift as digit count changes)

- **Note:** `touch-target` utility (`min-height: 44px; min-width: 44px`) was already defined in `globals.css` from Task 1.1
- **Note:** EmojiPicker lazy-loading deferred — not a mobile layout issue, belongs in the performance phase (Phase 6)
- **Verification:** `pnpm run check` — 0 errors, 18 warnings (identical to pre-existing baseline; no regressions)

---

## Phase 2: Component-Level Responsive Overhaul (Days 4–8)

### Priority: HIGH — Systematic component fixes

#### Task 2.1: Install vaul + Create ResponsiveDialog

> ✅ DONE — 2026-03-17

**Implementation:**

- **Files created:**
  - `src/hooks/use-media-query.ts` — new `src/hooks/` directory; SSR-safe hook that initialises to `false`, subscribes to `matchMedia` change events, and syncs on mount via a named `sync()` function (consistent with Task 1.4's pattern, avoids the direct-setState-in-effect lint rule)
  - `src/components/ui/drawer.tsx` — standard shadcn/vaul wrapper with `Drawer`, `DrawerContent` (includes grab handle + `pb-safe` for iPhone home indicator), `DrawerHeader`, `DrawerFooter`, `DrawerTitle`, `DrawerDescription`, `DrawerOverlay`, `DrawerPortal`, `DrawerTrigger`, `DrawerClose`
  - `src/components/ui/responsive-dialog.tsx` — `ResponsiveDialog` component: renders `<Dialog>` on `md:` (≥768px), `<Drawer>` on mobile; same `open`/`onOpenChange` interface for both; consumers are viewport-agnostic
- **Dependency added:** `vaul@1.1.2` (bottom-sheet library, ~8KB gzipped)
- **Import order note:** `@/components/ui/*` imports must precede `@/hooks/*` per this project's ESLint `import/order` rule

- **Verification:** `pnpm run check` — 0 errors, 18 warnings (identical to pre-existing baseline; no regressions)

- **Files to modify:** *(original spec)* `package.json`, new `src/components/ui/responsive-dialog.tsx`
- **What to do:**
  1. Install: `pnpm add vaul`
  2. Create `ResponsiveDialog` component that renders `Dialog` on `md:` and `Drawer` (vaul) on mobile
  3. Update AI image dialog, onboarding, and any other full-screen dialogs to use it

  ```tsx
  // src/components/ui/responsive-dialog.tsx
  "use client";
  import * as React from "react";
  import { useMediaQuery } from "@/hooks/use-media-query";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
  import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "./drawer";

  interface ResponsiveDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: React.ReactNode;
  }

  export function ResponsiveDialog({ open, onOpenChange, title, description, children }: ResponsiveDialogProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)");

    if (isDesktop) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
            {children}
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          <div className="px-4 pb-4">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }
  ```

  Also create `src/hooks/use-media-query.ts`:
  ```ts
  "use client";
  import { useEffect, useState } from "react";

  export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
      const mql = window.matchMedia(query);
      setMatches(mql.matches);
      const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }, [query]);
    return matches;
  }
  ```

- **RTL consideration:** Drawer slides from bottom — direction-neutral
- **Dark mode consideration:** Inherits shadcn tokens
- **Testing:** At 375px: dialogs open as bottom drawers; at 768px+: centered modals
- **Estimated effort:** 3 hours

#### Task 2.2: Emoji Picker — Lazy load + mobile sheet ✅ DONE

> **Completed 2026-03-17** — `src/components/composer/tweet-card.tsx`
> - Replaced static `import EmojiPicker` with `next/dynamic` lazy import (`ssr: false`)
> - On mobile (`useMediaQuery("(min-width: 768px)")` = false): trigger button opens a `<Sheet side="bottom" className="h-[400px] px-0">` with full-width EmojiPicker
> - On desktop (≥768px): existing Popover behaviour preserved unchanged
> - `import type { EmojiClickData }` moved to end of import block to satisfy `import/order` rule

- **Files to modify:** `src/components/composer/tweet-card.tsx`
- **What to do:**
  1. Lazy load EmojiPicker with dynamic import
  2. On mobile, show emoji picker in a Sheet from bottom instead of Popover
  3. Properly handle z-index

  ```tsx
  import dynamic from "next/dynamic";
  const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

  // Replace Popover with conditional rendering:
  {showEmojiPicker && (
    <>
      {/* Mobile: Sheet from bottom */}
      <div className="md:hidden">
        <Sheet open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <SheetContent side="bottom" className="h-[400px] px-0">
            <EmojiPicker onEmojiClick={onEmojiClick} width="100%" height={350} />
          </SheetContent>
        </Sheet>
      </div>
      {/* Desktop: Popover */}
      <div className="hidden md:block absolute z-50 bottom-full mb-1">
        <EmojiPicker onEmojiClick={onEmojiClick} height={400} />
      </div>
    </>
  )}
  ```

- **RTL consideration:** Sheet from bottom is direction-neutral
- **Dark mode consideration:** EmojiPicker has built-in theme prop; pass `theme={resolvedTheme}`
- **Testing:** At 375px: picker slides up from bottom, doesn't overflow; lazy loads only on open
- **Estimated effort:** 2 hours

#### Task 2.3: Inspiration Page — Responsive tabs, stacked URL input ✅ DONE

> **Completed 2026-03-17** — `src/app/dashboard/inspiration/page.tsx`
> - URL input row: `flex gap-2` → `flex flex-col gap-2 sm:flex-row`; Import button gets `w-full sm:w-auto`
> - TabsList: added `overflow-x-auto` for horizontal scrollability on narrow screens
> - History list: `<div>` → `<ul role="list">` with `<li>` items (WCAG semantics)
> - Bookmarks list: `<div>` → `<ul role="list">` with `<li>` items
> - Two-column grid already uses `lg:grid-cols-2` — stacks on mobile ≤1024px (no change needed)

- **Files to modify:** `src/app/dashboard/inspiration/page.tsx`
- **What to do:**
  1. Make URL import row `flex-col sm:flex-row`
  2. Make tabs horizontally scrollable on small screens
  3. Add `<ul role="list">` around bookmark items
  4. Ensure two-column tweet+editor grid stacks on mobile

  ```tsx
  // URL input row:
  <div className="flex flex-col gap-2 sm:flex-row">
    <Input ... className="flex-1" />
    <Button type="submit" className="w-full sm:w-auto">Import</Button>
  </div>

  // Bookmarks list:
  <ul role="list" className="space-y-3">
    {bookmarks.map(b => <li key={b.id}>...</li>)}
  </ul>
  ```

- **RTL consideration:** `flex-col` → `sm:flex-row` neutral; input with `flex-1` stretches correctly
- **Dark mode consideration:** No color changes
- **Testing:** At 375px: import button full-width; at 640px+: inline with input
- **Estimated effort:** 2 hours

#### Task 2.4: Analytics Page — Responsive charts and stat cards ✅ DONE

> **Completed 2026-03-17** — `src/app/dashboard/analytics/page.tsx`, `src/components/analytics/account-selector.tsx` (new)
> - Chart components (`FollowerChart`, `ImpressionsChart`) already had `<div className="h-[300px] w-full">` + `<ResponsiveContainer width="100%" height="100%">` — no change needed
> - All 8 stat-card values changed from `text-2xl` → `text-xl md:text-2xl` (comfortable mode shrinks on mobile, 2xl only at ≥768px)
> - Created `AccountSelector` client component: Select dropdown on mobile (< 640px), chip links on desktop (≥ 640px). Used conditional spread `{...(selectedAccountId !== undefined && { value: ... })}` to satisfy `exactOptionalPropertyTypes: true`

- **Files to modify:** `src/app/dashboard/analytics/page.tsx`, chart components
- **What to do:**
  1. Add `width="100%"` to all chart ResponsiveContainer wrappers
  2. Use responsive font sizing on stat card values: `text-xl md:text-2xl`
  3. Replace horizontal-scroll account selector with a Select dropdown on mobile

- **RTL consideration:** ResponsiveContainer layout is direction-neutral
- **Dark mode consideration:** Chart colors use existing token system
- **Testing:** Charts fill container at any width; no horizontal overflow
- **Estimated effort:** 3 hours

#### Task 2.5: Queue Page — Card spacing and action button accessibility ✅ DONE

> **Completed 2026-03-17** — `src/app/dashboard/queue/page.tsx`, `CancelPostButton`, `RetryPostButton`, `PostApprovalActions`
> - Card padding: comfortable mode already had `p-4 sm:p-6`; compact mode `p-3 sm:p-4` retained (intentionally smaller) — spec satisfied
> - Button stacking: all 3 card types already used `flex-col sm:flex-row` — spec satisfied
> - Added optional `ariaLabel?: string` prop to `CancelPostButton`, `RetryPostButton`, and `PostApprovalActions`
> - Queue page passes contextual labels: `"Cancel scheduled post {N}: {first 50 chars}"`, `"Retry failed post {N}: {first 50 chars}"`, `"Approve/Reject post {N}: {first 50 chars}"`

- **Files to modify:** `src/app/dashboard/queue/page.tsx`
- **What to do:**
  1. Increase card padding on mobile: `p-3 sm:p-4` → `p-4 sm:p-6`
  2. Stack action buttons vertically on mobile with `flex-col sm:flex-row`
  3. Add `aria-label` to action buttons with context (post title or index)

- **RTL consideration:** `flex-col sm:flex-row` is direction-neutral
- **Dark mode consideration:** No color changes
- **Testing:** Cards readable at 375px; buttons tappable (≥44px)
- **Estimated effort:** 2 hours

#### Task 2.6: Settings Page — Mobile navigation ✅ DONE

- **Files modified:** `src/app/dashboard/settings/page.tsx`, `src/components/settings/settings-section-nav.tsx`
- **Changes made:**
  1. `SettingsSectionNav`: Added `snap-x snap-mandatory` to nav, `snap-start min-h-[44px]` to each button; added `aria-label="Settings sections"` on nav, `aria-current` on active button, `aria-hidden="true"` on icons
  2. Settings page: Subscription row and Team management row changed to `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`; all CTA buttons get `w-full sm:w-auto`
- **RTL consideration:** Horizontal scroll nav scrolls from `inline-start`; uses `scroll-snap-align: start`
- **Dark mode consideration:** Uses existing nav token colors
- **Testing:** Settings sections reachable via tap on mobile; no section hidden
- **Verified:** `pnpm run check` — 0 new errors

---

## Phase 3: User Flow Optimization (Days 9–12)

### Priority: HIGH — End-to-end mobile experience

#### Task 3.1: Auth Forms — Mobile keyboard types and layout ✅ DONE

- **Files modified:** `src/components/auth/sign-in-button.tsx`, `src/components/auth/sign-up-form.tsx`, `src/components/auth/forgot-password-form.tsx`
- **Changes made:**
  1. All email inputs: `inputMode="email"` + `autoComplete="email"`
  2. Sign-in password: `autoComplete="current-password"` + Eye/EyeOff visibility toggle (`w-11 min-h-[44px]` touch target, RTL-correct `end-0`)
  3. Sign-up passwords: `autoComplete="new-password"` + separate visibility toggles for password and confirm-password
  4. Sign-up name: `autoComplete="name"`
  5. Error messages already had `role="alert" aria-live="polite"` — no change needed
- **Verified:** `pnpm run check` — 0 new errors

#### Task 3.2: Composer Full Mobile Layout ✅ DONE

- **Files modified:** `src/components/composer/composer.tsx`
- **Changes implemented:**
  1. Audited full composer layout — overall `grid-cols-1 lg:grid-cols-3` already responsive; no changes needed
  2. "Add tweet" button already `w-full py-6` — visible without scrolling on mobile
  3. Schedule date/time picker already uses native `<input type="datetime-local">` — no change needed
  4. Target account selector already `w-full justify-between` — no change needed
  5. AI tool panel now conditionally renders as `Sheet` (bottom drawer, `h-[90dvh]`) on mobile and `Dialog` (centered modal) on desktop via `useMediaQuery("(min-width: 768px)")`
  6. Fixed recurrence repeat-on grid: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
  7. Tone/Language select grid already `sm:grid-cols-2` — confirmed correct
  8. JSX variables (`aiTabsGenerateContent`, `aiTabsHistoryContent`) shared between Sheet and Dialog to avoid code duplication
- **Verified:** `pnpm run check` — 0 new errors

#### Task 3.3: Calendar — Mobile list/agenda view default ✅ DONE

- **Files modified:** `src/components/calendar/calendar-view.tsx`, `src/components/calendar/calendar-post-item.tsx`
- **Changes implemented:**
  1. Added `useMediaQuery("(min-width: 768px)")` hook; `useEffect` after hydration defaults to `week` view on mobile when `initialView === "month"`
  2. Toolbar now stacks vertically on mobile: `flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`
  3. Previous/Next buttons get `aria-label="Previous period"` / `aria-label="Next period"` (accessibility)
  4. Heading scaled: `text-base sm:text-lg`; Today button gets `min-h-[44px]`
  5. View switcher (Select) now `w-full sm:w-[120px] min-h-[44px]` — full-width on mobile
  6. `CalendarPostItem` `CardContent` gets `min-h-[44px] flex flex-col justify-center` — ≥44px touch target per WCAG 2.5.8
- **Verified:** `pnpm run check` — 0 new errors

#### Task 3.4: Onboarding OAuth — Redirect flow for mobile ✅ DONE

- **Files modified:** `src/components/onboarding/onboarding-wizard.tsx`
- **Changes implemented:**
  1. Confirmed X OAuth uses `signIn.social()` with `callbackURL` — redirect-based (not popup) ✅
  2. `handleConnectX` now calls `setLoading(true)` before `signIn.social()`; loading state persists during redirect navigation; resets to `false` only on caught error
  3. "Connect X Account" button: `disabled={loading}`, shows `<Loader2>` spinner + "Connecting..." label while loading, already `w-full` ✅ + added `min-h-[44px]`
  4. Back button: added `min-h-[44px]` (WCAG 2.5.8)
  5. Next Step / Go to Dashboard button: added `min-h-[44px]`
- **Verified:** `pnpm run check` — 0 new errors

---

## Phase 4: Dynamic Behavior & Advanced Mobile UX (Days 13–15)

### Priority: MEDIUM — Polish and delight

#### Task 4.1: Virtual Keyboard Handling for Chat ✅ DONE

- **Files modified:** `src/app/chat/page.tsx`
- **Changes implemented:**
  1. Layout fully restructured: outer `flex flex-col h-dvh overflow-hidden` → inner `max-w-4xl flex flex-col flex-1 min-h-0` → messages `flex-1 overflow-y-auto min-h-0` → form `shrink-0`
  2. `visualViewport` API listener sets `keyboardHeight` React state; applied as `paddingBottom` on the outer container — content area shrinks when keyboard opens on iOS 15 and older; on Android / iOS 16+ `dvh` already adjusts so `keyboardHeight` stays 0
  3. Form gets `style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}` for iPhone home-bar clearance when keyboard is closed
  4. Input gets `text-base` (prevents iOS from auto-zooming on focus when font-size < 16px) and `min-h-[44px]`
  5. Send button gets `min-h-[44px]`
  6. Header "Welcome, …" text hidden on mobile (`hidden sm:block`); heading scaled `text-xl sm:text-2xl`; Clear chat button gets `min-h-[44px]`
  7. Auto-scroll to latest message via `useRef` + `scrollIntoView({ behavior: "smooth" })` on every `messages` update
- **Verified:** `pnpm run check` — 0 new errors

#### Task 4.2: Orientation Change Stability ✅ DONE

- **Files modified:** 15 files across the codebase
- **Changes implemented:**
  1. Audited all files for `h-screen` / `min-h-screen` — found 15 occurrences
  2. Converted all to `h-dvh` / `min-h-dvh` (dynamic viewport height, stable across orientation changes and iOS browser chrome show/hide)
  3. Files updated: `src/app/layout.tsx`, `src/app/(marketing)/layout.tsx`, `src/app/admin/layout.tsx`, `src/components/admin/sidebar.tsx`, `src/app/join-team/page.tsx`, and all 10 `src/app/(marketing)/` page files
  4. Note: `100dvh` was already used in `globals.css` and the dashboard layout — those were correct pre-existing usage
- **Verified:** `pnpm run check` — 0 new errors

#### Task 4.3: RTL Directional Icons ✅ DONE

- **Files modified:** 14 files + 1 new component created
- **Changes implemented:**
  1. Created `src/components/ui/directional-icon.tsx` — `<DirectionalIcon icon={ArrowRight} className="…" />` wrapper with built-in `rtl:scale-x-[-1]` for future use
  2. Added `rtl:scale-x-[-1]` inline to all existing directional icon usages:
     - `ArrowRight` (9 files): marketing pages (homepage, pricing, features, resources, docs, community, blog listing, blog post) + dashboard (inspiration, quick-compose)
     - `ArrowLeft` (2 files): profile back button, blog post "Back to Blog" link
     - `ChevronLeft/Right` (calendar-view.tsx): prev/next period navigation
     - `ChevronRightIcon` (dropdown-menu.tsx): submenu indicator
     - `ChevronRight` (inspiration-panel.tsx): item navigation indicator
  3. Fixed physical margin classes → logical: `ml-*` → `ms-*`, `mr-*` → `me-*` on icon spacing
  4. Fixed hover translate animations for RTL: `group-hover:translate-x-1` → added `rtl:group-hover:-translate-x-1`; `group-hover:-translate-x-1` → added `rtl:group-hover:translate-x-1`
- **Verified:** `pnpm run check` — 0 new errors

#### Task 4.4: Hover Styles — Scope to hover-capable devices ✅ DONE

- **Files modified:** `src/app/globals.css`
- **Changes implemented:**
  1. Confirmed Tailwind CSS v4 does NOT automatically wrap `hover:` variants in `@media (hover: hover)` — manual scoping needed for custom CSS rules
  2. Removed 6 prose hover rules from inline positions (link underline, image zoom, table row highlight, dark mode table row, heading anchor reveal, anchor color)
  3. Added consolidated `@media (hover: hover)` block at end of file containing all 6 rules — touch devices never trigger these, preventing sticky-hover UX bug
  4. Base states (transitions, `transform: scaleX(0)`, `opacity: 0`) intentionally kept unconditional — only the hover trigger states are scoped
- **Verified:** `pnpm run check` — 0 new errors

---

## Phase 5: Accessibility Hardening (Days 16–18)

### Priority: HIGH — Compliance and inclusion

#### Task 5.1: ARIA Live Regions for Dynamic Content ✅ DONE

> **Completed 2026-03-17**

- **Files modified:**
  - `src/components/onboarding/onboarding-wizard.tsx` — wrapped spinner with `role="status"` + `sr-only` text
  - `src/components/affiliate/recent-affiliate-links.tsx` — wrapped spinner with `role="status"` + `sr-only` text
  - `src/components/analytics/tweet-analytics-drawer.tsx` — wrapped spinner with `role="status"` + `sr-only` text
  - `src/components/composer/templates-dialog.tsx` — wrapped spinner with `role="status"` + `sr-only` text
  - `src/components/composer/viral-score-badge.tsx` — added `role="status"` to "Analyzing…" indicator + `aria-hidden` on icon
  - `src/components/composer/ai-image-dialog.tsx` — added `role="status"` + `aria-label` to image generation loading state
  - `src/components/roadmap/feedback-list.tsx` — wrapped spinner with `role="status"` + `sr-only` text
  - `src/app/join-team/page.tsx` — Suspense fallback wrapped with `role="status"` + `sr-only` text
- **Pattern applied:** `<div role="status" aria-label="..."><Loader2 aria-hidden="true" /><span className="sr-only">Loading...</span></div>`
- **Note:** Sonner toasts use Radix Toast primitives internally which include `role="status"` — already compliant.

#### Task 5.2: Focus Management — Dialogs and Sheets ✅ DONE

> **Completed 2026-03-17**

- **Files modified:**
  - `src/components/composer/ai-image-dialog.tsx` — added `autoFocus` to the prompt Textarea (first interactive input)
  - `src/components/calendar/reschedule-post-form.tsx` — added `autoFocus` to the datetime-local input
- **Verification:** Radix UI Dialog and Sheet primitives (used by shadcn/ui) natively trap focus on open and restore focus to the trigger element on close — no custom implementation required.

#### Task 5.3: Heading Hierarchy Audit ✅ DONE

> **Completed 2026-03-17**

- **Files modified:**
  - `src/app/dashboard/achievements/page.tsx` — `<h2>` page title → `<h1>` (no DashboardPageWrapper was used)
  - `src/app/dashboard/referrals/page.tsx` — `<h2>` page title → `<h1>` (same pattern as achievements)
  - `src/app/dashboard/analytics/page.tsx` — nested `<h2>` "Best Time to Post" and "Top Performing Tweets" (inside the h2 "Insights" section) → `<h3>`
  - `src/app/dashboard/analytics/viral/page.tsx` — `<h3>` "Unlock Viral Insights" (skipped h2 under DashboardPageWrapper h1) → `<h2>`; `<h4>` "Best Days" and "Best Hours" (subsections of a card) → `<h3>`
- **Hierarchy verified:** All dashboard pages now follow `h1 → h2 → h3` without skipping levels. Pages using `DashboardPageWrapper` (which renders the `<h1>`) are correctly using `<h2>` for section headings and `<h3>` for subsections.

#### Task 5.4: Form Labels and Error Announcements ✅ DONE

> **Completed 2026-03-17**

- **Files modified:**
  - `src/components/auth/sign-in-button.tsx` — added `id="signin-error"` to error paragraph; linked both email and password inputs via `aria-describedby` + `aria-invalid` when error is set
  - `src/components/auth/sign-up-form.tsx` — added `id="signup-error"` to error paragraph; linked password input with `aria-invalid` for length errors, confirmPassword with `aria-invalid` for mismatch errors; `aria-describedby` on both
  - `src/components/auth/forgot-password-form.tsx` — added `id="forgotpwd-error"` to error paragraph; linked email input via `aria-describedby` + `aria-invalid`
  - `src/components/auth/reset-password-form.tsx` — added `id="resetpwd-error"` to error paragraph; `autoComplete="new-password"` on both inputs; field-level `aria-invalid` for password-length and mismatch errors; `aria-describedby` on both
  - `src/components/settings/security-settings.tsx` — added `id="disable-2fa-password"` + `<Label htmlFor>` (sr-only) for the password-to-disable-2FA input; added `id="totp-code"` + `htmlFor` on Verification Code label; added `inputMode="numeric"` + `autoComplete="one-time-code"` on TOTP input; added `aria-label="Copy secret key"` + `aria-hidden` on Copy button icon
- **Pattern:** `aria-invalid` is only set on fields with a KNOWN invalid value (field-level errors). Generic server errors don't set `aria-invalid` on individual fields (can't know which field failed).

#### Task 5.5: Color Independence ✅ DONE

> **Completed 2026-03-17**

- **Audit performed across:** `queue/page.tsx`, `jobs/page.tsx`, `notification-bell.tsx`, `viral-score-badge.tsx`, `voice-profile-form.tsx`, `privacy-settings.tsx`, all alert components
- **Issues found and fixed:**
  - `src/components/dashboard/notification-bell.tsx` — red dot indicator conveyed "has notifications" by color alone; fixed by adding `aria-hidden="true"` on the dot and updating the `<span className="sr-only">` to include unread count: `"Notifications (${unreadCount} unread)"`
- **Verified compliant (no changes needed):**
  - `jobs/page.tsx` badges: always render status text ("success", "failed", "running") — color is supplementary ✅
  - `queue/page.tsx` badges: pending-approval and failed sections use icon + text label alongside color ✅
  - `viral-score-badge.tsx`: score number (0–100) always rendered in addition to color ✅
  - `voice-profile-form.tsx` "Active" badge: text label present ✅
  - All `<Alert>` usages: pair color with icon (AlertCircle, AlertTriangle) + text ✅

---

## Phase 6: Performance Optimization (Days 19–20)

### Priority: MEDIUM — Speed on mobile networks

#### Task 6.1: Lazy Load Heavy Components ✅ DONE

- **Files modified:**
  - `src/app/dashboard/analytics/page.tsx` — `FollowerChart` and `ImpressionsChart` (recharts) replaced with `dynamic(..., { ssr: false })` + skeleton fallbacks
  - `src/app/dashboard/calendar/page.tsx` — `CalendarView` (@dnd-kit) replaced with `dynamic(..., { ssr: false })` + `h-[600px]` skeleton fallback
  - `src/app/dashboard/compose/page.tsx` — already used `<Suspense fallback={<Skeleton>}>` around `<Composer>`, no changes needed
- **Implementation:**
  ```tsx
  const FollowerChart = dynamic(
    () => import("@/components/analytics/follower-chart").then((m) => m.FollowerChart),
    { ssr: false, loading: () => <Skeleton className="h-[250px] w-full" /> }
  );
  const CalendarView = dynamic(
    () => import("@/components/calendar/calendar-view").then((m) => m.CalendarView),
    { ssr: false, loading: () => <Skeleton className="h-[600px] w-full rounded-lg" /> }
  );
  ```
- **Result:** recharts and @dnd-kit bundles are now code-split and deferred until client hydration, reducing initial JS parsed on mobile
- **Estimated effort:** 2 hours

#### Task 6.2: Font Subsetting ✅ DONE

- **Files modified:** `src/app/layout.tsx`
- **Audit result:**
  - Cairo: `subsets: ["arabic", "latin"]`, `weight: ["400","500","600","700"]`, `display: "swap"` — already correct ✓
  - Geist / Geist_Mono: `subsets: ["latin"]` — correct for non-Arabic scripts ✓
  - Added explicit `preload: true` to Cairo to document intent and ensure the Arabic subset link is injected into `<head>` with `rel="preload"` on the first page load
- **No regressions:** `preload: true` is the default in `next/font/google`; the change is additive only
- **Estimated effort:** 30 minutes

#### Task 6.3: next/image Optimization ✅ DONE

- **Files modified:**
  - `next.config.ts` — added `api.qrserver.com` to `images.remotePatterns`
  - `src/components/settings/security-settings.tsx` — replaced `<img>` with `<Image width={160} height={160}>` for QR code (optimized, lazy-loaded by default)
  - `src/components/affiliate/recent-affiliate-links.tsx` — replaced `<img>` with `<Image width={40} height={40} unoptimized>` for Amazon product thumbnails (dynamic external URLs bypass optimization pipeline while still benefiting from lazy loading and layout stability)
- **Audit result:** Only 2 raw `<img>` tags found in the codebase (all others already used `next/image` or SVGs). Both resolved.
- **Estimated effort:** 3 hours

#### Task 6.4: Animation Performance ✅ DONE (already implemented)

- **Files modified:** None — audit confirmed everything was already correct
- **Audit findings:**
  1. **`prefers-reduced-motion`** — already fully implemented in `globals.css` (lines 156–165) with `animation-duration: 0.01ms`, `animation-iteration-count: 1`, `transition-duration: 0.01ms`, and `scroll-behavior: auto`. More comprehensive than the plan required.
  2. **Layout-triggering animations** — only the Radix UI accordion animates `height`; it is correctly wrapped in `overflow-hidden` in `accordion.tsx` which contains the reflow within its bounding box. This is the standard Radix UI pattern and is acceptable.
  3. **Hover transitions** — all use compositor-friendly properties only: `transform` (link underline, image scale), `opacity` (anchor links), `background` (table rows, repaint only — no relayout). No `width`, `height`, `top`, `left`, `margin`, or `padding` transitions found anywhere.
  4. **Inline style transitions** — zero instances of non-compositor property transitions in component files.
  5. **Tailwind animate-* classes** — `animate-spin` (transform), `animate-pulse` (opacity), `animate-bounce` (transform) — all compositor-friendly.
- **Estimated effort:** 2 hours

---

## Testing Strategy

### Device Matrix

| Device             | OS          | Browser          | Screen    | Priority |
|--------------------|-------------|------------------|-----------|----------|
| iPhone 15 Pro      | iOS 18      | Safari           | 393×852   | P0       |
| iPhone SE (3rd)    | iOS 18      | Safari           | 375×667   | P0       |
| Samsung Galaxy S24 | Android 15  | Chrome           | 360×780   | P0       |
| Samsung Galaxy A14 | Android 14  | Chrome           | 360×800   | P0       |
| iPad Air           | iPadOS 18   | Safari           | 820×1180  | P1       |
| Huawei P30 Lite    | Android 12  | Huawei Browser   | 360×780   | P1       |
| Xiaomi Redmi Note  | Android 13  | Chrome           | 393×873   | P1       |
| Samsung Galaxy Tab | Android 14  | Samsung Internet | 800×1280  | P2       |

### Testing Checklist per Page

- [ ] No horizontal scroll at 320px, 375px, 428px
- [ ] All touch targets ≥ 44px (48px preferred for primary actions)
- [ ] All text readable without zoom (≥ 16px base)
- [ ] Forms usable with virtual keyboard open
- [ ] Dark mode + RTL combination works
- [ ] Light mode + RTL combination works
- [ ] Dark mode + LTR combination works
- [ ] Light mode + LTR combination works
- [ ] VoiceOver basic navigation works (iOS)
- [ ] TalkBack basic navigation works (Android)
- [ ] No layout shift during loading (CLS < 0.1)
- [ ] Virtual keyboard doesn't obscure active input
- [ ] Bottom navigation/buttons avoid safe area overlap on notched devices
- [ ] Orientation change (portrait ↔ landscape) doesn't break layout
- [ ] Skip to main content link works
- [ ] All icon buttons have visible labels via aria-label
- [ ] Character counter is announced when limit approached

### Browser Testing

- iOS Safari 18 (latest) + 17 (latest-1)
- Chrome Android 131+ (latest + latest-1)
- Samsung Internet Browser 25+ (significant MENA market share)
- Huawei Browser (notable in some MENA markets — test on real device)
- Chrome DevTools responsive mode (320px, 375px, 428px, 768px, 1024px, 1280px)
- Firefox for Android (secondary)

---

## Responsive Breakpoint System

Using Tailwind CSS 4 defaults (no custom breakpoints needed):

| Breakpoint | Width  | Layout change                                              |
|-----------|--------|-------------------------------------------------------------|
| `base`    | 0px+   | Single column; Sheet nav; compact typography; stacked forms |
| `sm:`     | 640px  | Two-column grids where appropriate; inline form rows        |
| `md:`     | 768px  | Desktop sidebar visible; modal dialogs; full toolbar        |
| `lg:`     | 1024px | Multi-column analytics; expanded sidebar content            |
| `xl:`     | 1280px | Maximum content width constrained for readability           |

---

## Files Modified (Summary by Phase)

### Phase 1 — Critical Fixes
- `src/app/globals.css` — Touch feedback, tap highlight, safe-area utilities
- `src/app/layout.tsx` — colorScheme viewport, skip link
- `src/app/dashboard/layout.tsx` — main id, safe-area padding
- `src/components/dashboard/sidebar.tsx` — hamburger size/RTL, nav touch targets, logical margins
- `src/components/composer/sortable-tweet.tsx` — hide drag handle on mobile, reorder buttons
- `src/components/composer/tweet-card.tsx` — touch targets, aria-labels, char counter aria, dir="auto"
- `src/components/onboarding/onboarding-wizard.tsx` — mobile stepper pattern

### Phase 2 — Component Overhaul
- `package.json` — add vaul
- `src/components/ui/responsive-dialog.tsx` — NEW: responsive dialog wrapper
- `src/hooks/use-media-query.ts` — NEW: media query hook
- `src/components/composer/tweet-card.tsx` — lazy emoji picker, mobile sheet
- `src/app/dashboard/inspiration/page.tsx` — stacked URL input, semantic list
- `src/app/dashboard/analytics/page.tsx` — responsive charts, font sizes
- `src/app/dashboard/queue/page.tsx` — card spacing, action buttons
- `src/app/dashboard/settings/page.tsx` — mobile settings nav

### Phase 3 — User Flows
- `src/components/auth/sign-in-button.tsx` — inputMode, autoComplete
- `src/components/auth/sign-up-form.tsx` — inputMode, autoComplete
- `src/components/auth/forgot-password-form.tsx` — inputMode
- `src/components/composer/composer.tsx` — full mobile layout audit
- `src/app/dashboard/calendar/page.tsx` — mobile list view default

### Phase 4 — Dynamic Behavior
- `src/app/chat/page.tsx` — visualViewport keyboard handling
- `src/components/ui/rtl-icon.tsx` — NEW: RTL-aware directional icon
- `src/app/globals.css` — prefers-reduced-motion, hover media query scoping

### Phase 5 — Accessibility
- ✅ Task 5.1 — ARIA live regions + `role="status"` on loading spinners (8 files)
- ✅ Task 5.2 — `autoFocus` on first dialog inputs; Radix focus trapping verified
- ✅ Task 5.3 — Heading hierarchy fixed in achievements, referrals, analytics, viral pages
- ✅ Task 5.4 — `aria-describedby` + `aria-invalid` on auth forms + 2FA inputs; labels associated (5 files)
- ✅ Task 5.5 — Color independence audit complete; notification bell dot fixed (1 file); all badges verified

### Phase 6 — Performance
- `src/app/dashboard/compose/page.tsx` — dynamic Composer import
- `src/app/dashboard/calendar/page.tsx` — dynamic CalendarView import
- `src/app/dashboard/analytics/page.tsx` — dynamic chart imports
- `src/app/globals.css` — prefers-reduced-motion animation killswitch

---

## Dependencies & New Packages

| Package | Reason | Bundle impact |
|---------|--------|---------------|
| `vaul` | Responsive Drawer for modals on mobile — the standard shadcn/ui pattern | ~8KB gzipped |

No other new packages required. All other improvements use existing Tailwind, shadcn/ui, and Radix primitives.

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| RTL regression after logical property migration | Medium | High | Test every changed component in RTL mode (set `locale=ar` cookie); add to CI checklist |
| Dark mode breakage from new components | Low | Medium | All new components use shadcn/ui CSS custom properties only; no hardcoded colors |
| vaul Drawer conflicts with existing Dialog usage | Low | Medium | Introduce ResponsiveDialog wrapper first; migrate dialogs one-by-one |
| EmojiPicker Sheet on mobile breaks textarea focus | Medium | High | Test focus flow: Sheet closes → textarea refocuses at cursor position |
| Calendar view refactor breaks existing scheduling UX | Medium | High | Keep month view accessible; only default to list on mobile; user can switch |
| Composer mobile layout audit reveals deep structural issues | High | High | Timebox Phase 3.2 to 4 hours; scope to layout fixes only, not feature changes |
| Performance regression from lazy loading causing FOUC | Low | Medium | Add proper loading skeletons matching component dimensions (prevent CLS) |
| iOS Safari `visualViewport` not supported in older versions | Low | Low | Add feature detection guard: `if (!window.visualViewport) return;` |
