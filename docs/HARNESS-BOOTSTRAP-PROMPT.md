# Harness Bootstrap Prompt — replicate the AstraVision operating system in a new project

> **How to use (3 steps):**
>
> 1. In the NEW project repo, copy in the two seed files from AstraVision:
>    `docs/HARNESS-BLUEPRINT.md` (the architecture + binding contracts) and
>    `.claude/hooks/guard.js` (the fail-open guard skeleton).
> 2. Open Claude Code in the new repo and paste the entire prompt below.
> 3. Answer the Phase-0 interview honestly — the harness quality is capped by it.
>
> Works for greenfield and brownfield (Phase 0 branches on it). Expect 1–2 sessions.

---

## THE PROMPT (copy everything between the lines)

---

You are setting up the complete AI-engineering harness for this project — the same operating
system proven on my AstraVision repo (Laravel SaaS, live production, 17 agents, 10 skills,
guard hooks, monthly self-audit). Goal: a harness **not weaker than that reference**: a
CLAUDE.md constitution, a specialist agent team, procedure skills, code templates,
deterministic guard hooks + a permissions baseline, bootstrapped memory, and a monthly
self-audit routine. Work through ALL phases below **in order**. Do not skip phases. Do not
invent facts.

SEED FILES: I have copied `docs/HARNESS-BLUEPRINT.md` (architecture + contracts — read it
FIRST, treat its contracts as binding) and `.claude/hooks/guard.js` (fail-open PreToolUse
guard skeleton) into this repo. If either is missing, STOP and ask me for it.

### PHASE 0 — INTERVIEW ME (blocking — ask before you build anything)

1. Greenfield or brownfield? If greenfield: what are we building — product, users, core flows?
2. Tech stack + exact versions; package manager; build, test, and lint commands.
3. Where does it run (prod/staging/local)? How is it deployed? What access exists from this
   machine (SSH? CI/CD? FTP? cloud CLI? none)?
4. Money paths: payments, billing, subscriptions? External APIs with per-call costs?
5. Databases: engines, where they live, how to inspect them SAFELY per environment.
6. Known footguns and past incidents — every "never do X, it broke Y once" you can remember.
   These seed the guard hook, so dig deep.
7. Secrets policy: where credentials live, what is gitignored, what must never be printed.
8. Is there an admin/backoffice surface? i18n/RTL? Any project rule of the form "every new
   feature must also do Y"?
9. Which parts of the code change most often or are most fragile? Where do bugs cluster?
10. Should `.claude/settings.json` be committed (team-shared) or gitignored (personal)?

Ask follow-ups until you can state the project's shape in one confirmed paragraph. Do not
proceed until I confirm it.

### PHASE 1 — RECON (build the fact base; code is the source of truth)

- **Brownfield:** explore the repo systematically — structure, entry points, routes, models/
  schema, services, config, deploy scripts, CI. Produce a **verified fact base** where every
  fact carries a file path. This fact base feeds everything else: never write a doc/agent/skill
  claim that is not in it or in my interview answers.
- **Greenfield:** the interview + any plan documents ARE the fact base. Mark every forward-
  looking claim `PLANNED`, and update it to verified-with-path as code lands.

### PHASE 2 — CLAUDE.md (the constitution)

Create `.claude/CLAUDE.md` with:

- Project one-liner + "read docs/ONBOARDING.md first" pointer.
- **Golden rules** adapted from the blueprint. Keep these invariant in spirit, renumber as
  needed: production/live-data safety (if applicable) · secrets stay out of git · confirm
  destructive/outward-facing actions · always interview me on requirements · always plan before
  coding · it's okay to be wrong, be honest · **docs stay in sync with code** ·
  **agent-first delegation is MANDATORY** (planning, design, implementation, operating, fixing,
  debugging all route to specialist agents; main thread orchestrates, reviews, integrates;
  only trivial single-file lookups stay inline — and say so) · **self-improving system is
  MANDATORY** (agents/skills/CLAUDE.md/docs are living documents; agents end reports with a
  `LESSONS:` line; stale facts get fixed on the spot; monthly audits). Add project-specific
  rules straight from my interview answers (the "every feature must also do Y" class).
- Tech-stack quick-ref, repo layout, conventions, credentials section (pointer only, never
  values), environment/deploy recipes, and the **agent/skill/template inventory + routing
  notes** — updated every single time an agent or skill is added, forever.

### PHASE 3 — DOCS SKELETON

Create: `docs/ONBOARDING.md` (5-minute start-here), `docs/ARCHITECTURE.md`,
`docs/CODEBASE-INTERNALS.md` (the gotchas file — highest-value doc in the system; start it
with everything the interview and recon surfaced), `docs/DB-SCHEMA.md` (brownfield: generated
from the REAL schema), plus one doc per major domain. Every claim traceable to the fact base
with file references. Greenfield versions are thinner and marked `PLANNED` — but the files
must EXIST so the docs-in-sync rule has somewhere to write from day one.

### PHASE 4 — AGENTS (`.claude/agents/*.md`)

Start with 3–6 agents covering: (a) core-domain build work, (b) the money/critical path if one
exists, (c) deploy/ops for THIS project's hosting reality, (d) UI/frontend if user-facing,
(e) the auth/security surface. Split further ONLY when routing between two agents would be
ambiguous. Every agent follows the blueprint §3 contract exactly:

- Frontmatter `description` written for the ROUTER: "Use when/for …" trigger phrases first,
  then an explicit "Complements (does not replace): X, Y" boundary. Minimal tool list.
  Explicit `model:`.
- Body: identity + read-first doc pointers → **"Verified architecture (<today's date>)"**
  section containing ONLY facts from the fact base, with file paths → "How you work" numbered
  workflow including a mandatory cheap end-to-end verification step (state real-money costs
  when a step spends) → Guardrails (never-do / confirm-before / handoff edges to sibling
  agents) → References (docs, skills, siblings) → the verbatim **"Continuous learning
  (mandatory)"** footer from the blueprint.
- Prefer **builder + verifier pairs** for every critical domain.

### PHASE 5 — SKILLS (`.claude/skills/<name>/SKILL.md`)

One skill per repeatable multi-step procedure that exists TODAY (deploy, DB inspection, env
lifecycle, asset build, release checklist…). Numbered steps with copy-paste commands **tested
against this machine and this project** — run each command yourself where safe. Safety rails
inline at the step where they matter. Append the verbatim **"Self-improvement (mandatory)"**
footer. Greenfield: create only what is real today (scaffold/run/test/deploy); add a skill
the second time a procedure is performed, not before.

### PHASE 6 — TEMPLATES (`.claude/templates/`)

Brownfield: extract fill-in stubs from REAL current code for patterns that will repeat —
verify every column/field/signature against the actual schema and classes, never against docs
or imagination (the reference project shipped a phantom DB column this way once). Greenfield:
skip, and record in `templates/README.md` that templates get created from the first real
implementation of each pattern.

### PHASE 7 — SETTINGS + GUARD HOOKS (deterministic enforcement)

- `.claude/settings.json`: permissions **allow**-list for hourly verbs (git, build, test,
  read-only inspection); **ask**-list for uploads, deletes, DB writes, process kills, and
  anything that costs money; **deny** only for absolutes. Wire the PreToolUse hook:
  `node "$CLAUDE_PROJECT_DIR/.claude/hooks/guard.js"` on matcher `Bash|Edit|Write|NotebookEdit`,
  timeout 10.
- Adapt `guard.js`: encode every interview footgun as a block whose deny message **teaches** —
  what was blocked, why (with a doc/memory reference), and the exact correct alternative
  command. Keep it FAIL-OPEN (parse error ⇒ allow). Pipe-test with synthesized payloads for
  every block case AND allow case BEFORE wiring; then prove it fires live once and show me the
  transcript. Record the promotion rule in CLAUDE.md: advisory → ask-rule → hook, promoted
  whenever something causes damage once or is nearly missed twice.
- Honor my Phase-0 answer on committing vs gitignoring settings.json.

### PHASE 8 — MEMORY BOOTSTRAP

Write the initial auto-memories (with proper frontmatter, and Why + How-to-apply for
feedback-type entries): the delegation + self-improvement directive (feedback) · the
deployment/access topology (project) · the secrets-policy pointer (project) · each interview
footgun (project). Index every one with a one-line pointer in MEMORY.md.

### PHASE 9 — MONTHLY SELF-AUDIT ROUTINE

Set up the monthly cloud routine (via /schedule) that audits docs + agents/skills/templates
against the code and opens a fix PR containing: (a) coverage matrix, (b) discrepancies
found → fixed/deferred table, (c) a LESSONS section for me to fold into memory, (d) an
UNVERIFIED list for anything needing live-environment checks the cloud can't do. The routine
prompt must be FULLY SELF-CONTAINED (cloud sessions have no local memory) and must embed this
project's own known drift patterns. **Pre-flight check learned the hard way:** verify the
Claude GitHub App is installed with THIS repo granted (github.com/settings/installations) —
the claude.ai GitHub connector alone yields `github_repo_access_denied`. Trigger one rehearsal
run and confirm it clones successfully.

### PHASE 10 — ACCEPTANCE (prove it's not weaker than the reference)

Deliver a final report: (1) the coverage matrix — agent/skill ↔ code area, with NO critical
area unowned; (2) the routing notes as written into CLAUDE.md; (3) the guard-hook test
transcript; (4) the docs inventory; (5) remaining gaps, ranked, with your recommendation for
each. Then this checklist, all boxes checked before you may declare done:

- [ ] CLAUDE.md golden rules include mandatory delegation + self-improvement
- [ ] Every agent and skill carries its learning footer verbatim
- [ ] Every agent/doc fact is traceable to code or my interview answers (dated)
- [ ] Guard hook pipe-tested AND proven firing live
- [ ] Permissions baseline in place per my Phase-0 answers
- [ ] Memory bootstrapped and indexed in MEMORY.md
- [ ] Monthly routine created AND rehearsed successfully
- [ ] Everything committed in logical chunks (respecting the secrets policy)

WORKING RULES for this entire task: interview before building; verify before writing; **never
copy AstraVision facts into this project — copy only its contracts and structure**; state your
default choices as you make them instead of asking about trivia; and end your final report
with a `LESSONS:` line.

---

_Maintained under golden rule 12. If the blueprint contracts change, update this prompt to match._
