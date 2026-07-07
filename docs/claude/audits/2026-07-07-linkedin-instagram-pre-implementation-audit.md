# LinkedIn + Instagram Publishing — Pre-Implementation Audit

**Date:** 2026-07-07
**Type:** Read-only audit (no code changed)
**Plan under review:** `.claude/plans/2026-07-07-linkedin-instagram-publishing.md`
**Method:** 5 parallel read-only agents (researcher, convention-enforcer, security-reviewer, performance-analyst, code-reviewer) per `.claude/rules/agent-orchestration.md`. Main thread verified all contradictory / high-severity claims directly against source.

## Verdict

**Proceed with Phase 1 — the plan's "Verified Current State" is accurate — but land 3 code blockers first, and expand the plan's scope in 5 places (see §"Corrections to the Plan File").** No plan statement was factually disproven; the gaps are omissions, not errors. Schema is production-ready (all columns + relations exist), OAuth CSRF + token encryption are correctly implemented, and the disconnect routes already enforce ownership.

**Severity tally:** 4 blockers · 11 should-fix · 8 nice-to-have.

### Two sub-agent claims the main thread overrode (verified against source)

| Sub-agent claim                                                                 | Reality                                                                                                                                                                           | Evidence                                                                                                                                                       |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| security: "CRITICAL — disconnect routes don't exist / missing ownership check"  | **False.** Both routes exist and scope the lookup by `userId`.                                                                                                                    | `src/app/api/accounts/linkedin/disconnect/route.ts:22-24`, `.../instagram/disconnect/route.ts:22-27` — `and(eq(id, accountId), eq(userId, ctx.currentTeamId))` |
| security: "CRITICAL — Facebook secret in URL leaks to browser history/referrer" | **Overstated → should-fix.** Server-side `fetch()`; secret never reaches a browser. Real risk is server/proxy/CDN/Sentry log capture, and it's Meta's own documented GET pattern. | `src/app/api/instagram/callback/route.ts:61-67, 73-79`                                                                                                         |

Note: the `code-reviewer` agent reported the `ui-ux-pro-max` Skill tool was unavailable in its session and fell back to a manual WCAG 2.1 AA + `.claude/rules/frontend.md` review. Findings stand; a future UI pass may re-run the skill.

---

## BLOCKERS (must fix before/at Phase 1)

### BL-1 — Worker publish-post processor is X-only (no platform dispatch)

**Severity: blocker** · Confirms plan gap #1.

- `src/lib/queue/processors.ts:68-74` — `FullPost` type loads only `xAccount`; no `linkedinAccount`/`instagramAccount`.
- `:91-102` — query `with: { xAccount: true }` only. (Schema relations DO exist: `src/lib/schema.ts:1401-1408`, so this is a query change, not a migration.)
- `:170-171` — hardcoded `if (!post.xAccountId) throw new Error("Post has no associated X account")`.
- `:174-184` — instantiates `XApiService` only; no branch on `post.platform`.
- `:190-265` — `post.tweets` loop calls `postTweet()` / X media only.
- `:349` — inactive check hardcoded on `post.xAccount`.
  A scheduled LinkedIn/Instagram post throws at `:170` today. Fix = extract platform-agnostic scaffolding + branch on `post.platform`.

### BL-2 — LinkedIn `getUser()` calls `/v2/me`, which the granted scopes forbid

**Severity: blocker** · Confirms plan gap #3.

- `src/lib/services/linkedin-api.ts:77-83` — `GET /v2/me?projection=(...)` requires `r_liteprofile`.
- `src/app/api/linkedin/auth/route.ts:18` — scopes are `w_member_social profile email openid` (no `r_liteprofile`).
- `src/app/api/linkedin/callback/route.ts:96-97` — callback calls `getUser()` immediately after token exchange → **403, every connect fails today**. Fix per plan §1.1 (`/v2/userinfo`, map `sub`→id, `name`, `picture`→avatar).

### BL-3 — Both service files missing `import "server-only"` (rule 14)

