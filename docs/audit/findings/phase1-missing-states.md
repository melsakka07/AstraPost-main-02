# Phase 1 — Missing UI States Audit

## Summary

| State                           | Pages with Issue                             | Severity |
| ------------------------------- | -------------------------------------------- | -------- |
| No loading.tsx at all           | 22 pages                                     | High     |
| No error.tsx at all             | 42 pages                                     | High     |
| Empty state missing or weak     | 15 pages                                     | Medium   |
| Stale/wrong loading skeleton    | 14 pages (AI sub-pages + settings sub-pages) | Medium   |
| Global error/404 not i18n-aware | 2 files (applies to ALL pages)               | High     |

---

## 1. Marketing Pages (12 pages) — No loading.tsx on any page

All 12 marketing routes rely on the single global `src/app/error.tsx` and `src/app/not-found.tsx`, both of which have **hardcoded English strings only** and **no RTL support**.

### 1.1 Global Error Boundary — Hardcoded English

**File:** `src/app/error.tsx` (41 lines)
**Issue:** All text hardcoded in English:

- "Something went wrong" (line 25)
- "An unexpected error occurred..." (lines 26-28)
- "Error ID:" (line 30)
- "Try again" (line 33)
- "Go home" (line 34)
  **Fix:** Add `useTranslations("errors")` and replace all hardcoded strings with `t()` calls. The `errors` namespace already has keys like `something_wrong`, `try_again`.

### 1.2 Global Not-Found — Hardcoded English

**File:** `src/app/not-found.tsx` (28 lines)
**Issue:** All text hardcoded in English, no i18n, no RTL:

- "404" (line 12)
- "Page Not Found" (line 13)
- "The page you're looking for doesn't exist or has been moved." (lines 14-15)
- "Go home" (line 19)
- "Dashboard" (line 22)
  **Fix:** Convert to client component with `useTranslations`, or pass translations via layout. Add translations for all 5 strings in the `errors` namespace.

### 1.3 Blog Post — No Loading State During MDX Compilation

**File:** `src/app/(marketing)/blog/[slug]/page.tsx`
**Issue:** MDX is compiled at request time via `next-mdx-remote/serialize`. No `loading.tsx` exists. Users see nothing while the MDX compiles.
**Fix:** Add `loading.tsx` with a blog post skeleton (title bar + prose content skeleton).

### 1.4 Blog Post Client — Floating Share Button Wrong Position in RTL

**File:** `src/app/(marketing)/blog/[slug]/blog-post-client.tsx` line 129
**Issue:** Share button uses `fixed right-6 bottom-6` — should use `end-6` for RTL.
**Fix:** Change to `fixed end-6 bottom-6`.

### 1.5 Docs Search Input — Decorative Only

**File:** `src/app/(marketing)/docs/page.tsx`
**Issue:** `<Input type="search">` has no form, no onSubmit handler, no state — purely decorative.
**Fix:** Either wire up search functionality or add a "Coming Soon" badge to clarify it's not functional.

### 1.6 Blog Newsletter Form — Decorative Only

**File:** `src/app/(marketing)/blog/page.tsx`
**Issue:** Email input and Subscribe button exist with no form submission logic.
**Fix:** Wire up to an API endpoint or add disabled state with "Coming Soon" text.

---

## 2. Auth Pages (4 pages) — No loading.tsx or error.tsx

**Files:** All 4 auth pages under `src/app/(auth)/`

- `/login` — No loading.tsx, no error.tsx
- `/register` — No loading.tsx, no error.tsx
- `/forgot-password` — No loading.tsx, no error.tsx
- `/reset-password` — No loading.tsx, no error.tsx

**Issue:** Auth pages handle loading/error internally in their client components, but there's no per-route error boundary. Errors propagate to the global `src/app/error.tsx` which has hardcoded English.

**Fix:** Add `error.tsx` to `src/app/(auth)/error.tsx` using the `errors` namespace for i18n. Add `loading.tsx` for the session-check loading state.

### 2.1 Reset Password — Password Toggle Button Too Small

**File:** `src/app/(auth)/reset-password/page.tsx` line 153
**Issue:** Password visibility toggle button at `right-3` (physical) with no explicit size — ~24px, below 44px touch target.
**Fix:** Change to `end-3` and add `h-10 w-10` for minimum 40px touch target.

### 2.2 Register — Non-Logical Spacing

**File:** `src/app/(auth)/register/page.tsx` line 194
**Issue:** `space-x-3` on checkbox row — should be `space-x-3 rtl:space-x-reverse`.
**Fix:** Add `rtl:space-x-reverse`.

---

