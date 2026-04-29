# Phase 4 — Edge Cases and Defensive UI Audit

## Summary

| Edge Case Type               | Unhandled Instances | Severity    |
| ---------------------------- | ------------------- | ----------- |
| Extremely long content       | 12 locations        | Medium      |
| Null/missing data crashes    | 8 locations         | High        |
| Double-submission prevention | 5 forms             | Medium-High |
| Session expiry handling      | 3 scenarios         | Medium      |
| Zero/boundary values         | 6 locations         | Low-Medium  |
| Browser back button          | 2 scenarios         | Low         |

---

## 1. Extremely Long Content Handling

### 1.1 Dashboard Home — Post Preview Truncation

**File:** `src/app/dashboard/page.tsx` lines 327-329
**Status:** Good. Tweets truncated to 80 chars + "...".
**Issue:** Long usernames in the activity sidebar may overflow. No `truncate` class found on username spans.
**Fix:** Add `truncate max-w-[120px]` to username elements.

### 1.2 Queue Page — Post Content Display

**File:** `src/app/dashboard/queue/page.tsx`
**Issue:** Scheduled post preview may contain long text. Needs `line-clamp-2` or `truncate`.
**Fix:** Verify content preview has `line-clamp-2` or `truncate`.

### 1.3 AI History — Generated Output

**File:** `src/app/dashboard/ai/history/page.tsx` lines 105-117
**Issue:** AI output rendered with `whitespace-pre-wrap` but no `break-words`. Long unbroken strings (URLs, hashtags) could overflow.
**Fix:** Add `break-words overflow-wrap-anywhere` to output containers.

### 1.4 Chat Messages — Long Code/URLs

**File:** `src/app/chat/page.tsx`
**Issue:** Markdown rendering of code blocks could produce very wide content.
**Fix:** Add `[&_pre]:overflow-x-auto [&_code]:break-all` to message bubbles.

### 1.5 Admin Tables — Long IDs/Emails

**Files:** Multiple admin table components
**Issue:** Job IDs, correlation IDs, email addresses can be very long.
**Fix:** Apply `truncate max-w-[150px]` to ID/email columns. Dashboard jobs page already truncates IDs (line 90) — good.

### 1.6 User Names in Sidebar

**File:** `src/components/dashboard/sidebar.tsx`
**Issue:** Long team names or user names in sidebar may overflow the `w-64` width.
**Fix:** Apply `truncate` to all name/team labels in sidebar.

### 1.7 Competitor Analytics — Long Usernames

**File:** `src/app/dashboard/analytics/competitor/page.tsx`
**Issue:** X usernames can be up to 15 chars — unlikely to overflow. But displayed names can be 50 chars.
**Fix:** Add `truncate max-w-[200px]` to displayed name elements.

### 1.8 Composer — Character Limit Enforcement

**File:** `src/app/dashboard/compose/`
**Issue:** Tweet threading logic should enforce per-tweet character limits (280 standard, variable for X Premium).
**Fix:** Verify character limit enforcement in `ComposerWrapper` and sub-components.

### 1.9 Settings Profile — Long Bio/Names

**File:** `src/app/dashboard/settings/profile/`
**Issue:** User can enter very long names or bio text. Form fields need maxLength.
**Fix:** Add `maxLength` to name (100) and bio (500) fields.

### 1.10 Onboarding — Long Input Handling

**File:** `src/components/onboarding/`
**Issue:** Onboarding form fields for niche, topics, bio should have maxLength and proper overflow handling.
**Fix:** Verify maxLength and truncation on all free-text onboarding fields.

---

## 2. Null / Missing Data — Rendering "undefined" or Crashes

### 2.1 Dashboard Jobs — Correlation ID Null

**File:** `src/app/dashboard/jobs/page.tsx` line 223
**Status:** Good. Null check `r.correlationId` renders nothing if null.

### 2.2 Dashboard Jobs — Finished Date Null

**File:** `src/app/dashboard/jobs/page.tsx` line 244
**Status:** Good. Shows em dash "—" if `finishedAt` is null.

### 2.3 Dashboard Analytics — Zero Accounts

**File:** `src/app/dashboard/analytics/page.tsx` lines 395-409
**Status:** Good. Empty state shown when `accounts.length === 0`.

### 2.4 Dashboard Page — Null Session Handling

**File:** `src/app/dashboard/page.tsx` lines 182-197
**Status:** Good. Redirects to login if no session.

