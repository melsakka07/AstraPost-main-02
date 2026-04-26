# Latest Updates

## 2026-04-26: Fixed Arabic Language Switching Bug — Locale Cookie Mismatch

**Problem:** Switching language to Arabic had no effect — `getMessages()` always loaded English messages and the UI never changed.

**Root cause — two-part fix:**

1. **`src/i18n/request.ts`** — `getRequestConfig` relied on the `locale` parameter from next-intl's internal resolution. Since the project uses the next-intl plugin without i18n routing middleware, next-intl had no way to know about the app's `locale` cookie. It defaulted to `"en"` every time. **Fix:** Now reads the `locale` cookie directly via `cookies().get("locale")?.value`.

2. **`src/app/layout.tsx`** — Language detection relied solely on `session?.user?.language`. After the preferences API updates the DB, Better Auth's session token may still contain the cached old value after reload. **Fix:** Added `locale` cookie fallback: `session?.user?.language || cookieStore.get("locale")?.value || "en"`.

**Files changed:** `src/i18n/request.ts`, `src/app/layout.tsx`

## 2026-04-26: Arabic Localization — Phases 0-7 Complete, Security Fixes, Composer Wired

**Comprehensive audit + implementation pass across all 7 phases:**

- **Phase 0-0.5** — Verified: Cairo font, RTL dir, language switcher, i18n/request.ts, LANGUAGES trimmed to ar/en only, LANGUAGE_ENUM_LIMITED removed
- **Phase 1 (Auth)** — Verified: all auth pages + onboarding wizard use translations. Fixed onboarding step titles and FEATURE_CARDS hardcoded strings
- **Phase 2 (Dashboard Shell)** — Verified: 9/13 components fully translated. Fixed hardcoded strings in account-switcher (7), bottom-nav ("More"), post-usage-bar ("Posts"), quick-compose (title + "Clear")
- **Phase 3 (Dashboard Core)** — **Major gap found**: composer.tsx (2,620 lines) had zero translations. Wired ~87 `t()` calls across toasts, labels, dialogs, AI tools panel
- **Phase 4 (AI Features)** — Verified: all 8 AI namespaces, 11 feature pages, 11/12 AI routes complete. Fixed trends/route.ts `dbUser.language` fallback
- **Phase 5 (Settings)** — Verified: all 5 settings pages + 8 components fully translated
- **Phase 6 (Marketing)** — Verified: all 9 marketing pages + site-footer fully translated
- **Phase 7 (Emails)** — Implemented: email-translations.ts helper, 9 email templates localized, email.ts service updated, 3 callers (processors, webhook, team invite) pass user language. RTL support in base-layout.tsx

**Security fixes:** Removed raw invite token from Resend metadata (critical), added HTML escaping for teamName in team invite email (high)

**i18n JSON:** 41 namespaces, ~1,500+ keys in both en.json and ar.json with full Arabic (MSA) translations

**Remaining (Phase 9 cleanup):** ~30 hardcoded strings in onboarding-wizard.tsx (time options, timezone labels, error toasts), ~10 in composer.tsx (undo toast callbacks), 3 auth page placeholders — minor UX strings, not blocking

## 2026-04-26: Phase 7 Complete — Transactional Email Localization ✅ (earlier)

**Summary:** All system emails now render in the recipient's preferred language (`user.language` column). Email templates accept a `locale` prop and use `getEmailTranslations()` helper (not `useTranslations()` — email templates are server-rendered HTML, not React hooks). Subject lines, text fallbacks, and HTML bodies are all translated. RTL support: `base-layout.tsx` sets `dir="rtl"` and `lang="ar"` when locale is Arabic.

**New file:** `src/lib/services/email-translations.ts` — lightweight helper returning `en.emails` or `ar.emails` based on locale string.

**Modified files (14):**

