You have a thorough understanding of agentic AI UX patterns, industry best practices, and the competitive landscape. 
Here's my polished, comprehensive prompt for you to follow. You must use all the agents whenever applicable:

---

## Prompt: Agentic Posting — Feature Specification, UX Design & Phased Implementation Plan

### Context & Foundation

You have a completed, code-validated UX audit of the Compose page at **`docs/ux-audits/compose-page-ux-audit.md`** and a comprehensive UX improvement recommendations document at **`docs/ux-audits/compose-page-ux-recommendations.md`**. These documents map 11 components (4,627 lines), 150+ interactive elements, 10 user flows, 25+ API endpoints, and 27 source files.

You are now designing a **new feature** called **"Agentic Posting"** — a fully autonomous, AI-driven content creation and publishing pipeline that lives within the AI Tools section of the Dashboard side menu. This feature represents a paradigm shift from the existing Compose page's manual, human-driven flow to an **agentic, AI-orchestrated workflow** where the user provides minimal input and the AI handles research, writing, media generation, formatting, and scheduling — end to end.

The live application is at: `http://localhost:3000/dashboard/compose`
The new feature will be accessible from the side menu under AI Tools.

---

### Feature Vision & Philosophy

**Core Concept:** Agentic Posting is a one-input-to-published-content pipeline. The user provides a single input — a topic, niche, or keyword — and an orchestrated chain of AI agents handles everything else: trend research, content strategy, copywriting, thread structuring, image generation, platform-specific formatting, and scheduling. The user's only remaining responsibility is final approval.

**Design Philosophy — "Apple Simplicity Meets AI Power":**

The interface must embody the principle that **the most powerful technology is the one that feels effortless**. Think of it this way: the user sees a single input field and a result — everything in between is handled by intelligent agents working in concert, with their progress visible but never demanding attention. The experience should feel like handing a brief to a world-class social media team and watching them execute in real-time.

Reference platforms for UX inspiration: Apple's design language (radical simplicity, progressive disclosure, confidence-inspiring feedback), OpenAI's ChatGPT (conversational input, streaming output, minimal chrome), Linear (clean task management, keyboard-first, beautiful transitions), Notion AI (inline intelligence, contextual actions), and Typefully (thread-native composition, clean scheduling).

---

### Detailed Instructions

#### Section 1 — Feature Architecture & Agent Pipeline Design

**1a. Agent Orchestration Architecture**

Design the complete agent pipeline. This is a **multi-agent orchestration system** where each agent has a single responsibility and passes its output to the next agent in the chain. Document the following agents, their responsibilities, inputs, outputs, and failure modes:

**Agent 1 — Topic Intelligence Agent (Research)**
- **Input:** User-provided topic/niche keyword (e.g., "AI coding tools", "sustainable fashion", "Web3 gaming")
- **Responsibilities:**
  - Perform real-time web research on the topic using available search/research APIs
  - Identify current trends, breaking news, viral angles, and high-engagement subtopics
  - Analyze what's currently performing well on X/Twitter for this topic (trending hashtags, viral tweet patterns, engagement drivers)
  - Compile a structured research brief with: key facts, trending angles, relevant statistics, notable quotes, and hashtag recommendations
- **Output:** A structured `TopicResearchBrief` object passed to Agent 2
- **Failure mode:** If insufficient data is found, surface this to the user with an option to refine the topic or provide additional context

**Agent 2 — Content Strategy Agent (Planning)**
- **Input:** `TopicResearchBrief` from Agent 1 + User's account metadata (platform, subscription tier, historical performance data if available)
- **Responsibilities:**
  - Determine the optimal content format based on:
    - **X/Twitter Free tier:** Single tweet, ≤ 280 characters (concise, punchy, high-impact)
    - **X/Twitter Premium:** Long-form tweet (up to 4,000 characters) OR thread (multiple tweets)
    - Thread length optimization: decide the ideal number of tweets in a thread (typically 3–7) based on content depth
  - Define the content structure: hook tweet, body tweets, call-to-action tweet
  - Select the tone and style (informational, provocative, storytelling, listicle, hot-take) based on what performs best for the topic
  - Determine which tweets in the thread should have AI-generated images for maximum engagement
