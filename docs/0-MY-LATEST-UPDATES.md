# Latest Updates

## 2026-03-22: UX Audit Phase 3 — PR 7: Settings Page S3 (per-account health check)

### S3 — Inline per-account connection test

**Modified**: `src/app/api/x/health/route.ts`

- Extended `GET /api/x/health` to accept optional `?accountId=xxx` query param
- When `accountId` provided: verifies session ownership via DB lookup → uses `XApiService.getClientForAccountId()` instead of the default account
- Backwards-compatible: no `accountId` still tests the default account (original behaviour)

**Modified**: `src/components/settings/connected-x-accounts.tsx`

- Added `HealthStatus` type: `{ ok: boolean; detail?: string; checkedAt: Date }`
- Added `healthStatus: Record<string, HealthStatus>` state and `checking: string | null` state
- Added `relativeTime(date)` helper: "just now" / "2m ago" / "3h ago"
- Each account row now has an `Activity` icon ghost button (animated pulse while checking)
- `handleHealthCheck(accountId)` calls `GET /api/x/health?accountId=xxx`, stores result in `healthStatus`
- Health status strip renders below each account row after a check:
  - ✅ green: `CheckCircle2` + "Connected as @username" + relative time
  - ❌ red: `XCircle` + error message + relative time
- Status is cleared on disconnect (clean up stale health entries)

**Modified**: `src/app/dashboard/settings/page.tsx`

- Removed `XHealthCheckButton` import and render — per-account inline buttons replace it entirely

`pnpm lint && pnpm typecheck` — 0 errors.

---

## 2026-03-22: UX Audit Phase 3 — PR 6: Settings Page (S1 + S2)

### S1 — In-page reconnect for expired X tokens

**Modified**: `src/components/settings/connected-x-accounts.tsx`

- Added `tokenExpiresAt?: Date | string | null` to `XAccountItem` type — accepts both DB `Date` and RSC-serialized ISO string
- Added `isTokenExpired(account)` helper — compares `new Date(tokenExpiresAt) < new Date()`
- When a token is expired:
  - Account row border turns `border-destructive/40 bg-destructive/5`
  - "Active" badge replaced with `<Badge variant="destructive">Expired</Badge>` with `AlertTriangle` icon
  - Warning banner below the row: "Token expired — posts to this account will fail until you reconnect."
  - Inline "Reconnect" button calls `signIn.social({ provider: "twitter", callbackURL: "/dashboard/settings?sync=1" })`

### S2 — Confirm before disconnecting an X account

**New file**: `src/app/api/x/accounts/[id]/route.ts`

- `DELETE` handler: verifies session + ownership via DB lookup → hard-deletes the `xAccounts` row
- Returns `404` if account not found or doesn't belong to the session user

**Modified**: `src/components/settings/connected-x-accounts.tsx`

- Each account row now has a "Disconnect" ghost button (text-muted → hover:text-destructive)
- Wrapped in `AlertDialog` with title "Disconnect @username?", body explaining scheduled posts will fail, Cancel + destructive "Disconnect" confirm
- On confirm: calls `DELETE /api/x/accounts/:id`, removes account from `accounts` state optimistically, shows `toast.success("@username disconnected")`
- `disconnecting: string | null` state prevents double-clicks; button shows "Removing…" while in-flight

`pnpm lint && pnpm typecheck` — 0 errors.

---

## 2026-03-22: UX Audit Phase 2 — PR 5: Deferred Items (M4 + M7 + Q5)

### M4 — Swipe-to-close mobile sidebar

**Modified**: `src/components/dashboard/sidebar.tsx`

- Replaced Radix `Sheet` with vaul `DrawerPrimitive.Root direction={sheetSide}` — native swipe-to-close gesture on iOS and Android
- Content: `fixed top-0 z-50 h-full w-64 bg-card outline-none overflow-auto` — no grab handle (side nav convention, not bottom sheet)
- RTL preserved: `direction` switches between `"left"` / `"right"` via existing MutationObserver
- Removed: `Sheet, SheetContent, SheetDescription, SheetTitle` imports; added `import { Drawer as DrawerPrimitive } from "vaul"`

### M7 — User avatar in mobile drawer header

