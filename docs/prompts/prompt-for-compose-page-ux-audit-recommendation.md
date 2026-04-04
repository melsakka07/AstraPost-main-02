Here's your comprehensive, detailed prompt — optimized for Claude Opus 4.6 in an agentic IDE context — designed to produce actionable UX improvement recommendations with a phased implementation plan:

---

## Prompt: UX Improvement Recommendations & Phased Implementation Plan — Compose Page (`/dashboard/compose`)

### Context & Foundation

You have just completed an exhaustive, code-driven UX audit of the Compose page, documented at:
**`docs/ux-audits/compose-page-ux-audit.md`**

This audit contains: a full component architecture map (11 components, 4,627 lines), a catalogue of 150+ buttons, 20+ inputs, 15+ selects, 5 dialogs, 30+ chips, 40+ tooltips, 10 end-to-end user flows, Nielsen's heuristics mapping, Fitts's/Hick's Law analysis, WCAG 2.1 gap identification, progressive disclosure layers (0–11), platform comparisons, 25+ API endpoints, 27 source files, and 15 documented friction points.

**This audit is your single source of truth. Every recommendation you make must be traceable back to a specific finding, friction point, flow, or element documented in this audit.**

---

### Objective

Using the completed audit as your foundation, produce a **comprehensive UX Improvement Recommendations document** that:

1. **Validates and expands the 15 existing friction points** — re-examine each one against the code and user flows; confirm, refine, or reclassify them; and identify any **additional friction points** missed in the initial audit.

2. **Proposes concrete, actionable improvements** that transform the Compose page into a **simple, intuitive, enjoyable, and frictionless** experience — following the design philosophy and UX standards of **Apple, OpenAI (ChatGPT), Linear, Notion, and Typefully**.

3. **Delivers a phased implementation roadmap** with clear prioritization, dependencies, and estimated scope.

Save the output to: **`docs/ux-audits/compose-page-ux-recommendations.md`**

---

### Design Philosophy & Guiding Principles

All recommendations **must** be evaluated against these non-negotiable principles:

**1. Radical Simplicity**
Remove everything that doesn't directly serve the core task: *composing and publishing great content*. If a feature can be hidden, consolidated, or deferred — it should be. The user should never feel overwhelmed. When in doubt, remove.

**2. Zero Duplication**
Audit every button, control, and option for functional overlap. If two buttons do similar things, merge them. If a feature is accessible from multiple places with no clear reason, consolidate to one intuitive location. No redundant paths.

**3. Progressive Disclosure Done Right**
The default view should be minimal — just the text area and the most essential actions. Advanced options (scheduling, threads, AI tools, templates, categories) should reveal themselves naturally and contextually, not all at once. Follow Apple's layered complexity model: simple on the surface, powerful underneath.

**4. Contextual Intelligence**
The interface should anticipate the user's needs. If they're typing a thread, thread controls should surface automatically. If they've selected an account, relevant options for that platform should appear. Reduce explicit user decisions wherever the system can infer intent.

**5. Consistent Interaction Patterns**
Every modal, popover, dropdown, and card should behave identically in terms of open/close mechanics, animation, positioning, keyboard navigation, and escape routes. One mental model for all overlays.

**6. Delightful Minimalism**
Inspired by Apple and OpenAI — clean typography, generous whitespace, subtle animations, confidence-inspiring feedback. Every interaction should feel polished and intentional. No visual clutter.

---

### Detailed Instructions

#### Section 1 — Friction Point Deep Dive & Expansion

**1a. Re-examine the 15 existing friction points:**

For each documented friction point in the audit:
- **Confirm or refine** — Is the friction point accurately described? Does the code confirm it? Adjust the description if needed.
- **Classify severity** — Critical (blocks/confuses users), High (causes notable frustration), Medium (minor annoyance), Low (cosmetic/polish).
- **Classify type** — Cognitive overload, Redundancy, Inconsistency, Missing feedback, Accessibility gap, Navigation friction, Visual clutter, Performance issue.
- **Quantify impact** — How many user flows does this friction point affect? Which user personas are most impacted?
- **Trace root cause in code** — Reference the specific component(s), state logic, or UI pattern causing it.

**1b. Identify additional friction points:**

Go back through the audit — every element, every flow, every interaction — and surface friction points that may have been observed but not formally catalogued. Specifically look for:

