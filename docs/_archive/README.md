# Documentation Archive

This directory contains historical and superseded documentation from the AstraPost project. Files here represent planning, audits, and feature work that has been completed, archived, or made obsolete by newer approaches.

**For current documentation**, see:

- [CLAUDE.md](../CLAUDE.md) — Project conventions and development rules
- [docs/](../) — Main documentation directory
- [docs/claude/](../claude/) — Reference guides and patterns

Files were archived on **2026-04-13** during Phase C documentation reorganization.

## Contents by Category

### Root Files

- `0-MY-LATEST-UPDATES-OLD.md` — Previous project status document; superseded by [docs/0-MY-LATEST-UPDATES.md](../0-MY-LATEST-UPDATES.md)
- `UPDATES.md` — Legacy update log

### audit/

Code reviews, gap analyses, and implementation plans from April 2026:

- `backend-redundancy-audit.md` — Backend redundancy analysis
- `billing-minor-fixes-2026-04-06.md` — Billing bug fixes sprint
- `billing-pricing-ui-fix-plan-2026-04-06.md` — Pricing UI corrections
- `billing-strip-verifications.md` — Stripe verification simplification
- `content-tools-ux-audit-2026-04-07.md` — Content tools UX review
- `downgrade-cancellation-analysis-2026-04-06.md` — Subscription downgrade flow analysis
- `full-stack-code-review-2026-03-16.md` — Comprehensive code review
- `multi-account-gap-analysis-2026-04-06.md` — Multi-account feature gaps
- `multi-account-implementation-plan-2026-04-06.md` — Multi-account rollout strategy
- `pricing-gap-analysis-2026-04-06.md` — Pricing model gaps
- `pricing-implementation-plan-2026-04-06.md` — Pricing feature implementation

### claude/

Planning documents for admin and UI work:

- `phase-5-admin-ui-polish.md` — Phase 5 admin interface improvements

### features/

Feature implementation progress and planning (Jan–Apr 2026):

- `2026-04-13-existing-feature-improvements.md` — Feature enhancement summary
- `admin-dashboard-progress.md` — Admin dashboard development status
- `ai-cost.md` — AI cost analysis and optimization
- `ai-templates-progress.md` — AI template feature progress
- `ai-voice-profile.md` — AI voice profile feature specification
- `billing-audit-report.md` — Billing feature audit findings
- `billing-implementation-progress.md` — Billing implementation status
- `COMPLETION-SUMMARY-2026-04-13.md` — Feature completion summary
- `mobile-responsiveness-implementation-plan.md` — Mobile design implementation
- `new-ai-features-2026-03-18.md` — New AI features roadmap
- `now-button-best-times.md` — Best times "Now" button feature
- `responsive-design-plan.md` — Responsive design strategy
- `roadmap-moderation-progress.md` — Moderation features roadmap
- `ui-ux-dashboard-improvement-plan.md` — Dashboard UX improvements
- `ui-ux-implementation-plan.md` — UI/UX implementation strategy
- `ux-audit-phase2-implementation-plan.md` — Phase 2 UX audit findings
- `ux-audit-phase4-implementation-plan.md` — Phase 4 UX audit findings
- `x-oauth-only-auth.md` — X OAuth simplification notes
- `x-oauth-only-auth-plan.md` — X OAuth migration plan

### features-basic/

Early feature documentation (archived March 2026):

- `enhancments.md` — Feature enhancement ideas
- `features.md` — Basic feature list
- `new-features.md` — New features roadmap
- `new-features-ai.md` — AI features roadmap
- `new-features-ai-imp.md` — AI features implementation notes
- `new-features-old.md` — Earlier features planning

### logs-and-issues/

Bug fixes and issue resolutions:

- `ai-image-replicate-fix.md` — Replicate API image generation fix
- `navigation-freeze-connection-leak-fix.md` — Browser connection leak fix (AbortController pattern documented)
- `prog.md` — General progress log
- `x-api-media-upload-fix.md` — X API media upload bug resolution

### prompts/

AI prompts used for planning and code generation (archived Apr 2026):

- `admin-page-feature-prompt.md` — Admin page generation prompt
- `Agentic-Posting-Feature-Prompt.md` — Agentic posting feature specification
- `Agentic-Posting-Trends-Discovery-Prompt.md` — Trends discovery prompt
- `Agentic-Posting-UX-Enhancement-Prompt.md` — UX enhancement specification
- `Agentic-Posting-Verification-Prompt.md` — Feature verification prompt
- `ai-powered-templates-prompt.md` — AI templates implementation prompt
- `ai-prompts-catalog.md` — Catalog of AI prompts
- `audit-prompt.md` — General audit prompt template
- `billing-audit-and-implementation-prompt.md` — Billing audit and implementation
- `login-redesign.md` — Login page redesign prompt
- `Prompt_Agentic_Posting_Feature_Specification_UX_Design_Phased_Implementation_Plan.md` — Detailed agentic posting plan
- `prompt-for-compose-page-ux-audit.md` — Compose page UX audit prompt
- `prompt-for-compose-page-ux-audit-recommendation.md` — Compose page UX recommendations
- `roadmap-moderation-prompt.md` — Moderation features prompt
- `starter-prompt.md` — Initial project setup prompt
- `ui-ux-review.md` — UI/UX review prompt
- `X-Dynamic-Character-Limits-AI-Length-Options-Prompt.md` — Character limits feature
- `X-Subscription-Badge-UI-Expansion-Prompt.md` — Subscription badge UI
- `X-Subscription-Tier-Detection-Prompt_with_Testing.md` — Subscription tier detection

### ux-audits/

UX audit findings and redesign work (Apr 2026):

- `compose-page-ux-audit.md` — Compose page UX audit findings
- `compose-page-ux-recommendations.md` — Compose page UX recommendations
- `compose-redsign.md` — Compose page redesign specification
- `compose-redsign-feedback.md` — Redesign feedback and iterations
- `compose-redsign-Implementation.md` — Redesign implementation guide

## Why Files Were Archived

These documents were archived because:

1. **Planning complete** — Features have been implemented or deprioritized
2. **Superseded by new approaches** — Newer documents reflect current strategy
3. **Historical reference** — Useful for understanding why decisions were made
4. **Clutter reduction** — Keeps main docs directory focused on current work

## How to Navigate

If you're looking for:

- **Current project conventions** → See [CLAUDE.md](../CLAUDE.md)
- **Current architecture** → See [docs/claude/architecture.md](../claude/architecture.md)
- **Recent changes** → See [docs/claude/recent-changes.md](../claude/recent-changes.md)
- **How to implement a feature** → See [docs/claude/common-tasks.md](../claude/common-tasks.md)
- **Environment setup** → See [docs/claude/env-vars.md](../claude/env-vars.md)

If you need historical context about a decision or feature:

1. Check if a summary exists in [docs/0-MY-LATEST-UPDATES.md](../0-MY-LATEST-UPDATES.md)
2. Search in this archive by filename or category
3. For bug fixes, see `logs-and-issues/` for context

## Questions?

For current project guidance, ask your team lead or check the active documentation in [docs/](../).
