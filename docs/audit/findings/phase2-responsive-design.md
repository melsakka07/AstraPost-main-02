# Phase 2 — Responsive Design Audit

## Summary

| Issue Type                       | Count         | Severity   |
| -------------------------------- | ------------- | ---------- |
| Touch target violations (< 44px) | 15+ locations | High       |
| Horizontal overflow risk         | 8 locations   | Medium     |
| Hidden content on mobile         | 5 locations   | Medium     |
| Layout breaks on small screens   | 6 locations   | Medium     |
| Text readability on mobile       | 4 locations   | Low-Medium |

---

## 1. Touch Target Violations (< 44×44px on Mobile)

### 1.1 AI Writer — Copy Buttons (24px)

**File:** `src/app/dashboard/ai/writer/page.tsx` line 697
**Issue:** `<Button variant="ghost" size="sm" className="h-6 w-6">` — 24×24px, severely below 44px minimum.
**Fix:** Change to `h-10 w-10 min-h-[44px] min-w-[44px]` on mobile. Consider `size="icon"` variant.

### 1.2 AI Writer — Variant Action Buttons

**File:** `src/app/dashboard/ai/writer/page.tsx` lines 1078, 1089, 1093
**Issue:** Small icon buttons for variant copy/send actions, same h-6 w-6 pattern.
**Fix:** Same as above — bump to 44px minimum.

### 1.3 Agentic Posting — Drag Handle (16px)

**File:** `src/components/ai/agentic-posting-client.tsx` line 1607
**Issue:** `<button>` with `h-4 w-4` GripVertical icon — 16×16px.
**Fix:** Increase touch area to `h-10 w-10` with padding around the 16px icon.

### 1.4 Agentic Trends — "Post" Button (32px)

**File:** `src/components/ai/agentic-trends-panel.tsx` line 242
**Issue:** Trend card "Post" button at `h-8` (32px).
**Fix:** Bump to `h-10 min-h-[44px]`.

### 1.5 Agentic Trends — Category Tabs (~28px)

**File:** `src/components/ai/agentic-trends-panel.tsx` line 173
**Issue:** Category tab buttons `rounded-full px-3.5 py-1.5` — ~28px height.
**Fix:** Increase to `py-2.5` for ~40px height.

### 1.6 Hashtag Generator — Individual Badges (~28px)

**File:** `src/components/ai/hashtag-generator.tsx` line 248
**Issue:** Clickable hashtag badges `px-3 py-1.5` — ~28px.
**Fix:** Increase to `py-2.5` and ensure `min-h-[44px]`.

### 1.7 Chat — Copy Button (~22px)

**File:** `src/app/chat/page.tsx` line 203
**Issue:** `<button className="hover:bg-muted rounded p-1">` with h-3.5 w-3.5 icon — ~22px.
**Fix:** Use `<Button variant="ghost" size="icon">` or add `min-h-[44px] min-w-[44px]`.

### 1.8 Inspiration — Bookmark/Clear Buttons (32px mobile)

**File:** `src/app/dashboard/inspiration/page.tsx` lines 511, 520
**Issue:** `h-8 w-8 sm:h-10 sm:w-10` — 32px on mobile.
**Fix:** Change to `h-10 w-10` minimum (remove sm: override that makes mobile smaller).

### 1.9 Inspiration — History Action Buttons (28px)

**File:** `src/app/dashboard/inspiration/page.tsx` lines 610, 625
**Issue:** Action buttons at `h-7` (28px).
**Fix:** Bump to `h-9 min-h-[36px]` minimum.

### 1.10 Reset Password — Password Toggle (~24px)

**File:** `src/app/(auth)/reset-password/page.tsx` line 153
**Issue:** Password visibility toggle with no explicit size — icon is ~24px.
**Fix:** Add `h-10 w-10` for 40px touch target.

### 1.11 User Profile — Avatar Trigger (32px)

**File:** `src/components/auth/user-profile.tsx` line 64
**Issue:** Avatar trigger at `size-8` (32px).
**Fix:** Consider `size-10` (40px) on mobile. Currently borderline.

### 1.12 Bio Optimizer — External Link Icon (12px)

**File:** `src/app/dashboard/ai/bio/page.tsx` lines 304-312
**Issue:** `<ExternalLink className="h-3 w-3">` — 12px icon in a link.
**Fix:** Wrap in larger touch area or use a Button variant.

### 1.13 Dashboard Jobs — Filter Button (40px)