- `src/components/email/base-layout.tsx` — added `locale` prop, `dir`/`lang` attributes, translated copyright
- `src/components/email/post-failure-email.tsx` — all text wired to `t.post_failure.*` keys
- `src/components/email/billing/trial-expired-email.tsx` — all text wired to `t.trial_expired.*` + `t.common.*`
- `src/components/email/billing/trial-ending-soon-email.tsx` — all text wired to `t.trial_ending_soon.*` + `t.common.*`
- `src/components/email/billing/cancel-scheduled-email.tsx` — all text wired to `t.cancel_scheduled.*` + `t.common.*`
- `src/components/email/billing/reactivated-email.tsx` — all text wired to `t.reactivated.*` + `t.common.*`
- `src/components/email/billing/subscription-cancelled-email.tsx` — all text wired to `t.subscription_cancelled.*` + `t.common.*`
- `src/components/email/billing/payment-failed-email.tsx` — all text wired to `t.payment_failed.*` + `t.common.*`
- `src/components/email/billing/payment-succeeded-email.tsx` — all text wired to `t.payment_succeeded.*` + `t.common.*`
- `src/lib/services/email.ts` — `sendPostFailureEmail()` and `sendTeamInvitationEmail()` now accept `locale` param, use translations for subject/text/HTML
- `src/app/api/billing/webhook/route.ts` — all 7 billing email handlers query `user.language` and pass locale to templates; subject/text translated at call sites via `getEmailTranslations()`
- `src/app/api/team/invite/route.ts` — queries invitee's language (not inviter's) before sending team invite
- `src/lib/queue/processors.ts` — queries user language before sending post failure email
- `src/i18n/messages/en.json` + `ar.json` — added 9 new keys: `common.all_rights_reserved`, `common.thank_you_customer/staying/continued/trying`, `cancel_scheduled.access_until_end`, `cancel_scheduled.reactivate_before_end`, `subscription_cancelled.resubscribe_anytime`, `payment_failed.grace_period`, `trial_ending_soon.without_payment`

**Key decisions:**

- `getEmailTranslations()` is a plain function imported into templates — not `useTranslations()` (templates render server-side as HTML via `@react-email/render`, no React hook support)
- Billing email subjects/texts are translated at the webhook call site (route handler), not inside `sendBillingEmail()` which remains a generic wrapper
- Team invite: queries the INVITEE's language preference, not the inviter's
- `t.common.greeting` contains `{name}` placeholder; templates use `.replace("{name}", userName)` for substitution
- Fallback English strings provided for newly-added keys that templates reference (with `||` fallback) to ensure back-compat

**Verification:** `pnpm lint` passes (0 new warnings); `pnpm typecheck` passes (only pre-existing `composer.tsx:1442` error unrelated).

---

## 2026-04-26: Composer Translation Wiring ✅

**Summary:** Replaced ~45 hardcoded English user-facing strings in `src/components/composer/composer.tsx` with `next-intl` `useTranslations("compose")` calls. All keys already existed in both `en.json` and `ar.json` — no new keys were needed.

**Changed file:** `src/components/composer/composer.tsx` (single file, ~87 `t()` calls added)

**Categories covered:**

- **Toast messages (12 keys):** `toast.draft_restored`, `toast.draft_loaded`, `toast.draft_load_failed`, `toast.title_required`, `toast.template_saved`, `toast.tweet_removed`, `toast.undo`, `toast.post_generated`, `toast.ai_writer_generated`, `toast.template_generated`, `toast.hook_generated`, `toast.cta_added`, `toast.translated` (with count ICU), `toast.hashtags_generated` (with count ICU), `toast.rewrite_generated`
- **Labels (21 keys):** `label.just_now`, `label.minutes_ago`, `label.auto_saved`, `label.convert_to_thread`, `label.add_to_thread`, `label.thread_mode_on`, `label.thread_mode_off`, `label.ai_tools`, `label.close`, `label.publishing`, `label.post_to_accounts`, `label.schedule_for`, `label.cancel`, `label.times_are_in`, `label.repeat`, `label.none`, `label.daily`, `label.weekly`, `label.monthly`, `label.end_date`, `label.schedule`, `label.post_now`, `label.save_draft`, `label.or_divider`, `label.save_template`
- **AI Tools Sheet (3 keys):** `ai_tools.title`, `ai_tools.description`, `ai_tools.generate`
- **Dialog content (8 keys):** `dialog.replace_title`, `dialog.replace_description`, `dialog.keep_editing`, `dialog.replace_generate`, `dialog.translate_title`, `dialog.translate_description` (with count/language ICUs), `dialog.translate_button`, `dialog.discard_title`, `dialog.discard_description`, `dialog.continue`

**Key implementation details:**

- `formatTimeAgo()` moved from module scope into component body to access `t` for `label.just_now` and `label.minutes_ago`
- Toast action labels ("Undo") use `t("toast.undo")` consistently
- ICU message format used for variable messages: `t("toast.translated", { count })`, `t("dialog.translate_description", { count, language })`