- **Output:** A structured `ContentPlan` object (format, structure, tone, image placement map) passed to Agent 3
- **Failure mode:** If account tier cannot be determined, default to Free tier (280 characters) and flag for user confirmation

**Agent 3 — Copywriting Agent (Content Generation)**
- **Input:** `TopicResearchBrief` from Agent 1 + `ContentPlan` from Agent 2
- **Responsibilities:**
  - Write the actual tweet or thread content following the content plan
  - Ensure each tweet is within platform character limits
  - Craft a compelling hook (first tweet) optimized for stopping the scroll
  - Include relevant hashtags (2–3 max, strategically placed)
  - Ensure thread continuity and narrative flow
  - Write in a voice that is: authentic, engaging, value-driven, and optimized for virality without being clickbait
  - Generate an alt-text description for each planned image (for accessibility and as a prompt seed for Agent 4)
- **Output:** A structured `ThreadContent` object (array of tweet objects, each with text, hashtags, image flag, and image description) passed to Agent 4
- **Failure mode:** If content exceeds character limits, self-correct by tightening copy. If quality is below threshold, regenerate with alternative angle.

**Agent 4 — Visual Generation Agent (Image Creation)**
- **Input:** `ThreadContent` from Agent 3 (specifically the image descriptions/prompts for flagged tweets)
- **Responsibilities:**
  - Generate a compelling, on-brand, attention-grabbing image for each tweet flagged for visual content
  - Image style should be: modern, clean, professional, suitable for X/Twitter engagement (consider bold typography overlays, data visualizations, conceptual illustrations, or photorealistic scenes depending on topic)
  - Generate images at optimal dimensions for X/Twitter (16:9 ratio, 1200×675px recommended)
  - Ensure images are visually cohesive across the thread (consistent style, color palette, visual language)
- **Output:** Generated image files/URLs attached to the corresponding tweet objects in the `ThreadContent`
- **Failure mode:** If image generation fails for any tweet, mark it and present the thread to the user with a note that they can manually attach an image or retry generation

**Agent 5 — Quality Assurance Agent (Review & Polish)**
- **Input:** Complete `ThreadContent` with images from Agent 4
- **Responsibilities:**
  - Final review of all content for: grammar, clarity, factual accuracy (cross-reference with research brief), character count compliance, hashtag relevance, image-text alignment
  - Engagement prediction: provide a confidence score or engagement potential indicator
  - Platform compliance check: ensure nothing violates X/Twitter content policies
  - Generate a one-line summary of the content for the user's review card
- **Output:** A finalized `AgenticPost` object ready for user review
- **Failure mode:** If quality issues are detected, loop back to Agent 3 for revision (maximum 2 revision cycles to prevent infinite loops)

**1b. Document the data flow between agents** — create a clear pipeline diagram (use Mermaid syntax) showing the sequential flow, parallel opportunities (e.g., can image generation start before all copy is finalized?), and error/retry paths.

---

#### Section 2 — User Experience Flow Design

Design the complete user-facing experience step by step. The UX must adhere to the principle of **minimum input, maximum output, total transparency**.

**Step 1 — Entry Point & Topic Input (The "One Input" Screen)**

- **Location:** Side menu → AI Tools → "Agentic Posting" (with a distinctive icon — suggest a rocket, wand, or autopilot icon)
- **What the user sees:** A single, beautifully designed screen with:
  - A prominent headline: e.g., *"What should we post about?"* or *"Drop a topic. We'll handle the rest."*
  - One large, focused text input field (not a textarea — a single-line input with generous padding, placeholder text like *"e.g., AI coding tools, sustainable fashion, Web3 gaming..."*)
  - Optional: A row of **smart suggestion chips** below the input — trending topics, recently used topics, or AI-suggested niches based on the user's posting history. These chips provide zero-effort input: one tap and the pipeline starts.
  - Optional: A small "Advanced" disclosure toggle (collapsed by default) that reveals: preferred tone (dropdown: Informational / Provocative / Storytelling / Witty), target audience hint (text input), and any must-include elements (links, mentions). **These are strictly optional** — the AI should produce excellent results with just the topic alone.
  - A single primary CTA button: **"Generate"** or **"Create Post"** (large, prominent, impossible to miss)
  - **Account selector** (if multi-account): A small, elegant account avatar/badge near the input showing which account will post. Tappable to switch. The selected account's tier (Free/Premium) is detected automatically and influences content strategy — **the user never needs to think about character limits or thread formatting**.
