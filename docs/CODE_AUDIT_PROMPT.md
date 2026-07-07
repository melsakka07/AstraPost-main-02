Whole-codebase read-only audit of AstraPost. No code changes anywhere — report only.

Fan out parallel read-only agents, one per area, per .claude/rules/agent-orchestration.md.
Each agent audits its area against CLAUDE.md hard rules and the relevant .claude/rules/\*.md
file, and writes its findings to docs/claude/audits/sections/<area>.md before returning.

Areas and agents:

1. api-routes — use the audit-routes skill (all src/app/api/\*\* against the 9-step checklist)
2. services — researcher: src/lib/services/\*\* vs services.md (error handling, server-only,
   silent failures, token handling)
3. queue-worker — researcher: src/lib/queue/\*\* vs queue-worker.md (job options, jobRuns audit
   trail, enqueue-after-commit, error taxonomy)
4. frontend-uiux — code-reviewer: src/components/** + src/app/dashboard/** for WCAG, RTL/Arabic,
   mobile responsiveness, loading/error/empty states, polling AbortController rule
5. i18n — researcher: hardcoded strings, en/ar/pseudo key parity, RTL-unsafe patterns
6. security — security-reviewer: OAuth flows, token encryption, auth gates, secret exposure,
   injection
7. billing — researcher: Stripe webhook, plan gates, quota logic vs billing.md
8. performance — performance-analyst: N+1 queries, missing indexes, re-renders, bundle imports

Shared finding format (mandatory for every agent):
[SEVERITY: blocker|should-fix|nice-to-have] file:line — finding — one-line fix direction
Report ALL blockers; cap should-fixes at 10 per area (highest impact first); max 5 nice-to-haves.

After all agents return: consolidate into docs/claude/audits/2026-07-07-full-codebase-audit.md with
(a) executive summary — total counts by severity, top 5 risks overall,
(b) cross-cutting themes — the same violation appearing in 3+ areas gets one entry with all locations,
(c) per-area sections (deduped),
(d) a proposed fix order: blockers grouped into implementable batches with suggested agent routing.
Do not start any fixes.