**Modified**: `src/components/dashboard/sidebar.tsx`, `src/app/dashboard/layout.tsx`

- Added `user?: { name: string; image: string | null }` to `SidebarProps` and `SidebarContentProps`
- When `isMobile=true` and `user` is defined, renders a compact row above the brand link: `Avatar` + user name + `LogOut` icon button
- Desktop: sign-out `Button` at the bottom of the sidebar (unchanged); mobile: quick-sign-out in the avatar row (bottom button hidden on mobile)
- `layout.tsx` passes `user={{ name: session.user.name, image: session.user.image || null }}` to `<Sidebar>`

### Q5 — Queue density toggle as client state

**New file**: `src/components/queue/queue-content.tsx` (`"use client"`)

- Manages `density: "comfortable" | "compact"` via `useState` — density toggle is instant, no page reload
- Contains: `DashboardPageWrapper`, `QueueRealtimeListener`, all three post sections (Awaiting Approval, Scheduled, Failed), and `getFailureTip` helper
- Density toggle buttons now call `setDensity()` instead of navigating to `?density=compact`

**Modified**: `src/app/dashboard/queue/page.tsx`

- Removed `searchParams` prop entirely
- Removed `isCompact`, `density`, `queueDensityHref` logic
- Page is now a pure data-fetching Server Component; renders `<QueueContent ...data />`
- `Infinity` limit serialized as `null` for client component (RSC boundary safety)

`pnpm lint && pnpm typecheck` — 0 errors.

---

## 2026-03-22: UX Audit Phase 2 — PR 4: Mobile Navigation

### All M-tier items implemented (M1–M3, M5–M6)

**New file**
- `src/components/dashboard/bottom-nav.tsx` — fixed bottom nav bar (mobile only, `md:hidden`); 3 direct links (Compose, Queue, AI) + "More" button that dispatches `sidebar:open`; height 56px + `env(safe-area-inset-bottom)`

**Modified files**
- `src/components/dashboard/sidebar.tsx`:
  - Added `isMobile?: boolean` prop to `SidebarContent` — gates M2/M3/M6 behavior
  - Added `CollapsibleSection` component: section header becomes a toggle button on mobile; animated `max-h` + `opacity` transition; `ChevronDown` rotates when open; initializes expanded when any child is active, collapsed otherwise
  - Marked "AI Tools" and "Analytics" sections with `collapsible: true`
  - M3: Mobile links use `py-3` (48px), desktop keeps `py-2.5` (40px)
  - M6: Active item on mobile uses `bg-primary/15 font-semibold`, desktop keeps `bg-primary/10`
  - Sheet render passes `isMobile={true}`; desktop sidebar passes `isMobile={false}`
- `src/app/dashboard/layout.tsx`:
  - Imports and renders `<BottomNav />` at the bottom of the layout
  - `<main>` gets `pb-20 md:pb-8` so content is never hidden under the fixed nav bar
- `src/components/dashboard/dashboard-header.tsx`:
  - M5: Hamburger button changed from `h-9 w-9` → `h-10 w-10` (44px touch target)

**Deferred**: M4 (swipe-to-close Sheet) — needs vaul or custom touch handler; M7 (user avatar in Sheet header)

`pnpm lint && pnpm typecheck` — 0 errors.

---

## 2026-03-22: UX Audit Phase 2 — PR 3: Analytics Charts + Onboarding Fixes

### Part A — Viral Analyzer Charts (V1–V6)

**New files**
- `src/components/analytics/viral-bar-chart.tsx` — reusable recharts `BarChart` with horizontal/vertical orientation, top-N highlighting via `Cell`, custom tooltip matching shadcn card style
- `src/components/analytics/viral-hour-chart.tsx` — dedicated 24-slot hour chart; fills all hours 0–23, highlights top 3 bars in primary color

**Modified file**: `src/app/dashboard/analytics/viral/page.tsx`

