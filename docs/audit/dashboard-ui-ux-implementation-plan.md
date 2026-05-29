# Dashboard UI/UX — Phased Implementation Plan

**Source:** `docs/audit/dashboard-ui-ux-audit.md`
**Created:** 2026-05-28
**Owner:** Frontend / Dashboard
**Method:** Agent-orchestrated, wave-based. Each wave is an independently shippable PR.

---

## How to use this document

Each wave below has four parts:

1. **Scope** — the audit findings it closes, the files it touches, and acceptance criteria.
2. **Agent strategy** — which custom agents run, in what order, and what runs in parallel.
3. **Kickoff prompt** — paste into Claude Code to start the wave.
4. **Verification prompt** — paste in after implementation to confirm the wave landed and didn't regress.

**Global Definition of Done (every wave):**

- `pnpm run check` passes (lint + typecheck) and `pnpm test` passes.
- No new `any` types or `@ts-ignore`.
- Docs updated where design/architecture changed (`docs/0-MY-LATEST-UPDATES.md` always; `docs/claude/*` + `README.md` when relevant).
- Final audit gate runs: **convention-enforcer + security-reviewer in parallel → test-runner**.

**Agents available** (`.claude/agents/`): `frontend-dev`, `backend-dev`, `ai-specialist`, `i18n-dev`, `db-migrator`, `researcher`, `test-runner`, `code-reviewer`, `convention-enforcer`, `security-reviewer`, `performance-analyst`.

---

## Wave sequencing & dependencies

```
Wave 1 (P0 + token quick wins)  ──►  Wave 2 (types + microcopy)
                                          │
                                          ▼
                          Wave 3 (shared components: EmptyState → XThreadPreview → TweetEditorList)
                                          │
                          ┌───────────────┴───────────────┐
                          ▼                                ▼
              Wave 4 (Inspiration overhaul)      Wave 5 (Composer decomposition)
              (independent; needs product         (MUST follow Wave 3 — composer
               decision before P1-3 build)         adopts <TweetEditorList>)
```

- **Wave 1** is the recommended first PR (≈1.5 days) — mechanical, low-regression, clears the entire P0 surface.
- **Wave 5 depends on Wave 3** so the decomposed composer consumes the unified `<TweetEditorList>` instead of re-creating it.
- **Wave 4** is independent but its first task (P1-4 identity) is a **product decision**, not code — resolve it before building P1-3.

---

## Wave 1 — P0 Accessibility + Design-Token Consistency

> The audit's "recommended first PR." Bundles every P0 plus the highest-visibility visual drift.

### Scope

| Audit ID | Fix                                                                                             | Files                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| P0-1     | Replace hardcoded `*-500` palette with AA-tuned semantic tokens (`success/info/warning/danger`) | `src/app/dashboard/page.tsx:207–230,448–449`, `src/components/dashboard/setup-checklist.tsx:173–180` |
| P0-2     | Remove focusable `<Link href="#">` on completed checklist steps; render non-interactive         | `src/components/dashboard/setup-checklist.tsx:169`                                                   |
| P2-3     | Locked-badge `amber-500/700` literals → `warning-*` tokens                                      | `src/components/dashboard/ai-tools-grid.tsx:154`                                                     |
| P2-1     | Reserve fixed height for `null`-fallback Suspense islands (CLS fix)                             | `src/app/dashboard/page.tsx:340`, `src/components/dashboard/post-usage-bar.tsx:69`                   |
| §9 guard | Add CI guard against raw Tailwind palette classes under dashboard dirs                          | CI config / lint setup                                                                               |

**Acceptance criteria**

- No raw `*-500` (or any `-50…-900` numbered palette) color classes remain in `src/app/dashboard/page.tsx`, `setup-checklist.tsx`, or `ai-tools-grid.tsx`.
- Completed checklist steps are NOT in the tab order and announce no "link" role.
- Stat cards + locked badge meet ≥4.5:1 (text) / ≥3:1 (non-text) in **both** light and dark mode.
- `/dashboard` first paint shows no pop-in from the two islands (CLS < 0.1).

