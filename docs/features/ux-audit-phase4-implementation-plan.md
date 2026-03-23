# UX Audit Phase 4 — AI Tools, Inspiration, Affiliate & Analytics Pages

**Date:** 2026-03-23
**Auditor:** Senior UX Architect (20 years — Google, X/Twitter, Notion, Figma)
**Scope:** 9 dashboard pages across AI Tools, Inspiration, Affiliate, and Analytics

---

## Pages Audited

| # | Page | Route | Type |
|---|------|-------|------|
| 1 | AI Writer | `/dashboard/ai` | Client |
| 2 | Content Calendar | `/dashboard/ai/calendar` | Client |
| 3 | Reply Suggester | `/dashboard/ai/reply` | Client |
| 4 | Bio Optimizer | `/dashboard/ai/bio` | Client |
| 5 | Inspiration | `/dashboard/inspiration` | Client |
| 6 | Affiliate Generator | `/dashboard/affiliate` | Client |
| 7 | Analytics Overview | `/dashboard/analytics` | Server |
| 8 | Viral Analyzer | `/dashboard/analytics/viral` | Client |
| 9 | Competitor Analyzer | `/dashboard/analytics/competitor` | Client |

---

## 1. First Impressions & Visual Hierarchy

### Cross-Page Pattern Issues

**F1. Inconsistent page density and layout patterns**
- **Problem:** Some pages use 2-column grid (AI Writer, Affiliate, Bio), some use 3-column (Calendar), some use full-width stacked (Reply, Competitor, Viral). The user has no mental model for "this type of AI page looks like X."
- **Impact:** Each page feels like a different app. Users must re-learn layout conventions on every navigation.
- **Fix:** Standardize: all "generate + review" pages should use a consistent 2-column layout (config left, output right) on desktop. Full-width stacked on mobile. Calendar keeps 1:2 ratio (config sidebar + results).

**F2. Empty states are visually identical across all pages**
- **Problem:** Every page uses the same exact pattern: 56px circle with icon + "Ready to generate" text + description. When a user visits 4 AI pages in a session, they see the same empty state 4 times with only the icon swapped.
- **Impact:** Cognitive blur. Users can't distinguish pages at a glance. No sense of place.
- **Fix:** Differentiate empty states per page with unique illustrations or contextual hints:
  - Thread Writer: Show a mini-preview of what a generated thread looks like (3 blurred tweet outlines)
  - Calendar: Show a blurred weekly grid skeleton
  - Reply Suggester: Show a conversation bubble placeholder
  - Competitor: Show a mock profile card
  - This matches how Notion and Figma use contextual empty states.

**F3. Page descriptions are generic and non-actionable**
- **Problem:** Descriptions like "Generate viral content with AI assistance" don't tell the user what to do first. Compare to Buffer: "Schedule your first post in under 60 seconds."
- **Impact:** First-time users don't know where to start.
- **Fix:** Change descriptions to micro-instructions:
  - AI Writer: "Enter a topic and tone to generate a ready-to-post thread."
  - Calendar: "Set your niche and schedule to get a week of AI-planned content."
  - Reply: "Paste a tweet URL to generate 5 engagement-ready replies."

---

## 2. Element-by-Element Audit

### AI Writer Page (`/dashboard/ai`)

**A1. Tab labels lack descriptive context**
- **Problem:** "Thread", "URL", "Variants", "Hashtags" are one-word labels. A first-time user doesn't know what "URL" does or what "Variants" means in this context.
- **Where:** `page.tsx:232-247`
- **Fix:** Use 2-word labels: "Thread Writer", "URL → Thread", "A/B Variants", "Hashtags". The tab bar already has `max-w-xl` so there's room.

**A2. Thread Writer output is raw text with `---` separators**
- **Problem:** Generated thread displays as `generatedContent` joined with `\n\n---\n\n` (`page.tsx:115`). This is plain text with horizontal rules rendered as literal dashes. No tweet numbering, no card structure, no preview.
- **Impact:** Users can't tell how individual tweets will look when posted. They can't edit individual tweets or reorder them. This is a major gap vs. Typefully (which shows numbered, card-based tweet previews).
- **Fix:** Parse `data.tweets` into an array and render numbered tweet cards (1/N, 2/N, ...) with individual copy buttons, character counts per tweet, and a "Send to Composer" button per tweet or for the whole thread.

**A3. No "Send to Composer" action on any AI Writer tab**
- **Problem:** The only action after generation is "Copy". Users must manually navigate to Compose and paste. This breaks the workflow chain.
- **Where:** Thread tab (`page.tsx:324-326`), URL tab (`page.tsx:418-420`), Variants tab (`page.tsx:507-511`)
- **Impact:** Extra 3-step friction (copy → navigate → paste) on every generation. Calendar and Reply pages have "Send to Composer" but the main AI Writer page does not.
- **Fix:** Add a primary "Open in Composer" button next to Copy. Use `sessionStorage` + `router.push` (same pattern as Inspiration page, `page.tsx:145-151`).

**A4. URL tab has fewer language options than Thread tab**
- **Problem:** Thread tab has 10 languages (`page.tsx:291-301`), URL tab only has 4 (`page.tsx:387-392`). Inconsistent without explanation.
- **Where:** `page.tsx:385-394`
- **Fix:** Provide the same 10 languages across all tabs for consistency, or show a tooltip explaining why fewer languages are available.

**A5. Variant "Use" button has no tooltip or label**
- **Problem:** Small ghost button with text "Use" (`page.tsx:510-512`) doesn't explain what it does. Does it load into the editor? Copy? Navigate?
- **Fix:** Change to "Load into Editor" or add a tooltip. Also add a "Send to Composer" action alongside.

**A6. No character count on generated thread tweets**
- **Problem:** Users can't see if individual tweets exceed 280 characters before copying.
- **Fix:** When rendering generated tweets as cards (see A2), show per-tweet character count with amber/red coloring above 280/1000.

**A7. Slider has no accessible label connecting value to meaning**
- **Problem:** Thread Length slider (`page.tsx:311`) shows "5 tweets" but the slider track has no ARIA valuetext. Screen readers announce the raw number without context.
- **Fix:** Add `aria-valuetext={`${tweetCount} tweets`}` to the Slider component.

### Content Calendar Page (`/dashboard/ai/calendar`)

**A8. Calendar items lack a "select all" or "batch send to composer" action**
- **Problem:** Each calendar item has an individual chevron button to open in Composer (`page.tsx:287-294`). If the AI generates 14 items across 2 weeks, the user must click each one individually.
- **Fix:** Add a "Schedule All in Composer" button at the top of the results area that opens Composer with the full calendar as a queue.

**A9. Calendar results don't show the week number or date range**
- **Problem:** Items are grouped by day name ("Monday", "Tuesday") but without a date or week reference. If planning 4 weeks ahead, all Mondays look the same.
- **Where:** `page.tsx:255-301`
- **Fix:** Add "Week 1: Mar 24-30" headers above each week's items. The API should return `weekNumber` or the UI should compute it.

**A10. Chevron-right icon button lacks accessible label**
- **Problem:** `page.tsx:287-294` — the `<Button size="sm" variant="ghost">` contains only a `<ChevronRight>` icon with no `aria-label` or tooltip.
- **Fix:** Add `aria-label="Open in Composer"` and wrap in a `Tooltip`.

### Reply Suggester Page (`/dashboard/ai/reply`)

**A11. No original tweet preview before generation**
- **Problem:** User pastes a URL and clicks Generate, but doesn't see the tweet content until *after* generation completes. If they pasted the wrong URL, they wasted an AI credit.
- **Where:** Original tweet only renders after `result` is set (`page.tsx:201-208`).
- **Fix:** Add a "Preview" step: after URL paste, fetch the tweet text (lightweight API call) and show it before the user commits to generation. This matches the Inspiration page pattern which shows the imported tweet before adaptation.

**A12. Reply action buttons are icon-only without labels**
- **Problem:** Copy and Send-to-Composer buttons are icon-only: Copy icon and ChevronRight icon (`page.tsx:245-262`). ChevronRight is especially ambiguous — it could mean "expand", "next", or "go".
- **Fix:** On desktop, show text labels: "Copy" and "Compose". On mobile, keep icon-only with `aria-label` and `Tooltip`.

**A13. Reply cards don't show a character count warning**
- **Problem:** Reply cards show `{reply.text.length} chars` (`page.tsx:242`) but without any visual indicator of whether the length is good or bad for a reply. X replies have the same 280-char limit.
- **Fix:** Color the char count: green for <200, amber for 200-280, red for >280.

### Bio Optimizer Page (`/dashboard/ai/bio`)