## 3. Dashboard Core (13 pages)

### 3.1 Missing error.tsx — 7 routes

These routes have loading.tsx but NO error.tsx:

- `/dashboard/drafts` — falls through to dashboard-level error.tsx
- `/dashboard/achievements` — falls through to dashboard-level
- `/dashboard/referrals` — falls through to dashboard-level
- `/dashboard/affiliate` — falls through to dashboard-level
- `/dashboard/inspiration` — falls through to dashboard-level
- `/dashboard/analytics/competitor` — no error.tsx at all (client component)
- `/dashboard/analytics/viral` — no error.tsx at all (client component)

**Files to create:** `error.tsx` in each of the 7 route directories following the canonical pattern from `src/app/dashboard/error.tsx`.

### 3.2 Missing loading.tsx — 1 route

- `/dashboard/onboarding` — wraps `<OnboardingWizard>` in `<Suspense>` with default fallback (no custom skeleton)

**Fix:** Add `loading.tsx` matching the onboarding wizard skeleton.

### 3.3 Dashboard Home Page — Physical Border Classes (RTL Bug)

**File:** `src/app/dashboard/page.tsx`
**Issue:** Lines 147, 154, 161, 168, 259: `border-l-4 border-l-emerald-500` etc. — should use logical `border-s-4 border-s-emerald-500`.
**Fix:** Replace `border-l-` with `border-s-` on all 5 occurrences. Also `mr-2` at lines 230, 303, 309 → `me-2`.

### 3.4 Dashboard Drafts — Physical Margin

**File:** `src/app/dashboard/drafts/page.tsx` line 42
**Issue:** `mr-2` on Plus icon → should be `me-2`.
**Fix:** Change to `me-2`.

### 3.5 Dashboard Calendar — Physical Margin

**File:** `src/app/dashboard/calendar/page.tsx` line 79
**Issue:** `mr-2` on PlusCircle icon → should be `me-2`.
**Fix:** Change to `me-2`.

### 3.6 Referrals — Physical Padding

**File:** `src/app/dashboard/referrals/page.tsx` line 155
**Issue:** `pl-4` on list → should be `ps-4`.
**Fix:** Change to `ps-4`.

### 3.7 Competitor Analytics — 40+ Hardcoded English Strings

**File:** `src/app/dashboard/analytics/competitor/page.tsx`
**Issue:** ~40+ strings hardcoded in English including: "Analyzing...", "Analyze", "Enter a public X username to analyze", all chart section headers, "Followers", "Tweets Analyzed", "Top Hashtags", "Compare with Your Account", "Best Posting Times", "Strategic Summary", "Topics, Hashtags & Insights", all tone/language labels.
**Fix:** Replace all with `t()` calls from the `analytics_competitor` namespace (currently has only 11 keys — needs expansion).

### 3.8 Viral Analytics — 20+ Hardcoded English Strings

**File:** `src/app/dashboard/analytics/viral/page.tsx`
**Issue:** ~20+ strings hardcoded including: date range labels, "Analyzing...", "Analyze", "Export", "Copy as Markdown", "Download CSV", section headers, action plan text.
**Fix:** Expand `analytics_viral` namespace from 24 keys and replace all hardcoded strings with `t()`.

### 3.9 Analytics Page — Hardcoded Upgrade CTA Text

**File:** `src/app/dashboard/analytics/page.tsx`
**Issue:** ~10 hardcoded English strings for upgrade CTAs and blur descriptions (lines 320-321, 393, 399, 556, 563, 567, 584, 597).
**Fix:** Replace with `t()` from `analytics` namespace.

### 3.10 Inspiration — Touch Target Issues

**File:** `src/app/dashboard/inspiration/page.tsx`
**Issue:** Bookmark/Clear buttons at `h-8 w-8 sm:h-10 sm:w-10` — 32px on mobile, below 44px. History action buttons at `h-7` (28px).
**Fix:** Bump min size to `h-10 w-10` on mobile.

---

## 4. AI Tools (7 pages)

### 4.1 AI Sub-Pages Inherit Wrong Loading Skeleton

**Issue:** All 6 sub-pages (writer, reply, calendar, bio, agentic, history) inherit `src/app/dashboard/ai/loading.tsx` which shows the AI Hub landing skeleton (7 tool cards + quota meter). This skeleton does not match ANY sub-page layout.
**Fix:** Create individual `loading.tsx` for each sub-page matching its specific layout:

- `ai/writer/loading.tsx` — tabs + config panel + result area skeleton
- `ai/reply/loading.tsx` — URL input + preview + results skeleton
- `ai/calendar/loading.tsx` — config + weekly grid skeleton
- `ai/bio/loading.tsx` — config + bio cards skeleton
- `ai/agentic/loading.tsx` — topic input + pipeline skeleton
- `ai/history/loading.tsx` — table/list skeleton