| ID | Change |
|----|--------|
| V1 | Hashtags: badge list → horizontal `ViralBarChart` (top 3 highlighted) |
| V2 | Best Hours: badge chips → `ViralHourChart` (24-column, top 3 in primary) |
| V3 | Best Days: badge chips → vertical `ViralBarChart` sorted Mon–Sun (top 2 highlighted) |
| V4 | Tweet Length: `Progress` bars → vertical `ViralBarChart` (3 bars) |
| V5 | Content Types: bordered grid → horizontal `ViralBarChart` sorted by engagement |
| V6 | Keywords: text list → horizontal `ViralBarChart` (top 3 highlighted) |

### Part B — Onboarding Wizard Fixes (O1–O7)

**Modified file**: `src/components/onboarding/onboarding-wizard.tsx`

| ID | Change |
|----|--------|
| O1 | Step 3: `<Input type="datetime-local">` → `DatePicker` + grouped time `<Select>` (Morning/Afternoon/Evening/Night) |
| O2 | Step 2: counter changed from `X/1000` → `X/280`; amber at >280 (standard X limit), destructive at >1000 |
| O3 | Step 2: raw `<textarea>` → shadcn `<Textarea>` component |
| O4 | Step 4: feature cards now wrapped in `<Link>` with real `href` targets |
| O5 | Step 3: "Skip — save as draft" ghost button added; skips scheduling, calls `setCurrentStep(4)` |
| O6 | Step 2: `autoFocus` added to `Textarea` |
| O7 | Step 4: expanded from 2 to 4 feature cards (added Inspiration + Queue) in a 2×2 grid |

**Note**: exactOptionalPropertyTypes is ON — used conditional spread `{...(val !== undefined && { prop: val })}` for all optional recharts props.

`pnpm lint && pnpm typecheck` — 0 errors.

---

## 2026-03-22: UX Audit Phase 2 — PR 2: Queue Page

### All implemented Q-tier items (Q1–Q4, Q6)

**New files**
- `src/components/queue/reschedule-inline-dialog.tsx` — "Reschedule" button opens a Dialog wrapping `ReschedulePostForm` (Q1)
- `src/components/queue/thread-collapsible.tsx` — "Show thread (N more)" toggle reveals all tweets inline with numbered border-left list (Q2)
- `src/components/queue/bulk-approve-button.tsx` — "Approve All" / "Reject All" buttons; fires parallel PATCH calls (Q3)

**Modified files**
- `src/app/dashboard/queue/page.tsx` — wires all new components; adds contextual failure tips (Q4) and Edit buttons (Q6)

**What changed**
- **Q1**: Each scheduled card now has an inline "Reschedule" ghost button → Dialog with date/time picker
- **Q2**: Thread cards show "Show thread (N more)" collapsible in all 3 sections (Awaiting, Scheduled, Failed)
- **Q3**: "Approve All" + "Reject All" bulk buttons appear in Awaiting Approval header when >1 post (owner/admin only)
- **Q4**: `getFailureTip()` maps 401/403/rate-limit/duplicate fail reasons to an inline destructive tip banner with a Settings link
- **Q6**: "Edit" ghost button added to both Scheduled and Failed post cards → navigates to `/dashboard/compose?draft=ID`
- **Q5** (density client state): deferred — P-tier

`pnpm lint && pnpm typecheck` — 0 errors.

---

## 2026-03-22: UX Audit Phase 2 — PR 1: Drafts Page

### All D-tier items implemented (D1–D7)

**New files**
- `src/components/drafts/delete-draft-button.tsx` — AlertDialog-based delete with Sonner success toast (D1)
- `src/components/drafts/drafts-client.tsx` — Client component handling search, sort, and card rendering (D2–D7)

**Modified files**
- `src/app/dashboard/drafts/page.tsx` — Added `media` sub-query; delegates display to `DraftsClient`

**What changed**
- **D1**: Delete icon button per draft card — confirms via AlertDialog, calls `DELETE /api/posts/:id`
- **D2**: Thread badge shows "Thread · N tweets" vs "Tweet" label on every card
- **D3**: Search `<Input>` filters cards client-side by first tweet content (no API call)
- **D4**: "Schedule" ghost button next to "Edit" navigates to composer with `?openSchedule=1`
- **D5**: `<ImageIcon> Media` badge shown if any tweet in the draft has attached media
- **D6**: Empty content fallback changed to "No content yet — click to continue editing" with italic muted style
- **D7**: Sort `<Select>` — "Last edited" / "Oldest first" / "Longest draft" (client-side, no page reload)