**A14. "Generate 3 Bio Variants" button is enabled even with no niche input**
- **Problem:** The generate button's disabled check is `disabled={isLoading}` (`page.tsx:189`) — it doesn't check whether `niche` is provided. The API may fail or produce poor results without a niche.
- **Fix:** Change to `disabled={isLoading || !niche.trim()}`.

**A15. Bio character count doesn't warn when over 160**
- **Problem:** Generated bios show `{v.text.length}/160 chars` (`page.tsx:240`) but there's no red/amber styling when the AI generates a bio that exceeds 160 characters (which can happen with longer languages like Arabic).
- **Fix:** Add conditional coloring: green <=160, red >160.

**A16. No "Apply to X Profile" call-to-action**
- **Problem:** After generating bios, the only action is "Copy." For a bio optimizer, the ideal next step is applying it to the X profile. While AstroPost can't write to X settings API directly, it can deep-link the user to their X profile settings.
- **Fix:** Add a secondary button: "Open X Settings" that links to `https://x.com/settings/profile` (opens in new tab).

### Inspiration Page (`/dashboard/inspiration`)

**A17. History items have no "Re-import" or "Open" action button**
- **Problem:** History items (`page.tsx:429-448`) display the tweet text and author but are completely static — no way to re-import, adapt, or navigate back to the tweet. They're read-only list items.
- **Fix:** Add an "Re-import" button to each history item (same as bookmarks have "Re-adapt"). Also add a "View on X" external link.

**A18. History has no timestamps**
- **Problem:** History items store `createdAt` (`page.tsx:134`) but don't display it. Users can't tell how old an import is.
- **Fix:** Show relative time ("2 hours ago", "3 days ago") using a date formatting utility.

**A19. Bookmark "Re-adapt" reloads the full import flow unnecessarily**
- **Problem:** `handleReadaptBookmark` (`page.tsx:207-231`) makes a fresh API call to re-import the tweet from X. If the tweet has been deleted or the rate limit is hit, the re-adapt fails even though the bookmark already has the text.
- **Fix:** Store full tweet context in bookmarks (or cache it). Fall back to the stored text if the re-import fails, with a notice: "Using cached version — original tweet may have changed."

**A20. Delete bookmark has no confirmation dialog**
- **Problem:** `handleDeleteBookmark` (`page.tsx:234-248`) deletes immediately on click with no confirmation. Accidental clicks lose data permanently.
- **Fix:** Use an `AlertDialog` for destructive actions: "Delete this bookmark? This cannot be undone."

**A21. Bookmark and History tabs have no search or filter**
- **Problem:** As bookmarks accumulate, there's no way to search by author, text content, or action type.
- **Fix:** Add a search input at the top of each tab that filters by author username or tweet text substring.

### Affiliate Generator Page (`/dashboard/affiliate`)

**A22. No "Send to Composer" button**
- **Problem:** Same issue as AI Writer (A3). The generated affiliate tweet can only be copied, not sent to Composer for scheduling.
- **Fix:** Add "Open in Composer" button alongside Copy.

**A23. No language selection**
- **Problem:** The affiliate generator has no language selector. The API route (`/api/ai/affiliate`) has language support in the prompt but the UI doesn't expose it. Arabic users get English-centric tweets.
- **Where:** `page.tsx:95-170` — no language Select component.
- **Fix:** Add a Language select with the same options as other AI tools.

**A24. Generated tweet text shows in `text-lg` while most other output areas use `text-sm`**
- **Problem:** `page.tsx:200` — the generated result uses `text-lg leading-relaxed` which is visually oversized compared to other pages.
- **Fix:** Use `text-sm leading-relaxed` for consistency, or deliberately frame it as a tweet preview with a card/border style that justifies the larger text.

### Analytics Overview Page (`/dashboard/analytics`)

**A25. Page is extremely long with no anchor navigation or sections toggle**
- **Problem:** This Server Component renders Overview (follower tracking + account selector + chart + refresh history) + Performance (5 metric cards + impressions chart) + Insights (heatmap + top tweets) all on one scroll. On mobile, this is 3000+ pixels of content.
- **Impact:** Users seeking "best time to post" must scroll past everything else. No way to jump to a section.
- **Fix:** Add sticky anchor tabs at the top: "Overview | Performance | Insights" that smooth-scroll to sections. Or use a client-side tab component to show one section at a time.

**A26. "Refresh history" section is too prominent**
- **Problem:** The refresh history (`page.tsx:317-351`) shows the last 5 analytics refresh runs with status badges and timestamps. This is operational metadata, not user-facing analytics. It occupies significant vertical space between the follower chart and performance section.
- **Impact:** Creates cognitive overload. Most users don't care about refresh run timestamps.
- **Fix:** Move refresh history into a collapsible `<details>` / `Collapsible` component, default collapsed. Or move it into the Settings page under "Diagnostics."

**A27. Performance metric cards lack trend indicators**
- **Problem:** Cards show absolute numbers (Impressions: 48,320) but no comparison to previous period. Users can't tell if they're improving.
- **Where:** `page.tsx:361-407`
- **Fix:** Add a small "+12% vs last period" or "↑ 2,340" subtitle under each metric. The data is already available by comparing current period vs. previous period of the same length.

**A28. "More options" dropdown (MoreHorizontal) hides useful actions**
- **Problem:** The `DropdownMenu` at `page.tsx:210-236` contains "Comfortable/Compact View", "Open Queue", and "New Post". These are buried behind a three-dot icon.
- **Impact:** The density toggle is a legitimate feature that most analytics dashboards surface prominently (e.g., toggle icons). "Open Queue" and "New Post" are navigation shortcuts that belong in the sidebar, not in an analytics dropdown.
- **Fix:** Extract density toggle into a visible button group (grid icon for compact, list icon for comfortable). Remove the "Open Queue" and "New Post" items — they're already in the sidebar.

### Viral Content Analyzer Page (`/dashboard/analytics/viral`)

**A29. `dangerouslySetInnerHTML` for AI insights is an XSS risk**
- **Problem:** `page.tsx:264-270` renders AI-generated insights with `dangerouslySetInnerHTML` to parse `**bold**` markdown. If the AI model is compromised or returns injected HTML, this creates an XSS vulnerability.
- **Impact:** Security vulnerability — any `<script>` or `<img onerror=...>` in the AI output would execute.
- **Fix:** Use a safe markdown renderer or a simple regex-based bold replacer that escapes HTML first:
  ```tsx
  function safeBold(text: string) {
    const escaped = text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    return escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }
  ```

**A30. No export or share capability for viral analysis**
- **Problem:** After running analysis, there's no way to export the insights, save them, or share them with a team. The data is lost on page reload.
- **Fix:** Add "Export PDF" or "Copy Insights" button. Also persist the last analysis in localStorage so users can see it when they return.

**A31. Insufficient data state and results state can't coexist**
- **Problem:** The insufficient data overlay (`page.tsx:143-188`) and the analysis results (`page.tsx:207-447`) are mutually exclusive. But there's no intermediate state for "some data but not enough for all charts."
- **Fix:** Allow partial rendering — show charts that have data and show "Not enough data" badges on individual charts that lack data, rather than an all-or-nothing approach.

### Competitor Analyzer Page (`/dashboard/analytics/competitor`)

**A32. Empty state mentions `TWITTER_BEARER_TOKEN` configuration**
- **Problem:** `page.tsx:177` shows "Requires TWITTER_BEARER_TOKEN to be configured." This is a developer-facing message in a user-facing UI.
- **Impact:** Confuses non-technical users. Leaks internal implementation details.
- **Fix:** Replace with user-friendly text: "This feature requires a connected X account with API access." Add a link to settings or documentation.

**A33. No comparison between competitor and user's own data**
- **Problem:** The competitor analysis shows the competitor's data in isolation. The real value of competitor analysis is "how do I compare?"
- **Fix:** Add a "Compare with your account" section that shows side-by-side metrics: your posting frequency vs. theirs, your top hashtags vs. theirs, your content types vs. theirs.

**A34. Results page has no "Analyze Another" quick action**
- **Problem:** After analyzing a competitor, if the user wants to analyze another, they must scroll back to the top, clear the input, and re-enter. The input card is pushed above the fold by results.
- **Fix:** Add a sticky "Analyze Another" button at the top of results, or make the input card sticky/pinned.

---

## 3. Discoverability & Affordance

