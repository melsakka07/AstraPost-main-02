# AstraPost — Feature Gaps

> Created: 2026-04-13
> Purpose: Strategic product roadmap — gaps in current features

**Implementation Plan for Part 2:** [`docs/features/2026-04-13-existing-feature-improvements.md`](./2026-04-13-existing-feature-improvements.md)

---

## Part 1 — Gaps & Improvements in Existing Features

### 1.1 Plan & Tier Gaps

| Gap                                    | Problem                                                                        | Suggested Fix                                             |
| -------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Pro tier has 0 team members            | Solo creators who work with a VA or editor can't collaborate without Agency    | Add 1 collaborator seat to Pro                            |
| LinkedIn is Agency-only                | Individual Pro creators use LinkedIn — locking it to Agency reduces conversion | Move LinkedIn to Pro (1 account), Agency gets 5           |
| Instagram is incomplete                | Auth flow exists but no posting/scheduling — creates expectation mismatch      | Either finish it or remove from auth entirely             |
| Pro AI quota (100/month) is low        | 100 AI generations for an active creator is ~3/day; easily exhausted mid-month | Raise to 200, or introduce add-on credit packs            |
| Free has no analytics preview          | 7-day retention with no export gives no value signal to convert                | Add a single basic analytics widget on Free to show value |
| No seat-level usage tracking in Agency | Admins can't see which team member is consuming AI quota                       | Add per-member usage breakdown to Agency team dashboard   |

---

### 1.2 Posting & Scheduling Gaps

- **No media library** — users re-upload the same images repeatedly. A persistent, searchable media library would save significant friction.
- **Content Calendar lacks drag-and-drop rescheduling** — currently calendar is view-only in terms of time management; should support dragging posts to new slots.
- **No post failure notification** — when a scheduled post fails, users must manually check the queue. A push/email notification on failure is critical for content reliability.
- **No recurring post option** — "post this thread every Monday" is a common need for evergreen content; no mechanism exists.
- **Bulk import** — no way to import a CSV of scheduled posts (common for agencies migrating from other tools).
- **Thread preview** — no visual renderer showing exactly how the thread will look on X before scheduling.

---

### 1.3 AI Feature Gaps

- **Agentic Posting has no memory across sessions** — each run starts cold. It should remember the user's niche, past strategy, top-performing content, and build on it.
- **Competitor Analyzer is one-shot** — no continuous tracking. It should run periodically and show trend deltas (they gained 20% engagement this week on video content).
- **Voice Profile is static** — it doesn't automatically learn from which posts performed best. It should close the feedback loop: if a casual tone thread got 3x engagement, nudge the voice profile toward casual.
- **Inspiration Engine actions are limited** — Counter-point and Expand are valuable but there is no "turn this into a thread" or "generate image concept from this" action.
- **Reply Generator is reactive only** — users must manually trigger it. No proactive surface that says "you have 12 new replies — here are AI drafts for the best 3 to respond to."
- **No A/B variant scheduling** — Variant Generator creates options but there is no mechanism to schedule two variants at different times and track which wins.
- **Hashtag Generator is isolated** — it should be inline within the composer, not a separate panel. Real-time suggestion as the user types.
- **Thread Writer has no hook strength indicator** — the first tweet determines open rate. It should score each hook on open-rate likelihood before generating the full thread.
- **No content performance prediction** — before posting, no score is shown for the draft content. The Viral Score exists but is not surfaced inline in the composer.
- **AI Chat is generic** — it does not have access to the user's own post history, analytics, or voice profile. It should be a context-aware assistant, not a generic OpenRouter wrapper.

---

### 1.4 Analytics Gaps

- **Analytics are descriptive, not prescriptive** — the platform shows what happened but never tells the user what to do next. Every analytics page should end with 1–3 AI-generated action recommendations.
- **No engagement rate tracking** — only impressions and follower growth. Engagement rate (likes + replies + retweets / impressions) is the metric creators care about most.
- **No revenue attribution** — for creators selling products or driving newsletter signups via bio link, there is no way to attribute which tweet drove a click.
- **Competitor Analyzer lacks share-of-voice metric** — no way to see the user's mindshare relative to competitors in a niche.
- **Best Times is global, not personal** — it uses general X data rather than the user's own specific audience behaviour. Should weight historical personal performance.

---

### 1.5 Collaboration & Workflow Gaps (Agency)

- **No content approval workflow** — team members can create posts but there is no draft → review → approve → schedule pipeline. Critical for agency use where clients must approve before publishing.
- **No role permissions** — all team members have identical access. Agencies need: Admin, Editor, Viewer roles at minimum.
- **No client workspace separation** — agency members all share one team context. Multi-client agencies need separate workspaces per client.
- **No activity log per team member** — no audit trail of who created, edited, or published what.

