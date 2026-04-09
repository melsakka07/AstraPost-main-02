### Objective

Perform an **exhaustive, code-driven UX audit** of the Compose page **as it exists today** — without passing judgment or proposing changes at this stage. The goal is pure **documentation and analysis of the current state**. This audit will later serve as the baseline for identifying friction points, optimizing flows, and improving the overall user journey.

**Update and enhance the existing document at `docs/ux-audits/compose-page-ux-audit.md`** with all findings.

---

### Instructions

#### Phase 1 — Codebase Deep Dive

1. **Identify all source files** related to the Compose page. Trace the component tree starting from the route handler/page component for `/dashboard/compose`. Map out every child component, utility, hook, context provider, API call, state manager, and service involved.

2. **Build a component hierarchy map** — document parent → child relationships, shared state, props passed down, and any global state (Redux, Zustand, Context, etc.) consumed by Compose page components.

3. **Catalogue every interactive element** on the Compose page:
   - Buttons (primary, secondary, icon buttons, toggle buttons)
   - Input fields (text areas, character counters, mentions/hashtag inputs)
   - Dropdowns / Select menus
   - Modals / Dialogs / Pop-ups / Bottom sheets
   - Toggles / Switches / Checkboxes
   - Drag-and-drop zones (e.g., media upload)
   - Tabs or segmented controls
   - Tooltips and contextual help indicators
   - Any hidden or conditionally rendered UI elements (revealed by state changes, feature flags, or user actions)

#### Phase 2 — Button-by-Button, Element-by-Element Analysis

For **every single interactive element** identified above, document the following:

- **Element name and type** (e.g., "Schedule Button — Icon Button")
- **Location on the page** (e.g., "Bottom toolbar, third from left")
- **Visual state(s)** — default, hover, active, disabled, loading, error, success
- **Trigger action** — what happens on click/tap/interaction?
- **Immediate consequence** — does it open a modal? A dropdown? Inline expansion? Navigate away? Trigger an API call?
- **Secondary UI presented** — if a modal/card/popover/drawer opens:
  - What is its title/heading?
  - What options/fields/controls does it contain?
  - What are the available actions within it (confirm, cancel, sub-actions)?
  - Can it be dismissed? How? (click outside, X button, Escape key)
  - Does it have its own nested interactive elements? Document those recursively.
- **State changes** — what application/component state is modified?
- **Validation behavior** — are there any validations triggered? What are the error states and messages?
- **Edge cases** — what happens with empty input, max-length input, unsupported file types, network errors, etc.?

#### Phase 3 — End-to-End User Flow Mapping

Document every **distinct user flow / use case** from entry to completion. At minimum, cover:

1. **Basic tweet composition and posting** — user types text → posts immediately
2. **Tweet with media** — user attaches image(s)/video/GIF → posts
3. **Tweet with scheduling** — user composes → selects date/time → schedules
4. **Thread creation** — user adds multiple tweets in sequence → posts/schedules thread
5. **Tweet with mentions/hashtags** — autocomplete behavior, suggestions
6. **Draft saving** — manual and auto-save behavior (if applicable)
7. **Tweet preview** — how the user previews before posting
8. **Account/profile selection** — if multi-account support exists, how does the user select which account to post from?
9. **Category/label/tag assignment** — if any organizational features exist
10. **AI-assisted composition** — if any AI writing features exist, document the full sub-flow
11. **Emoji picker / special character insertion**
12. **Link insertion and preview behavior**
13. **Cancellation / discard flow** — what happens when the user abandons composition? Are there unsaved changes warnings?
14. **Error and failure recovery** — what does the user see if posting fails? Retry mechanisms?
15. **Any other flow discovered during codebase analysis**

For each flow, document:

- **Entry point(s)** — how does the user initiate this flow?
- **Step-by-step walkthrough** — every screen, modal, state change, and user decision
- **Happy path** — the ideal, uninterrupted journey
- **Alternative paths** — branches, optional steps
- **Terminal state** — what does the user see upon completion? Confirmation? Redirect? Toast notification?
- **Friction points observed** (document factually, do not editorialize — e.g., "User must click 3 times to reach scheduling options" not "This is bad UX")

#### Phase 4 — Cross-Reference with UX Best Practices

For each flow and interaction pattern documented, **annotate** with relevant industry-standard UX best practices and heuristics for reference (not as criticism, purely as reference benchmarks):

- **Nielsen's 10 Usability Heuristics** — note which heuristics each interaction pattern relates to
- **Fitts's Law** — note target sizes and distances for key actions
- **Hick's Law** — note decision complexity where multiple options are presented
- **Progressive disclosure** — note how information/options are layered
- **Accessibility (WCAG 2.1)** — note keyboard navigation, ARIA labels, focus management, color contrast where observable in code
- **Platform conventions** — note alignment with or deviation from established patterns in similar tools (e.g., Twitter/X native composer, Buffer, Hootsuite, Typefully)

---

### Output Requirements

**Update the existing file** `docs/ux-audits/compose-page-ux-audit.md` with:

1. **Document structure** — use clear, hierarchical Markdown headings (H1–H4) with a table of contents
2. **Component architecture section** — visual/textual component tree
3. **Interactive elements catalogue** — organized table or structured list of every element
4. **Flow diagrams** — text-based flow descriptions (use Mermaid diagram syntax where it adds clarity)
5. **Detailed per-element analysis** — as described in Phase 2
6. **End-to-end flow documentation** — as described in Phase 3
7. **Best practice annotations** — as described in Phase 4
8. **File reference index** — a section listing every source file examined with its path and brief description of its role

### Formatting and Style

- Write in **clear, professional technical documentation style**
- Use **present tense** ("The button opens a modal" not "The button will open a modal")
- Be **exhaustive but scannable** — use tables, collapsible sections, and consistent formatting
- **Do not editorialize or recommend changes** in this document — this is a pure "as-is" state capture
- Where behavior is ambiguous from code alone, note it explicitly: _"[Requires runtime verification]"_
- Preserve any existing content in the document that remains accurate; update or expand where the codebase reveals additional detail

### Execution Approach

- Use agents and tools as needed to search, read, and cross-reference files across the codebase
- Start from the route/page entry point and work outward systematically
- Do not skip any component, no matter how small — even a tooltip or a divider with an onClick handler matters
- If you encounter feature-flagged or conditionally loaded features, document them separately with their activation conditions
- If the existing document contains information that contradicts the codebase, **flag it explicitly** and provide the code-accurate version

---

**Begin by reading the existing document at `docs/ux-audits/compose-page-ux-audit.md`, then systematically trace the Compose page codebase, and produce the comprehensive updated audit.**

---