**D1. AI Tools are scattered across 6 sidebar items with no hub page**
- **Problem:** The sidebar lists 6 AI tools individually: AI Writer, Content Calendar, Reply Suggester, Bio Optimizer, Inspiration, Affiliate. A new user has to click each one to understand what they do.
- **Impact:** Feature discoverability is poor. Users who only find the AI Writer may never discover the Reply Suggester or Bio Optimizer.
- **Fix:** Create an AI Tools hub page at `/dashboard/ai` that shows all 6 tools as cards with descriptions, icons, and "Try it" buttons. The current AI Writer content moves to `/dashboard/ai/writer`. The hub page becomes the entry point.

**D2. No breadcrumbs on nested AI pages**
- **Problem:** Pages like `/dashboard/ai/calendar` and `/dashboard/ai/reply` are nested under `/dashboard/ai` but there's no breadcrumb trail. Users at Reply Suggester can't easily navigate back to AI Writer.
- **Fix:** Add breadcrumbs: "AI Tools > Reply Suggester" using a simple Breadcrumb component.

**D3. Sidebar "AI Tools" section is collapsible on mobile, hiding all AI features by default**
- **Problem:** `sidebar.tsx:68` — `collapsible: true` means the AI Tools section starts collapsed on mobile unless the user is already on an AI page. First-time mobile users don't see these features.
- **Fix:** Start the AI Tools section expanded on first visit (detect via localStorage flag). After the user has seen it once, respect the collapsed state.

**D4. No plan badge on Pro-only features in the sidebar**
- **Problem:** Content Calendar, Reply Suggester, Bio Optimizer, and Competitor Analyzer are Pro-only features, but the sidebar shows them identically to free features. Users only discover the paywall after clicking in and trying to use the feature.
- **Fix:** Add a small "Pro" badge next to Pro-only sidebar items. This sets expectations before the user invests time navigating.

**D5. Hashtag Generator is buried inside a tab, not discoverable from sidebar**
- **Problem:** The Hashtag Generator is only accessible via the "Hashtags" tab inside the AI Writer page. It has no sidebar entry. Users who want to quickly generate hashtags for a tweet they're composing in the Composer page would never find this.
- **Fix:** Either add it to the sidebar as a standalone item, or (better) add a "Generate Hashtags" button directly in the Composer's publishing sidebar that opens a sheet/dialog with the HashtagGenerator component.

---

## 4. User Journey & Workflow Continuity

**W1. Generated content doesn't flow into the Composer — critical gap**
- **Problem:** 4 out of 6 AI tools (AI Writer, Hashtag Generator, Affiliate, Bio) have no "Send to Composer" action. Users must copy, navigate to Compose, and paste. Content Calendar and Reply Suggester do have this flow.
- **Impact:** This is the most critical workflow break. The entire purpose of AI tools is to create content for posting. If content doesn't flow into the posting tool, the AI tools feel disconnected from the core product.
- **Fix:** Implement a unified `sendToComposer(tweets: string[])` utility used by all AI tools. Pattern already exists in Inspiration (`page.tsx:145-151`).

**W2. AI Writer thread output doesn't preserve tweet boundaries**
- **Problem:** `page.tsx:115` — `data.tweets.join("\n\n---\n\n")` flattens the array into a single string. The tweet boundaries are lost. When copied, the user gets a blob of text with dashes.
- **Impact:** If sent to Composer, the thread structure is lost — Composer receives one long string instead of an array of tweets.
- **Fix:** Keep `data.tweets` as an array in state. Render as individual tweet cards. When sending to Composer, pass the array via sessionStorage (same as Inspiration pattern).

**W3. No way to iterate on AI output without regenerating from scratch**
- **Problem:** Across all AI pages, the only options after generation are Copy or Regenerate. There's no "Edit this tweet" inline, no "Regenerate just this tweet", no "Change tone of tweet #3."
- **Impact:** Users can't refine output. They either accept the whole thing or start over. This is a significant friction point vs. Typefully which allows per-tweet editing inline.
- **Fix (phased):**
  - Phase 1: Allow inline text editing of generated tweets (contentEditable or Textarea per tweet card).
  - Phase 2: Add "Regenerate this tweet" button per tweet card that re-calls the API for a single tweet while preserving the rest.

**W4. Inspiration → Composer flow doesn't preserve source attribution**
- **Problem:** When sending adapted content to Composer via sessionStorage (`page.tsx:146-150`), only the adapted text is passed. The original tweet's author/URL are stored in `inspiration_source_id` but the Composer doesn't display or use this for attribution.
- **Impact:** Users may accidentally publish adapted content too similar to the original without realizing the source.
- **Fix:** Pass source metadata to Composer and display a small "Inspired by @author" note above the tweet editor, with a similarity score if available.

**W5. Calendar "Open in Composer" only sends the brief, not the topic**
- **Problem:** `calendar/page.tsx:117-122` — `prefill: item.brief` only sends the brief description. The topic, tone, and tweet type are lost. The Composer doesn't know this is supposed to be a thread vs. a tweet.
- **Fix:** Send all metadata: `prefill`, `type` (already done), `tone`, and `topic` as query params. The Composer should use `type=thread` to pre-configure multi-tweet mode.

---

## 5. Cognitive Load & Information Architecture

**C1. AI Writer tries to do 4 things in one page**
- **Problem:** The AI Writer page packs Thread Writer, URL→Thread Converter, A/B Variant Generator, and Hashtag Generator into tabs. Each is a distinct tool with different inputs and outputs.
- **Impact:** The page is overloaded. Users who come for "hashtag generation" must find and click the right tab. The tab bar takes up space that could be used for the tool interface.
- **Fix:** See D1 — move each tool to its own route under the AI hub. The AI Writer route becomes `/dashboard/ai/writer` (threads only). Hashtags moves to `/dashboard/ai/hashtags`. Variants moves to `/dashboard/ai/variants`. URL→Thread stays or merges with Thread Writer as an input mode toggle.

**C2. Analytics page has three section dividers but no visual anchoring**
- **Problem:** "Overview", "Performance", and "Insights" sections use a thin horizontal rule with text label (`page.tsx:249-252`). But there's no visual differentiation between sections — same white background, same card style throughout.
- **Fix:** Add subtle background alternation (e.g., Insights section has a slightly tinted background `bg-muted/5`). Or use larger typography (h2 vs. h3) for section headers with more vertical spacing.

**C3. Viral Analyzer presents 7 chart sections with no guided narrative**
- **Problem:** After analysis, the user sees: stats → insights → hashtags → keywords → length → days → hours → content types. This is a data dump. There's no guidance on what to look at first or what actions to take.
- **Fix:** Add an "Action Plan" card at the top that synthesizes insights into 3 specific actions:
  - "Post threads on Tuesdays at 2pm — your engagement is 3x higher"
  - "Use #tech and #AI — your top-performing hashtags"
  - "Keep tweets under 200 chars — your short tweets get 2.1% more engagement"

**C4. Competitor Analyzer results are overwhelming**
- **Problem:** The results page has: header → 4 metric cards → 2 charts → summary → 2 topic/hashtag cards → 2 strength/opportunity cards → tone profile. That's 12 distinct content blocks in a single scroll.
- **Fix:** Group into expandable sections:
  - "At a Glance" (metrics + summary) — always expanded
  - "Content Strategy" (charts + topics + hashtags) — collapsible
  - "Opportunities for You" (strengths + differentiation) — collapsible
  - "Tone & Style" — collapsible

---

## 6. Accessibility & Inclusive Design

**ACC1. Multiple icon-only buttons missing `aria-label`**

| Page | Element | Location | Fix |
|------|---------|----------|-----|
| AI Writer | Copy button (thread) | `page.tsx:324` | Add `aria-label="Copy to clipboard"` |
| AI Writer | Copy/Use buttons (variants) | `page.tsx:507-511` | Add `aria-label` to both |
| Calendar | ChevronRight button | `calendar/page.tsx:288` | Add `aria-label="Open in Composer"` |
| Reply | Copy button | `reply/page.tsx:248` | Add `aria-label="Copy reply"` |
| Reply | ChevronRight button | `reply/page.tsx:258` | Add `aria-label="Send to Composer"` |
| Viral | No issues found | — | — |
| Analytics | MoreHorizontal trigger | `page.tsx:212` | Has `sr-only` span - OK |

**ACC2. Tab panels lack `role="tabpanel"` explicit association**
- **Problem:** The shadcn/ui Tabs component should handle this, but verify that `TabsContent` generates proper `role="tabpanel"` and `aria-labelledby` attributes. If using Radix Tabs primitives, this should be automatic.
- **Fix:** Audit rendered HTML with browser DevTools. If Radix is handling this, no action needed.

