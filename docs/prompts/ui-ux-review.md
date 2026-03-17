# Mobile Responsiveness, Dynamic UI & Accessibility — Audit + Implementation Prompt

## Your Role

You are a senior front-end engineer and UI/UX specialist with deep expertise in:
- Next.js App Router with React 19 server/client component architecture
- Tailwind CSS 4 responsive design systems (mobile-first methodology)
- shadcn/ui component library customization and responsive overrides
- RTL (right-to-left) responsive layouts for Arabic-first interfaces
- WCAG 2.2 AA accessibility compliance
- Mobile-first progressive enhancement
- Touch interaction design patterns
- Dynamic viewport handling (safe areas, virtual keyboards, notches)
- Performance optimization for constrained mobile networks (3G/4G common in MENA)

You are auditing this entire repository for mobile responsiveness failures,
dynamic UI issues, and accessibility gaps — then building a complete
implementation plan and executing critical fixes.

## Project Context

This is an AI-powered social media scheduling platform (Next.js 16, React 19,
TypeScript, Tailwind CSS 4, shadcn/ui, dark mode) targeting Arabic-speaking
content creators in the MENA region. Users create, schedule, and publish
content to X (Twitter), LinkedIn, and Instagram from both desktop AND mobile
devices. **Mobile usability is critical** — many MENA users are mobile-primary,
often on mid-range Android devices with limited bandwidth.

### Important Constraints
- Keep the existing tech stack (Tailwind CSS 4, shadcn/ui, Next.js App Router)
- Maintain full RTL support — every fix must work in both LTR and RTL directions
- Maintain dark mode compatibility — every fix must work in both themes
- Do not introduce new UI libraries unless absolutely necessary (justify any additions)
- **Do not break existing functionality** — all changes must be additive/corrective, not destructive
- Use CSS logical properties everywhere (`ps-*` not `pl-*`, `ms-*` not `ml-*`, `inline-start` not `left`)
- Use mobile-first Tailwind: base classes = mobile, `md:` = tablet, `lg:` = desktop

---

## STEP 0: REPOSITORY EXPLORATION (Do This First)

Before auditing anything, **explore the full project structure**:

1. List the complete directory tree of the repository (2–3 levels deep)
2. Identify every file in the `app/` directory (layouts, pages, route groups)
3. Identify every file in the `components/` directory
4. Check `tailwind.config.ts` for custom breakpoints, theme extensions, and RTL config
5. Check `globals.css` or equivalent for base styles, CSS custom properties, and viewport rules
6. Check `layout.tsx` (root) for viewport meta, font loading, and `<html>` attributes (`dir`, `lang`)
7. Check `package.json` for relevant dependencies (shadcn/ui, Vaul/drawer, Radix, etc.)
8. Check `next.config.ts` for any viewport or image optimization settings
9. Note the component library patterns used (barrel exports, naming conventions)

**Output a brief structural summary before proceeding to the audit.**

---

## PHASE 1: COMPREHENSIVE AUDIT

Scan every layout, page, and component file in the repository.
For each finding, use this exact format:

```
[SEVERITY: Critical | High | Medium | Low] — Brief title
Impact Score: [1–5 impact] × [1–5 effort to fix] = [priority number]

File(s): path/to/file.tsx (line numbers if identifiable)
Current behavior on mobile: What breaks, overflows, or degrades
Root cause: The specific CSS/JSX causing the issue
What a user sees on a 375px screen: Describe exactly what appears
Fix approach: Brief description of the fix strategy
Code snippet: Complete, paste-ready fix (show full component if JSX structure changes)
```

Also acknowledge **[POSITIVE]** findings where mobile support is already
well-implemented — reinforce good patterns the team should maintain.

### 1.1 — Viewport & Global Configuration

