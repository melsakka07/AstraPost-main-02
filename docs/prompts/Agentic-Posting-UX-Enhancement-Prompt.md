# Prompt: Agentic Posting — UI/UX Audit & Enhancement

> **Objective:** Read every frontend file in the Agentic Posting feature, assess the UI/UX quality against a detailed visual specification, and apply concrete enhancements to make the experience feel polished, premium, and delightful. This feature is gated behind Pro/Agency plans — it must look and feel like a flagship product capability, not a prototype.

---

## Instructions

You are performing a **UI/UX quality pass** on the Agentic Posting feature in AstraPost. This is not a functional audit — the feature works. Your job is to make it **beautiful, fluid, and confidence-inspiring**.

**Approach:**
1. Read every component file in the Agentic Posting feature
2. Compare what exists against the detailed visual specification below
3. Apply enhancements directly — modify the actual code
4. After each enhancement, run `pnpm lint && pnpm typecheck` to verify
5. Do NOT change functional logic, API calls, state management, or data flow — only visual presentation, layout, spacing, animation, transitions, and interaction feedback

**Design system constraints — you MUST work within these:**
- **Tailwind CSS 4** — all styling via utility classes, no custom CSS files
- **shadcn/ui** — use existing primitives (Card, Button, Badge, Tooltip, Alert, Separator, Skeleton, Tabs, ToggleGroup, etc.)
- **shadcn/ui color tokens** — `bg-background`, `text-foreground`, `bg-muted`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground`, `bg-destructive`, `border`, `ring`, `accent` — never hardcode colors
- **Dark mode** — every element must look correct in both light and dark themes
- **lucide-react** — all icons from this library
- **No new packages** — everything needed is already installed (framer-motion is NOT available; use CSS transitions and Tailwind's `transition-*` / `animate-*` utilities)

---

## Step 1: Read All Agentic Posting Files

Before making any changes, read these files to understand what exists:

```
src/app/dashboard/ai/agentic/page.tsx
src/components/ai/agentic-posting-client.tsx
```

Also check for any sub-components that may have been created:
```
src/components/ai/agentic-*.tsx
src/components/ai/agentic/
```

Read the main sidebar file to see how the entry was added:
```
src/components/dashboard/sidebar.tsx
```

Read the existing composer tweet card for design reference (the review screen should match its visual language):
```
src/components/composer/tweet-card.tsx
```

After reading all files, proceed with the enhancements below. Apply each section's changes, then move to the next.

---

## Step 2: Screen 1 — Topic Input (The "Hero" Screen)

This screen is the user's first impression of the feature. It must feel premium and focused — a clean, confident surface that says "give me a topic and I'll handle everything."

### 2A: Layout & Spatial Composition

The input area should be **vertically centered** on the page (or near-center with a slight upward bias), not top-aligned. This follows the search-engine-home-page pattern (Google, ChatGPT, Perplexity) where the primary input commands the center of the viewport.

```
Verify and apply:
- The container uses flexbox centering: `flex flex-col items-center justify-center min-h-[60vh]`
  or equivalent vertical centering that pushes the input toward the middle of the page
- Maximum width constraint on the input area: `max-w-2xl w-full mx-auto`
- Generous padding around the input area: `px-6` on mobile, `px-0` on desktop (the max-w handles containment)
```

### 2B: Headline Typography

The headline must feel distinctive — not like a generic page title.

```
Verify and apply:
- The headline text (e.g., "What should we post about?") uses:
  `text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-center`
- Below it, a subline:
  `text-base sm:text-lg text-muted-foreground text-center mt-3 max-w-lg mx-auto`
  Content like: "AI will research, write, and create visuals — ready in seconds."
- Spacing between headline and input: `mt-8 sm:mt-10`
```

### 2C: Topic Input Field

The input field must feel spacious and inviting — not like a standard form input.

```
Verify and apply:
- The input uses generous sizing:
  `w-full rounded-xl border border-border bg-background px-5 py-4 text-lg
   placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2
   focus:ring-ring focus:border-transparent shadow-sm
   transition-shadow duration-200 focus:shadow-md`
