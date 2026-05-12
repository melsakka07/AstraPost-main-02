# Comprehensive Code Audit: AstraPost Application Pages

**Audit date:** 2026-05-12  
**Verification date:** 2026-05-12 (cross-referenced against source files)  
**Scope:** All 74 user-facing pages and their supporting components  
**Auditors:** 4 parallel agents (marketing+auth, dashboard core, AI+analytics+settings, admin+standalone)  
**Verification:** Manual line-by-line cross-reference of all findings against actual source code

---

## Executive Summary

This audit examined all 74 page files, their layout wrappers, and supporting client components across the AstraPost Next.js App Router codebase. Each page was evaluated for architecture, security, performance, accessibility, convention adherence, and maintainability.

**Overall assessment:** The codebase is well-structured with strong fundamentals — proper use of Next.js App Router route groups, shadcn/ui components, Drizzle ORM patterns, and consistent metadata exports. However, the audit identified **2 critical** and **15 high-severity** issues that require immediate attention.

### Key Statistics

| Severity | Count | Primary Categories                                                                                                                                                   |
| -------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical | 2     | Synchronous I/O blocking event loop, plaintext sensitive data in localStorage                                                                                        |
| High     | 15    | Duplicate auth resolution, missing server wrappers, N+1 queries, non-null assertions, missing DashboardPageWrapper, N sequential POSTs, partial transaction coverage |
| Medium   | 27    | Missing `server-only`, uncached queries, missing AbortControllers, missing loading states, fragile error parsing, heading hierarchy, DELETE cascade                  |
| Low      | 24    | Missing aria-labels, hardcoded values, redundant auth guards, inconsistent patterns                                                                                  |

### Critical Issues (Must Fix Immediately)

1. **Synchronous `fs.readFileSync` in blog data layer** — `getAllBlogPosts()` and `getBlogPostSource()` in `src/lib/blog.ts` use blocking filesystem calls (`readFileSync`, `readdirSync`) inside async Server Components. This blocks the Node.js event loop for every blog page request.

2. **Plaintext chat history in localStorage** — The `/chat` page persists entire AI conversation history (messages, user inputs) in `localStorage` without encryption. Any XSS vulnerability on the origin can exfiltrate sensitive conversations.

### High-Priority Issues (Sprint 1)

3. **`posts/[postId]` PUT — post update outside transaction** — The PUT handler updates the post row at line 215 outside a transaction, then deletes/re-inserts tweets inside a transaction at line 236. If the tweet transaction fails, the post has been mutated but tweets remain in their old state.

4. **Defense-in-depth auth gaps on AI tool pages** — `/dashboard/ai/youtube-to-thread` and `/dashboard/ai/pdf-to-thread` lack inline auth checks. Verified: the parent `DashboardLayout` at `layout.tsx:30-32` DOES enforce `getTeamContext()` → `redirect("/login")` for all `/dashboard/*` routes. These pages are NOT directly accessible to unauthenticated users. The gap is a missing secondary guard.

---

## 1. Critical Findings

### 1.1 Missing Inline Auth Checks on AI Tool Pages (Defense-in-Depth Gap)

| Attribute       | Detail                                                                                                                                                                                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Files**       | `src/app/dashboard/ai/youtube-to-thread/page.tsx:7-19`, `src/app/dashboard/ai/pdf-to-thread/page.tsx:7-20`                                                                                                                                                                                                                                       |
| **Severity**    | **High** (downgraded from Critical after verification)                                                                                                                                                                                                                                                                                           |
| **Category**    | Security — Defense-in-Depth Gap                                                                                                                                                                                                                                                                                                                  |
| **Verified**    | `dashboard/layout.tsx:30-32` calls `getTeamContext()` → `redirect("/login")` for ALL `/dashboard/*` routes. These pages ARE protected — unauthenticated users cannot directly access them.                                                                                                                                                       |
| **Root Cause**  | Unlike other dashboard AI pages (agentic, history) which call `auth.api.getSession()` or `getTeamContext()` inline as a secondary auth check, these two pages have zero inline auth. If the shared layout's auth ever fails due to route misconfiguration, a Next.js version upgrade, or a middleware change, these pages lack a fallback guard. |
| **Remediation** | Add `const ctx = await getTeamContext(); if (!ctx) redirect("/login");` at the top of each page function for defense-in-depth consistency with sibling AI pages.                                                                                                                                                                                 |

### 1.2 Synchronous File I/O in Blog Data Layer

| Attribute          | Detail                                                                                                                                                                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**          | `src/lib/blog.ts:94,117,152,156,166`                                                                                                                                                                                                                           |
| **Severity**       | **Critical**                                                                                                                                                                                                                                                   |
| **Category**       | Performance — Event Loop Blocking                                                                                                                                                                                                                              |
| **Root Cause**     | `getAllBlogPosts()` reads all `.mdx` files in a directory using `fs.readdirSync()` + `fs.readFileSync()` in a sequential `for` loop. Each file read blocks the Node.js event loop. With many blog posts, this compounds into multi-second blocking operations. |
| **Remediation**    | Replace with `fs.promises.readdir()` + `Promise.all(files.map(f => fs.promises.readFile(f, "utf8")))`. Post-processing (frontmatter extraction, sorting) happens after all files are read.                                                                     |
| **Affected Pages** | `/blog`, `/blog/[slug]`, `/sitemap.xml`                                                                                                                                                                                                                        |

### 1.3 Plaintext Sensitive Data in localStorage

| Attribute       | Detail                                                                                                                                                                                                                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `src/app/chat/page.tsx:228, 262-283`                                                                                                                                                                                                                                                                                                            |
| **Severity**    | **Critical**                                                                                                                                                                                                                                                                                                                                    |
| **Category**    | Security — Data Exposure                                                                                                                                                                                                                                                                                                                        |
| **Root Cause**  | Chat messages including user inputs and AI responses are serialized with `JSON.stringify(messages)` and stored in `localStorage` under a fixed key. localStorage is accessible to any JavaScript running on the origin, persisting across sessions. An XSS vulnerability anywhere on the domain can exfiltrate the entire conversation history. |
| **Remediation** | Use `sessionStorage` instead (cleared on tab close), or encrypt before writing to localStorage. Consider server-side persistence via the existing chat API.                                                                                                                                                                                     |

### 1.4 Transaction Coverage Gaps in Specific API Routes

