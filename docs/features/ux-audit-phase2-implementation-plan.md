# UX Audit — Phase 2 Implementation Plan

> Companion to the Compose Page UX Audit (2026-03-22).
> Each section follows the same C/H/P tier system used in Phase 1:
> **C = Critical** (broken or misleading) · **H = High Impact** (significant friction) · **P = Polish** (quality-of-life)

---

## Overall Status

| PR    | Area                             | Items        | Status             |
| ----- | -------------------------------- | ------------ | ------------------ |
| PR 1  | Drafts Page                      | D1–D7        | ✅ Done            |
| PR 2  | Queue Page                       | Q1–Q4, Q6    | ✅ Done            |
| PR 3  | Viral Analyzer + Onboarding      | V1–V6, O1–O7 | ✅ Done            |
| PR 4  | Mobile Navigation                | M1–M3, M5–M6 | ✅ Done            |
| PR 5  | Deferred Items                   | M4, M7, Q5   | ✅ Done            |
| PR 6  | Settings Page                    | S1, S2       | ✅ Done            |
| PR 7  | Settings Page                    | S3           | ✅ Done            |
| PR 8  | Calendar Page                    | C1           | ✅ Done            |
| PR 9  | Calendar Page                    | C2, C3, C4   | ✅ Done            |
| PR 10 | Analytics                        | A1, A2       | ✅ Already existed |
| PR 11 | Analytics Competitor             | A3           | ✅ Done            |
| PR 12 | Accessibility                    | Ax1, Ax2     | ✅ Done            |
| PR 13 | Queue Pagination + Accessibility | P1, Ax3      | ✅ Done            |