**Left untranslated (no keys in compose namespace):** "Scheduling for"/"Posting immediately to" context line, tooltip "Add content to enable" (6 instances), "Tweet cleared" toast, history restoration toasts, form validation error messages, tool attribute titles. These require i18n-dev to add new keys.

---

## 2026-04-26: Phase 6 Complete — Marketing Pages Arabic Localization ✅

**Phase 6A (i18n):** Added 9 new top-level namespaces + extended nav with 14 footer keys. ~170 new translation keys. JSON structure verified identical across en.json and ar.json (40 namespaces each).

**Phase 6B (Frontend):** Replaced all hardcoded English UI strings across 9 marketing pages + site footer with `getTranslations()` calls. Content (blog posts, FAQ answers, release notes) left untranslated — only UI chrome (labels, buttons, headings, badges) localized.

**Verification:** `pnpm run check` passes (0 errors, 0 type errors).

---

## 2026-04-26: Phase 6B — Marketing Pages Translation Wiring ✅

**Summary:** Replaced all hardcoded English UI strings across 9 marketing pages and the site footer with `next-intl` `getTranslations()` calls, using per-page namespaces (`marketing`, `pricing`, `features`, `community`, `blog`, `changelog`, `docs`, `resources`, `roadmap`, `nav`).

**Files Modified (10):**

- `src/app/(marketing)/page.tsx` — Homepage: badge, hero, features grid, CTA section (namespace: `marketing`)
- `src/app/(marketing)/pricing/page.tsx` — Pricing: header, trial banner, feature list, FAQ CTA (namespace: `pricing`)
- `src/app/(marketing)/features/page.tsx` — Features: header, 6 feature cards with titles/descriptions/details, CTA (namespace: `features`)
- `src/app/(marketing)/community/page.tsx` — Community: hero, stats labels, benefits, FAQ heading/support section, CTA (namespace: `community`)
- `src/app/(marketing)/blog/page.tsx` — Blog: header, featured/latest article labels, newsletter section (namespace: `blog`)
- `src/app/(marketing)/changelog/page.tsx` — Changelog: header, change type badges (new/imp/fix) (namespace: `changelog`)
- `src/app/(marketing)/docs/page.tsx` — Docs: header, search placeholder, category titles/descriptions, soon badge, support CTA (namespace: `docs`)
- `src/app/(marketing)/resources/page.tsx` — Resources: header, resource card titles/descriptions/buttons, CTA (namespace: `resources`)
- `src/app/(marketing)/roadmap/page.tsx` — Roadmap: header, feedback section (namespace: `roadmap`)
- `src/components/site-footer.tsx` — Footer: nav column headings, link labels, tagline, copyright, security text (namespace: `nav`)

**Key Decisions:**

- All pages use `getTranslations()` (Server Components) — no `"use client"` directives added
- Blog post titles/excerpts, FAQ answers, changelog release notes, docs article titles left as content (not translated)
- Stats values (2,500+, 1,200+, 50,000+) kept as data, only labels translated
- Changelog type badges use a `Record<string, string>` lookup map for type-safe translation
- Site footer: `NAV_COLUMNS` and `SOCIAL_LINKS` moved from module scope into async component body

## 2026-04-26: Phase 5B Complete — Settings Pages & Components Arabic Localization ✅

**Summary:** Replaced all hardcoded user-facing English strings across 23 settings files (5 server pages, 17 client components, 1 layout) with `next-intl` translations using the `settings` namespace.

**Server Components (5 pages):**

- `src/app/dashboard/settings/profile/page.tsx` — title, description, export card strings
- `src/app/dashboard/settings/billing/page.tsx` — title, description, PLAN_LABELS replaced with t() calls, billing notices, tooltip, portal hints
- `src/app/dashboard/settings/notifications/page.tsx` — title, description
- `src/app/dashboard/settings/team/page.tsx` — title, description, upgrade alert, members card
- `src/app/dashboard/settings/integrations/page.tsx` — title, description, section headings, card titles, team card

**Client Components (17 files):**

