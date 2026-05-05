Two ready-to-paste prompts 

Both are self-contained — paste into a fresh session, no setup required.

---

Prompt 1 — START building (use at kickoff)

  You are implementing the PDF → Thread feature for AstraPost.

  ═══════════════════════════════════════════════════════════════
  PRE-FLIGHT (do this first, in parallel — do not skip)
  ═══════════════════════════════════════════════════════════════

  Read these files in this order. Run the first three in PARALLEL Read calls:

  1. c:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02\CLAUDE.md
  2. c:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02\.claude\rules\agent-orchestration.md
  3. c:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02\docs\features\2026-05-05-pdf-to-thread.md   ← THE PLAN

  After reading the plan, also read on demand as needed:
  - .claude/rules/ai-integration.md, billing.md, security.md, services.md, api-routes.md
  - docs/claude/AI_Endpoints_Models_and_Prompts_Full_Audit_Report.md (for prompt patterns)
  - docs/claude/architecture.md, ai-features.md, schema-consistency.md

  The plan is THE SOURCE OF TRUTH. Do not improvise architecture — every file path, schema column, env var, plan flag, quota weight, and rollout step is specified. If something seems wrong, surface it before changing it; do not silently deviate.

  ═══════════════════════════════════════════════════════════════
  HARD RULES THAT APPLY TO EVERY EDIT (from CLAUDE.md)
  ═══════════════════════════════════════════════════════════════

  - pnpm (never npm). pnpm run check before any task is "done".
  - Use ApiError from @/lib/api/errors — never NextResponse.json() or inline Response/JSON.
  - Multi-table writes use db.transaction(); queue.add() AFTER the transaction commits.
  - AI routes use aiPreamble({...}) — never manual auth/quota/model wiring.
  - Never hardcode model names — env vars only.
  - recordAiUsage() on every AI call.
  - Plan gates via require-plan.ts helpers; never call getPlanLimits() in routes.
  - exactOptionalPropertyTypes spread pattern; no any; no @ts-ignore.
  - Polling useEffect = AbortController + 8s timeout + cleanup abort.
  - logger.* (never console.*); structured fields.
  - Any src/lib/ module touching db.ts: import "server-only" as line 1.
  - UI must be mobile-first, RTL/LTR safe, WCAG-compliant.

  ═══════════════════════════════════════════════════════════════
  EXECUTION STRATEGY — USE SUB-AGENTS AGGRESSIVELY
  ═══════════════════════════════════════════════════════════════

  The plan has 6 phases. Follow the agent strategy in Section 2 of the plan exactly.
  Default heuristic: any phase with 3+ files or independent subtasks → spawn agents.

  Per-phase agent dispatch (single-message parallel calls where independent):

  PHASE 0 — Foundation (sequential, single agent)
    → db-migrator: schema additions (pdfThreadJobs table, types), plan-limits flag
      on all 5 tiers, gate function, input-limits keys, generate + apply migration,
      install pdf-parse + @types/pdf-parse.
    → After: confirm pnpm run check passes before moving on.

  PHASE 1 — Backend ingestion + sync (parallel)
    → backend-dev: build /upload route, /generate route, ai-quota type union
    → ai-specialist: extract src/lib/ai/summarize-prompts.ts, add report variant,
      refactor existing /api/ai/summarize to use the new helper
    Both write to disjoint files — true parallel. Single message, two Agent calls.
    → After both complete: convention-enforcer + security-reviewer in parallel,
      then test-runner.

  PHASE 2 — Backend async (sequential, single agent)
    → backend-dev: queue + payload type, processor, /enqueue route, /[jobId] GET+DELETE,
      register processor in scripts/worker.ts.
    → After: convention-enforcer + security-reviewer (parallel) → test-runner.

  PHASE 3 — Frontend (parallel)
    → frontend-dev: page + 7 sub-components, polling hook, error UX, mobile + RTL
    → i18n-dev: en.json + ar.json keys (mark Arabic as DRAFT — needs human review)
    Both run in parallel. Single message, two Agent calls.
    → After: convention-enforcer (frontend conventions) → test-runner.

  PHASE 4 — Wiring + telemetry (parallel)
    → backend-dev: dashboard hub card update, sidebar nav entry, admin metrics
      surface for the new type
    → frontend-dev: 402 modal wiring, error toast strings, send-to-composer flow
    Single message, two Agent calls.

  PHASE 5 — Final audit (parallel, then sequential)
    Single message: convention-enforcer + security-reviewer (parallel, read-only).
    → Then test-runner sequentially: pnpm lint + typecheck + test.

  PHASE 6 — Documentation (parallel with phase 5)
    → docs-writer: update README.md, AI audit doc, ai-features.md, architecture.md,
      recent-changes.md, 0-MY-LATEST-UPDATES.md (top entry).
    Run IN PARALLEL with Phase 5 audit (same single message as the parallel agents).

  ═══════════════════════════════════════════════════════════════
  TASK TRACKING & CHECKPOINTS
  ═══════════════════════════════════════════════════════════════

  Use TaskCreate at the start to track all 6 phases. Mark in_progress when starting
  each phase, completed when it passes its quality gate. Update phase status
  visibly so the user can see progress.

  After EACH phase:
    1. Run pnpm run check + pnpm test. Failures block the next phase — fix first.
    2. State concisely (1–2 sentences) what was done and what's next.
    3. If anything diverged from the plan, flag it explicitly.

  Definition of Done for the whole feature (per Section 8.3 of the plan):
    ☐ pnpm run check passes (lint + typecheck)
    ☐ pnpm test passes (new + existing)
    ☐ No new any/console.*/NextResponse.json()/hardcoded models
    ☐ Manual E2E walkthrough described to the user (golden path + 1 edge case + RTL)
    ☐ All 16 new files + 14 modified files + 6 doc files in Section 11 checklist exist
    ☐ Convention-enforcer + security-reviewer agents passed

  ═══════════════════════════════════════════════════════════════
  GUARDRAILS
  ═══════════════════════════════════════════════════════════════

  - Do NOT pnpm dev (CLAUDE.md user rule). Ask before any dev-server step.
  - Do NOT commit unless I ask.
  - Do NOT change anything outside the plan's file checklist (Section 11). If a
    file outside that list needs editing, stop and ask.
  - Do NOT touch the Section 14 ("Considered & rejected: vision models") decision.
  - Arabic translations are DRAFT only — flag clearly that a native speaker must
    review before launch. Do not mark i18n complete on machine translation alone.
  - Treat Section 13 ("Out of scope") as a hard fence. No OCR, no DOCX, no video.

  Begin with the pre-flight reads, then use TaskCreate to scaffold phases 0–6,
  then start Phase 0. Confirm Phase 0 is green before touching Phase 1.

  ---
  Prompt 2 — RESUME building (use in any later session)

  You are RESUMING the PDF → Thread feature build for AstraPost. State is unknown to you — the previous session ended at some unknown phase. Discover where things stand before doing any work.

  ═══════════════════════════════════════════════════════════════
  STEP 1 — PRE-FLIGHT READS (parallel, single message)
  ═══════════════════════════════════════════════════════════════

  Read in PARALLEL Read calls:

  1. c:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02\CLAUDE.md
  2. c:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02\.claude\rules\agent-orchestration.md
  3. c:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02\docs\features\2026-05-05-pdf-to-thread.md
  4. c:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02\docs\0-MY-LATEST-UPDATES.md (top 100 lines)

  ═══════════════════════════════════════════════════════════════
  STEP 2 — STATE DISCOVERY (DELEGATE TO AN AGENT)
  ═══════════════════════════════════════════════════════════════

  Spawn a `researcher` agent (read-only, fast) with this brief:

    "Audit progress on the PDF → Thread feature against the file checklist in Section 11 of docs/features/2026-05-05-pdf-to-thread.md. For each of the
     16 new files and 14 modified files, report: EXISTS / PARTIAL / MISSING. For PARTIAL, list what's there vs what's missing per the plan's spec. Also check:
     - Has the migration drizzle/00XX_pdf_thread_jobs.sql been generated?
     - Is pdf-parse in package.json?
     - Does the pdfThreadJobs table exist in src/lib/schema.ts?
     - Does canUsePdfToThread exist in src/lib/plan-limits.ts (all 5 tiers)?
     - Does checkPdfToThreadAccessDetailed exist in require-plan.ts?
     - Are en.json and ar.json keys present?
     - Run: pnpm run check — does it pass on current state?
     Return a phase-by-phase verdict (Phase 0–6: complete / partial / not started) plus the single highest-priority next action. Cite file:line for every claim. Under 800 words, terse."

  DO NOT start coding before the audit returns. Use its output to set TaskCreate state and to brief the user on where things stand.

  ═══════════════════════════════════════════════════════════════
  STEP 3 — RESUMPTION PLAN
  ═══════════════════════════════════════════════════════════════

  Based on the audit:

  A. If any phase is PARTIAL → finish that phase first before advancing. Treat the half-built work as the source of truth; do not redo what's already there unless it's broken.

  B. If pnpm run check fails on current state → diagnose and fix BEFORE writing any new code. Never build on top of a red baseline.

  C. State the resumption plan concisely to the user:
     - Current phase: N (status)
     - Next action: [one specific thing]
     - Estimated remaining phases: [list]
     Wait for user acknowledgment before executing.

  ═══════════════════════════════════════════════════════════════
  STEP 4 — EXECUTION (SAME RULES AS START PROMPT)
  ═══════════════════════════════════════════════════════════════

  Follow the per-phase agent strategy from Section 2 of the plan:

    Phase 0  → db-migrator (sequential)
    Phase 1  → backend-dev + ai-specialist (PARALLEL — single message, two Agent calls)
    Phase 2  → backend-dev (sequential)
    Phase 3  → frontend-dev + i18n-dev (PARALLEL)
    Phase 4  → backend-dev + frontend-dev (PARALLEL)
    Phase 5  → convention-enforcer + security-reviewer (PARALLEL) → test-runner
    Phase 6  → docs-writer (PARALLEL with Phase 5)

  Default heuristic: any task with 3+ files or independent subtasks → spawn agents in parallel via a single message with multiple Agent tool calls. Sequential work only when there are real dependencies (db-migrator before backend-dev that depends on the schema; backend-dev before frontend-dev that consumes its types).

  After EACH phase:
    1. pnpm run check + pnpm test — must pass before next phase.
    2. State concisely what was done + what's next.
    3. Update TaskCreate task status visibly.
    4. Flag any divergence from the plan explicitly.

  ═══════════════════════════════════════════════════════════════
  HARD RULES (from CLAUDE.md — non-negotiable)
  ═══════════════════════════════════════════════════════════════

  - pnpm (never npm). Never run `pnpm dev` — ask first.
  - ApiError from @/lib/api/errors. No NextResponse.json(). No inline Response/JSON.
  - Multi-table writes use db.transaction(). queue.add() AFTER commit.
  - aiPreamble({...}) for AI routes. Never hardcode model names.
  - recordAiUsage() on every AI call.
  - Plan gates via require-plan.ts helpers; never call getPlanLimits() in routes.
  - exactOptionalPropertyTypes spread; no any; no @ts-ignore.
  - Polling useEffect = AbortController + 8s timeout + cleanup abort.
  - logger.*, never console.*.
  - Any src/lib/ module touching db.ts: import "server-only" as line 1.
  - UI = mobile-first, RTL/LTR safe, WCAG.

  ═══════════════════════════════════════════════════════════════
  GUARDRAILS
  ═══════════════════════════════════════════════════════════════

  - The plan in docs/features/2026-05-05-pdf-to-thread.md is the source of truth. Do not improvise architecture. If something looks wrong, surface it before changing it.
  - Do not touch Section 14 (Considered & rejected: vision models). That decision
    is locked.
  - Section 13 (Out of scope) is a hard fence. No OCR, no DOCX, no video, no multi-doc, no auto-publish.
  - Arabic translations stay DRAFT until a native speaker reviews. Don't mark i18n complete on machine translation alone.
  - Do not commit unless asked.
  - Do not edit files outside the plan's Section 11 file checklist without asking first.

  ═══════════════════════════════════════════════════════════════
  START NOW
  ═══════════════════════════════════════════════════════════════

  Begin Step 1 (parallel reads), then Step 2 (researcher agent for audit). Wait for the audit before proposing the resumption plan. Do not write any code before the user acknowledges the resumption plan.

  ---
  Why these prompts work

  Both prompts:
  - Front-load context reads in parallel (Read calls + Agent calls in single messages)
  - Pin every CLAUDE.md hard rule that has caused regressions in this codebase, so the LLM doesn't drift
  - Make the plan document the source of truth, so two sessions always converge to the same architecture
  - Lock out the rejected directions (vision models, OCR, scope creep) explicitly

  The start prompt:
  - Uses TaskCreate from the first turn so progress is visible to you
  - Maps each phase to a specific agent strategy from the plan's Section 2
  - Calls out which phases are parallel vs sequential, with single-message guidance for parallel calls
  - Gates each phase on pnpm run check passing — no building on red

  The resume prompt:
  - Spawns a researcher agent first to discover state — never assumes the previous session left clean state
  - Refuses to build on a failing baseline (forces a green check before any new code)
  - Treats partial work as source of truth — won't blow away half-built phases
  - Asks for acknowledgment before executing — gives you a chance to correct the audit's verdict if it misread state

  Both encourage agent usage by being explicit about the parallel dispatch pattern (single message, multiple Agent tool calls) at every phase boundary, not just generically.

  Save these somewhere stable — docs/features/2026-05-05-pdf-to-thread-PROMPTS.md would be a natural home.

✻ Cooked for 1m 24s