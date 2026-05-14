-- =============================================================================
-- billingCycle Backfill Runbook
-- =============================================================================
-- Run once per environment (dev → preview → prod) after deploying the
-- billing_cycle column migration (0081_blushing_living_lightning.sql).
--
-- SAFETY: Every UPDATE includes WHERE billing_cycle IS NULL, making this
-- idempotent (safe to re-run).
--
-- PREREQUISITES:
--   1. Migration 0081 has been applied (billing_cycle column exists).
--   2. Substitute the parameterized price IDs below with the actual values
--      for the target environment.  Test → Preview → Prod each have
--      DIFFERENT Stripe price IDs.
-- =============================================================================

-- ═════════════════════════════════════════════════════════════════════════════
-- OPERATOR: Substitute these before running
-- ═════════════════════════════════════════════════════════════════════════════

-- $STRIPE_PRICE_ID_PRO_ANNUAL    → env('STRIPE_PRICE_ID_ANNUAL')
-- $STRIPE_PRICE_ID_AGENCY_ANNUAL → env('STRIPE_PRICE_ID_AGENCY_ANNUAL')
-- $STRIPE_PRICE_ID_PRO_MONTHLY   → env('STRIPE_PRICE_ID_MONTHLY')
-- $STRIPE_PRICE_ID_AGENCY_MONTHLY→ env('STRIPE_PRICE_ID_AGENCY_MONTHLY')

-- ═════════════════════════════════════════════════════════════════════════════
-- Step 1: Set annual billingCycle for annual price IDs
-- ═════════════════════════════════════════════════════════════════════════════

UPDATE subscriptions
SET billing_cycle = 'annual'
WHERE billing_cycle IS NULL
  AND stripe_price_id IN (
    '$STRIPE_PRICE_ID_PRO_ANNUAL',
    '$STRIPE_PRICE_ID_AGENCY_ANNUAL'
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- Step 2: Set monthly billingCycle for monthly price IDs
-- ═════════════════════════════════════════════════════════════════════════════

UPDATE subscriptions
SET billing_cycle = 'monthly'
WHERE billing_cycle IS NULL
  AND stripe_price_id IN (
    '$STRIPE_PRICE_ID_PRO_MONTHLY',
    '$STRIPE_PRICE_ID_AGENCY_MONTHLY'
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- Step 3: Verification — confirm no unexpected NULLs remain
-- ═════════════════════════════════════════════════════════════════════════════

SELECT plan, billing_cycle, COUNT(*) AS row_count
FROM subscriptions
GROUP BY 1, 2
ORDER BY 1, 2;

-- Expected output:
--   free            | NULL         | N   ← free plan has no price ID, NULL is OK
--   pro_monthly     | monthly      | N
--   pro_annual      | annual       | N
--   agency          | monthly      | N
--   agency          | annual       | N
--
-- Any pro_monthly/pro_annual/agency rows with billing_cycle = NULL mean the
-- stripe_price_id didn't match a parameterized value — investigate manually.