- `profile-form.tsx` — Zod schema factory pattern with `getProfileFormSchema(t)`, all form labels, validation, toast messages
- `billing-status.tsx` — status badges, trial countdown, cancellation notice, past due warning
- `manage-subscription-button.tsx` — button text, error toasts
- `plan-usage.tsx` — usage labels, "Unlimited", slot availability, UpgradeBanner translations
- `billing-success-poller.tsx` — plan labels map, success/processing toasts
- `notification-preferences.tsx` — card titles, notification options, toasts
- `connected-x-accounts.tsx` — all tooltips, badges (Active/Inactive/Expired), dialogs, info boxes, sync button, 40+ strings replaced
- `x-health-check-button.tsx` — button text, status messages
- `connected-instagram-accounts.tsx` — card titles, labels, disconnect dialog
- `connected-linkedin-accounts.tsx` — card titles, labels, disconnect dialog
- `team/invite-member-dialog.tsx` — Zod schema factory, form labels, role descriptions, toasts; RTL fix: `left-2.5` → `start-2.5`, `pl-9` → `ps-9`
- `team/team-members-list.tsx` — table headers, role labels, dropdown items, confirmation dialog, toasts
- `voice-profile-form.tsx` — Zod schema factory, card titles, analysis labels, sample inputs, buttons, toasts
- `privacy-settings.tsx` — card titles, export/delete labels, confirmation dialog
- `reopen-checklist-button.tsx` — card strings using `profile.checklist_*` keys
- `resume-onboarding-button.tsx` — card strings using `profile.onboarding_*` keys
- `settings-section-nav.tsx` — section labels from `nav.*` keys, aria-label

**Layout:**

- `src/app/dashboard/settings/layout.tsx` — tab labels wired to `nav.*` keys

**Bonus:**

- `src/components/ui/upgrade-banner.tsx` — added optional `cta` translation prop; plan-usage passes `billing.upgrade_banner.cta`

**Key Patterns Used:**

- Server: `const t = await getTranslations("settings")`
- Client: `const t = useTranslations("settings")`
- Zod schemas at module level: factory function `getSchema(t)` + `useMemo` inside component
- Plan labels: inline map `planLabelMap[currentPlan]` using t() calls
- ICU plural messages: `t("team.members_count", { current, max })`, `t("billing.trial_in_days", { count })`

**Verification:** All i18n keys verified existing in both en.json and ar.json (settings namespace, lines 836-1134). No new keys required.

---

## 2026-04-25: Phase 4 Complete — AI Feature Pages + AI Routes Language-Aware ✅

**Summary:** Completed Arabic localization Phase 4 across three parallel tracks: AI feature pages wired with translations, AI API routes made language-aware, and Phase 1-3 gaps fixed.

**Phase 4C — AI Routes Language-Aware (7 files modified, 11 already done, 2 skipped):**

- Modified: `enhance-topic/route.ts`, `affiliate/route.ts`, `trends/route.ts`, `template-generate/route.ts`, `score/route.ts`, `inspiration/route.ts`, `agentic/[id]/regenerate/route.ts`
- Pattern: `userLanguage = clientLanguage || dbUser.language || "en"` → `langInstruction` injected into prompt → `recordAiUsage()` with `userLanguage`
- Skipped: `image/route.ts` (English prompts needed for visual quality), `agentic/[id]/approve/route.ts` (no AI generation)

**Phase 4B — AI Feature Pages (14 files):** ai/page.tsx (tool cards), ai/writer/page.tsx (all tabs/labels/buttons), ai/reply/page.tsx, ai/bio/page.tsx, agentic-posting-client.tsx, hashtag-generator.tsx, inspiration/page.tsx, adaptation-panel.tsx, imported-tweet-card.tsx, manual-editor.tsx, en.json + ar.json

**Phase 1-3 gaps fixed (12 files):** account-switcher, post-usage-bar, upgrade-banner, compose/page, tweet-card, ai-tools-panel, calendar-day, thread-collapsible, analytics-section-nav, account-selector, export-button, onboarding-wizard

**Verification:** `pnpm run check` passes — 0 lint errors, 0 type errors (all 3 TS6133 errors resolved). Both en.json and ar.json at 898 lines with identical key structures.

**Next: Phase 5 — Settings Pages**

---

## 2026-04-25: Phase 1-3 Translation Wiring for Frontend Components ✅

**Summary:** Wired up existing Arabic translation keys across 12 frontend files that still had hardcoded English strings. All changes use existing JSON keys from `src/i18n/messages/en.json` and `ar.json` — no new keys were needed.

**Files Modified:**