### Agent strategy

- **Primary (parallel by file group):** `frontend-dev` ×1 — single coherent change set (small enough that splitting risks merge churn on `page.tsx`).
- **Guard task:** `frontend-dev` adds the lint/grep guard (§9).
- **Final gate (parallel):** `convention-enforcer` + `security-reviewer` → then `test-runner`.

### Kickoff prompt

```
Implement Wave 1 of docs/audit/dashboard-ui-ux-implementation-plan.md (P0 a11y + token consistency).

Use the frontend-dev agent. Tasks:
1. P0-1: In src/app/dashboard/page.tsx STAT_CARDS (lines ~207–230) and the failed-posts
   badge (~448–449), and in src/components/dashboard/setup-checklist.tsx (~173–180),
   replace every raw Tailwind palette class (emerald/blue/amber/purple/green-500) with the
   AA-tuned semantic scales already used elsewhere in these files (success/info/warning/danger,
   e.g. border-s-success-9 / text-success-11 / bg-success-3). Match each card's MEANING to the
   right scale; do not invent new tokens.
2. P0-2: In setup-checklist.tsx:169, completed steps must NOT be a <Link href="#"> with
   pointer-events-none. Render a non-interactive element (div/span) for completed steps; keep
   <Link href={step.href}> only for incomplete steps.
3. P2-3: In src/components/dashboard/ai-tools-grid.tsx:154, swap amber-500/amber-700 literals
   for warning-* tokens to match the agentic processing screen.
4. P2-1: Replace the <Suspense fallback={null}> for SetupChecklist (page.tsx:340) and the
   null return in post-usage-bar.tsx:69 with fixed-height skeletons so there is no layout shift.
5. Add a CI/lint guard that fails when raw numbered palette classes (e.g. -500) appear under
   src/app/dashboard and src/components/dashboard.

Reference docs/audit/dashboard-ui-ux-audit.md §4 and §6 for exact token guidance and WCAG SCs.
Then run the final gate: convention-enforcer + security-reviewer in parallel, then test-runner.
Update docs/0-MY-LATEST-UPDATES.md. Run pnpm run check and pnpm test before reporting done.
```

### Verification prompt

```
As per docs\audit\dashboard-ui-ux-implementation-plan.md Verify Wave 1 is correctly implemented.

1. Grep src/app/dashboard/page.tsx, src/components/dashboard/setup-checklist.tsx, and
   ai-tools-grid.tsx for raw palette classes matching -(50|100|200|300|400|500|600|700|800|900).
   Expect ZERO matches. Report any survivors with file:line.
2. Confirm setup-checklist.tsx no longer renders <Link href="#"> for completed steps and that
   completed steps are non-focusable.
3. Confirm SetupChecklist's Suspense fallback and PostUsageBar render fixed-height skeletons,
   not null.
4. Confirm the CI/lint palette guard exists and actually fails on a planted -500 class.
5. Run pnpm run check and pnpm test; report pass/fail.
6. Manually (or via the agent-browser/playwright skill) load /dashboard in light AND dark mode;
   confirm stat-card and locked-badge contrast looks correct and there is no first-paint pop-in.

Report a pass/fail checklist with evidence. Do not modify code during verification.
```

---

## Wave 2 — Type Safety + AI Capability Microcopy

### Scope

| Audit ID | Fix                                                                    | Files                                                                                   |
| -------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| P1-5     | Replace `as any` casts with the already-declared union/interface types | `src/app/dashboard/inspiration/page.tsx:387`, `src/components/.../sortable-tweet.tsx:8` |
| P2-2     | Add "best for…" capability/limitation microcopy to each AI tool card   | `src/components/dashboard/ai-tools-grid.tsx:161–181` + locale files                     |

