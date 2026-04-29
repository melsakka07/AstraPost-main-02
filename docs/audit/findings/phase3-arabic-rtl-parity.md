# Phase 3 — Arabic / RTL Parity Audit

## Summary

| Issue Type                                | Count                              | Severity   |
| ----------------------------------------- | ---------------------------------- | ---------- |
| Hardcoded English strings (not using t()) | 150+ strings across 15+ components | Critical   |
| Physical CSS classes (should be logical)  | 50+ occurrences across 20+ files   | High       |
| Missing rtl: Tailwind variants            | 40+ pages have zero rtl: usage     | High       |
| Directional icon not flipping in RTL      | 5+ icon types                      | Medium     |
| Fixed-direction content not isolated      | 8 locations                        | Medium     |
| Arabic typography issues                  | 3 locations                        | Low-Medium |
| Date/time/number formatting               | 2 locations                        | Low        |

---

## 1. Hardcoded English Strings — Critical i18n Gaps

### 1.1 Global Error Boundary (Affects ALL 69 pages)

**File:** `src/app/error.tsx`
**Issue:** "Something went wrong", "An unexpected error occurred...", "Error ID:", "Try again", "Go home" — all hardcoded English.
**Fix:** Add `"use client"` + `useTranslations("errors")`. The `errors` namespace already has keys: `something_wrong`, `try_again`, `go_home`.

### 1.2 Global Not-Found Page (Affects ALL 69 pages)

**File:** `src/app/not-found.tsx`
**Issue:** "404", "Page Not Found", "The page you're looking for doesn't exist or has been moved.", "Go home", "Dashboard" — all hardcoded English.
**Fix:** Convert to client component with i18n. Add translation keys to `errors` namespace.

### 1.3 Sign-Out Button — Zero i18n

**File:** `src/components/auth/sign-out-button.tsx`
**Issue:** "Sign out" and "Loading..." hardcoded. No i18n at all.
**Fix:** Add `useTranslations("auth")` — namespace has `sign_out` and `loading` keys.

### 1.4 User Profile Widget — Zero i18n

**File:** `src/components/auth/user-profile.tsx`
**Issue:** "Sign in" (line 42), "Sign up" (line 46), "User" alt text (line 64), "Your Profile" (line 85), "Log out" (line 91) — all hardcoded.
**Fix:** Add `useTranslations("auth")` and/or `useTranslations("nav")`.

### 1.5 Competitor Analytics — 40+ Hardcoded Strings

**File:** `src/app/dashboard/analytics/competitor/page.tsx`
**Issue:** Nearly every visible string is hardcoded English. The `analytics_competitor` namespace has only 11 keys. Missing include: all chart section headers, "Analyzing...", "Analyze", "Followers", "Tweets Analyzed", "Top Hashtags", "Compare with Your Account", "Best Posting Times", "Strategic Summary", "Topics, Hashtags & Insights", all tone/language names.
**Fix:** Expand namespace and replace all hardcoded strings with `t()`.

### 1.6 Viral Analytics — 20+ Hardcoded Strings

**File:** `src/app/dashboard/analytics/viral/page.tsx`
**Issue:** Date range labels, analysis button text, export menu items, all section headers, action plan text hardcoded.
**Fix:** Expand `analytics_viral` namespace and replace with `t()`.

### 1.7 Analytics Page — Hardcoded Upgrade CTAs

**File:** `src/app/dashboard/analytics/page.tsx`
**Issue:** ~10 hardcoded English upgrade CTA strings including "Unlock Advanced Analytics", all blur overlay descriptions.
**Fix:** Replace with `t()` from `analytics` namespace.

### 1.8 AI Calendar — Near-Total i18n Failure

**File:** `src/app/dashboard/ai/calendar/page.tsx`
**Issue:** ~80% of visible strings are hardcoded English. Page title, description, config labels, tone options, language names, empty state, schedule dialog, toast messages — all hardcoded.
**Fix:** Replace all with `t()` from `ai_calendar` namespace (needs expansion from 31 keys).

### 1.9 AI History — Zero i18n Integration

**File:** `src/app/dashboard/ai/history/page.tsx`
**Issue:** Entire page has no i18n despite the `ai_history` namespace already having 11 keys defined. Page doesn't import `getTranslations` at all.
**Fix:** Add `getTranslations("ai_history")` and use existing translation keys.

### 1.10 Agentic Trends Panel — Zero i18n

**File:** `src/components/ai/agentic-trends-panel.tsx`
**Issue:** All category labels, "Trending on X", "· Updated {timeAgo}", "Show"/"Hide"/"Retry"/"Post", error message — all hardcoded.
**Fix:** This component has no `useTranslations` at all. Add full i18n integration.