| Attribute       | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**       | `src/app/api/posts/[postId]/route.ts:215,236` (PUT handler), `src/app/api/ai/pdf-to-thread/generate/route.ts` (separate `recordAiUsage` + `db.update` writes)                                                                                                                                                                                                                                                                                                 |
| **Severity**    | **High** (downgraded from Critical after verification)                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Category**    | Data Integrity                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Verified**    | The main `POST /api/posts` route and `POST /api/posts/bulk` route properly use `db.transaction()` for multi-table writes (confirmed at `posts/route.ts:~230` and `posts/bulk/route.ts:108`). The claim of a systemic problem was overstated — these are specific routes with gaps.                                                                                                                                                                            |
| **Root Cause**  | **PUT handler (line 215-236):** The post row update at line 215 executes outside a transaction. Then tweets are deleted and re-inserted inside a transaction at line 236. If the tweet transaction fails, the post has been mutated (e.g., status changed to "scheduled") but the tweets remain in their old state — an inconsistency window. **PDF generate route:** `recordAiUsage()` and `db.update(pdfThreadJobs)` are separate non-transactional writes. |
| **Remediation** | (1) Wrap the PUT handler's post update + tweet mutation in a single `db.transaction()` call. (2) Wrap `recordAiUsage()` + `db.update(job)` in the pdf-to-thread generate route in a transaction. (3) Continue verifying: the main routes are already compliant.                                                                                                                                                                                               |

### 1.5 DELETE `posts/[postId]` — Queue Removal and DB Delete Not Atomic

| **Severity** | **Medium** |
| **Category** | Data Integrity |
| **Root Cause** | At `posts/[postId]/route.ts:339-350`, the DELETE handler removes the queue job (line 342), then deletes the post from the DB (line 350) in two separate operations. If the DB delete fails, the queue job is already gone. If the queue removal silently fails (caught at line 345), the job could fire for a deleted post. |
| **Remediation** | Either remove the queue job AFTER the DB delete succeeds, or add a guard in the job processor to check if the post still exists before publishing. |

---

## 2. High-Severity Findings

### 2.1 Duplicate Session Resolution Across Dashboard Pages

| Attribute       | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**       | `dashboard/page.tsx:177`, `dashboard/drafts/page.tsx:16-17`, `dashboard/calendar/page.tsx:21`, `dashboard/achievements/page.tsx:25-27`, `dashboard/referrals/page.tsx:26-28`, `dashboard/ai/agentic/page.tsx:8`, `dashboard/analytics/page.tsx:75`, `dashboard/settings/team/page.tsx:17-18`                                                                                                                                                          |
| **Severity**    | **High**                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Category**    | Performance — Redundant Auth Resolution                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Root Cause**  | The `DashboardLayout` already resolves the full session via `getTeamContext()` (line 30), which internally calls `auth.api.getSession()`. However, 8 child pages independently call `auth.api.getSession({ headers: await headers() })` again, causing a duplicate network round-trip to the auth backend on every page navigation. In `team/page.tsx`, both `auth.api.getSession()` AND `getTeamContext()` are called, creating a triple resolution. |
| **Remediation** | Expose the layout's resolved session to child RSC pages via React `cache()`: `export const getCachedSession = cache(async () => { ... })`. Call `getCachedSession()` in child pages instead of `auth.api.getSession()`. Alternatively, pass session-derived props from layout via a server context pattern.                                                                                                                                           |

### 2.2 Entire AI Tool Pages Are Client Components

| Attribute       | Detail                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**       | `dashboard/ai/writer/page.tsx:1`, `dashboard/ai/reply/page.tsx:1`, `dashboard/ai/bio/page.tsx:1`, `dashboard/ai/calendar/page.tsx:1`                                                                                                                                                                                                                                                                                       |
| **Severity**    | **High**                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Category**    | Architecture — Server/Client Split                                                                                                                                                                                                                                                                                                                                                                                         |
| **Root Cause**  | These four AI tool pages are entirely `"use client"` with no server component wrapper. Auth checks, plan verification, initial data fetching — all happen client-side after React hydrates. This causes: (a) a flash of unauthenticated content, (b) an extra round-trip for session data, (c) inability to export `generateMetadata`, and (d) violation of the `.claude/rules/frontend.md` server component page pattern. |
| **Remediation** | Add a server component wrapper that: calls `getTeamContext()`, fetches initial data (connected accounts, user plan, language), and passes everything as props to the client component. Canonical pattern: `dashboard/compose/page.tsx` (which uses `dynamic()` with a loading skeleton).                                                                                                                                   |

### 2.3 `getPlanLimits()` Called Directly in AI Hub Page

| Attribute       | Detail                                                                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `src/app/dashboard/ai/page.tsx:12`                                                                                                                                                                                                                                              |
| **Severity**    | **Medium** (downgraded from High after verification)                                                                                                                                                                                                                            |
| **Category**    | Convention Clarification                                                                                                                                                                                                                                                        |
| **Verified**    | CLAUDE.md rule #6 explicitly says "Never call `getPlanLimits()` **in route handlers**." This is a **page component**, not an API route handler. The rule does not directly forbid pages from calling `getPlanLimits()`.                                                         |
| **Root Cause**  | While not a direct rule violation, calling `getPlanLimits()` directly in a page still bypasses the `require-plan.ts` gate helpers, which provide consistent plan resolution (including trial → `"trial"` mapping). This is a consistency concern rather than a hard rule break. |
| **Remediation** | Use `checkAiAccessDetailed(ctx.currentTeamId)` or equivalent gate from `@/lib/middleware/require-plan` for consistency with the rest of the codebase.                                                                                                                           |

### 2.4 Trial User Lock Logic Uses Raw `plan` Field

| Attribute       | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `src/app/dashboard/ai/agentic/page.tsx:50`                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Severity**    | **High**                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Category**    | Logic Error                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Root Cause**  | `const isLocked = !isTrialActive && dbUser?.plan === "free"` — the code checks `dbUser.plan` directly, which is `"free"` for trial users. CLAUDE.md states `TRIAL_EFFECTIVE_PLAN = "trial"` is the canonical plan resolution. A trial user with an active trial period would have `plan === "free"` but should NOT be locked. The `isTrialActive` date check partially mitigates this, but if the trial date check fails for any reason, trial users are incorrectly locked. |
| **Remediation** | Use `getUserPlanType(ctx.currentTeamId)` from `@/lib/plan-limits` to resolve the effective plan, which handles trial → `"trial"` mapping.                                                                                                                                                                                                                                                                                                                                    |

### 2.5 Non-Null Assertion on Nullable DB Query

| Attribute       | Detail                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File**        | `src/app/dashboard/settings/team/page.tsx:73-80`                                                    |
| **Severity**    | **High**                                                                                            |
| **Category**    | Type Safety — Runtime Crash Risk                                                                    |
| **Root Cause**  | `ownerUser!` uses a non-null assertion on `db.query.user.findFirst()`, which returns `T             | undefined`. If the owner record is missing (deleted account, data corruption), the page crashes with `TypeError: Cannot read properties of undefined`. |
| **Remediation** | Add a null guard: `if (!ownerUser) { redirect("/dashboard"); }` before building `formattedMembers`. |