`pnpm lint && pnpm typecheck` — 0 errors.

---

## 2026-03-22: Compose Page UX Audit — Implementation

### Changes Applied (all in one session)

**tweet-card.tsx**
- `GripVertical` icon replaces the plain number drag handle (discoverable affordance)
- `autoFocus={isFirst}` on first tweet textarea (cursor lands in compose on page load)
- Character counter now shows `count / 280` with dual threshold: amber at >280 (X standard), destructive at >1000 (app max)
- Delete button (`X`) hidden behind `group-hover` — revealed on card hover to reduce visual noise
- Placeholder changed from "What's happening?" to "Start writing..."

**sortable-tweet.tsx**
- Passes `isFirst={index === 0}` to `TweetCard` for autoFocus

**composer.tsx — Critical (C-tier)**
- **C1**: Thread generation asks for confirmation before overwriting existing content (`AlertDialog`)
- **C3**: Desktop AI panel is now inline in the sidebar (no modal) — compose content stays visible while using AI tools; mobile still uses bottom Sheet
- **C4**: `autoFocus` wired through `SortableTweet → TweetCard`

**composer.tsx — High Impact (H-tier)**
- **H1**: Sidebar split into two cards: "Content Tools" and "Publishing"
- **H2**: Action context line above CTA buttons: "Posting immediately to @handle" / "Scheduling for Fri, Mar 28 at 9:00 AM"
- **H4**: "More Tools" dropdown removed — Hook, CTA, Translate now in a visible 3-column grid
- **H5**: Auto-save timestamp shown below compose area: "Auto-saved · 3m ago"
- **H6**: Preview panel is now a carousel — "Preview · 2 / 5" with Prev/Next chevrons
- **H7**: AI history prefetched when panel opens (no click-to-load blank state)

**composer.tsx — Polish (P-tier)**
- **P2**: Time select grouped by Morning / Afternoon / Evening / Night (via `SelectGroup`)
- **P3**: Delete button hidden until card hover (see tweet-card.tsx)
- **P4**: "Convert to Thread" label when single tweet, "Add to Thread" when multi
- **P5**: Tweet deletion shows Sonner toast with Undo action
- **P6**: "Save as Template" promoted from ghost text to visible `outline` button with `BookmarkPlus` icon
- **P8**: AI thread length slider expanded from max 10 → max 15
- Removed "yearly" recurrence option (irrelevant for tweet scheduling)
- Removed `ChevronDown` / `DropdownMenu` imports (no longer needed after H4)

**Files changed**: `src/components/composer/tweet-card.tsx`, `src/components/composer/sortable-tweet.tsx`, `src/components/composer/composer.tsx`

**composer.tsx + tweet-card.tsx — C5: Upload Progress Indicator**
- `TweetDraft.media` extended with `uploading?: boolean` and `placeholderId?: string` (both files)
- `handleFileUpload` rewritten: adds spinner placeholder items immediately on file select, replaces each with real data after upload, removes placeholder on error — users see feedback instantly
- Media render block in `tweet-card.tsx` shows `<Loader2 animate-spin>` for uploading items, hides the remove button until upload completes
- `handleSubmit` guards against submission while uploads are in progress (`toast.error`)
- Auto-save `useEffect` filters out `uploading` items before writing to `localStorage` (no ghost placeholders on reload)
- Removed now-unused `addTweetMedia` helper (superseded by inline `setTweets` calls)

**P1: shadcn DatePicker replaces native `<input type="date">`**
- Installed `react-day-picker@9.14.0`
- Created `src/components/ui/calendar.tsx` — standard shadcn Calendar (new-york style, DayPicker v9)
- Created `src/components/ui/date-picker.tsx` — Popover + Calendar with YYYY-MM-DD string interface
- Both date fields in composer.tsx (`scheduledDate`, `recurrenceEndDate`) now use `DatePicker`
- DatePicker disables past dates; closes the popover on selection; formats display with `date-fns`