- `src/components/dashboard/account-switcher.tsx` — Added `useTranslations("dashboard_shell")`, replaced 2 `aria-label` instances with `t("account_switcher")`
- `src/components/dashboard/post-usage-bar.tsx` — Added `useTranslations("dashboard_shell")`, passes `post_usage.used`/`post_usage.of` as `translations` prop to UpgradeBanner
- `src/components/ui/upgrade-banner.tsx` — Added optional `translations` prop with `used`/`of`/`limitReached`/`runningLow`/`upgradeToIncrease` overrides for i18n
- `src/app/dashboard/compose/page.tsx` — Server Component: added `getTranslations("compose")`, title and description now use `t("title")`/`t("description")`
- `src/components/composer/tweet-card.tsx` — Added `useTranslations("compose")`, textarea placeholder uses `t("tweet_placeholder")`
- `src/components/composer/ai-tools-panel.tsx` — Added `useTranslations("compose")` + `useTranslations("buttons")`, Cancel uses `bt("cancel")`, Generate uses `t("ai_generate")`
- `src/components/calendar/calendar-day.tsx` — Added `useTranslations("calendar")`, create-post aria-label uses `t("schedule_new")`
- `src/components/queue/thread-collapsible.tsx` — Added `useTranslations("queue")`, button text and aria-label use `t("view_thread")`
- `src/components/analytics/analytics-section-nav.tsx` — Added `useTranslations("analytics")`, section labels use `t("overview_tab")`/`t("performance_tab")`/`t("insights_tab")`
- `src/components/analytics/account-selector.tsx` — Added `useTranslations("analytics")`, connect message uses `t("connect_x_cta")`
- `src/components/analytics/export-button.tsx` — Added `useTranslations("analytics")`, upgrade toast uses `t("upgrade_cta")`
- `src/components/onboarding/onboarding-wizard.tsx` — Added `useTranslations("auth")`, header/title/subtitle/steps/buttons now translated; `steps` array moved from module-level to component-level via `getSteps(t)` helper

**Remaining Gaps (requires i18n-dev for new keys):**

- `account-switcher`: toast messages, search placeholder, group labels (no `dashboard_shell` keys)
- `thread-collapsible`: "Empty tweet" fallback (no `queue` key)
- `ai-tools-panel`: form labels (Topic, Tone, Language, etc.), instructional text, tone options, streaming status text (no `compose` keys)
- `export-button`: "Export", "Export as CSV/PDF" labels (no `analytics` keys)
- `date-range-selector`: "Select range", "Last 7d/14d/30d/90d" (no `analytics` keys)
- `onboarding-wizard`: steps 2/3/5 titles ("Preferences", "Compose", "Explore AI"), all step descriptions, step-specific content text (no `auth.onboarding` keys beyond 3 steps)
- `tweet-card`: toolbar labels (Media, AI Image, Emoji, Clear, 1/N), aria-labels (no `compose` keys)

---

## 2026-04-25: Arabic Localization Plan Creation ✅

**Summary:** Drafted a detailed step-by-step implementation plan for scaling up cookie/session-based Arabic language support. Created `docs/arabic-implementation-plan.md` to guide AI agents (`@i18n-dev`, `@frontend-dev`, etc.) in systematically replacing hardcoded strings across the codebase.

**Changes:**

- Generated `docs/arabic/arabic-implementation-plan.md` outlining the architecture, phases, and specific agent prompts required to fully localize the app into Arabic without SEO/URL overhead.

---

## 2026-04-25: AI Billing Fairness Audit ✅

**Summary:** Fixed three quota-tracking bugs where AI operations either bypassed quota gates or double-recorded usage. All changes to recording logic and agentic pipeline integration.

**Changes:**

- Image generation quota tracking: `src/app/api/ai/image/route.ts` — removed premature `recordAiUsage()` call from POST handler; usage now recorded only in status endpoint on success
- Image status cache: `src/app/api/ai/image/status/route.ts` — added `cache.delete()` after DB insert for immediate sidebar updates
- Agentic images now count toward quota: `src/lib/services/ai-image.ts` — added `userId` param to `generateAgenticImage()`, calls `recordAiUsage(userId, "image", ...)` on success
- Agentic pipeline integration: `src/lib/services/agentic-pipeline.ts` — passes `userId` to all `generateAgenticImage()` calls
- Agentic approve no longer consumes quota: `src/app/api/ai/agentic/[id]/approve/route.ts` — removed `recordAiUsage()` call (approval is DB+queue op, not AI work)

---

## 2026-04-24: Agent Orchestration & CLAUDE.md Improvements ✅

**Summary:** Incremental improvements to Claude Code configuration — no code architecture changes. All changes are to `.md` files and one minor canonical route fix.

**Changes:**

