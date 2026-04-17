# UX/UI Audit Findings

**Audit Date:** 2026-04-16
**Scope:** Page structure, navigation flows, onboarding, consistency, mobile UX, billing UX

---

## Summary

| Severity  | Count  |
| --------- | ------ |
| Critical  | 1      |
| High      | 5      |
| Medium    | 7      |
| Low       | 4      |
| **Total** | **17** |

---

## Critical Findings

### U-C1: Onboarding Wizard Doesn't Cover Feature Discovery

**Files:**

- `src/components/onboarding/onboarding-wizard.tsx`
- `src/app/dashboard/onboarding/page.tsx`
- `src/components/onboarding/dashboard-tour.tsx`

**Severity:** Critical

**Details:** The onboarding wizard covers:

1. Connect X Account
2. Preferences (language, timezone)
3. Compose (write first tweet)
4. Schedule (set a time)
5. AI Tools (try AI generation)

However, it does NOT cover:

- **Analytics discovery** — Users may not know analytics exist
- **Calendar view** — Powerful scheduling feature not introduced
- **Team collaboration** — Relevant for Agency plan users
- **Inspiration/Import** — Key differentiating feature
- **Achievements/Gamification** — Engagement feature

The `DashboardTour` component exists but it's unclear if it's triggered after onboarding or if users ever see it.

**Fix:** Add a "Feature Discovery" step (or post-onboarding tour) that highlights the top 3-5 features users are most likely to need. Ensure `DashboardTour` is triggered after onboarding completion.

---

## High Findings

### U-H1: Information Architecture — Some Features Require 3+ Clicks

**Severity:** High

**Details:** Most features are reachable within 2 clicks from the dashboard (sidebar → page). However:

- **AI History**: Requires sidebar → AI Tools → History (if it's a sub-item) or direct navigation
- **Achievements**: Sidebar → Achievements (visible but easy to miss)
- **Referrals**: Sidebar → Referrals (only visible when feature flag is enabled)
- **Admin Panel**: Separate `/admin` route, not accessible from dashboard sidebar

**Fix:** Ensure all user-facing features are visible in the sidebar. Consider adding a "Discover" or "All Features" page for new users.

---

### U-H2: Navigation Redundancy — AI Tools Section Has 8 Sub-Items

**Files:** `src/components/dashboard/sidebar.tsx`
**Severity:** High

**Details:** The AI Tools section in the sidebar has 8 sub-items:

1. Agentic Posting (Pro, New)
2. AI Tools (main AI writer page)
3. Content Calendar (Pro)
4. Reply Suggester (Pro)
5. Bio Optimizer (Pro)
6. AI History (Admin only)
7. Inspiration
8. AI Affiliate

This creates cognitive overload. Users may not understand the difference between "AI Tools" (the main writer) and "Agentic Posting" or "Content Calendar." The naming is confusing — "AI Tools" is both the section name and a sub-item. Additionally, "Inspiration" and "AI Affiliate" are conceptually different from the AI generation tools.

**Fix:** Consider consolidating AI features into fewer, clearer categories:

- Rename the "AI Tools" sub-item to "AI Writer" to distinguish it from the section
- Group into: "Create" (Writer, Bio, Reply) and "Automate" (Agentic, Calendar)
- Move "Inspiration" to the main nav (it's a content discovery feature, not an AI tool)
- Move "AI Affiliate" to a separate "Monetization" or "Growth" section

---

### U-H3: Billing UX — Usage Limits Not Communicated Before Hitting Them

**Files:**

- `src/components/dashboard/post-usage-bar.tsx`
- `src/components/settings/plan-usage.tsx`
- `src/components/ui/upgrade-banner.tsx`

**Severity:** High

**Details:** The `post-usage-bar` shows remaining posts, but:

- AI quota usage is only visible on the settings page
- Image generation quota is not prominently displayed
- There's no proactive notification when approaching limits (e.g., "You've used 80% of your monthly AI quota")
- The upgrade banner appears but may not be contextual (doesn't say WHY the user should upgrade)

**Fix:** Add contextual upgrade prompts:

- Show AI quota in the sidebar or header
- Add a warning notification at 80% usage
- Make the upgrade banner dynamic: "You've used 45/50 AI generations this month. Upgrade for more."

---

### U-H4: Mobile UX — Data Tables Not Fully Responsive

**Files:**

- `src/components/admin/subscribers/subscribers-table.tsx`
- `src/components/admin/billing/promo-codes-table.tsx`
- `src/components/admin/audit/audit-log-table.tsx`
- `src/components/analytics/top-tweets-list.tsx`

**Severity:** High

**Details:** Admin data tables and some analytics tables may not be fully usable on small screens (320-480px). While shadcn/ui Table component provides basic responsiveness, complex tables with many columns likely overflow or require horizontal scrolling.

**Fix:** Implement responsive table patterns:

- Card layout on mobile (each row becomes a card)
- Hide non-essential columns on small screens
- Add a "View Details" action that opens a drawer/sheet on mobile

---

### U-H5: Compose Page Cognitive Load — Too Many Options Visible at Once

**File:** `src/components/composer/composer.tsx`
**Severity:** High

**Details:** The compose page shows:

- Tweet editor with character count
- AI tools panel (accordion)
- Media upload
- Scheduling controls
- Account selector
- Template dialog
- Viral score badge
- Best time suggestions
- AI image dialog
- Target accounts select

While the AI tools are in an accordion, the overall page can feel overwhelming, especially for new users.

**Fix:** Implement progressive disclosure:

- Start with just the tweet editor and a prominent "Write with AI" button
- Reveal advanced options (scheduling, templates, viral score) as the user engages
- Add a "Quick Compose" mode for simple tweets vs "Advanced" mode for threads with AI

---

## Medium Findings

### U-M1: Consistency — Spacing and Typography Tokens Not Verified

**Severity:** Medium

**Details:** The project uses Tailwind CSS 4 with shadcn/ui, which provides consistent design tokens. However, without a visual audit, it's impossible to verify that spacing, typography scale, and color tokens are used consistently across all 200+ components.

**Fix:** Run a visual regression test suite (Chromatic, Percy) to catch inconsistencies. Document the design token system.

---

### U-M2: Consistency — Button Styles May Vary Between Dashboard and Admin

**Files:** Dashboard components vs Admin components
**Severity:** Medium

**Details:** The dashboard and admin sections may use slightly different button styles, card layouts, or spacing. Both use shadcn/ui but may have custom overrides.

**Fix:** Audit both sections for visual consistency. Extract shared layout components.

---

### U-M3: Onboarding — No Skip/Resume Mechanism

**File:** `src/components/onboarding/onboarding-wizard.tsx`
**Severity:** Medium

**Details:** The onboarding wizard redirects users who haven't completed it. There's no explicit "Skip for now" option that lets users explore the dashboard and return to onboarding later.

**Fix:** Add a "Skip" button that marks onboarding as complete (or partially complete) and allows resuming from the dashboard settings.

---

### U-M4: Empty States — Queue Page May Not Handle Zero Posts Well

**Files:** `src/app/dashboard/queue/page.tsx`, `src/components/queue/queue-content.tsx`
**Severity:** Medium

**Details:** When a user has no scheduled posts, the queue page should show a helpful empty state with a CTA to compose. Verify this exists and is well-designed.

**Fix:** Ensure all list views have meaningful empty states with CTAs.

---

### U-M5: Billing — Plan Comparison Could Be Clearer

**Files:**

- `src/app/(marketing)/pricing/page.tsx`
- `src/components/billing/pricing-table.tsx`
- `src/components/billing/pricing-card.tsx`

**Severity:** Medium

**Details:** The pricing page was previously flagged for "misrepresentation" (removed Instagram claims, fixed feature counts). Verify that the current plan comparison is accurate and easy to understand for Arabic-speaking users.

**Fix:** Cross-reference pricing page claims with actual plan limits in `plan-limits.ts`. Ensure Arabic translations are accurate.

---

### U-M6: Error States — No User-Facing Error Recovery for Failed Posts

**Files:** `src/components/dashboard/failure-banner.tsx`, `src/app/dashboard/page.tsx`
**Severity:** Medium

**Details:** The `FailureBanner` component exists for showing failed posts, but the recovery flow (retry, edit, delete) should be verified for clarity.

**Fix:** Ensure the failure banner provides clear next steps and one-click retry.

---

### U-M7: Accessibility — Color Contrast Not Verified for Dark Mode

**Severity:** Medium

**Details:** The app supports dark mode via `next-themes`. Color contrast ratios in dark mode should be verified, especially for:

- Muted text on dark backgrounds
- Disabled button states
- Error/warning colors
- Link colors

**Fix:** Run automated contrast checks in both light and dark modes.

---

## Low Findings

### U-L1: No Dashboard Search/Command Palette

**Severity:** Low

**Details:** Users must navigate via sidebar to find features. A command palette (Cmd+K) would improve power user efficiency.

**Fix:** Add a command palette component (cmdk) for quick navigation.

---

### U-L2: No User Avatar Upload in Profile Settings

**File:** `src/components/settings/profile-form.tsx`
**Severity:** Low

**Details:** The profile form allows editing name, timezone, and language but doesn't include avatar upload. Users must use the default OAuth avatar.

**Fix:** Add avatar upload to the profile form.

---

### U-L3: No "What's New" / Changelog In-App

**Files:** `src/app/(marketing)/changelog/page.tsx` exists but is marketing-only
**Severity:** Low

**Details:** The changelog page exists on the marketing site but there's no in-app mechanism to notify users of new features.

**Fix:** Use the announcement banner system to highlight new features, or add an in-app changelog modal.

---

### U-L4: Settings Page — Too Many Sections in One Page

**File:** `src/app/dashboard/settings/page.tsx`
**Severity:** Low

**Details:** The settings page has many sections (profile, billing, team, connected accounts, notifications, privacy, voice profile). While there's a section nav, it can feel overwhelming.

**Fix:** Consider splitting settings into separate routes (`/dashboard/settings/profile`, `/dashboard/settings/billing`, etc.) for better URL semantics and direct linking.