### 4.2 AI Calendar — Nearly All Text Hardcoded

**File:** `src/app/dashboard/ai/calendar/page.tsx`
**Issue:** Lines 332-333, 340, 347, 354, 360-369, 375, 381-386, 393, 409, 434, 438, 451-452, 457, 489-491, 497, 574-577, 582-583, 587-588, 594-596, 606-608, 631-633, 642-643, 656-662 — the vast majority of user-facing text is hardcoded English.
**Fix:** Replace all hardcoded strings with `t()` calls. Expand `ai_calendar` namespace as needed.

### 4.3 AI History — No i18n At All

**File:** `src/app/dashboard/ai/history/page.tsx`
**Issue:** The entire page has zero i18n. Every string is hardcoded English:

- "AI Generation History" (line 26)
- "Review and reuse your past AI-generated content." (line 27)
- "New Content" (line 30)
- "No history yet" (line 39)
- "Start using the AI tools..." (line 40)
- "Go to Composer" (line 41)
- "Reuse", "Prompt", "Output" (lines 54, 64, 75)
  **Fix:** Add `getTranslations("ai_history")` — the namespace already has 11 keys defined. Replace all hardcoded strings with `t()`.

### 4.4 AI Writer — Hardcoded Language/Tone Labels

**File:** `src/app/dashboard/ai/writer/page.tsx`
**Issue:** Language names (Arabic, English, French, etc.) hardcoded at lines 481, 801-805, 816-825. Tone labels hardcoded at lines 794, 801-805. URL tab empty state hardcoded at lines 962-967.
**Fix:** Use language constants from `@/lib/constants` or add translation keys for all language/tone names.

### 4.5 AI Bio — Physical Positioning for Char Count

**File:** `src/app/dashboard/ai/bio/page.tsx` line 152
**Issue:** `absolute right-2 bottom-2` — should be `end-2` for RTL.
**Fix:** Change to `absolute end-2 bottom-2`.

### 4.6 AI Reply — Hardcoded Language Names

**File:** `src/app/dashboard/ai/reply/page.tsx` lines 226-235
**Issue:** Language names hardcoded in SelectItem children.
**Fix:** Add translation keys for all language names.

### 4.7 Agentic Posting — Hardcoded Suggestions and Toasts

**File:** `src/components/ai/agentic-posting-client.tsx`
**Issue:** Lines 103-108: DEFAULT_SUGGESTIONS hardcoded. Lines 484-487, 531-543, 439-441: Toast messages hardcoded.
**Fix:** Move suggestions to translations or constants. Use `t()` for all toast messages.

### 4.8 Agentic Trends Panel — No i18n At All

**File:** `src/components/ai/agentic-trends-panel.tsx`
**Issue:** All strings hardcoded: category labels (lines 27-33), "Trending on X" (line 136), "· Updated {timeAgo}" (line 139), "Show"/"Hide"/"Retry"/"Post" (lines 146, 250), error message (line 196).
**Fix:** Add `useTranslations` and replace all strings. This component has zero i18n integration.

### 4.9 Agentic Posting — Physical Positioning

**File:** `src/components/ai/agentic-posting-client.tsx`
**Issue:** Line 1330: `absolute top-full left-5` → should be `start-5`. Line 1400: `right-0 bottom-0 left-0` → should be `start-0 end-0`.
**Fix:** Replace physical positioning with logical equivalents.

### 4.10 AI Writer — Tiny Copy Buttons

**File:** `src/app/dashboard/ai/writer/page.tsx` line 697
**Issue:** Copy icon buttons at `h-6 w-6` (24px) — severely below 44px touch target.
**Fix:** Bump to `h-10 w-10` min on mobile with `min-h-[44px] min-w-[44px]`.

---

## 5. Settings Pages (7 pages)

### 5.1 Settings Loading Skeleton is Stale

**File:** `src/app/dashboard/settings/loading.tsx`
**Issue:** Written for an old combined single-page settings layout. References `#profile`, `#subscription`, `#accounts`, `#voice`, `#notifications`, `#privacy` scroll anchors that no longer exist in the current tabbed layout.
**Fix:** Rewrite to match current sub-page layouts, or create individual `loading.tsx` per settings sub-page.

### 5.2 Team Settings — Physical Margin

**File:** `src/app/dashboard/settings/team/page.tsx` line 128
**Issue:** `ml-1` on upgrade CTA button → should be `ms-1`.
**Fix:** Change to `ms-1`.