**Severity: blocker** (CLAUDE.md hard rule 14; not in the plan).

- `src/lib/services/linkedin-api.ts:1` and `src/lib/services/instagram-api.ts:1` import `db` but lack `import "server-only"` first line. Canonical: `src/lib/services/x-api.ts:1`. Risk: Node builtins (`net`/`tls`) leak into a client bundle via a transitive import.

### BL-4 — Instagram media-processing poll can starve the queue

**Severity: blocker** (performance; the plan does not bound this).

- `src/lib/services/instagram-api.ts:167-184` — `waitForMediaProcessing()` = 10 attempts × 2s = up to 20s of blocking I/O.
- Schedule queue runs `concurrency: 1` (`scripts/worker.ts:45`, lock ~6 min). One slow Reel stalls **all** publishing for up to 20s. Fix: bound to ~5×1s, throw `UnrecoverableError` on timeout (Phase 3 candidate: async two-phase monitor).

---

## SHOULD-FIX

### SF-1 — Feature flags defined but wired nowhere

Confirms plan gap #2. `src/lib/feature-flags.ts:50-58` define `linkedin_publishing` / `instagram_publishing` (both `false`); `isFeatureEnabled()` at `:13-31` is unused. No check in `src/app/api/posts/route.ts` (parse at `:129-165`, gates at `:183-226`) nor in the processor. Rollout switch is currently decorative. Fix per plan §1.3.

### SF-2 — Creation-time validation gaps in `posts/route.ts`

- No LinkedIn feature-flag gate and no "LinkedIn + media → 400" reject near `src/app/api/posts/route.ts:208-215` (only an Instagram _account-limit_ gate exists there).
- Phase-2 items also absent (IG requires ≥1 media, JPEG-only, reject IG threads). Track for Phase 2.

### SF-3 — Non-transient errors will burn all 5 retry cycles

`src/lib/queue/client.ts` `SCHEDULE_JOB_OPTIONS` = `attempts: 5` exponential (60s→960s). Plan uses `UnrecoverableError` only for the char-limit check. 401 (needs-reconnect), IG 100-posts/24h cap, and "missing platform account" are all non-transient and should throw `UnrecoverableError` immediately. (Mirrors deferred memory item: X 402 short-circuit.)

### SF-4 — LinkedIn/Instagram account-health cron missing

Confirms plan gaps #6/#8. `src/lib/services/linkedin-api.ts:33-71` refresh path never runs (self-serve = no refresh token); `src/lib/services/instagram-api.ts:27-34` refresh is an explicit "not implemented" stub. No daily cron marks `tokenExpiresAt < now + 7/10d`. Without it, posts silently fail at ~60 days. Fix per plan §1.5 / §2.3, mirroring the X token-failure protection pattern.

### SF-5 — Composer selector `target-accounts-select.tsx` has ZERO i18n

**Not scoped correctly in the plan.** `src/components/composer/target-accounts-select.tsx` never imports `useTranslations`; 6 hardcoded English strings at `:58, :76, :85, :91, :99, :153` (Arabic is primary). Plan §5 scopes i18n-dev to message files and frontend-dev to this file, but treats it as "surface flag state" — it actually needs a full i18n retrofit. The `compose.*` namespace exists (`en.json:604`) for the new keys.

### SF-6 — Icon-only disconnect buttons have no accessible name (WCAG 4.1.2)

`src/components/settings/connected-linkedin-accounts.tsx:114-121` and `connected-instagram-accounts.tsx:114-121` — `<Button size="icon">` wrapping `<Trash2>` with no `aria-label`/`sr-only`. Key already exists (`en.json:2573`). Add `aria-label` + `aria-hidden` on the icon.

### SF-7 — Current "Connect" disabled state is a broken WCAG pattern

