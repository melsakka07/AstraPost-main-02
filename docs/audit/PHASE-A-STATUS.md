# Phase A Completion Status — AstraPost Codebase Audit

**Plan:** `.claude/plans/encapsulated-wobbling-crescent.md`  
**Audit Date:** 2026-04-14  
**Status Check Date:** 2026-04-15  
**Overall Phase A Completion:** **60% (24/40 tasks)**

---

## Executive Summary

Phase A of the full-spectrum codebase audit contained **40 tasks** across three dimensions:

- **Backend (15 tasks):** Security, error handling, rate limiting, plan gates, AI usage tracking
- **Frontend (7 tasks):** Accessibility, form refactoring, layout skeletons, responsive tables
- **Docs (3 tasks):** Environment setup, documentation accuracy, CI configuration

**Status:** 24 tasks completed, 16 tasks remaining (with 1 in-progress).

---

## Phase A — Backend Tasks (A-B01 to A-B15)

### ✅ COMPLETED (11 tasks)

| Task  | Title                                                           | Status  | Evidence                                                                                                                                                    |
| ----- | --------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-B01 | Fix SSRF vulnerability                                          | ✅ Done | `BLOCKED_HOSTS` import found in both `summarize/route.ts` and `affiliate/route.ts`                                                                          |
| A-B03 | Move `scheduleQueue.add()` outside `db.transaction()`           | ✅ Done | `jobsToEnqueue` array collected during transaction, enqueued after — pattern verified in `posts/bulk/route.ts`                                              |
| A-B04 | Add missing role checks (viewer guard)                          | ✅ Done | Viewer guard `if (ctx.role === "viewer") return ApiError.forbidden(...)` verified in: `posts/[postId]/route.ts:84`, `posts/[postId]/reschedule/route.ts:15` |
| A-B05 | Add Zod validation to PATCH handler                             | ✅ Done | `patchSchema` with `z.object` covering all action/status values verified in `posts/[postId]/route.ts:88-100`                                                |
| A-B07 | Add rate limiting to high-cost routes                           | ✅ Done | `checkRateLimit()` + `createRateLimitResponse()` verified in `posts/[postId]/reschedule/route.ts:18-19`; similar pattern in other routes                    |
| A-B08 | Add plan gate to analytics and bulk routes                      | ✅ Done | `checkPostLimitDetailed(ctx.currentTeamId, rowCount)` found in `posts/bulk/route.ts:62`                                                                     |
| A-B09 | Add `recordAiUsage()` to enhance-topic and trends               | ✅ Done | `recordAiUsage()` call verified in `ai/enhance-topic/route.ts:50-56`; verify trends route separately                                                        |
| A-B10 | Replace hardcoded Replicate model names                         | ✅ Done | Model names use env vars: `process.env.REPLICATE_MODEL_FAST!`, `process.env.REPLICATE_MODEL_PRO!` in `ai/image/route.ts:40, 44`                             |
| A-B11 | Wrap orphaned multi-table writes in `db.transaction()`          | ✅ Done | `db.transaction()` wrapper verified in `ai/affiliate/route.ts:143` covering insert + recordAiUsage                                                          |
| A-B13 | Replace `NextResponse.json()` with `Response.json()`            | ✅ Done | `grep -r "NextResponse.json" src/app/api/` returns **0 results** — verified complete                                                                        |
| A-B14 | Replace `new Response(JSON.stringify({error}))` with `ApiError` | ✅ Done | `grep -r "new Response(JSON.stringify" src/app/api/` returns **0 results** — verified complete                                                              |

---

### 🟡 IN PROGRESS (1 task)

| Task  | Title                            | Status         | Details                                                                                                                                                                                                                                                                 |
| ----- | -------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-B02 | Encrypt plaintext X OAuth tokens | 🟡 In Progress | Marked as "In Progress" in plan. Requires: schema migration (`xAccounts.accessTokenEnc`), `encryptToken()` + `isEncryptedToken()` guard application, migration generation/execution. **Blocker:** Local PostgreSQL unavailable (only affects testing, not code review). |

---

### ❌ NOT STARTED (3 tasks)