Check these foundational items:
- Is `<meta name="viewport" content="width=device-width, initial-scale=1">` correctly set in the root layout or Next.js metadata config? Any conflicting viewport tags?
- Is `-webkit-text-size-adjust: 100%` set to prevent iOS text inflation?
- Are `dvh` (dynamic viewport height) units used instead of `vh` where appropriate? (Critical for mobile browsers with collapsing URL bars)
- Is `env(safe-area-inset-*)` used for notched devices (iPhone 14+, modern Android)? Especially for any bottom-fixed navigation or floating action buttons.
- Is `touch-action` properly configured on interactive elements?
- Is `-webkit-tap-highlight-color` handled globally?
- Does the root layout set proper `overflow-x: hidden` on the body/html to prevent horizontal scroll?
- Is `scroll-behavior: smooth` set? Does it respect `prefers-reduced-motion`?
- Is `user-scalable=no` used anywhere? (It should NOT be — this is an accessibility violation)

### 1.2 — Layout Architecture (Every Route)

For EACH page/layout in the `app/` directory:
- Does the layout use a responsive navigation strategy (sidebar on desktop → bottom nav or hamburger drawer on mobile)?
- Is the mobile navigation implemented as a proper Sheet/Drawer (not just a `hidden` div with no animation or focus trapping)?
- Are there any `fixed` or `absolute` positioned elements that overlap content on small screens?
- Do any layouts use `flex` or `grid` without responsive breakpoints (`flex-col` on mobile → `md:flex-row`)?
- Are there hardcoded `width` or `height` values in pixels that should be responsive?
- Does the main content area have proper padding that accounts for mobile edge-to-edge design AND safe areas?
- Is there any horizontal overflow on any page at **320px**, **375px**, or **428px** widths?
- Are sidebar layouts collapsing properly, or do they push main content off-screen?
- For two-column or multi-panel layouts: do they stack vertically on mobile?
- Is the `min-h-screen` or `min-h-dvh` pattern used correctly for full-height layouts?

### 1.3 — shadcn/ui Component Responsiveness

Audit every shadcn/ui component usage for mobile behavior:

- **Dialog/Modal:** Does it become a full-screen `Drawer` (via Vaul) on mobile? Or does it render as a tiny centered box? *This is the #1 most common shadcn/ui mobile failure.* If Vaul/Drawer is not installed, flag this as critical and recommend the responsive dialog pattern.
- **DropdownMenu:** Does it work with touch? Is the hit target ≥ 44px? Does it position correctly near screen edges?
- **Table:** Are data tables horizontally scrollable on mobile, or do they overflow/break the layout? Consider card-based layouts for mobile.
- **Popover:** Does it reposition correctly on small screens? Does it obscure critical content?
- **Tabs:** Do tab bars scroll horizontally when there are too many tabs, or do they wrap awkwardly/overflow?
- **Sheet:** Is it used for mobile navigation? Does it have proper swipe-to-dismiss? Is it anchored from the correct side for RTL?
- **Command (cmdk):** Is the command palette usable on mobile? Proper virtual keyboard handling?
- **Calendar/DatePicker:** Is it usable on mobile? Touch-friendly date cells ≥ 44px? Does it handle Arabic/Hijri dates if applicable?
- **Form inputs:** Do inputs have proper `inputMode`, `autoComplete`, and `type` attributes for optimal mobile keyboards?
- **Select:** Does it use the native `<select>` on mobile for better UX, or the custom Radix dropdown that's harder to use on touch?
- **Toast/Sonner:** Are notifications positioned correctly on mobile? Not obscured by safe areas or bottom navigation?
- **Tooltip:** Tooltips are hover-only by default — are they inaccessible on touch? Do they need to be converted to Popover or removed on mobile?
- **ScrollArea:** Is custom scroll behavior interfering with native mobile scrolling momentum?

### 1.4 — Typography & Readability on Mobile

- Is the base font size at least **16px**? (Prevents iOS zoom-on-focus for inputs)
- Are line lengths constrained with `max-w-prose` or similar?
- Is there a responsive type scale (`text-sm md:text-base`, `text-2xl md:text-4xl`)?
- Are Arabic fonts loading properly on mobile? What's the performance impact (font file sizes)?
- Are heading sizes responsive?
- Is text truncation handled properly? **Arabic text truncation is especially fragile** — does `truncate` break words at incorrect positions? Are `line-clamp` utilities used where appropriate?
- Is `text-wrap: balance` or `text-wrap: pretty` used for headings to avoid orphaned words?
- Are `dir="auto"` attributes used on user-generated content fields that may contain mixed LTR/RTL text?