`connected-linkedin-accounts.tsx:127` / `connected-instagram-accounts.tsx:127` — unconditional native `disabled`, no tooltip/`aria-disabled`/reason, removed from tab order. This is the baseline the plan's flag-gating replaces. **Canonical pattern to reuse:** `src/components/composer/ai-length-selector.tsx:46-88` (`aria-disabled`+`disabled`, guarded onClick, `cursor-not-allowed opacity-50`, preserved focus ring, `<Lock aria-hidden>`, explanatory Tooltip). ⚠ That component's own strings are hardcoded (`:34, :84`) — wire the reused version through `useTranslations()`; no `settings.integrations.coming_soon` key exists yet.

### SF-8 — Token-expiring warning tooltip unreachable by keyboard/SR

`target-accounts-select.tsx:148-155` — `<TooltipTrigger asChild>` wraps a non-focusable `<AlertTriangle>`. WCAG 1.3.1/2.1.1. Wrap in a focusable `role="img"` element with `aria-label`.

### SF-9 — Media uploads are sequential; per-item DB writes looped

`src/lib/queue/processors.ts:446-462` uploads media one-at-a-time (~5s for 5 images vs ~1s parallel) and `:458` issues one `db.update` per item. Pre-existing X code, but directly relevant when generalizing the loop. Parallelize uploads (`Promise.all`) and batch the updates.

### SF-10 — Graph API pinned to v19.0

Confirms plan gap #7. `src/lib/services/instagram-api.ts:7` const `v19.0` (used `:62,74,90,104,115,142,157,173`). Parameterize via `process.env.FACEBOOK_GRAPH_VERSION` (NOT `getServerEnv()` — worker loads this) with a current default. Per plan §2.4.

### SF-11 — Empty-state link is X-only, wrong route, wrong-direction arrow

`target-accounts-select.tsx:99` — hardcoded `→` (flips in RTL), copy is X-only in a multi-platform selector, links to `/dashboard/settings` instead of `/dashboard/settings/integrations` (renderer at `src/app/dashboard/settings/integrations/page.tsx`).

---

## NICE-TO-HAVE

- **NTH-1** — Instagram media URL not validated as public (`instagram-api.ts:87,105,142,157`); local `/uploads/...` fails silently on Meta fetch. Confirms plan gap #5; document dry-run-only local testing. (`SOCIAL_DRY_RUN` env from plan §1.2 does not exist yet — only `TWITTER_DRY_RUN`.)
- **NTH-2** — Over-fetch: loading all 3 account relations per post (`processors.ts:91-102`) fetches 2 empty rows each time (~50ms/post). Minor; use column projection or on-demand fetch.
- **NTH-3** — Account-health cron should batch refresh with `Promise.all` (pattern ref `src/app/api/x/subscription-tier/refresh/route.ts:58-95`), not sequential.
- **NTH-4** — Instagram connect enforces only account-limit, no feature/plan gate (`instagram/callback/route.ts:32-35`); free users can connect an account they can't post to. (May be intentional under the trial-access model — confirm, don't assume a bug.)
- **NTH-5** — Icon tap targets `size="icon"` (36px) below 44px mobile target in both settings components (`:114`); dropdown checkbox items ~32px (`target-accounts-select.tsx:106-157`).
- **NTH-6** — Platform icons lack `aria-hidden`/`sr-only` where they are the only platform signal (`target-accounts-select.tsx:62-68, 137-143`; settings headers `:75`).
- **NTH-7** — Brand hex bypasses design tokens + dark mode (`target-accounts-select.tsx:138,140,142`); acceptable for brand marks but noted.
- **NTH-8** — `composer-publishing-panel.tsx:83` hardcoded `"Scheduling for"`; fix alongside §1.4 flag-gating since this file hosts the composer gate. Loading state lacks `aria-busy` (`target-accounts-select.tsx:83-86`); `@username` bidi isolation (`connected-instagram-accounts.tsx:108`).

---

## Plan gap-list verification (§1 "Gaps" #1–8)