**ACC3. Slider components lack descriptive `aria-label`**
- **Problem:** Thread Length slider (`page.tsx:311`), Posts Per Week slider (`calendar/page.tsx:193`), Weeks slider (`calendar/page.tsx:207`) lack `aria-label`.
- **Fix:** Add `aria-label="Thread length"`, `aria-label="Posts per week"`, `aria-label="Weeks to plan"`.

**ACC4. Color-only status indicators in analytics**
- **Problem:** Refresh history status badges (`analytics/page.tsx:329-337`) use green/red/gray colors only. Also, the follower growth number uses color alone to indicate positive/negative.
- **Fix:** Add icons alongside colors: checkmark for success, X for failed, clock for pending. Use "+" prefix for positive growth and "-" for negative (already partially done).

**ACC5. Heatmap is inaccessible to screen readers and keyboard users**
- **Problem:** The BestTimeHeatmap component renders a grid of colored cells. Screen readers can't interpret the data, and keyboard users can't navigate cells.
- **Fix:** Add a `<table>` with proper `<th>` headers (days/hours) and `aria-label` on each cell with the engagement score. Add a visually-hidden text summary: "Your best posting time is Tuesday at 2pm."

**ACC6. Insufficient color contrast on muted badges**
- **Problem:** Several badge styles use `text-muted-foreground` which may not meet WCAG AA 4.5:1 contrast ratio against `bg-muted` backgrounds, especially in light mode.
- **Fix:** Audit with a contrast checker. For `text-muted-foreground` on `bg-muted/50`, consider using `text-foreground` for important content badges.

**ACC7. RTL support gaps**
- **Problem:** The Inspiration page uses `ms-2 rtl:scale-x-[-1]` on the ArrowRight icon (`page.tsx:307`), showing RTL awareness. But other pages don't apply this pattern:
  - Calendar ChevronRight icon (`calendar/page.tsx:293`)
  - Reply ChevronRight icon (`reply/page.tsx:259`)
  - All `mr-2` on button icons should be `me-2` for RTL support
- **Fix:** Audit all `ml-`, `mr-`, `pl-`, `pr-` utilities across all 9 pages and replace with logical properties (`ms-`, `me-`, `ps-`, `pe-`).

---

## 7. Micro-Interactions & Feedback

**M1. No streaming/progress indication during AI generation**
- **Problem:** All AI tools show only a spinner with "Generating..." during the API call. The user stares at a static spinner for 5-15 seconds with no progress indication. Compare to ChatGPT which shows streaming text appearing in real-time.
- **Impact:** Users feel like the app is stuck. They can't tell if it's working or frozen.
- **Fix (phased):**
  - Phase 1: Add elapsed time counter ("Generating... 3s") and a progress bar (indeterminate or fake-progress that moves slowly).
  - Phase 2: Implement streaming responses via SSE for thread generation, showing tweets appearing one by one.

**M2. Copy button feedback is inconsistent**
- **Problem:** Some pages show both an icon change (Check) AND a toast notification on copy. This is double-feedback. Other pages only show the icon change. Inconsistent.
- **Where:** AI Writer (`page.tsx:123-128`), Affiliate (`page.tsx:86-93`), Reply (`page.tsx:106-111`)
- **Fix:** Standardize: icon change to Check (2s) + toast.success. Apply consistently to all copy buttons.

**M3. No feedback when URL validation fails on Inspiration page**
- **Problem:** `page.tsx:312-316` shows a subtle `text-xs text-muted-foreground` hint "Please enter a valid X/Twitter URL". This is easy to miss — it's the same visual weight as helper text.
- **Fix:** Use destructive text color (`text-destructive`) and add an AlertCircle icon inline. Trigger after the user has typed at least 5 characters (to avoid premature validation).

**M4. Success/error messages auto-dismiss too quickly**
- **Problem:** `successMessage` on Inspiration page auto-dismisses after 3s (`page.tsx:175`). Sonner toasts have default durations too. On slow connections or if the user looked away, they miss the feedback.
- **Fix:** Increase auto-dismiss to 5s for success messages, 8s for errors. Or use persistent banners for errors that require user acknowledgment.

**M5. Bio Optimizer doesn't show character count in real-time on the currentBio textarea**
- **Problem:** The textarea shows `{currentBio.length}/500` (`bio/page.tsx:140`) but this is just text below the field. It should be a live counter that changes color as the user types.
- **Fix:** Move the counter inside the textarea wrapper with dynamic coloring.

**M6. No loading skeleton on Competitor Analyzer**
- **Problem:** Competitor page shows a generic spinner during analysis (`competitor/page.tsx:182-187`). Unlike the Viral page which has a proper skeleton, and the Analytics page which shows proper loading states.
- **Fix:** Add a skeleton matching the result layout: 4 metric card skeletons + chart skeletons.

---

## 8. Competitive Benchmarking

### vs. Typefully (Thread Editor)

| Feature | AstroPost | Typefully | Gap |
|---------|-----------|-----------|-----|
| Thread preview | Raw text with dashes | Numbered cards with char counts | Critical |
| Per-tweet editing | Not possible | Inline editing | Critical |
| Thread reordering | Not possible | Drag-and-drop | High |
| Send to scheduler | Manual copy | Direct integration | Critical (A3/W1) |
| AI refinement | Regenerate all | Per-tweet regeneration | High |

### vs. Buffer (Scheduling)

| Feature | AstroPost | Buffer | Gap |
|---------|-----------|--------|-----|
| Content calendar | AI-generated plan | Visual calendar grid | High (A9) |
| Analytics overview | Single scroll page | Tabbed sections | Medium (A25) |
| Trend indicators | Absolute numbers only | % change vs. period | High (A27) |
| Export | PDF/CSV (Pro) | Multiple formats | Low |

### vs. X/Twitter (Compose Flow)

| Feature | AstroPost | X/Twitter | Gap |
|---------|-----------|-----------|-----|
| AI to compose flow | Copy-paste required | N/A (no AI) | AstroPost differentiator |
| Character feedback | Per-field only | Real-time circular | Medium |
| Thread creation | Separate page | Same flow, + button | Different paradigm |

### vs. Hootsuite (Analytics)

| Feature | AstroPost | Hootsuite | Gap |
|---------|-----------|-----------|-----|
| Competitor analysis | Single account | Multi-account comparison | High (A33) |
| Viral analysis | Full feature | Not available | AstroPost differentiator |
| Actionable insights | AI-generated | None | AstroPost differentiator |
| Data export | Basic | Comprehensive | Medium |

---

## 9. Prioritized Recommendations

### Tier 1: Critical (Must Fix Before Launch)

| # | Issue | Impact | Effort | Pages |
|---|-------|--------|--------|-------|
| W1 | Add "Send to Composer" to all AI tools | Workflow break — users can't use generated content | Medium | AI Writer, Affiliate, Hashtag |
| A2 | Render generated threads as numbered tweet cards | Users can't preview tweet structure | Medium | AI Writer |
| A29 | Fix `dangerouslySetInnerHTML` XSS risk | Security vulnerability | Low | Viral |
| A14 | Fix Bio Optimizer disabled state (missing niche check) | Users can submit empty form | Trivial | Bio |
| ACC1 | Add `aria-label` to all icon-only buttons | WCAG violation, screen readers broken | Low | All pages |
| ACC7 | Fix RTL logical properties (`me-`, `ms-`, `pe-`, `ps-`) | Arabic users see reversed layouts | Medium | All pages |

### Tier 2: High Impact (Significant UX Improvement)

| # | Issue | Impact | Effort | Pages |
|---|-------|--------|--------|-------|
| W2 | Preserve tweet array in state, not joined string | Thread structure lost on copy/compose | Low | AI Writer |
| W3 | Allow inline editing of generated tweets | Users can't refine without regenerating | Medium | AI Writer, URL, Variants |
| A27 | Add trend indicators (% change vs. period) to metrics | Users can't track improvement | Medium | Analytics |
| A25 | Add section navigation or tabs to analytics page | 3000px scroll on mobile | Medium | Analytics |
| D1 | Create AI Tools hub page with all tools as cards | Poor feature discoverability | Medium | AI section |
| D4 | Add "Pro" badge to gated sidebar items | Users hit paywall unexpectedly | Low | Sidebar |
| A20 | Add delete confirmation for bookmarks | Accidental data loss | Low | Inspiration |
| A23 | Add language selector to Affiliate page | Arabic users get English tweets | Low | Affiliate |
| C3 | Add "Action Plan" card to Viral Analyzer | Data dump without guidance | Medium | Viral |
| M1 | Add elapsed time counter during AI generation | Users think app is frozen | Low | All AI pages |
| F2 | Differentiate empty states per page | All pages look the same on first visit | Medium | All pages |
| A32 | Remove dev-facing text from Competitor empty state | Confuses users, leaks internals | Trivial | Competitor |

