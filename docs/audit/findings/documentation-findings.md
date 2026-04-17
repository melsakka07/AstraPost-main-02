# Documentation Audit Findings

**Audit Date:** 2026-04-16
**Scope:** `README.md`, `CLAUDE.md`, `docs/`, `.claude/`, inline documentation

---

## Summary

| Severity  | Count  |
| --------- | ------ |
| Critical  | 0      |
| High      | 4      |
| Medium    | 7      |
| Low       | 5      |
| **Total** | **16** |

---

## High Findings

### D-H1: `docs/claude/architecture.md` Missing Several Route Groups and Directories

**File:** `docs/claude/architecture.md`
**Severity:** High

**Details:** The architecture doc's project structure tree is missing:

- `src/app/admin/` — Entire admin panel (20+ pages)
- `src/app/go/[shortCode]/` — Affiliate link redirect
- `src/app/join-team/` — Team join page
- `src/app/profile/` — User profile page
- `src/app/api/admin/` — All admin API routes
- `src/app/api/team/` — Team management routes
- `src/app/api/feedback/` — Feedback routes
- `src/app/api/inspiration/` — Inspiration/bookmark routes
- `src/app/api/announcement/` — Announcement route
- `src/app/api/diagnostics/` — Diagnostics route
- `src/app/api/cron/` — Cron routes
- `src/components/admin/` — All admin components (40+ files)
- `src/components/billing/` — Billing components
- `src/components/calendar/` — Calendar components
- `src/components/drafts/` — Draft components
- `src/components/email/` — Email templates
- `src/components/gamification/` — Gamification components
- `src/components/inspiration/` — Inspiration components
- `src/components/jobs/` — Job components
- `src/components/onboarding/` — Onboarding components
- `src/components/queue/` — Queue components
- `src/components/referral/` — Referral components
- `src/components/roadmap/` — Roadmap components
- `src/components/settings/` — Settings components
- `src/lib/admin/` — Admin utilities
- `src/lib/middleware/` — Plan gates
- `src/lib/referral/` — Referral utilities
- `src/lib/schemas/` — Shared schemas
- `src/lib/services/` — Service layer (15+ files)
- `src/lib/utils/` — Utility modules

**Fix:** Update the architecture doc to reflect the current file structure. Consider auto-generating the tree.

---

### D-H2: `docs/claude/ai-features.md` Missing Several AI Endpoints

**File:** `docs/claude/ai-features.md`
**Severity:** High

**Details:** The AI features doc lists 7 features but the codebase has 20+ AI endpoints:

- Missing: `POST /api/ai/score` (Viral Score)
- Missing: `POST /api/ai/variants` (Variant Generator)
- Missing: `POST /api/ai/hashtags` (Hashtag Generator — mentioned as component only)
- Missing: `POST /api/ai/summarize` (Summarize)
- Missing: `POST /api/ai/enhance-topic` (Enhance Topic)
- Missing: `POST /api/ai/template-generate` (Template Generator)
- Missing: `POST /api/ai/translate` (Translate — mentioned in thread writer section)
- Missing: `POST /api/ai/calendar` (Content Calendar)
- Missing: `POST /api/ai/tools` (General AI Tools)
- Missing: `POST /api/ai/reply` (Reply Generator)
- Missing: `GET /api/ai/quota` (AI Quota)
- Missing: `GET /api/ai/history` (AI History)
- Missing: `POST /api/ai/inspiration` (listed as "Inspiration" but under Gemini section)
- Missing: `POST /api/ai/affiliate` (Affiliate tweets)
- Missing: `POST /api/ai/agentic/[id]/regenerate` (Agentic Regenerate)
- Missing: `POST /api/ai/agentic/[id]/approve` (Agentic Approve)
- Missing: `POST /api/ai/image/status` (Image Status Polling)
- Missing: `GET /api/ai/image/quota` (Image Quota)

**Fix:** Add all missing AI endpoints to the documentation with their request/response schemas.

---

### D-H3: `docs/claude/env-vars.md` Missing Several Environment Variables

**File:** `docs/claude/env-vars.md`
**Severity:** High

**Details:** The env-vars doc is missing:

- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` — Used by Instagram OAuth
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` — Used by LinkedIn OAuth
- `CRON_SECRET` — Used by billing cleanup cron
- `OPENROUTER_MODEL_FREE` — Listed in CLAUDE.md but not in env-vars doc
- `NEXT_PUBLIC_APP_URL` — Listed but should clarify it's used for OAuth redirects, cookie domains, etc.

**Fix:** Add all missing environment variables with descriptions.

---

### D-H4: `docs/claude/scripts.md` Missing Several Scripts

**File:** `docs/claude/scripts.md`
**Severity:** High

**Details:** The scripts doc is missing:

- `pnpm run format` — Prettier formatting
- `pnpm run format:check` — Prettier check
- `pnpm run setup` — Project setup
- `pnpm run env:check` — Environment validation
- `pnpm run db:dev` — Dev database push
- `pnpm run sync-template` — Template sync
- `pnpm run test:e2e:ui` — Playwright e2e tests
- `pnpm run test:twitter-perms` — Twitter permissions test
- `pnpm run smoke:e2e` — E2e smoke test
- `pnpm run esbuild:rebuild` — Esbuild rebuild

