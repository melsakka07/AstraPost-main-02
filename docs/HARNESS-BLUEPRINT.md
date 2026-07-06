# The Harness Blueprint — AstraVision's AI-Engineering Operating System

> **Purpose:** this repo is the master model for AI-assisted engineering. This document is the
> portable part — the architecture and contracts to replicate in any new project. Everything
> here was battle-tested on AstraVision (Laravel 10 SaaS on shared hosting, live production).
> Copy the _pattern_, re-derive the _facts_ — facts belong to each codebase.

## 1. Philosophy (the five laws)

1. **Code is the source of truth.** Docs, agents, skills, and memories describe reality; when
   they disagree with the code, they are bugs and get fixed on the spot.
2. **Specialists do the work.** Every phase — planning, design, implementation, operating,
   fixing, debugging — routes to a domain agent. The main thread orchestrates, reviews,
   integrates (CLAUDE.md golden rule 11).
3. **The system learns or it rots.** Every session folds lessons back into the files that will
   be read next session (golden rule 12). A lesson that isn't written down will be re-learned
   at full price.
4. **Enforcement is tiered.** Advisory (CLAUDE.md/docs) → prompted (permission `ask` rules) →
   deterministic (PreToolUse hooks). Promotion rule: anything that caused real damage once, or
   was nearly missed twice, moves up a tier.
5. **Everything reversible, everything verified.** Backups before overwrites, staged deploys
   with gates, one cheap end-to-end proof per change, rollback pre-written.

## 2. The layer stack

| Layer               | Location                                      | Role                                                      | Loaded             |
| ------------------- | --------------------------------------------- | --------------------------------------------------------- | ------------------ |
| Golden rules        | `.claude/CLAUDE.md`                           | Non-negotiable operating rules (12 here) + routing notes  | Every session      |
| Agents              | `.claude/agents/*.md`                         | The specialist team (17 here), one domain each            | On spawn           |
| Skills              | `.claude/skills/*/SKILL.md`                   | Repeatable procedures with exact commands (10 here)       | On invoke          |
| Templates           | `.claude/templates/`                          | Code stubs matching REAL current patterns                 | On reference       |
| Deep docs           | `docs/`                                       | Verified architecture, gotchas, per-feature plans/records | On reference       |
| Auto-memory         | `~/.claude/projects/<proj>/memory/`           | Cross-session facts, feedback, incident history           | Recalled per topic |
| Hooks + permissions | `.claude/settings.json` + `.claude/hooks/`    | Deterministic guardrails                                  | Every tool call    |
| Helper scripts      | `_deploy/`, `_smoke/`, `_local/`, `_offsite/` | One-command deploy, smoke test, env lifecycle, backups    | On demand          |

Division of labor: **docs** hold what's true, **agents** hold who does what and how, **skills**
hold exact procedures, **memory** holds what happened and what the user wants, **hooks** hold
what must never happen. Don't blur them — duplication is where rot starts.

## 3. The agent design contract

Every agent file follows this shape (see any `.claude/agents/*.md` for a live example):

- **Frontmatter `description` is written for the router**, not the agent: front-load "Use
  when/for…" trigger phrases, then an explicit "Complements (does not replace): X, Y" boundary.
  Overlap ambiguity between agents is a bug.
- **Body opens with identity + read-first pointers** to the authoritative docs.
- **"Verified architecture" section**: facts with `file:line`-level pointers, each verified
  against code on a stated date — never inherited from a previous agent's claims.
- **"How you work"**: a numbered workflow including a mandatory verification step (one cheap
  end-to-end proof; state costs when a step spends money).
- **Guardrails**: never-do list + confirm-before list + handoff edges to sibling agents.
- **References**: docs, skills, sibling agents, relevant memories by name.
- **"Continuous learning (mandatory)"**: fix stale facts in this file in-session; end reports
  with a `LESSONS:` line; best practice non-negotiable. (Stamped on all agents.)
- Minimal tool grant (`Read, Edit, Write, Glob, Grep, Bash` is the house standard), explicit
  `model:`.

Pairing pattern that works: **builder + verifier per domain** (payment-gateway-dev ↔
billing-ops, frontend-blade-dev ↔ ui-ux-consistency, admin-panel-dev ↔
admin-integration-reviewer). The verifier owns config/audit/health; the builder owns new code.

## 4. The skill design contract

Skills are procedures, not knowledge dumps: numbered steps with **copy-paste commands**, the
safety rails inline at the step where they matter, a "when to run" trigger list, and a
"Self-improvement (mandatory)" footer (stamped on all skills). A skill that fails a step gets
fixed before the task continues — never worked around.