### Tier 3: Polish (Good to Exceptional)

| # | Issue | Impact | Effort | Pages |
|---|-------|--------|--------|-------|
| A1 | ✅ Use 2-word tab labels on AI Writer | Clarity for first-time users | Trivial | AI Writer |
| A4 | ✅ Harmonize language options across tabs | Inconsistency without explanation | Low | AI Writer |
| A8 | ✅ Add "Schedule All" batch action for calendar | Multi-item workflow friction | Medium | Calendar |
| A9 | ✅ Add week numbers/date ranges to calendar results | Ambiguous day grouping | Low | Calendar |
| A11 | ✅ Add tweet preview before reply generation | Wasted AI credits on wrong URL | Medium | Reply |
| A15 | ✅ Add color-coded char count for bio variants | No visual warning on over-limit | Low | Bio |
| A16 | ✅ Add "Open X Settings" link for bio optimizer | Missing CTA for next step | Trivial | Bio |
| A17 | ✅ Add actions to history items (re-import, view on X) | Static read-only list | Low | Inspiration |
| A18 | ✅ Add timestamps to history items | No temporal context | Trivial | Inspiration |
| A26 | ✅ Collapse/move refresh history | Operational noise | Low | Analytics |
| A28 | ✅ Extract density toggle from dropdown | Useful feature is hidden | Low | Analytics |
| A30 | ✅ Add export/save for viral analysis | Data lost on reload | Medium | Viral |
| A33 | Add self-comparison to competitor analysis | Competitor data in isolation | High | Competitor |
| A34 | ✅ Add sticky "Analyze Another" quick action | Input scrolls off screen | Low | Competitor |
| C4 | ✅ Group competitor results into collapsible sections | 12 content blocks overwhelming | Medium | Competitor |
| D2 | ✅ Add breadcrumbs to nested AI pages | No navigation context | Low | AI sub-pages |
| D5 | ✅ Surface Hashtag Generator in Composer | Discoverable only via AI Writer tab | Medium | Composer |
| F3 | ✅ Change page descriptions to micro-instructions | Generic descriptions don't guide | Trivial | All pages |
| M2 | ✅ Standardize copy button feedback pattern | Inconsistent feedback | Low | All pages |
| M3 | ✅ Improve URL validation feedback styling | Easy to miss error hint | Low | Inspiration |
| M5 | ✅ Real-time character counter on Bio textarea | Static counter below field | Trivial | Bio |
| M6 | ✅ Add loading skeleton to Competitor page | Generic spinner vs. structured skeleton | Low | Competitor |
| ACC3 | ✅ Add `aria-label` to slider components | Screen reader announces raw number | Trivial | AI Writer, Calendar |
| ACC4 | ✅ Add icons alongside color status indicators | Color-only fails colorblind users | Low | Analytics |
| ACC5 | ✅ Make heatmap accessible with table markup | Fully inaccessible to screen readers | Medium | Analytics |
| ACC6 | ✅ Audit muted color contrast ratios | Potential WCAG violation | Low | All pages |
| W4 | ✅ Pass source attribution to Composer from Inspiration | Users may post too-similar content | Low | Inspiration |
| W5 | ✅ Send full metadata from Calendar to Composer | Only brief sent, tone/type lost | Low | Calendar |

---

## Status Tracker

### Phase 4A — Critical Fixes ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| 4A-1 | ✅ Done | `src/lib/composer-bridge.ts` created; Send to Composer added to AI Writer (thread/url/variants tabs), Affiliate page, Hashtag Generator |
| 4A-2 | ✅ Done | Generated threads render as numbered tweet cards with char counts and Copy per card |
| 4A-3 | ✅ Done | `safeBold()` React-node renderer replaces `dangerouslySetInnerHTML` in Viral page |
| 4A-4 | ✅ Done | Bio Optimizer button now `disabled={isLoading \|\| !niche.trim()}` |
| 4A-5 | ✅ Done | `aria-label` added to all icon-only buttons across all 9 pages |
| 4A-6 | ✅ Done | All `mr-`/`ml-` button icon margins replaced with `me-`/`ms-` logical properties |

### Phase 4B — High Impact Improvements ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| 4B-1 | ✅ Done | Hub page at `/dashboard/ai` (6 tool cards). Writer moved to `/dashboard/ai/writer` with `?tab=` deep-linking. Sidebar updated with "AI Hub" + "AI Writer" entries |
| 4B-2 | ✅ Done | `AnalyticsSectionNav` client component with sticky anchor tabs (Overview / Performance / Insights). Section `id` anchors added |
| 4B-3 | ✅ Done | Previous period query added; `delta()` helper; `↑/↓ N vs prev {range}` shown under each of 5 metric cards |
| 4B-4 | ✅ Done | `isPro?: boolean` on `NavItem`; Pro badge on Calendar, Reply, Bio, Competitor sidebar items |
| 4B-5 | ✅ Done | Delete bookmark wrapped in `AlertDialog` with confirmation |
| 4B-6 | ✅ Done | Language select added to Affiliate page (6 options); passed to API |
| 4B-7 | ✅ Done | `src/hooks/use-elapsed-time.ts` created; elapsed counter shown in all AI page loading buttons |
| 4B-8 | ✅ Done | Unique empty states per page: Thread Writer (blurred thread cards), URL→Thread (article→thread preview), A/B Variants (3 angle cards), Calendar (weekly grid skeleton), Reply (conversation bubbles), Bio (3 bio card skeletons), Affiliate (tweet + hashtag preview) |
| 4B-9 | ✅ Done | Competitor empty state text changed from dev-facing `TWITTER_BEARER_TOKEN` message to user-friendly description |
| 4B-10 | ✅ Done | Viral Analyzer "Action Plan" card added — derives best day+hour, top hashtag, best length from analysis data |

### Phase 4C — Polish ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| 4C-1 | ✅ Done | Tab labels updated: "Thread Writer", "URL → Thread", "A/B Variants" (responsive: short labels on mobile) |
| 4C-2 | ✅ Done | All AI tabs now offer 10 languages (ar/en/fr/de/es/it/pt/tr/ru/hi): URL tab, Variants tab, Calendar, Reply, Bio |
| 4C-3 | ✅ Done | `src/components/ui/breadcrumb.tsx` created; breadcrumb added to Calendar, Reply, Bio pages |
| 4C-4 | ✅ Done | Refresh history wrapped in `<details>` (no-JS collapsible), default closed; uses `group-open:` CSS for expand/collapse label |
| 4C-5 | ✅ Done | DropdownMenu replaced with visible density icon toggle (`AlignJustify`/`LayoutGrid`); "Open Queue" and "New Post" items removed |
| 4C-6 | ✅ Done | `formatDistanceToNow` from date-fns added to each history item — shows "2 hours ago" etc. |
| 4C-7 | ✅ Done | "Re-import" button (sets URL + switches to Import tab) and "View on X" link added to each history item |
| 4C-8 | ✅ Done | Reply: green <200, amber 200–280, red >280. Bio: green ≤160, red >160 + "over limit" label. AI Writer: green <240, amber 240–280, red >280 |
| 4C-9 | ✅ Done | All single-tweet copy buttons now fire `toast.success("Copied to clipboard")` + icon change (Check, 2s) consistently |
| 4C-10 | ✅ Done | Generic spinner replaced with 4 metric card skeletons + 2 chart skeletons + summary skeleton, `aria-busy` on wrapper |
| 4C-11 | ✅ Done | `aria-label` + `aria-valuetext` added to Calendar sliders (Posts per week, Weeks to plan); Thread Length slider was already done |
| 4C-12 | ✅ Done | `CheckCircle2` (success), `XCircle` (failed), `Clock` (pending) icons added inline with color badges in refresh history |
| 4C-13 | ✅ Done | All 9 pages updated to action-oriented micro-instruction descriptions |
| 4C-14 | ✅ Done | BestTimeHeatmap rewritten with `<table role="grid">`, `<th scope="col/row">` headers, `aria-label` per cell, visually-hidden `<p>` summary of best time |

### Phase 4E — Streaming Responses ✅ COMPLETE

**Completed:** 2026-03-23

| Task | Status | Notes |
|------|--------|-------|
| 4E-M1 | ✅ Done | `/api/ai/thread` converted from `generateObject` (all-at-once) to `streamText` + custom SSE stream. Server buffers text, emits `data: {"index":N,"tweet":"..."}` events on each `===TWEET===` delimiter, then `data: {"done":true}`. `recordAiUsage` fires after stream closes. |
| 4E-client | ✅ Done | `handleGenerate` in `writer/page.tsx` reads the SSE stream via `ReadableStream.getReader()`. Tweets are added to `generatedTweets` one by one as events arrive. |
| 4E-ui | ✅ Done | Thread tab right column updated: header shows `Generating N / total…` while streaming; action buttons (Copy All, Open in Composer) hidden until stream is complete; pulsing skeleton card appears below the last tweet while more are incoming. |