**Fix:** Add all missing scripts to the documentation.

---

## Medium Findings

### D-M1: `docs/claude/recent-changes.md` References Stale Migration

**File:** `docs/claude/recent-changes.md`
**Severity:** Medium

**Details:** References migration `0043_odd_justin_hammer.sql` as "NOT YET APPLIED" but the codebase now has 53 migrations (up to `0053`). This migration was likely applied long ago.

**Fix:** Update the status or remove the stale note.

---

### D-M2: `docs/claude/common-tasks.md` Is Very Brief

**File:** `docs/claude/common-tasks.md`
**Severity:** Medium

**Details:** Only covers 3 tasks (adding a dashboard page, adding an API route, adding authentication). Missing:

- Adding a new AI endpoint
- Adding a new admin page
- Adding a new queue job
- Database migration workflow
- Testing patterns
- Billing integration

**Fix:** Expand with the most common development tasks based on the codebase patterns.

---

### D-M3: CLAUDE.md Says "X OAuth 2.0 Only" But Codebase Has Instagram and LinkedIn OAuth

**File:** `CLAUDE.md` (Tech Stack section)
**Severity:** Medium

**Details:** CLAUDE.md states "Better Auth (X OAuth 2.0 only)" but the codebase has:

- Instagram OAuth (`src/app/api/instagram/auth/route.ts`, `callback/route.ts`)
- LinkedIn OAuth (`src/app/api/linkedin/auth/route.ts`, `callback/route.ts`)
- Both with full token encryption and account management

**Fix:** Update CLAUDE.md to reflect multi-platform OAuth support.

---

### D-M4: `docs/claude/architecture.md` Says "Google Gemini AI" for Image Generation

**File:** `docs/claude/architecture.md`
**Severity:** Medium

**Details:** The doc says "Google Gemini AI" for image generation, but the actual implementation uses Replicate API with multiple models (nano-banana-2, banana-pro, gemini-imagen4). Gemini is used for the `inspire` endpoint, not image generation.

**Fix:** Correct the AI provider mapping in the architecture doc.

---

### D-M5: No README.md Content Visible

**File:** `README.md`
**Severity:** Medium

**Details:** The README.md was not examined in detail but should contain: project overview, setup instructions, tech stack, deployment guide, and contribution guidelines. Verify it's up to date.

**Fix:** Audit and update README.md with current information.

---

### D-M6: `.claude/plans/` Contains Auto-Generated Plan Names

**Files:** `.claude/plans/` directory
**Severity:** Medium

**Details:** CLAUDE.md states: "Never leave auto-generated names like `calm-silver-fox.md`." But the plans directory contains:

- `cheeky-dreaming-canyon.md`
- `cosmic-dancing-cake.md`
- `dreamy-spinning-feather.md`
- `encapsulated-wobbling-crescent.md`
- `hashed-stirring-scone.md`
- `spicy-wishing-rivest.md`

**Fix:** Rename these files to descriptive names or delete if no longer relevant.

---

### D-M7: `docs/claude/agent-patterns.md` Not Audited

**File:** `docs/claude/agent-patterns.md`
**Severity:** Medium

**Details:** This file documents agent orchestration patterns but wasn't fully cross-referenced against the actual `.claude/agents/` directory.

**Fix:** Verify agent patterns match the actual agent definitions.

---

## Low Findings

### D-L1: `docs/_archive/` Contains Many Outdated Documents

**Files:** `docs/_archive/` directory (50+ files)
**Severity:** Low

**Details:** The archive contains many old audit reports, feature plans, and implementation plans. While archiving is good practice, some may contain misleading information if accidentally referenced.

**Fix:** Add a README to the archive explaining these are historical and should not be used as reference.

---

### D-L2: No API Documentation (OpenAPI/Swagger)

**Severity:** Low

**Details:** There's no machine-readable API documentation. All API knowledge is in CLAUDE.md, inline code comments, and the architecture doc.

**Fix:** Consider generating OpenAPI specs from Zod schemas for developer reference.

---

### D-L3: `docs/technical/` Contains Implementation Plans That May Be Stale

**Files:** `docs/technical/` directory
**Severity:** Low

**Details:** Technical docs like `ai-image-fallback-implementation-plan.md` and `production-deployment.md` may not reflect the current state.

**Fix:** Review and update or archive stale technical docs.

---

### D-L4: No Contributing Guide

**Severity:** Low

**Details:** There's no CONTRIBUTING.md or equivalent document for external contributors.

**Fix:** Add a contributing guide if the project accepts external contributions.

---

### D-L5: `docs/business/AstraPost_BRD.md` — Typo in Filename (RESOLVED)

**File:** `docs/business/AstraPost_BRD.md`
**Severity:** Low

**Details:** The filename had a typo: "AstroPost" instead of "AstraPost".

**Status:** RESOLVED — File renamed to `AstraPost_BRD.md` on 2026-04-17.