- NOT a small, cramped input with default styling
- The placeholder text is visible but subtle (the /60 opacity)
- On focus, the input gains a subtle ring AND a shadow lift (focus:shadow-md)
- The border-radius is `rounded-xl` (not rounded-md or rounded-lg) — this is a hero input, not a form field
```

### 2D: Suggestion Chips

Chips should feel tappable and lightweight — like conversation starters, not buttons.

```
Verify and apply:
- Chips are wrapped in a flex container:
  `flex flex-wrap items-center justify-center gap-2 mt-5`
- Each chip uses:
  `inline-flex items-center rounded-full border border-border bg-muted/50 px-4 py-2
   text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground
   cursor-pointer transition-colors duration-150 select-none`
- Chips have a subtle hover state (bg-accent) but no heavy shadows or 3D effects
- Tapping a chip fills the input AND starts generation (the chip click handler should do both)
```

### 2E: Generate Button

The Generate button is the primary CTA. It must feel confident and alive.

```
Verify and apply:
- The button uses the primary variant with extra sizing:
  `h-12 px-8 text-base font-medium rounded-xl`
  (wider and taller than a standard button — this is a hero CTA)
- The Sparkles (or Wand2) icon sits before the label: `<Sparkles className="mr-2 h-5 w-5" />`
- Disabled state when input is empty: `disabled:opacity-50 disabled:cursor-not-allowed`
- An active/pressed state: `active:scale-[0.98]` for tactile feedback
- The button should be centered: `mx-auto` or within a flex center container
- Spacing from input: `mt-6`
```

### 2F: Advanced Options Disclosure

The advanced section must feel truly optional — invisible until wanted.

```
Verify and apply:
- The toggle trigger is a subtle text link, not a button:
  `text-sm text-muted-foreground hover:text-foreground cursor-pointer
   inline-flex items-center gap-1.5 mt-6 transition-colors`
- The ChevronDown icon rotates when open:
  `transition-transform duration-200` with a conditional `rotate-180`
- The collapsed content uses smooth height animation:
  `overflow-hidden transition-all duration-300` with conditional `max-h-0` / `max-h-[300px]` or similar
  (Since framer-motion is not available, use CSS max-height transition)
- When expanded, the options sit inside a:
  `mt-4 p-5 rounded-xl border border-border bg-muted/30 space-y-4`
  card — visually contained and separated from the main input area
- Options use shadcn/ui `Select` for dropdowns, `Switch` for toggles — not custom controls
```

### 2G: Account Selector (Bottom)

The account badge is secondary context — present but not demanding attention.

```
Verify and apply:
- Positioned below the Generate button with generous spacing: `mt-8`
- Styled as a compact, centered badge:
  `inline-flex items-center gap-2 rounded-full border border-border bg-muted/30
   px-4 py-2 text-sm text-muted-foreground mx-auto`
- Shows: small avatar (20×20 rounded-full), @username text, XSubscriptionBadge
- If tappable (multi-account), add: `hover:bg-accent cursor-pointer transition-colors`
```

---

## Step 3: Screen 2 — Processing (The "Trust Builder")

This screen must feel alive and informative without demanding interaction. The user watches the AI work — it should feel like watching a skilled team execute, not staring at a loading bar.

### 3A: Compact Topic Header

```
Verify and apply:
- The topic text pins to the top of the processing area:
  `flex items-center justify-between py-3 px-4 border-b border-border`
- Topic shown as: `text-sm font-medium text-foreground truncate`
- Cancel link: `text-sm text-muted-foreground hover:text-destructive transition-colors cursor-pointer`
  (subtle, not alarming — "Cancel" text only, no icon, no red by default)
```

### 3B: Timeline Steps — Visual Design

Each step must feel like a distinct card that transitions through states.

```
Verify and apply each step item:

Container:
  `space-y-1` between steps (tight vertical rhythm)

Each step wrapper:
  `flex items-start gap-3 p-4 rounded-lg transition-colors duration-300`
  With conditional backgrounds:
  - Completed: `bg-muted/30`
  - In progress: `bg-primary/5 border border-primary/20` (subtle highlight)
  - Pending: `opacity-50`