**File:** `src/app/dashboard/jobs/page.tsx` line 150
**Issue:** Submit button `h-10` (40px) — below 44px minimum.
**Fix:** Change to `h-11` (44px).

### 1.14 BottomNav — "More" Button Small Text

**File:** `src/components/dashboard/bottom-nav.tsx` line 52
**Issue:** Labels at `text-[10px]` — very small and hard to read.
**Fix:** Increase to `text-[11px]` or `text-xs`.

---

## 2. Horizontal Overflow Risk

### 2.1 Admin Tables — Potential Overflow

**Files:** Multiple admin pages (subscribers, teams, billing, jobs, audit)
**Issue:** Wide data tables with many columns may cause horizontal scroll on mobile. No `overflow-x-auto` wrapper confirmed on all pages.
**Fix:** Ensure all table containers have `overflow-x-auto` and `max-w-full`.

### 2.2 AI History — Long Output Content

**File:** `src/app/dashboard/ai/history/page.tsx` lines 105-117
**Issue:** AI-generated output rendered with `whitespace-pre-wrap` but no `break-words` — long URLs or hashtags could overflow.
**Fix:** Add `break-words overflow-wrap-anywhere`.

### 2.3 Chat Messages — Long Unbreaking Strings

**File:** `src/app/chat/page.tsx`
**Issue:** Chat message bubbles render markdown but long URLs/code without `break-all` could overflow.
**Fix:** Add `[&_code]:break-all [&_a]:break-words` to message container.

### 2.4 Queue Page — Job ID Display

**File:** `src/app/dashboard/jobs/page.tsx` line 90
**Issue:** Job IDs are truncated in JS but server-rendered table may not truncate on initial load.
**Fix:** Add `truncate max-w-[120px]` on ID column.

### 2.5 Competitor Analytics — Side-by-Side Comparison

**File:** `src/app/dashboard/analytics/competitor/page.tsx`
**Issue:** Self-stats vs competitor stats side-by-side on mobile may be too cramped.
**Fix:** Ensure `flex-col` on mobile with `sm:flex-row` for comparison cards.

### 2.6 Settings Billing — Plan Details

**File:** `src/app/dashboard/settings/billing/page.tsx`
**Issue:** Plan name + price + features list may overflow narrow screens.
**Fix:** Verify `max-w-3xl` + padding is sufficient. Add `overflow-x-hidden` to container.

### 2.7 Admin Sidebar — Collapsed State Text

**File:** `src/components/admin/sidebar.tsx`
**Issue:** When collapsed to `w-20`, nav item labels use `truncate` which is correct. However long team/organization names might still overflow.
**Fix:** Verify `truncate` is applied to all text elements in collapsed state.

---

## 3. Hidden or Inaccessible Content on Mobile

### 3.1 Admin Sidebar — Not Accessible on Mobile Without Toggle

**File:** `src/components/admin/sidebar.tsx` lines 149-181
**Issue:** Desktop sidebar hidden on mobile (`hidden md:flex`). Mobile Sheet toggle at line 153 is present but uses `fixed left-4 top-4` in a `md:hidden` container — should use logical positioning.
**Fix:** Change `left-4` to `start-4`.

### 3.2 AI Writer — Tab Trigger Text Hidden on Mobile

**File:** `src/app/dashboard/ai/writer/page.tsx` lines 412-428
**Issue:** Tab trigger text uses `hidden sm:inline` — only icons visible on mobile. Users may not understand what each tab does from icon alone.
**Fix:** Ensure icons have `aria-label` or tooltip on mobile. Current setup shows icon-only tabs which is acceptable if clear.

### 3.3 Dashboard BottomNav — Limited to 5 Items

**File:** `src/components/dashboard/bottom-nav.tsx`
**Issue:** Only 5 nav items fit. "More" button opens sidebar drawer which contains all items — this is good UX. However 5th item may need to scroll for some locales.
**Fix:** Already handled via "More" button pattern. Verify all items accessible.

### 3.4 Agentic Trends Panel — Mobile Toggle

**File:** `src/components/ai/agentic-trends-panel.tsx` lines 142, 158
**Issue:** "Show"/"Hide" toggle for trends on mobile works but uses `sm:hidden`/`sm:block`. The toggle button text is hardcoded English.
**Fix:** Add i18n to toggle button text.

---

## 4. Layout Breaks on Small Screens

### 4.1 Dashboard Analytics — Chart Grid

