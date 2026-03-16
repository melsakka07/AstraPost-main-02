-- Migration 0028: Remove legacy plaintext refresh_token columns from x_accounts and linkedin_accounts.
--
-- Background (Finding 1.15):
--   Both tables have had a dual-column pattern since migration 0007:
--     - refresh_token        (plaintext, legacy)
--     - refresh_token_enc    (AES-256-GCM encrypted, current)
--
--   All token refresh flows already write NULL to refresh_token and persist only
--   to refresh_token_enc. The x_refresh_token_plaintext_fallback warning was
--   added in Phase 19 (E44) to surface any remaining plaintext rows in production
--   logs before this column is removed.
--
--   Once zero warnings are observed in production logs, apply this migration:
--     pnpm run db:migrate
--
-- Safety:
--   IF EXISTS is used on both DROPs so re-running this migration is idempotent.

ALTER TABLE "x_accounts" DROP COLUMN IF EXISTS "refresh_token";
ALTER TABLE "linkedin_accounts" DROP COLUMN IF EXISTS "refresh_token";
