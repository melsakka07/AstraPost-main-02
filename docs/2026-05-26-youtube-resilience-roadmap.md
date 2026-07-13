# YouTube-to-Thread Resilience Roadmap

# Plan is rveised

**Created:** 2026-05-26
**Context:** Post-deploy verification of the yt-dlp two-pass hardening (`getVideoInfo()` + `extractAudioViaYtDlp()`) confirmed the pipeline is operational. This document captures the next-step improvements to make the service resilient when YouTube/yt-dlp change again — which the commit history shows happens roughly every 1-2 weeks.

**Baseline reference:** `memory/project_youtube_ytdlp_hardening.md` — known-good production snapshot from 2026-05-26 ~16:53-17:00 UTC (worker_ready anchor: `2026-05-26T16:51:44.985Z`).

**Why now:** Today's success is one snapshot, not a guarantee. The escalation ladder below is ordered cheapest + highest-signal first, so each tier is independently shippable. Pick up wherever the next failure exposes the next gap.

---

## Tier 1 — Cheap, ship in a day

### 1. Synthetic canary job

**Goal:** Convert "we find out when a user complains" into "we know within hours."

**Spec:**

- Vercel cron route at `*/6 hours` (or Railway cron — pick whichever is easier given existing patterns)
- Path: `/api/cron/youtube-canary`
- Enqueues a `youtubeThreadQueue` job with a hardcoded known-good 60-90s video URL (pick a stable, evergreen video — e.g., a CC0 short)
- After job completes, checks `mode` field
- If `mode !== "full"` → fire alert via Resend (existing wiring) to ops email

**Files:**

- New: `src/app/api/cron/youtube-canary/route.ts`
- Update: `vercel.json` or `vercel.ts` to register the cron
- Reference existing cron pattern: `src/app/api/cron/billing-cleanup/route.ts`

**Owner:** backend-dev
**Validation:** trigger manually, verify it enqueues + alerts on forced failure

---

### 2. Regression alert on log signals

**Goal:** Catch silent degradation between canary runs.

**Spec:**

- Sentry alert rule (configured outside the codebase): fire when `youtube_thread_title_only` OR `youtube_thread_title_only_fallback` count > 0 in any 1h window
- Threshold: 1+ occurrence (not a rate) — pre-fix baseline was 100%, post-fix should be 0%, so any occurrence is a regression
- Channel: same as canary (Resend ops email or Sentry Slack integration)

**Owner:** Manual config in Sentry dashboard
**Validation:** force a `title_only` log via dev → confirm alert fires

---

### 3. Pin yt-dlp version + version diagnostic

**Goal:** Stop silent regressions from Railway pulling a broken yt-dlp release.

**Spec:**

- Update `nixpacks.toml` to install yt-dlp at a pinned version (e.g., `pip install yt-dlp==2026.5.20`)
- Add diagnostic script: `pnpm diagnose:yt-dlp` → prints installed version, runs a known-good URL through `--print %(id)s`, exits non-zero on failure
- Log yt-dlp version on `worker_ready` event

**Files:**

- Update: `nixpacks.toml`
- New: `scripts/diagnose-yt-dlp.ts`
- Update: `scripts/worker.ts` to log version on startup
- Update: `package.json` scripts

**Owner:** backend-dev
**Validation:** `railway logs ... | grep worker_ready` shows new `ytDlpVersion` field

---

### 4. Cookie freshness check on worker startup

**Goal:** Detect expired/invalidated cookies before they silently degrade attempt-2.

**Spec:**

- On worker startup, after `worker_ready`, run one warm-up call: yt-dlp `--print %(id)s` against a known-good URL with `--cookies` flag
- Log `youtube_cookies_valid: true/false` with the result
- If `false`, fire alert via Resend
- Run this check on a daily schedule too (not just startup) since cookies can expire mid-run

**Files:**