### 2.6 N Sequential POST Requests Without Batching

| Attribute       | Detail                                                                                                                                                                                                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File**        | `src/app/dashboard/ai/calendar/page.tsx:288-311`                                                                                                                                                                                                                                                                                                                   |
| **Severity**    | **High**                                                                                                                                                                                                                                                                                                                                                           |
| **Category**    | Performance — API Abuse                                                                                                                                                                                                                                                                                                                                            |
| **Root Cause**  | `handleScheduleAll` fires `fetch("/api/posts", ...)` in a `for` loop — one POST per calendar day. For a month view, this is up to 31 sequential POST requests without any inter-request delay, rate limit consideration, or batching. The API may reject requests due to rate limiting, leaving some posts unscheduled without the user knowing which ones failed. |
| **Remediation** | Create a batch endpoint `POST /api/posts/bulk` that accepts an array of posts, or add inter-request delays with proper error recovery and reporting.                                                                                                                                                                                                               |

### 2.7 Team Settings Page Missing `DashboardPageWrapper`

| Attribute       | Detail                                                                                                                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File**        | `src/app/dashboard/settings/team/page.tsx:112-157`                                                                                                                                                                                                                             |
| **Severity**    | **High**                                                                                                                                                                                                                                                                       |
| **Category**    | Convention Violation                                                                                                                                                                                                                                                           |
| **Root Cause**  | `.claude/rules/frontend.md` mandates: "Every dashboard page MUST wrap content in `<DashboardPageWrapper icon={...} title={...} description={...}>`". The team settings page renders its content directly without this wrapper, inconsistent with all other settings sub-pages. |
| **Remediation** | Wrap the page content in `<DashboardPageWrapper icon={Shield} title={t("title")} description={t("description")}>`.                                                                                                                                                             |

### 2.8 Settings Layout Is Client Component

| Attribute       | Detail                                                                                                                                                                                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `src/app/dashboard/settings/layout.tsx:1`                                                                                                                                                                                                                                     |
| **Severity**    | **High**                                                                                                                                                                                                                                                                      |
| **Category**    | Architecture — Unnecessary Client Boundary                                                                                                                                                                                                                                    |
| **Root Cause**  | The settings layout is marked `"use client"` solely for `usePathname()` to highlight the active tab. This pushes the entire settings subtree (profile, billing, notifications, integrations) to client-render, preventing Next.js from serving static shells for these pages. |
| **Remediation** | Convert to a server component. Use a thin client sub-component for the tab bar with `usePathname()`, or use the `useSelectedLayoutSegment()` pattern.                                                                                                                         |

### 2.9 Inspiration + Affiliate Pages Are Entirely Client Components

| Attribute       | Detail                                                                                                                                                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Files**       | `src/app/dashboard/inspiration/page.tsx:1`, `src/app/dashboard/affiliate/page.tsx:1`                                                                                                                                                                                                                               |
| **Severity**    | **High**                                                                                                                                                                                                                                                                                                           |
| **Category**    | Architecture — Server/Client Split                                                                                                                                                                                                                                                                                 |
| **Root Cause**  | Both pages are top-level `"use client"` components with no server wrapper. `InspirationPage` fetches bookmarks client-side via `fetch("/api/inspiration/bookmark")` instead of querying the DB server-side. `AffiliatePage` uses `useSession()` (client-side auth hook) instead of server-side session resolution. |
| **Remediation** | Restructure as server components that pre-fetch data and pass it as props to client sub-components.                                                                                                                                                                                                                |

### 2.10 Chat Page: Fragile Plan-Limit Error Detection

| Attribute       | Detail                                                                                                                                                                                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `src/app/chat/page.tsx:120-130`                                                                                                                                                                                                                                                                                 |
| **Severity**    | **High**                                                                                                                                                                                                                                                                                                        |
| **Category**    | Reliability                                                                                                                                                                                                                                                                                                     |
| **Root Cause**  | `extractPlanLimitPayloadFromErrorMessage` parses a JSON substring from an error message string to detect plan-limit responses. If the error message format changes (API update, i18n, different error source), the detection breaks silently and users receive raw error messages instead of the upgrade modal. |
| **Remediation** | Add a dedicated response header (e.g., `x-plan-limit` or `x-error-code`) from the API route that the chat client can check directly, rather than parsing error message strings.                                                                                                                                 |

### 2.11 Duplicate `eq()` Condition in Analytics Query

| Attribute       | Detail                                                                                                                                                                                                                                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `src/app/dashboard/analytics/page.tsx:188-198`                                                                                                                                                                                                                                                                          |
| **Severity**    | **High**                                                                                                                                                                                                                                                                                                                |
| **Category**    | Logic — Dead Code / Potential Bug                                                                                                                                                                                                                                                                                       |
| **Root Cause**  | The `prevSnapshots` query has `eq(posts.userId, session.user.id)` nested inside a second `and()` call, creating a double-wrapped condition. The outer `and()` at line 192 already includes this condition. While Drizzle may flatten this, the duplicate indicates a copy-paste error and could produce unexpected SQL. |
| **Remediation** | Remove the duplicate inner `and()` condition at lines 193-196. Keep only the single `eq(posts.userId, session.user.id)`.                                                                                                                                                                                                |

### 2.12 Sequential Database Queries in Team + Integrations Pages

| Attribute       | Detail                                                                                                                                                                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**       | `dashboard/settings/team/page.tsx:46-98` (3 queries), `dashboard/settings/integrations/page.tsx:24-34` (4 queries)                                                                                                                                                     |
| **Severity**    | **High**                                                                                                                                                                                                                                                               |
| **Category**    | Performance                                                                                                                                                                                                                                                            |
| **Root Cause**  | Team page fetches members, owner, and invitations in three sequential `await` calls. Integrations page fetches X accounts, LinkedIn accounts, Instagram accounts, and user profile in four sequential calls. None have data dependencies — all should run in parallel. |
| **Remediation** | Wrap all independent queries in `Promise.all`.                                                                                                                                                                                                                         |

### 2.13 BullMQ N+1 `getState()` Calls in Admin Jobs Page

| Attribute       | Detail                                                                                                                                                                                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `src/app/admin/jobs/page.tsx:31-43`                                                                                                                                                                                                                                                |
| **Severity**    | **High**                                                                                                                                                                                                                                                                           |
| **Category**    | Performance — N+1 Redis Calls                                                                                                                                                                                                                                                      |
| **Root Cause**  | `Promise.all(jobs.map(async (job) => job.getState()))` fires one Redis round-trip per job to retrieve its state. With 10 jobs per page × 2 queues, that's 20 sequential-per-row Redis calls. BullMQ's `getJobs()` already returns jobs but without cached state on the job object. |
| **Remediation** | Use `queue.getJobCounts()` (already fetched at line 25) to present aggregate state counts for the dashboard header. For per-job state rendering, use the job's source list as an approximation, or fetch states in a single Redis pipeline.                                        |

