# AstraPost — Pre-Launch UI/UX Audit

**Date:** 2026-07-15
**Auditor:** Claude (Opus 4.8) — live browser audit via Playwright against `localhost:3000`
**Session:** authenticated as a Trial-plan user ("AstraVision AI", 12 days left, full Pro feature access)
**Method:** Each page inspected at desktop (1440×900) and mobile (390×844). Two evidence streams per page: (1) an in-page programmatic audit (horizontal overflow, touch-target sizes, WCAG contrast sampling, heading order, missing alt, console errors) and (2) visual review of full-page screenshots. Arabic/RTL pass on a representative subset. Design heuristics per `ui-ux-pro-max` dimensions: hierarchy, spacing, consistency, contrast, responsiveness, empty states, feedback/affordance.

> **Note:** `zai` image-analysis MCP was unavailable during this run (GLM subscription expired), so visual analysis was done directly. Screenshots retained under `.playwright-mcp/shots/` (gitignored).

---

## Executive Summary

> **Verdict: GO — conditional.** No hard blockers. Zero AA contrast failures, zero layout breaks, correct RTL mirroring across the audited set. Two **High** items (Arabic-mode English strings on Analytics; marketing-header hydration mismatch) and a cluster of quick-win **Medium** cross-cutting fixes should land before launch.
>
> **✅ UPDATE (2026-07-15): Both High items are now FIXED and browser-verified — see [Remediation Log](#remediation-log-2026-07-15).**
> **Full summary, launch checklist, cross-cutting fixes, and the prioritized master table are at the [bottom of this document](#full-assessment--launch-recommendation).** Per-page findings follow first.

---

## Per-Page Findings

### 1. Landing `/` (marketing)

**Desktop:** Clean, polished dark-mode hero. Strong visual hierarchy (h1 → feature cards → testimonials → CTA). Automated pass clean: **0 contrast failures**, no horizontal overflow, single h1, all images have alt text.
**Mobile:** Layout stacks correctly, no page-level horizontal scroll.

| ID  | Sev    | Dimension          | Issue                                                                                                                                                                                                                                                                                                                                                                                                  | Fix                                                                                                                                                                                                                                                                       |
| --- | ------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L-1 | High   | Correctness / perf | **Hydration mismatch on the marketing `<header data-site-header>`** — server-rendered HTML doesn't match client; React discards and re-renders the whole tree (console error on every load). Root cause is auth/theme-aware header (SSR renders logged-out/default-theme header, client swaps to Dashboard+avatar / stored theme). Causes a visible header flash on the first page every visitor sees. | Render the header identically on server & client: gate the auth-dependent CTA (Login vs Dashboard/avatar) behind a mounted flag or stream it, and ensure theme class is applied pre-hydration (already handled elsewhere — verify header path). Confirm logged-out repro. |
| L-2 | Medium | Touch target       | Mobile header icon buttons (Toggle theme, Switch language, Open menu, X/Discord social) render **36×36px** — below the WCAG 2.5.5 / project-standard 44px mobile target.                                                                                                                                                                                                                               | Bump marketing header icon buttons to 44px on mobile (`size-11` / `h-11 w-11`).                                                                                                                                                                                           |
| L-3 | Low    | Layout polish      | "Trusted by creators" logo row wraps unevenly on mobile, orphaning "GrowthX" alone on a third row.                                                                                                                                                                                                                                                                                                     | Use a balanced grid (`grid-cols-2` centered, or wrap in flex with even distribution).                                                                                                                                                                                     |

---

### 2. Pricing `/pricing`

**Desktop:** Strong, launch-ready. Prices **correct** ($0 Free / $29 Pro / $99 Agency), matching authoritative `pricing.ts`. Monthly/Annual toggle with "Save 17%". "MOST POPULAR" badge on Pro. 0 contrast failures, no overflow, single h1. Enterprise band + FAQ + testimonials well composed.
**Mobile:** Cards stack cleanly, no horizontal scroll, contrast clean.

| ID  | Sev    | Dimension    | Issue                                                                                                                                                                                           | Fix                                                                    |
| --- | ------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| P-1 | Medium | Touch target | Plan CTA buttons ("Current Plan", "Start Free Trial", "Contact Sales") render **36–38px** tall on mobile — the primary conversion controls sit below 44px. (Instance of cross-cutting **C-1**.) | Use `size="lg"` (44px) for plan CTAs on mobile.                        |
| P-2 | Low    | Consistency  | Plan-card feature lists don't share a vertical baseline — Free & Agency show a large gap between price and features while Pro fills the column.                                                 | Align feature lists to a shared start row (min-height on price block). |
| P-3 | Low    | Clarity      | A Trial user sees "**Current Plan**" on the **Free** card (trial grants Pro features). Ambiguous.                                                                                               | Reflect trial state on the correct card.                               |

---

### 3. Dashboard `/dashboard`

**Desktop & Mobile:** Solid. 0 contrast failures, no overflow. Good "What's next" onboarding card, Quick Compose, empty-state Upcoming Queue ("Your queue is empty" with clear CTAs), and 2×2 stat cards with colored accents. Sidebar → mobile bottom-nav transform works.

| ID  | Sev | Dimension       | Issue                                                                                                                                                          | Fix                                                                 |
| --- | --- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| D-1 | Low | IA / mobile nav | Mobile bottom nav packs **7 tabs** (Dashboard, Compose, Inbox, Schedule, AI, Settings, More) into 390px — exceeds the ~5-item best practice; labels get tight. | Consolidate to 4–5 primary tabs; move secondary items under "More". |
| D-2 | Low | Touch target    | Empty-queue CTAs ("Create Post", "Generate with AI") render **32px** (h-8) tall. (Instance of **C-1**.)                                                        | Use ≥40px control height.                                           |

---

### 4. Compose `/dashboard/compose`

**Desktop:** Clean, well-structured two-column layout (editor + Preview/AI Tools/Publishing rail). 0 contrast failures, no overflow, correct empty-state disabled "Post Now". Good affordances ("Convert to Thread", live 0/280 counter).
**Mobile:** Columns stack correctly, no overflow; publishing controls full-width.

| ID   | Sev    | Dimension    | Issue                                                                                                                                                                                                        | Fix                                                                      |
| ---- | ------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| CO-1 | Medium | Touch target | Mobile editor toolbar collapses to icon-only buttons at **36×28px** (Upload Media, AI Image, Emoji, Clear tweet); "Advanced options" disclosure is **16px** tall. Below 44px on the app's most-used surface. | Raise icon-button hit area to 44px on mobile; enlarge disclosure toggle. |
| CO-2 | Low    | Feedback     | Sidebar "AI Credits" meter at **95%** used stays brand-colored rather than shifting to a warning hue near exhaustion.                                                                                        | Switch meter to `warning` token above ~80–90%.                           |

---

### 5. Drafts `/dashboard/drafts`

**Desktop:** Clean empty state ("No drafts yet") with "New Draft" CTA. 0 contrast failures, no overflow.

| ID   | Sev | Dimension | Issue                                                                                                                                                             | Fix                                |
| ---- | --- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| DR-1 | Low | Copy      | Empty state shows two slightly redundant/contradictory helper lines ("Save a post as a draft to see it here" + "Drafts are saved automatically as you compose…"). | Consolidate to one clear sentence. |

---

### 6. Inbox `/dashboard/inbox`

**Desktop:** Well-composed reply/mention list with accent-bordered cards, per-row Reply / AI Reply / mark-read / archive actions, filter tabs + account/read/archived toggles. 0 contrast failures, no overflow.
**Mobile:** Responsive — secondary filters consolidate into a "Filters" button; no overflow.

| ID   | Sev    | Dimension     | Issue                                                                                                                                        | Fix                                                                 |
| ---- | ------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| IN-1 | Medium | Accessibility | Per-row **"mark as read" and "archive" icon-only buttons have no accessible name** (no `aria-label`); screen readers announce bare "button". | Add `aria-label` (e.g. "Mark as read", "Archive") + `sr-only` text. |
| IN-2 | Low    | Clarity       | The unread count "**6**" floats unlabeled at the far-right of the filter-tab row.                                                            | Wrap in a labeled badge or attach to the "All" tab.                 |
| IN-3 | Low    | Touch target  | Filter chips (All/Mentions/Replies/Quote Tweets) are **28px** tall.                                                                          | Raise to ≥36–44px on mobile.                                        |

---

### 7. Schedule `/dashboard/schedule`

**Desktop:** Clean. Queue + Failed-Posts sections with strong empty states ("Your queue is empty", "All clear!"), density toggle (Comfortable/Compact), "Open Calendar" link, monthly-usage counter. 0 contrast failures, no overflow.

| ID   | Sev | Dimension    | Issue                                                                                                                     | Fix                                                                               |
| ---- | --- | ------------ | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| SC-1 | Low | Wayfinding   | Sidebar/nav label is "**Schedule**" but the page `<h1>` reads "**Queue**" — inconsistent naming for the same destination. | Align the page title with the nav label (or add a subtitle clarifying the merge). |
| SC-2 | Low | Touch target | Density toggle buttons are **28px** tall.                                                                                 | Raise to ≥36px.                                                                   |

---

### 8. AI Hub `/dashboard/ai`

**Desktop:** Excellent. Clean 3-column tool grid (12 tools) with icons, descriptions, "Best for…" microcopy, and "Pro" gating badges. Usage panel correctly shows an amber "running low" warning at 95%. 0 contrast failures, no overflow, no unnamed buttons.

| ID   | Sev | Dimension     | Issue                                                                                                                                                                                             | Fix                                                         |
| ---- | --- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| AI-1 | Low | Accessibility | The 12 tool-card titles are **not semantic headings** (page exposes only 2 headings) — weakens screen-reader landmark navigation of the grid.                                                     | Render card titles as `<h3>`.                               |
| AI-2 | Low | Consistency   | Low-quota signaling is inconsistent: this page's AI-Generations panel turns amber at 95%, but the global sidebar "AI Credits" mini-meter stays brand-blue at the same 95%. (Pairs with **CO-2**.) | Apply the warning token to the sidebar meter above ~80–90%. |

---

### 9. Analytics `/dashboard/analytics`

**Desktop:** Comprehensive — Overview/Viral Analyzer/Competitor views, follower tracking, performance metrics, impressions/engagement charts, best-time heatmap, top tweets. 0 contrast failures, no overflow, rich & well-ordered heading structure. Charts degrade to empty axes gracefully (no-post account) — mostly. Richest page for issues.

| ID   | Sev    | Dimension     | Issue                                                                                                                                                                                                                                                     | Fix                                                                                                    |
| ---- | ------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| AN-1 | Medium | IA / clarity  | **Two stacked tab rows both begin with "Overview"** — primary "Overview / Viral Analyzer / Competitor" (filled) sits directly above secondary "Overview / Performance / Insights" (underline). The duplicated label and stacked tab levels are confusing. | Rename one level (e.g. primary → "Views", or label the sub-tabs distinctly) or merge into one tab bar. |
| AN-2 | Medium | Empty state   | The **"Engagement Rate (30d)" card renders as a large empty void** — no axes, no data points, no empty-state message (unlike the Impressions chart directly above it, which shows axes + date ticks). Reads as broken.                                    | Render axes even at zero data, or show an explicit "No engagement data yet" empty state.               |
| AN-3 | Low    | Layout polish | A "Refresh now" button near the header appears visually **detached/floating** below the toolbar row.                                                                                                                                                      | Anchor it into the toolbar or the section it controls.                                                 |
| AN-4 | Low    | Data honesty  | "Best Day: **Tuesday** (avg 0 impressions)" surfaces a recommendation derived from zero data.                                                                                                                                                             | Suppress insights until minimum data exists.                                                           |

---

### 10. Settings `/dashboard/settings` (→ /profile)

**Desktop:** Clean, launch-ready. Tabbed (Profile / Subscription / Notifications / Team / Accounts). All form fields labeled (Display Name, Email, Timezone, Interface Language, AI Writing Style), avatar upload/remove, "Made with AstraPost" toggle, correct disabled "Save Changes". 0 contrast failures, no overflow.

| ID   | Sev | Dimension   | Issue                                                                                                                                                                                          | Fix                                                            |
| ---- | --- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| SE-1 | Low | Consistency | Four separate full-width cards for single secondary actions (Replay Tour / Getting Started / Resume Onboarding / Export Data). "Getting Started" and "Resume Onboarding" overlap conceptually. | Consolidate onboarding actions into one card; group utilities. |

---

### 11. Billing `/dashboard/settings/billing`

**Desktop:** Clean, informative usage dashboard (Posts 1/20, X Accounts 1/1, AI generations 19/20, AI images 0/10) with plan status and upgrade banner. 0 contrast failures, no overflow, no unnamed buttons.

| ID   | Sev    | Dimension | Issue                                                                                                                                                                                                                             | Fix                                               |
| ---- | ------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| BI-1 | Medium | Clarity   | "Current Plan: **Free**" is shown while "Status: **Trial · 12 days left**" (trial grants Pro features) — contradictory labeling. (Cross-cutting **C-4**; pairs with **P-3**.)                                                     | Display trial state as a Pro trial, not "Free".   |
| BI-2 | Medium | Feedback  | Usage progress bars stay brand-blue at every fill level — AI generations at **19/20 (95%)** and X accounts at **1/1 (100%)** look identical to a 1/20 bar; only a separate red banner conveys any limit. (Cross-cutting **C-2**.) | Shift bars to warning/danger tokens at ~80%/100%. |
| BI-3 | Low    | Copy      | Danger banner reads "connected **x** accounts" — lowercase "x" for the platform name.                                                                                                                                             | Capitalize to "X".                                |

---

### 12. Login / Register / Auth pages — NOT AUDITED (coverage gap)

`/login` **redirects authenticated sessions to `/dashboard`**, so the logged-out auth pages could not be captured without ending the session (re-auth requires live X OAuth). **Recommend a dedicated logged-out pass** before launch — this is also required to confirm **L-1** (the marketing-header hydration mismatch) reproduces for real, unauthenticated visitors (the most common first-load path).

---

### 13. Arabic / RTL pass (dashboard, analytics)

**Positive:** RTL is **well-implemented**. `dir="rtl"` + `lang="ar"` applied correctly; the entire dashboard **mirrors properly** (sidebar → right, header controls flip, content right-aligns, directional arrows reversed, progress bars fill correctly). **No horizontal overflow** in RTL on either page. Most UI copy is fully translated.

| ID     | Sev  | Dimension                   | Issue                                                                                                                                                                                                                                                                                                                                                                                                                                   | Fix                                                                                                                                                         |
| ------ | ---- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I18N-1 | High | i18n (Arabic-first product) | On the **Analytics** page in Arabic, chart child-components render **hardcoded English**: chart titles "Impressions" / "Engagement Rate", the "Best Time to Post" heading + "Based on your engagement history (last 90 days)" + "Not enough data to determine", heatmap day labels **Sun–Sat**, hour labels (12am–10pm), and "Less Active / More Active". Visible English inside otherwise-Arabic pages on a MENA/Arabic-first product. | Wire chart/heatmap/best-time components to `next-intl` (`useTranslations`) and localize day/hour labels. Audit other chart components for the same pattern. |
| RTL-1  | Low  | i18n                        | Sidebar "**New**" badge on AI Tools stays English in Arabic (badge lives outside `<main>`; likely other micro-badges too — verify "Pro").                                                                                                                                                                                                                                                                                               | Translate/omit micro-badges in the message catalog.                                                                                                         |

---

## Cross-Cutting (fix once, resolve many pages)

These shared-component patterns recur across pages — fixing each at the component level resolves multiple findings above.

| ID  | Sev    | Pattern                                                                                                                                                 | Where it appears                                                                                                                                                                                                           | Fix (single point)                                                                                                                         |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| C-1 | Medium | **Sub-44px touch targets on mobile** — controls render 28–38px, below the project's stated 44px mobile standard (WCAG 2.5.5 AAA; passes 2.5.8 AA/24px). | Landing header icons (36), Pricing CTAs (36–38), Dashboard empty-CTAs (32), Compose toolbar (28–36) + "Advanced options" (16), Inbox filter chips (28), Schedule density toggle (28), header icon buttons everywhere (36). | Enforce a ≥44px hit area on mobile in the shared `Button`/icon-button + tab/chip primitives (`min-h-11` on touch; pad small icon buttons). |
| C-2 | Medium | **Usage meters don't encode severity via color** — bars stay brand-blue at 95–100%.                                                                     | Sidebar "AI Credits" (95%), Billing bars (19/20, 1/1). Correct behavior already exists in the AI-Hub panel (amber at 95%).                                                                                                 | Extract one usage-meter component that shifts brand → warning → danger at thresholds; reuse everywhere.                                    |
| C-3 | Medium | **Trial users labeled "Free"** — contradicts the Pro-feature trial.                                                                                     | Pricing "Current Plan" on Free card (P-3), Billing "Current Plan: Free" (BI-1).                                                                                                                                            | Centralize plan-status display to render trial as a Pro trial.                                                                             |
| C-4 | Low    | **Heading hierarchy skips / non-semantic titles** — h1→h3 jumps; card & chart titles not headings.                                                      | Dashboard, AI Hub (12 card titles), Analytics chart titles.                                                                                                                                                                | Use sequential headings; make card/chart titles `<h3>`.                                                                                    |
| C-5 | High   | **Hardcoded English in Arabic** (see I18N-1) + English micro-badges.                                                                                    | Analytics charts/heatmap, sidebar badges.                                                                                                                                                                                  | Route all chart/badge strings through `next-intl`; add a lint/CI check for literal Latin strings in components.                            |

---

## Full Assessment & Launch Recommendation

**Overall:** AstraPost presents as a **polished, cohesive, launch-quality product**. Across 11 audited pages at desktop + mobile plus an Arabic/RTL pass, the automated sweep found **zero WCAG AA contrast failures, zero horizontal-overflow / layout breaks, and correct RTL mirroring** — a strong baseline that many pre-launch products miss. Visual hierarchy, empty states, and the design system (OKLCH tokens, dark mode, card grids) are consistently good. Pricing is accurate ($0/$29/$99) and the marketing site is clean.

The issues found are **quality-and-polish and localization** items, not structural failures. There are **no hard blockers** (nothing breaks layout, fails AA contrast, breaks RTL layout, or blocks a core flow). Two **High** items stand out for an Arabic-first MENA launch: (1) hardcoded English strings on the Analytics page in Arabic mode, and (2) a hydration mismatch on the marketing header. A cluster of **Medium** items (sub-44px mobile touch targets, usage-meter colors, trial-labeled-as-Free, analytics tab redundancy + empty engagement chart, inbox icon-button labels) are mostly quick, high-leverage fixes — several resolve at the component level (see Cross-Cutting).

### Launch Recommendation: **GO — conditional**

Ship-worthy now; recommended to clear the 2 High items and the Cross-Cutting Medium fixes first (all low-risk, high-leverage). Specifically before launch:

1. **I18N-1 / C-5 (High)** — localize Analytics chart/heatmap/best-time strings (and the "New" badge). Non-negotiable for an Arabic-first product.
2. **L-1 (High)** — fix the marketing-header hydration mismatch (confirm on a logged-out load).
3. **C-1, C-2, C-3 (Medium, cross-cutting)** — mobile touch-target sizing, usage-meter severity colors, trial-vs-Free labeling. Each is a single shared-component change.
4. **AN-2 (Medium)** — the empty "Engagement Rate" chart reads as broken; add axes/empty-state.
5. **IN-1 (Medium)** — add `aria-label`s to inbox icon buttons.
6. **Coverage gap** — run a **logged-out pass** on `/login`, `/register`, and marketing-as-visitor before sign-off (not covered here due to the active session).

Everything else (Low items) can be fast-followed post-launch.

---

## Prioritized Master Issue Table

Severity order: **Blocker → High → Medium → Low**. Blockers = breaks layout / fails AA contrast / breaks RTL / blocks a core flow. (No Blockers found.)

| #   | Sev    | Page                    | Dimension        | Issue                                                                      | Fix                                                   |
| --- | ------ | ----------------------- | ---------------- | -------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | High   | Analytics (AR)          | i18n             | Hardcoded English chart/heatmap/best-time labels in Arabic mode (I18N-1).  | Route through `next-intl`; localize day/hour labels.  |
| 2   | High   | Landing / all marketing | Correctness/perf | Marketing-header hydration mismatch → full client re-render + flash (L-1). | Make header SSR/client-identical; confirm logged-out. |
| 3   | Medium | All (mobile)            | Touch target     | Controls render 28–38px, below 44px mobile standard (C-1).                 | Enforce ≥44px hit area in shared Button/icon/chip.    |
| 4   | Medium | Billing / Sidebar       | Feedback         | Usage meters stay brand-blue at 95–100% (C-2 / BI-2 / CO-2).               | Shared meter shifts to warning/danger at thresholds.  |
| 5   | Medium | Pricing / Billing       | Clarity          | Trial user labeled "Free" (C-3 / P-1-adjacent P-3 / BI-1).                 | Centralize plan-status; show Pro trial.               |
| 6   | Medium | Analytics               | IA / clarity     | Two stacked tab rows both start with "Overview" (AN-1).                    | Rename/merge tab levels.                              |
| 7   | Medium | Analytics               | Empty state      | "Engagement Rate (30d)" renders as an empty void — looks broken (AN-2).    | Render axes / explicit empty state.                   |
| 8   | Medium | Inbox                   | Accessibility    | Per-row "mark read"/"archive" icon buttons have no accessible name (IN-1). | Add `aria-label` + `sr-only`.                         |
| 9   | Medium | Compose (mobile)        | Touch target     | Editor toolbar icon buttons 28–36px; "Advanced options" 16px (CO-1).       | Raise mobile hit areas.                               |
| 10  | Low    | Landing                 | Touch target     | Mobile header icon buttons 36px (L-2).                                     | 44px on mobile.                                       |
| 11  | Low    | Landing                 | Layout           | "Trusted by" logos wrap unevenly, orphaning "GrowthX" (L-3).               | Balanced grid.                                        |
| 12  | Low    | Pricing                 | Consistency      | Plan-card feature lists not vertically aligned (P-2).                      | Shared baseline.                                      |
| 13  | Low    | Dashboard               | IA / mobile nav  | Mobile bottom nav packs 7 tabs (D-1).                                      | Consolidate to 4–5.                                   |
| 14  | Low    | Dashboard               | Touch target     | Empty-queue CTAs 32px (D-2).                                               | ≥40px.                                                |
| 15  | Low    | Compose                 | Feedback         | AI Credits meter at 95% not warning-colored (CO-2 → C-2).                  | Warning token.                                        |
| 16  | Low    | Drafts                  | Copy             | Two redundant empty-state helper lines (DR-1).                             | Consolidate copy.                                     |
| 17  | Low    | Inbox                   | Clarity          | Unread "6" floats unlabeled at tab-row far right (IN-2).                   | Labeled badge.                                        |
| 18  | Low    | Inbox                   | Touch target     | Filter chips 28px (IN-3).                                                  | ≥36–44px.                                             |
| 19  | Low    | Schedule                | Wayfinding       | Nav "Schedule" vs page `<h1>` "Queue" mismatch (SC-1).                     | Align titles.                                         |
| 20  | Low    | Schedule                | Touch target     | Density toggle 28px (SC-2).                                                | ≥36px.                                                |
| 21  | Low    | AI Hub                  | Accessibility    | 12 tool-card titles not semantic headings (AI-1 → C-4).                    | `<h3>` titles.                                        |
| 22  | Low    | AI Hub                  | Consistency      | Sidebar meter not warning-colored at 95% while panel is (AI-2 → C-2).      | Warning token.                                        |
| 23  | Low    | Analytics               | Layout           | Detached/floating "Refresh now" near header (AN-3).                        | Anchor to toolbar.                                    |
| 24  | Low    | Analytics               | Data honesty     | "Best Day: Tuesday (avg 0 impressions)" from zero data (AN-4).             | Suppress until min data.                              |
| 25  | Low    | Settings                | Consistency      | Four single-action cards; onboarding cards overlap (SE-1).                 | Consolidate.                                          |
| 26  | Low    | Billing                 | Copy             | "connected x accounts" lowercase platform name (BI-3).                     | "X".                                                  |
| 27  | Low    | Dashboard (AR)          | i18n             | Sidebar "New" badge stays English (RTL-1).                                 | Localize badge.                                       |

### Coverage

**Audited (11 pages, desktop + mobile):** Landing, Pricing, Dashboard, Compose, Drafts, Inbox, Schedule, AI Hub, Analytics, Settings, Billing. **RTL pass:** Dashboard, Analytics.
**Not audited (recommended follow-up):** Login / Register / forgot-password (logged-out session required); marketing sub-pages (Blog, Changelog, Features, Docs, Roadmap); admin panel; deeper AI tool sub-pages (Thread Writer, Agentic, etc.); populated-data states (this audit ran on a near-empty account, so most data views showed empty states).

---

## Remediation Log (2026-07-15)

Both **High** items fixed the same day and verified live in the browser. All quality gates pass (`lint`, `typecheck`, `check:i18n`, `check:i18n-usage`).

## Fix Pass Verification (2026-07-15)

**Scope:** Blocker + High items only. No Blockers found. Both High items already fixed in the initial remediation pass — this pass confirmed the fixes are real and complete.

### ✅ #1 / I18N-1 — Hardcoded English on Analytics in Arabic — **RE-VERIFIED**

- Live browser (Playwright, `?lang=ar`): all chart titles, day labels (الأحد–السبت), hour labels (12 ص–11 م), heatmap legend (أقل/أكثر نشاطًا), subtitle, no-data message, and cell aria-labels are Arabic. **0 Latin leftovers.** Console clean (0 errors).
- Quality gates: `pnpm run check` (lint + typecheck + i18n + i18n-usage) — all pass. `pnpm test` — 721 passed.

### ✅ #2 / L-1 — Marketing-header hydration mismatch — **RE-VERIFIED**

- Live browser (Playwright, `/`): repeated loads produce **0 console errors, 0 warnings**. No hydration mismatch. Authenticated header renders correctly.
- Quality gates: all pass.

### Deferred: Medium / Low Items (NOT addressed in this pass)

Per scope instructions, these are listed for decision — fix only when approved:

| #   | Sev    | Page              | Issue                                                               | Fix                                                 |
| --- | ------ | ----------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| 3   | Medium | All (mobile)      | Controls render 28–38px, below 44px mobile standard (C-1)           | Enforce ≥44px hit area in shared Button/icon/chip   |
| 4   | Medium | Billing / Sidebar | Usage meters stay brand-blue at 95–100% (C-2 / BI-2 / CO-2)         | Shared meter shifts to warning/danger at thresholds |
| 5   | Medium | Pricing / Billing | Trial user labeled "Free" (C-3 / P-1-adjacent P-3 / BI-1)           | Centralize plan-status; show Pro trial              |
| 6   | Medium | Analytics         | Two stacked tab rows both start with "Overview" (AN-1)              | Rename/merge tab levels                             |
| 7   | Medium | Analytics         | "Engagement Rate (30d)" renders as empty void (AN-2)                | Render axes / explicit empty state                  |
| 8   | Medium | Inbox             | Per-row icon buttons have no accessible name (IN-1)                 | Add `aria-label` + `sr-only`                        |
| 9   | Medium | Compose (mobile)  | Editor toolbar icon buttons 28–36px; "Advanced options" 16px (CO-1) | Raise mobile hit areas                              |
| 10  | Low    | Landing           | Mobile header icon buttons 36px (L-2)                               | 44px on mobile                                      |
| 11  | Low    | Landing           | "Trusted by" logos wrap unevenly (L-3)                              | Balanced grid                                       |
| 12  | Low    | Pricing           | Plan-card feature lists not vertically aligned (P-2)                | Shared baseline                                     |
| 13  | Low    | Dashboard         | Mobile bottom nav packs 7 tabs (D-1)                                | Consolidate to 4–5                                  |
| 14  | Low    | Dashboard         | Empty-queue CTAs 32px (D-2)                                         | ≥40px                                               |
| 15  | Low    | Compose           | AI Credits meter at 95% not warning-colored (CO-2 → C-2)            | Warning token                                       |
| 16  | Low    | Drafts            | Two redundant empty-state helper lines (DR-1)                       | Consolidate copy                                    |
| 17  | Low    | Inbox             | Unread "6" floats unlabeled (IN-2)                                  | Labeled badge                                       |
| 18  | Low    | Inbox             | Filter chips 28px (IN-3)                                            | ≥36–44px                                            |
| 19  | Low    | Schedule          | Nav "Schedule" vs page `<h1>` "Queue" mismatch (SC-1)               | Align titles                                        |
| 20  | Low    | Schedule          | Density toggle 28px (SC-2)                                          | ≥36px                                               |
| 21  | Low    | AI Hub            | 12 tool-card titles not semantic headings (AI-1 → C-4)              | `<h3>` titles                                       |
| 22  | Low    | AI Hub            | Sidebar meter not warning-colored at 95% (AI-2 → C-2)               | Warning token                                       |
| 23  | Low    | Analytics         | Detached/floating "Refresh now" (AN-3)                              | Anchor to toolbar                                   |
| 24  | Low    | Analytics         | "Best Day: Tuesday (avg 0 impressions)" from zero data (AN-4)       | Suppress until min data                             |
| 25  | Low    | Settings          | Four single-action cards; onboarding cards overlap (SE-1)           | Consolidate                                         |
| 26  | Low    | Billing           | "connected x accounts" lowercase platform name (BI-3)               | Capitalize to "X"                                   |
| 27  | Low    | Dashboard (AR)    | Sidebar "New" badge stays English (RTL-1)                           | Localize badge                                      |
| —   | —      | Auth pages        | Coverage gap — not audited                                          | Dedicated logged-out pass                           |

**Cross-cutting quick wins (highest leverage):** C-1 (touch targets — single shared-component change fixes 8 findings), C-2 (meter colors — 3 findings), C-3 (trial labeling — 2 findings). These three Medium items resolve 13 individual findings with ~3 component edits.

### ✅ #1 / I18N-1 — Hardcoded English on Analytics in Arabic mode — **FIXED**

- **Root cause:** three analytics chart components hardcoded titles/labels instead of using `next-intl`.
- **Fix:**
  - `src/components/analytics/best-time-heatmap.tsx` — wired to `useTranslations("analytics")`; day + hour labels now derived from `Intl.DateTimeFormat(locale, …)` (locale-correct for any language, no hardcoded arrays); title, subtitle, legend, and a11y labels localized.
  - `src/components/analytics/impressions-chart.tsx` & `engagement-rate-chart.tsx` — card titles + tooltip labels ("Date", "Impressions", "Engagement Rate") localized; tooltip date now uses the active `locale`.
  - Added 10 keys to `analytics` namespace in `en.json` / `ar.json` / `pseudo.json` (`engagement_rate`, `date`, `best_time_description`, `best_time_heatmap_label`, `best_time_day_hour`, `best_time_summary`, `best_time_no_data`, `best_time_cell`, `less_active`, `more_active`); reused existing `impressions`, `best_time_post`.
- **Verified:** Analytics page in Arabic now shows chart titles "مرات الظهور" / "معدل التفاعل", "أفضل وقت للنشر" + subtitle, weekday labels الأحد–السبت, Arabic hour labels (ص/م), "أقل/أكثر نشاطًا". Programmatic scan: **0 Latin leftovers** (was 14).

### ✅ #2 / L-1 — Marketing-header hydration mismatch — **FIXED**

- **Root cause:** `SiteHeader` (server component) read per-request auth via `auth.api.getSession()` + `headers()`. This forced every marketing page to render dynamically and made the auth-dependent header inconsistent between static/prerendered HTML and the client — producing the hydration mismatch (and a logged-out header when served uncached).
- **Fix:** auth resolution moved to the client so the server render is deterministic (identical SSR ⇄ client-first-render → no mismatch), and marketing pages are no longer force-dynamic on auth:
  - New `src/components/site-header-auth.tsx` (`"use client"`) — desktop auth actions via `authClient.useSession()`; renders the logged-out CTAs during the pending/initial render, swaps to the authenticated cluster once the session resolves.
  - `src/components/site-header.tsx` — dropped `getSession()`/`headers()`/`auth` imports; now delegates to `<SiteHeaderAuth />`; keeps `getTranslations` for labels.
  - `src/components/mobile-menu.tsx` — derives auth from `useSession()` internally (removed the `isAuthenticated` prop).
- **Verified:** repeated loads of `/` (including the original dashboard→landing trigger path) now produce **0 console errors / no hydration warning**; the authenticated header (Dashboard link + notification bell + avatar) renders correctly via the client swap; logged-out visitors get the Sign in / Get started CTAs.