### 1.5 — Touch Interaction & Gesture Support

- Are **ALL** interactive elements at least **44×44px** touch targets? (WCAG 2.5.8)
- Are hover-only interactions inaccessible on touch? (Tooltips, hover cards, hover-revealed menus, hover-to-preview)
- Is there visual touch feedback? (`active:` states, not just `hover:` states)
- Are there any `:hover` styles that get "stuck" on mobile after tapping? (Use `@media (hover: hover)` to scope hover styles)
- Are swipe gestures implemented where natural? (e.g., swipe between calendar views, swipe to delete a scheduled post)
- Are drag-and-drop features accessible on touch? (Need touch-friendly alternatives like long-press-to-reorder)
- Is there any 300ms tap delay? (Should not be an issue with modern browsers, but verify no `touch-delay` is introduced)
- For RTL: are swipe gesture directions correctly mirrored? (Swipe-to-go-back should be from right edge in RTL)

### 1.6 — Dynamic Viewport Behavior

- **Virtual keyboard handling:** When an input is focused on mobile, does the layout adjust? Do `fixed`-position elements (bottom nav, floating buttons) move above the keyboard or get hidden behind it? Is `visualViewport` API used if needed?
- **Orientation changes:** Does the layout reflow correctly between portrait and landscape?
- **Dynamic URL bar:** On iOS Safari and Chrome Android, the URL bar collapses on scroll. Are `100vh` usages causing content to be cut off? (Must use `100dvh` or `min-h-dvh`)
- **Pull-to-refresh:** Is native pull-to-refresh handled or disabled where it conflicts with custom scroll behavior?
- **Pinch-to-zoom:** Is it preserved for accessibility? Verify `user-scalable=no` is NOT set.
- **Resize observer:** For components that need to know their own dimensions, is `ResizeObserver` used instead of window resize events?

### 1.7 — Mobile-Specific Feature Flows

Trace each critical user flow on a simulated **375px wide** screen:

1. **Sign Up / Login:**
   - Form usability on mobile? Proper keyboard types (`type="email"`, `type="password"`, `inputMode="email"`)?
   - OAuth redirect flow smooth on mobile browsers? (Popups often fail on mobile — must use redirects)
   - Error messages visible without scrolling?
   - Password visibility toggle touch-friendly?
   - "Forgot password" link easily tappable?

2. **Connect Social Account:**
   - OAuth popup vs redirect behavior on mobile? Popup blockers?
   - Account status cards/management on small screen — do they stack?
   - Connection error states visible and actionable on mobile?

3. **Content Creation / Editor:**
   - Is the post editor usable on mobile? Text area auto-resizing?
   - AI content generation UI on mobile — is the prompt input accessible when the keyboard is open?
   - Image upload via camera/gallery? Does the file picker show camera option? (`accept="image/*" capture="environment"`)
   - Platform preview cards on mobile (X/LinkedIn/Instagram mockups) — do they fit?
   - Character count, hashtag suggestions visible on mobile without obscuring the editor?
   - Media attachment previews — proper sizing on small screens?

4. **Scheduling / Calendar:**
   - Calendar view on mobile — is month view readable at 375px? Day/week view usable?
   - Time picker usable on mobile? Consider native `<input type="time">` on mobile.
   - Timezone selector — dropdown usable on mobile?
   - Drag-to-reschedule on touch: is there a touch-friendly alternative (long-press menu)?
   - Scheduled post list view on mobile — cards not truncated, actions accessible?

5. **Analytics Dashboard:**
   - Charts/graphs responsive? Not overflowing? Legends readable?
   - Data density appropriate for mobile (not cramped, consider simplifying on small screens)?
   - Date range picker on mobile?
   - Can users scroll through analytics without accidentally triggering chart interactions?

6. **Settings / Billing:**
   - Settings navigation on mobile — sidebar → vertical stacked nav?
   - Settings forms usable on mobile?
   - Plan comparison table on mobile — horizontal scroll or transform to card layout?
   - Any Stripe checkout integration — does the embedded form work on mobile?