---

## 6. Dashboard Utilities (4 pages)

### 6.1 Dashboard Jobs — No loading.tsx or error.tsx

**File:** `src/app/dashboard/jobs/page.tsx`
**Issue:** No loading skeleton or error boundary. ~25+ hardcoded English strings despite importing `getTranslations("jobs")`.
**Fix:** Add `loading.tsx` and `error.tsx`. Replace all hardcoded strings with `t()`.

### 6.2 Join Team — No loading.tsx or error.tsx

**File:** `src/app/join-team/page.tsx`
**Issue:** Has inline Suspense but no dedicated loading.tsx or error.tsx.
**Fix:** Add `loading.tsx` and `error.tsx`.

### 6.3 Profile — No loading.tsx or error.tsx

**File:** `src/app/profile/page.tsx`
**Issue:** Client component shows text "Loading..." via `t("loading")` but no skeleton. No error.tsx.
**Fix:** Add `loading.tsx` with profile skeleton and `error.tsx`.

### 6.4 Chat — Copy Button Too Small

**File:** `src/app/chat/page.tsx` line 203
**Issue:** Copy button is plain `<button className="hover:bg-muted rounded p-1">` with h-3.5 w-3.5 icon — ~22px total, severely below 44px.
**Fix:** Add `min-h-[44px] min-w-[44px]` or use `Button variant="ghost" size="icon"`.

---

## 7. Admin Pages (20 pages)

### 7.1 Zero i18n on All Admin Pages

**Issue:** All 20 admin pages have zero i18n integration. All page titles, descriptions, buttons, labels, empty states, and metadata are hardcoded in English. No admin page calls `getTranslations()` or `useTranslations()`.

**Fix:** Admin pages are internal-only for English-speaking admins. This is a **Deferred** item — not launch-blocking but should be tracked.

### 7.2 Admin Webhooks — No loading.tsx

**File:** `src/app/admin/webhooks/page.tsx`
**Issue:** Only admin page missing loading.tsx.
**Fix:** Add `loading.tsx`.

### 7.3 Admin Roadmap — Missing Metadata Export

**File:** `src/app/admin/roadmap/page.tsx`
**Issue:** No `export const metadata` — page has no SEO title.
**Fix:** Add metadata export.

### 7.4 Admin Webhooks — Hardcoded Color

**File:** `src/app/admin/webhooks/page.tsx` line 63
**Issue:** Uses `text-red-500` instead of semantic `text-destructive`.
**Fix:** Change to `text-destructive`.

### 7.5 Admin Webhooks — Physical text-align

**File:** `src/app/admin/webhooks/page.tsx` lines 51-54, 84-87
**Issue:** `text-left` on table headers → should be `text-start`.
**Fix:** Replace with `text-start`.

---

## 8. Shared Components

### 8.1 Sign-Out Button — No i18n

**File:** `src/components/auth/sign-out-button.tsx`
**Issue:** "Sign out" (line 28) and "Loading..." (line 12) hardcoded English. No i18n at all.
**Fix:** Add `useTranslations("auth")` and replace strings.

### 8.2 User Profile — No i18n

**File:** `src/components/auth/user-profile.tsx`
**Issue:** "Sign in" (line 42), "Sign up" (line 46), "User" (alt text, line 64), "Your Profile" (line 85), "Log out" (line 91) — all hardcoded English.
**Fix:** Add `useTranslations("auth")` and replace all strings. Also fix `mr-2` → `me-2` at lines 84, 90.

### 8.3 BottomNav — Physical Positioning

**File:** `src/components/dashboard/bottom-nav.tsx` line 33
**Issue:** `fixed right-0 bottom-0 left-0` → should be `fixed start-0 end-0 bottom-0`.
**Fix:** Replace physical positioning. Also ensure labels are translated (currently uses `t(label.toLowerCase())` which may miss translations).

### 8.4 Admin Sidebar — Physical Positioning

**File:** `src/components/admin/sidebar.tsx`
**Issue:** Line 108: `left-0 border-r` → `start-0 border-e`. Line 119: `ml-auto` → `ms-auto`. Lines 139, 173: `mr-2` → `me-2`. Line 150: `left-4` → `start-4`. "Admin" and "Back to App" hardcoded at lines 115, 140, 174.
**Fix:** Replace physical positioning with logical equivalents. Add i18n for sidebar text.

### 8.5 Chat Loading Skeleton — Physical Margin

**File:** `src/app/chat/loading.tsx` lines 22, 23
**Issue:** `ml-auto` → should be `ms-auto`.
**Fix:** Replace with `ms-auto`.