---

### 1.6 Infrastructure & UX Gaps

- **No Zapier/webhook integration** — can't trigger posts from external tools (newsletter published → auto-tweet) or push data out (post published → notify Slack).
- **No RSS-to-thread pipeline** — bloggers want to automatically convert new blog posts into threads. No mechanism exists.
- **AI usage dashboard is sparse** — shows numbers but no breakdown by feature (how many were threads vs images vs tools).
- **Onboarding is completion-only** — once dismissed it's gone. Users lose the guidance trail if they skip steps.
- **No dark/light mode preference persistence** — minor but affects daily use friction.

---

## Part 2 — Additional Gaps, Quick Wins & UX Improvements

> Added: 2026-04-13 — derived from direct codebase inspection

---

### 2.1 Subscription & Plan UX Frictions

| Issue                                                               | Location                           | Impact                                                        | Fix                                                                                                                                                  |
| ------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pro Annual and Pro Monthly have **identical limits**                | `plan-limits.ts:90–116`            | No incentive to choose annual over monthly                    | Give Pro Annual a limit bonus: 200 AI gens/month (vs 100 monthly), 4 X accounts (vs 3). Add a visual callout on the pricing page.                    |
| Free tier post counter is **invisible** until blocked               | Nowhere surfaced in dashboard      | Users hit the 20-post wall by surprise, causing frustration   | Show a "Posts used: X/20 this month" indicator on the dashboard and in the compose page — same treatment as AI credits in the sidebar                |
| Settings page shows **"Restore Billing"** with no explanation       | `settings/page.tsx:143–146`        | Confusing — users don't know what went wrong                  | Add a tooltip or inline explanation: "Your account is on a paid plan but no active payment was found. This can happen after a failed renewal."       |
| **No downgrade warning** — plan change immediately removes features | `billing/change-plan` route        | Users lose content calendar, scheduled threads, etc. silently | Show a modal before downgrade listing features that will be lost and data that will become inaccessible                                              |
| Pro trial ends with **no in-app countdown**                         | No component surfaces trial expiry | High churn at trial end                                       | Add a dismissible banner at the top of the dashboard showing "X days left in your trial — upgrade to keep Pro access" as the trial approaches expiry |
| **No loyalty reward** for long-term subscribers                     | No retention mechanism             | Monthly subscribers have no reason to stay                    | Add a milestone: after 6 months on Pro, auto-upgrade AI quota by 20%, surface a "Loyalty Bonus unlocked" badge                                       |

---

### 2.2 Composer UX Quick Wins

These are low-effort improvements directly in `src/components/composer/`:

- **No per-tweet character count in thread list** — When composing a thread, each tweet card in the `SortableTweet` list doesn't show how many characters remain. Users must click into each card to discover they're over 280. Add a small `X/280` indicator on each card in collapsed view.

- **"Post to all accounts" cross-posting** — `TargetAccountsSelect` lets users pick which of their connected X accounts to post to, but there is no "Select All" shortcut. Pro users with 3 accounts waste time clicking each one individually.

- **Viral score is not automatic** — `ViralScoreBadge` only fires when the user clicks it. After the first analysis, it should auto-refresh when content changes significantly (debounced 3s after last keystroke, only for Pro+).

- **Hashtag panel is disconnected from the compose area** — Hashtag suggestions live in `AiToolsPanel` but require clicking a separate tab. They should have a one-click "Insert" button that appends the hashtag directly to the last tweet in the thread.

- **"Schedule" CTA is weak** — the compose flow has both "Post Now" and "Schedule" as equal-weight buttons. Scheduling is the primary value proposition; it should be the primary CTA (solid button) and "Post Now" should be secondary (ghost/outline).

- **No "Continue editing draft" recovery flow** — If a user accidentally navigates away while composing, the draft is silently discarded (only a browser `beforeunload` warning). The composer should auto-save to `localStorage` as a crash recovery draft, visible as a "Restore draft?" banner on next visit.

- **Thread tweet ordering arrows missing** — The composer supports DnD via `@dnd-kit/core` for reordering, but there are no up/down arrow buttons as a fallback for mobile users where DnD is error-prone.

---

### 2.3 Dashboard Home UX

Issues found in `src/app/dashboard/page.tsx`:

- **"Today's Posts" stat is ambiguous** — It counts posts _scheduled for_ today (both published and not-yet-published). The label says "Today's Posts" but it doesn't distinguish. Split into "Published Today" and "Scheduled Today" to reduce confusion.