**H8: Inline hashtag chips below tweet card**
- `TweetCardProps` extended with `suggestedHashtags?: string[]` and `onHashtagClick?: (tag: string) => void`
- After media/link-preview section in TweetCard, chips render as pill buttons when tags exist
- Clicking a chip appends the hashtag to the tweet and removes it from the chip list (consumed once)
- Props threaded through `SortableTweet`; `composer.tsx` passes chips only to the target tweet
- Hashtags still visible in the AI sidebar panel — chips are an additional inline surface

### All UX audit items complete
All C/H/P-tier items from the 2026-03-22 audit are now implemented.

---


## 2026-03-19: ViralScoreBadge UI Improvements

### Improved Error States and User Feedback
- **Issue**: The `ViralScoreBadge` component silently failed on rate limiting (429) and service errors (503), showing no feedback to users about what happened. Users saw the "Analyzing..." spinner indefinitely or no feedback at all.
- **Resolution**:
  - Refactored component to use a single `BadgeData` state object for cleaner state management
  - Added distinct UI states for: `rate_limited` (orange badge with warning icon), `error` (red badge with error icon), and `restricted` (blurred badge with lock icon)
  - Added user-friendly error messages displayed in tooltips
  - Used `useCallback` for the fetch function to properly handle the eslint `react-hooks/set-state-in-effect` rule
  - Used refs to track content changes and debounce timers properly
- **Files Changed**: `src/components/composer/viral-score-badge.tsx`

### BullMQ/ioredis Warnings (Fixed)
- **Issue**: Turbopack was showing warnings about `ioredis/built/utils` and `ioredis/built/classes` not being properly resolvable when `ioredis` is in `serverExternalPackages`.
- **Resolution**: Updated the webpack alias in `next.config.ts` to cover both `ioredis/built/utils` AND `ioredis/built/classes`, pointing both to `ioredis/built/index.js`.
- **Files Changed**: `next.config.ts`

---

## 2026-03-19: Worker Script Developer Experience Improvements

### Improved Worker Script Logging & Error Handling
- **Issue**: The worker script (`scripts/worker.ts`) appeared to hang without any clear indication that it was successfully running and waiting for jobs. It also lacked `error` event listeners on the `Worker` instances, meaning Redis connection errors or internal BullMQ errors would fail silently or crash unexpectedly. Finally, it didn't handle `SIGINT` for graceful shutdown on Windows (Ctrl+C).
- **Resolution**: 
  - Added a clear console message upon successful startup indicating the worker is waiting for jobs.
  - Added `.on("error")` event listeners to both `scheduleWorker` and `analyticsWorker` to explicitly log worker-level errors.
  - Added a graceful shutdown handler for `SIGINT` in addition to `SIGTERM`.
- **Files Changed**: `scripts/worker.ts`

### Next Steps
- Consider setting up an external dashboard (e.g., BullMQ Dashboard) for better visibility into queue states and failed jobs during development.

---

## 2026-03-19: Turbopack Error Reversion

### Reverted Turbopack transpilePackages Change
- **Issue**: The previous fix (`transpilePackages: ["bullmq", "ioredis"]`) caused a fatal Turbopack error: `The packages specified in the 'transpilePackages' conflict with the 'serverExternalPackages': ["ioredis"]`, crashing the development server and preventing login.
- **Resolution**: Removed `transpilePackages: ["bullmq", "ioredis"]` from `next.config.ts`. The Turbopack resolution warnings for `ioredis` will remain, but the server will now run successfully.
- **Files Changed**: `next.config.ts`

### Next Steps
- Investigate alternative ways to suppress the Turbopack warning for `ioredis` without conflicting with `serverExternalPackages`.

---

## 2026-03-19: Accessibility fixes

### Fixed Axe Forms Warning in Composer
- **Issue**: Hidden file input for uploading media in the composer page triggered an `axe/forms` accessibility diagnostic ("Form elements must have labels").
- **Resolution**: Added `title="Upload media files"` and `aria-label="Upload media files"` attributes to the hidden file input.
- **Files Changed**: `src/components/composer/composer.tsx`

### Next Steps
- Continue addressing accessibility warnings to ensure compliance with WCAG standards across the platform.

---

## 2026-03-18: Codebase Evaluation & Connection Leak Fix