| #   | Plan claim                                  | Result                  | Evidence                                                                                |
| --- | ------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| 1   | Worker X-only (`:170`, `:349`)              | **CONFIRMED**           | `processors.ts:170-171, 174-184, 190-265, 349`                                          |
| 2   | Feature flags unwired                       | **CONFIRMED**           | `feature-flags.ts:50-58` defined; zero call sites                                       |
| 3   | LinkedIn `getUser()` `/v2/me` broken        | **CONFIRMED**           | `linkedin-api.ts:77-83` vs scopes `auth/route.ts:18`                                    |
| 4   | LinkedIn media upload throws (`:138`)       | **CONFIRMED**           | `linkedin-api.ts:134-139`                                                               |
| 5   | IG media must be public URL                 | **CONFIRMED**           | `instagram-api.ts:87,105,142,157` — no validation                                       |
| 6   | IG token refresh not implemented (`:27-34`) | **CONFIRMED**           | `instagram-api.ts:27-34` stub comment                                                   |
| 7   | Graph API pinned v19.0 (`:7`)               | **CONFIRMED**           | `instagram-api.ts:7`                                                                    |
| 8   | LinkedIn self-serve no refresh (`:33`)      | **CONFIRMED (precise)** | `linkedin-api.ts:33-71` — path exists but `refreshTokenEnc` is always null → never runs |

Security posture verified safe: OAuth `state` via `crypto.randomUUID()`, HttpOnly/SameSite=lax cookie, 10-min expiry, validated-before-code, cleared after use (both auth + callback routes); tokens `encryptToken()`-wrapped on write; callbacks bind to `session.user.id`; disconnect routes scope by `userId`. Convention scan clean on rules 4/5/9/11/12 for the callback + disconnect routes.

---

## Corrections to the Plan File

The plan's factual "Verified Current State" survived the audit intact — no statement was disproven. The corrections below are **additions / scope expansions**, plus one nuance:

1. **§7 risk #5 is already half-done, not open.** `posts/route.ts:318` already special-cases `type: ... acc.platform === "linkedin" ? "linkedin_post" : "tweet"`, and `postTypeEnum` includes `linkedin_post` (`schema.ts:446`). The only open decision is whether Instagram needs its own `instagram_post` enum value (still defaults to `"tweet"`). Reframe the risk accordingly.

2. **Add BL-3 (server-only) to the §6 hard-rule checklist** — both new service files violate rule 14 today; not currently listed.

3. **Add the Facebook-secret-in-URL hardening to Phase 2.4 (or 1.x housekeeping)** — `instagram/callback/route.ts:61-79`. Switch token exchanges to POST body. Should-fix (log hygiene / Sentry), not a blocker; correct the reasoning that it's a browser-history leak — it is not.

4. **§5 orchestration under-scopes i18n.** `target-accounts-select.tsx` has ZERO existing i18n (6 hardcoded strings) — it needs a full retrofit, not just "surface flag state." Explicitly scope both frontend-dev **and** i18n-dev to it, plus `composer-publishing-panel.tsx:83`. Also add the missing `settings.integrations.coming_soon` key set (en/ar/pseudo) — none exists.

5. **Bound the Instagram poll before Phase 2 (BL-4) and broaden `UnrecoverableError` (SF-3).** Plan §2.1 mentions the 100/24h cap but not the polling-starvation risk; plan §1.2 uses `UnrecoverableError` only for the char-limit check. Both 401 and rate-limit paths must short-circuit, or non-transient failures burn ~30 min of backoff.

6. **`SOCIAL_DRY_RUN` does not exist yet** (only `TWITTER_DRY_RUN`). Plan §1.2/§1.5 assume it — implement it as part of Phase 1, don't treat it as existing.

7. **Instagram connect has no feature/plan gate (NTH-4)** — only an account-limit check. Confirm this is intended under the trial-access model; if Instagram is meant to be Pro-gated at connect time, add it in Phase 2.2.

---

_Detailed per-area agent notes were consolidated into this file; the full per-agent working notes remain under `docs/claude/audits/_scratch-2026-07-07/` as backup. Contradictory high-severity claims (disconnect ownership, FB secret severity) were re-verified against source by the main thread and corrected here._