---

## 3. Medium-Severity Findings

### 3.1 Missing `import "server-only"` (Cross-Cutting)

| Attribute          | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**          | 18 server component pages that import `db` from `@/lib/db`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Severity**       | **Medium**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Category**       | Convention Violation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Root Cause**     | CLAUDE.md rule #14: "Any `src/lib/` module that imports from `db.ts` MUST have `import 'server-only'` as its first line." While the rule explicitly targets `src/lib/` modules, the pages that import `db` have the same transitive exposure: `db.ts` → `pg`/`ioredis` → `fs`, `net`, `tls` → client bundle explosion.                                                                                                                                                                                         |
| **Affected Files** | `dashboard/layout.tsx`, `dashboard/page.tsx`, `dashboard/drafts/page.tsx`, `dashboard/queue/page.tsx`, `dashboard/calendar/page.tsx`, `dashboard/jobs/page.tsx`, `dashboard/ai/page.tsx`, `dashboard/ai/agentic/page.tsx`, `dashboard/ai/history/page.tsx`, `dashboard/analytics/page.tsx`, `dashboard/settings/profile/page.tsx`, `dashboard/settings/billing/page.tsx`, `dashboard/settings/team/page.tsx`, `dashboard/settings/integrations/page.tsx`, `admin/jobs/page.tsx`, `admin/announcement/page.tsx` |
| **Remediation**    | Add `import "server-only"` as the first line of every server component page that imports `db`, `auth`, or any `src/lib/` module that transitively hits `db.ts`.                                                                                                                                                                                                                                                                                                                                                |

### 3.2 `cachedQuery()` Underutilization

| Attribute       | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Files**       | `dashboard/page.tsx:36-123` (9 queries), `dashboard/drafts/page.tsx:19-32`, `dashboard/calendar/page.tsx:41-81` (3 queries), `dashboard/achievements/page.tsx:35-38`, `dashboard/referrals/page.tsx:40-48`                                                                                                                                                                                                                                                                     |
| **Severity**    | **Medium**                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Category**    | Performance — Missing Caching                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Root Cause**  | The Redis cache layer (`@/lib/cache` → `cachedQuery()`) exists and is proven in production (used in `dashboard/layout.tsx` for memberships and AI usage). However, the majority of dashboard data queries don't use it. Stats, draft lists, calendar views, and referral data tolerate 2–5 minute staleness and would benefit significantly from caching, especially given that `layout.tsx` already re-renders on every client navigation, triggering all child page queries. |
| **Remediation** | Wrap frequently-queried, slow-changing data in `cachedQuery()` with appropriate TTLs: dashboard stats (5 min), draft lists (60s), calendar posts (60s), achievement milestones (5 min), referral data (60s).                                                                                                                                                                                                                                                                   |

### 3.3 Missing `AbortController` in Polling/Auto-Fetch Patterns

| Attribute       | Detail                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**       | `dashboard/ai/writer/page.tsx:126-148`, `dashboard/ai/bio/page.tsx:62-69`, `dashboard/inspiration/page.tsx:319-333`                                                                                                                                                                                                                                                                             |
| **Severity**    | **Medium**                                                                                                                                                                                                                                                                                                                                                                                      |
| **Category**    | Convention Violation — Polling Pattern                                                                                                                                                                                                                                                                                                                                                          |
| **Root Cause**  | CLAUDE.md rule #10: "Polling `useEffect` MUST use `AbortController` + 8s timeout + cleanup abort." The writer page uses a `let cancelled = false` boolean pattern. The bio page uses `.then().catch()` without AbortController. The inspiration page fetches bookmarks on mount without abort capability. When components unmount before fetch completion, promises settle on stale components. |
| **Remediation** | Replace boolean/floating-promise patterns with `const controller = new AbortController(); setTimeout(() => controller.abort(), 8000);` and cleanup: `return () => controller.abort();`. Canonical reference: `src/components/queue/queue-realtime-listener.tsx`.                                                                                                                                |

### 3.4 SEO: Client-Component Auth Pages Cannot Export Metadata

| Attribute       | Detail                                                                                                                                                                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**       | `(auth)/register/page.tsx`, `(auth)/forgot-password/page.tsx`, `(auth)/reset-password/page.tsx`, `join-team/page.tsx`                                                                                                                                                                          |
| **Severity**    | **Medium**                                                                                                                                                                                                                                                                                     |
| **Category**    | SEO                                                                                                                                                                                                                                                                                            |
| **Root Cause**  | These pages are `"use client"` components and cannot export `generateMetadata`. The parent `(auth)/layout.tsx` provides a single static title ("Create Account — AstraPost") for all child pages. The forgot-password, reset-password, and join-team pages thus have the wrong metadata title. |
| **Remediation** | Add a thin server component layout per page, or use route-specific `layout.tsx` files that export correct metadata for each auth page. Low urgency since these pages should not be indexed.                                                                                                    |

### 3.5 Missing `loading.tsx` Files

| Attribute       | Detail                                                                                                                                                                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**       | `(marketing)/pricing/loading.tsx`, `(marketing)/blog/loading.tsx`, `dashboard/ai/youtube-to-thread/loading.tsx`, `dashboard/ai/pdf-to-thread/loading.tsx`, `dashboard/settings/*/loading.tsx` (6 sub-pages), `admin/webhooks/loading.tsx`, `admin/soft-delete-recovery/loading.tsx` |
| **Severity**    | **Medium**                                                                                                                                                                                                                                                                          |
| **Category**    | Performance — Missing Loading States                                                                                                                                                                                                                                                |
| **Root Cause**  | Pages with async data fetching (DB queries, file I/O) have no `loading.tsx`. Users on slow connections see blank pages during data fetches. The pricing page fetches user plan and subscription data; the blog index reads files from disk; settings pages query the database.      |
| **Remediation** | Add `loading.tsx` with skeleton placeholders for pages with async data dependencies.                                                                                                                                                                                                |

### 3.6 Fragile Clipboard API Without Fallback

| Attribute       | Detail                                                                                                                                                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `src/app/dashboard/affiliate/page.tsx:123`                                                                                                                                                                                              |
| **Severity**    | **Medium**                                                                                                                                                                                                                              |
| **Category**    | Reliability                                                                                                                                                                                                                             |
| **Root Cause**  | `navigator.clipboard.writeText()` has no fallback for environments where the Clipboard API is unavailable (non-HTTPS, older browsers, some mobile WebViews). The success toast fires regardless of whether the copy actually succeeded. |
| **Remediation** | Wrap in try/catch with `document.execCommand("copy")` fallback, and only show success toast on actual success.                                                                                                                          |