**Intentionally skipped (low value or blocked):** Q7, V7, O8, S4 — see [Skipped Items](#skipped-items) below.

---

## Area 1 — Drafts Page (`/dashboard/drafts`)

### Issues & Status

| ID  | Tier  | Issue                      | Status                                                                                                 |
| --- | ----- | -------------------------- | ------------------------------------------------------------------------------------------------------ |
| D1  | **C** | No delete button           | ✅ `DeleteDraftButton` — AlertDialog + `DELETE /api/posts/:id` + Sonner toast                          |
| D2  | **H** | Thread depth invisible     | ✅ Thread badge `"Thread · N tweets"` in card header                                                   |
| D3  | **H** | No search or filter        | ✅ Client-side `<Input>` search in `DraftsClient` — filters by first tweet content                     |
| D4  | **H** | No quick Schedule shortcut | ✅ "Schedule" ghost button → `/dashboard/compose?draft=${id}`                                          |
| D5  | **P** | No media indicator         | ✅ `ImageIcon` badge shown when `post.tweets[0].media.length > 0`                                      |
| D6  | **P** | Unhelpful empty draft text | ✅ Changed to "No content yet — click to continue editing"                                             |
| D7  | **P** | No sort controls           | ✅ `<Select>` for sort: "Last edited", "Oldest first", "Longest draft" — client-side in `DraftsClient` |

### Files Modified

- `src/components/drafts/delete-draft-button.tsx` — **new**
- `src/components/drafts/drafts-client.tsx` — **new**
- `src/app/dashboard/drafts/page.tsx` — updated (added media to query, delegates to `DraftsClient`)

---

## Area 2 — Queue Page (`/dashboard/queue`)

### Issues & Status

| ID  | Tier  | Issue                                                 | Status                                                                                         |
| --- | ----- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Q1  | **C** | No inline reschedule                                  | ✅ `RescheduleInlineDialog` — ghost button opens Dialog wrapping existing `ReschedulePostForm` |
| Q2  | **H** | Thread content invisible                              | ✅ `ThreadCollapsible` — "Show thread (N more)" toggle with numbered list                      |
| Q3  | **H** | No bulk approval actions                              | ✅ `BulkApproveButton` — parallel PATCH calls for Approve All / Reject All                     |
| Q4  | **H** | Failed posts have no actionable tip                   | ✅ `getFailureTip()` maps 401/403/rate-limit/duplicate → contextual banner with Settings link  |
| Q5  | **P** | Density toggle causes full page reload                | ✅ Extracted to `QueueContent` client component; toggle is now `useState` — instant, no reload |
| Q6  | **P** | No Edit button on scheduled posts                     | ✅ "Edit" ghost button → `/dashboard/compose?draft=${post.id}`                                 |
| Q7  | **P** | Count badge doesn't show published vs scheduled split | ⏭ Skipped — requires additional DB query; low value                                           |

### Files Modified

- `src/components/queue/reschedule-inline-dialog.tsx` — **new**
- `src/components/queue/thread-collapsible.tsx` — **new**
- `src/components/queue/bulk-approve-button.tsx` — **new**
- `src/components/queue/queue-content.tsx` — **new** (client component; owns density state + all card sections)
- `src/app/dashboard/queue/page.tsx` — refactored to pure data-fetching Server Component

---

## Area 3 — Analytics: Viral Analyzer (`/dashboard/analytics/viral`)

### Issues & Status

| ID  | Tier  | Section                  | Status                                                                                    |
| --- | ----- | ------------------------ | ----------------------------------------------------------------------------------------- |
| V1  | **H** | Top Hashtags             | ✅ Horizontal `ViralBarChart` — engagement % on X axis, top 3 highlighted                 |
| V2  | **H** | Best Hours               | ✅ `ViralHourChart` — 24-slot bar chart, top 3 bars in primary color                      |
| V3  | **H** | Best Days                | ✅ Vertical `ViralBarChart` sorted Mon–Sun, top 2 highlighted                             |
| V4  | **H** | Tweet Length             | ✅ Vertical `ViralBarChart` (3 bars: Short/Medium/Long) replaces Progress bars            |
| V5  | **P** | Content Types            | ✅ Horizontal `ViralBarChart` sorted by engagement                                        |
| V6  | **P** | Top Keywords             | ✅ Horizontal `ViralBarChart`, top 3 highlighted                                          |
| V7  | **P** | Overview stat sparklines | ⏭ Skipped — requires historical `tweet_analytics` data not currently queryable over time |

### Files Modified

- `src/components/analytics/viral-bar-chart.tsx` — **new** (horizontal/vertical, top-N Cell highlighting, custom tooltip)
- `src/components/analytics/viral-hour-chart.tsx` — **new** (24-slot, `parseHour()`, `formatHourLabel()`)
- `src/app/dashboard/analytics/viral/page.tsx` — all badge/list/Progress sections replaced with chart components

---

## Area 4 — Onboarding Wizard (`/dashboard/onboarding`)

### Issues & Status

| ID  | Tier  | Issue                                     | Status                                                                                           |
| --- | ----- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| O1  | **C** | Step 3 native `datetime-local` picker     | ✅ Replaced with `DatePicker` + grouped time `<Select>` (Morning/Afternoon/Evening/Night groups) |
| O2  | **H** | Counter shows `X/1000` instead of `X/280` | ✅ Changed to `X/280`, amber >280, destructive >1000                                             |
| O3  | **H** | Step 2 raw `<textarea>`                   | ✅ Replaced with shadcn `<Textarea>`                                                             |
| O4  | **H** | Step 4 feature cards not clickable        | ✅ All 4 cards wrapped in `<Link>` with real dashboard hrefs                                     |
| O5  | **H** | No Skip on step 3                         | ✅ "Skip — save as draft" ghost button calls `setCurrentStep(4)` without scheduling              |
| O6  | **P** | No autoFocus on step 2 textarea           | ✅ `autoFocus` added                                                                             |
| O7  | **P** | Step 4 only shows 2 feature cards         | ✅ Expanded to 4 cards (AI Writer, Analytics, Inspiration, Queue) in 2×2 grid                    |
| O8  | **P** | Wizard hard-navigates to `/dashboard`     | ⏭ Skipped — hard nav is intentional (forces session refresh after onboarding completes)         |

### Files Modified

- `src/components/onboarding/onboarding-wizard.tsx` — all 7 implemented items
- `src/components/ui/date-picker.tsx` — used (already existed from Phase 1)

---

## Area 5 — Mobile UX Audit (Dashboard Navigation)

### Issues & Status

| ID  | Tier  | Issue                                          | Status                                                                                                               |
| --- | ----- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| M1  | **C** | No bottom navigation bar                       | ✅ `BottomNav` — fixed bottom, `md:hidden`, 3 links + "More" dispatching `sidebar:open`                              |
| M2  | **H** | 17 nav items overwhelming in Sheet             | ✅ `CollapsibleSection` — AI Tools + Analytics collapse on mobile, expand if child is active                         |
| M3  | **H** | Tap targets 40px, below 44px WCAG              | ✅ Mobile links use `py-3` (48px); desktop keeps `py-2.5`                                                            |
| M4  | **H** | Sheet has no swipe-to-close                    | ✅ Replaced Radix Sheet with vaul `DrawerPrimitive.Root direction={sheetSide}` — native swipe gesture on iOS/Android |
| M5  | **P** | Hamburger button too small                     | ✅ Changed to `h-10 w-10` (44px) in `DashboardHeader`                                                                |
| M6  | **P** | Active item low contrast on mobile             | ✅ Mobile active: `bg-primary/15 font-semibold`; desktop: `bg-primary/10`                                            |
| M7  | **P** | Sign Out requires scrolling to bottom in Sheet | ✅ User `Avatar` + name + `LogOut` icon shortcut at top of mobile Drawer; desktop sign-out button unchanged          |

### Files Modified

- `src/components/dashboard/sidebar.tsx` — M2–M4, M6–M7 (vaul Drawer, CollapsibleSection, user avatar header)
- `src/components/dashboard/bottom-nav.tsx` — **new** (M1)
- `src/components/dashboard/dashboard-header.tsx` — M5 (hamburger size)
- `src/app/dashboard/layout.tsx` — renders `<BottomNav />`, `pb-20 md:pb-8` on `<main>`, passes `user` to `<Sidebar>`

---

## Skipped Items

| ID  | Tier | Reason                                                                                                                                                               |
| --- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q7  | P    | Requires an extra `COUNT` query per status; badge already shows total vs limit which is the primary user need                                                        |
| V7  | P    | Sparklines need time-series data — `tweet_analytics` only stores the latest snapshot per tweet, not a daily history. Would require a new `analytics_snapshots` table |
| O8  | P    | Hard navigation after onboarding is intentional — `window.location.href` forces a full session/cookie refresh that `router.push()` would skip                        |

---

## PR History

### PR 1 — Drafts Page ✅ (2026-03-22)

D1 → D2 → D3 → D4 → D5/D6/D7 | `pnpm lint && pnpm typecheck` — 0 errors

### PR 2 — Queue Page ✅ (2026-03-22)

Q1 → Q2 → Q3 → Q4 → Q6 (Q5 deferred to PR 5) | 0 errors

### PR 3 — Analytics Charts + Onboarding ✅ (2026-03-22)

V1–V6 + O1–O7 | Key fix: `exactOptionalPropertyTypes` → conditional spread for recharts `tickFormatter` | 0 errors

### PR 4 — Mobile Navigation ✅ (2026-03-22)

M1 → M2 → M3 → M5/M6 (M4+M7 deferred) | Key fix: removed `useEffect` calling `setIsOpen` — violated `react-hooks/set-state-in-effect`; vaul Drawer unmounts on close so initializer re-runs fresh | 0 errors

### PR 5 — Deferred Items ✅ (2026-03-22)

M4 (vaul Drawer) + M7 (avatar header) + Q5 (density useState) | 0 errors

---

## Phase 3 — Settings Page PR 6 ✅ DONE (2026-03-22)

### Settings Page (`/dashboard/settings`) — S1 + S2

| ID  | Tier  | Issue                                  | Status                                                                                                                           |
| --- | ----- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| S1  | **C** | No in-page reconnect for expired token | ✅ Per-account "Expired" badge + warning banner with "Reconnect" button; calls `signIn.social` OAuth flow                        |
| S2  | **H** | No confirmation before disconnect      | ✅ "Disconnect" ghost button wrapped in `AlertDialog`; calls `DELETE /api/x/accounts/:id`; account removed from state on success |
| S3  | **H** | Health check not surfaced prominently  | ✅ Per-account inline `Activity` icon button; status strip shows ✅/❌ + detail + relative time                                  |
| S4  | **P** | Team invite has no send feedback       | ⏭ Skipped — low value for current scope                                                                                         |

**Files modified (S1 + S2, PR 6):**

- `src/components/settings/connected-x-accounts.tsx` — added `tokenExpiresAt` prop, `isTokenExpired()` helper, expired badge + reconnect banner (S1), disconnect AlertDialog (S2)
- `src/app/api/x/accounts/[id]/route.ts` — **new** `DELETE` handler (ownership-guarded hard delete)

**Files modified (S3, PR 7):**

- `src/app/api/x/health/route.ts` — extended with optional `?accountId` query param; verifies ownership before testing the specific account via `XApiService.getClientForAccountId()`
- `src/components/settings/connected-x-accounts.tsx` — added `HealthStatus` type + `relativeTime()` helper; per-account `Activity` icon button triggers `GET /api/x/health?accountId=xxx`; status strip renders below each account row: `✅ Connected as @username · just now` or `❌ error · 2m ago`; `XHealthCheckButton` removed from card
- `src/app/dashboard/settings/page.tsx` — removed `XHealthCheckButton` import and render (replaced by inline per-account buttons)

`pnpm lint && pnpm typecheck` — 0 errors.

---

## Phase 3 — Calendar Page PR 8 ✅ DONE (2026-03-22)

### Calendar Page (`/dashboard/calendar`) — C1–C4

| ID  | Tier  | Issue                                                              | Status                                                                                                                                                                                 |
| --- | ----- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | **H** | Clicking a date does not open "Create post for this date" shortcut | ✅ `+` button in each day cell header; hover-visible; navigates to `/dashboard/compose?scheduledAt=YYYY-MM-DDT09:00`; Composer reads `?scheduledAt=` to pre-fill `scheduledDate` state |
| C2  | **H** | No drag-to-reschedule on the calendar grid                         | ✅ Already implemented via dnd-kit (`DndContext`, `useDroppable`, `useDraggable`) — drag a post card to any day to reschedule it                                                       |
| C3  | **P** | No color coding by X account                                       | ✅ Per-account color palette (5 hues); `accountColorMap` derived from unique `xAccountId`s in `CalendarView`; applied as `borderLeftColor` inline style on each post card/chip         |
| C4  | **P** | Mobile calendar too small at 375px — date cells overflow           | ✅ Month view renders a compact chip (3px left border + time + truncated content in 10px text); week/day views keep full `Card` layout                                                 |

**Files modified (C1, PR 8):**

- `src/components/calendar/calendar-day.tsx` — added `onDateClick?: (date: Date) => void` prop; `group` class on wrapper; hover-visible `<Plus>` button in day header calls `onDateClick(date)` with `stopPropagation`
- `src/components/calendar/calendar-view.tsx` — added `handleDateClick` that navigates to `/dashboard/compose?scheduledAt=YYYY-MM-DDT09:00`; passed as `onDateClick` to each `CalendarDay`
- `src/components/composer/composer.tsx` — moved `useSearchParams()` before `useState` declarations; `scheduledDate` state initialized from `searchParams?.get("scheduledAt") ?? ""`

**Files modified (C3 + C4, PR 9):**

- `src/components/calendar/calendar-view.tsx` — added `xAccountId?: string | null` to `CalendarPost`; `ACCOUNT_COLORS` palette; `accountColorMap` memo; passed `accountColorMap` + `view` to `CalendarDay` and `DragOverlay`
- `src/components/calendar/calendar-day.tsx` — added `accountColorMap?: Record<string, string>` prop; passes `view` + conditional `accentColor` to each `CalendarPostItem`
- `src/components/calendar/calendar-post-item.tsx` — added `view` + `accentColor` props; month view → compact chip (no Card, no Badge, no GripVertical — just `time · content` truncated); week/day → full Card with `borderLeftColor` from `accentColor`

`pnpm lint && pnpm typecheck` — 0 errors.

---

## Phase 3 — Analytics PR 10 ✅ ALREADY EXISTED (2026-03-22)

| ID  | Tier  | Issue                                          | Status                                                                                                                   |
| --- | ----- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| A1  | **H** | Main analytics page has no charts              | ✅ Already implemented — `FollowerChart` (AreaChart) + `ImpressionsChart` (BarChart) both render trend lines             |
| A2  | **H** | No date range selector — hard-coded to 30 days | ✅ Already implemented — `DateRangeSelector` in the page header; `?range=7d/14d/30d/90d`; enforced to `7d` for free plan |
| A3  | **P** | Competitor page has no comparison chart        | 🔜 Pending                                                                                                               |

No code changes required for A1/A2.

---

## Phase 3 — Analytics A3 PR 11 ✅ DONE (2026-03-22)

| ID  | Tier  | Issue                                   | Status                                                                                                                                                                                                                                     |
| --- | ----- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A3  | **P** | Competitor page has no comparison chart | ✅ Added 4-stat card row (Followers, Tweets Analyzed, Content Types, Top Hashtags); Hashtag Prominence bar chart + Content Mix bar chart using `ViralBarChart`; rank-decay scores (100 → 85 → 72 …) assigned to AI-returned ordered arrays |

**Files modified (A3, PR 11):**

- `src/app/dashboard/analytics/competitor/page.tsx` — added `rankToChartData()` helper; imported `ViralBarChart` + `LayoutGrid`; added stat card row + two `ViralBarChart` panels (hashtags + content types) in the results section

`pnpm lint && pnpm typecheck` — 0 errors.

---

## Phase 3 — Accessibility Pass PR 12 ✅ DONE (2026-03-22)

### Ax1 — Code Accessibility Audit

| Issue                                 | File                       | Fix                                           |
| ------------------------------------- | -------------------------- | --------------------------------------------- |
| Icon-only button no `aria-label`      | `copy-id-button.tsx`       | `aria-label={copied ? "Copied!" : "Copy ID"}` |
| Datetime input no label               | `reschedule-post-form.tsx` | `aria-label="New scheduled date and time"`    |
| Hashtag chip buttons no `aria-label`  | `tweet-card.tsx`           | ``aria-label={`Add hashtag ${tag}`}``         |
| Media preview generic `alt="Preview"` | `tweet-card.tsx`           | ``alt={`${m.fileType} preview`}``             |
| QuickCompose textarea no label        | `quick-compose.tsx`        | `aria-label="Quick compose"`                  |

### Ax2 — Keyboard Navigation Review

Code audit confirmed:

- `bottom-nav.tsx` — `<Link>` elements with descriptive text content; keyboard-navigable natively
- `sidebar.tsx` — nav items all use `<Link>` or `<Button>` with text/aria-label; vaul Drawer handles focus trapping correctly
- Dialog/AlertDialog components use Radix primitives which handle focus management, `aria-modal`, `role="dialog"` automatically
- No code changes required for keyboard navigation

**Files modified (Ax1, PR 12):**

- `src/components/jobs/copy-id-button.tsx` — `aria-label` on icon button
- `src/components/calendar/reschedule-post-form.tsx` — `aria-label` on datetime input
- `src/components/composer/tweet-card.tsx` — `aria-label` on hashtag chips; descriptive `alt` on media preview
- `src/components/dashboard/quick-compose.tsx` — `aria-label` on textarea

`pnpm lint && pnpm typecheck` — 0 errors.

---

## Phase 3 — Queue Pagination + Accessibility PR 13 ✅ DONE (2026-03-22)

### P1 — Queue Pagination

| ID  | Tier  | Issue                                                          | Status                                                                                                               |
| --- | ----- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| P1  | **H** | Queue serializes all scheduled posts to client — no pagination | ✅ Server-side pagination; `?page=N` URL param; 20 posts per page; Prev/Next `Link` buttons + "X–Y of Z posts" label |

**Files modified (P1):**

- `src/app/dashboard/queue/page.tsx` — added `searchParams` prop; `SCHEDULED_PAGE_SIZE = 20`; `Promise.all` parallel count queries; `limit: PAGE_SIZE + 1` + `offset: page * PAGE_SIZE`; passes `scheduledPage`, `hasMoreScheduled`, `totalScheduled` to `QueueContent`
- `src/components/queue/queue-content.tsx` — added `scheduledPage`, `hasMoreScheduled`, `totalScheduled` props; Prev/Next `<Link>` buttons + "X–Y of Z posts" label rendered below scheduled posts list

### Ax3 — `aria-live` for Queue Realtime Updates

| ID  | Tier  | Issue                                                                     | Status                                                                                                                                                      |
| --- | ----- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ax3 | **P** | `QueueRealtimeListener` shows toast but has no screen-reader announcement | ✅ Added `announcement` state; hidden `<div aria-live="polite" aria-atomic="true">` renders announcement text when SSE fires `completed` or `failed` events |

**Files modified (Ax3):**

- `src/components/queue/queue-realtime-listener.tsx` — added `useState` for `announcement`; set on each SSE event; returns `<div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>` instead of `null`

`pnpm lint && pnpm typecheck` — 0 errors.

---

## Suggested Next Steps — Phase 3 (Remaining)

Phase 3 is now **complete**. All audit items have been addressed or intentionally deferred.

### Optional Polish Items

- **P2 [H]**: Viral Analyzer has no loading skeleton between time-range changes — add `isPending` state during refetch
- **P3 [P]**: Bottom nav re-renders on every route change — wrap icon components in `memo` if profiling shows it

---

## Recommended Next PR

**The UX Audit is complete.** All Critical and High-impact items have been resolved across all pages.

Optional remaining work: P2 (Viral Analyzer loading skeleton) — low priority unless users report flickering on slow connections.