### 2.5 Viral Analytics — Insufficient Data

**File:** `src/app/dashboard/analytics/viral/page.tsx` lines 257-298
**Status:** Good. Shows blurred preview with "Not enough tweet data" message.

### 2.6 AI Writer — Missing Account

**File:** `src/app/dashboard/ai/writer/page.tsx` lines 118-120
**Issue:** Account fetch failure silently degrades. Length options default to short-only but no user-facing message explaining why.
**Fix:** Add a subtle info banner when account couldn't be loaded: "X Premium tier detection unavailable — using standard limits."

### 2.7 AI Bio — Missing Username

**File:** `src/app/dashboard/ai/bio/page.tsx` line 67
**Issue:** Connected username fetch failure silently ignored. User may not know what account is being optimized.
**Fix:** Show a subtle warning if username couldn't be loaded.

### 2.8 Pricing Page — Null Subscription Handling

**File:** `src/app/(marketing)/pricing/page.tsx` lines 62-67
**Status:** Good. Falls through to show default pricing without personalized state.

### 2.9 Admin Subscriber Detail — Missing User

**File:** `src/app/admin/subscribers/[id]/page.tsx` line 18
**Status:** Good. Falls back to `subscriber?.name || subscriber?.email || "Unknown"`.

### 2.10 Competitor — Follower Count Display

**File:** `src/app/dashboard/analytics/competitor/page.tsx` line 314-315
**Issue:** Uses `.toLocaleString()` on numbers — good. But what if follower count is 0? What if it's `null`? Needs explicit null check.
**Fix:** Add nullish coalescing: `followers?.toLocaleString() ?? "—"`.

---

## 3. Double-Submission Prevention

### 3.1 Compose — Post Submission

**File:** `src/app/dashboard/compose/`
**Issue:** Verify submit button disables during posting. Critical — double-posting would send duplicate tweets.
**Action:** Check `ComposerWrapper` or submit component for `disabled` state during submission.

### 3.2 Settings — Save Actions

**Files:** Profile form, team settings, notification preferences
**Issue:** Verify save buttons disable during API calls. Multiple rapid saves could create race conditions.
**Fix:** Add `isPending` state with button disabled + spinner.

### 3.3 Billing — Checkout/Upgrade

**File:** `src/components/billing/pricing-table.tsx` line 26
**Status:** Good. `isLoading` state disables button during checkout.

### 3.4 AI Generation — Double-Generate Prevention

**Files:** All AI tool pages
**Issue:** Each tool has its own `isGenerating`/`isLoading` state. Should verify abort controller properly cancels in-flight requests before starting new ones.
**Status:** Most AI tools use `AbortController` pattern. Verify all do.

### 3.5 Team Invites — Duplicate Prevention

**File:** Settings team page
**Issue:** Rapid clicking "Send Invite" could send duplicate invites.
**Fix:** Ensure `isPending` state blocks resubmission.

---

## 4. Session & Auth Edge Cases

### 4.1 Session Expiry on Dashboard

**Issue:** When session expires while user is on a dashboard page, API calls will return 401. What does the user see?
**Fix:** Verify API client (SWR/fetch wrappers) redirects to `/login` on 401 with proper callback URL. The `auth-client.ts` should handle this globally.

### 4.2 Subscription Expiry While Using Gated Feature

**Issue:** When a user's subscription expires during an active session, gated API calls return 402. The upgrade modal should appear.
**Status:** Many AI pages call `openWithContext()` on 402. Verify ALL gated pages handle this.

### 4.3 Non-Admin Accessing Admin Routes

**File:** `src/app/admin/layout.tsx` line 10
**Status:** Good. `requireAdmin()` redirects to `/dashboard`.

### 4.4 Unauthenticated Access to Protected Routes

**Issue:** All dashboard routes should redirect to `/login` when unauthenticated.
**Status:** Dashboard layout handles this. Individual pages also have guard checks. Good.

### 4.5 Impersonation Session Ending

**File:** `src/components/dashboard/dashboard-header.tsx`
**Status:** ImpersonationBanner shown during active impersonation. Verify it disappears and session restores correctly when impersonation ends.

---

## 5. Zero and Boundary Values

### 5.1 Analytics — Zero Counters

**Issue:** When analytics show zero impressions, clicks, or engagement — does the UI show "0" or "—" or "No data"?
**Fix:** Use "—" for genuinely missing data, "0" for zero values. Distinguish between "no data collected yet" and "zero activity".