### 3.7 Settings Tab Navigation Missing Team Tab

| Attribute       | Detail                                                                                                                                                                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File**        | `src/app/dashboard/settings/layout.tsx:13-18`                                                                                                                                                                                                                                              |
| **Severity**    | **Medium**                                                                                                                                                                                                                                                                                 |
| **Category**    | UI / Navigation                                                                                                                                                                                                                                                                            |
| **Root Cause**  | The settings tab layout defines four tabs (Profile, Subscription, Notifications, Accounts) but omits the Team tab. The team page exists at `/dashboard/settings/team` but has no navigation entry, making it undiscoverable. Users must know the URL or find it via the integrations page. |
| **Remediation** | Add a Team tab to the settings layout, conditionally rendered based on plan (`team_collaboration` flag) and user role.                                                                                                                                                                     |

### 3.8 Webhook Admin Page: Full-Row Fetch with PII

| Attribute       | Detail                                                                                                                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File**        | `src/app/admin/webhooks/page.tsx:14-28`                                                                                                                                                                                                                                              |
| **Severity**    | **Medium**                                                                                                                                                                                                                                                                           |
| **Category**    | Security — Data Exposure                                                                                                                                                                                                                                                             |
| **Root Cause**  | All three webhook queries (DLQ, delivery log, processed events) fetch full rows without column restrictions. Webhook payloads in `webhookDeliveryLog` and `webhookDeadLetterQueue` may contain raw Stripe event bodies with customer PII (email, payment method details, addresses). |
| **Remediation** | Add explicit `.columns()` to select only display-relevant fields. Mask or truncate sensitive payload data before rendering.                                                                                                                                                          |

### 3.9 Blog Index: `key={index}` Anti-Pattern

| Attribute       | Detail                                                                                                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `src/app/(marketing)/changelog/page.tsx:139,159`                                                                                                                                                      |
| **Severity**    | **Medium**                                                                                                                                                                                            |
| **Category**    | Code Quality — React Key                                                                                                                                                                              |
| **Root Cause**  | Both `.map()` calls use the array index as the `key` prop. While the changelog data is static, this violates React best practices and could cause issues if dynamic filtering or reordering is added. |
| **Remediation** | Use a composite key like `\`${release.version}-${index}\``or add unique`id` fields to release/change objects.                                                                                         |

### 3.10 Admin Jobs Page: Sequential Awaits

| Attribute       | Detail                                                                                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `src/app/admin/jobs/page.tsx:208-210`                                                                                                                                   |
| **Severity**    | **Medium**                                                                                                                                                              |
| **Category**    | Performance                                                                                                                                                             |
| **Root Cause**  | `scheduleData`, `analyticsData`, and `dlqData` are fetched with three sequential `await` calls despite having no data dependencies. Each involves Redis/DB round-trips. |
| **Remediation** | `const [scheduleData, analyticsData, dlqData] = await Promise.all([...])`.                                                                                              |

### 3.11 Webhook Admin Page: No Pagination

| Attribute       | Detail                                                                                                                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `src/app/admin/webhooks/page.tsx:14-28`                                                                                                                                                      |
| **Severity**    | **Medium**                                                                                                                                                                                   |
| **Category**    | Performance — Unbounded Data Loading                                                                                                                                                         |
| **Root Cause**  | DLQ entries are hard-limited to 50, delivery logs to 100, and recent failures to 20. There is no pagination or "load more" — data beyond these limits is permanently inaccessible in the UI. |
| **Remediation** | Add cursor-based or offset pagination for at least the delivery log query.                                                                                                                   |

### 3.12 Admin Announcement: Hardcoded Feature Flag Key

| Attribute       | Detail                                                                                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `src/app/admin/announcement/page.tsx:10`                                                                                                                                                  |
| **Severity**    | **Medium**                                                                                                                                                                                |
| **Category**    | Code Quality — Magic String                                                                                                                                                               |
| **Root Cause**  | `const ANNOUNCEMENT_KEY = "_announcement"` is a hardcoded string whose definition is duplicated between the page and the API route handler. If the key changes, one side breaks silently. |
| **Remediation** | Move to a shared constants file (`src/lib/constants.ts`).                                                                                                                                 |

### 3.13 Notifications Settings: Hardcoded Defaults Instead of DB Values

| Attribute       | Detail                                                                                                                                                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `src/app/dashboard/settings/notifications/page.tsx:22-27`                                                                                                                                                                                                                  |
| **Severity**    | **Medium**                                                                                                                                                                                                                                                                 |
| **Category**    | Logic — Stale Defaults                                                                                                                                                                                                                                                     |
| **Root Cause**  | `initialSettings` is hardcoded with all `true` values. The user's actual notification preferences stored in the database (`userRow.notificationSettings`) are not fetched or passed to the form component. The form always shows defaults regardless of saved preferences. |
| **Remediation** | Fetch `userRow.notificationSettings` from the database and pass the real values to the `NotificationPreferences` client component.                                                                                                                                         |

### 3.14 Heading Hierarchy Violations in Legal Pages

| Attribute       | Detail                                                                                                                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**       | `(marketing)/legal/terms/page.tsx:100-124`, `(marketing)/legal/privacy/page.tsx:107-131`                                                                                                                               |
| **Severity**    | **Medium**                                                                                                                                                                                                             |
| **Category**    | Accessibility — WCAG 1.3.1                                                                                                                                                                                             |
| **Root Cause**  | Both pages have a heading hierarchy of `h1` → `h3` (in info cards) → `h2` (in content sections). Screen reader users navigating by heading level skip the `h2` entries between `h1` and `h3`, missing section context. |
| **Remediation** | Change the info card decorative titles from heading tags to non-heading elements (e.g., `<div>` or `<p>` with appropriate styling), or restructure the DOM to maintain proper hierarchy.                               |

### 3.15 CSRF Protection on Auth Forms — Verified as Adequate

| Attribute    | Detail                                                                                                                                                                                                                                                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**    | `(auth)/register/page.tsx:80-89`, `(auth)/forgot-password/page.tsx:23-27`, `(auth)/reset-password/page.tsx:82-86`                                                                                                                                                                                                                                               |
| **Severity** | **Low** (downgraded from Medium after verification)                                                                                                                                                                                                                                                                                                             |
| **Category** | Security — CSRF (Verified)                                                                                                                                                                                                                                                                                                                                      |
| **Verified** | Better Auth config at `src/lib/auth.ts:216` uses `sameSite: "lax"` on session cookies. This provides adequate CSRF protection for same-site POST requests to `/api/auth/*`. Better Auth's session-based auth with `SameSite=Lax` cookies is the standard protection mechanism — explicit client-side CSRF tokens are not additionally required for these forms. |
| **Action**   | No code change needed. Verify Better Auth CSRF remains enabled in production configuration.                                                                                                                                                                                                                                                                     |