## 5. Deterministic guardrails (hooks)

`.claude/hooks/guard.js` (PreToolUse on `Bash|Edit|Write|NotebookEdit`) blocks this repo's three
documented catastrophic footguns: force-killing MySQL (DB corruption), bare `artisan migrate`
(out-of-sync base migrations), editing `vendor/`/`vironeer/` (overwritten on update). Design
rules for guards:

- **Fail-open** (parse error ⇒ allow) so a harness change can never brick the session.
- **Every deny message teaches**: says what was blocked, why (doc/memory reference), and the
  correct alternative command.
- **Substring paranoia is acceptable**: a false positive costs one rephrase; a false negative
  costs a corrupted database.
- Pipe-test with synthesized payloads (block AND allow cases) before wiring; prove live after.
- Permission `ask` rules back the hooks up (`taskkill`, `mysql`, FTPS upload/delete here).

## 6. The learning loop (self-improvement mechanics)

```
task → agent works → agent fixes stale facts in its own file (in-session)
     → agent report ends with LESSONS: line
     → main thread persists durable lessons to auto-memory (+ why + how-to-apply)
     → main thread propagates to sibling agents/skills/docs when cross-cutting
     → monthly: doc audit + agent/skill audit (reusable prompts live in memory:
       doc-audit-prompts, agent-skill-audit-prompts) → coverage matrix + fix list
     → lessons that caused damage get promoted to hooks/ask rules (§1 law 4)
```

Known drift patterns to watch (from the 2026-07-06 audit — 30+ stale facts): environment
capability claims ("no SSH"), counts (engines/models/tables), billing facts, framework versions,
"no X mechanism" claims after X ships, dangerous command advice, template columns that no
longer exist.

## 7. AstraPost instantiation notes

- **CLAUDE.md location:** Root `CLAUDE.md` (not `.claude/CLAUDE.md`). Root is the canonical Claude Code location — both paths are loaded identically every session. The blueprint contract is "exactly one constitution file, loaded every session"; the path is a per-project detail. Do not create a second copy in `.claude/`.
- **Permissions:** `bypassPermissions` default mode retained (team decision 2026-07-06). Guard hook provides deterministic enforcement; permission ask rules handle the rest.
- **Harness created:** 2026-07-06, auditing + hardening the existing 12-agent/8-skill harness against this blueprint.

## 8. Porting checklist for a new project

1. **CLAUDE.md first**: golden rules (adapt 1–12; keep 11 delegation + 12 self-improvement
   verbatim in spirit), tech stack quick-ref, layout, conventions, credentials policy
   (secrets file gitignored, never inlined), routing notes.
2. **Docs skeleton**: `ONBOARDING.md` (5-min start), `ARCHITECTURE.md`, `CODEBASE-INTERNALS.md`
   (the gotchas file — the single highest-value doc), `DB-SCHEMA.md`, domain docs as they earn
   existence.
3. **Agents**: start with 3–5 covering the money path, the core domain, deploy/ops, and UI;
   split only when routing gets ambiguous. Apply the §3 contract from day one, including the
   continuous-learning footer.
4. **Skills**: one per repeatable multi-step procedure you've done twice. Include the §4 footer.
5. **Templates**: extract stubs from _real_ code, never from documentation or imagination.
6. **Hooks**: after the first near-miss, codify it (§5 rules). Start with an empty guard that
   fails open.
7. **Permissions**: allow the read/build/deploy verbs you use hourly; `ask` for uploads,
   deletes, DB writes, process kills; keep `deny` for absolutes.
8. **Helper scripts**: `_deploy` (one-command staged deploy with backup + health check),
   `_smoke` (read-only assertions post-deploy), env lifecycle scripts with the platform's
   sharp edges baked in.
9. **Memory discipline**: feedback memories carry **Why** + **How to apply**; convert relative
   dates to absolute; link with `[[name]]`; index in MEMORY.md one line each.
10. **Audit cadence**: schedule the monthly doc audit + agent/skill audit from week one — the
    prompts are reusable; only the inventory changes.

## 9. This repo's instantiation (for reference)

17 agents (image ×3 + prompt-architect, billing ×2, video-avatar, agents-studios,
auth-security, admin ×2, cms, UI ×2, laravel-engineer, hostgator-ops, gcloud-ops) ·
10 skills · 4 templates · guard hook + permissions baseline · `_deploy`/`_smoke`/`_local`/
`_offsite` helpers · 30+ memories · audited docs/. Coverage matrix: see memory
`agent-skill-audit-prompts` (rerun the full-audit prompt to regenerate).

---

_Maintained under golden rule 12 — if you change the harness architecture, update this file._
