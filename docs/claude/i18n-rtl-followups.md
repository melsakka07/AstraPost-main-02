# Deferred i18n / RTL Follow-ups — ALL DONE (Wave 7 Task B, 2026-05-30)

Tracked leftovers from the Wave 6 RTL sweep + i18n Phase-2 pass (2026-05-29 → 2026-05-30). **Both items completed in Wave 7 Task B (2026-05-30).** This file is retained for historical reference.

## 1. Admin i18n — hardcoded dropdown/label strings ✅ DONE

Admin components still render hardcoded English option/label strings (internal users, so deprioritized). Wire to `t()` with new keys (en/ar/pseudo), preserving every `value=`:

- `components/admin/billing/{create-promo-dialog,edit-promo-dialog}.tsx` — discount type, plan selects
- `components/admin/notifications/notification-editor.tsx` — audience/segment selects
- `components/admin/subscribers/{add-subscriber-dialog,subscribers-table,bulk-change-plan-dialog}.tsx` — plan/status filters
- `components/admin/roadmap/roadmap-table.tsx` — status/type filter labels
- `components/admin/health/health-dashboard.tsx`, `components/admin/dashboard/admin-dashboard.tsx` — metric labels
- `components/admin/audit/audit-log-table.tsx` — action filter
- `components/admin/date-range-picker.tsx` — range labels
- `components/admin/teams/team-dashboard.tsx` — tab labels

## 2. RTL Phase-2 — physical→logical class swaps for deferred dirs ✅ DONE

Wave 6 Task 1 swept only the Phase-1 dirs (`components/{dashboard,composer,ai,inspiration,onboarding,queue,ui}` + `(marketing)` content). Remaining surfaces with physical-direction classes (`ml-/mr-/pl-/pr-/left-/right-/text-left|right/border-l|r/rounded-l|r`):

- `components/settings/**` (~15 occurrences across profile-form, privacy-settings, team/\*, connected-x-accounts, billing-status, etc.)
- `components/drafts/drafts-client.tsx`
- `components/{analytics,billing,affiliate,community,calendar}/**`
- top-level `components/{command-palette,mobile-menu}.tsx`
- standalone pages `app/{profile,brand,chat}/**`
- `components/admin/**` (incl. Recharts margins that are legitimately physical — exclude those)

Method: same as Wave 6 (logical-property swaps). After swapping, consider extending `scripts/verify-rtl.mjs` `DASHBOARD_DIRS` to cover `components/settings` once clean.

## Intentionally NOT changed (do not "fix")

- `sidebar.tsx` mobile drawer branch — pairs with vaul's physical `direction={sheetSide}` prop.
- `<Play>` video-overlay glyph — media controls don't mirror.
- Recharts `margin={{left,right}}` and SVG/canvas geometry.
- IANA timezone IDs in the profile timezone select — technical identifiers, not localizable text.
- Decorative centered gradient blobs (`left-1/2 -translate-x-1/2`).