### 3.16 Inspiration Page: localStorage for Sensitive Behavioral Data

| Attribute       | Detail                                                                                                                                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `src/app/dashboard/inspiration/page.tsx:104-124`                                                                                                                                                                                                               |
| **Severity**    | **Medium**                                                                                                                                                                                                                                                     |
| **Category**    | Security — Client-Side Data Storage                                                                                                                                                                                                                            |
| **Root Cause**  | Tweet import history (URLs the user has previously imported) is stored in `localStorage`. This behavioral data persists across sessions and is accessible to any JavaScript on the origin. While not authentication tokens, it reveals user activity patterns. |
| **Remediation** | Store import history server-side (a `/api/inspiration/bookmark` endpoint already exists), or use `sessionStorage` instead.                                                                                                                                     |

### 3.17 Logger Dynamic Import in Error Paths

| Attribute       | Detail                                                                                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**       | `(marketing)/pricing/page.tsx:64`, `dashboard/inspiration/page.tsx:328`                                                                                                                                          |
| **Severity**    | **Medium**                                                                                                                                                                                                       |
| **Category**    | Code Quality                                                                                                                                                                                                     |
| **Root Cause**  | Both pages use `(await import("@/lib/logger")).logger.error(...)` instead of a static import. The dynamic import adds a module resolution round-trip on the error path, when the logger should fire immediately. |
| **Remediation** | Add `import { logger } from "@/lib/logger";` at the top of each file.                                                                                                                                            |

### 3.18 Subscriber Detail: PII Passed to Client Component

| Attribute    | Detail                                                                                                                                                                                                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**     | `src/app/admin/subscribers/[id]/page.tsx:30-35`                                                                                                                                                                                                                                                                     |
| **Severity** | **Low** (downgraded from Medium after verification)                                                                                                                                                                                                                                                                 |
| **Category** | Security — PII in RSC Payload                                                                                                                                                                                                                                                                                       |
| **Verified** | Admin layout uses `export const dynamic = "force-dynamic"`, making all admin pages dynamic. Dynamic RSC payloads are NOT cached by default by Next.js, proxies, or CDNs. The exposure risk is minimal — PII is only visible in the browser Network tab for the authenticated admin user viewing that specific page. |
| **Action**   | Low priority. Verify `Cache-Control: private` is set on admin responses as a belt-and-suspenders measure.                                                                                                                                                                                                           |

### 3.19 Admin Jobs: Async `formatDistance` Per Row

| Attribute       | Detail                                                                                                                                                                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**        | `src/app/admin/jobs/page.tsx:149-154`                                                                                                                                                                                                                    |
| **Severity**    | **Medium**                                                                                                                                                                                                                                               |
| **Category**    | Performance                                                                                                                                                                                                                                              |
| **Root Cause**  | `Promise.all(jobs.map(async (job) => formatDistance(...)))` fires one async call per job row for date formatting. `formatDistance` from `@/lib/date-utils` is async (it loads locale data from `date-fns`), creating unnecessary async overhead per row. |
| **Remediation** | Pre-load the locale in the server component and use synchronous `formatDistance` from `date-fns`, or batch all timestamps into a single computation.                                                                                                     |

### 3.20 Missing Error Boundaries in Admin Sub-Routes

| Attribute       | Detail                                                                                                                                                                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**       | All admin sub-route segments (billing, subscribers, jobs, etc.)                                                                                                                                                                                                             |
| **Severity**    | **Medium**                                                                                                                                                                                                                                                                  |
| **Category**    | Error Handling                                                                                                                                                                                                                                                              |
| **Root Cause**  | Only `src/app/admin/error.tsx` exists (catches all admin page errors). None of the 20+ admin sub-route directories have their own `error.tsx`. When an error occurs in any admin page, it replaces the entire admin view including the sidebar, forcing a full-page reload. |
| **Remediation** | Add segment-level `error.tsx` files for major admin features (billing, subscribers, jobs, ai-usage) to allow more granular error recovery without losing the admin shell.                                                                                                   |

---

## 4. Low-Severity Findings

### 4.1 Accessibility: Missing `aria-label` on Icon Buttons

| **Files** | `(marketing)/features/page.tsx:159-160`, `(marketing)/page.tsx:90,100,108` |
| **Severity** | Low |
| **Remediation** | Add `aria-hidden="true"` to decorative icon wrapper divs. |

### 4.2 Accessibility: Chat Input Missing Label

| **File** | `src/app/chat/page.tsx:426-432` |
| **Severity** | Low |
| **Remediation** | Add `aria-label={t("placeholder")}` to the chat input element. |

### 4.3 Accessibility: Table Headers Missing `scope`

| **File** | `src/app/chat/page.tsx:75-76` |
| **Severity** | Low |
| **Remediation** | Add `scope="col"` to `<th>` elements. |

### 4.4 Accessibility: Profile Page `<label>` Misuse

| **File** | `src/app/profile/page.tsx:125,133` |
| **Severity** | Low |
| **Remediation** | Use `<span>` or `<dt>/<dd>` for display-only label-value pairs instead of `<label>`. |

### 4.5 Blog Post: Missing Scroll Debounce

| **File** | `(marketing)/blog/[slug]/blog-post-client.tsx:30-43` |
| **Severity** | Low |
| **Remediation** | Use `requestAnimationFrame` to throttle the scroll-based reading progress update. |

### 4.6 Redundant `requireAdmin()` in Admin Sub-Pages

| **Files** | `admin/jobs/page.tsx:200`, `admin/impersonation/page.tsx:12`, `admin/soft-delete-recovery/page.tsx:10` |
| **Severity** | Low |
| **Remediation** | Remove the redundant `requireAdmin()` calls; the admin layout already enforces this. |

### 4.7 Missing Metadata on Admin Pages

| **Files** | `admin/subscribers/page.tsx`, `admin/subscribers/[id]/page.tsx`, `admin/ai-usage/page.tsx`, `admin/jobs/page.tsx` |
| **Severity** | Low |
| **Remediation** | Add `export const metadata` or `generateMetadata` to these pages. |

### 4.8 Queue Page: `currentTeamId` Type Ambiguity

| **File** | `src/app/dashboard/queue/page.tsx:29-31` |
| **Severity** | Low |
| **Remediation** | Add a comment clarifying that `currentTeamId` is always a user ID for plan-related queries. |

### 4.9 Dashboard: `any` Type Cast on Session Language

| **File** | `src/app/dashboard/page.tsx:179,247` |
| **Severity** | Low |
| **Remediation** | Add `language` to the session user type in the Better Auth configuration instead of casting `(session.user as any).language`. |