### 1.11 AI Writer — Language/Tone Labels

**File:** `src/app/dashboard/ai/writer/page.tsx`
**Issue:** Language names (Arabic, English, French, German, Spanish, Italian, Portuguese, Turkish, Russian, Hindi) hardcoded in SelectItem children at lines 481, 801-805, 816-825. Tone labels at lines 794, 801-805. URL tab empty state at lines 962-967.
**Fix:** Add translation keys for language names and tone values.

### 1.12 AI Reply — Language Names

**File:** `src/app/dashboard/ai/reply/page.tsx` lines 226-235
**Issue:** Language names hardcoded in SelectItem children.
**Fix:** Same as AI Writer — use translation keys.

### 1.13 AI Bio — Language Names

**File:** `src/app/dashboard/ai/bio/page.tsx` lines 199-208
**Issue:** Language names hardcoded.
**Fix:** Use translation keys.

### 1.14 Agentic Posting — Suggestion Chips + Toast Messages

**File:** `src/components/ai/agentic-posting-client.tsx`
**Issue:** DEFAULT_SUGGESTIONS array hardcoded (lines 103-108). Toast messages at lines 484-487, 531-543, 439-441 hardcoded.
**Fix:** Use `t()` for all user-facing strings.

### 1.15 Dashboard Jobs — 25+ Hardcoded Strings

**File:** `src/app/dashboard/jobs/page.tsx`
**Issue:** "Filter Jobs", "Status", "All statuses", all status/queue labels, "Search", "Apply Filters", "No jobs found", pagination labels — all hardcoded despite importing `getTranslations("jobs")`.
**Fix:** Replace all with `t()`.

### 1.16 Admin Pages — Zero i18n (Deferred)

**Issue:** All 20 admin pages have zero i18n. Titles, descriptions, buttons, labels, empty states all hardcoded English. Admin interface is internal-only.
**Verdict:** Deferred — not launch-blocking for Arabic-speaking end users.

### 1.17 Chat — Hardcoded Locale

**File:** `src/app/chat/page.tsx` line 176
**Issue:** `"en-US"` hardcoded for `Intl.DateTimeFormat`.
**Fix:** Use user's locale from session or accept-language header.

---

## 2. Physical CSS Classes — Must Convert to Logical

### 2.1 Marketing Pages

| File                 | Line | Physical                 | Logical Fix            |
| -------------------- | ---- | ------------------------ | ---------------------- |
| blog-post-client.tsx | 129  | `fixed right-6 bottom-6` | `fixed end-6 bottom-6` |

### 2.2 Auth Pages

| File                     | Line | Physical    | Logical Fix                     |
| ------------------------ | ---- | ----------- | ------------------------------- |
| register/page.tsx        | 228  | `mr-2`      | `me-2`                          |
| register/page.tsx        | 194  | `space-x-3` | `space-x-3 rtl:space-x-reverse` |
| forgot-password/page.tsx | 89   | `mr-2`      | `me-2`                          |
| reset-password/page.tsx  | 153  | `right-3`   | `end-3`                         |
| reset-password/page.tsx  | 180  | `mr-2`      | `me-2`                          |

### 2.3 Dashboard Core

| File                          | Line                    | Physical           | Logical Fix        |
| ----------------------------- | ----------------------- | ------------------ | ------------------ |
| dashboard/page.tsx            | 147, 154, 161, 168, 259 | `border-l-{color}` | `border-s-{color}` |
| dashboard/page.tsx            | 230, 303, 309           | `mr-2`             | `me-2`             |
| dashboard/drafts/page.tsx     | 42                      | `mr-2`             | `me-2`             |
| dashboard/calendar/page.tsx   | 79                      | `mr-2`             | `me-2`             |
| dashboard/referrals/page.tsx  | 155                     | `pl-4`             | `ps-4`             |
| analytics/competitor/page.tsx | 179                     | `left-3`           | `start-3`          |
| analytics/competitor/page.tsx | 187                     | `pl-7`             | `ps-7`             |
| analytics/viral/page.tsx      | 533                     | `text-right`       | `text-end`         |

### 2.4 AI Tools

| File                       | Line   | Physical                    | Logical Fix               |
| -------------------------- | ------ | --------------------------- | ------------------------- |
| ai/bio/page.tsx            | 152    | `absolute right-2 bottom-2` | `absolute end-2 bottom-2` |
| ai/history/page.tsx        | 31, 64 | `mr-2`                      | `me-2`                    |
| agentic-posting-client.tsx | 1330   | `left-5`                    | `start-5`                 |
| agentic-posting-client.tsx | 1400   | `right-0 ... left-0`        | `start-0 ... end-0`       |
| agentic-trends-panel.tsx   | 142    | `ml-auto`                   | `ms-auto`                 |