- **Decision fatigue points** — Where is the user presented with too many options at once? (Apply Hick's Law rigorously)
- **Dead-end states** — Where can the user get stuck with no clear next action?
- **Inconsistent patterns** — Where do similar actions behave differently? (e.g., some modals close on click-outside, others don't)
- **Redundant controls** — Where do multiple UI elements serve the same or overlapping function?
- **Unclear hierarchy** — Where is the visual/functional priority of actions ambiguous? (e.g., multiple CTAs competing for attention)
- **Missing feedback** — Where does the user take an action and receive no confirmation, progress indicator, or state change?
- **Context-switching penalties** — Where is the user forced to leave their composition flow to complete a secondary task?
- **Cognitive load spikes** — Where does the interface demand the user hold too much information in working memory?
- **Accessibility barriers** — Keyboard traps, missing focus indicators, screen reader gaps, insufficient contrast.
- **Mobile/responsive gaps** — If applicable, where does the experience degrade on smaller viewports?

Compile **all** friction points (existing + new) into a unified, numbered master list.

---

#### Section 2 — Consolidation & Simplification Recommendations

This is the core of the document. For each recommendation:

**2a. Toolbar & Action Consolidation**

Analyze every button and control in the compose toolbar(s) and action areas. Propose a **simplified, consolidated toolbar architecture** that:
- Groups related functions logically (e.g., all content-enhancement tools in one smart menu)
- Eliminates duplicate or overlapping controls
- Prioritizes the 3–4 most-used actions as visible; nests everything else
- Follows the Apple toolbar pattern: clean, icon-based, with contextual expansion
- Provide a clear before → after mapping showing what changed and why

**2b. Modal & Dialog Rationalization**

Audit all 5+ dialogs and frequent popovers. Propose:
- A **unified overlay system** with consistent behavior (open/close animations, backdrop, escape key, focus trap)
- Consolidation of modals that could be merged (e.g., if scheduling and publishing are separate modals, consider unifying them)
- Conversion of unnecessary modals to inline/contextual UI where possible (reduce context switches)
- A clear hierarchy: when to use modal vs. popover vs. inline expansion vs. drawer

**2c. AI Tools Simplification**

The audit documents 6 AI sub-tools. Propose:
- A **unified AI assistant interface** (inspired by ChatGPT's input model or Notion AI's slash-command pattern) that replaces scattered AI buttons with one intelligent entry point
- Contextual AI suggestions that surface based on what the user is doing, not requiring them to discover and navigate to separate tools
- Clear before → after comparison

**2d. Flow Optimization**

For each of the 10 documented user flows, propose an **optimized flow** that:
- Reduces the number of steps/clicks to completion
- Eliminates unnecessary decision points
- Provides clearer progress indication and feedback
- Handles errors gracefully and inline (not via disruptive modals)
- Present as: Current flow (steps) → Proposed flow (steps) → Steps saved → Friction points resolved

**2e. Visual & Layout Recommendations**

Propose layout changes that:
- Maximize the text composition area (the primary task should dominate the viewport)
- Create clear visual hierarchy between primary action (Post/Schedule), secondary actions (AI, Media, etc.), and tertiary options (Categories, Labels, etc.)
- Reduce visual noise — identify elements that can be hidden, simplified, or redesigned
- Follow Apple/OpenAI spacing and typography conventions

**2f. Smart Defaults & Contextual Intelligence**

Propose intelligent defaults and contextual behaviors that reduce explicit user decisions:
- Auto-detection of content type (thread vs. single post based on content length)
- Smart scheduling suggestions based on past behavior or optimal times
- Platform-aware feature surfacing (show/hide options based on selected social account)
- Draft auto-save with clear recovery UX
- Remembered user preferences (last-used account, preferred AI tone, etc.)

---

#### Section 3 — Phased Implementation Roadmap

Organize all recommendations into a **phased implementation plan** with the following structure:

**Phase 0 — Quick Wins (1–2 days each, no architectural changes)**
- Bug fixes, label changes, tooltip improvements, disabled-state fixes
- Removing or hiding clearly redundant elements
- Adding missing feedback (toasts, loading states, confirmations)
- Criteria: Zero risk, immediate UX improvement, no dependencies

**Phase 1 — Foundation & Consolidation (1–2 week sprint)**
- Toolbar consolidation and simplification
- Unified overlay/modal system implementation
- Visual hierarchy and layout adjustments
- Criteria: Moderate complexity, high impact, sets foundation for later phases

**Phase 2 — Flow Optimization (1–2 week sprint)**
- Streamlined scheduling flow
- Improved thread creation experience
- Enhanced media upload/management UX
- Error handling and recovery improvements
- Criteria: Flow-level changes, depends on Phase 1 foundation

**Phase 3 — Intelligence & Delight (2–3 week sprint)**
- Unified AI assistant interface
- Smart defaults and contextual intelligence
- Keyboard shortcuts and power-user features
- Micro-interactions and animation polish
- Criteria: Advanced features, depends on Phases 1–2

**Phase 4 — Accessibility & Polish (1–2 week sprint)**
- WCAG 2.1 AA full compliance
- Screen reader optimization
- Keyboard navigation completeness
- Performance optimization (bundle size, render performance)
- Responsive/mobile optimization
- Criteria: Quality and compliance, can partially parallel Phase 3

For each phase, document:
- **Items included** — specific recommendations with reference numbers
- **Dependencies** — what must be completed before this phase begins
- **Estimated effort** — T-shirt size (S/M/L/XL) per item
- **Risk level** — Low / Medium / High
- **Success metrics** — how do we measure improvement? (e.g., "Reduce clicks-to-post from 5 to 2", "Eliminate 3 redundant modals", "Achieve WCAG 2.1 AA compliance")
- **Files likely affected** — reference the file index from the audit

---

### Output Format & Document Structure

Create **`docs/ux-audits/compose-page-ux-recommendations.md`** with this structure:

```
# Compose Page — UX Improvement Recommendations & Implementation Plan

## Table of Contents

## 1. Executive Summary
   - Current state overview (from audit)
   - Key problems identified
   - Improvement philosophy
   - Expected outcomes

## 2. Friction Point Analysis
   ### 2.1 Validated Friction Points (from audit)
   ### 2.2 Newly Identified Friction Points
   ### 2.3 Master Friction Point Registry (unified, numbered, classified)

## 3. Consolidation & Simplification Recommendations
   ### 3.1 Toolbar & Action Consolidation
   ### 3.2 Modal & Dialog Rationalization
   ### 3.3 AI Tools Unification
   ### 3.4 Flow Optimization (per-flow before/after)
   ### 3.5 Visual & Layout Recommendations
   ### 3.6 Smart Defaults & Contextual Intelligence

## 4. Phased Implementation Roadmap
   ### 4.0 Phase 0 — Quick Wins
   ### 4.1 Phase 1 — Foundation & Consolidation
   ### 4.2 Phase 2 — Flow Optimization
   ### 4.3 Phase 3 — Intelligence & Delight
   ### 4.4 Phase 4 — Accessibility & Polish

## 5. Success Metrics & Measurement Framework

## 6. Reference
   ### 6.1 Friction Point → Recommendation Traceability Matrix
   ### 6.2 Recommendation → File Impact Matrix
   ### 6.3 Audit Document Cross-References
```

---

### Quality Standards

- **Every recommendation must reference** a specific friction point, audit finding, or flow from `compose-page-ux-audit.md`
- **Every recommendation must include** a concrete before → after description (not vague "improve this")
- **No recommendation without rationale** — cite the specific UX principle, heuristic, or industry benchmark that justifies it
- **No recommendation without implementation guidance** — at minimum, identify the components/files affected and the nature of the change (UI-only, state logic, API change, new component, etc.)
- **Benchmark against best-in-class** — for each major recommendation, reference how Apple, OpenAI/ChatGPT, Linear, Notion, or Typefully handles the equivalent interaction
- **Be opinionated but justified** — this is the time to make strong UX recommendations, backed by evidence from the audit and industry standards
- **Preserve power** — simplification must not remove capability. Every feature should still be accessible; the goal is to make the *default* experience simpler while keeping depth available for power users

---

### Execution Approach

- **Start** by re-reading `docs/ux-audits/compose-page-ux-audit.md` thoroughly
- **Cross-reference the codebase** to validate any assumptions, particularly around component dependencies and state management implications of proposed changes
- Use agents and tools as needed to search the codebase, verify component relationships, and assess implementation feasibility
- If a recommendation has architectural implications (e.g., merging components, changing state management patterns), explicitly note this and classify it appropriately in the phased plan
- Think like a **product designer and frontend architect simultaneously** — recommendations must be both UX-ideal and technically feasible within the existing codebase

---

**Begin by reading the complete audit document, then systematically work through each section above to produce the comprehensive recommendations and implementation plan.**

---

This prompt is structured to extract maximum value from the completed audit — turning observational findings into a prioritized, actionable transformation plan that balances ambition with pragmatic, phased delivery.