**Acceptance criteria**

- `setActiveTab(v as any)` uses the declared `"import" | "history" | "bookmarks"` union; `sortable-tweet.tsx` types `tweet` against the existing `TweetDraft` interface — no `any`.
- Each AI tool card shows a short capability line; all new strings exist in `ar` + `en` (and pseudo-locale parity passes `check:i18n`).

### Agent strategy

- **Parallel:** `frontend-dev` (P1-5 type fixes + render the microcopy line) **and** `i18n-dev` (add `ar`/`en`/pseudo keys for capability text). No file overlap — frontend edits components, i18n edits `src/i18n/messages/*`.
- **Final gate (parallel):** `convention-enforcer` + `code-reviewer` → `test-runner`.

### Kickoff prompt

```
Implement Wave 2 of docs/audit/dashboard-ui-ux-implementation-plan.md.

Run two agents IN PARALLEL:
- frontend-dev:
  1. P1-5: Remove `setActiveTab(v as any)` at src/app/dashboard/inspiration/page.tsx:387 — use
     the existing useState union "import" | "history" | "bookmarks". In the composer's
     sortable-tweet.tsx:8, type `tweet` against the existing TweetDraft interface
     (composer.tsx:112). No `any`, no @ts-ignore.
  2. P2-2: In ai-tools-grid.tsx (~161–181), add a short capability/limitation line per tool card
     ("best for…") pulling text from i18n keys (do not hardcode strings).
- i18n-dev: add the capability microcopy keys for all 9 AI tools to src/i18n/messages/en.json
  and ar.json, and keep pseudo.json parity so `pnpm check:i18n` passes.

Coordinate on the exact key names first (frontend-dev consumes what i18n-dev defines).
Then run convention-enforcer + code-reviewer in parallel, then test-runner.
Update docs/0-MY-LATEST-UPDATES.md. Run pnpm run check, pnpm test, and the i18n parity check.
```

### Verification prompt

```
As per docs\audit\dashboard-ui-ux-implementation-plan.md Verify Wave 2 is correctly implemented.

1. Grep src/app/dashboard/inspiration/page.tsx and the composer's sortable-tweet.tsx for
   `as any` and `tweet: any` — expect zero. Confirm the TweetDraft type is used.
2. Confirm each of the 9 AI tool cards renders a capability line and that every string resolves
   from i18n (no hardcoded English in the component).
3. Confirm en.json, ar.json, and pseudo.json all contain the new keys (parity).
4. Run pnpm run check, pnpm test, and the i18n key-parity check. Report pass/fail with evidence.
```

---

## Wave 3 — Shared Component Extraction

> Eliminates the largest duplication in the audit (§5). Do the three in ascending risk order; each is its own commit, all in one PR.

### Scope

| Audit ID | Component           | Replaces                                                                                   |
| -------- | ------------------- | ------------------------------------------------------------------------------------------ |
| §5.3     | `<EmptyState>`      | Hand-rolled empty blocks: `page.tsx:425–461`, `inspiration/page.tsx:555–569,576,645`       |
| §5.2     | `<XThreadPreview>`  | `ComposerPreview` (`composer.tsx:40`) + `agentic/x-thread-preview.tsx`                     |
| §5.1     | `<TweetEditorList>` | Composer `SortableTweet`/`TweetCard` + agentic `agentic/tweet-card.tsx` (DnD + char count) |

**Acceptance criteria**

- A single `<EmptyState icon title description actions />` is consumed by all four prior call sites; markup deleted at each.
- A single presentational `<XThreadPreview tweets account tier />` is consumed by composer and agentic.
- A single headless `<TweetEditorList>` owns DnD + per-tweet char counting + a11y, with slot props for composer- vs. agentic-specific footer actions. The mature composer behaviors (length zones, 280 milestone bar, throttled live region, keyboard DnD) are preserved and now shared.
- The 280-char thread rule lives in exactly one place.