**File:** `src/app/dashboard/analytics/page.tsx`
**Issue:** Chart sections use `grid grid-cols-1 lg:grid-cols-2` which is correct. But some stat cards with `sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5` may break at intermediate widths.
**Fix:** Add `grid-cols-2` as mobile default instead of `grid-cols-1` for stat cards to avoid excessive vertical scrolling.

### 4.2 AI Calendar — Weekly Grid

**File:** `src/app/dashboard/ai/calendar/page.tsx`
**Issue:** 7-column day grid on mobile could be very cramped. Empty state uses `sm:grid-cols-4`.
**Fix:** Consider `grid-cols-3 sm:grid-cols-4 md:grid-cols-7` for better mobile layout.

### 4.3 Pricing Table — Plan Cards

**File:** `src/components/billing/pricing-table.tsx` line 258
**Issue:** `md:grid-cols-3` for plan cards. On mobile, all 3 plans stack vertically which is correct but could benefit from horizontal scroll tabs.
**Fix:** Current stacking is acceptable for mobile. Ensure equal card heights with `h-full`.

### 4.4 Blog Post Grid — Featured + Regular

**File:** `src/app/(marketing)/blog/page.tsx`
**Issue:** Featured post + 2-column grid. At tablet widths, 2 columns of regular posts may be cramped.
**Fix:** Use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` pattern.

### 4.5 Admin Dashboard — Metric Cards

**File:** `src/app/admin/loading.tsx`
**Issue:** Loading skeleton uses `sm:grid-cols-2 lg:grid-cols-4` but the actual admin dashboard component may use different breakpoints.
**Fix:** Verify consistency between loading skeleton grid and actual component grid.

---

## 5. Text Readability on Mobile

### 5.1 Homepage Hero — Large Heading

**File:** `src/app/(marketing)/page.tsx` line 43
**Issue:** `md:text-7xl` with no mobile size specified — defaults to base text size on mobile which may be too small for a hero.
**Fix:** Add `text-4xl sm:text-5xl md:text-7xl`.

### 5.2 Features/Resources — Card Descriptions

**File:** Multiple marketing pages
**Issue:** Card description text uses default `text-muted-foreground` size which is fine on desktop but may be small on mobile.
**Fix:** Ensure minimum `text-sm` on all body text. Already handled in most pages.

### 5.3 Admin Page Wrapper — Description Text

**File:** `src/components/admin/admin-page-wrapper.tsx` line 39
**Issue:** Description at `text-xs sm:text-sm` — very small on mobile at 12px.
**Fix:** Change to `text-sm` (14px) minimum.

### 5.4 Changelog — Version Badges

**File:** `src/app/(marketing)/changelog/page.tsx`
**Issue:** Version badges use `text-xs` which is 12px — acceptable for badges but verify readability.
**Fix:** Acceptable for badge elements. No change needed.

---

## 6. Navigation Usability on Mobile

### 6.1 Dashboard Mobile Pattern

**Status:** Good. Hamburger → Drawer (sidebar.tsx detects dir for RTL), plus BottomNav for quick access. Both are fully functional.

### 6.2 Admin Mobile Pattern

**Status:** Adequate. Sheet drawer from left (should be start for RTL) with hamburger trigger at `h-11 w-11` (44px). Works but RTL positioning needs fix.

### 6.3 Marketing Header

**Status:** Needs verification. Check if mobile menu drawer correctly anchors to the right side in RTL.
**Action:** Verify `src/components/marketing/site-header.tsx` mobile menu has RTL-aware drawer positioning.

---

## 7. Form Usability on Mobile

### 7.1 Compose Form

**File:** `src/app/dashboard/compose/`
**Issue:** Textarea for tweet composition should use `inputMode="text"` and `autoComplete="off"`. Character count should remain visible when keyboard is open.
**Fix:** Verify char count is `sticky` or positioned above keyboard. Add `ios:min-h-[120px]` for iOS Safari.

### 7.2 Chat Input

**File:** `src/app/chat/page.tsx` line 420
**Issue:** Uses `env(safe-area-inset-bottom)` for iPhone home bar — good. Input at `min-h-[44px]` — good. Has iOS visualViewport handling at lines 288-301 — excellent.
**Status:** Good.

### 7.3 Settings Forms

**Issue:** Long settings forms (profile, notifications) may require significant scrolling. No section jump links on mobile.
**Fix:** Acceptable for now. Settings pages are tabbed and each tab is manageable length.

### 7.4 Auth Forms

**Issue:** All auth forms use `max-w-md` which provides adequate width on mobile. Password visibility toggle is present. No keyboard type issues noted.
**Status:** Good.