### 2.5 Settings

| File                   | Line | Physical | Logical Fix |
| ---------------------- | ---- | -------- | ----------- |
| settings/team/page.tsx | 128  | `ml-1`   | `ms-1`      |

### 2.6 Dashboard Utilities

| File                    | Line          | Physical             | Logical Fix         |
| ----------------------- | ------------- | -------------------- | ------------------- |
| dashboard/jobs/page.tsx | 210           | `border-l-2 pl-3`    | `border-s-2 ps-3`   |
| profile/page.tsx        | 99            | `mr-1`               | `me-1`              |
| profile/page.tsx        | 211, 224, 237 | `mr-2`               | `me-2`              |
| chat/page.tsx           | 28, 31        | `ml-5`               | `ms-5`              |
| chat/page.tsx           | 45            | `border-l-2 pl-3`    | `border-s-2 ps-3`   |
| chat/page.tsx           | 75            | `text-left`          | `text-start`        |
| chat/page.tsx           | 432           | `mr-2`               | `me-2`              |
| chat/loading.tsx        | 22, 23        | `ml-auto`            | `ms-auto`           |
| bottom-nav.tsx          | 33            | `right-0 ... left-0` | `start-0 ... end-0` |

### 2.7 Shared Components

| File                    | Line         | Physical          | Logical Fix        |
| ----------------------- | ------------ | ----------------- | ------------------ |
| auth/user-profile.tsx   | 84, 90       | `mr-2`            | `me-2`             |
| admin/sidebar.tsx       | 108          | `left-0 border-r` | `start-0 border-e` |
| admin/sidebar.tsx       | 119          | `ml-auto`         | `ms-auto`          |
| admin/sidebar.tsx       | 139, 173     | `mr-2`            | `me-2`             |
| admin/sidebar.tsx       | 150          | `left-4`          | `start-4`          |
| admin/jobs/page.tsx     | 143          | `ml-2`            | `ms-2`             |
| admin/webhooks/page.tsx | 51-54, 84-87 | `text-left`       | `text-start`       |

---

## 3. Missing rtl: Tailwind Variants — Directional Icons

### 3.1 Only ONE Component Uses rtl:scale-x-[-1]

The entire dashboard has exactly **one** `rtl:scale-x-[-1]` usage (inspiration/page.tsx line 438 on ArrowRight). All other arrow/chevron icons across 69 pages do NOT flip in RTL.

**Affected patterns across all pages:**

- Back buttons (profile, settings, admin, auth)
- Expand/collapse chevrons (sidebar sections, collapsible cards)
- Navigation arrows (pagination, carousels, "Next" links)
- External link indicators
- Breadcrumb separators
- "Learn more" link arrows (marketing pages already have `rtl:scale-x-[-1]` in most cases)

**Fix:** Add `rtl:scale-x-[-1]` to ALL directional icons:

- `ChevronLeft` → `rtl:scale-x-[-1]`
- `ChevronRight` → `rtl:scale-x-[-1]`
- `ArrowLeft` → `rtl:scale-x-[-1]`
- `ArrowRight` → `rtl:scale-x-[-1]`
- `ArrowUpRight` / `ExternalLink` → no flip needed (universal direction)
- Breadcrumb `ChevronRight` separators → `rtl:scale-x-[-1]`

### 3.2 Marketing Pages with NO rtl: Variants

These pages have zero `rtl:` Tailwind variants — all chevron/arrow icons won't flip:

- `/community` — back links, expand/collapse arrows
- `/changelog` — timeline arrows
- `/roadmap` — navigation arrows
- `/legal/terms` — none needed (mostly text)
- `/legal/privacy` — none needed (mostly text)

**Fix:** Audit each page for directional icons and add `rtl:scale-x-[-1]`.

---

## 4. Fixed-Direction Content Not Isolated with dir="ltr"

### 4.1 Email Addresses

**Files:** Multiple marketing pages (community, resources, docs, legal)
**Issue:** Email addresses like `support@astrapost.app` rendered in RTL context without `dir="ltr"`.
**Fix:** Wrap all email addresses in `<span dir="ltr">`.

### 4.2 URLs and Social Handles

**File:** `src/app/dashboard/inspiration/page.tsx` lines 612, 622
**Issue:** `https://x.com/${username}/status/${id}` URLs rendered without `dir="ltr"`.
**Fix:** Wrap in `<span dir="ltr">`.

