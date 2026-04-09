# AstraPost Pricing Audit — Implementation Plan

**Date:** 2026-04-06
**Prerequisite:** [Pricing Gap Analysis](./pricing-gap-analysis-2026-04-06.md)
**Goal:** Close all gaps between the pricing page and backend enforcement, fix the trial system, and update the UI to accurately reflect the product's value.

---

## Table of Contents

1. [Phase 1: Trial System Fix (Backend)](#phase-1-trial-system-fix-backend)
2. [Phase 2: Remove Over-promises (UI)](#phase-2-remove-over-promises-ui)
3. [Phase 3: Pricing Page Overhaul (UI/UX)](#phase-3-pricing-page-overhaul-uiux)
4. [Phase 4: Post-Trial Free Tier Alignment (Backend)](#phase-4-post-trial-free-tier-alignment-backend)
5. [Phase 5: Testing & Verification](#phase-5-testing--verification)
6. [Phase 6: Documentation Updates](#phase-6-documentation-updates)
7. [Agent Orchestration Guide](#agent-orchestration-guide)

---

## Phase 1: Trial System Fix (Backend)

**Priority:** P0 — Critical
**Risk:** Without this fix, trial users have unlimited Agency-tier access for 14 days with zero cost controls.

### Problem

Every gate function in `src/lib/middleware/require-plan.ts` does:

```typescript
if (context.isTrialActive) return { allowed: true };
```

This blanket bypass skips ALL quota counting and feature gating, giving trial users unlimited access to every feature including Agency-only ones (LinkedIn, teams, unlimited AI).

### Solution

Replace the blanket trial bypass with **Pro-tier resolution**. During trial, resolve the user's effective plan as `"pro_monthly"` instead of bypassing checks entirely.

### Files to Modify

| File                                 | Change                                            |
| ------------------------------------ | ------------------------------------------------- |
| `src/lib/middleware/require-plan.ts` | Core trial logic change                           |
| `src/lib/plan-limits.ts`             | Add `TRIAL_PLAN` constant (optional, for clarity) |

### Implementation Steps

#### Step 1.1: Add trial plan resolution helper

In `src/lib/plan-limits.ts`, add a constant to make the trial tier explicit:

```typescript
/** During the 14-day free trial, users get Pro Monthly limits */
export const TRIAL_EFFECTIVE_PLAN: PlanType = "pro_monthly";
```

#### Step 1.2: Modify `getPlanContext` in `require-plan.ts`

Update the return type and logic so that when a trial is active, the `effectivePlan` resolves to `"pro_monthly"`:

```typescript
// Current PlanContext interface — add effectivePlan field:
interface PlanContext {
  plan: PlanType; // actual DB plan (always "free" for trial users)
  effectivePlan: PlanType; // plan used for limit resolution ("pro_monthly" during trial)
  trialEndsAt: Date | null;
  isTrialActive: boolean;
}
```

In the `getPlanContext` function body, after computing `isTrialActive`:

```typescript
const effectivePlan = isTrialActive ? TRIAL_EFFECTIVE_PLAN : plan;
return { plan, effectivePlan, trialEndsAt, isTrialActive };
```

#### Step 1.3: Update `makeFeatureGate` factory

Replace the blanket bypass:

```typescript
// BEFORE (blanket bypass):
if (context.isTrialActive) return { allowed: true };
const limits = getPlanLimits(context.plan);

// AFTER (Pro-tier resolution):
const limits = getPlanLimits(context.effectivePlan);
```

Remove every `if (context.isTrialActive) return { allowed: true };` line from `makeFeatureGate`. The `effectivePlan` already resolves to `"pro_monthly"` which has the correct boolean flags.

#### Step 1.4: Update all custom quota gates

Apply the same pattern to every custom gate function. Each one currently has:

```typescript
if (context.isTrialActive) return { allowed: true };
```

Replace with using `context.effectivePlan` for limit lookups:

| Gate Function                       | Line to Remove                                         | Change `getPlanLimits(context.plan)` to |
| ----------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| `checkAccountLimitDetailed`         | `if (context.isTrialActive) return { allowed: true };` | `getPlanLimits(context.effectivePlan)`  |
| `checkPostLimitDetailed`            | Same                                                   | Same                                    |
| `checkAiLimitDetailed`              | Same                                                   | Same                                    |
| `checkAiQuotaDetailed`              | Same                                                   | Same                                    |
| `checkBookmarkLimitDetailed`        | Same                                                   | Same                                    |
| `checkAnalyticsExportLimitDetailed` | Same                                                   | Same                                    |
| `checkAiImageQuotaDetailed`         | Same                                                   | Same                                    |
| `checkImageModelAccessDetailed`     | Same                                                   | Same                                    |

**Pattern for each function:**

1. Delete the `if (context.isTrialActive) return { allowed: true };` line
2. Change `getPlanLimits(context.plan)` → `getPlanLimits(context.effectivePlan)`
3. No other changes needed — the Pro limits will naturally flow through

#### Step 1.5: Update `buildPlanLimitPayload`

Ensure the 402 response payload includes `trial_active: true` so the frontend can show "Your trial includes Pro features" messaging instead of a generic upgrade prompt. This is already done (`trialActive: context.isTrialActive`), so just verify it's still present after refactor.

#### Step 1.6: Verify Agency-only features are blocked during trial

After this change, trial users will be governed by `pro_monthly` limits. Confirm these features correctly resolve to `false` under Pro:

| Feature           | `pro_monthly` value                   | Expected trial behavior |
| ----------------- | ------------------------------------- | ----------------------- |
| `canUseLinkedin`  | `false`                               | Blocked ✓               |
| `maxTeamMembers`  | `null`                                | Blocked ✓               |
| `analyticsExport` | `"csv_pdf"` (not `"white_label_pdf"`) | CSV/PDF only ✓          |

These are correct — no additional changes needed.

### Expected Behavior After Phase 1

| Resource               | Free (no trial) | Free (trial active) | Pro (paid) | Agency (paid) |
| ---------------------- | --------------- | ------------------- | ---------- | ------------- |
| Posts/month            | 20              | **Unlimited** (Pro) | Unlimited  | Unlimited     |
| AI text/month          | 20              | **100** (Pro)       | 100        | Unlimited     |
| AI images/month        | 10              | **50** (Pro)        | 50         | Unlimited     |
| X accounts             | 1               | **3** (Pro)         | 3          | 10            |
| Bookmarks              | 5               | **Unlimited** (Pro) | Unlimited  | Unlimited     |
| LinkedIn               | No              | **No** (Pro = no)   | No         | Yes           |
| Teams                  | No              | **No** (Pro = no)   | No         | 5 members     |
| Agentic Posting        | No              | **Yes** (Pro)       | Yes        | Yes           |
| Viral Score            | No              | **Yes** (Pro)       | Yes        | Yes           |
| All other Pro features | No              | **Yes** (Pro)       | Yes        | Yes           |

---

## Phase 2: Remove Over-promises (UI)

**Priority:** P0 — Critical
**Risk:** Listing unimplemented features (Instagram) erodes user trust and could be considered misleading advertising.

### Files to Modify

| File                                       | Change                                |
| ------------------------------------------ | ------------------------------------- |
| `src/components/billing/pricing-table.tsx` | Remove Instagram from Agency features |
| `src/app/(marketing)/pricing/page.tsx`     | Fix core features section             |

### Implementation Steps

#### Step 2.1: Remove Instagram from Agency plan features

In `src/components/billing/pricing-table.tsx`, change the Agency features array in both `MONTHLY_PLANS` and `ANNUAL_PLANS`:

```typescript
// BEFORE:
features: [
  "Everything in Pro",
  "10 Connected Accounts",
  "Team Members (up to 5)",
  "LinkedIn & Instagram",
  "White-label Reports",
];

// AFTER:
features: [
  "Everything in Pro",
  "10 X Accounts",
  "Team Members (up to 5)",
  "LinkedIn Integration",
  "White-label Reports",
];
```

Changes:

- `"LinkedIn & Instagram"` → `"LinkedIn Integration"` (Instagram not implemented)
- `"10 Connected Accounts"` → `"10 X Accounts"` (clarify platform)

#### Step 2.2: Fix core features section in pricing page

In `src/app/(marketing)/pricing/page.tsx`, update the 6 core features (lines ~62-98):

| Current                                             | Replace With                                                                                       |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| "Multi-platform Support" / "X, LinkedIn, Instagram" | "X (Twitter) Scheduling" / "Post and schedule across X. LinkedIn available on Agency plan."        |
| "Smart Scheduling with drag-and-drop calendar"      | "Smart Scheduling" / "Schedule posts with timezone support. AI Content Calendar available on Pro." |
| "Team Collaboration" / "(Agency plan)"              | Keep as-is (correctly scoped)                                                                      |
| "Priority Support" / "for all plans"                | "Community & Email Support" / "Documentation and email support for all users."                     |

#### Step 2.3: Fix annual savings label

In `src/components/billing/pricing-table.tsx`, line ~152:

```typescript
// BEFORE:
Annual <span className="text-xs text-primary ml-1">(Save ~20%)</span>

// AFTER:
Annual <span className="text-xs text-primary ml-1">(Save 17%)</span>
```

---

## Phase 3: Pricing Page Overhaul (UI/UX)

**Priority:** P1 — High
**Goal:** Surface the 17+ hidden features so the pricing page accurately represents the product's value.

### Files to Modify

| File                                       | Change                                                       |
| ------------------------------------------ | ------------------------------------------------------------ |
| `src/components/billing/pricing-table.tsx` | Expanded feature lists for all 3 plans                       |
| `src/components/billing/pricing-card.tsx`  | May need UI adjustments for longer feature lists             |
| `src/app/(marketing)/pricing/page.tsx`     | Add trial banner, update core features, add comparison table |

### Implementation Steps

#### Step 3.1: Update Free plan features

```typescript
// BEFORE:
features: ["10 Posts per month", "1 Connected Account", "Basic Analytics"];

// AFTER:
features: [
  "20 Posts per month",
  "1 X Account",
  "20 AI Text Generations/month",
  "10 AI Image Generations/month",
  "7-day Analytics",
  "Tweet Inspiration & Import",
  "14-day Pro Trial Included",
];
```

**Decision required from user:** The pricing page says 10 posts/month but the code allows 20. This plan uses 20 (matching code). If you prefer 10, update `plan-limits.ts` line 37 instead.

#### Step 3.2: Update Pro plan features

```typescript
// BEFORE:
features: [
  "Unlimited Posts",
  "3 Connected Accounts",
  "Advanced Analytics",
  "AI Writer (100 credits)",
  "Thread Scheduling",
];

// AFTER:
features: [
  "Unlimited Posts",
  "3 X Accounts",
  "100 AI Text Generations/month",
  "50 AI Image Generations/month",
  "Thread Scheduling",
  "AI Agentic Posting",
  "A/B Variant Generator",
  "Viral Score & Best Times",
  "Competitor Analyzer",
  "Content Calendar & URL-to-Thread",
  "Reply Generator & Bio Optimizer",
  "Voice Profile",
  "Video & GIF Uploads",
  "90-day Analytics + CSV/PDF Export",
  "Unlimited Bookmarks",
];
```

#### Step 3.3: Update Agency plan features

```typescript
// BEFORE:
features: [
  "Everything in Pro",
  "10 Connected Accounts",
  "Team Members (up to 5)",
  "LinkedIn & Instagram",
  "White-label Reports",
];

// AFTER:
features: [
  "Everything in Pro",
  "10 X Accounts",
  "Unlimited AI Generations",
  "Team Collaboration (up to 5)",
  "LinkedIn Integration",
  "1-year Analytics History",
  "White-label PDF Reports",
];
```

#### Step 3.4: Add 14-day trial banner to pricing page

In `src/app/(marketing)/pricing/page.tsx`, add a prominent banner above the pricing table:

```tsx
<div className="border-primary/20 bg-primary/5 mx-auto mb-8 max-w-2xl rounded-lg border p-4 text-center">
  <p className="text-primary text-sm font-medium">
    🎉 Start your 14-day free trial — access all Pro features, no credit card required.
  </p>
</div>
```

#### Step 3.5: Update PricingCard for longer feature lists (if needed)

If the expanded feature lists cause layout issues in `pricing-card.tsx`, consider:

- Adding a scrollable area for features beyond a threshold (e.g., 8 items)
- OR grouping features with subtle category headers
- OR showing top 6-8 features with an expandable "See all features" link

Review the card visually after updating feature arrays. If the 3-column grid still looks balanced, no card changes are needed.

#### Step 3.6: Add feature comparison table (P3 — optional)

Below the pricing cards, add a full comparison table showing all features across all tiers. This is standard practice (see Buffer, Hootsuite pricing pages). Use a responsive table component:

| Feature              | Free  | Pro       | Agency    |
| -------------------- | ----- | --------- | --------- |
| Posts/month          | 20    | Unlimited | Unlimited |
| X Accounts           | 1     | 3         | 10        |
| AI Text Generations  | 20/mo | 100/mo    | Unlimited |
| AI Image Generations | 10/mo | 50/mo     | Unlimited |
| Thread Scheduling    | —     | ✓         | ✓         |
| Agentic Posting      | —     | ✓         | ✓         |
| ... (all features)   |       |           |           |

This can be a new component: `src/components/billing/pricing-comparison-table.tsx`.

---

## Phase 4: Post-Trial Free Tier Alignment (Backend)

**Priority:** P1 — High
**Goal:** Ensure post-trial Free users are properly restricted and see clear upgrade prompts.

### Files to Modify

| File                                 | Change                                     |
| ------------------------------------ | ------------------------------------------ |
| `src/lib/middleware/require-plan.ts` | Already handled by Phase 1 (effectivePlan) |
| Frontend components with plan checks | Ensure UI shows trial status and expiry    |

### Implementation Steps

#### Step 4.1: Verify post-trial behavior

After Phase 1, when `isTrialActive` is `false` for a Free user, `effectivePlan` resolves to `"free"`. All gates will enforce Free limits:

- Posts: 20/month
- AI text: 20/month
- AI images: 10/month
- X accounts: 1
- All Pro features: blocked with 402

**No additional backend changes needed** — Phase 1 handles this automatically.

#### Step 4.2: Trial expiry UI hints

Ensure the dashboard shows trial status. Check if there's already a trial banner component. If not, add one in the dashboard layout or sidebar:

- **During trial:** "Pro Trial — X days remaining. [Upgrade to keep Pro features →]"
- **After trial expired:** "Your Pro trial has ended. [Upgrade to Pro →]" (shown once or until dismissed)

**File to check/modify:** `src/components/dashboard/sidebar.tsx` or `src/app/dashboard/layout.tsx`

#### Step 4.3: Graceful downgrade handling

When trial expires and a user has resources exceeding Free limits (e.g., 3 X accounts connected during trial but Free allows only 1):

- **Do NOT auto-disconnect accounts.** Let existing connections remain active but prevent adding new ones.
- **Do NOT delete bookmarks** beyond the 5 limit. Let existing ones remain but prevent new additions.
- Posts already scheduled during trial should still publish — don't cancel them.

**This is the current behavior** (gates only check on new actions, not retroactively). Verify this is the case by reading the gate functions — they check `used + increment > limit`, which only blocks new additions.

---

## Phase 5: Testing & Verification

**Priority:** P0 — Must complete before merge

### 5.1: Unit Tests for Trial System

**File:** `src/lib/middleware/require-plan.test.ts` (update existing tests)

Add test cases for the new trial behavior:

```
Test Suite: Trial System
  ✓ trial user gets Pro feature access (e.g., canUseAgenticPosting)
  ✓ trial user is capped at Pro AI quota (100 text, 50 images)
  ✓ trial user is capped at 3 X accounts
  ✓ trial user CANNOT access LinkedIn (Agency-only)
  ✓ trial user CANNOT invite team members (Agency-only)
  ✓ trial user gets "csv_pdf" analytics export (not "white_label_pdf")
  ✓ expired trial user gets Free limits (20 posts, 20 AI, 1 account)
  ✓ expired trial user is blocked from Pro features
  ✓ paid Pro user is unaffected by trial logic
  ✓ paid Agency user is unaffected by trial logic
```

### 5.2: Lint & Typecheck

```bash
pnpm lint && pnpm typecheck
```

Must pass with zero errors. The `effectivePlan` field addition to `PlanContext` will require updating all call sites that destructure it — the type system will catch any missed spots.

### 5.3: Run Existing Test Suite

```bash
pnpm test
```

All 317 existing tests must continue to pass. Any failures indicate a regression from the trial logic change.

### 5.4: Manual Verification Checklist

Test these scenarios manually (or via integration tests):

| #   | Scenario                                         | Expected Result                               |
| --- | ------------------------------------------------ | --------------------------------------------- |
| 1   | New user signs up → visits /pricing              | Sees "14-day Pro Trial Included" on Free plan |
| 2   | Free trial user → POST /api/ai/agentic           | Allowed (Pro feature)                         |
| 3   | Free trial user → 101st AI generation in month   | Blocked with 402 (Pro limit = 100)            |
| 4   | Free trial user → POST /api/linkedin/callback    | Blocked (Agency-only, not in Pro)             |
| 5   | Free trial user → POST /api/team/invite          | Blocked (Agency-only)                         |
| 6   | Trial expired user → POST /api/ai/agentic        | Blocked with 402                              |
| 7   | Trial expired user → POST /api/posts (21st post) | Blocked with 402 (Free limit = 20)            |
| 8   | Paid Pro user → all Pro features                 | Allowed (unaffected by trial changes)         |
| 9   | Agency user → LinkedIn, teams                    | Allowed (unaffected)                          |
| 10  | Pricing page → Free plan card                    | Shows 7 features including trial mention      |
| 11  | Pricing page → Pro plan card                     | Shows 15 features (expanded list)             |
| 12  | Pricing page → Agency plan card                  | No Instagram, says "LinkedIn Integration"     |
| 13  | Pricing page → Core features section             | No "Multi-platform" claim for all plans       |

### 5.5: Visual Regression Check

After updating pricing page feature lists, verify the layout on:

- Desktop (1440px+): 3-column grid balanced
- Tablet (768px): Cards stack properly
- Mobile (375px): Single column, no overflow

Use the Claude Preview MCP tool or browser dev tools to check.

---

## Phase 6: Documentation Updates

**Priority:** P2 — Required before merge per project conventions

### Files to Update

| File                                            | Update                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| `CLAUDE.md`                                     | Update "Recent Fixes" section with trial fix; update plan limits summary if present |
| `README.md`                                     | Update Features table, pricing section if present                                   |
| `docs/audit/pricing-gap-analysis-2026-04-06.md` | Mark resolved items                                                                 |

### CLAUDE.md Updates

Add to "Recent Fixes" section:

```markdown
### Fixed Issues (2026-04-06)

1. **14-day Trial Unlimited Access Bug**
   - **Root cause:** All gate functions in `require-plan.ts` had `if (context.isTrialActive) return { allowed: true }` which bypassed ALL limits including quotas
   - **Fix:** Replaced blanket bypass with `effectivePlan` resolution — trial users now get Pro Monthly limits (100 AI text, 50 images, 3 accounts) instead of unlimited Agency-tier access
   - **Files:** `src/lib/middleware/require-plan.ts`, `src/lib/plan-limits.ts`

2. **Pricing Page Misrepresentation**
   - Removed Instagram claims (not implemented)
   - Fixed "Multi-platform" to accurately reflect per-plan platform access
   - Expanded feature lists: Free (3→7 items), Pro (5→15 items), Agency (5→7 items)
   - Added 14-day trial banner
   - Fixed annual savings from "~20%" to "17%"
   - **Files:** `src/components/billing/pricing-table.tsx`, `src/app/(marketing)/pricing/page.tsx`
```

---

## Agent Orchestration Guide

When implementing this plan, the LLM should spin up specialized agents in parallel to maximize efficiency. Here is the recommended agent strategy per phase:

### Phase 1 Agents (Trial System Fix)

Launch **3 agents in parallel** in a single message:

```
Agent 1: feature-dev:code-architect
  Prompt: "Refactor the trial bypass in src/lib/middleware/require-plan.ts.
    - Add `effectivePlan` to PlanContext interface
    - Update getPlanContext to set effectivePlan = 'pro_monthly' when isTrialActive
    - Remove ALL `if (context.isTrialActive) return { allowed: true }` lines
    - Change all `getPlanLimits(context.plan)` to `getPlanLimits(context.effectivePlan)`
    - Add TRIAL_EFFECTIVE_PLAN constant to src/lib/plan-limits.ts
    - Ensure makeFeatureGate factory uses effectivePlan
    Reference: [provide exact file contents and line numbers from this plan]"

Agent 2: feature-dev:code-reviewer
  Prompt: "After Agent 1 completes, review the changes to require-plan.ts for:
    - Any remaining blanket trial bypass lines that were missed
    - Correct effectivePlan resolution in all 12+ gate functions
    - Agency-only features (LinkedIn, teams) correctly blocked during trial
    - No regressions in paid plan behavior"

Agent 3: general-purpose (test writer)
  Prompt: "Update src/lib/middleware/require-plan.test.ts with new test cases:
    - Trial user gets Pro feature access
    - Trial user capped at Pro quotas (100 text, 50 images, 3 accounts)
    - Trial user blocked from Agency features (LinkedIn, teams)
    - Expired trial gets Free limits
    - Paid users unaffected
    Run pnpm test after writing tests."
```

### Phase 2 Agents (Remove Over-promises)

Launch **2 agents in parallel**:

```
Agent 1: general-purpose
  Prompt: "Update src/components/billing/pricing-table.tsx:
    - Remove Instagram from Agency features in MONTHLY_PLANS and ANNUAL_PLANS
    - Change '10 Connected Accounts' to '10 X Accounts'
    - Change 'LinkedIn & Instagram' to 'LinkedIn Integration'
    - Fix annual savings label from '~20%' to '17%'"

Agent 2: general-purpose
  Prompt: "Update src/app/(marketing)/pricing/page.tsx core features section:
    - Replace 'Multi-platform Support (X, LinkedIn, Instagram)' with accurate per-plan text
    - Replace 'Smart Scheduling with drag-and-drop calendar' with non-misleading text
    - Replace 'Priority Support for all plans' with 'Community & Email Support'
    Run pnpm lint && pnpm typecheck after changes."
```

### Phase 3 Agents (Pricing Page Overhaul)

Launch **2 agents in parallel**:

```
Agent 1: general-purpose
  Prompt: "Expand feature lists in src/components/billing/pricing-table.tsx:
    - Free: 7 features (20 posts, 1 X account, 20 AI text, 10 AI images, 7-day analytics, inspiration, 14-day trial)
    - Pro: 15 features (see Phase 3.2 of implementation plan)
    - Agency: 7 features (see Phase 3.3 of implementation plan)
    Apply to BOTH MONTHLY_PLANS and ANNUAL_PLANS arrays."

Agent 2: general-purpose
  Prompt: "Add 14-day trial banner to src/app/(marketing)/pricing/page.tsx above the PricingTable component.
    Also check if src/components/billing/pricing-card.tsx needs visual adjustments for longer feature lists.
    Run pnpm lint && pnpm typecheck after changes."
```

### Phase 4 Agents (Post-Trial Alignment)

Launch **1 agent**:

```
Agent 1: Explore (subagent_type)
  Prompt: "Search for any existing trial banner or trial status UI components in the dashboard.
    Check sidebar.tsx, dashboard layout, and any notification components.
    If none exist, report what component would be the best place to add a trial status indicator."
```

Then based on findings, launch an implementation agent if needed.

### Phase 5 Agents (Testing)

Launch **3 agents in parallel**:

```
Agent 1: general-purpose
  Prompt: "Run pnpm lint && pnpm typecheck && pnpm test. Report any failures."

Agent 2: feature-dev:code-reviewer
  Prompt: "Review ALL changes made in Phases 1-4 for:
    - Security: no plan bypass loopholes remain
    - Consistency: all 22 enforcing routes still work correctly
    - UI: pricing page copy is accurate and professional
    - Types: PlanContext interface change propagated everywhere"

Agent 3: prp-core:silent-failure-hunter
  Prompt: "Hunt for silent failures in the trial system changes.
    Specifically check: what happens if effectivePlan is undefined?
    What happens if a trial user's trialEndsAt is corrupted?
    What happens at the exact moment the trial expires mid-request?"
```

### Phase 6 Agents (Documentation)

Launch **1 agent**:

```
Agent 1: general-purpose
  Prompt: "Update CLAUDE.md and README.md with:
    - Trial system fix description in Recent Fixes
    - Pricing page update description in Recent Fixes
    - Any plan-limits changes in Architecture Notes
    Reference the implementation plan for exact wording."
```

---

## Summary of All Files Modified

| Phase | File                                                  | Type of Change                          |
| ----- | ----------------------------------------------------- | --------------------------------------- |
| 1     | `src/lib/plan-limits.ts`                              | Add `TRIAL_EFFECTIVE_PLAN` constant     |
| 1     | `src/lib/middleware/require-plan.ts`                  | Replace trial bypass with effectivePlan |
| 1     | `src/lib/middleware/require-plan.test.ts`             | Add trial-specific test cases           |
| 2     | `src/components/billing/pricing-table.tsx`            | Remove Instagram, fix labels            |
| 2     | `src/app/(marketing)/pricing/page.tsx`                | Fix core features section               |
| 3     | `src/components/billing/pricing-table.tsx`            | Expand feature lists                    |
| 3     | `src/app/(marketing)/pricing/page.tsx`                | Add trial banner                        |
| 3     | `src/components/billing/pricing-card.tsx`             | Visual adjustments (if needed)          |
| 3     | `src/components/billing/pricing-comparison-table.tsx` | New file (optional P3)                  |
| 4     | Dashboard components (TBD)                            | Trial status indicator                  |
| 6     | `CLAUDE.md`                                           | Documentation updates                   |
| 6     | `README.md`                                           | Documentation updates                   |

---

## Execution Order

```
Phase 1 (Backend - Trial Fix)
    ↓
Phase 2 (UI - Remove Over-promises)     ← can run in parallel with Phase 1
    ↓
Phase 3 (UI - Pricing Overhaul)         ← depends on Phase 2
    ↓
Phase 4 (Backend - Post-Trial)          ← depends on Phase 1
    ↓
Phase 5 (Testing)                       ← depends on all above
    ↓
Phase 6 (Documentation)                 ← depends on Phase 5
```

Phases 1 and 2 are independent and can execute in parallel.
Estimated total: ~12 modified files, ~200-300 lines changed.

---

_Implementation plan generated 2026-04-06 based on [Pricing Gap Analysis](./pricing-gap-analysis-2026-04-06.md)._