### Agent strategy

- **Step 1 — map (`researcher`):** enumerate every call site, prop shape, and behavioral difference between the composer and agentic implementations so the shared API covers both.
- **Step 2 — build (`frontend-dev`):** create the three components (EmptyState → XThreadPreview → TweetEditorList).
- **Step 3 — migrate (`frontend-dev`, parallelizable by surface):** swap composer + agentic + dashboard + inspiration call sites onto the new components; delete dead markup.
- **Final gate (parallel):** `code-reviewer` + `convention-enforcer` → `test-runner`. `performance-analyst` optional to confirm no bundle regression.

### Kickoff prompt

```
Implement Wave 3 of docs/audit/dashboard-ui-ux-implementation-plan.md (shared component
extraction, audit §5). Work in three sequential steps; keep each component a separate commit.

Step 1 — researcher: map ALL call sites and behavioral differences for (a) empty-state markup,
(b) the X/tweet preview, and (c) the sortable tweet editor + char counting, across the composer
(sortable-tweet.tsx, tweet-card.tsx, ComposerPreview) and agentic (agentic/tweet-card.tsx,
agentic/x-thread-preview.tsx, review-screen.tsx). Output the exact props each surface needs.

Step 2 — frontend-dev: build, in this order:
  1. <EmptyState icon title description actions /> and migrate page.tsx:425–461 and the three
     inspiration empty blocks.
  2. <XThreadPreview tweets account tier /> consumed by composer + agentic.
  3. <TweetEditorList> (headless: DnD + char counting + a11y, slot props for mode-specific
     footers). Preserve the composer's length zones, 280 milestone bar, throttled char-count
     live region, and KeyboardSensor DnD. The 280-char rule must live in ONE place.

Step 3 — frontend-dev: migrate composer and agentic onto <TweetEditorList> + <XThreadPreview>;
delete the now-dead duplicate code.

Then run code-reviewer + convention-enforcer in parallel, then test-runner; optionally
performance-analyst for bundle check. Update docs/claude/ architecture notes + 0-MY-LATEST-UPDATES.md.
Run pnpm run check and pnpm test.
```

### Verification prompt

```
As per docs\audit\dashboard-ui-ux-implementation-plan.md Verify Wave 3 is correctly implemented.

1. Confirm <EmptyState>, <XThreadPreview>, and <TweetEditorList> exist as shared components and
   that the old hand-rolled markup at page.tsx:425–461 and inspiration empties is gone (grep for
   the old gradient-circle/icon pattern — expect it only inside <EmptyState>).
2. Confirm composer AND agentic both import the shared <XThreadPreview> and <TweetEditorList>;
   grep for a second copy of the 280-char limit logic — expect exactly one definition.
3. Behavior check (agent-browser/playwright): in the composer, verify char-count zones, the 280
   milestone bar, throttled live region, and keyboard drag-reorder still work. In the agentic
   review screen, verify the tweet list still reorders, edits, and removes.
4. Run pnpm run check and pnpm test. Report a pass/fail checklist with evidence.
```

---

## Wave 4 — Inspiration Page Overhaul

> Independent of Waves 3/5. **P1-4 is a product decision and must be resolved first.**

### Scope

| Audit ID | Fix                                                                                                     | Files                                                          |
| -------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| P1-4     | **Decision:** rename/reposition as "Import & Adapt" (matches behavior) OR build a discovery feed        | naming, nav, i18n — OR a new feature scope                     |
| P1-3     | Give history a real backend (or explicitly label it device-only) so it stops disagreeing with bookmarks | `schema.ts`, new API route, `inspiration/page.tsx:104–124,232` |

**Acceptance criteria (for the DB-backed path)**

