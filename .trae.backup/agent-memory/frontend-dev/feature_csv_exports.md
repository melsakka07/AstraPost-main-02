---
name: CSV Export Implementation
description: Shared export utilities and components for admin panel table exports
type: project
---

**Completed Phase 3.3:** CSV export functionality added for billing transactions and audit logs.

**Shared Utility:** `src/lib/export.ts`
- `downloadCsv(filename, csvContent)` — creates blob, triggers browser download, cleans up blob URL
- `fetchAndDownloadCsv(url, filename, toastFn)` — handles fetch from API, supports both JSON and plain CSV responses, error handling, and toast feedback

**API Endpoints:**
- `GET /api/admin/billing/transactions/export` — exports all subscriptions as CSV (limit 10k rows)
- `GET /api/admin/audit/export` — exports audit logs with filter support (limit 50k rows)

**CSV Formatting:**
- Helper functions `escapeCSV()` (quoted fields with escaped quotes) and `formatDate()` (ISO strings for dates)
- Headers always on first row, data rows follow

**Components Updated:**
- `src/components/admin/billing/billing-overview.tsx` — Export button in transactions section header
- `src/components/admin/audit/audit-log-table.tsx` — Export button in filter toolbar

**Patterns Used:**
- Button state: `disabled={exporting || data.length === 0}` to prevent duplicate downloads
- Toast feedback: success message with row count, error message on failure
- Loading state: "Exporting…" text in button while fetch is in progress
- Filter params: audit export respects active filters (action, search, fromDate, toDate)

**Why:** Admins need to export admin data for analysis, reporting, and compliance audits
