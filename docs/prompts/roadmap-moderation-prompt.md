# AstraPost — Roadmap Moderation & Admin Approval Prompt

> **Purpose:** Use this prompt with an LLM (Claude, etc.) to implement admin moderation for the public roadmap feature. Paste this prompt along with your project's `README.md` and `CLAUDE.md` files.

---

## Context

You are working on **AstraPost**, an AI-powered social media scheduling platform. The project has an existing public roadmap/feedback system with the following known components:

### Existing Roadmap Files (read all of these first)

**API Routes:**
- `src/app/api/feedback/` — Roadmap feedback submission + upvoting endpoints.

**Frontend:**
- `src/app/(marketing)/roadmap/` or similar — Public roadmap page at `/roadmap`.
- `src/components/roadmap/feedback-item.tsx` — Individual roadmap item card component (displays title, description, vote count, category badge, author avatar/name, vote button).
- `src/components/roadmap/feedback-list.tsx` — List component that renders all feedback items.

**Database:**
- `src/lib/schema.ts` — Contains `feedback` table (roadmap items) and `feedback_votes` table (user votes on items).

**Admin:**
- `src/app/admin/` — Existing admin area with its own sidebar (`src/components/admin/`).

### Tech Stack (relevant subset)
- **Framework:** Next.js 16 (App Router), React 19, TypeScript (strict mode)
- **Database:** PostgreSQL 18 + Drizzle ORM
- **Auth:** Better Auth
- **UI:** shadcn/ui + Tailwind CSS 4, dark mode
- **Toasts:** sonner

---

## Problem

The current roadmap page at `/roadmap` has two issues:

1. **Spam risk:** Any authenticated user can submit feedback items and they appear immediately on the public roadmap page. There is no moderation — the page is open to abuse.
2. **No admin control:** There is no way for the admin to review, approve, reject, or delete submitted roadmap items before they become publicly visible.

---

## Objective

Transform the roadmap from an unmoderated public board into a **submission-only page with admin approval**. The public `/roadmap` page becomes a simple submission form. Submitted items are only visible to the admin in a new `/admin/roadmap` management page, where they can be approved, rejected, or deleted.

---

## Requirements

### 1. Database Changes

**Modify the `feedback` table in `src/lib/schema.ts`:**

- Add a `status` column if it doesn't already exist: `status: varchar("status", { length: 20 }).default("pending").notNull()` with values: `"pending"`, `"approved"`, `"rejected"`.
- Add an `adminNotes` column (optional): `adminNotes: text("admin_notes")` — for the admin to leave internal notes on why an item was approved/rejected.
- Add a `reviewedAt` column (optional): `reviewedAt: timestamp("reviewed_at")` — when the admin took action.
- Generate and apply the migration after schema changes.

### 2. Public Roadmap Page (`/roadmap`) — Submission Only

**Completely change the public roadmap page behavior:**

- **Remove the feedback items list entirely.** No submitted items should be visible to any non-admin user. Remove the `feedback-list.tsx` rendering and the vote button UI from this page. The roadmap page should NOT display any feedback items, vote counts, category filters, or user submissions — none of it.
- **Keep only the submission form.** The page should display:
  - A heading: "Product Roadmap" (or similar).
  - A brief description: "Help us build the features you need. Submit your ideas and suggestions below — our development team reviews every submission."
  - The submission form with: title (required), description (required), category select (feature / bug / improvement / integration — reuse existing categories).
  - A **"Submit Feedback"** button.
- **After successful submission:**
  - Clear the form.
  - Show a success toast (sonner): "Thank you for your feedback! Our development team will review your submission."
  - Optionally display a subtle inline confirmation message below the form that persists until the user navigates away.
  - The submitted item is saved to the database with `status: "pending"`.
- **No login required to view the page**, but **login is required to submit.** If a non-authenticated user tries to submit, redirect to login or show a prompt to sign in.
- **Remove all voting UI** from the public page. Votes are no longer publicly relevant since items aren't displayed publicly.

### 3. Admin Roadmap Management Page (`/admin/roadmap`) — New Page

**Create a new admin page for reviewing and managing roadmap submissions:**

- **Route:** `src/app/admin/roadmap/page.tsx`
- **Access:** Admin only (check `role === "admin"` — use the existing `requireAdmin()` helper or the admin auth pattern from other admin pages).
- **Add to admin sidebar:** Add a "Roadmap" entry in the admin sidebar navigation (`src/components/admin/`).