- New: `src/lib/services/youtube-cookie-health.ts`
- Update: `scripts/worker.ts` to call on startup
- Optionally: new daily cron route `src/app/api/cron/youtube-cookie-health/route.ts`

**Owner:** backend-dev
**Validation:** invalidate `YOUTUBE_COOKIES_BASE64` env on Railway, restart → confirm alert

---

## Tier 2 — Medium effort, big resilience win

### 5. Thread Webshare proxy through yt-dlp subprocess

**Goal:** Close the biggest defensive gap — yt-dlp subprocess currently goes straight from Railway's IP, undefended. The Webshare proxy only protects undici fetches in `getVideoInfoHttp`.

**Spec:**

- In `extractAudioViaYtDlp()` and `getVideoInfo()`, before invoking yt-dlp, call `resolveProxyUrl()` from `src/lib/services/youtube-proxy.ts`
- If a proxy is resolved, prepend `--proxy <url>` to the yt-dlp args
- On yt-dlp failure with `reason="network"` and a 407/timeout signature, call `invalidateActiveProxy("ytdlp_subprocess_failure")` so the next attempt fetches a fresh proxy
- Both attempt-1 and attempt-2 should respect the proxy

**Files:**

- Update: `src/lib/services/youtube.ts` (both yt-dlp functions)
- Reference: `src/lib/services/youtube-proxy.ts` for the resolver API