### 4.10 AI Writer: `any` Type Cast on `xTier`

| **File** | `src/app/dashboard/ai/writer/page.tsx:667` |
| **Severity** | Low |
| **Remediation** | Define proper types for the subscription tier value. |

### 4.11 Duplicate `PlanLimitPayload` Interface

| **Files** | `ai/writer/page.tsx:48-61`, `ai/reply/page.tsx:36-49`, `ai/bio/page.tsx:32-43`, `ai/calendar/page.tsx` |
| **Severity** | Low |
| **Remediation** | Extract a shared `PlanLimitPayload` interface to `src/lib/api/errors.ts` or a shared types file. |

### 4.12 Referrals: Missing URL Fallback

| **File** | `src/app/dashboard/referrals/page.tsx:55` |
| **Severity** | Low |
| **Remediation** | Add fallback: `process.env.NEXT_PUBLIC_APP_URL \|\| "https://astrapost.com"`. |

### 4.13 Team Settings: Inflated Member Count

| **File** | `src/app/dashboard/settings/team/page.tsx:108` |
| **Severity** | Low |
| **Remediation** | `currentCount` includes `invitations.length` in the member count, but invitations are pending. Count only active members, or track invitations separately. |

### 4.14 Calendar AI: Unnecessary Account Fetch

| **File** | `src/app/dashboard/ai/calendar/page.tsx:254` |
| **Severity** | Low |
| **Remediation** | Cache accounts in state after first fetch, or pass from server props if converted to RSC wrapper. |

### 4.15 Analytics: Client-Side Date Filter Instead of SQL

| **File** | `src/app/dashboard/analytics/page.tsx:189-198` |
| **Severity** | Low |
| **Remediation** | Move the date filter from `.then((rows) => rows.filter(...))` to SQL via `lt(tweetAnalyticsSnapshots.fetchedAt, startDate)`. |

### 4.16 Chat: Inline Markdown Components

| **File** | `src/app/chat/page.tsx:20-60` |
| **Severity** | Low |
| **Remediation** | Extract inline `H1`, `H2`, `CodeBlock`, etc. components into `src/components/ui/markdown-renderer.tsx` for reuse across Chat, AI Writer, and Blog. |

### 4.17 Profile: OAuth Detection Heuristic

| **File** | `src/app/profile/page.tsx:298` |
| **Severity** | Low |
| **Remediation** | Replace `user.email?.includes("@gmail")` with a proper OAuth provider field from the auth schema. |

### 4.18 `(auth)/layout.tsx` Generic Metadata for All Auth Pages

| **File** | `src/app/(auth)/layout.tsx` |
| **Severity** | Low |
| **Remediation** | Export route-specific layouts or use path-based metadata generation for correct titles per auth page. |

### 4.19 AI Writer: Hardcoded 280 Character Limit for Thread Tweets

| **File** | `src/app/dashboard/ai/writer/page.tsx:747,965` |
| **Severity** | Low |
| **Remediation** | Use `getMaxCharacterLimit(xTier)` consistently across single-post and thread tweet character counters. |

### 4.20 Admin Jobs: Inline Component Definitions

| **File** | `src/app/admin/jobs/page.tsx:88-193` |
| **Severity** | Low |
| **Remediation** | Extract `QueueStats` and `JobsList` into separate component files to keep the page file manageable. |

### 4.21 Admin: Hardcoded `localhost:3000` Fallback

| **File** | `src/app/admin/fetch-server-data.ts:30` |
| **Severity** | Low |
| **Remediation** | Document this dev-only fallback or replace with `process.env.NEXT_PUBLIC_APP_URL`. |

### 4.22 Sitemap: Missing Public Pages

| **File** | `src/app/sitemap.ts` |
| **Severity** | Low |
| **Remediation** | Add `/brand` and `/roadmap` entries to the sitemap (both are public pages). |

### 4.23 Bulk Route: Queue Enqueuing After Transaction — Verified Correct

| **File** | `src/app/api/posts/bulk/route.ts:108-137` |
| **Severity** | **Low** (verified as handled correctly) |
| **Verified** | Each row's `scheduleQueue.add()` (line 127) executes AFTER the `db.transaction()` callback completes (line 124), satisfying CLAUDE.md rule #13. All promises are collected and awaited via `await Promise.all(promises)` at line 137 before the response is sent, preventing lost jobs. |
| **Action** | No code change needed. Pattern is correct. |

---

## 5. Cross-Cutting Assessment by Category

### 5.1 Architecture & Component Organization

**Strengths:**

- Clear route group separation: `(marketing)`, `(auth)`, `admin`, `dashboard`
- Consistent use of `DashboardPageWrapper` / `AdminPageWrapper`
- Good server/client split in most dashboard pages (compose, drafts, queue, calendar, dashboard overview)
- Proper use of `dynamic(() => import(...), { loading: ... })` for heavy client components

**Weaknesses:**

- 6 pages are entirely `"use client"` without server wrappers (4 AI tools + inspiration + affiliate)
- Settings layout is a client component unnecessarily
- Inline component definitions in admin jobs page
- Duplicate `PlanLimitPayload` interface across 4 AI pages
- Inline markdown components in chat page

### 5.2 Authentication & Authorization

**Strengths:**

- Dashboard layout enforces `getTeamContext()` for all `/dashboard/*` routes
- Admin layout enforces `requireAdmin()` for all `/admin/*` routes
- Onboarding gate in dashboard layout prevents un-onboarded users from accessing features
- Feature flag check on referrals page

**Weaknesses:**

- 2 critical auth gaps (youtube-to-thread, pdf-to-thread)
- 8 pages duplicate session resolution after layout already authenticated
- 1 page uses triple auth (getSession + getTeamContext)
- Trial lock logic uses raw `plan` field instead of `getUserPlanType()`
- `getPlanLimits()` called directly in AI hub page

### 5.3 Performance

**Strengths:**

- Most data-fetching pages use `Promise.all` for parallel queries (dashboard overview, analytics, admin pages)
- `cachedQuery()` infrastructure exists and works in production
- 22+ route segments have `loading.tsx` files
- 20+ route segments have `error.tsx` files

**Weaknesses:**

- Synchronous file I/O blocks event loop in blog data layer
- 9+ dashboard pages don't use `cachedQuery()` despite having cache-tolerant data
- 3 pages have sequential DB queries that should be parallelized
- N+1 Redis calls in admin jobs page (per-job `getState()`)
- Async `formatDistance` per row in admin jobs
- Missing `loading.tsx` in 10+ route segments

### 5.4 Security

**Strengths:**

- No `console.log` violations found (logger used consistently)
- No hardcoded AI model names found
- No `NextResponse.json()` usage in pages
- Admin layout properly gates all admin routes
- Proper column selection in most admin data queries