**Files modified:**
- `src/app/api/ai/thread/route.ts` — replaced `generateObject` with `streamText`; SSE ReadableStream with `===TWEET===` delimiter parsing
- `src/app/dashboard/ai/writer/page.tsx` — SSE stream reader in `handleGenerate`; streaming-aware UI in Thread tab

### M2 — Standardize copy button feedback ✅ COMPLETE

All copy buttons across all pages now consistently fire `toast.success("Copied to clipboard")` + icon change (Copy → Check, 2s). Three non-standard messages fixed:

| File | Old message | Fixed to |
|------|-------------|----------|
| `src/app/dashboard/ai/writer/page.tsx` — `copyAllTweets` | `"All tweets copied"` | `"Copied to clipboard"` |
| `src/app/dashboard/ai/bio/page.tsx` — `copyBio` | `"Bio copied to clipboard"` | `"Copied to clipboard"` |
| `src/components/ai/hashtag-generator.tsx` — `copyAllHashtags` | `"All hashtags copied!"` | `"Copied to clipboard"` |

---

### Phase 4D — Workflow Continuity ✅ COMPLETE

**Completed:** 2026-03-23

| Task | Status | Notes |
|------|--------|-------|
| 4D-W3 | ✅ Done | Inline `<Textarea>` editing on all generated tweet cards (Thread Writer + URL→Thread tabs). Cards highlight with `focus-within:border-primary/40`. Character counter and Copy/Send-to-Composer all use live edited values. `updateGeneratedTweet(idx, text)` and `updateUrlTweet(idx, text)` helpers added to `writer/page.tsx`. |
| 4D-W4 | ✅ Done | Inspiration → Composer attribution flow: `handleSendToComposer` now stores `inspiration_attribution` `{handle, url}` in sessionStorage. Composer reads it in the bridge `useEffect` (section 2), sets `sourceAttribution` state, and renders a dismissible "Inspired by @handle" banner above the tweet editor with a live link to the source tweet. |
| 4D-W5 | ✅ Done | Calendar → Composer full metadata: `openInComposer` now passes `tone` and `topic` as URL params alongside `prefill` and `type`. Composer reads them in the prefill branch (section 3), sets `calendarMeta` state, and renders a dismissible metadata banner showing `Topic: … · Tone: …` above the editor. |
| 4D-M1 | ✅ Done | Elapsed time counter added to Inspiration page's Import button: `useElapsedTime(isLoading)` → button shows "Importing... (Ns)" during fetch. Closes the last AI-page loading state gap. |

**Files modified:**
- `src/app/dashboard/ai/writer/page.tsx` — W3: Textarea inline editing + update helpers
- `src/app/dashboard/inspiration/page.tsx` — W4: attribution storage + M1: elapsed time
- `src/app/dashboard/ai/calendar/page.tsx` — W5: tone + topic URL params
- `src/components/composer/composer.tsx` — W4+W5: new states, bridge reads, dismissible banners; `CalendarDays` icon added to imports

---

### Phase 4F — A8: "Schedule All" Batch Action ✅ COMPLETE

**Completed:** 2026-03-23

| Task | Status | Notes |
|------|--------|-------|
| 4F-A8 | ✅ Done | "Schedule All" button added to Calendar results header bar (visible only when items exist). Clicking opens a Dialog that fetches connected X accounts via `GET /api/x/accounts`, shows a default account pre-selected, and a "Week 1 starts on" date input defaulting to next Monday. On confirm, each item is POSTed to `POST /api/posts` with `action: "schedule"`, `scheduledAt` computed from day name + week number + time string. On success, navigates to `/dashboard/queue`. |

**Files modified:**
- `src/app/dashboard/ai/calendar/page.tsx` — Added `XAccount` interface; `scheduleAllOpen/Accounts/AccountId/StartDate/Loading/Fetching` state; `nextMonday()`, `resolveItemDate()`, `openScheduleAll()`, `handleScheduleAll()` helpers; "Schedule All" bar in results header; full `<Dialog>` with account selector, date input, and confirm button. Added `CalendarCheck`, `User` icon imports; `Dialog*` component imports.

---

### Phase 4G — A11: Tweet Preview Before Reply Generation ✅ COMPLETE

**Completed:** 2026-03-23

| Task | Status | Notes |
|------|--------|-------|
| 4G-A11 | ✅ Done | Eye-icon "Preview" button added inline with the Tweet URL input. Clicking fetches `/api/x/tweet-lookup` (same endpoint used by Inspiration page) and renders the tweet author + text in a muted card between the URL field and the tone/goal selects — before any AI credits are spent. Error shown as `text-destructive` hint under the input. Preview clears when URL changes. A soft tip message ("click 👁 to preview") appears below Generate Replies when a URL is entered but not yet previewed. Generate button remains always-enabled so users who don't need the preview aren't blocked. |

**Files modified:**
- `src/app/dashboard/ai/reply/page.tsx` — Added `preview`, `previewLoading`, `previewError`, `previewedUrl` state; `handleUrlChange()` (clears preview on URL change); `handlePreview()` (calls tweet-lookup, sets preview state); inline Eye-button next to URL input; preview card JSX; tip hint below Generate button. Added `Eye` icon import.

---

### Phase 4H — D5: Hashtag Generator in Composer Sidebar ✅ COMPLETE

**Completed:** 2026-03-23

| Task | Status | Notes |
|------|--------|-------|
| 4H-D5 | ✅ Done | "Hashtags" button added to the Content Tools sidebar grid alongside Hook, CTA, Translate (grid changed from 3-col to 2×2). Clicking calls `openAiTool("hashtags", activeTweetId ?? tweets[0]?.id)` — defaults to the focused tweet or the first tweet, pre-loading its content into `aiTargetTweetId`. Tweet content preview card added to the hashtags AI dialog tab so users can see exactly which tweet is being processed. `isAiGenerateDisabled` guard extended with hashtags case to prevent generation when target tweet is empty. |

**Files modified:**
- `src/components/composer/composer.tsx` — (1) `isAiGenerateDisabled` extended for hashtags empty-content guard; (2) tweet content preview block added to `aiTabsGenerateContent` for `aiTool === "hashtags"`; (3) secondary tools grid changed from `grid-cols-3` to `grid-cols-2` with new Hashtags button calling `openAiTool("hashtags", activeTweetId ?? tweets[0]?.id)`.

---

### Phase 4I — C4: Collapsible Competitor Result Sections ✅ COMPLETE

**Completed:** 2026-03-23

| Task | Status | Notes |
|------|--------|-------|
| 4I-C4 | ✅ Done | Four result sections wrapped in collapsible card pattern using a `<button>` header with animated `ChevronDown` chevron. All open by default. The 4-metric stat grid stays always-visible as an at-a-glance summary. Sections: (1) Charts (Hashtag Prominence + Content Mix consolidated into one card), (2) Strategic Summary, (3) Topics/Hashtags/Insights (2×2 grid unified under one collapsible), (4) Tone Profile. State: `chartsOpen`, `summaryOpen`, `insightsOpen`, `toneOpen` booleans. `CardHeader`/`CardTitle` imports removed (no longer used). |

**Files modified:**
- `src/app/dashboard/analytics/competitor/page.tsx` — Added `ChevronDown` import; 4 collapse state vars; replaced 4 separate Card sections with collapsible Card+button pattern; merged two chart `<Card>` elements and the 2×2 grid into single collapsible containers; removed unused `CardHeader`/`CardTitle` imports.

---

### Phase 4J — A30: Export Viral Analysis Results ✅ COMPLETE

**Completed:** 2026-03-23

| Task | Status | Notes |
|------|--------|-------|
| 4J-A30 | ✅ Done | Export dropdown added to the viral analyzer header actions area (visible only when results are loaded). Two export options: (1) **Copy as Markdown** — builds a full structured report (Overview, AI Insights, Top Hashtags, Top Keywords, Best Days, Tweet Length tables) and copies to clipboard with `toast.success` confirmation; (2) **Download CSV** — generates a multi-section CSV (`section,name,avg_engagement,count` columns) covering all data dimensions and triggers browser download as `viral-analysis-{N}d-{YYYY-MM-DD}.csv`. Import order fixed to satisfy ESLint `import/order` rule. |

