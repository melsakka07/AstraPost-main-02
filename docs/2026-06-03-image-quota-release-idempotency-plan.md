# Implementation Plan — Image-Quota Release Idempotency + Text-Usage Display Fix

**Date:** 2026-06-03
**Author:** Audit follow-up (post `Subscription_Plans_Pricing_and_Quota_Audit_2026-06-03.md`)
**Status:** ✅ IMPLEMENTED 2026-06-03 (branch `fix/image-quota-release-idempotency`, uncommitted) — see "Execution results" at the bottom.
**Scope:** 2 low-severity billing-correctness hardening items found during the L-1…L-7 verification audit. Neither is a user-facing overcharge; both are correctness/symmetry fixes.

---

## Background

The audit of the AI image-quota + quota-leak fixes passed (all findings resolved, 424 tests green, schema in sync). Two low-severity observations remained:

- **Obs 1 — Status-route failure-path release is not idempotency-guarded.** The success path gates its usage write on the atomic `redis.del() === 1` claim (`src/app/api/ai/image/status/route.ts:303`), but the **timeout**, **terminal-failure**, **no-output**, and **fallback** branches call `redis.del()` and then act (release quota / start a fallback prediction) **without** checking the DEL return value (`:145-147`, `:190`, `:240-242`, `:273-275`). Two concurrent polls of the same terminal prediction could:
  - double-call `releaseImageQuota` (clamped at `GREATEST(0, used - weight)`, so it over-releases → small free allowance, **not** an overcharge), **and**
  - on the fallback branch, **start two fallback predictions** and double-apply the cost-diff release.
    Requires concurrent duplicate polls of a terminal prediction (client polls sequentially every 2 s, so uncommon — but React Strict Mode / retries / multi-tab can trigger it).

- **Obs 2 — `getAiUsageUnits` fallback counts `image_prompt` rows as text usage.** The pre-counter fallback in `src/lib/services/ai-quota-atomic.ts:137-147` filters `ne(type, "image")` but not `"image_prompt"`. The auxiliary prompt-gen LLM call (recorded by `src/app/api/ai/image/route.ts:237`) is never charged against text quota, yet would inflate the **displayed** text usage — only in the fallback window before a fresh `userAiCounters` row exists. Display-only, transient.

### Why fix

Obs 2 is a one-line, zero-risk display-correctness fix. Obs 1 closes the genuinely useful duplicate-fallback-prediction angle and makes every terminal path idempotent and symmetric with the success path. Neither blocks the audit's "ALL FINDINGS RESOLVED" banner.

### Guardrails (from CLAUDE.md / rules)

- `pnpm run check` (lint + typecheck + i18n) and `pnpm test` MUST pass — Definition of Done.
- No new `any` / `@ts-ignore`.
- Use `logger` (already in file), `Response.json()` (not `NextResponse.json()`), `ApiError.*`.
- Test infra is **node-only** (no RTL/jsdom) — behavior-lock via pure-logic Vitest with `vi.hoisted()` mocks (`.claude/rules/testing.md`). See memory `[[feedback_test_infra_node_only]]`.
- No schema change → `pnpm db:generate` must still print "No schema changes, nothing to migrate".

---

## Phase 0 — Branch + baseline (5 min)

1. Branch from `main`: `fix/image-quota-release-idempotency`.
2. Baseline confirm green before touching anything: `pnpm test` (expect 424 pass), `pnpm run check` clean.

**Agent strategy:** None (trivial git + baseline). Do inline.
**Verify:** clean working tree, 424 tests pass.

---

## Phase 1 — Obs 2: exclude `image_prompt` from text-usage fallback (one-liner)

**File:** `src/lib/services/ai-quota-atomic.ts` (`getAiUsageUnits`, ~line 137-147)

**Change:** add a second `ne` to the fallback count query so the auxiliary prompt-gen row is not displayed as text usage (mirrors what enforcement actually charges).

```ts
const [row] = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(aiGenerations)
  .where(
    and(
      eq(aiGenerations.userId, userId),
      ne(aiGenerations.type, "image"),
      ne(aiGenerations.type, "image_prompt"), // aux prompt-gen LLM call is not text-quota charged
      gte(aiGenerations.createdAt, start)
    )
  );
```

**Do NOT** switch to an allowlist (`inArray(type, TEXT_TYPES)`) — more invasive, and creates drift risk each time a new enum value is added. Targeted `ne` matches intent with minimal surface.

`ne` is already imported (`ai-quota-atomic.ts:3`). No new imports.

**Test:** `src/lib/services/__tests__/ai-quota-atomic.test.ts` (create if absent, else extend). Add a case under `getAiUsageUnits`:

- Given **no fresh counter** (findFirst → null or stale `periodStart`), and the count query is asserted to receive a filter excluding both `image` and `image_prompt`. Simplest behavior-lock: stub the `select→from→where` chain to capture the predicate isn't trivial; pragmatically, assert the returned `used` equals the mocked `count` and that the query path is the fallback (counter absent). Mirror the mock pattern in the existing `__tests__/ai-image-quota-atomic.test.ts` (`vi.hoisted`, `vi.clearAllMocks` in `beforeEach`).

> Note: because the filter is built inside the query, the highest-value assertion is at the integration boundary. If a pure-unit assertion on the predicate is awkward with the current mock shape, document the change with the inline comment above and rely on the existing `getMonthlyAiUsage` test path; do not over-engineer the mock.

**Agent strategy:** `backend-dev` (single file + test, `src/lib/services/**`). One agent, no parallelism needed — it's one logical change. Follow with the Phase 4 audit.

**Verify:** `pnpm test` green; `pnpm run check` clean.

---

## Phase 2 — Obs 1: make every terminal branch idempotent via atomic DEL claim

**File:** `src/app/api/ai/image/status/route.ts`

Apply the success path's "claim via atomic DEL" pattern (already used at `:302-303`, `deleted === 1`) to **all** terminal branches. Only the poll that wins the `redis.del()` race acts (releases quota / starts the fallback); the loser returns a neutral keep-polling response.

### 2a — Timeout branch (`:143-162`)

```ts
} else if (Date.now() - meta.firstPolledAt > 90_000) {
  const claimed = (await redis.del(`ai:img:pred:${predictionId}`)) === 1;
  if (claimed && consumed > 0) {
    await releaseImageQuota(meta.userId, consumed).catch(() => void 0);
  }
  logger.warn("image_poll_timeout", { predictionId, elapsedMs: Date.now() - meta.firstPolledAt });
  // ...existing 422 POLL_TIMEOUT response unchanged
}
```

### 2b — Fallback branch (`:186-237`)

Gate the whole del + start + cost-diff-release on the claim. Move the `redis.del` to the top of the `failed/canceled` block as the single claim for the terminal state, and have the loser return keep-polling:

```ts
if ((meta.model === "nano-banana-2" || meta.model === "nano-banana-pro") && !isContentBlocked) {
  const claimed = (await redis.del(`ai:img:pred:${predictionId}`)) === 1;
  if (!claimed) {
    // Another concurrent poll already handled this terminal state — keep polling.
    const res = Response.json({ status: "processing" });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  }
  try {
    const fallback = await startImageGeneration({
      /* ...unchanged... */
    });
    const fallbackWeight = IMAGE_MODEL_COST["nano-banana"];
    if (consumed > fallbackWeight) {
      await releaseImageQuota(meta.userId, consumed - fallbackWeight).catch(() => void 0);
    }
    // ...cache fallbackMeta + return { status: "fallback", ... } unchanged
  } catch (fallbackErr) {
    // NOTE: key already claimed/deleted above. Fall through to the terminal-error
    // response below WITHOUT a second redis.del (it would return 0). Release the
    // full consumed weight here since the fallback failed to start.
    logger.error("image_fallback_prediction_failed", {
      /* ...unchanged... */
    });
    if (consumed > 0) await releaseImageQuota(meta.userId, consumed).catch(() => void 0);
    // build + return the GENERATION_FAILED / transient 422 response (see 2c shape)
  }
}
```

> **Important nuance:** today the non-fallback terminal path (2c) does its own `redis.del` + release at `:240-242`. Once the fallback branch claims the key at the top, the fall-through after a failed fallback-start must **not** `redis.del` again (it would be 0 and skip release). Restructure so the post-fallback-failure error response reuses the same classification (`isTransient`/`isContentBlocked`) but releases inline in the `catch` (as sketched) rather than falling into 2c. Keep the two error-response builders DRY by extracting a small local helper if it reads cleaner — optional.

### 2c — Non-fallback terminal failure (`:239-267`)

This branch is reached when the model is NOT a fallback candidate (e.g. already `nano-banana` / `gpt-image-2`) or `isContentBlocked`. Add the claim guard:

```ts
const claimed = (await redis.del(`ai:img:pred:${predictionId}`)) === 1;
if (claimed && consumed > 0) {
  await releaseImageQuota(meta.userId, consumed).catch(() => void 0);
}
// ...existing isTransient/isContentBlocked classification + 422 response unchanged
```

### 2d — No-output success-but-empty (`:272-277`)

```ts
if (!prediction.output) {
  const claimed = (await redis.del(`ai:img:pred:${predictionId}`)) === 1;
  if (claimed && consumed > 0) {
    await releaseImageQuota(meta.userId, consumed).catch(() => void 0);
  }
  return ApiError.internal("No output returned from prediction");
}
```