**Weaknesses:**

- 2 pages lack inline auth checks (defense-in-depth gap — layout provides primary protection)
- Plaintext chat history in localStorage (critical — needs immediate fix)
- Plaintext import history in localStorage (medium — needs sessionStorage or server-side storage)
- Full-row webhook payload fetch (potential Stripe PII exposure)
- PUT handler in `posts/[postId]` writes post update outside transaction (high — data integrity risk)
- DELETE handler in `posts/[postId]` has non-atomic queue removal + DB delete (medium)

**Verified as adequate:**

- CSRF protection: Better Auth's `SameSite=Lax` session cookies provide appropriate protection ✓
- Subscriber PII in RSC: Dynamic admin pages don't cache RSC payloads; exposure is minimal ✓
- Bulk route queue enqueuing: Jobs are enqueued after transaction + all awaited before response ✓

### 5.5 Accessibility (WCAG 2.1)

**Strengths:**

- Skip-to-content link in root layout (`#main-content`)
- `aria-label` on action buttons in inspiration page
- Proper tab navigation in settings pages
- Design tokens for color contrast across light/dark modes

**Weaknesses:**

- Heading hierarchy skips in legal pages (h1 → h3 → h2)
- Decorative icons missing `aria-hidden="true"`
- Chat input missing `aria-label`
- Table headers missing `scope` attribute
- Profile page misuses `<label>` element outside form context
- Admin jobs page lacks semantic list markup and state badges communicate via color alone

### 5.6 Maintainability & Code Quality

**Strengths:**

- Consistent file naming conventions
- Proper metadata exports on most pages
- Consistent use of `getTranslations()` for i18n
- Good TypeScript usage overall

**Weaknesses:**

- 4 `any` type casts in production code
- Array index as React key in changelog
- Hardcoded magic strings in announcement page
- Dynamic logger imports in error paths
- Duplicate error handling code across AI pages

---

## 6. Remediation Priority Matrix

### Immediate (Sprint 1)

| Priority    | Finding                                                        | Effort |
| ----------- | -------------------------------------------------------------- | ------ |
| 🔴 Critical | Fix synchronous file I/O in blog.ts                            | 1 hr   |
| 🔴 Critical | Replace localStorage with sessionStorage in chat page          | 30 min |
| 🟠 High     | Wrap `posts/[postId]` PUT handler in full `db.transaction()`   | 30 min |
| 🟠 High     | Add defense-in-depth auth to youtube-to-thread + pdf-to-thread | 10 min |
| 🟠 High     | Add `DashboardPageWrapper` to team settings page               | 5 min  |
| 🟠 High     | Fix duplicate `eq()` in analytics query                        | 5 min  |
| 🟠 High     | Fix trial lock logic in agentic page                           | 15 min |
| 🟠 High     | Add null guard for `ownerUser!` in team page                   | 5 min  |

### Next Sprint

| Priority  | Finding                                                        | Effort      |
| --------- | -------------------------------------------------------------- | ----------- |
| 🟠 High   | Add server-component wrappers to 6 client-only pages           | 3 hr        |
| 🟠 High   | Parallelize sequential DB queries in team + integrations pages | 30 min      |
| 🟠 High   | Convert settings layout to server component                    | 1 hr        |
| 🟠 High   | Fix N sequential POSTs in calendar AI page                     | 2 hr        |
| 🟠 High   | Fix BullMQ N+1 in admin jobs page                              | 2 hr        |
| 🟠 High   | Fix fragile plan-limit detection in chat page                  | 2 hr        |
| 🟡 Medium | Add `import "server-only"` to 18 pages                         | 5 min each  |
| 🟡 Medium | Add `cachedQuery()` to 9 dashboard pages                       | 30 min each |
| 🟡 Medium | Add `AbortController` to 3 polling patterns                    | 30 min each |
| 🟡 Medium | Wrap PDF generate `recordAiUsage` + `db.update` in transaction | 30 min      |
| 🟡 Medium | Reorder DELETE handler: remove queue job AFTER DB delete       | 15 min      |
| 🟡 Medium | Replace `getPlanLimits()` with gate helpers in AI hub          | 15 min      |

### Backlog

| Priority  | Finding                                           | Effort      |
| --------- | ------------------------------------------------- | ----------- |
| 🟡 Medium | Fix heading hierarchy in legal pages              | 15 min each |
| 🟡 Medium | Add missing `loading.tsx` files (10+ segments)    | 15 min each |
| 🟡 Medium | Fix webhook page full-row fetch + add pagination  | 1 hr        |
| 🟡 Medium | Extract shared `PlanLimitPayload` interface       | 30 min      |
| 🟡 Medium | Extract inline markdown components to shared file | 1 hr        |
| 🟢 Low    | Add missing aria-labels and ARIA attributes       | 15 min each |
| 🟢 Low    | Add missing metadata to admin pages               | 10 min each |
| 🟢 Low    | Remove redundant `requireAdmin()` calls (3 pages) | 5 min each  |
| 🟢 Low    | Add `/brand` and `/roadmap` to sitemap            | 5 min       |
| 🟢 Low    | Extract inline components in admin jobs page      | 1 hr        |
| 🟢 Low    | Fix `any` type casts                              | 10 min each |

---

## 7. Verification Methodology

This audit was conducted by 4 parallel agents, each responsible for a distinct page group:

| Agent                     | Scope              | Files Audited                                                                                                                         |
| ------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Marketing + Auth          | 18 pages + blog.ts | `(marketing)/**`, `(auth)/**`, `brand`, `join-team`, `blog.ts`                                                                        |
| Dashboard Core            | 12 pages + layout  | `dashboard/layout.tsx`, overview, compose, drafts, queue, calendar, onboarding, inspiration, achievements, affiliate, referrals, jobs |
| AI + Analytics + Settings | 19 pages + layout  | `dashboard/ai/**`, `dashboard/analytics/**`, `dashboard/settings/**`                                                                  |
| Admin + Standalone        | 27 pages + layout  | `admin/**`, `profile`, `chat`, deprecated pages                                                                                       |

Each agent performed:

1. Full file reads of all assigned pages
2. Cross-reference against CLAUDE.md conventions and `.claude/rules/*.md` files
3. Trace of auth patterns, data fetching, and component boundaries
4. Line-by-line annotation of all findings

**Verification checklist:**

- [x] All 74 pages covered by audit
- [x] All layouts and route groups examined for auth enforcement
- [x] Cross-referenced against sidebar nav data for auth consistency
- [x] Feature flag gates verified
- [x] `error.tsx` and `loading.tsx` presence verified via glob
- [x] Convention compliance checked against all 16 CLAUDE.md hard rules