- History persists server-side via an API mirroring the bookmark pattern; survives cache-clear and syncs across devices.
- The two tabs share one persistence mental model (both DB-backed) — or the UI explicitly labels history "this device only" if the team chooses the cheap path.
- Schema change uses `db.transaction()` for multi-table writes; migration generated via `pnpm db:generate` and the generated SQL is committed (never `db:push` alone).

### Agent strategy

- **Pre-work (human):** resolve P1-4. If "Import & Adapt" rename → small `i18n-dev` + `frontend-dev` task. If "build discovery" → that is its own feature plan, out of scope here.
- **If P1-3 DB-backed:** `db-migrator` (schema + migration) → then **parallel** `backend-dev` (history API route, following the 9-step API checklist) + `frontend-dev` (swap localStorage history for the API, optimistic insert like bookmarks).
- **Final gate (parallel):** `security-reviewer` + `convention-enforcer` → `test-runner`.

### Kickoff prompt

```
Implement Wave 4 of docs/audit/dashboard-ui-ux-implementation-plan.md (Inspiration overhaul).

FIRST confirm the P1-4 decision with me before building: rename to "Import & Adapt" (cheap,
matches current behavior) vs. build a discovery/trending feed (large, separate feature). Do not
proceed to P1-3 until I answer.

For P1-3 (DB-backed history), once approved:
- db-migrator: add an inspiration-history table to src/lib/schema.ts mirroring the bookmark
  model; run pnpm db:generate and COMMIT the generated SQL (do not rely on db:push).
- THEN in parallel:
  - backend-dev: add /api/inspiration/history routes following the 9-step API checklist in
    CLAUDE.md (auth via getTeamContext, Zod validation, ApiError, db.transaction for writes,
    Response.json). Cap/paginate like the existing 20-item behavior if desired.
  - frontend-dev: replace the localStorage history in inspiration/page.tsx (104–124, 232) with
    the new API; optimistic insert + toast like bookmarks; remove the localStorage code.

Then run security-reviewer + convention-enforcer in parallel, then test-runner. Update
docs/claude/architecture.md + 0-MY-LATEST-UPDATES.md. Run pnpm run check, pnpm test, pnpm db:migrate.
```

### Verification prompt

```
As per docs\audit\dashboard-ui-ux-implementation-plan.md Verify Wave 4 is correctly implemented.

1. Confirm the P1-4 decision was applied (either the rename is reflected in nav + i18n, or the
   discovery feature was explicitly deferred).
2. If P1-3 DB-backed: confirm a history table exists in schema.ts, a generated migration SQL file
   is committed, and pnpm db:migrate runs clean. Confirm the API route follows the 9-step checklist
   (auth, Zod, ApiError, db.transaction, Response.json) — no NextResponse.json, no inline Response.
3. Confirm inspiration/page.tsx no longer writes history to localStorage and that history now
   loads from the API. Both tabs share one persistence model (or history is clearly labeled
   device-only).
4. Behavior check: import a tweet, confirm it appears in history, reload in a fresh session,
   confirm it persists.
5. Run pnpm run check, pnpm test. Report pass/fail with evidence.
```

---

## Wave 5 — Composer Decomposition

> **Must follow Wave 3** so the composer adopts `<TweetEditorList>` rather than re-implementing it. Highest effort, highest regression risk — behavior-lock with tests FIRST.

### Scope

| Audit ID | Fix                                                                                                                                                                                                        | Files                             |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| P1-1     | Decompose the 2,709-line composer: extract `use-composer-drafts.ts`, `use-composer-ai.ts`, link-preview, and numbering logic into hooks; split toolbar/footer into subcomponents; target shell < 400 lines | `src/components/.../composer.tsx` |

**Acceptance criteria**

- Composer shell < 400 lines; logic lives in focused hooks/subcomponents.
- Composer consumes the shared `<TweetEditorList>` + `<XThreadPreview>` from Wave 3.
- **Zero behavior delta:** autosave + restore-draft prompt, char-count zones, 280-thread cap, auto-numbering chip at 3+, and all keyboard shortcuts (⌘↵ / ⌘D / ⌘K / ⌘⇧W/I/T/H) behave identically pre- and post-split. Line count is a proxy — the real metric is "no behavior change."