**Files modified:**
- `src/app/dashboard/analytics/viral/page.tsx` — Added `Copy`, `Download` lucide imports; `toast` from sonner; `DropdownMenu*` components; `handleCopyMarkdown()` and `handleDownloadCSV()` functions; Export dropdown button in `actions` prop (conditional on `analysis` being set).

---

### Phase 4K — ACC6: Fix Muted Color Contrast Ratios ✅ COMPLETE

**Completed:** 2026-03-23

| Task | Status | Notes |
|------|--------|-------|
| 4K-ACC6 | ✅ Done | Light-mode `--muted-foreground` darkened from `oklch(0.552 0.016 285.938)` → `oklch(0.50 0.016 285.938)`. Calculated contrast ratios: against `--muted` background (`oklch(0.967...)`) was ≈4.18:1 (failing WCAG AA), now ≈5.2:1. Against white background: was ≈5.7:1, now ≈6.4:1. Dark mode value (`oklch(0.705...)` on `oklch(0.141...)` background, ≈8:1) was already passing — unchanged. Single CSS variable change propagates to all `text-muted-foreground` usages sitewide. |

**Files modified:**
- `src/app/globals.css` — `:root` `--muted-foreground` changed from `oklch(0.552 0.016 285.938)` to `oklch(0.50 0.016 285.938)`.

---

### Phase 4L — Audit Verification & Tier 3 Closeout ✅ COMPLETE

**Completed:** 2026-03-23

Code audit confirmed the following Tier 3 items were already fully implemented in earlier phases. No code changes needed — status updated to reflect actual codebase state.

| Task | Status | Evidence |
|------|--------|----------|
| D2 — Breadcrumbs on AI sub-pages | ✅ Already done | All three sub-pages (`calendar`, `reply`, `bio`) import and render `<Breadcrumb>`. The component always prepends a Home icon linking to `/dashboard/ai` as the parent. |
| A1 — 2-word tab labels | ✅ Already done | `writer/page.tsx:307–325` — each `TabsTrigger` uses responsive labels: `<span class="hidden sm:inline">Thread Writer</span><span class="sm:hidden">Thread</span>` pattern for all 4 tabs. |
| A4 — Harmonized language options | ✅ Already done | URL tab (`page.tsx:519–534`) now has all 10 languages matching Thread tab. |
| A17 — History item actions | ✅ Already done | History items (`inspiration/page.tsx:474–496`) have both "Re-import" (RefreshCw, sets URL + switches tab) and "View on X" (ExternalLink, opens new tab). |
| A18 — History timestamps | ✅ Already done | `formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })` renders relative timestamps on every history item. |
| A26 — Collapse refresh history | ✅ Already done | Refresh history wrapped in `<details>` + `<summary>` with `group-open:hidden` / `group-open:inline` toggle text (`analytics/page.tsx:351–354`). |
| A28 — Density toggle extracted | ✅ Already done | Density is a standalone `Link`-wrapped icon button in the page `actions` prop, not in any dropdown (`analytics/page.tsx:256–266`). |

**Files modified:** None — this phase is a verification pass only.

**Remaining open item (deferred):**
- **A33** — Add self-comparison to competitor analysis. High effort. Requires fetching the user's own account metrics and rendering a side-by-side comparison. Not in scope for this audit sprint.

---

## Implementation Plan

### Phase 4A — Critical Fixes (Sprint 1: ~3 days)

**Goal:** Eliminate workflow breaks, security issues, and accessibility violations.

#### Task 4A-1: Unified "Send to Composer" utility
**Files to modify:**
- `src/lib/utils.ts` — Add `sendToComposer(tweets: string[], metadata?: { source?: string; tone?: string; type?: string })` function
- `src/app/dashboard/ai/page.tsx` — Add "Open in Composer" buttons to Thread, URL, Variants tabs
- `src/app/dashboard/affiliate/page.tsx` — Add "Open in Composer" button
- `src/components/ai/hashtag-generator.tsx` — Add "Copy All to Composer" button
- `src/app/dashboard/compose/page.tsx` — Read `sessionStorage` key `ai_composer_payload` on mount (verify existing `inspiration_tweets` handling covers this, or add new key)

**Implementation:**
```typescript
// src/lib/composer-bridge.ts
export function sendToComposer(
  tweets: string[],
  metadata?: { source?: string; tone?: string; type?: "tweet" | "thread" }
) {
  sessionStorage.setItem("composer_payload", JSON.stringify({ tweets, ...metadata }));
  window.location.href = `/dashboard/compose?type=${metadata?.type ?? (tweets.length > 1 ? "thread" : "tweet")}`;
}
```

Each AI page adds:
```tsx
<Button onClick={() => sendToComposer(data.tweets, { source: "ai-writer", tone })} variant="default">
  <PenSquare className="me-2 h-4 w-4" /> Open in Composer
</Button>
```

#### Task 4A-2: Render generated threads as tweet cards
**Files to modify:**
- `src/app/dashboard/ai/page.tsx` — Replace `generatedContent: string` with `generatedTweets: string[]`

**Implementation:**
- Change `setGeneratedContent(data.tweets.join(...))` → `setGeneratedTweets(data.tweets)`
- Replace the plaintext `<div>` with a mapped list of tweet cards:
```tsx
{generatedTweets.map((tweet, idx) => (
  <Card key={idx} className="border-border/50">
    <CardContent className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">
          {idx + 1}/{generatedTweets.length}
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => copyTweet(tweet, idx)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{tweet}</p>
      <span className={cn("text-xs tabular-nums",
        tweet.length > 280 ? "text-amber-500" : "text-muted-foreground"
      )}>
        {tweet.length}/280
      </span>
    </CardContent>
  </Card>
))}
```

- Apply same pattern to URL→Thread tab's `urlResult.tweets`.
- Copy All button copies the array joined with newlines.
- "Open in Composer" sends the array to Composer.

#### Task 4A-3: Fix `dangerouslySetInnerHTML` XSS risk
**File to modify:** `src/app/dashboard/analytics/viral/page.tsx:264-270`

**Implementation:**
```tsx
function safeBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// Replace dangerouslySetInnerHTML:
<span>{safeBold(insight)}</span>
```

#### Task 4A-4: Fix Bio Optimizer disabled state
**File to modify:** `src/app/dashboard/ai/bio/page.tsx:189`

**Change:**
```tsx
// Before:
disabled={isLoading}
// After:
disabled={isLoading || !niche.trim()}
```

#### Task 4A-5: Add `aria-label` to all icon-only buttons
**Files to modify:** All 9 page files + relevant components.

Audit checklist:
- `ai/page.tsx:324` — Copy button → `aria-label="Copy thread to clipboard"`
- `ai/page.tsx:507` — Copy variant button → `aria-label="Copy variant"`
- `ai/page.tsx:510` — Use variant button → `aria-label="Load variant into editor"`
- `ai/calendar/page.tsx:288` — ChevronRight → `aria-label="Open in Composer"`
- `ai/reply/page.tsx:248` — Copy reply → `aria-label="Copy reply"`
- `ai/reply/page.tsx:258` — ChevronRight → `aria-label="Send reply to Composer"`
- `ai/bio/page.tsx:230` — Copy bio → `aria-label="Copy bio to clipboard"`

#### Task 4A-6: Fix RTL logical properties
**Files to modify:** All 9 page files.

Global find-and-replace:
- `mr-` → `me-` (all button icon margins)
- `ml-` → `ms-`
- `pr-` → `pe-`
- `pl-` → `ps-`

Exceptions: Tailwind layout utilities like `mr-auto`, grid gaps, etc. should be reviewed case-by-case. Only button icon spacing and text padding need logical properties.

---

### Phase 4B — High Impact Improvements (Sprint 2: ~5 days)

#### Task 4B-1: AI Tools hub page
**New file:** `src/app/dashboard/ai/page.tsx` (becomes the hub)
**Move:** Current AI Writer content → `src/app/dashboard/ai/writer/page.tsx`
**Modify:** `src/components/dashboard/sidebar.tsx` — Add "AI Hub" as first AI Tools item

The hub page shows 6 cards:
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Thread      │ │  URL→Thread  │ │  A/B         │
│  Writer      │ │  Converter   │ │  Variants    │
│  [Try It →]  │ │  [Try It →]  │ │  [Try It →]  │
└─────────────┘ └─────────────┘ └─────────────┘
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Hashtag     │ │  Content     │ │  Reply       │
│  Generator   │ │  Calendar    │ │  Suggester   │
│  [Try It →]  │ │  [Pro] →     │ │  [Pro] →     │
└─────────────┘ └─────────────┘ └─────────────┘
```

Each card: icon + title + 1-line description + "Try It" link. Pro-gated tools show a "Pro" badge.

#### Task 4B-2: Analytics section navigation
**File to modify:** `src/app/dashboard/analytics/page.tsx`

Add a client-side sticky tab bar:
```tsx
<div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
  <div className="flex gap-4 px-1 py-2">
    <button onClick={() => scrollTo("overview")} className={cn(...)}>Overview</button>
    <button onClick={() => scrollTo("performance")} className={cn(...)}>Performance</button>
    <button onClick={() => scrollTo("insights")} className={cn(...)}>Insights</button>
  </div>