Status icon column (left):
  - Completed: `<CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />`
    (use the app's primary color, NOT hardcoded green)
  - In progress: a pulsing dot or animated icon:
    `<Loader2 className="h-5 w-5 text-primary mt-0.5 shrink-0 animate-spin" />`
  - Pending: `<Circle className="h-5 w-5 text-muted-foreground/30 mt-0.5 shrink-0" />`
  - Failed: `<XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />`

Text column (right):
  - Step name: `text-sm font-medium text-foreground`
  - Summary line (after completion):
    `text-xs text-muted-foreground mt-0.5 leading-relaxed`
    Limit to 1-2 lines. Truncate if needed.
  - Time badge (after completion):
    `text-xs text-muted-foreground/60 ml-auto shrink-0`
    e.g., "3s" — right-aligned
```

### 3C: Progress Indicator for Writing Step

The writing step is the longest AI call. It needs a sub-progress indicator.

```
Verify and apply:
- When the writing step is in progress and streaming tweet-by-tweet, show a thin progress bar
  inside the step card:
  `<div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
    <div
      className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
      style={{ width: `${(completedTweets / totalTweets) * 100}%` }}
    />
  </div>`
- Below the bar, a muted label: `text-xs text-muted-foreground mt-1`
  e.g., "Writing tweet 3 of 5..."
```

### 3D: Image Generation Step — Per-Image Progress

Images generate in parallel and each has its own duration. Show individual image progress.

```
Verify and apply:
- When the images step is active, show small image slot indicators:
  `<div className="flex items-center gap-2 mt-2">`
  Each slot is a small circle:
  - Pending: `h-2.5 w-2.5 rounded-full bg-muted-foreground/20`
  - Generating: `h-2.5 w-2.5 rounded-full bg-primary animate-pulse`
  - Complete: `h-2.5 w-2.5 rounded-full bg-primary`
  - Failed: `h-2.5 w-2.5 rounded-full bg-destructive`
  `</div>`
- Below the dots: `text-xs text-muted-foreground mt-1` e.g., "2 of 3 images generated"
```

### 3E: Estimated Time

```
Verify and apply:
- Below the timeline, a muted estimate line:
  `text-xs text-muted-foreground text-center mt-6`
  e.g., "~25 seconds remaining"
- This should update as steps complete (recalculate based on elapsed vs average step times)
- If the estimate can't be computed, show: "Almost there..." for the final steps
```

### 3F: Transition to Review Screen

```
Verify and apply:
- When the final step completes, there should be a brief pause (~500ms) before transitioning
  to the review screen — this gives the user a moment to see the final ✅
- The transition should use: `transition-opacity duration-500`
  The processing screen fades out, the review screen fades in
- If there's no transition at all (hard cut), add one using conditional rendering
  with an opacity state variable
```

---

## Step 4: Screen 3 — Review & Approval (The "Decision" Screen)

This is where the user decides to ship. The content must look as close to how it will appear on X as possible — building visual confidence.

### 4A: Review Header

```
Verify and apply:
- A clean header area with the thread summary and quality indicator:
  `flex items-start justify-between py-4`
- Left side: Summary headline in `text-lg font-semibold text-foreground`
  and the topic in `text-sm text-muted-foreground mt-0.5`
- Right side: Quality score as a compact badge:
  `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium`
  Color based on score:
  - 8-10: `bg-primary/10 text-primary`
  - 5-7: `bg-yellow-500/10 text-yellow-600 dark:text-yellow-400`
  - 1-4: `bg-destructive/10 text-destructive`
  With a star icon: `<Star className="h-3.5 w-3.5" />`
  e.g., "★ 8/10"
```

### 4B: Tweet Cards — The Core Visual Element

Each card must look like a miniature X/Twitter post. This is where most visual quality lives.

```
Verify and apply each tweet card:

Card container:
  `group relative rounded-xl border border-border bg-card p-5
   transition-all duration-200 hover:shadow-sm hover:border-border/80`
  (subtle lift on hover to indicate interactivity)

Card header row:
  `flex items-center justify-between mb-3`
  Left: position badge `text-xs font-mono text-muted-foreground bg-muted/50 rounded-full px-2.5 py-0.5`
        e.g., "1/5"
        + account handle `text-sm text-muted-foreground ml-2` with XSubscriptionBadge
  Right: character count — styled contextually:
        Under limit: `text-xs text-muted-foreground`
        Near limit (90%+): `text-xs text-yellow-600 dark:text-yellow-400`
        Over limit: `text-xs text-destructive font-medium`

Tweet text:
  `text-[15px] leading-relaxed text-foreground whitespace-pre-wrap`
  (15px matches X's actual tweet font size — not 14, not 16)
  Hashtags within the text highlighted:
  `text-primary font-medium` (don't link them, just color them)

Image area (if present):
  `mt-4 rounded-lg overflow-hidden border border-border`
  Image: `w-full h-auto object-cover max-h-[300px]`
  If image failed: a placeholder area:
  `flex items-center justify-center h-40 bg-muted/30 rounded-lg border border-dashed border-border`
  With: `<ImageOff className="h-6 w-6 text-muted-foreground/40" />`
  And: `text-xs text-muted-foreground mt-2` "Image unavailable"
  With: `<Button variant="ghost" size="sm">Retry</Button>`

Per-tweet action row:
  `flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100
   transition-opacity duration-200`
  (INVISIBLE by default, visible on card hover — reduces visual clutter)
  Each action is a ghost/icon button:
  `<Button variant="ghost" size="sm" className="h-8 px-2.5 text-muted-foreground hover:text-foreground">`
  With icons at `h-3.5 w-3.5` and short labels: "Edit", "Rewrite", "New Image", "Remove"
```

### 4C: Thread Connector Line

Between tweet cards, a visual connector line mimics X's thread UI.

```
Verify and apply:
- Between each card, a thin vertical line centered horizontally:
  `<div className="flex justify-center py-0">
    <div className="h-6 w-px bg-border" />
  </div>`
- This creates a visual thread connection without taking up meaningful space
- The line should NOT appear after the last tweet card
```

### 4D: Inline Editing Mode

When the user clicks "Edit" on a tweet, the card transitions to edit mode.

```
Verify and apply:
- The text area replaces the static text (same card, no modal):
  `<textarea
    className="w-full resize-none rounded-lg border border-border bg-background
     p-3 text-[15px] leading-relaxed text-foreground
     focus:outline-none focus:ring-2 focus:ring-ring
     min-h-[100px]"
    autoFocus
  />`
- Character counter updates in real-time during editing
- Two small action buttons appear below the textarea:
  `<Button variant="default" size="sm">Save</Button>`
  `<Button variant="ghost" size="sm">Cancel</Button>`
- Escape key cancels editing (add onKeyDown handler)
```

### 4E: Add Tweet Button

```
Verify and apply:
- Styled as a dashed-border area at the end of the thread:
  `<button className="w-full rounded-xl border-2 border-dashed border-border/60
   py-4 text-sm text-muted-foreground hover:border-border hover:text-foreground
   hover:bg-muted/30 transition-all duration-200 cursor-pointer
   flex items-center justify-center gap-2">
    <Plus className="h-4 w-4" /> Add tweet to thread
  </button>`
- This follows the established "add item" pattern used in other parts of the app
```

### 4F: Research Insights Panel

```
Verify and apply:
- Styled as a collapsible card below the thread:
  `<div className="mt-6 rounded-xl border border-border overflow-hidden">`
- Trigger header:
  `<button className="w-full flex items-center justify-between p-4 text-sm
   font-medium text-muted-foreground hover:text-foreground transition-colors">
    <span className="flex items-center gap-2">
      <Lightbulb className="h-4 w-4" /> Research Insights
    </span>
    <ChevronDown className="h-4 w-4 transition-transform duration-200" />
  </button>`
- Expanded content: `p-4 pt-0 space-y-3 border-t border-border`
- Inside: angles as small cards, hashtags as chips, key facts as a bulleted list
- Collapsed by default — the user sees the trigger but not the content
```

### 4G: Action Bar (Sticky Footer)

The action bar is the final decision point. It must be clear, stable, and always accessible.

```
Verify and apply:
- Sticky at the bottom of the viewport on scroll:
  `sticky bottom-0 z-10 border-t border-border bg-background/80 backdrop-blur-sm
   py-4 px-4 sm:px-6 mt-8 -mx-4 sm:-mx-6`
  The backdrop blur creates a frosted-glass effect that lets content scroll behind it.

- Layout: primary actions left, secondary actions right:
  `flex items-center justify-between flex-wrap gap-3`

- Post Now button — primary, prominent:
  `<Button className="h-11 px-6 text-base font-medium rounded-xl gap-2">
    <Sparkles className="h-4 w-4" /> Post Now
  </Button>`

- Schedule button — secondary, outlined:
  `<Button variant="outline" className="h-11 px-6 text-base rounded-xl gap-2">
    <CalendarClock className="h-4 w-4" /> Schedule
  </Button>`

- Save Draft — tertiary:
  `<Button variant="ghost" size="sm" className="text-muted-foreground">
    Save as Draft
  </Button>`

- Discard — minimal, dangerous:
  `<Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
    Discard
  </Button>`

- On mobile, the bar uses a stacked layout:
  `flex-col sm:flex-row` with primary buttons full-width on mobile
```

### 4H: Schedule Inline Date Picker

When the user clicks "Schedule," a date/time picker appears inline — NOT a modal.

```
Verify and apply:
- The picker slides in below the action bar (or expands the bar):
  `overflow-hidden transition-all duration-300`
  with conditional `max-h-0` / `max-h-[400px]`
- Uses the existing `DatePicker` from react-day-picker v9 wrapped in shadcn/ui styling
- Time picker: a simple `Select` dropdown with 30-min increments (or the existing time selection pattern)
- Best-time suggestions (if available from analytics): displayed as small chips
  `text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1`
  e.g., "Best: Mon 9:00 AM" — tappable to auto-select
- After selection, the Schedule button label updates:
  `"Schedule for Apr 10, 9:00 AM"` — and becomes the primary action
```

### 4I: Success State

After the user posts or schedules, the review screen should transform — not navigate away.

```
Verify and apply:
- The tweet cards and action bar fade out, replaced by a centered success area:
  `flex flex-col items-center justify-center py-16 text-center`
- A large check icon:
  `<CheckCircle2 className="h-16 w-16 text-primary mb-4" />`
- Success headline:
  `text-2xl font-bold text-foreground`
  "Thread posted!" or "Scheduled for Apr 10, 9:00 AM"
- Quick action links below:
  `flex items-center gap-3 mt-6`
  Three ghost buttons: "Create Another", "View in Queue", "Go to Calendar"
- This state should feel celebratory but brief — the user should naturally want to click
  "Create Another" or navigate away
```

---

## Step 5: Cross-Cutting Enhancements

### 5A: Screen Transitions

All three screen transitions must be smooth, not hard cuts.

```
Verify and apply:
- Use an opacity + translateY transition between screens:
  Outgoing screen: `opacity-0 translate-y-2` (fade out + slide up slightly)
  Incoming screen: `opacity-100 translate-y-0` (fade in from below)
  Duration: `transition-all duration-300 ease-out`
- If the current implementation uses hard conditional rendering (`{screen === "input" && ...}`),
  wrap each screen in a div with transition classes and add a brief delay between unmounting
  old screen and mounting new screen (use a small setTimeout or a state flag)
```

### 5B: Loading States for Async Actions

Every button that triggers an API call must show a loading state.

```
Verify and apply:
- Generate button: when clicked, shows `<Loader2 className="h-5 w-5 animate-spin mr-2" />`
  and text changes to "Generating..." — button is disabled during this time
- Post Now button: when clicked, shows spinner and "Posting..."
- Schedule button: shows "Scheduling..."
- Rewrite (per-tweet): the specific tweet card shows a shimmer skeleton over the text area
  while regenerating. Use shadcn/ui `<Skeleton className="h-4 w-full rounded" />` stacked 3-4 times
- Never leave a button looking active while an API call is in flight
```

### 5C: Empty States

If the user has no connected X accounts or their plan doesn't support agentic posting.

```
Verify and apply:
- No X account connected: centered empty state with:
  `<div className="flex flex-col items-center justify-center py-20 text-center">`
  Icon: `<TwitterIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />` (or X logo)
  Headline: "Connect your X account to get started"
  Subline: muted text explaining the feature
  CTA: `<Button>Connect X Account</Button>` linking to settings
- Plan gate (Free users): Use the existing upgrade modal or blurred overlay pattern
  (check `src/components/ui/upgrade-modal.tsx` or `blurred-overlay.tsx`)
  with messaging about Agentic Posting being a Pro/Agency feature
```

### 5D: Toast Notifications

All user actions should produce feedback via sonner toasts.

```
Verify and apply:
- Post success: `toast.success("Thread posted! 🎉", { description: "View it on X →", action: { label: "Open", onClick: () => window.open(url) } })`
- Schedule success: `toast.success("Scheduled!", { description: "Apr 10 at 9:00 AM" })`
- Draft saved: `toast("Saved as draft", { description: "Open it anytime from Drafts" })`
- Discard: `toast("Thread discarded")`
- Regenerate complete: `toast("Tweet rewritten")`
- Error: `toast.error("Something went wrong", { description: error.message })`
- Import: `import { toast } from "sonner"` (already in the project)
```

### 5E: Responsive Design Audit

```
Verify and apply:
- Screen 1 input: `max-w-2xl` on desktop, full-width with `px-4` on mobile
- Screen 2 timeline: full-width on all screens (single column works everywhere)
- Screen 3 tweet cards: full-width on mobile, `max-w-3xl mx-auto` on desktop
  to prevent cards from stretching too wide on large screens
- Action bar: `flex-col sm:flex-row` — buttons stack vertically on mobile
- Suggestion chips: `flex-wrap` — wrap to multiple lines on narrow screens
- Advanced options: single column on all screens (no side-by-side on mobile)
- Tweet card actions: visible by default on mobile (no hover state on touch devices)
  Add: `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`
```

### 5F: Dark Mode Verification

```
Verify and apply — search for ANY of these dark-mode-breaking patterns:
- `bg-white` → replace with `bg-background` or `bg-card`
- `bg-gray-*` → replace with `bg-muted` or `bg-muted/50`
- `text-black` → replace with `text-foreground`
- `text-gray-*` → replace with `text-muted-foreground`
- `border-gray-*` → replace with `border-border`
- `text-green-*` for success → replace with `text-primary` (or keep green but use `dark:text-green-400`)
- Hardcoded hex colors (`#ffffff`, `#000000`, etc.) → replace with token equivalents
- Hardcoded `shadow-*` without dark variants → verify shadows look correct in dark mode
  (generally `shadow-sm` is fine; `shadow-lg` with default color can be too visible in dark mode)
```

---

## Step 6: Final Visual Cohesion Pass

After applying all enhancements, do one final read-through of the entire client component.

**Check for:**
1. **Consistent border-radius** — all cards, inputs, buttons in this feature should use `rounded-xl` (matching the hero input). Don't mix `rounded-md`, `rounded-lg`, and `rounded-xl` within the feature.
2. **Consistent spacing scale** — use Tailwind's spacing scale consistently. Primary gaps: `gap-3` or `gap-4` between elements, `space-y-4` or `space-y-6` between sections. Don't alternate randomly.
3. **Consistent text sizing** — headline: `text-3xl sm:text-4xl`, section headers: `text-lg`, body text: `text-[15px]` (tweet content) or `text-sm` (UI labels), helper text: `text-xs`.
4. **No orphaned hover states** — every hover effect should have a corresponding `transition-*` (never a jarring instant color change).
5. **No layout shifts** — when elements appear/disappear (advanced options, edit mode, action row), ensure the layout doesn't jump. Use `min-h-*` constraints or smooth transitions.

---

## Deliverables

After completing all steps:

- [ ] All visual enhancements applied to the component files
- [ ] `pnpm lint && pnpm typecheck` passes with 0 errors
- [ ] Dark mode verified — no hardcoded colors remain
- [ ] Mobile responsive — no horizontal overflow, all elements accessible
- [ ] Every async button has a loading state
- [ ] Every user action produces a toast notification
- [ ] Screen transitions are smooth (not hard cuts)
- [ ] Tweet cards match the visual spec (15px text, hover actions, thread connector)
- [ ] Action bar is sticky with backdrop blur
- [ ] Success state exists after posting/scheduling

**Run `pnpm lint && pnpm typecheck` one final time to confirm everything compiles cleanly.**