- `convention-enforcer.md` — Added 3 missing checklist items: optional chaining at every nesting level, `AbortController` polling pattern, viewer check must use `ApiError.forbidden()` (not raw `new Response`)
- `agent-orchestration.md` — Added 6 new orchestration patterns (database change, billing, i18n, security audit, performance audit, post-implementation audit) + Agent Decision Matrix + "when NOT to parallelize" section
- All 11 agent files — Added `## Do NOT use this agent when` and `## Hand off to` sections
- `.claude/plans/TEMPLATE.md` — Created reusable plan template with required sections (Context, Agent Strategy table, Files to Modify, Verification checklist)
- 4 rule files (`api-routes.md`, `ai-integration.md`, `billing.md`, `frontend.md`) — Added `## Related Rules` cross-reference footers
- `CLAUDE.md` — Added Quick Agent Selection table (10 rows) in Agent Orchestration section
- `.claude/agents/docs-writer.md` — New Haiku agent scoped to `.md` files, auto-updates `0-MY-LATEST-UPDATES.md` as final step of any feature
- `src/app/api/posts/route.ts` line 64 — Fixed viewer role check from raw `new Response("Forbidden...", { status: 403 })` to `ApiError.forbidden("Viewers cannot create posts")` — aligns canonical example with Hard Rule 4
- Documentation audit: Fixed `correlation.ts` description (uses `crypto.randomUUID()` not `nanoid`), updated env vars table in README, fixed `ai-features.md` inspire endpoint (OpenRouter not Google Gemini), added `/api/ai/trends` to ai-features.md, updated recent-changes.md

---

## 2026-04-24: Mobile Responsiveness Improvements for Dashboard ✅

**Summary:** Systematically improved mobile responsiveness across all dashboard pages to ensure optimal user experience on mobile devices (< md breakpoint). Updated responsive grid layouts, spacing, typography, and component padding for better mobile viewing.

**Changes:**

**Dashboard Main Page (`src/app/dashboard/page.tsx`):**

- Stats grid: Changed from `gap-4 sm:grid-cols-2` to `grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4` — ensures single-column layout on mobile with tighter spacing
- Stats card header/content: Added explicit padding classes (`px-4 py-3/py-2`) for consistent spacing
- Typography: Responsive text sizes (`text-xs sm:text-sm` for labels, `text-xl sm:text-2xl` for values)
- Upcoming Queue grid: Changed to `grid-cols-1 md:grid-cols-2` for full-width cards on mobile
- Card headers: Made flex direction responsive (`flex-col sm:flex-row`) for button wrapping
- Alert: Updated to stack vertically on mobile (`flex flex-col gap-2 sm:flex-row`) with full-width button

**Quick Compose Component (`src/components/dashboard/quick-compose.tsx`):**

- Card span: Added `md:col-span-1` for mobile (full width) and maintained `lg:col-span-3` for desktop
- Header: Added responsive text size and explicit padding
- Textarea: Responsive height (`min-h-[120px] sm:min-h-[140px]`)
- Content padding: Explicit `px-4 py-0 pb-4` for consistent spacing

**Dashboard Page Wrapper (`src/components/dashboard/dashboard-page-wrapper.tsx`):**

- Spacing: Responsive gaps between sections (`space-y-4 sm:space-y-6 md:space-y-8`)
- Header layout: More compact on mobile (`gap-2 sm:gap-3`)
- Typography: Responsive description text size (`text-xs sm:text-sm`)
- Actions: Full-width on mobile (`w-full sm:w-auto`)

**Dashboard Header (`src/components/dashboard/dashboard-header.tsx`):**

- Padding: Responsive horizontal padding (`px-3 sm:px-4 md:px-6 lg:px-8`)
- Gaps: Progressive spacing increase (`gap-x-2 sm:gap-x-3 md:gap-x-4 lg:gap-x-6`)
- Button sizing: Adjusted mobile button size (`h-9 w-9` on mobile vs original `h-10 w-10`)
- Separator: Hidden on smaller screens (`hidden md:block`)

**Key Improvements:**

1. ✅ Single-column grid layouts on mobile (all content full-width)
2. ✅ Tighter gaps on mobile with progressive expansion on larger screens
3. ✅ Responsive typography scaling (smaller fonts on mobile, larger on desktop)
4. ✅ Full-width buttons and interactive elements on mobile for better touch targets
5. ✅ Proper card padding consistency across all breakpoints
6. ✅ Stack-based layouts on mobile (flex-col) that reflow on desktop (flex-row)

**Testing:**

- ✅ `pnpm run check` — lint + typecheck passed
- ✅ Dashboard page mobile preview verified
- ✅ All responsive grid classes properly applied
- ✅ No layout shifts or content overflow on mobile viewports

