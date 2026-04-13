# Roadmap Moderation — Implementation Progress

## Status: ALL PHASES COMPLETE ✅

## Phase 1 — Database & Backend

- **Status:** Completed
- **Files Created:**
  - `src/app/api/admin/roadmap/route.ts` — GET list with filters, pagination, search
  - `src/app/api/admin/roadmap/[id]/route.ts` — PATCH approve/reject
  - `src/app/api/admin/roadmap/[id]/delete/route.ts` — DELETE hard delete
  - `src/app/api/admin/roadmap/bulk/route.ts` — POST bulk approve/reject
- **Files Modified:**
  - `src/lib/schema.ts` — Changed feedbackStatusEnum to ["pending", "approved", "rejected"], added adminNotes and reviewedAt columns to feedback table
  - `src/app/api/feedback/route.ts` — Added rate limiting (max 3 per day), GET now only returns approved items
  - `src/app/api/feedback/[id]/upvote/route.ts` — Added check for approved status before voting
- **Decisions & Notes:**
  - Changed feedback status enum from ["pending", "planned", "in_progress", "completed", "declined"] to ["pending", "approved", "rejected"] for simpler moderation workflow
  - Rate limiting uses database count check (max 3 submissions per user per day)
  - Public GET endpoint now only returns approved items for potential future public roadmap display

## Phase 2 — Frontend: Public Roadmap Page Redesign

- **Status:** Completed
- **Files Created:**
  - `src/components/roadmap/submission-form.tsx` — New submission-only form component
- **Files Modified:**
  - `src/app/(marketing)/roadmap/page.tsx` — Completely redesigned to show only submission form
- **Decisions & Notes:**
  - Removed all feedback items list, voting UI, and category tabs
  - Kept only the submission form with title, description, and category
  - Added post-submission success message with "Submit Another" option
  - Non-authenticated users see a sign-in prompt instead of the form
  - Added empty state message to make page less bare

## Phase 3 — Frontend: Admin Roadmap Management Page

- **Status:** Completed
- **Files Created:**
  - `src/app/admin/roadmap/page.tsx` — Admin roadmap management page
  - `src/components/admin/roadmap/roadmap-table.tsx` — Table component with all functionality
- **Files Modified:**
  - `src/components/admin/sidebar.tsx` — Added "Roadmap" entry to Platform section
- **Decisions & Notes:**
  - Tab filters: Pending (default), Approved, Rejected, All with counts
  - Search by title or description
  - View Details dialog showing full submission info and admin notes
  - Approve action (single-click)
  - Reject action with optional notes dialog
  - Delete action with confirmation dialog
  - Bulk select and bulk approve/reject on Pending tab
  - Pagination controls

## Changelog

| Date       | Phase   | Change                                                                                       |
| ---------- | ------- | -------------------------------------------------------------------------------------------- |
| 2026-03-29 | Phase 1 | Database schema updated: changed feedbackStatusEnum, added adminNotes and reviewedAt columns |
| 2026-03-29 | Phase 1 | Migration generated and applied                                                              |
| 2026-03-29 | Phase 1 | Created admin API routes for roadmap moderation                                              |
| 2026-03-29 | Phase 1 | Updated feedback submission with rate limiting                                               |
| 2026-03-29 | Phase 1 | Updated upvote route to only allow voting on approved items                                  |
| 2026-03-29 | Phase 2 | Created new submission-form.tsx component                                                    |
| 2026-03-29 | Phase 2 | Redesigned public roadmap page to be submission-only                                         |
| 2026-03-29 | Phase 3 | Created admin roadmap page and table component                                               |
| 2026-03-29 | Phase 3 | Added Roadmap entry to admin sidebar                                                         |
| 2026-03-29 | Phase 3 | Implemented bulk select and bulk actions                                                     |