### Code Quality Assessment
- Evaluated the codebase and gave it a 9.5/10 build quality rating.
- The project follows excellent state-of-the-art patterns (Next.js 16, App Router, Better Auth, Drizzle, Redis Rate Limiting, BullMQ).
- Deemed production-ready, with a few suggestions provided for AI Streaming, Optimistic UI, and performance tuning.

### Fixed Postgres Connection Leak
- **Issue**: Next.js Fast Refresh during development was creating a new Postgres client connection on every reload, eventually exhausting the local database connection pool.
- **Resolution**: Updated `src/lib/db.ts` to cache the `postgres` client instance in `globalThis._postgresClient`.
- **Files Changed**: `src/lib/db.ts`

### Next Steps
- Implement AI SDK `streamObject` for thread generation to improve perceived UI performance.
- Utilize React 19 `useOptimistic` for instant feedback on queue operations.

---

## 2026-03-18: 7 New AI Features (Pro/Agency)

Added 7 new AI-powered features gated behind the Pro/Agency plans.

### New Features
1. **AI Content Calendar** — Generate a weekly/monthly content plan with topics, times, tones, and briefs. Page: `/dashboard/ai/calendar`
2. **URL → Thread Converter** — Paste any article URL; AI scrapes and converts it to a Twitter thread. Tab in `/dashboard/ai`
3. **A/B Variant Generator** — Generate 3 angle variants (emotional/factual/question) of any tweet. Tab in `/dashboard/ai`
4. **Best Posting Time Predictor** — Analyzes own `tweet_analytics` with recency bias to return top 3 posting slots. API: `GET /api/analytics/best-time`
5. **Competitor Analyzer** — Fetch any public account's recent tweets via Bearer Token and generate a strategic AI analysis. Page: `/dashboard/analytics/competitor`
6. **Reply Suggester** — Paste a tweet URL; get 5 contextually relevant reply options with tone/goal control. Page: `/dashboard/ai/reply`
7. **Bio Optimizer** — Generate 3 bio variants under 160 chars optimized for a chosen goal. Page: `/dashboard/ai/bio`

### Files Changed
- `src/lib/plan-limits.ts` — 6 new boolean feature flags
- `src/lib/middleware/require-plan.ts` — 6 new `check*AccessDetailed()` functions
- `src/app/api/ai/calendar/route.ts` — new
- `src/app/api/ai/summarize/route.ts` — new
- `src/app/api/ai/variants/route.ts` — new
- `src/app/api/analytics/best-time/route.ts` — new
- `src/app/api/analytics/competitor/route.ts` — new
- `src/app/api/ai/reply/route.ts` — new
- `src/app/api/ai/bio/route.ts` — new
- `src/app/dashboard/ai/calendar/page.tsx` — new
- `src/app/dashboard/analytics/competitor/page.tsx` — new
- `src/app/dashboard/ai/reply/page.tsx` — new
- `src/app/dashboard/ai/bio/page.tsx` — new
- `src/app/dashboard/ai/page.tsx` — updated (2 new tabs: URL, Variants)
- `src/components/dashboard/sidebar.tsx` — 4 new navigation items

**Full documentation:** `docs/features/new-ai-features-2026-03-18.md`

---

## 2026-03-16: Replicate API Integration Fix

### Fixed 422 Unprocessable Entity Error
- **Issue**: Image generation was failing with `{"detail":"- version is required\n- Additional property model is not allowed\n"}`.
- **Root Cause**: The application was sending the `model` parameter in the body to the generic `/v1/predictions` endpoint, which expects a `version` hash and does not allow `model`.
- **Resolution**: Updated `src/lib/services/ai-image.ts` to use the model-specific endpoint `POST /v1/models/{owner}/{name}/predictions`. This endpoint correctly handles requests using the model name (always using the latest version) and does not require `version` or accept `model` in the body.
- **Verification**: Ran `pnpm test src/lib/services/__tests__/ai-image.test.ts` - all tests passed.
- **Documentation**: Updated `docs/technical/logs-and-issues/ai-image-replicate-fix.md` with detailed logs and solution.

### Next Steps
- Monitor Replicate usage to ensure the new endpoint integration is stable.
- Consider adding an integration test that hits the real Replicate API (with a mocked response or in a separate test suite) to verify contract compliance if issues persist.