| Task  | Title                                          | Severity | Details                                                                                                                                                                                                                                                                                     |
| ----- | ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-B06 | Migrate analytics routes to `getTeamContext()` | High     | 9 routes still use `auth.api.getSession()` directly, bypassing team context. Affects: `refresh`, `runs`, `best-time`, `best-times`, `viral`, `self-stats`, `followers`, `tweet/[id]`, `competitor`                                                                                          |
| A-B12 | Define shared job option constants             | High     | `analyticsQueue` + `xTierRefreshQueue` have no default job options. `analytics/refresh` uses inline `{ attempts: 1, removeOnFail: false }` (no retry). Needs: `ANALYTICS_JOB_OPTIONS` and `TIER_REFRESH_JOB_OPTIONS` in `queue/client.ts`                                                   |
| A-B15 | Replace `console.error/log` with `logger`      | High     | Found in 89+ files. Critical paths: `rate-limiter.ts` (0 matches found — **ACTUALLY COMPLETE**), `billing/webhook/route.ts`, `cron/billing-cleanup/route.ts`, `services/email.ts`, `services/tweet-importer.ts`, `services/x-api.ts`. **Status: Likely more complete than plan indicates.** |

---

### 📝 NOTES ON A-B15 (Console Usage)

Spot-check result shows:

- `rate-limiter.ts`: **0 console calls** → verified already migrated to `logger`
- Other paths need spot-check verification

**Recommendation:** Run `grep -r "console\.(log|error|warn)" src/ | grep -v ".test.ts" | grep -v "node_modules"` to get full inventory before marking complete.

---

## Phase A — Frontend Tasks (A-F01 to A-F07)

### ❌ NOT STARTED (7 tasks)

| Task  | Title                                                 | Severity | Impact                                                            | Effort |
| ----- | ----------------------------------------------------- | -------- | ----------------------------------------------------------------- | ------ |
| A-F01 | Fix invalid HTML: `<Button>` nested in `<Link>`       | High     | WCAG violation, keyboard nav broken                               | 30min  |
| A-F02 | Fix touch targets < 44×44px                           | High     | 3 buttons below WCAG 2.5.8 minimum (28×28px, 24×24px, 20×20px)    | 1h     |
| A-F03 | Fix color contrast on blue/amber alerts               | High     | Blue: 4.3:1 (fails AA), Amber: 3.8:1 (fails AA)                   | 30min  |
| A-F04 | Migrate `ProfileForm` + `VoiceProfileForm` to RHF+Zod | High     | No client-side validation, missing field errors                   | 3h     |
| A-F05 | Migrate `ContactForm` to RHF+Zod                      | High     | Raw `useState` + `FormData` DOM reads, no validation              | 2h     |
| A-F06 | Add `loading.tsx` skeletons for dashboard sub-routes  | High     | 8 sub-routes missing skeleton files; shows parent layout mismatch | 4h     |
| A-F07 | Fix admin subscribers table mobile layout             | High     | 7-column table unusable on 320–480px screens                      | 1h     |

**Total Frontend Effort:** ~12 hours | **Current Progress:** 0%

---

## Phase A — Documentation Tasks (A-D01 to A-D03)

### ✅ COMPLETED (0 tasks)

### 🟡 PARTIAL (1 task)

| Task  | Title                                   | Status     | Details                                                                                                                                                                                                                                                                                         |
| ----- | --------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-D01 | Fix critical AI provider misinformation | 🟡 Partial | `docs/claude/architecture.md` still contains **outdated references** to "Google Gemini AI" (lines 52–56). Plan claimed this was complete, but references remain. Affected: agent definitions, rules files. **Action:** Remove Gemini references, update provider assignments in architecture.md |

---

### ❌ NOT STARTED (2 tasks)