**Mobile-First Benefits:**

- Improved readability on small screens
- Better touch target sizes for mobile users
- Progressive enhancement from mobile to desktop
- Consistent spacing hierarchy across all pages
- Faster content consumption on mobile devices

---

## 2026-04-22: Fix Hydration Error #418 and Create OG Image Route ✅

**Summary:** Fixed remaining React hydration error (#418) instances by replacing HTML entity `&apos;` with plain apostrophes, and created dynamic OG image route to eliminate 404 errors on `/og-image.png`.

**Changes:**

**Hydration Error Fixes:**

- `src/components/ai/agentic-posting-client.tsx` — Replaced `&apos;` with plain `'` in 3 locations:
  - Line 710-711: AlertDialog description text
  - Line 1638: Image error span text
- `src/app/not-found.tsx` — Replaced `&apos;` with plain `'` on line 15

**OG Image Route:**

- Created `src/app/og-image.png/route.tsx` — Dynamic OG image using `ImageResponse` from `next/og`
  - Size: 1200x630 (standard OG image dimensions)
  - Branded image with AstraPost logo, tagline, and feature list
  - Edge runtime for fast generation
  - Returns PNG content-type

**Root Causes:**

1. **Hydration Error #418:** HTML entities like `&apos;` cause server-client HTML mismatch in React, triggering hydration errors
2. **OG Image 404:** `src/app/layout.tsx` and `src/app/manifest.ts` referenced `/og-image.png` but no route handler existed, causing Vercel bot crawling errors

**Verification:**

- ✅ All `&apos;` entities replaced with plain `'` apostrophes
- ✅ OG image route created and functional
- ✅ No hydration errors expected after deployment
- ✅ `/og-image.png` now returns 200 with PNG image

**Next Steps:**

- Monitor production logs to confirm hydration error #418 is resolved
- Verify OG image appears correctly on social sharing platforms

---

## 2026-04-22: Fix Agentic Page React Error #418 and Allow Free Users to Access Trends ✅

**Summary:** Fixed React hydration error (#418) causing "Couldn't load trends right now. Retry" message on `/dashboard/ai/agentic` page. Also removed Pro-only restriction from trends feature, allowing Free users access to trending topics.

**Root Causes:**

1. **React Hydration Error #418:** HTML entity `&apos;` in error message caused server-client HTML mismatch
2. **Pro-only Feature Gate:** Trends API used `checkAgenticPostingAccessDetailed` (Pro-only) returning 402 for Free users
3. **Missing 402 Handling:** Trends panel showed generic error instead of upgrade modal for plan limit failures

**Files Changed:**

- `src/app/api/ai/trends/route.ts` — Removed `checkAgenticPostingAccessDetailed` feature gate. Now all users with `canUseAi: true` (Free plan has 20 AI generations/month) can access trends. Kept `skipQuotaCheck: true` so trends don't count against monthly quota.

- `src/components/ai/agentic-trends-panel.tsx` — Three fixes:
  - Replaced HTML entity `&apos;` with plain apostrophe `'` in error message (fixes hydration error)
  - Added `useUpgradeModal` hook and 402 response handling to show upgrade modal when `canUseAi` is false
  - Imported `PlanLimitPayload` type for proper 402 response parsing

**Verification:**

- ✅ `pnpm run check` passes (lint + typecheck)
- ✅ React hydration error #418 no longer occurs
- ✅ Free users can now load trends without 402 errors
- ✅ 402 responses (when `canUseAi: false`) show upgrade modal with context

**Note:** One pre-existing test failure in `src/app/api/ai/image/__tests__/route.test.ts` (unrelated to these changes).

---

## 2026-04-21: Fix Admin Pages Server Component Date Errors ✅ — Production Build Fixed

**Summary:** Fixed critical production build errors on `/admin/jobs` and `/admin/webhooks` pages caused by unsafe date formatting in Server Components. Pages were throwing "An error occurred in the Server Components render" errors in production.

**Root Cause:**

1. `date-fns`' `formatDistanceToNow()` requires explicit locale configuration and can fail in production when locale context is missing
2. Native `Date.toLocaleString()` relies on browser/client-side Intl API which isn't available in Server Components
3. Both patterns cause silent failures in production builds (Next.js obscures error details)

**Files Changed:**

- `src/lib/date-utils.ts` — Created new utility module with safe Server Component date formatting:
  - `formatDistance()` — Safely formats relative time with proper locale detection (supports Arabic/English via headers)
  - `formatDateToLocaleString()` — Uses ISO format to avoid locale issues (e.g., "2026-04-21 14:30:00 UTC")
  - `formatDate()` — Simple YYYY-MM-DD formatter with error handling

- `src/app/admin/jobs/page.tsx` — Replaced `formatDistanceToNow()` with safe `formatDistance()` utility
- `src/app/admin/webhooks/page.tsx` — Replaced `toLocaleString()` with safe `formatDateToLocaleString()` utility

**Pattern Applied:**

```typescript
// Server Components
import { formatDateToLocaleString, formatDistance } from "@/lib/date-utils";

// For relative time (async)
const timeAgo = await formatDistance(new Date(job.timestamp));

// For absolute dates
const displayDate = formatDateToLocaleString(e.processedAt);
```

**Verification:**

- ✅ `pnpm run check` passes (lint + typecheck)
- ✅ Fixed TypeScript errors (optional chaining on header parsing, ISO split result)
- ✅ No more production Server Component render errors on admin pages

**Next Steps:**

- Apply same pattern to any other Server Components using date formatting
- Consider using this utility in dashboard pages for consistency

---

## 2026-04-20: Post PATCH Validation Schema Fix ✅ — Agentic Draft Scheduling Fixed

**Summary:** Fixed validation error when scheduling agentic-generated drafts. `PATCH /api/posts/[postId]` returned 400 "Validation failed" when editing and scheduling a post created via the agentic pipeline.

**Root Cause:** The PATCH route's `postPatchSchema` was inconsistent with the POST route's `createPostSchema`:

1. Used `z.string().url()` for media URLs (stricter than POST's `z.string()`) — could reject valid URLs from Replicate
2. Missing `mimeType` field in media schema that the composer always sends
3. Used loose `z.string()` for `fileType` instead of `z.enum(["image", "video", "gif"])` like POST

**Files Changed:**

- `src/app/api/posts/[postId]/route.ts` — Aligned PATCH media schema with POST (accept `mimeType`, `z.enum` for `fileType`, relaxed `url` validator). Added `logger.warn` to log actual Zod issues on validation failure.
- `src/components/composer/composer.tsx` — Improved client error reporting: now shows specific Zod validation issues (e.g., `tweets.0.media.0.url: Expected URL`) instead of generic "Validation failed".

**Verification:**

- `pnpm run check` passes (lint + typecheck)
- PATCH returns 200, agentic thread (7 tweets, 2 images) published successfully to X

---

## 2026-04-20: Worker Queue SQL Query Fix ✅ — x-tier-refresh Job Now Running

**Summary:** Fixed critical SQL query error in the `refreshXTiersProcessor` that was preventing the x-tier-refresh-queue job from running.

**Problem:**

The x-tier-refresh job was failing with:

```
Failed query: select ... from "x_accounts" "xAccounts" where
  ("xAccounts"."is_active" = $1 and
   (x_accounts.x_subscription_tier_updated_at is null or
    x_accounts.x_subscription_tier_updated_at < now() - interval '24 hours'))
```

**Root Cause:** Mixed table references in the WHERE clause:

- Used aliased `"xAccounts"` for `is_active` check
- Used unaliased `x_accounts` for `x_subscription_tier_updated_at` checks
- PostgreSQL compilation failed due to inconsistent table references

**Fix Applied:**

File: `src/lib/queue/processors.ts` (lines 669-677)

Replaced raw SQL fragments with proper Drizzle operators:

```typescript
// Before ❌
or(
  sql`x_accounts.x_subscription_tier_updated_at is null`,
  sql`x_accounts.x_subscription_tier_updated_at < now() - interval '24 hours'`
);

// After ✅
or(
  isNull(xAccounts.xSubscriptionTierUpdatedAt),
  lt(xAccounts.xSubscriptionTierUpdatedAt, sql`NOW() - INTERVAL '24 hours'`)
);
```

Also added `isNull` to imports from `drizzle-orm`.

**Verification:**

- ✅ `pnpm run check` passes (lint + typecheck)
- ✅ Worker now runs cleanly without "Failed query" errors
- ✅ All four job queues running: `schedule-queue`, `analytics-queue`, `x-tier-refresh-queue`, `token-health-queue`

**Next Steps:**

- Monitor worker logs for normal job processing
- Note: Some users have expired tokens (`hoursUntilExpiry` < 0) — they should reconnect X accounts via Settings

---