- **Avg. Engagement is all-time** — The stat card shows all-time average engagement with no date context. Add a "last 30 days" badge or sub-label so the number has meaning at a glance.

- **Upcoming Queue cards are not clickable** — Each card in the "Upcoming Queue" section renders the post content but clicking it does nothing. It should navigate to the queue page and scroll to that specific post (or open an edit dialog).

- **Dashboard has no "Today's best posting time" callout** — The `BestTimeSuggestions` component exists for the composer but the dashboard home never surfaces the single best time to post _today_. A one-line callout ("Best time today: 7–9 PM") would be a high-value, low-effort addition.

- **AI credits only in the sidebar** — A user on mobile (where the sidebar is hidden) has no indication of their remaining AI quota unless they open the navigation drawer. Mirror the AI credits badge on the dashboard home page's stat row.

- **Setup checklist auto-hides but never returns** — `SetupChecklist` uses `localStorage` to permanently dismiss; if a user dismisses early and skips steps, there's no way to bring it back. Add a "Re-open checklist" link in Settings > Profile.

---

### 2.4 Analytics UX

Issues found in `src/app/dashboard/analytics/page.tsx`:

- **Manual refresh is the primary way to get new data** — The `ManualRefreshButton` is fine, but users don't know _when_ data was last updated. Add a "Last synced X minutes ago" timestamp next to the refresh button.

- **Best Time Heatmap is buried at the bottom** — It's the most actionable analytics insight but rendered last. Move it above the Top Tweets list, or pin it to a prominent card in the header row.

- **Account selector shows even with 1 account** — When a user has only one X account connected, the `AccountSelector` still renders and takes up space. Hide it when `accounts.length <= 1` to reduce clutter.

- **No engagement rate trend chart** — The analytics page shows follower growth and impressions over time, but not engagement rate over time. This is the metric creators care most about and it currently only exists as a flat average.

- **Export button has no format preview** — The `ExportButton` fires immediately but doesn't inform the user what format they'll get (CSV vs PDF). Add a small dropdown with format selection before triggering the export.

- **Analytics data for failed posts** — Posts that failed to publish are still listed alongside successful ones in the analytics views, distorting engagement rate calculations. Failed posts should be excluded or flagged.

---

### 2.5 Settings Page UX

Issues found in `src/app/dashboard/settings/page.tsx`:

- **No notification preferences section** — Users have no control over which events trigger notifications (post failure, AI quota warning, team invites). A "Notification Preferences" section in Settings would reduce noise for power users.

- **Voice Profile shown to Free users with no lock state** — `VoiceProfileForm` renders for all users but the Pro gate happens inside the form. Free users see it, try to interact, then hit a paywall. Add a `BlurredOverlay` with upgrade prompt over the entire voice section for Free users — same pattern used in analytics.

- **"Export my data" is buried in Privacy** — GDPR-conscious users look for this in Settings > Account, not Privacy. Add a prominent "Export Account Data" card in the Profile section with a description of what's included.

- **Language/timezone preferences have no live preview** — `ProfileForm` lets users set language and timezone, but there's no example showing "your posts will display as: Mon, Apr 13, 2026 at 9:00 PM" in their chosen locale and timezone.

- **No "connected accounts health" at-a-glance** — The connected accounts section shows 3 separate cards (X, LinkedIn, Instagram). There's no quick health indicator showing whether each account's OAuth token is still valid, or warning when it's about to expire.

---

### 2.6 Sidebar & Navigation UX

Issues found in `src/components/dashboard/sidebar.tsx`:

- **AI Credits widget only shows text quota, not image quota** — The bottom widget shows `X/Y AI credits used` but doesn't mention image generation quota. Image generation is expensive and users run into the image quota limit without warning. Add a second progress bar for image credits.

- **"Pro" badge in sidebar doesn't link to upgrade** — Items marked with the Pro badge are visible to Free users, but clicking them leads to the feature page where the user hits a gate. The Pro badge itself should be a link to `/pricing` for Free users — immediate upgrade path.

- **`isAdmin` items are fully hidden from non-admins** — "Jobs" and "AI History" are admin-only. For Pro users, "AI History" could be a useful personal history viewer (not admin analytics). Consider separating admin analytics from user-facing AI history.

- **No keyboard shortcut to open the mobile sidebar** — Mobile users must tap the hamburger icon in the header. A swipe-from-edge gesture is handled by `vaul`, but there's no discoverable shortcut hint anywhere.