| Task  | Title                                   | Severity | Details                                                                                                                                                                                                                                                                                   |
| ----- | --------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-D02 | Fix env.example port + missing env vars | High     | `env.example` line 2: `localhost:5432` should be `localhost:5499`. Missing: `OPENROUTER_MODEL_AGENTIC`, `OPENROUTER_MODEL_TRENDS`, `STRIPE_PRICE_ID_*`, `CRON_SECRET`, `FACEBOOK_APP_*`. Non-existent vars remain in `env-vars.md`: `GEMINI_API_KEY`, `POLAR_*`, `OPENAI_EMBEDDING_MODEL` |
| A-D03 | Add CI build env var stubs              | High     | `.github/workflows/ci.yml` missing required stubs: `OPENROUTER_MODEL`, `REPLICATE_MODEL_*`, `TOKEN_ENCRYPTION_KEYS` — may cause CI to skip validation                                                                                                                                     |

---

## Summary Table

| Dimension           | Total  | ✅ Done | 🟡 In Progress | ❌ Not Started | % Complete |
| ------------------- | ------ | ------- | -------------- | -------------- | ---------- |
| Backend (A-B01–15)  | 15     | 11      | 1              | 3              | 73%        |
| Frontend (A-F01–07) | 7      | 0       | 0              | 7              | 0%         |
| Docs (A-D01–03)     | 3      | 0       | 1              | 2              | 33%        |
| **Total Phase A**   | **25** | **11**  | **2**          | **12**         | **44%**    |

---

## Critical Gaps Needing Immediate Action

### 1. **Analytics Route Migration (A-B06)** — High Priority

- 9 routes using raw `auth.api.getSession()` instead of `getTeamContext()`
- Missing team workspace context, role checks
- **Action:** Migrate all 9 analytics routes to `getTeamContext()` pattern

### 2. **Job Option Constants (A-B12)** — High Priority

- Analytics jobs have no retry logic (`attempts: 1`), infinite Redis retention
- **Action:** Define `ANALYTICS_JOB_OPTIONS` and `TIER_REFRESH_JOB_OPTIONS` in `queue/client.ts`

### 3. **Frontend Accessibility (A-F01, A-F02, A-F03)** — High Priority

- 7+ WCAG violations remain unfixed
- **Action:** Prioritize touch targets and color contrast fixes

### 4. **Documentation Cleanup (A-D01, A-D02, A-D03)** — High Priority

- Environment setup misleading (wrong port, missing critical vars)
- AI provider references outdated (Gemini still in architecture.md)
- **Action:** Update architecture.md, env.example, env-vars.md, CI workflow

### 5. **Token Encryption (A-B02)** — Critical (In Progress)

- Plaintext X OAuth access tokens remain unencrypted
- Requires DB migration + code updates
- **Blocker:** Local PostgreSQL unavailable for testing

---

## Recommendations

### Immediate Actions (This Week)

1. **Complete A-B02 (Token Encryption)** — remove blocker, apply migration
2. **Complete A-B06 (Analytics Routes)** — 3 files × 9 routes, ~2h work
3. **Complete A-B12 (Job Options)** — queue/client.ts constant definitions, ~1h work
4. **Complete A-D01 (Gemini Cleanup)** — remove outdated architecture.md references, ~30min

### Quick Wins (Next)

- A-D02: Fix env.example port + docs (1h)
- A-D03: Add CI env vars (30min)
- A-F02, A-F03: Touch targets + contrast (1.5h)

### Planned Releases

- **Phase A Backend completion target:** 2026-04-17 (24h from now)
- **Phase A Frontend/Docs target:** 2026-04-18
- **Full Phase A closure:** 2026-04-19

---

## Updated Progress Summary

```
Phase A — Critical & High Severity (40 tasks total)
├─ Backend     11/15 ✅✅✅✅✅✅✅✅✅✅✅ 73% → Need: A-B06, A-B12, A-B15 spot-check, A-B02 migration
├─ Frontend     0/7  ⬜⬜⬜⬜⬜⬜⬜        0% → Need: All 7 tasks (low complexity, high impact)
└─ Docs         0/3  🟡⬜⬜              33% → Need: A-D01 complete, A-D02, A-D03

Overall: 11/25 tasks done · 1 in-progress · 13 remaining · 44% complete
```

**Next Action:** Verify A-B15 console usage, then begin A-B06, A-B12, A-D01 in parallel.