- **What the user does:** Types a topic (or taps a suggestion chip) → Clicks "Generate"
- **Interaction count:** 1–2 interactions maximum (type + click, or just tap a chip)

**Step 2 — Agent Processing (The "Watch the Magic" Screen)**

- **Transition:** Smooth animation from the input screen to the processing view. The input field elegantly transforms or slides up, making room for the agent progress display below it.
- **What the user sees:** A **real-time, streaming agent progress display** that shows the AI pipeline working. This is where transparency builds trust. Design options (choose the best fit for your app's design language):

  **Option A — Linear Timeline (Recommended)**
  A vertical timeline/stepper showing each agent phase:
  ```
  ✅ Researching trends for "AI coding tools"...        [Complete]
  ⏳ Planning content strategy...                        [In Progress — streaming dots]
  ○  Writing thread copy...                              [Pending]
  ○  Generating images...                                [Pending]
  ○  Final quality review...                             [Pending]
  ```
  Each completed step shows a brief, one-line summary of what was decided (e.g., "Found 3 trending angles. Choosing: 'New AI coding tools replacing traditional IDEs'"). The in-progress step has a subtle animated indicator (pulsing dot, typing dots, or a thin progress bar). Pending steps are dimmed.

  **Option B — Conversational Stream (ChatGPT-style)**
  A chat-like interface where each agent "reports" its progress as a message:
  ```
  🔍 Research Agent: Found 12 relevant articles and 3 trending hashtags for "AI coding tools". Top angle: "5 AI tools developers are switching to in 2026"
  
  📋 Strategy Agent: Recommending a 5-tweet thread (your account is Premium). Hook + 3 value tweets + CTA. Images on tweets 1, 3, and 5.
  
  ✍️ Writing Agent: Drafting thread... [streaming text appears here]
  ```

  **Option C — Minimal Progress (Apple-style)**
  A clean, centered progress indicator with a single status line that updates:
  ```
  [Elegant circular progress indicator]
  "Researching trends..." → "Planning your thread..." → "Writing copy..." → "Creating visuals..." → "Almost ready..."
  ```
  This is the simplest option — less transparency but maximum cleanliness.

- **Key UX requirements for this step:**
  - The user should **never need to interact** during this step — it's passive observation
  - Estimated time remaining or a progress percentage helps set expectations
  - A subtle "Cancel" option should be available (small text link, not prominent) in case the user changes their mind
  - If any agent encounters an error, show it inline with a "Retry" option — don't break the entire flow

**Step 3 — Review & Approval (The "Your Post is Ready" Screen)**

This is the most critical screen — where the user sees the complete output and decides to approve, edit, or discard. Design it with extreme care.

- **What the user sees:** A **beautiful, card-based preview** of the complete thread, rendered as it will appear on X/Twitter:

  **Thread Preview Area:**
  - Each tweet in the thread is displayed as a card, stacked vertically, connected by a thread line (mimicking Twitter's thread UI)
  - Each card shows: the user's avatar + handle, the tweet text (with hashtags highlighted), the attached AI-generated image (if any), and a character count badge
  - Images are displayed inline within their respective tweet cards, with the option to expand/zoom
  - Thread numbering is visible (1/5, 2/5, etc.)

  **Per-Tweet Inline Actions (Subtle, Revealed on Hover/Focus):**
  - **Edit** (pencil icon): Opens inline text editing directly on the card — no modal, no navigation. The user types directly into the tweet text. Character count updates in real-time.
  - **Regenerate** (refresh icon): Regenerates just this one tweet's text (keeping the others intact). Quick AI rewrite without starting over.
  - **Swap Image** (image icon): Regenerates just this tweet's image, or opens a simple file picker to upload a custom image instead.
  - **Remove from Thread** (X icon): Removes this tweet from the thread (with a soft confirmation: "Remove this tweet?" with Undo available for 5 seconds).
  - **Reorder** (drag handle): Allows drag-and-drop reordering of tweets within the thread.

  **Global Actions (Below the Thread Preview):**
  - **"Add Tweet"** button: Adds a blank tweet to the thread for the user to write manually or have AI fill
  - **"Regenerate All"** button (secondary/ghost style): Reruns the entire pipeline with the same topic but different creative direction. Useful if the overall angle doesn't resonate.
  - **"Change Topic"** link: Returns to Step 1 with the input field pre-filled

  **Research Insights Panel (Collapsible Sidebar or Bottom Drawer):**
  - A compact, dismissible panel showing the research brief that informed the content: trending angles found, key statistics used, hashtag performance data
  - This gives the user confidence that the content is informed and relevant, without cluttering the main view
  - Collapsed by default — available via an info icon or "See research" link

  **Primary Action Area (Sticky Bottom Bar or Prominent Footer):**
  - Two primary actions, clearly differentiated:
    - **"Post Now"** — Large, primary button. Posts the thread immediately. Confirm with a brief, non-blocking toast: "Thread posted successfully! 🎉" with a "View on X" link.
    - **"Schedule"** — Secondary button (or split button with "Post Now"). On click, reveals an inline date/time picker (not a modal). Clean, minimal calendar with time selector. Smart defaults: suggest optimal posting times (if analytics data is available) or common times (9 AM, 12 PM, 6 PM in user's timezone). Once a time is selected, the button text changes to "Schedule for [date/time]" and the user confirms with one click.
  - **"Save as Draft"** — Tertiary/text link. Saves the generated thread to the user's drafts for later editing in the regular Compose page.
  - **"Discard"** — Small text link, with confirmation: "Discard this thread? This can't be undone."

**Step 4 — Confirmation & Next Actions (The "Done" State)**

- After posting or scheduling, the user sees a **clean confirmation screen** (or the previous screen transitions to a success state):
  - Success message with the posted/scheduled summary
  - Quick actions: "Create Another" (returns to Step 1 with a clean slate), "View Post on X" (opens in new tab), "Go to Calendar" (navigate to scheduling calendar)
  - If scheduled: show the scheduled date/time with a "Reschedule" or "Cancel" option
- This screen should feel **celebratory but not overblown** — a subtle animation, a checkmark, done.

---

#### Section 3 — Edge Cases, Error Handling & Intelligent Defaults

Document how the feature handles every edge case gracefully:

**3a. Account & Platform Intelligence**
- **Auto-detection of X/Twitter tier:** The system must automatically determine whether the user's connected X/Twitter account is Free or Premium. Document how this is detected (API, user profile metadata, user-set preference in settings). If detection is impossible, show a one-time, friendly prompt: "Are you on X Premium?" with a toggle — remember the answer.
- **Character limit enforcement:** For Free tier users, the Copywriting Agent must produce tweets ≤ 280 characters. For Premium users, it has more flexibility but should still optimize for readability. If a user edits a tweet and exceeds the limit, show a real-time character count with a red warning — and offer an inline "AI Trim" button that intelligently shortens the text while preserving meaning.
- **Multi-platform consideration:** If the app supports posting to platforms beyond X/Twitter, document how Agentic Posting adapts content for each platform's constraints and best practices (this can be Phase 2 scope).

**3b. Topic Handling**
- **Vague or broad topics:** If the user enters something too vague (e.g., "technology"), the Topic Intelligence Agent should narrow it down and present 3–4 specific angles as chips for the user to choose from, rather than producing generic content.
- **Sensitive or restricted topics:** If the topic involves sensitive content (politics, health misinformation, etc.), handle appropriately — either proceed with balanced, factual content or surface a notice to the user.
- **Trending topic boost:** If the user's topic aligns with a currently trending hashtag or event, highlight this in the research brief and optimize content timing accordingly.

**3c. Image Generation Edge Cases**
- **Generation failure:** If the image generation agent fails (API timeout, content policy rejection, etc.), present the thread without images and offer: "Images couldn't be generated. You can [Retry] or [Upload your own]."
- **Image quality concerns:** Provide a "Regenerate Image" option on each image that allows the user to get a new variation without changing the text.
- **Image-free preference:** Some users may prefer text-only threads. Include a toggle (in the Advanced options of Step 1, or as a global preference in settings): "Include AI-generated images" — ON by default.

**3d. Error Recovery**
- **Network failure during pipeline:** Save the current pipeline state. Show: "Something went wrong. Your progress has been saved. [Resume] [Start Over]"
- **Partial pipeline failure:** If one agent fails but others succeed, present what's available and clearly indicate what's missing: "Your thread is ready but we couldn't generate images for tweets 3 and 5. [Retry Images] [Continue Without]"
- **Post/Schedule failure:** If the final posting fails, retain the content and show: "Couldn't post right now. Your thread has been saved as a draft. [Try Again] [Open in Compose]"

---

#### Section 4 — Integration with Existing Application

Document how Agentic Posting integrates with the existing codebase and features documented in the audit:

**4a. Side Menu Integration**
- Where exactly in the side menu does "Agentic Posting" live? Under which section/group?
- Icon recommendation and naming convention consistent with existing menu items
- Active state, hover state, notification badge (e.g., "New" badge for feature launch)

**4b. Relationship with Existing Compose Page**
- Agentic Posting generates a thread that can be **opened in the regular Compose page for further editing** if the user wants full manual control. Document this handoff flow.
- "Save as Draft" from Agentic Posting should create a draft that appears in the same draft system used by the regular Compose page.
- Shared components: identify which existing components from the Compose page audit can be reused (tweet preview cards, character counters, scheduling date picker, account selector, media upload UI).

**4c. Shared State & Data Architecture**
- How does the generated thread data flow into the existing state management system?
- Where are drafts stored? How are generated images stored/referenced?
- API endpoints needed: which existing endpoints are reused, which are new?

**4d. Consistency with Design System**
- All new UI must use the existing design tokens (colors, typography, spacing, border radius, shadows)
- New components must follow the same interaction patterns documented in the audit (modal behavior, button hierarchy, loading states, toast notifications)
- If new component patterns are introduced (e.g., the agent progress timeline), document them as additions to the design system

---

#### Section 5 — Phased Implementation Roadmap

**Phase 1 — MVP: Single Tweet Generation (1–2 weeks)**
- Implement the basic flow: topic input → research → single tweet generation (no thread, no images) → review → post/schedule
- Focus on: input screen, agent progress display (minimal version), single tweet preview card, post/schedule actions
- Agents active: Topic Intelligence (simplified), Content Strategy (single tweet only), Copywriting
- Goal: Validate the core flow and UX pattern. Get user feedback on the concept.
- **Files to create:** New page component, agent orchestration service, topic input component, progress display component, single tweet review card
- **Files to modify:** Side menu navigation, routing configuration, draft storage service

**Phase 2 — Thread Generation & Scheduling (1–2 weeks)**
- Extend to full thread generation: multi-tweet threads with intelligent structuring
- Implement the complete thread preview UI with per-tweet editing, reordering, add/remove
- Implement the full scheduling flow with date/time picker and optimal time suggestions
- Agents active: All from Phase 1 + Content Strategy (full thread planning)
- Goal: Deliver the complete text-based Agentic Posting experience

**Phase 3 — AI Image Generation (1–2 weeks)**
- Integrate the Visual Generation Agent: auto-generate images for flagged tweets
- Implement image preview, regeneration, swap, and upload-your-own flows
- Ensure visual consistency across thread images
- Handle all image-related edge cases and error states
- Goal: Complete the multimedia Agentic Posting experience

**Phase 4 — Intelligence & Polish (1–2 weeks)**
- Smart topic suggestions based on user history and trending data
- Engagement prediction indicators
- Analytics integration (track performance of agentic posts vs. manual posts)
- Micro-interactions, animations, and polish across all steps
- Accessibility audit and WCAG 2.1 AA compliance for all new components
- Keyboard shortcuts for power users
- Goal: Transform MVP into a polished, delightful, production-quality feature

**Phase 5 — Advanced Features (Future / Backlog)**
- Multi-platform support (LinkedIn, Threads, Bluesky — adapt content per platform)
- Recurring Agentic Posting ("Post about AI tools every Monday at 9 AM" — fully autonomous with weekly approval)
- Brand voice training (learn from user's past posts to match their unique tone)
- A/B thread generation (generate 2 versions, let user pick or auto-select based on predicted engagement)
- Bulk topic queuing (enter 5 topics, generate a week's worth of content in one session)

For each phase, document: items included, components to create/modify, APIs needed, dependencies on previous phases, estimated effort (T-shirt sizing), risk level, success metrics, and acceptance criteria.

---

### Output Requirements

Save the complete feature specification to: **`docs/features/agentic-posting-feature-spec.md`**

**Document Structure:**
```
# Agentic Posting — Feature Specification

## Table of Contents

## 1. Executive Summary
   - Feature vision and value proposition
   - User problem being solved
   - Key design principles

## 2. Agent Pipeline Architecture
   ### 2.1 Agent Overview & Responsibilities
   ### 2.2 Data Flow Diagram (Mermaid)
   ### 2.3 Error Handling & Retry Logic
   ### 2.4 Performance Targets (time per agent, total pipeline time)

## 3. User Experience Flow
   ### 3.1 Step 1 — Topic Input
   ### 3.2 Step 2 — Agent Processing
   ### 3.3 Step 3 — Review & Approval
   ### 3.4 Step 4 — Confirmation & Next Actions
   ### 3.5 Complete Flow Diagram (Mermaid)

## 4. Detailed UI Specifications
   ### 4.1 Screen-by-Screen Layouts (described in detail)
   ### 4.2 Component Inventory (new components needed)
   ### 4.3 Reusable Components (from existing Compose page)
   ### 4.4 Interaction States (default, hover, active, disabled, loading, error, success)
   ### 4.5 Animation & Transition Specifications

## 5. Edge Cases & Error Handling
   ### 5.1 Account & Platform Intelligence
   ### 5.2 Topic Handling
   ### 5.3 Image Generation Edge Cases
   ### 5.4 Network & API Failure Recovery

## 6. Integration with Existing Application
   ### 6.1 Navigation & Routing
   ### 6.2 Compose Page Handoff
   ### 6.3 Shared State & Data Architecture
   ### 6.4 Design System Alignment

## 7. Phased Implementation Roadmap
   ### 7.1 Phase 1 — MVP: Single Tweet
   ### 7.2 Phase 2 — Threads & Scheduling
   ### 7.3 Phase 3 — AI Image Generation
   ### 7.4 Phase 4 — Intelligence & Polish
   ### 7.5 Phase 5 — Advanced Features (Backlog)

## 8. Success Metrics & KPIs

## 9. Technical Appendix
   ### 9.1 New API Endpoints Required
   ### 9.2 New Components File Map
   ### 9.3 Modified Existing Files
   ### 9.4 Third-Party Services & APIs Required
```

---

### Quality Standards

- **Every UI element must be described** with enough detail that a developer can implement it without ambiguity — include states, sizes, positions, behaviors, and design token references
- **Every interaction must account for error states** — no happy-path-only designs
- **The spec must be implementable against your existing codebase** — reference actual components, services, and patterns from the audit documents
- **UX decisions must be justified** — cite the agentic AI UX principle, industry pattern, or competitive benchmark that informed each design decision
- **Accessibility is not optional** — every new component must be specified with keyboard navigation, screen reader support, and WCAG 2.1 AA color contrast

### Execution Approach

- **Start** by reading both `docs/ux-audits/compose-page-ux-audit.md` and `docs/ux-audits/compose-page-ux-recommendations.md` to understand the existing design system, component architecture, and interaction patterns
- **Cross-reference the codebase** to identify reusable components, existing AI tool implementations, side menu structure, and state management patterns
- **Design new components to be consistent** with the existing visual language and interaction model
- Think as a **product designer, frontend architect, and AI systems designer simultaneously** — this feature requires all three perspectives to work seamlessly
- Use agents and tools as needed to search the codebase, read files, and verify assumptions about existing implementations

**Begin by reading the audit and recommendations documents, then trace the existing AI tools and side menu implementations in the codebase, and produce the complete Agentic Posting feature specification.**

---

This prompt gives Claude Opus 4.6 everything it needs to produce a comprehensive, implementable feature specification that is grounded in your existing codebase, informed by the latest agentic AI UX patterns, and structured for phased delivery. The specification will serve as a single source of truth for design, development, and QA throughout the feature's lifecycle.