### 2e — Success path (`:302-331`)

Already correct (`deleted === 1` gate). **No change** — it is the reference pattern. Confirm the legacy best-effort consume at `:323-324` stays inside the `deleted === 1` block (it does).

**Behavioral invariants after this phase:**

- Each terminal prediction is acted on **exactly once** (release or fallback-start), regardless of concurrent polls.
- The losing concurrent poll returns `{ status: "processing" }` (timeout/fallback) or the existing terminal response — never a second release or second fallback prediction.
- No double cost-diff release; no duplicate fallback predictions.

**Agent strategy:** `backend-dev` owns `src/app/api/ai/image/status/route.ts` (single-writer, no overlap with Phase 1's service file → **Phase 1 and Phase 2 implementation can run in PARALLEL**, different files, no shared writes). This is the trickiest async path — keep the diff focused to the four branches above; do not refactor unrelated logic (CLAUDE.md "surgical changes").

---

## Phase 3 — Concurrency test for the status route

**File (new):** `src/app/api/ai/image/status/__tests__/route.test.ts`

There is currently **no** status-route test (only `src/app/api/ai/image/__tests__/route.test.ts` for POST). Create one mirroring that file's mock setup (`vi.hoisted` env, mock `@/lib/auth`, `@/lib/rate-limiter` `redis`, `@/lib/services/ai-image`, `@/lib/services/ai-image-quota-atomic`, `@/lib/db`, `@/lib/cache`).

**Key mock:** model `redis.del` to return `1` on the first call and `0` on subsequent calls (simulate the atomic claim race):

```ts
const delMock = vi.fn();
delMock.mockResolvedValueOnce(1).mockResolvedValue(0); // first poll wins, rest lose
```

**Test cases:**

1. **Two concurrent terminal-failure polls → release once.** `checkImagePrediction` → `{ status: "failed", error: "..." }`, model `nano-banana` (non-fallback), `consumedWeight: 3`. Fire two `GET`s; assert `releaseImageQuota` called **exactly once** with `(userId, 3)`.
2. **Two concurrent fallback polls → one fallback prediction.** model `nano-banana-pro`, non-content error. Assert `startImageGeneration` called **exactly once**; the loser returns `{ status: "processing" }`.
3. **Fallback cost-diff release.** `consumedWeight: 3`, fallback to nano-banana (weight 1) → `releaseImageQuota(userId, 2)` once; fallback meta cached with `consumedWeight: 1`.
4. **Timeout double-poll → release once** (`firstPolledAt` > 90s).
5. **No-output double-poll → release once.**
6. **Success path unchanged** (regression): `deleted === 1` records usage once; legacy (`consumedWeight === undefined`) best-effort consume fires, modern does not.

**Agent strategy:** `test-runner` to execute, but authoring the new test file is `backend-dev` work (same owner as Phase 2, sequential after 2). Per `.claude/rules/testing.md`: `vi.hoisted()` before `vi.mock()`, `vi.clearAllMocks()` in `beforeEach`, never instantiate real Redis.

**Verify:** new test file passes; total count rises from 424.

---

## Phase 4 — Audit + verification gate (always final, parallel)

Per CLAUDE.md Agent Orchestration: after all code changes, spawn in **parallel**:

- `convention-enforcer` — confirm `Response.json` (not `NextResponse`), `ApiError.*`, `logger.*`, no `any`/`@ts-ignore`, surgical diff, import cleanliness.
- `security-reviewer` — confirm ownership check (`meta.userId !== session.user.id`) untouched, no new injection/secret exposure, release logic cannot be abused to refund-farm (it can't — clamped + claim-gated).

Then **WAIT** → `test-runner`:

```
pnpm run check     # lint + typecheck + i18n — must be clean
pnpm test          # must pass (expect 424 + new status-route cases)
pnpm db:generate   # MUST print "No schema changes, nothing to migrate"
git status --short # only the 3-4 intended files
```

---

## Phase 5 — Docs + memory

1. Update `docs/0-MY-LATEST-UPDATES.md` (prepend latest entry) — note the idempotency hardening + display fix, reference this plan.
2. Update `docs/Subscription_Plans_Pricing_and_Quota_Audit_2026-06-03.md` — mark Obs 1 / Obs 2 as resolved with commit ref.
3. The AI integration rule `.claude/rules/ai-integration.md` "Image Quota" section already documents consume-up-front/release-on-failure; add one line that **all terminal release paths are idempotency-claim-gated** so future edits keep the pattern.
4. No README/architecture change (internal correctness, no API/shape change).

**Agent strategy:** `docs-writer` in parallel with Phase 4's `test-runner` (different files, no overlap).

---

## Agent orchestration summary

| Phase                | Agent(s)                                                      | Parallel?                        | Files (write boundary)                                                                      |
| -------------------- | ------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------- |
| 0 Branch/baseline    | — (inline)                                                    | —                                | git only                                                                                    |
| 1 Obs 2 fix + test   | `backend-dev`                                                 | ‖ with Phase 2 (different files) | `src/lib/services/ai-quota-atomic.ts`, `src/lib/services/__tests__/ai-quota-atomic.test.ts` |
| 2 Obs 1 status route | `backend-dev`                                                 | ‖ with Phase 1                   | `src/app/api/ai/image/status/route.ts`                                                      |
| 3 Status route test  | `backend-dev` → author; `test-runner` → run                   | after Phase 2                    | `src/app/api/ai/image/status/__tests__/route.test.ts` (new)                                 |
| 4 Audit gate         | `convention-enforcer` + `security-reviewer` ‖ → `test-runner` | parallel audit, then test        | read-only                                                                                   |
| 5 Docs               | `docs-writer`                                                 | ‖ with Phase 4                   | docs/\*, `.claude/rules/ai-integration.md`                                                  |

**Critical:** Phases 1 and 2 touch disjoint files (service vs. route) — run their implementation agents in parallel. Phase 3 depends on Phase 2 (same route). Phase 4 is the mandatory final parallel audit → test.

---

## Risk / rollback

- **Risk:** Low. No schema change, no API contract change. Behavior only differs under concurrent duplicate polls of a terminal prediction — previously double-acted, now acts once.
- **Subtle trap (Phase 2b):** after claiming the key at the top of the fallback branch, the fallback-start `catch` must release inline and **not** re-`del` / fall into 2c (which would skip release because DEL returns 0). The plan handles this explicitly — reviewer must confirm.
- **Rollback:** single revert of the `fix/image-quota-release-idempotency` branch; no data migration to unwind.

## Definition of Done

1. `pnpm run check` clean.
2. `pnpm test` green, including ≥5 new status-route concurrency cases.
3. `pnpm db:generate` → "No schema changes, nothing to migrate".
4. `git status --short` shows only the intended files.
5. Obs 1 + Obs 2 marked resolved in the audit doc.

---

## Execution results (2026-06-03)

All phases complete on branch `fix/image-quota-release-idempotency` (not yet committed).

| Phase                          | Outcome                                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 Branch/baseline              | ✅ Branch created; baseline 424 green                                                                                                                             |
| 1 Obs 2 (`ai-quota-atomic.ts`) | ✅ Added `ne(type, "image_prompt")` to `getAiUsageUnits` fallback; +3 tests                                                                                       |
| 2 Obs 1 (`status/route.ts`)    | ✅ Atomic `redis.del() === 1` claim on all 4 terminal branches; extracted `buildTerminalErrorResponse()`; verified 2b cannot fall through to 2c                   |
| 3 Status-route test            | ✅ New `status/__tests__/route.test.ts` — 7 cases (concurrent terminal-failure / fallback / timeout / no-output release-once + cost-diff + success modern/legacy) |
| 4 Audit gate                   | ✅ `convention-enforcer` clean, `security-reviewer` clean (ownership check untouched, no refund-farm, release clamped + claim-gated)                              |
| 5 Docs                         | ✅ `0-MY-LATEST-UPDATES.md`, `.claude/rules/ai-integration.md`, this plan                                                                                         |

### Final gate

| Gate               | Result                                                  |
| ------------------ | ------------------------------------------------------- |
| `pnpm run check`   | ✅ lint 0 errors, typecheck clean, i18n 3511 keys match |
| `pnpm test`        | ✅ 434 passed (42 files) — was 424, +10                 |
| `pnpm db:generate` | ✅ "No schema changes, nothing to migrate"              |

### Files changed

- `src/lib/services/ai-quota-atomic.ts` (1 line + comment)
- `src/app/api/ai/image/status/route.ts` (4 terminal branches + helper)
- `src/lib/services/__tests__/ai-quota-atomic.test.ts` (extended)
- `src/app/api/ai/image/status/__tests__/route.test.ts` (new)
- `docs/0-MY-LATEST-UPDATES.md`, `.claude/rules/ai-integration.md`, this plan

### Deferred / not done

- **Not committed** — awaiting user go-ahead to commit + open PR.
- A subtle edge remains by design: the DEL-race **loser** returns `{ status: "processing" }`, but the key was already deleted by the winner, so the loser's _next_ poll 404s (`Prediction not found or expired`). Harmless under the rare concurrent-duplicate-poll scenario (the real client already got the fallback id from the winner); not worth extra complexity. Noted for awareness.
