-- =============================================================================
-- Runbook: Clear trial_ends_at for users who were manually moved to a paid plan
-- Date: 2026-05-24
-- Author: eng.m.elsakka@gmail.com
-- =============================================================================
--
-- WHY
-- ---
-- The admin "change plan" endpoint (`PATCH /api/admin/subscribers/[id]`) used
-- to update `user.plan` without also clearing `user.trial_ends_at`. Result:
-- a user moved from free/trial to a paid plan (`pro_monthly`, `pro_annual`,
-- `agency`) keeps a future `trial_ends_at`, and the admin Subscribers table
-- continues to render the "Trial" status badge — because
-- `src/components/admin/subscribers/subscriber-badges.tsx` decides the badge
-- purely from `trialEndsAt > now()`.
--
-- A code fix (commit clearing `trialEndsAt` inside the same transaction on every
-- paid-plan change) prevents NEW occurrences. This runbook backfills any
-- EXISTING inconsistent rows.
--
-- SAFETY
-- ------
-- 1. SELECT-first preview is included below. Run it first, eyeball the count.
-- 2. The UPDATE is idempotent — re-running is a no-op (WHERE filters NULLs out).
-- 3. Wrapped in a transaction so it can be rolled back if the count surprises
--    you.
-- 4. The plan list MUST stay in sync with the paid plans recognised by
--    `src/lib/plan-limits.ts` — free is excluded on purpose (free users in
--    trial are still legitimately on trial).
--
-- HOW TO RUN (production)
-- -----------------------
-- 1. Connect to the prod DB (Neon/Vercel Marketplace) with read+write creds.
-- 2. Run the SELECT block, confirm the affected-row count and a quick spot-check
--    of a few emails.
-- 3. Run the BEGIN ... COMMIT block.
-- 4. Verify in /admin/subscribers — affected users now show "Active".
-- =============================================================================

-- ── Preview: who will be affected? ──────────────────────────────────────────
SELECT id, email, plan, trial_ends_at, updated_at
  FROM "user"
 WHERE plan IN ('pro_monthly', 'pro_annual', 'agency')
   AND trial_ends_at IS NOT NULL;

-- ── Apply ──────────────────────────────────────────────────────────────────
BEGIN;

UPDATE "user"
   SET trial_ends_at = NULL,
       updated_at = now()
 WHERE plan IN ('pro_monthly', 'pro_annual', 'agency')
   AND trial_ends_at IS NOT NULL;

-- Inspect the row count returned by the UPDATE before committing.
-- COMMIT;     -- ← uncomment to apply
-- ROLLBACK;   -- ← uncomment to abort

-- ── Post-verification ──────────────────────────────────────────────────────
-- Expect 0 rows:
SELECT count(*) AS still_inconsistent
  FROM "user"
 WHERE plan IN ('pro_monthly', 'pro_annual', 'agency')
   AND trial_ends_at IS NOT NULL;