**Page layout:**

- **Tab filters or pill buttons** at the top: "Pending" (default), "Approved", "Rejected", "All". Show the count next to each tab (e.g., "Pending (12)").
- **Submissions table or card list** showing:
  - Title
  - Description (truncated, expandable)
  - Category badge (feature / bug / improvement / integration)
  - Submitted by (user name + avatar)
  - Submitted date
  - Status badge (pending: yellow, approved: green, rejected: red)
  - Action buttons
- **Sort by:** submission date (newest first by default).
- **Search:** Optional search by title or description.

**Actions per item:**

- **Approve** — Changes status to `"approved"`, sets `reviewedAt` to now. Show a success toast: "Feedback approved."
- **Reject** — Opens a small confirmation dialog. Optional: allow admin to enter a reason (stored in `adminNotes`). Changes status to `"rejected"`, sets `reviewedAt`. Show a toast: "Feedback rejected."
- **Delete** — Hard delete with confirmation dialog: "Are you sure you want to permanently delete this submission? This cannot be undone." Show a toast: "Feedback deleted."
- **View full details** — Expand the item inline or open a detail panel showing the full description, admin notes, and submission metadata.

**Bulk actions (optional but recommended):**
- Select multiple items with checkboxes.
- "Approve Selected" and "Reject Selected" bulk action buttons.
- Only available on the Pending tab.

### 4. Admin Roadmap API Routes

**Create under `src/app/api/admin/roadmap/`:**

- `GET /api/admin/roadmap` — List all roadmap submissions with filter by status, pagination, and optional search. Admin only.
  - Query params: `status` (pending | approved | rejected | all), `page`, `limit`, `search`.
  - Returns: items array with user info (name, avatar), plus total counts per status for the tab badges.

- `PATCH /api/admin/roadmap/[id]` — Update a submission's status. Admin only.
  - Body: `{ status: "approved" | "rejected", adminNotes?: string }`
  - Sets `reviewedAt` to current timestamp.
  - Validates with Zod.

- `DELETE /api/admin/roadmap/[id]` — Hard delete a submission. Admin only.

- `POST /api/admin/roadmap/bulk` — Bulk status update. Admin only.
  - Body: `{ ids: string[], status: "approved" | "rejected" }`

**All admin routes must:**
- Verify `role === "admin"` from the session.
- Use `ApiError` from `@/lib/api/errors` for error responses.
- Use Zod for input validation.

### 5. Modify the Existing Feedback Submission API

**Update the existing `POST` endpoint in `src/app/api/feedback/`:**

- Ensure that when a user submits feedback, the `status` is explicitly set to `"pending"`.
- If there's any logic that returns feedback items to the public (a `GET` endpoint), either remove it or filter to only return `status: "approved"` items. However, based on the new requirements, the public page doesn't list items at all, so the public GET endpoint can be removed or kept but restricted.
- Rate-limit submissions to prevent spam: max 3 submissions per user per day. Use the existing rate limiter from `src/lib/rate-limiter.ts` or a simple DB count check.

### 6. Optional: Admin Notification on New Submission

- When a user submits a new roadmap item, optionally send an in-app notification to the admin using the existing notification service (`src/lib/services/notifications.ts`).
- This is a nice-to-have, not a requirement.

---

## Technical Constraints & Conventions

Follow all project conventions from `CLAUDE.md`:

1. **API errors:** Use `ApiError` from `@/lib/api/errors`.
2. **Validation:** Zod schemas for all API input.
3. **Admin auth:** Verify `role === "admin"` on all admin routes.
4. **Page wrapper:** Use the admin page wrapper pattern consistent with other admin pages.
5. **Sidebar:** Add the new admin page to the admin sidebar — no orphaned pages.
6. **Server Components by default.** `"use client"` only for interactive parts (the admin table with filters, the submission form).
7. **Styling:** shadcn/ui + Tailwind CSS. Support dark mode.
8. **Toasts:** sonner for success/error feedback.
9. **Database migrations:** Run `pnpm run db:generate && pnpm run db:migrate` after schema changes.
10. **Testing:** Run `pnpm lint && pnpm typecheck` after every batch of changes.

---

## Implementation Phases

### Phase 1 — Database & Backend

**Goal:** Schema changes, admin API routes, and submission API hardening.