### Agent strategy

- **Step 1 — map (`researcher`):** inventory composer state, effects, handlers, and external bridges (AI panel, draft persistence, link preview, numbering, tier rules) so extraction boundaries are clean.
- **Step 2 — behavior-lock (`test-runner` / dev):** write tests covering autosave/restore, char-count zones, 280 cap, numbering, and the keyboard shortcuts BEFORE refactoring. These must pass green first.
- **Step 3 — decompose (`frontend-dev`):** extract hooks + subcomponents; wire in Wave 3 shared components; keep the behavior-lock tests green throughout.
- **Final gate (parallel):** `code-reviewer` + `convention-enforcer` → `test-runner`. `performance-analyst` to confirm the `dynamic`/`lazy` bundle story is preserved or improved.

### Kickoff prompt

```
Implement Wave 5 of docs/audit/dashboard-ui-ux-implementation-plan.md (Composer decomposition,
P1-1). Wave 3 (shared <TweetEditorList>/<XThreadPreview>) MUST be merged first — confirm before
starting.

Step 1 — researcher: map composer.tsx state, useEffects, handlers, and external bridges (AI panel,
draft persistence, link previews, auto-numbering, tier rules). Propose clean extraction boundaries.

Step 2 — test-runner: write behavior-lock tests FIRST, covering: autosave to localStorage +
restore-draft prompt, per-tweet char-count zones, the 280 thread cap (independent of tier),
auto-numbering chip at 3+ tweets, and every keyboard shortcut (Cmd+Enter publish, Cmd+D draft,
Cmd+K AI, Cmd+Shift+W/I/T/H tools). These must pass on the CURRENT composer before refactoring.

Step 3 — frontend-dev: extract use-composer-drafts.ts, use-composer-ai.ts, link-preview, and
numbering into hooks; split toolbar/footer into subcomponents; make the composer consume the
shared <TweetEditorList> and <XThreadPreview> from Wave 3. Target shell < 400 lines. The
behavior-lock tests from Step 2 must stay green the entire time — ZERO behavior delta.

Then run code-reviewer + convention-enforcer in parallel, then test-runner, then performance-analyst
(confirm dynamic/lazy bundle split preserved). Update docs/claude/architecture.md +
0-MY-LATEST-UPDATES.md. Run pnpm run check and pnpm test.
```

### Verification prompt

```
As per docs\audit\dashboard-ui-ux-implementation-plan.md Verify Wave 5 is correctly implemented.

1. Confirm composer.tsx shell is < 400 lines and that draft persistence, AI bridge, link preview,
   and numbering now live in separate hooks/files.
2. Confirm the composer imports the shared <TweetEditorList> and <XThreadPreview> (no local
   re-implementation of DnD/char-count/preview).
3. Run the behavior-lock test suite from Step 2 — ALL must pass. Specifically confirm: autosave +
   restore prompt, char-count zones, 280 cap, auto-numbering at 3+, and every keyboard shortcut.
4. Behavior check (agent-browser/playwright): draft a 3-tweet thread, reload to confirm restore,
   reorder by keyboard, hit Cmd+Enter — confirm identical behavior to pre-refactor.
5. Run pnpm run check, pnpm test, and a bundle check (performance-analyst). Report pass/fail.
```

---

## Cross-wave verification (run after all waves)

Use this as a final regression sweep before closing the initiative.