### 5.2 AI Usage — 100% Quota

**File:** `src/app/dashboard/ai/page.tsx` lines 140-145
**Status:** Good. Destructive badge + upgrade CTA when quota exhausted. `Math.min(quotaPercentage, 100)` prevents >100% display.

### 5.3 Queue — Single Item

**Issue:** When queue has exactly 1 item, the UI should show singular text ("1 post scheduled") vs plural.
**Fix:** Use pluralization rules in i18n. next-intl supports ICU message format for pluralization.

### 5.4 Team — Single Member

**Issue:** When team has exactly 1 member, the team settings page should reflect this (disable "leave team" or show appropriate messaging).
**Fix:** Verify team page handles single-member state.

### 5.5 Pagination — Thousands of Items

**Issue:** Admin pages with large datasets need pagination. Verify all list pages implement pagination.
**Status:** Most admin pages pass `page` and `limit` params. Verify client-side pagination components handle large page counts.

### 5.6 Plan Limits — At Exact Boundary

**Issue:** User at exactly 100% of post limit should see clear messaging that they've reached the limit, not "101%" or silent failure.
**Fix:** Verify plan limit checks use `>=` not `>` for limit enforcement.

---

## 6. Browser Edge Cases

### 6.1 Back Button After Form Submission

**Issue:** After submitting a form (compose, settings, AI generation), pressing Back should not resubmit the form.
**Fix:** Use `router.replace()` instead of `router.push()` after successful form submissions where appropriate.

### 6.2 Back Button After Locale Switch

**Issue:** After switching locale, pressing Back should not revert to the previous locale.
**Status:** next-intl handles this via cookie. Should be fine.

### 6.3 Back Button After Login/Logout

**Issue:** After logging in, Back should not return to login page. After logging out, Back should not return to a protected page.
**Fix:** Use `router.replace()` for redirects after auth state changes.

### 6.4 Copy-Paste in Text Inputs

**Issue:** Verify all text inputs allow paste. Some may have `onPaste` handlers that interfere.
**Status:** No restrictive paste handlers found. Good.

### 6.5 Page Title Updates on Navigation

**Issue:** Verify `document.title` updates on every client-side navigation. Each page should have `generateMetadata()` or `export const metadata`.
**Status:** Most pages have metadata. Admin roadmap page is missing metadata export.

---

## 7. Special Characters and Emoji

### 7.1 Arabic Tashkeel (Diacritics) Rendering

**Issue:** Arabic text with full tashkeel (fatha, damma, kasra, etc.) may clip diacritical marks if line-height is too tight.
**Status:** globals.css lines 990-1018 already address this for headings with increased line-height in RTL mode. Good.

### 7.2 Emoji Sequences

**Issue:** Complex emoji sequences (ZWJ, skin tones, flags) may break across lines or render incorrectly.
**Fix:** Ensure `font-family` includes emoji fonts. Verify text containers don't `word-break` emoji sequences.

### 7.3 Mixed Arabic + English + Emoji in Tweets

**Issue:** A tweet containing Arabic text, English hashtags, and emoji is a common MENA use case. BiDi rendering and line breaking need special attention.
**Fix:** Test with realistic mixed-content tweets. Use `dir="auto"` and `overflow-wrap: break-word`.

### 7.4 Zero-Width Characters

**Issue:** Zero-width joiners/non-joiners in Arabic text should render correctly.
**Status:** Browsers handle this natively. No action needed.

---

## 8. Rapid Interactions

### 8.1 SSE Connection — Rapid Connect/Disconnect

**File:** `src/components/ai/agentic-posting-client.tsx`
**Issue:** Rapid start/cancel of AI generation could leave stale SSE connections.
**Fix:** Verify `abortRef.current.abort()` properly cleans up before new connections. The `handleCancel` function should be robust.

### 8.2 Notification Bell — Polling Cleanup

**File:** `src/components/dashboard/notification-bell.tsx`
**Status:** Previously fixed with AbortController pattern. Good.

### 8.3 Queue Listener — Polling Cleanup

**File:** `src/components/queue/queue-realtime-listener.tsx`
**Status:** Previously fixed. Good.

### 8.4 Theme/Locale Toggle — Rapid Switching

**Issue:** Rapidly toggling theme or locale could cause race conditions.
**Status:** Both use cookies/session storage — should handle rapid switching gracefully.