Tasks:
1. Read all existing roadmap/feedback files: schema table, API routes, frontend components. Document what exists.
2. Add `status`, `adminNotes`, and `reviewedAt` columns to the `feedback` table.
3. Generate and apply the database migration.
4. Update the existing feedback submission endpoint to set `status: "pending"` and add rate limiting (max 3 per user per day).
5. Build the admin API routes: list with filters (`GET`), update status (`PATCH`), delete (`DELETE`), bulk update (`POST`).
6. Remove or restrict any public GET endpoint that returns raw feedback items to non-admin users.
7. Run `pnpm lint && pnpm typecheck`.
8. Create the progress tracking document.

### Phase 2 — Frontend: Public Roadmap Page Redesign

**Goal:** Strip the public roadmap page down to submission-only.

Tasks:
1. Remove the feedback items list, vote buttons, and all item display UI from the public `/roadmap` page.
2. Keep and clean up the submission form (title, description, category).
3. Add the post-submission success message/toast: "Thank you for your feedback! Our development team will review your submission."
4. Ensure the form requires authentication to submit (redirect or prompt if not logged in).
5. Add a subtle empty-state message on the page so it doesn't feel bare: something like "We're always looking for ways to improve. Tell us what you'd like to see next."
6. Run `pnpm lint && pnpm typecheck`.
7. Update the progress document.

### Phase 3 — Frontend: Admin Roadmap Management Page

**Goal:** Build the admin review/approval interface.

Tasks:
1. Create `src/app/admin/roadmap/page.tsx` with admin auth protection.
2. Build the tab filters (Pending / Approved / Rejected / All) with item counts.
3. Build the submissions table/card list with all columns (title, description, category, author, date, status, actions).
4. Implement Approve, Reject (with optional notes dialog), and Delete actions.
5. Implement bulk select and bulk approve/reject (optional).
6. Add "Roadmap" entry to the admin sidebar.
7. Run `pnpm lint && pnpm typecheck`.
8. Update the progress document with final status.

---

## Progress Tracking

Create `docs/features/roadmap-moderation-progress.md` at the start:

```markdown
# Roadmap Moderation — Implementation Progress

## Status: In Progress

## Phase 1 — Database & Backend
- **Status:** Not Started
- **Files Created:**
- **Files Modified:**
- **Decisions & Notes:**

## Phase 2 — Frontend: Public Roadmap Page Redesign
- **Status:** Not Started
- **Files Created:**
- **Files Modified:**
- **Decisions & Notes:**

## Phase 3 — Frontend: Admin Roadmap Management Page
- **Status:** Not Started
- **Files Created:**
- **Files Modified:**
- **Decisions & Notes:**

## Changelog
| Date | Phase | Change |
|------|-------|--------|
```

---

## What NOT To Do

- **Do not keep any submitted items visible on the public `/roadmap` page.** The public page is submission-only. No items, no votes, no lists.
- **Do not remove the `feedback` and `feedback_votes` tables.** They stay — just add the `status` column and modify how data is displayed.
- **Do not build a public-facing "approved roadmap" view.** This may come later, but is not part of this scope. The admin page is the only place items are listed.
- **Do not send the rejection reason to the user.** The `adminNotes` field is internal — for admin reference only.
- **Do not allow unauthenticated submissions.** Require login to submit feedback.
- **Do not over-engineer moderation.** Simple approve/reject/delete is enough. No moderation queues, no auto-moderation AI, no multi-admin review workflows.

---

## Deliverables Checklist

- [ ] `status`, `adminNotes`, `reviewedAt` columns added to `feedback` table
- [ ] Database migration generated and applied
- [ ] Feedback submission sets `status: "pending"` by default
- [ ] Rate limiting on submissions (max 3 per user per day)
- [ ] Public `/roadmap` page: submission form only, no item list, no vote UI
- [ ] Post-submission success toast with thank-you message
- [ ] `GET /api/admin/roadmap` — admin list with status filter, pagination, search
- [ ] `PATCH /api/admin/roadmap/[id]` — approve/reject with optional notes
- [ ] `DELETE /api/admin/roadmap/[id]` — hard delete with confirmation
- [ ] `POST /api/admin/roadmap/bulk` — bulk approve/reject
- [ ] Admin roadmap page at `/admin/roadmap` with tab filters and action buttons
- [ ] Admin sidebar updated with Roadmap entry
- [ ] All admin routes check `role === "admin"`
- [ ] All API routes use `ApiError` and Zod validation
- [ ] Dark mode support on all new/modified UI
- [ ] Progress document fully updated
- [ ] `pnpm lint && pnpm typecheck` passes cleanly
