# Compose Page — Complete UX Audit

> **Date**: 2026-04-04 (Updated)
> **Source**: Direct code analysis (verified against current codebase)
> **Page URL**: `/dashboard/compose`
> **Auditor**: Claude (AI Assistant)
> **Total Lines Analyzed**: 4,627 across 11 component files

---

## Table of Contents

1. [Page Layout Overview](#1-page-layout-overview)
2. [Component Tree (Verified)](#2-component-tree-verified)
3. [Section A: Editor Column (Left 2/3)](#section-a-editor-column-left-23)
4. [Section B: Sidebar — Content Tools Card](#section-b-sidebar--content-tools-card)
5. [Section C: Sidebar — Publishing Card](#section-c-sidebar--publishing-card)
6. [Section D: Sidebar — Preview Carousel](#section-d-sidebar--preview-carousel)
7. [Section E: AI Panel (Desktop Inline / Mobile Sheet)](#section-e-ai-panel-desktop-inline--mobile-sheet)
8. [Section F: Dialogs & Overlays](#section-f-dialogs--overlays)
9. [Section G: Full User Journey Flows](#section-g-full-user-journey-flows)
10. [Section H: Character Limit Logic](#section-h-character-limit-logic)
11. [Section I: Post-Submission Behavior](#section-i-post-submission-behavior)
12. [Section J: State & Data Inventory](#section-j-state--data-inventory)
13. [Section K: Interactive Elements Catalogue](#section-k-interactive-elements-catalogue)
14. [Section L: UX Best Practice Cross-Reference](#section-l-ux-best-practice-cross-reference)
15. [Section M: API Routes Reference](#section-m-api-routes-reference)
16. [Section N: File Reference Index](#section-n-file-reference-index)
17. [Appendix: Accessibility Audit](#appendix-accessibility-audit)
18. [Appendix: Potential UX Issues (For Future Review)](#appendix-potential-ux-issues-for-future-review)

---

## 1. Page Layout Overview

### Grid Structure

```
┌─────────────────────────────────────────────────────────────┐
│  DASHBOARD PAGE WRAPPER                                       │
│  ┌───────────────────────────────────────────────────────────┐
│  │ Header: "Compose" + "Create and schedule your tweets..." │
│  └───────────────────────────────────────────────────────────┘
│  ┌───────────────────────────────┬─────────────────────────┐
│  │  EDITOR COLUMN (2/3 width)   │  SIDEBAR COLUMN (1/3)   │
│  │  ┌─────────────────────────┐  │  ┌─────────────────────┐│
│  │  │  Attribution Banners   │  │  │  Content Tools Card  ││
│  │  │  (W4: Inspiration)     │  │  │  - AI Writer         ││
│  │  │  (W5: Calendar Meta)   │  │  │  - Inspiration       ││
│  │  └─────────────────────────┘  │  │  - Templates         ││
│  │  ┌─────────────────────────┐  │  │  - Hook/CTA/Trans/   ││
│  │  │  Tweet Card 1          │  │  │    Hashtags         ││
│  │  │  [Textarea]            │  │  │  - Number Tweets    ││
│  │  │  [Media Preview]       │  │  │  - AI Image Dialog   ││
│  │  │  [Link Preview]        │  │  │  - Save Template     ││
│  │  │  [Hashtags Chips]      │  │  └─────────────────────┘│
│  │  │  [Footer Toolbar]      │  │  ┌─────────────────────┐│
│  │  └─────────────────────────┘  │  │  Publishing Card    ││
│  │  ┌─────────────────────────┐  │  │  - Account Select   ││
│  │  │  Tweet Card 2 (thread) │  │  │  - Date/Time Picker  ││
│  │  │  [Drag handle]         │  │  │  - Best Times        ││
│  │  │  [Up/Down - mobile]     │  │  │  - Recurrence       ││
│  │  └─────────────────────────┘  │  │  - Post to X        ││
│  │  ┌─────────────────────────┐  │  │  - Save as Draft    ││
│  │  │  Character Alerts      │  │  └─────────────────────┘│
│  │  │  Auto-save timestamp   │  │  ┌─────────────────────┐│
│  │  └─────────────────────────┘  │  │  Preview Carousel   ││
│  │  ┌─────────────────────────┐  │  │  - Viral Score       ││
│  │  │  "Add to Thread" button │  │  │  - X-style Preview   ││
│  │  └─────────────────────────┘  │  └─────────────────────┘│
│  └───────────────────────────────┴─────────────────────────┘
│  ┌───────────────────────────────────────────────────────────┐
│  │  OVERLAYS (Dialogs/Sheets)                                  │
│  │  - AI Image Dialog (F1)                                     │
│  │  - Save Template Dialog (F2)                                │
│  │  - Templates Browser Dialog (F3)                            │
│  │  - Overwrite Confirmation AlertDialog (F4)                  │
│  │  - Mobile AI Sheet (E)                                       │
│  └───────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

### Responsive Behavior

- **Desktop (≥768px)**: 2-column grid (2:1 ratio), drag-and-drop, inline AI panel
- **Mobile (<768px)**: Single column, up/down reorder buttons, AI in bottom Sheet

---

## 2. Component Tree (Verified)

```
src/app/dashboard/compose/page.tsx (20 lines, Server Component)
└── DashboardPageWrapper (icon=PenSquare, title="Compose")
    └── Suspense (fallback: Skeleton h-[600px])
        └── Composer (1,985 lines, Client Component)
            ├── Hidden file input (media upload, ref=fileInputRef)
            │
            ├── EDITOR COLUMN (lg:col-span-2)
            │   ├── W4: Attribution Banner (sourceAttribution state)
            │   │   ├── Dismiss Button (ghost/icon)
            │   │   └── Handle Link (external, target="_blank")
            │   ├── W5: Calendar Metadata Banner (calendarMeta state)
            │   │   └── Dismiss Button (ghost/icon)
            │   ├── DndContext (@dnd-kit/sortable, verticalListSortingStrategy)
            │   │   └── SortableContext (items=tweet IDs)
            │   │       └── SortableTweet ×N (69 lines, wrapper)
            │   │           └── TweetCard (477 lines)
            │   │               ├── Drag Handle (GripVertical, desktop only)
            │   │               ├── Textarea (tweet content, dir="auto")
            │   │               ├── Media Preview Grid (4 items max, 80×80)
            │   │               ├── Link Preview Card (1s debounce fetch)
            │   │               ├── H8: Hashtag Chips (conditional)
            │   │               └── Footer Toolbar
            │   │                   ├── [Mobile: Up/Down ChevronUp/Down]
            │   │                   ├── Media Button (ImageIcon)
            │   │                   ├── AI Image Button (Wand2)
            │   │                   ├── Emoji Button (Smile) → Popover/Sheet
            │   │                   ├── Rewrite Button (Sparkles)
            │   │                   ├── Hashtags Button (Hash)
            │   │                   ├── Clear Button (Eraser)
            │   │                   └── Character Counter + Premium Progress Bar
            │   ├── Long Content Alerts (tier-aware warnings)
            │   ├── Mixed Tier Warning Banner
            │   ├── Auto-save Timestamp ("Auto-saved · Xm ago")
            │   └── "Add to Thread" / "Convert to Thread" Button
            │
            ├── SIDEBAR COLUMN
            │   ├── [If isAiOpen && isDesktop] → AI Inline Panel (replaces Content Tools)
            │   │   ├── Panel Header (title + close button)
            │   │   ├── AI Tool Form (varies by tool type)
            │   │   └── Footer (Cancel + Generate buttons)
            │   │
            │   ├── [Else] Content Tools Card
            │   │   ├── AI Writer Button (Sparkles)
            │   │   ├── Inspiration Button (Lightbulb) → InspirationPanel
            │   │   │   └── Dialog: Niche selector → Ideas list → Click→AI
            │   │   ├── Templates Button (LayoutTemplate) → TemplatesDialog
            │   │   │   └── Dialog (834 lines): Tabs (System/User) + Generate view
            │   │   ├── Secondary Tools Grid (2×2)
            │   │   │   ├── Hook Button (Zap)
            │   │   │   ├── CTA Button (Megaphone)
            │   │   │   ├── Translate Button (Globe)
            │   │   │   └── Hashtags Button (Hash)
            │   │   └── Number Tweets Button (ListOrdered)
            │   │
            │   ├── Publishing Card
            │   │   ├── TargetAccountsSelect (DropdownMenu, multi-select)
            │   │   ├── DatePicker (react-day-picker v9 in Popover)
            │   │   ├── Time Select (grouped: Morning/Afternoon/Evening/Night)
            │   │   ├── Browser Timezone Display
            │   │   ├── BestTimeSuggestions (chips, Pro/Agency)
            │   │   ├── Recurrence Select + End Date (conditional)
            │   │   ├── Action Context Text (H2)
            │   │   ├── Post to X Button (primary, h-11)
            │   │   ├── Save as Draft Button (outline)
            │   │   └── Save as Template Button (outline/sm)
            │   │
            │   └── Preview Carousel
            │       ├── Navigation Chevrons (thread mode)
            │       ├── ViralScoreBadge (debounced, 2s)
            │       └── X-style Tweet Preview (avatar + content + media)
            │
            └── OVERLAYS
                ├── AiImageDialog (628 lines) → Replicate API
                ├── Save Template Dialog (inline)
                ├── [Mobile] AI Sheet (90dvh, bottom)
                └── Overwrite AlertDialog (confirmOverwrite state)
```

---

## Section A: Editor Column (Left 2/3)

### A1: Tweet Card Anatomy

Each tweet card (`TweetCard` component, 477 lines) displays:

**Top Row (hidden, left-aligned)**:

- Drag handle (GripVertical icon) - desktop only, draggable zone
- Positioned at `left: -2rem` from card (absolute positioning)

**Card Content**:

1. **Textarea** - Main content editor
   - Placeholder: "Start writing..."
   - `min-height: 120px`, `resize-none`
   - No border (seamless card integration)
   - Auto-focus on first tweet (`isFirst` prop)
   - RTL support via `dir="auto"`

2. **Media Preview Grid** (below textarea)
   - 4 items max, displayed in flex-wrap grid
   - Each item: 80×80px rounded thumbnail
   - Upload state: `<Loader2 className="animate-spin" />` spinner on gray bg
   - Video: native `<video>` element with controls
   - Image: Next.js `<Image>` component with fill + object-cover
   - Remove button (X icon) on hover (top-right of thumbnail), semi-transparent bg

3. **Link Preview Card** (replaces media if link detected)
   - 1-second debounce before fetching via `POST /api/link-preview`
   - URL extraction via `twitter-text.extractUrls()`
   - Shows: OG image (h-48), title (line-clamp-1), description (line-clamp-2), hostname
   - Dismissible with X button (opacity-0 → group-hover:opacity-100)

4. **H8: Inline Hashtag Chips** (conditional)
   - Appears below media/link preview when `suggestedHashtags` prop is provided
   - Circular chips: rounded-full, border-primary/30, bg-primary/5
   - Click to append `#tag` to tweet content + remove chip from list
   - Only shown when hashtags generated from AI Hashtags tool

**Card Footer Toolbar** (left side):

1. **Mobile Reorder Buttons** (touch-target, 44×44px)
   - Up chevron (disabled at top) — `md:hidden`
   - Down chevron (disabled at bottom) — `md:hidden`
   - Desktop uses drag handle instead

2. **Media Button** — Icon: `ImageIcon`, Text: "Media" (hidden <sm), triggers hidden file input, accepts `image/*,video/*` multiple

3. **AI Image Button** — Icon: `Wand2`, Text: "AI Image" (hidden <sm), opens `AiImageDialog`

4. **Emoji Button** — Icon: `Smile`, Text: "Emoji" (hidden <sm)
   - Desktop: Popover with `emoji-picker-react`
   - Mobile: Sheet (bottom, 400px height)

5. **Rewrite Button** — Icon: `Sparkles`, Text: "Rewrite" (hidden <sm), opens AI Panel with tool="rewrite"

6. **Hashtags Button** — Icon: `Hash`, Text: "Hashtags" (hidden <sm), opens AI Panel with tool="hashtags"

7. **Clear Button** — Icon: `Eraser`, Text: "Clear" (hidden <sm)
   - Style: Muted text → Destructive on hover
   - Disabled: when content empty AND no media
   - Action: Clears content + media, shows undo toast (10s timeout)

**Card Footer (right side)**:

1. **Character Counter** — Format: `"{count} / {limit}"`, tabular-nums
   - Colors: Default `text-muted-foreground`, >280 `text-amber-500`, >limit `text-destructive`
   - A11y: `role="status"`, `aria-live="polite"`, `aria-atomic="true"`

2. **XSubscriptionBadge** — Next to counter for Premium accounts (single-post mode only)

3. **Premium Progress Bar** (single-post mode, Premium tier only)
   - Mini horizontal bar (height: 4px), 280-char milestone marker
   - Fill color: Primary → Amber → Destructive
   - Length zone label: "Short post" / "Medium post" / "Long post"

4. **Remove Tweet Button** (thread mode only)
   - X icon, destructive color, group-hover:opacity-100
   - Only visible when `tweets.length > 1`

**Visual Indicators**:

- Left border color: `border-l-primary` (ok) or `border-l-destructive` (over limit)
- Connector line between thread tweets (vertical line, w-0.5 bg-border, z-[-10])

---

### A2: Thread Management

**Adding Tweets**:

- Button: "Add to Thread" / "Convert to Thread"
  - Location: Below last tweet card
  - Style: Outline variant, dashed border, w-full, py-6
  - Label: `tweets.length === 1` → "Convert to Thread"; else → "Add to Thread"

**Removing Tweets**:

- From card footer X button (thread mode only, opacity-0 → group-hover:opacity-100)
- Shows toast with undo: "Tweet removed. Undo?" (10s timeout)
- Undo restores tweet to original position

**Reordering Tweets**:

- **Desktop**: Drag-and-drop using `@dnd-kit` (DndContext + SortableContext)
  - Drag handle: GripVertical icon, left of card
  - Visual feedback: opacity 0.5 during drag, z-index 1, CSS transform
  - Drop target: closest card by Y-position (verticalListSortingStrategy)
  - Keyboard support: KeyboardSensor with sortableKeyboardCoordinates
- **Mobile**: Up/Down chevron buttons (md:hidden, touch-target class)
  - Top tweet: Up disabled. Bottom tweet: Down disabled.

**Numbering Tweets**:

- Button: "Number tweets (1/N)" (ghost variant, full width)
- Action: Calls `applyNumbering([...tweets])`, adds "1/" prefix to first, "2/" to second, etc.

---

### A3: Auto-Save

**Trigger**: Debounced 1 second after `tweets` array changes (useEffect + setTimeout/clearTimeout)

**Storage**: Key: `localStorage["astra-post-drafts"]`, Format: JSON array

**What's Saved**: Tweet content, media URLs, link previews. Strips uploading placeholders.

**What's NOT Saved**: Scheduled date, target account selection, AI panel state, template metadata

**UI Indicator**: "Auto-saved · {timeAgo}" (small, muted text, right-aligned, above "Add to Thread")

**Clear Conditions**: After successful submit (Post/Draft/Schedule) or `localStorage.removeItem()`

---

### A4: Content Bridge (from other pages)

**Bridge Sources & Priority**:

1. URL param `?draft={postId}` → Fetch draft from API, set `editingDraftId`
2. `sessionStorage["composer_payload"]` → `{tweets: string[]}`, generic bridge
3. `sessionStorage["inspiration_tweets"]` → Parse JSON + attribution
4. URL param `?prefill={text}` → Single tweet prefill
5. URL param `?tone` + `?topic` → Calendar metadata banner
6. Fallback: `localStorage["astra-post-drafts"]` → Auto-save restore

**W4: Inspiration Attribution Banner**: "Inspired by @{handle}" with dismiss button
**W5: Calendar Metadata Banner**: "Topic: {topic} · Tone: {tone}" with dismiss button

---

## Section B: Sidebar — Content Tools Card

### B1: AI Writer Button

- Style: Outline, full width, icon=Sparkles, text="AI Writer"
- Action: Opens AI Panel (desktop: inline replaces Content Tools; mobile: Sheet)
- Sets `aiTool="thread"`, `aiTargetTweetId=null`

### B2: Inspiration Button

- Component: `InspirationPanel` (112 lines, Dialog)
- Style: Outline, full width, icon=Lightbulb (text-yellow-500), text="Inspiration"
- Dialog: Niche selector (10 options) → "Get Ideas" → API call → Topic+Hook list → Click triggers AI Writer

### B3: Templates Button

- Component: `TemplatesDialog` (834 lines, Dialog)
- Style: Outline, full width, icon=LayoutTemplate, text="Templates"
- Dialog: Two tabs (System Templates / My Templates) + Generate view
- System templates: Category filter, grid cards, click → generate view
- User templates: Pagination (6/page), delete, use, re-generate
- Generate view: Topic input, tone/language/format selects, SSE streaming

### B4: Secondary Tools Grid

- Layout: 2×2 grid (`grid-cols-2`, `gap-1.5`), all outline/sm, text-xs
- **Hook** (Zap) → AI Panel with tool="hook"
- **CTA** (Megaphone) → AI Panel with tool="cta"
- **Translate** (Globe) → AI Panel with tool="translate"
- **Hashtags** (Hash) → AI Panel with tool="hashtags"

### B5: Number Tweets Button

- Style: Ghost/sm, full width, icon=ListOrdered, text-muted-foreground
- Action: Adds "1/" prefix to first tweet, "2/" to second, etc.

---

## Section C: Sidebar — Publishing Card

### C1: Target Account Selection

- Component: `TargetAccountsSelect` (99 lines, DropdownMenu)
- Trigger: "Select accounts" / "{count} accounts" / single account icon+handle
- Dropdown: CheckboxItem per account, multi-select, platform icons, XSubscriptionBadge

### C2: Date & Time Pickers

- DatePicker: react-day-picker v9 in Popover, YYYY-MM-DD string
- Time Select: Grouped by period (Morning 6-11, Afternoon 12-17, Evening 18-21, Night 22-5)
- Timezone Display: Detected via `Intl.DateTimeFormat().resolvedOptions().timeZone`

### C3: Best Time Suggestions

- Component: `BestTimeSuggestions` (121 lines)
- Pro/Agency only; Free sees lock icon + "Upgrade to see best times"
- Chips: "Now" + day/time suggestions (e.g., "Mon 9AM")
- API: `GET /api/analytics/best-times` with recency-biased analytics

### C4: Recurrence Options

- Conditional: Only shows when `scheduledDate` is set
- Pattern: Never/Daily/Weekly/Monthly
- End Date: Conditional on pattern !== "none", max 1 year from start

### C5: Action Buttons

- **Post to X**: Default variant, h-11, icon=Send, disabled when !hasContent || isSubmitting
  - With date: `handleSubmit("schedule")`. Without: `handleSubmit("publish_now")`
- **Save as Draft**: Outline variant, icon=FileText, `handleSubmit("draft")`
- **H2: Action Context Text**: "Scheduling for {date} at {time}" or "Posting immediately to @{handle}"

### C6: Save as Template

- Opens inline dialog with Title (required), Description (optional), Category select
- AI Metadata Banner: Shows when `lastTemplateAiMeta` exists
- Submit: `createUserTemplate()` API call

---

## Section D: Sidebar — Preview Carousel

- Header: "Preview" or "Preview · {index} / {total}" + navigation chevrons + ViralScoreBadge
- Preview Card: Avatar (40×40), Name (bold), Handle (muted), Content (whitespace-pre-wrap), Media, Link Preview
- ViralScoreBadge: 2s debounce, `POST /api/ai/score`, color-coded score (red 0-39, yellow 40-69, green 70-100), tooltip with feedback bullets
  - States: idle (hidden), loading (spinner), restricted (blurred+lock, Free), rate_limited (warning), error (red), score (colored badge)
  - Pro/Agency only

---

## Section E: AI Panel (Desktop Inline / Mobile Sheet)

### E1: Desktop Inline Panel

- Condition: `isAiOpen && isDesktop`
- Replaces: Content Tools Card completely
- Layout: Card with title+close button, tool-specific form, Cancel+Generate footer

### E2: Mobile AI Sheet

- Condition: `isAiOpen && !isDesktop`
- Full-screen bottom Sheet (90dvh)

### E3: AI Tool Inputs

- **Thread/Hook**: Topic input + Tone + Language + Length slider (3-15) + Numbering toggle + AiLengthSelector (single-post mode)
- **Rewrite**: Textarea (120px min) + Tone + Language
- **Hashtags**: Read-only tweet content display + Tone + Language
- **Translate**: Target language dropdown, source auto-detected
- **All tools**: Cancel (outline/sm) + Generate (default/sm, loading shows spinner)

### E4: Thread Generation (SSE)

- API: `POST /api/ai/thread`, SSE stream
- Events: `data: {"index":N,"tweet":"..."}`, `data: {"done":true}`
- Client: Streams tweets into state in real-time
- **Overwrite Guard**: If composer has content → AlertDialog ("Replace existing content?")

### E5-E7: Hook/CTA/Rewrite/Translate/Hashtags

- All use `POST /api/ai/tools` or `POST /api/ai/translate`
- Hook: Replaces first tweet. CTA: Appends to last. Rewrite: Replaces target tweet. Translate: Replaces all. Hashtags: Shows chips (dual display in panel + inline)

---

## Section F: Dialogs & Overlays

### F1: AI Image Dialog (628 lines)

- Component: `AiImageDialog`
- State: prompt, model, aspectRatio, style, isGenerating, generatedImage, imageHistory, generationError
- Form: Prompt textarea, Model select, Aspect ratio select (1:1/16:9/4:3/9:16), Style buttons (Photorealistic/Illustration/etc.)
- Generation: `POST /api/ai/image` → predictionId → Poll `GET /api/ai/image/status?id={id}` every 2s
- Fallback: Automatic model switch on non-content errors
- History: Horizontal thumbnail strip for session generations
- Quota: Displayed in dialog header, color-coded (green/orange/red)

### F2: Save Template Dialog (inline)

- Fields: Title (required), Description (optional), Category (select)
- AI Metadata Banner (conditional)
- Submit: `createUserTemplate()` API

### F3: Templates Browser Dialog (834 lines)

- Tabs: System Templates / My Templates
- System: Category filter, grid cards, click → generate view
- User: Pagination (6/page), delete (with confirm), use, re-generate
- Generate: Topic+Tone+Language+Format, SSE streaming, quota display

### F4: Overwrite Confirmation AlertDialog

- Trigger: AI generation or template apply when composer has content
- Title: "Replace existing content?"
- Actions: "Keep editing" (cancel) / "Replace & Generate" (confirm, applies pendingTweets)

---

## Section G: Full User Journey Flows

### Flow 1: Quick Compose & Schedule

1. User lands on `/dashboard/compose`
2. Auto-save restores previous draft (if any, only when composer is empty)
3. User types in first tweet card
4. Link preview auto-fetches (1s debounce)
5. User selects target account from dropdown
6. User clicks DatePicker → selects date
7. User clicks Time dropdown → selects time (grouped by period)
8. Action text updates: "Scheduling for Mon, Apr 5 at 9:00 AM"
9. User clicks "Post to X"
10. Validation: has content, not uploading, has account
11. `isSubmitting = true`, button shows spinner
12. API: `POST /api/posts` with `action: "schedule"`
13. On success: Toast "Post scheduled!", composer resets, auto-save cleared
14. On 402: Upgrade modal opens with context

### Flow 2: AI Thread Generation

1. User clicks "AI Writer" button
2. AI Panel opens (inline on desktop, Sheet on mobile)
3. User enters topic, selects tone/language, adjusts slider
4. User clicks "Generate"
5. If composer has content → Overwrite AlertDialog
6. SSE stream starts, tweets appear one-by-one in real-time
7. Stream closes, toast "Thread generated!", AI panel closes
8. User reviews, edits, selects account, clicks "Post to X"

### Flow 3: Edit Existing Draft

1. User navigates from Drafts page via URL: `/dashboard/compose?draft={postId}`
2. Composer detects `?draft=` param, fetches `GET /api/posts/{postId}`
3. Draft tweets, media, scheduled date, target account loaded
4. User edits, clicks "Post to X" (uses `PATCH /api/posts/{id}`, not POST)

### Flow 4: AI Image Attach

1. User writes tweet content
2. Clicks "AI Image" in tweet card footer → Dialog opens
3. Enters prompt (or leaves empty for auto-generation from tweet)
4. Selects model, aspect ratio, style
5. Clicks "Generate" → API returns predictionId → Polls every 2s
6. Image appears → User clicks "Attach to Tweet"
7. Dialog closes, thumbnail appears in tweet card

### Flow 5: Inspiration → Thread

1. Content arrives from Inspiration page via `sessionStorage["inspiration_tweets"]`
2. Attribution banner shows: "Inspired by @{handle}"
3. User clicks "Inspiration" → Dialog → Selects niche → "Get Ideas"
4. Clicks idea → AI Panel auto-opens with topic+hook pre-filled
5. Overwrite guard (if adapted content exists) → User confirms
6. New thread generated, attribution banner stays

### Flow 6: Template → Compose

1. User clicks "Templates" → Dialog opens
2. Browses System Templates (category filter) or My Templates (paged)
3. Clicks template → If AI template: generate view with form
4. Clicks "Use Template" / "Generate with AI"
5. Overwrite guard (if composer has content)
6. Template tweets loaded into composer

### Flow 7: Hashtag Generation & Insertion

1. User writes tweet, clicks "Hashtags" (in toolbar or Content Tools)
2. AI Panel opens with tool="hashtags"
3. Clicks "Generate" → API returns hashtag array
4. Chips appear in AI panel AND inline below tweet textarea
5. Click chip → appends to tweet content, chip consumed (removed)

### Flow 8: Schedule with Best Time

1. User writes content, selects account
2. Scrolls to Publishing Card → "Best times to post" chips
3. Clicks "Tue 9AM" chip → DatePicker + TimeSelect auto-update
4. Clicks "Post to X" → API creates scheduled post

### Flow 9: Cancellation / Discard

- **No beforeunload handler** — risk of lost work on tab close
- **Auto-save**: Protects via localStorage (1s debounce)
- **Clear tweet**: Shows undo toast (10s window)
- **Remove tweet**: Shows undo toast (10s window)

### Flow 10: Error & Failure Recovery

- **Network errors**: Toast with error message
- **402 Plan limits**: Opens upgrade modal with feature/plan/limit context
- **429 Rate limits**: Toast with "Try again in Xs"
- **Validation errors**: Toast with specific field error
- **Media upload errors**: Placeholder removed, toast "Failed to upload file"
- **Queue failures**: Post saved to DB, warning shown, can retry from Queue page

---

## Section H: Character Limit Logic

### Tier-Aware Limits

**Thread Mode** (`tweets.length > 1`):

- All tweets limited to **280 chars** regardless of tier
- Reason: X platform limitation for threads

**Single-Post Mode** (`tweets.length === 1`):

| Tier        | Limit | Milestone | Progress Bar | Zones             |
| ----------- | ----- | --------- | ------------ | ----------------- |
| Free / None | 280   | 280       | No           | n/a               |
| Premium     | 2,000 | 280       | Yes          | Short/Medium/Long |

**Mixed Tier Warning**: When multiple X accounts with different tiers selected → "Character limit set to 280 based on the most restrictive account"

### Character Counter Display

- Format: `"{count} / {limit.toLocaleString()}"` (e.g., "42 / 280", "1,234 / 2,000")
- A11y: `role="status"`, `aria-live="polite"`, `aria-atomic="true"`, `aria-label`

---

## Section I: Post-Submission Behavior

### Submit Handler (`handleSubmit`)

**Pre-Submission Validation**:

1. `isUploading` → Toast "Please wait for uploads to complete"
2. `hasContent` → Toast "Add content before posting"
3. Empty tweets check → "Tweet {N} is empty."

**Action Modes**:

1. **"publish_now"**: `POST /api/posts` → Toast "Post sent to queue"
2. **"schedule"**: `POST /api/posts` with `scheduledAt` + recurrence → Toast "Post scheduled!"
3. **"draft"**: `POST /api/posts` with `action: "draft"` → Toast "Post drafted!"

**Edit Draft Mode**: Uses `PATCH /api/posts/{editingDraftId}` instead of POST

**Reset**: After successful submit → single empty tweet, clear localStorage, reset all scheduling state

**Error Handling**: try/catch → toast.error, 402 → upgrade modal

---

## Section J: State & Data Inventory

### J1: 60+ State Variables

**Content State**: tweets, scheduledDate, recurrencePattern, recurrenceEndDate, targetAccountIds, editingDraftId, draftXAccountId

**AI State**: isAiOpen, isGenerating, aiTool, aiTargetTweetId, aiTopic, aiHook, aiTone, aiCount, aiLanguage, aiLengthOption, aiRewriteText, aiAddNumbering, aiTranslateTarget, generatedHashtags, pendingInspirationRef

**Account & Session**: accounts, accountsLoading, session, mounted

**Bridge & Attribution**: bridgeLoadedRef, sourceAttribution, calendarMeta

**UI State**: activeTweetId, confirmOverwrite, pendingTweets, previewIndex, lastSavedAt, isAiImageOpen, aiImageTargetTweetId

**Template State**: isSaveTemplateOpen, templateTitle, templateDescription, templateCategory, lastTemplateAiMeta

**AI Image Plan Limits**: userPlanLimits ({ availableModels, preferredModel, remainingQuota })

**Other**: browserTimezone, fileInputRef, isSubmitting

### J2: Key Computed Values

- `effectiveTier`: Most restrictive tier among selected X accounts
- `hasMixedTiers`: Boolean for tier mismatch warning
- `safePreviewIndex`: `Math.min(previewIndex, tweets.length - 1)`
- `hasContent`: Any tweet has non-empty content
- `isAiGenerateDisabled`: Complex validation per tool type

### J3: Key Refs

- `fileInputRef`: Hidden file input for media upload
- `pendingInspirationRef`: Stores topic/hook from Inspiration panel
- `bridgeLoadedRef`: Prevents auto-save from overwriting injected bridge content

---

## Section K: Interactive Elements Catalogue

### Summary Statistics

| Category          | Count      |
| ----------------- | ---------- |
| Buttons           | 150+       |
| Inputs/Textareas  | 20+        |
| Selects/Dropdowns | 15+        |
| Dialogs/Modals    | 5          |
| Sheets (mobile)   | 2          |
| Toggles           | 1          |
| Sliders           | 1          |
| Badges/Chips      | 30+        |
| Tooltips          | 40+        |
| Alert Banners     | 6          |
| Drag Zones        | 1-N        |
| File Inputs       | 1 (hidden) |

### Element-by-Element Detail

#### Tweet Card Toolbar Buttons

| Element               | Icon         | Action                 | Disabled When          | Tooltip             |
| --------------------- | ------------ | ---------------------- | ---------------------- | ------------------- |
| Media                 | ImageIcon    | triggerFileUpload      | Never                  | "Upload Media"      |
| AI Image              | Wand2        | openAiImage            | Never                  | "Generate AI Image" |
| Emoji (Desktop)       | Smile        | Toggle Popover         | Never                  | "Add Emoji"         |
| Emoji (Mobile)        | Smile        | Open Sheet             | Never                  | "Add Emoji"         |
| Rewrite               | Sparkles     | openAiTool("rewrite")  | Never                  | "Rewrite with AI"   |
| Hashtags              | Hash         | openAiTool("hashtags") | Never                  | "Generate Hashtags" |
| Clear                 | Eraser       | onClearTweet           | content="" && media=[] | "Clear tweet"       |
| Move Up (Mobile)      | ChevronUp    | onMoveUp               | index===0              | "Move tweet N up"   |
| Move Down (Mobile)    | ChevronDown  | onMoveDown             | index===last           | "Move tweet N down" |
| Remove Tweet          | X            | removeTweet            | tweets.length===1      | "Remove tweet N"    |
| Drag Handle (Desktop) | GripVertical | DnD reorder            | N/A                    | "Drag to reorder"   |

#### Sidebar Content Tools Buttons

| Element       | Icon           | Action                       | Variant    |
| ------------- | -------------- | ---------------------------- | ---------- |
| AI Writer     | Sparkles       | openAiTool("thread")         | outline    |
| Inspiration   | Lightbulb      | Open InspirationPanel dialog | outline    |
| Templates     | LayoutTemplate | Open TemplatesDialog         | outline    |
| Hook          | Zap            | openAiTool("hook")           | outline/sm |
| CTA           | Megaphone      | openAiTool("cta")            | outline/sm |
| Translate     | Globe          | openAiTool("translate")      | outline/sm |
| Hashtags      | Hash           | openAiTool("hashtags")       | outline/sm |
| Number Tweets | ListOrdered    | applyNumbering               | ghost/sm   |

#### Publishing Card Elements

| Element        | Type                   | Action                | Disabled When                 |
| -------------- | ---------------------- | --------------------- | ----------------------------- |
| Account Select | DropdownMenu           | Multi-select accounts | loading=true                  |
| Date Picker    | Popover+DayPicker      | Set scheduledDate     | Never                         |
| Time Select    | Select                 | Set time portion      | No date selected              |
| Best Times     | Chips                  | Set date+time         | Free plan                     |
| Recurrence     | Select                 | Set pattern           | No date                       |
| Recurrence End | DatePicker             | Set end date          | pattern=none                  |
| Post to X      | Button (default, h-11) | handleSubmit          | !hasContent \|\| isSubmitting |
| Save as Draft  | Button (outline)       | handleSubmit("draft") | !hasContent \|\| isSubmitting |
| Save Template  | Button (outline/sm)    | Open dialog           | isSubmitting                  |

#### AI Image Dialog Elements

| Element      | Type             | Options/Details                                                             |
| ------------ | ---------------- | --------------------------------------------------------------------------- |
| Prompt       | Textarea         | Auto-generates from tweet if empty                                          |
| Model        | Select           | nano-banana-2 (Fast), nano-banana-pro (Best)                                |
| Aspect Ratio | Select           | 1:1, 16:9, 4:3, 9:16                                                        |
| Style        | Button group     | None, Photorealistic, Illustration, Minimalist, Abstract, Infographic, Meme |
| Generate     | Button           | Start generation, polls every 2s                                            |
| Attach       | Button (primary) | Add image to tweet media                                                    |
| Regenerate   | Button (outline) | Generate new image                                                          |
| History      | Thumbnail strip  | Click to select previous generation                                         |

#### Templates Dialog Elements

| Element               | Type                | Details                                         |
| --------------------- | ------------------- | ----------------------------------------------- |
| Tab: System Templates | TabsTrigger         | Browse pre-defined templates                    |
| Tab: My Templates     | TabsTrigger         | Browse user-saved templates                     |
| Category Filter       | Button row          | All/Educational/Promotional/Personal/Engagement |
| Template Card         | Button              | Click → generate view or direct insert          |
| Delete Template       | IconButton (Trash2) | Browser confirm → API delete                    |
| Topic Input           | Input               | Required, max 500 chars                         |
| Tone Select           | Select              | 7 tone options                                  |
| Language Select       | Select              | 10 languages                                    |
| Format Select         | Select              | Single/Thread-short/Thread-long                 |
| Generate              | Button              | SSE streaming with progress counter             |
| Pagination            | Prev/Next buttons   | 6 templates per page                            |
| Quota Display         | Inline text         | Color-coded (critical/warning/normal)           |

---

## Section L: UX Best Practice Cross-Reference

### Nielsen's 10 Usability Heuristics

| Heuristic                          | Assessment | Evidence                                                                                                                   |
| ---------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| **1. Visibility of system status** | Strong     | Auto-save timestamp, loading spinners, character counter, toast notifications, viral score loading, AI generation progress |
| **2. Match with real world**       | Strong     | X-style preview, native platform icons, standard tweet formatting                                                          |
| **3. User control & freedom**      | Partial    | Undo toasts for clear/remove, but no beforeunload, no post-submission undo                                                 |
| **4. Consistency & standards**     | Strong     | shadcn/ui patterns, standard dialog/sheet/popover, platform icon conventions                                               |
| **5. Error prevention**            | Strong     | Overwrite guard (AlertDialog), character counter, disabled states, upload blocking                                         |
| **6. Recognition > recall**        | Strong     | Template previews, hashtag chips, link previews, visual thread ordering                                                    |
| **7. Flexibility & efficiency**    | Partial    | AI tools, templates, keyboard shortcuts for drag, but no keyboard shortcuts for common actions                             |
| **8. Aesthetic & minimalist**      | Partial    | Clean card layout, but 2×2 grid with 7+ tools can overwhelm new users                                                      |
| **9. Help users recognize/errors** | Strong     | Tier-aware warnings, specific error toasts, upgrade modal context                                                          |
| **10. Help & documentation**       | Weak       | No inline tips, no first-time user guide, no tooltips on AI tool descriptions                                              |

### Fitts's Law Analysis

| Element               | Size                    | Position          | Assessment            |
| --------------------- | ----------------------- | ----------------- | --------------------- |
| Post to X             | h-11, full-width        | Bottom of sidebar | Excellent target      |
| Tweet textarea        | min-h-120px, full-width | Center of page    | Excellent target      |
| Toolbar buttons       | h-8, touch-target       | Per-tweet footer  | Good, mobile 44×44px  |
| Content Tools buttons | Outline, full-width     | Sidebar card      | Good targets          |
| Preview chevrons      | h-6 w-6                 | Sidebar header    | Small but adequate    |
| Drag handle           | ~20×20px                | Left of card      | Small, desktop-only   |
| Remove tweet          | ~20×20px                | Card top-right    | Small, hover-revealed |

### Hick's Law Analysis

| Decision Point        | Options                                              | Assessment                        |
| --------------------- | ---------------------------------------------------- | --------------------------------- |
| AI Tool selection     | 6 tools (Thread/Hook/CTA/Rewrite/Translate/Hashtags) | Moderate                          |
| Tone selection        | 7 tones                                              | Moderate (good defaults)          |
| Language selection    | 10 languages                                         | Moderate (good defaults)          |
| Time slot selection   | 48 slots in 4 groups                                 | Moderate (grouped helps)          |
| Best time suggestions | 4-5 chips                                            | Low (good curation)               |
| Template selection    | 15+ system + user                                    | Moderate (category filter helps)  |
| AI Image style        | 7 options                                            | Moderate (optional, good default) |

### Progressive Disclosure

| Layer       | Revealed By                      | Content                                                         |
| ----------- | -------------------------------- | --------------------------------------------------------------- |
| 0 (Default) | Page load                        | Empty tweet card + Content Tools + Publishing                   |
| 1           | Thread mode                      | Add tweet button, drag handles, remove buttons, connector lines |
| 2           | AI panel open                    | Tool-specific form replaces Content Tools                       |
| 3           | Date selected                    | Recurrence options appear                                       |
| 4           | Recurrence selected              | End date picker appears                                         |
| 5           | Hashtags generated               | Inline chips below tweet                                        |
| 6           | Media attached                   | Thumbnail grid below textarea                                   |
| 7           | Link detected                    | Link preview card below textarea                                |
| 8           | Over 280 chars (thread)          | Warning text                                                    |
| 9           | Over 280 chars (single, Premium) | Progress bar + zone label                                       |
| 10          | Mixed tiers                      | Warning banner                                                  |
| 11          | Viral score loaded               | Badge in preview header, tooltip with feedback                  |

### WCAG 2.1 Accessibility

**Present**:

- Semantic HTML: `<button>`, `<label>`, `role="button"`, `role="status"`, `role="radio"`
- ARIA: `aria-label` on icon buttons, `aria-live="polite"` on counter, `aria-roledescription="sortable"` on drag handle, `aria-disabled` on locked options
- Keyboard: Tab order, Enter/Space triggers, Escape closes dialogs, Arrow keys in dropdowns, KeyboardSensor for drag
- Focus: `focus-visible:ring-2` on all interactive elements
- Touch targets: Minimum 44×44px on mobile (`.touch-target` class)
- Color contrast: Muted foreground for labels, amber for warnings, destructive for errors

**Gaps**:

- No keyboard alternative for drag-and-drop reordering on desktop
- Emoji picker third-party a11y not verified
- SSE streaming not announced to screen readers
- Character counter may spam screen reader on every keystroke
- No `beforeunload` for unsaved changes warning

### Platform Conventions Comparison

| Feature       | AstraPost            | Twitter/X        | Buffer         | Typefully        |
| ------------- | -------------------- | ---------------- | -------------- | ---------------- |
| Thread UI     | Card stack + drag    | Thread composer  | Post queue     | Linear editor    |
| AI generation | 6 tools + image      | Grok integration | AI assistant   | Thread AI        |
| Scheduling    | Date+Time+Recurrence | Schedule toggle  | Queue system   | Schedule picker  |
| Preview       | X-style carousel     | Inline preview   | Post preview   | Thread preview   |
| Templates     | System+User+AI-gen   | None             | Post templates | Thread templates |
| Multi-account | Multi-platform       | Account switcher | Multi-platform | X only           |
| Hashtags      | AI chips + inline    | Manual           | Tag sets       | Manual           |

---

## Section M: API Routes Reference

### Core Routes

| Route               | Method | Purpose                    | Auth | Plan Gate    |
| ------------------- | ------ | -------------------------- | ---- | ------------ |
| `/api/posts`        | POST   | Create post/draft/schedule | Yes  | 20/mo free   |
| `/api/posts/[id]`   | PATCH  | Update draft               | Yes  | —            |
| `/api/posts/[id]`   | GET    | Load draft                 | Yes  | —            |
| `/api/accounts`     | GET    | Fetch connected accounts   | Yes  | —            |
| `/api/media/upload` | POST   | Upload media file          | Yes  | Rate limited |

### AI Routes

| Route                       | Method     | Purpose                     | Auth | Plan Gate  |
| --------------------------- | ---------- | --------------------------- | ---- | ---------- |
| `/api/ai/thread`            | POST (SSE) | Generate thread/single post | Yes  | 20/mo free |
| `/api/ai/tools`             | POST       | Hook/CTA/Rewrite            | Yes  | 20/mo free |
| `/api/ai/translate`         | POST       | Translate thread            | Yes  | 20/mo free |
| `/api/ai/hashtags`          | POST       | Generate hashtags           | Yes  | 20/mo free |
| `/api/ai/image`             | POST       | Start image generation      | Yes  | 10/mo free |
| `/api/ai/image/status`      | GET        | Poll image status           | Yes  | —          |
| `/api/ai/score`             | POST       | Viral score analysis        | Yes  | Pro only   |
| `/api/ai/inspiration`       | GET        | Content inspiration         | Yes  | 20/mo free |
| `/api/ai/template-generate` | POST (SSE) | Template AI generation      | Yes  | 20/mo free |
| `/api/ai/quota`             | GET        | Check AI quota              | Yes  | —          |
| `/api/link-preview`         | POST       | Fetch URL metadata          | Yes  | —          |

### Analytics Routes

| Route                       | Method | Purpose            | Auth | Plan Gate |
| --------------------------- | ------ | ------------------ | ---- | --------- |
| `/api/analytics/best-times` | GET    | Best posting times | Yes  | Pro only  |

### Template Routes

| Route                 | Method | Purpose             | Auth |
| --------------------- | ------ | ------------------- | ---- |
| `/api/templates`      | GET    | List user templates | Yes  |
| `/api/templates`      | POST   | Create template     | Yes  |
| `/api/templates/[id]` | DELETE | Delete template     | Yes  |

### Request/Response Details

**POST /api/posts**:

```typescript
// Request
{
  tweets: Array<{ content: string; media?: Array<{ url, mimeType, fileType, size }> }>;
  targetAccountIds?: string[];  // "twitter:<id>" format
  scheduledAt?: string;         // ISO string
  recurrencePattern?: "none" | "daily" | "weekly" | "monthly";
  recurrenceEndDate?: string;
  action: "draft" | "schedule" | "publish_now";
}
// Response: { success, postIds, groupId?, queueFailed? }
```

**POST /api/ai/thread** (SSE):

```typescript
// Request
{
  topic: string; hook?: string; tone: ToneCode;
  tweetCount?: number; language: string;
  mode: "thread" | "single"; lengthOption: "short" | "medium" | "long";
}
// Response: SSE stream → data: {"index":N,"tweet":"..."} → data: {"done":true}
```

**POST /api/media/upload**:

- Magic-bytes validation (never trusts Content-Type or filename)
- Max: 15MB images, 50MB video
- Response: `{ url, filename, mimeType, fileType, size }`

---

## Section N: File Reference Index

| File                                                  | Lines | Purpose                                                                             |
| ----------------------------------------------------- | ----- | ----------------------------------------------------------------------------------- |
| `src/app/dashboard/compose/page.tsx`                  | 20    | Page wrapper: DashboardPageWrapper + Suspense + Composer                            |
| `src/components/composer/composer.tsx`                | 1,985 | **Main component** — orchestrates all state, sidebar, dialogs, AI tools, submission |
| `src/components/composer/tweet-card.tsx`              | 477   | Individual tweet editor: textarea, media grid, link preview, toolbar, char counter  |
| `src/components/composer/sortable-tweet.tsx`          | 69    | DnD wrapper: @dnd-kit useSortable, opacity/transform, props passthrough             |
| `src/components/composer/target-accounts-select.tsx`  | 99    | Multi-platform account dropdown: DropdownMenu with checkboxes                       |
| `src/components/composer/ai-image-dialog.tsx`         | 628   | AI image generation: Replicate API, polling, model fallback, history                |
| `src/components/composer/templates-dialog.tsx`        | 834   | Template browser: tabs (System/User), generate view, SSE streaming, pagination      |
| `src/components/composer/inspiration-panel.tsx`       | 112   | Content inspiration: niche selector, topic+hook ideas, click→AI trigger             |
| `src/components/composer/ai-length-selector.tsx`      | 96    | Post length segmented control: Short/Medium/Long, Premium lock                      |
| `src/components/composer/best-time-suggestions.tsx`   | 121   | Best posting time chips: API fetch, "Now" button, upgrade prompt                    |
| `src/components/composer/viral-score-badge.tsx`       | 206   | Viral score: debounced analysis, color-coded badge, feedback tooltip                |
| `src/components/dashboard/sidebar.tsx`                | —     | Navigation sidebar: Compose link in "Content" section                               |
| `src/components/dashboard/dashboard-page-wrapper.tsx` | —     | Shared page layout wrapper used by all dashboard pages                              |
| `src/app/api/posts/route.ts`                          | —     | POST create, PATCH update — transaction-wrapped, BullMQ enqueue                     |
| `src/app/api/ai/thread/route.ts`                      | —     | SSE thread generation, tier-aware limits, voice profile                             |
| `src/app/api/ai/translate/route.ts`                   | —     | Thread translation with smart splitting                                             |
| `src/app/api/ai/tools/route.ts`                       | —     | Hook/CTA/Rewrite tools, voice profile integration                                   |
| `src/app/api/ai/image/route.ts`                       | —     | AI image generation via Replicate, auto-prompt, Redis cache                         |
| `src/app/api/ai/image/status/route.ts`                | —     | Image polling with fallback model logic                                             |
| `src/app/api/ai/hashtags/route.ts`                    | —     | Hashtag generation, regional prioritization                                         |
| `src/app/api/ai/score/route.ts`                       | —     | Viral score analysis (Pro only, no quota consumption)                               |
| `src/app/api/analytics/best-times/route.ts`           | —     | Best posting times with recency-biased analytics                                    |
| `src/app/api/media/upload/route.ts`                   | —     | Media upload with magic-bytes validation, safe filenames                            |
| `src/lib/plan-limits.ts`                              | —     | Plan tiers (Free/Pro/Agency), feature gates                                         |
| `src/lib/services/ai-image.ts`                        | —     | Replicate integration, model mapping from env vars                                  |
| `src/lib/storage.ts`                                  | —     | File storage abstraction (local / Vercel Blob)                                      |
| `src/lib/rate-limiter.ts`                             | —     | Redis-backed per-user rate limiting                                                 |

---

## Appendix: Accessibility Audit

### A11y Features Present

1. **Semantic HTML**: `<button>` for all actions, `<label>` for all inputs, `role="status"`, `role="radio"`, `aria-roledescription="sortable"`
2. **Keyboard Navigation**: Tab order follows visual layout, Enter/Space triggers buttons, Escape closes dialogs, Arrow keys navigate dropdowns, KeyboardSensor for drag
3. **Screen Reader Support**: `aria-live="polite"` on character counter, `aria-atomic="true"`, `aria-label` on all icon-only buttons, `sr-only` titles in Sheet/Dialog
4. **Touch Targets**: Minimum 44×44px for mobile (`.touch-target` class), adequate padding on all buttons
5. **Focus Indicators**: `focus-visible:ring-2` on interactive elements
6. **Color Contrast**: Muted foreground for labels, amber for warnings (accessible), destructive for errors (accessible)
7. **Reduced Motion**: CSS transitions respect prefers-reduced-motion

### A11y Gaps

1. **Drag Handle**: No keyboard alternative for drag-and-drop (consider visible Up/Down on desktop)
2. **Emoji Picker**: Third-party lib keyboard navigation not verified
3. **SSE Streaming**: Screen readers miss real-time tweet streaming updates
4. **Character Counter**: May spam announcements on every keystroke (debounce recommended)
5. **No beforeunload**: No unsaved changes warning on navigation

---

## Appendix: Potential UX Issues (For Future Review)

> **Note**: This section is for future optimization analysis. The audit above documents the current state as-is.

### Friction Points Documented Factually

1. **Overwrite Guard (C1)** — Required but interrupts flow; user must confirm before every AI generation that would replace content
2. **AI Panel replaces Content Tools** — Desktop layout shift when AI panel opens/closes; entire card disappears and reappears
3. **Hashtags Dual Display (H8 + Panel)** — Chips appear both in AI panel and inline below tweet; two interaction paths for same data
4. **Best Time Suggestions** — No loading state visible (returns null until loaded, component disappears)
5. **Character Limit Logic** — Complex tier-aware rules; mixed-tier message may confuse users
6. **Auto-Save Timestamp** — "just now" can be misleading; user may think manual save just happened
7. **Mobile AI Sheet (90dvh)** — User cannot see composer while AI generates
8. **Thread Mode Lock** — Even with Premium, threads locked to 280 chars per tweet
9. **Number Tweets Button** — Manual step; user must remember to click it
10. **Link Preview Fetch** — 1-second debounce with no loading indicator
11. **No beforeunload handler** — Risk of lost work on tab close or navigation
12. **SSE not accessible** — Streaming updates not announced to screen readers
13. **AI tool decision complexity** — 6 tools × 7 tones × 10 languages = potential choice overload for new users
14. **Error recovery paths** — Some errors (media 415, image service errors) lack clear next-step guidance
15. **Best time API silent failure** — Component simply doesn't appear on error; no user feedback

---

**End of Audit**

_This document is a living record of the Compose page UX as of 2026-04-04. Update when significant changes are made._