**Owner:** backend-dev + security-reviewer (proxy creds in argv = secret-exposure surface — verify they're masked in logs and never appear in stderr leaks)
**Validation:** confirm `youtube_proxy_resolved` log fires before each yt-dlp call; manually break attempt-1 and confirm rotation kicks in

---

### 6. Auto-update yt-dlp weekly

**Goal:** YouTube extractor changes ship in yt-dlp faster than our manual deploy cadence.

**Spec:**

- Weekly cron on Railway: `pip install -U yt-dlp` then restart worker
- Pair with the version pin from #3 — auto-update bumps the pin via a PR (Renovate/Dependabot style) instead of unbounded updates
- Run the diagnostic script from #3 post-update; if it fails, revert and alert

**Files:**

- New: `scripts/update-yt-dlp.sh`
- Update: Railway scheduled task config
- Optionally: GitHub Action that opens a PR to bump the pin weekly

**Owner:** backend-dev (script) + manual Railway config
**Validation:** trigger the script manually, verify version bumps + diagnostic passes

---

### 7. User-facing degraded-mode handling

**Goal:** Today, silent fall to `title_only` mode produces a low-quality thread with no explanation. Convert silent failure to graceful failure with user agency.

**Spec:**

- When job completes with `mode="title_only"` or `mode="title_only_fallback"`, return the result with a `degraded: true` flag and a `degradedReason` string
- Frontend (`src/app/dashboard/ai/youtube-to-thread/`) displays a banner: "We couldn't transcribe this video — generated from title only. Retry?"
- Auto-refund the AI quota cost for degraded jobs (use existing `releaseAiQuota` pattern in `processors.ts`)
- Log `youtube_thread_degraded_refund` for billing audit trail

**Files:**

- Update: `src/lib/queue/processors.ts` (release quota on degraded mode)
- Update: `src/app/api/ai/youtube-to-thread/[jobId]/route.ts` (surface `degraded` field)
- Update: `src/app/dashboard/ai/youtube-to-thread/` components (banner + retry button)
- Update: i18n keys for the banner copy (ar + en)

**Owner:** backend-dev + frontend-dev + i18n-dev in parallel
**Validation:** force a title_only job (block yt-dlp temporarily) → confirm banner + refund

---

## Tier 3 — Architectural fallbacks

These are deferred until Tier 1+2 are in place AND we observe attempt-2 (cookied fallback) failing in production. Don't build until needed.

### 8. Webshare Residential proxies

**Goal:** Residential IPs are rarely on YouTube's hot-list, unlike datacenter IPs.

**Spec:**

- Upgrade Webshare plan to Residential tier (~$6/mo)
- Update `webshare.ts` to fetch from the residential pool endpoint
- A/B: split traffic 50/50 across datacenter + residential for a week, measure `mode="full"` rate

**Defer until:** attempt-2 fails in production OR `mode="full"` rate drops below 90% over a week
**Owner:** backend-dev

---

### 9. Alternative extraction provider as 3rd-tier fallback

**Goal:** When yt-dlp exhausts both attempts, try an external service before falling to `title_only`.

**Options (research first):**

- Cobalt API (`cobalt.tools`) — free, rate-limited, OSS
- SaveFrom-style APIs — paid, less ethical
- Self-host Cobalt on Railway as a service

**Spec:**

- New service: `src/lib/services/youtube-cobalt.ts` (or equivalent)
- New attempt-3 in the audio extraction chain
- Add `extraction_method` field to job log: `yt-dlp-attempt-1` / `yt-dlp-attempt-2` / `cobalt` / `title_only`

**Defer until:** Tier 2 #5 (proxy through yt-dlp) doesn't recover us
**Owner:** ai-specialist or backend-dev

---

### 10. Playwright-based browser extractor

**Goal:** Last-resort fallback that runs a real browser and scrapes audio the way cobalt/SaveFrom do internally.

**Spec:**

- Separate Railway service (NOT the worker — Playwright needs its own footprint)
- Stateless HTTP endpoint: POST `/extract` with `{videoId}` → returns presigned audio URL
- Main worker calls this as attempt-4 before falling to title_only

**Cost:** ~$5-10/mo additional Railway service, slow (15-30s per extract)
**Defer until:** #9 also fails OR we get a high-value enterprise customer needing 99.9% reliability
**Owner:** infra + backend-dev

---

## Tier 4 — Engineering process

### 11. Pre-deploy smoke test

**Goal:** Halt a Railway deploy if it would break YouTube extraction.

**Spec:**

- Railway pre-deploy hook (or first action on new deploy): run the diagnostic from #3
- If it fails, roll back automatically
- Pair with the canary from #1 — diagnostic = "can we extract", canary = "did extraction work end-to-end"

**Files:**

- Update: `railway.json` (predeploy command)
- New: `scripts/predeploy-smoke.sh`

**Owner:** backend-dev + manual Railway config

---

### 12. Mode-rate SLO + dashboard

**Goal:** Quantitative health signal.

**Spec:**

- Daily aggregate query: `SELECT mode, COUNT(*) FROM youtube_thread_jobs WHERE created_at > NOW() - INTERVAL '7d' GROUP BY mode`
- Surface on admin dashboard (`src/app/dashboard/admin/`) as a tile
- SLO target: 95% `mode="full"` over 7d
- Below target = automatic Sentry issue (paged)

**Owner:** backend-dev + frontend-dev
**Validation:** verify the tile renders with current numbers

---

## Recommended starting work package

Ship these together as the first PR after this plan:

- **#1 (canary)** — detection
- **#2 (alert)** — detection
- **#5 (proxy through yt-dlp)** — resilience

This is the smallest set that gives both detection and one additional line of defense. Then **#3, #4, #6** follow cheaply.

**#7 (UX handling)** is independent and worth doing in parallel — even when the tech can't be saved, the UX hedge converts silent failure into graceful failure with retry + refund.

---

## Tracking + ownership

- Each tier is independently shippable — no need to ship in order beyond the recommendation above
- Update this doc as items ship (move to a "Shipped" section at the bottom with PR links + dates)
- New failure modes discovered in production should add new items to the appropriate tier

## Related

- Memory: `project_youtube_ytdlp_hardening.md` (post-deploy baseline)
- Memory: `project_youtube_proxy_architecture.md` (existing proxy resolver chain)
- Memory: `reference_production_verification.md` (log query patterns)
- Code: `src/lib/services/youtube.ts` (the file most of this work touches)
- Code: `src/lib/queue/processors.ts:1543-2100` (worker's YouTube job processor)