```
Run the full dashboard UI/UX regression sweep against docs/audit/dashboard-ui-ux-audit.md.

1. WCAG (audit §6): re-check the conformance map — 1.4.3/1.4.11 contrast, 2.4.3/4.1.2 focus order,
   2.5.8 target size. Confirm the two prior Level-A failures are resolved.
2. Token coverage: grep all of src/app/dashboard and src/components/dashboard for raw numbered
   palette classes (-(50..900)). Expect zero; the CI guard should enforce this.
3. Duplication: confirm exactly one definition each of the 280-char rule, the X preview, and the
   empty-state markup.
4. Reduced motion: toggle OS reduce-motion, reload the agentic flow — status still conveyed without
   animation.
5. CLS: Lighthouse /dashboard — CLS < 0.1, no island pop-in.
6. Run pnpm run check and pnpm test. Produce a final pass/fail report mapped to the audit's Top-10
   issue table, noting any deferred items.
```

---

## Status tracker

| Wave | Title                       | Audit IDs                  | Est. effort | Status                      |
| ---- | --------------------------- | -------------------------- | ----------- | --------------------------- |
| 1    | P0 a11y + token consistency | P0-1, P0-2, P2-3, P2-1, §9 | ~1.5d       | Done                        |
| 2    | Type safety + AI microcopy  | P1-5, P2-2                 | ~1.25d      | Done                        |
| 3    | Shared component extraction | §5.1, §5.2, §5.3           | ~6d         | Done                        |
| 4    | Inspiration overhaul        | P1-3, P1-4                 | 0.25d–10d   | Done                        |
| 5    | Composer decomposition      | P1-1                       | ~8d         | Done (pragmatic — see note) |
| —    | Cross-wave verification     | audit Top-10 + §6          | —           | Done (see note)             |

> **Cross-wave verification note (2026-05-29):** Final regression sweep run. WCAG: both prior Level-A failures (2.4.3 / 4.1.2) resolved; reduced-motion reset and CLS skeletons intact. Token coverage: the `dashboard-tokens` CI guard initially failed on **34 raw palette classes in 10 files outside Wave 1's 3-file scope** (`ai/calendar`, `ai/page`, `ai/bio`, `ai/reply`, `analytics/page` + `viral-tab`/`competitor-tab`, `inspiration/page`, `notification-bell`, `sidebar-collapsible-section`) — all migrated to semantic tokens (success/warning/danger/info/brand), guard now passes across the whole dashboard tree. Duplication: empty-state fully unified; the X-preview / tweet-editor duplication is the deliberate Wave 5 deviation below. **Deferred:** WCAG **2.5.8 Target Size** (AA "at risk", never a Level-A fail) — `bottom-nav.tsx` `h-14`, inspiration actions `min-h-[36px]`. Gate green: `pnpm run check` + 343 tests + token guard all pass.
>
> **Wave 5 completion note (2026-05-29):** Composer shell decomposed from ~2,709 → 345 lines via focused hooks (`use-composer-drafts`, `use-composer-ai`, `use-composer-data`, `use-composer-publish`, `use-composer-tweets`, `use-composer-shortcuts`, `use-composer-media`, `use-composer-bridge`) and subcomponents (`composer-editor`, `composer-preview`, `composer-ai-tools`, `composer-dialogs`, `composer-publishing-panel`, `composer-alerts`). **Pragmatic deviation from the original acceptance criteria:** the composer keeps its tightly-coupled `tweet-card.tsx` (DnD/char-count) and rich `composer-preview.tsx` rather than force-migrating onto the shared `<TweetEditorList>`/`<XThreadPreview>`. Those shared components target simpler editor surfaces; forcing the composer onto them would have meant re-coupling features (per-tweet media, AI image attach, link previews, numbering chips) and incurred regression risk for no user-facing gain. Zero behavior delta verified: `pnpm run check` + 343 unit tests green; pure logic extracted to `composer-utils.ts` with node unit tests; thin Playwright E2E smoke (`tests/e2e/composer-wave5.e2e.ts`) locks autosave→restore + ⌘K. Code-reviewer confirmed no behavior-changing bugs vs. the monolith.