- **Active section indicator is exact-match only** — `isActive` checks `pathname === item.href`, so sub-pages like `/dashboard/analytics/competitor` don't highlight the "Analytics" parent in the sidebar. Should use `pathname.startsWith(item.href)` for parent-level active state.

---

### 2.7 RTL / Arabic Localization Gaps

AstraPost is MENA-focused with Arabic as the primary language. The following gaps exist:

- **Brand logo alignment in RTL** — The sidebar brand (`<Rocket /> AstraPost`) uses `gap-2` and renders left-to-right. In RTL mode the icon should be on the right side of the text. The layout is not flipped correctly.

- **No inline language switcher in the dashboard** — The language preference is in Settings only. For Arabic/English bilingual users, a quick toggle (e.g., globe icon in the header) would reduce friction. This is especially important for MENA users who switch between Arabic content and English engagement.

- **Date/time formatting is locale-unaware** — `new Date(post.scheduledAt).toLocaleString()` in `dashboard/page.tsx:257` relies on browser locale, which may output Arabic-Indic numerals or incorrect formats depending on OS settings. Should explicitly pass `{ locale: userLocale }` from the user's stored preference.

- **AI-generated content language defaults** — Thread Writer and AI Tools default to the app language, but users may want to generate content in English while the UI is in Arabic. The language selector in Thread Writer should default to the content language, not the UI language.

- **RTL support in the composer** — `textarea` elements in the composer should auto-detect text direction (Arabic = RTL, English = LTR) and apply `dir="auto"` to prevent misaligned Arabic text.

---

### 2.8 Existing Subscription Feature Enhancements

Improvements to the value proposition of each tier:

#### Free Tier

- Add a persistent "You've used X/20 posts this month" indicator on the compose page (reduce surprise at the limit).
- Show a single basic analytics widget (follower count + impressions for the last 7 days) to demonstrate value before conversion — currently Free has 7-day retention data but nothing is surfaced.
- Allow 1 scheduled thread (single-account, up to 3 tweets) to let Free users experience the scheduling workflow before upgrading.

#### Pro Monthly / Pro Annual

- **Annual bonus**: Pro Annual should get 200 AI gens/month (vs 100 for monthly) and 4 X accounts (vs 3) to justify the commitment. Currently `PLAN_LIMITS` gives both Pro plans identical limits.
- **Add Agentic Posting run history** — Pro users can run agentic posts but have no history to review what was auto-generated and published. A personal AI history log (distinct from admin analytics) should be Pro+.
- **Priority queue processing** — Pro posts jump ahead of Free posts in the BullMQ queue when capacity is constrained. Currently all jobs use the same default queue priority.
- **Trial expiry warning** — No in-app banner surfaces during the last 3 days of a trial. High-urgency users will churn silently.

#### Agency Tier

- **Per-member AI quota allocation** — Agency admins should be able to cap each team member's AI generations (e.g., member A gets 200/month, member B gets 500/month) instead of a shared unlimited pool.
- **Client-facing analytics export** — Agency analytics export is "white-label PDF" but there's no custom branding input (logo, color, firm name). Add a branding configuration in Agency settings.
- **Multiple team workspaces** — Current Agency plan is one workspace with 5 members. Multi-client agencies need separate workspaces (each with their own X accounts and content). This is a top-tier request and an upsell opportunity.
- **Post approval workflow** — Without draft → approve → schedule, an agency admin has no oversight before posts go live. This is the #1 missing enterprise feature.
- **Increased team members limit** — 5 is very low for a real agency. Should be 10, with an "add seat" add-on at $X/seat/month.

---

### 2.9 Empty State & Error UX

- **Empty queue on dashboard** — The current empty state shows "Your queue is empty" with a "Create a Post" button. Add a secondary CTA: "Generate content with Agentic Posting" to drive AI feature adoption from the most-visited page.

- **Failed posts have no retry from dashboard** — `failure-banner.tsx` shows failed posts but only when the user is already on the queue page. The dashboard should surface a count of failed posts with a one-click "Retry All" action directly on the home screen.

- **Inspiration page empty state** — When the user has no bookmarks, the page should suggest a tweet to import directly from the empty state (not just a blank prompt). A curated "starter inspiration" list would reduce the cold-start problem.

- **Competitor Analyzer first-run** — When a user opens Competitor Analyzer for the first time, there's no pre-filled example or tutorial. First-run should show an example analysis (anonymized mock data) so users understand what they'll get before adding a real competitor.

- **Analytics empty state when no X account** — If a user navigates to Analytics without a connected X account, they see an empty chart. Replace with an explicit "Connect your X account to start tracking analytics" card with a direct link to Settings.
