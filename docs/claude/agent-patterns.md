# Agent Orchestration Patterns for AstraPost

## Pattern 1: New Feature Implementation

```
Main agent (coordinator):
  → @backend-dev: API route + service logic
  → @frontend-dev: Component + page + sidebar entry
  → @db-migrator: Schema changes + migration (if needed)
  → WAIT for all
  → @test-runner: lint + typecheck + tests
```

## Pattern 2: Bug Investigation + Fix

```
Main agent:
  → @researcher: Trace the bug (read-only, Haiku)
  → WAIT for findings
  → @backend-dev or @frontend-dev: Fix based on findings
  → @test-runner: Verify fix didn't break anything
```

## Pattern 3: AI Feature Development

```
Main agent:
  → @ai-specialist: Implement AI endpoint + prompts
  → @frontend-dev: Build UI component for the feature
  → WAIT for both
  → @test-runner: Verify
```

## Pattern 4: Refactoring Across Layers

```
Main agent:
  → @researcher: Map all affected files
  → WAIT for file map
  → @backend-dev: Refactor API layer
  → @frontend-dev: Refactor component layer
  → @ai-specialist: Refactor AI layer (if applicable)
  → WAIT for all
  → @test-runner: Full verification
  → @code-reviewer: Review all changes
```

## Pattern 5: Parallel Verification (After ANY Code Change)

Always spawn these three in parallel as the final step:

```
Main agent:
  → Agent 1: pnpm lint
  → Agent 2: pnpm typecheck
  → Agent 3: pnpm test
```

Use @test-runner for this.

## Pattern 6: Research Before Implementation

```
Main agent:
  → @researcher: Find how X works in the codebase
  → WAIT for findings
  → @backend-dev or @frontend-dev: Implement based on findings
```

## File Conflict Prevention

- NEVER assign two agents to write the same file
- If agents need a shared interface, define it FIRST, then implement in parallel
- Schema changes (`src/lib/schema.ts`) should always be done by ONE agent

## Team Size Guidelines

- **2-3 agents**: Most feature work (backend + frontend + tests)
- **3-5 agents**: Large refactors, cross-layer changes
- **5+ agents**: Only for truly independent modules with zero shared files

## Model Selection

- **Haiku**: research, exploration, test running (cheap + fast)
- **Sonnet (inherit)**: implementation, component building, standard coding
- **Opus**: architecture decisions, complex debugging, multi-system reasoning