7. **AI Chat / Assistant:**
   - Chat interface on mobile? Input bar fixed at bottom above keyboard?
   - AI response streaming display on mobile — no overflow?
   - Image generation preview on mobile — sized appropriately?
   - Chat history scrollable with new messages auto-scrolling into view?

### 1.8 — Performance on Mobile Devices

- Are images optimized with `next/image` with proper `sizes` attribute for responsive loading?
- Is there excessive client-side JavaScript impacting mobile CPUs?
- Are heavy components (calendar, rich editor, charts) lazy-loaded with `dynamic()` or `React.lazy()`?
- Are animations performant on mobile? Using `transform` and `opacity` only (GPU-composited), not animating `width`/`height`/`top`/`left`?
- Is `content-visibility: auto` used for long scrollable lists?
- Are fonts subset for Arabic character ranges to reduce download size?
- Is there unnecessary re-rendering on mobile interactions (check for missing `memo`, `useMemo`, `useCallback` where appropriate)?
- Are API calls deduplicated / batched appropriately for slow mobile connections?

### 1.9 — Accessibility on Mobile

- **Screen reader compatibility:** Are all interactive elements announced correctly for VoiceOver (iOS) and TalkBack (Android)?
- **Focus management:** When a Sheet/Drawer/Dialog opens, does focus move into it? Is focus trapped? On close, does focus return to the trigger?
- **Reduced motion:** Is `prefers-reduced-motion` respected for ALL animations and transitions?
- **ARIA live regions:** Are toast notifications, loading states, and real-time updates announced?
- **Semantic HTML:** Are interactive elements proper `<button>` and `<a>` tags, not `<div onClick>`?
- **Skip links:** Is there a "Skip to main content" link?
- **Form labels:** Are all form inputs properly labeled with `<label>` (not just `placeholder` text)?
- **Error announcements:** Are form validation errors announced to screen readers with `aria-describedby` or `aria-errormessage`?
- **Color independence:** Is information conveyed by more than just color? (icons, text labels, patterns)
- **Focus visible:** Is `:focus-visible` styled for keyboard navigation? Not suppressed?
- **Heading hierarchy:** Is heading structure logical (`h1` → `h2` → `h3`) on every page?
- **Language attribute:** Is `lang="ar"` (or appropriate) set on the `<html>` element? Does it change with locale?
- **Image alt text:** Do all meaningful images have descriptive `alt` text?

### 1.10 — RTL-Specific Mobile Issues

- Are CSS logical properties used consistently (`ps-*`, `pe-*`, `ms-*`, `me-*`, `start-*`, `end-*`) instead of physical properties (`pl-*`, `pr-*`, `ml-*`, `mr-*`, `left-*`, `right-*`)?
- Do icons that imply direction (arrows, chevrons, back buttons) flip correctly in RTL?
- Are progress bars, sliders, and range inputs correctly reversed in RTL?
- Is text alignment correct? (`text-start` not `text-left`)
- Do horizontal scroll containers scroll from the correct starting position in RTL?
- Are animations direction-aware? (Slide-in from the correct side in RTL)
- Do form inputs with icons (search, email) position the icon correctly in RTL?
- Is bidirectional text (Arabic + English mixed) handled in input fields and display?

---

## PHASE 2: IMPLEMENTATION PLAN

After completing the audit, create a comprehensive, step-by-step
implementation plan and **save it as:**

**`docs/features/mobile-responsiveness-implementation-plan.md`**

The plan document MUST follow this exact structure:

```markdown
# Mobile Responsiveness & Dynamic UI — Implementation Plan

> Generated: [current date]
> Estimated Total Effort: [X days]
> Priority: Critical — Mobile-primary user base in MENA region

## Executive Summary
[3-4 paragraphs: current state assessment, critical gaps found,
remediation strategy, expected outcome after implementation]

## Guiding Principles
- Mobile-first: all CSS starts at mobile and scales up with `md:` and `lg:`
- RTL-native: every change uses CSS logical properties and works in both directions
- Dark mode compatible: every change tested in both light and dark themes
- Progressive enhancement: core functionality works on all devices, enhanced on capable ones
- Performance budget: no mobile page > [X]kb JS, LCP < 2.5s on 4G
- No regressions: all changes verified against existing functionality

## Phase 1: Foundation & Critical Fixes (Days 1–3)
### Priority: CRITICAL — Fix what's broken now

#### Task 1.1: [Title]
- **Files to modify:** [exact file paths]
- **What to do:** [step-by-step with complete code snippets]
- **RTL consideration:** [how this change works in RTL]
- **Dark mode consideration:** [how this change works in dark mode]
- **Testing:** [specific screen sizes, devices, and verification steps]
- **Estimated effort:** [hours]

[Continue for all Phase 1 tasks...]

## Phase 2: Component-Level Responsive Overhaul (Days 4–8)
### Priority: HIGH — Systematic component fixes
[Same task format...]

## Phase 3: User Flow Optimization (Days 9–12)
### Priority: HIGH — End-to-end mobile experience
[Same task format...]

## Phase 4: Dynamic Behavior & Advanced Mobile UX (Days 13–15)
### Priority: MEDIUM — Polish and delight
[Same task format...]

## Phase 5: Accessibility Hardening (Days 16–18)
### Priority: HIGH — Compliance and inclusion
[Same task format...]

## Phase 6: Performance Optimization (Days 19–20)
### Priority: MEDIUM — Speed on mobile networks
[Same task format...]

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
- [ ] All touch targets ≥ 44px
- [ ] All text readable without zoom (≥ 16px base)
- [ ] Forms usable with virtual keyboard open
- [ ] Dark mode + RTL combination works
- [ ] Light mode + RTL combination works
- [ ] Dark mode + LTR combination works
- [ ] VoiceOver basic navigation works
- [ ] TalkBack basic navigation works
- [ ] No layout shift during loading (CLS < 0.1)
- [ ] Virtual keyboard doesn't obscure active input
- [ ] Bottom navigation avoids safe area overlap
- [ ] Orientation change doesn't break layout

### Browser Testing
- iOS Safari (latest + latest-1)
- Chrome Android (latest + latest-1)
- Samsung Internet Browser (significant MENA market share)
- Huawei Browser (notable in some MENA markets)
- Chrome Desktop responsive mode (for development)

## Responsive Breakpoint System
[Document the Tailwind breakpoints and what layout changes happen at each]

## Files Modified (Summary)
[Complete list grouped by phase]

## Dependencies & New Packages
[Any new packages needed, with justification and bundle size impact]

## Risks & Mitigations
[Potential issues: RTL regressions, dark mode breakage, performance impact, etc.]
```

---

## PHASE 3: IMPLEMENT CRITICAL FIXES

After generating the plan, **IMMEDIATELY implement all Phase 1 (Critical) fixes** from the plan. For each fix:

1. **Modify the actual files** in the repository — do not just suggest changes
2. Use mobile-first Tailwind classes (base = mobile, `md:` = tablet, `lg:` = desktop)
3. Use CSS logical properties for RTL compatibility (`ps-4` not `pl-4`, `ms-2` not `ml-2`)
4. Verify that dark mode classes are not broken by the changes
5. Add brief code comments only where the responsive logic is non-obvious
6. **Do not remove or alter any existing functionality** — only add responsive behavior

After implementing, output a summary:
- List of every file modified with a 1-line description of what changed
- Any files that were created (e.g., new responsive utility components)
- Known items that could not be auto-fixed and need manual testing

---

## Output Expectations

| Phase | Deliverable |
|-------|-------------|
| Step 0 | Brief repository structure summary |
| Phase 1 | Complete audit findings organized by sections 1.1–1.10, using the exact format specified |
| Phase 2 | Full implementation plan saved to `docs/features/mobile-responsiveness-implementation-plan.md` |
| Phase 3 | All critical fixes implemented in the codebase + summary of changes |

**Be specific throughout** — reference actual file paths, component names, line
numbers, and Tailwind classes found in the code. Do not give generic responsive
design advice. Every finding and fix must be grounded in what exists in this
repository.

When suggesting or implementing code changes, provide **complete component
code** — not fragments. Show the full `return` statement of a component if the
JSX structure changes, so it can be pasted directly.