### 4.3 Version Numbers

**File:** `src/app/(marketing)/changelog/page.tsx`
**Issue:** Version strings like "v1.2.0" rendered without isolation.
**Fix:** Wrap in `<span dir="ltr">`.

### 4.4 Stats and Numbers

**File:** Multiple marketing pages
**Issue:** Numbers like "2,500+", "1,200+", "50,000+" in community page rendered without `dir="ltr"`.
**Fix:** Wrap stat numbers in `<span dir="ltr">`.

### 4.5 Code and Technical Strings

**File:** `src/app/chat/page.tsx`
**Issue:** Code blocks in chat messages rendered without `dir="ltr"`.
**Fix:** Add `dir="ltr"` to all `<code>` and `<pre>` elements.

### 4.6 Placeholder URLs

**Files:** Multiple AI tool pages
**Issue:** Placeholder URLs like `https://amazon.com/product...` and `https://x.com/username/status/...` rendered without isolation.
**Fix:** These are in input placeholders — already in LTR context within inputs (inputs inherit direction). No fix needed.

---

## 5. Arabic Typography Issues

### 5.1 Descender Clipping Mitigation Present

**File:** `src/app/globals.css` lines 990-1018
**Status:** Arabic descender clipping fix already applied via `[dir="rtl"]` heading line-height overrides. Good.

### 5.2 Mixed Arabic + English Hashtag Rendering

**Issue:** Not specifically tested. Arabic text with English hashtags (common in MENA tweets) may have BiDi ordering issues.
**Fix:** Use `dir="auto"` on user-generated content containers. Already partially implemented (user-profile.tsx uses `dir="auto"` on names, agentic posting uses it on usernames).

### 5.3 Arabic Font Fallback

**Issue:** Verify the Arabic font stack in globals.css includes proper Arabic fonts before the Latin fallback.
**Action:** Check `fontFamily` configuration — should list Arabic-optimized fonts first for Arabic locale.

---

## 6. Date / Time / Number Formatting

### 6.1 Chat Timestamps

**File:** `src/app/chat/page.tsx` line 176
**Issue:** `Intl.DateTimeFormat("en-US", ...)` — hardcoded to English locale.
**Fix:** Use user's locale: `Intl.DateTimeFormat(userLocale, ...)`.

### 6.2 Inspiration History Dates

**File:** `src/app/dashboard/inspiration/page.tsx` line 598
**Issue:** `date-fns` locale switching for ar/en — this IS correctly implemented. Good.

### 6.3 Analytics Date Formatting

**File:** `src/app/dashboard/analytics/page.tsx` line 65
**Issue:** `userLocale` extracted but only used for number formatting. Date axes may still use English month names.
**Fix:** Verify chart date axes use `userLocale` for month/day names.

---

## 7. Sidebar Navigation Mirroring

### 7.1 Dashboard Sidebar

**File:** `src/components/dashboard/sidebar.tsx` lines 352-395
**Status:** Correctly detects `document.documentElement.dir` for mobile drawer positioning. Desktop uses `md:sticky` which works with CSS `dir` attribute. Good.

### 7.2 Admin Sidebar

**File:** `src/components/admin/sidebar.tsx`
**Issue:** Mobile Sheet uses `side="left"` which works correctly with RTL-aware SheetPrimitive. Desktop sidebar uses `left-0` (physical) instead of `start-0` (logical). In RTL mode, the admin sidebar remains on the left rather than moving to the right.
**Fix:** Change `left-0` to `start-0`, `border-r` to `border-e`. Verify Sheet `side="left"` behaves correctly in RTL (shadcn/ui Sheet handles this).

### 7.3 Marketing Mobile Menu

**File:** `src/components/marketing/site-header.tsx` (needs verification)
**Issue:** Mobile menu drawer should anchor to the correct side in RTL.
**Action:** Verify sheet/drawer side prop uses logical positioning.

---

## 8. BiDi Text Embedding Issues

### 8.1 User Content Rendering

**Issue:** When a user posts Arabic text containing English hashtags (e.g., "مرحبا #AstraPost"), the BiDi algorithm may cause the hashtag to appear on the wrong side.
**Fix:** For post preview areas, consider using `dir="auto"` on the content container or using the `<bdi>` element for user-generated text.

### 8.2 Analytics Chart Labels

**File:** `src/app/dashboard/analytics/`
**Issue:** Chart labels in Arabic may render incorrectly if the charting library doesn't support RTL text.
**Fix:** Verify Recharts/chart library handles RTL labels properly.