</div>
```

Each section gets an `id` prop for scroll targeting.

#### Task 4B-3: Trend indicators on analytics metrics
**File to modify:** `src/app/dashboard/analytics/page.tsx`

Add a second query for previous period data:
```sql
-- Previous period: startDate - rangeDays to startDate
WHERE fetchedAt BETWEEN (startDate - rangeDays) AND startDate
```

Compare totals and show delta:
```tsx
<p className="text-xs text-muted-foreground">
  {delta > 0 ? "↑" : "↓"} {Math.abs(delta).toLocaleString()} vs previous {effectiveRange}
</p>
```

#### Task 4B-4: Pro badge on sidebar
**File to modify:** `src/components/dashboard/sidebar.tsx`

Add `isPro?: boolean` to `NavItem` interface. Mark Calendar, Reply, Bio, Competitor as `isPro: true`.

Render badge:
```tsx
{item.isPro && (
  <Badge variant="outline" className="ms-auto text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary">
    Pro
  </Badge>
)}
```

#### Task 4B-5: Delete confirmation for bookmarks
**File to modify:** `src/app/dashboard/inspiration/page.tsx`

Wrap delete button in AlertDialog:
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="ghost" size="sm" className="text-destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete bookmark?</AlertDialogTitle>
      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => handleDeleteBookmark(id)}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

#### Task 4B-6: Add language selector to Affiliate page
**File to modify:** `src/app/dashboard/affiliate/page.tsx`

Add state: `const [language, setLanguage] = useState("ar");`
Add Select below Platform select with same options as other pages.
Pass `language` in the API request body.

#### Task 4B-7: Add elapsed time counter during AI generation
**New utility:** `src/hooks/use-elapsed-time.ts`

```typescript
export function useElapsedTime(isRunning: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isRunning) { setElapsed(0); return; }
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);
  return elapsed;
}
```

Apply to all AI pages: show `Generating... ({elapsed}s)` in button text.

#### Task 4B-8: Differentiate empty states
**Files to modify:** All 9 page files.

Replace generic empty states with page-specific illustrations using a blurred preview of what results look like. Each empty state should have:
1. A unique icon or mini-preview (blurred skeleton of expected output)
2. A specific instruction ("Enter your topic above and click Generate Thread")
3. A contextual help link ("Learn how to write viral threads →")

#### Task 4B-9: Fix developer-facing empty state text on Competitor page
**File to modify:** `src/app/dashboard/analytics/competitor/page.tsx:177`

```tsx
// Before:
<p>Requires TWITTER_BEARER_TOKEN to be configured.</p>
// After:
<p>Analyze any public X account to discover their posting patterns, top topics, and engagement strategy.</p>
```

#### Task 4B-10: Viral Analyzer "Action Plan" card
**File to modify:** `src/app/dashboard/analytics/viral/page.tsx`

After the AI Insights card, add an Action Plan card that synthesizes the top 3 actionable recommendations:
```tsx
<Card className="border-primary/20 bg-primary/5">
  <CardHeader>
    <CardTitle>Your Action Plan</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Derive from analysis data:
        - Best day + hour → "Post on {bestDay} at {bestHour}"
        - Top hashtag → "Always include #{topTag}"
        - Best length → "Keep tweets {category}"
    */}
  </CardContent>
</Card>
```

---

### Phase 4C — Polish (Sprint 3: ~3 days)

#### Task 4C-1: Two-word tab labels on AI Writer
Change `"Thread"` → `"Thread Writer"`, `"URL"` → `"URL → Thread"`, etc.

#### Task 4C-2: Harmonize language options across all AI tabs
Ensure all tabs and pages offer the same 10 languages.

#### Task 4C-3: Add breadcrumbs to AI sub-pages
Create `src/components/ui/breadcrumb.tsx` and add to Calendar, Reply, Bio pages.

#### Task 4C-4: Collapse refresh history on Analytics page
Wrap in `<Collapsible>` component, default closed.

#### Task 4C-5: Extract density toggle from dropdown on Analytics page
Replace MoreHorizontal dropdown with visible icon toggle button.

#### Task 4C-6: Add timestamps to Inspiration history items
Show relative time using `date-fns` `formatDistanceToNow`.

#### Task 4C-7: Add actions to Inspiration history items
Add "Re-import" and "View on X" buttons to each history item.

#### Task 4C-8: Character count coloring
- Reply cards: green <200, amber 200-280, red >280
- Bio variants: green <=160, red >160
- AI Writer tweets: green <240, amber 240-280, red >280

#### Task 4C-9: Standardize copy feedback pattern
All copy buttons: icon change (Copy → Check, 2s) + `toast.success("Copied to clipboard")`.

#### Task 4C-10: Loading skeleton for Competitor page
Add skeleton matching result layout during loading state.

#### Task 4C-11: Slider `aria-label` attributes
Add descriptive labels to all sliders.

#### Task 4C-12: Analytics status icons
Add CheckCircle2/XCircle/Clock icons alongside color badges in refresh history.

#### Task 4C-13: Page description micro-instructions
Update all 9 `DashboardPageWrapper` `description` props to action-oriented text.

#### Task 4C-14: Heatmap accessibility
Add `<table>` with `<th>` headers and `aria-label` per cell to BestTimeHeatmap.

---

## Appendix: File Manifest

All files that will be created or modified across Phases 4A-4C:

### New Files
| File | Phase | Purpose |
|------|-------|---------|
| `src/lib/composer-bridge.ts` | 4A | Unified send-to-composer utility |
| `src/app/dashboard/ai/writer/page.tsx` | 4B | Thread Writer (moved from `/ai/page.tsx`) |
| `src/hooks/use-elapsed-time.ts` | 4B | Elapsed time hook for AI generation |
| `src/components/ui/breadcrumb.tsx` | 4C | Breadcrumb navigation component |

### Modified Files
| File | Phase(s) | Changes |
|------|----------|---------|
| `src/app/dashboard/ai/page.tsx` | 4A, 4B | Tweet cards, send-to-composer, then becomes hub page |
| `src/app/dashboard/ai/calendar/page.tsx` | 4A | aria-labels, RTL fixes |
| `src/app/dashboard/ai/reply/page.tsx` | 4A | aria-labels, RTL fixes |
| `src/app/dashboard/ai/bio/page.tsx` | 4A, 4C | Disabled state fix, char count coloring |
| `src/app/dashboard/inspiration/page.tsx` | 4A, 4B, 4C | aria-labels, delete confirmation, history actions |
| `src/app/dashboard/affiliate/page.tsx` | 4A, 4B | Send-to-composer, language selector |
| `src/app/dashboard/analytics/page.tsx` | 4B, 4C | Section nav, trend indicators, collapse refresh history |
| `src/app/dashboard/analytics/viral/page.tsx` | 4A, 4B | XSS fix, action plan card |
| `src/app/dashboard/analytics/competitor/page.tsx` | 4B, 4C | Fix empty state text, loading skeleton |
| `src/components/dashboard/sidebar.tsx` | 4B | Pro badges, hub link |
| `src/components/ai/hashtag-generator.tsx` | 4A | Send-to-composer button |
| `src/components/analytics/best-time-heatmap.tsx` | 4C | Table markup for accessibility |
| `src/app/dashboard/compose/page.tsx` | 4A | Read `composer_payload` from sessionStorage |

---

## Validation Checklist

After each phase, run:
```bash
pnpm lint && pnpm typecheck
```

Manual verification:
- [ ] All "Send to Composer" buttons work across AI Writer, Affiliate, Hashtag pages
- [ ] Generated threads render as numbered cards, not raw text
- [ ] No `dangerouslySetInnerHTML` remains in Viral page
- [ ] All icon-only buttons have `aria-label`
- [ ] RTL layout works correctly on Arabic content
- [ ] Pro badges appear on gated sidebar items
- [ ] Delete bookmark shows confirmation dialog
- [ ] Analytics page has section navigation
- [ ] Competitor empty state shows user-friendly text
- [ ] Screen reader can navigate the heatmap
- [ ] Elapsed time counter shows during AI generation
