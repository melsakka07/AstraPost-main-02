# Common Task Patterns

Quick reference for AstraPost development. For complete 9-step API route checklist, see CLAUDE.md. For code examples, see canonical files listed below.

---

## 1. Create an AI Endpoint

**When to use:** Building a new AI generation feature (bio, threads, hashtags, etc.)

**Files involved:** `src/app/api/ai/[feature]/route.ts`, `src/lib/schemas/common.ts`

**Key imports:** `aiPreamble`, `recordAiUsage`, `generateObject` or `streamText`, `getCorrelationId`

**Canonical example:** `src/app/api/ai/bio-optimizer/route.ts` (streaming) or `src/app/api/posts/variants/route.ts` (object generation)

### Key Pattern

```typescript
export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);

  // aiPreamble() handles: session check → plan gate → rate limit → AI quota → model instantiation
  const preamble = await aiPreamble({ featureGate: checkYourFeatureGate });
  if (preamble instanceof Response) return preamble; // Early return on auth/plan/quota failures
  const { session, model } = preamble;

  // Parse, validate, generate, record usage, return with correlation ID
}
```

### Key Points

- **aiPreamble()** is mandatory — handles all pre-generation checks in correct order
- **recordAiUsage()** fire-and-forget after generation (needed for billing)
- **Fallback model handling** prevents 429s: check `preamble.fallbackModel` if primary fails with 429
- **Never hardcode model names** — use env vars via `aiPreamble`
- **Use ApiError.\*()** for errors, never raw `Response` or `NextResponse.json()`
- **Always set x-correlation-id header** for tracing

---

## 2. Create an Admin Page

**When to use:** Dashboard for admin-only features (stats, monitoring, user management)

**Files involved:** `src/app/admin/[page]/page.tsx`, `src/components/dashboard/sidebar.tsx`

**Key imports:** `requireAdmin` from `@/lib/admin`

**Canonical example:** `src/app/admin/dashboard/page.tsx`

### Key Pattern

```typescript
// Server Component — NO "use client" needed
export default async function AdminPage() {
  await requireAdmin(); // Redirects to /login if unauthorized

  // Now safe to fetch admin-only data and render
}
```

**Adding to sidebar:** Edit `src/components/dashboard/sidebar.tsx`, add item with `isAdmin: true`

### Key Points

- **Server Components only** — no `"use client"` on admin pages
- **requireAdmin()** automatically redirects unauthorized users (no manual redirect needed)
- **Must add sidebar entry** with `isAdmin: true` for visibility
- **For API routes**, use `requireAdminApi()` instead — check `admin.ok`, return `admin.response` on failure

---

## 3. Enqueue a Queue Job

**When to use:** Async background work (publishing posts, analytics, etc.) after DB write

**Files involved:** `src/app/api/[route]/route.ts`, `src/lib/queue/client.ts`

**Key imports:** `scheduleQueue`, `analyticsQueue`, `SCHEDULE_JOB_OPTIONS`

**Canonical example:** `src/app/api/posts/route.ts` (lines where scheduleQueue.add is called)

### Key Pattern

```typescript
// 1. Write to database inside transaction
await db.transaction(async (tx) => {
  // Multi-table writes here
});

// 2. Enqueue jobs AFTER transaction commits (never inside)
await scheduleQueue.add("job-name", { postId, ... }, SCHEDULE_JOB_OPTIONS);
```

### Key Points

- **Never enqueue inside `db.transaction()`** — jobs won't be retried if tx rolls back
- **Queue is fire-and-forget** — if Redis fails, posts still exist in DB for retry
- **Use SCHEDULE_JOB_OPTIONS** for timing control (delay, attempts, etc.)
- **Job names** must match processor handlers in `src/lib/queue/processors.ts`
- **Correlation ID** should be passed in job data for tracing

---

## 4. Add a Route-Level Rate Limit

**When to use:** Protecting endpoints from abuse (contact forms, free tiers, webhooks)

**Files involved:** `src/app/api/[route]/route.ts`

**Key imports:** `checkRateLimit`, `createRateLimitResponse` from `@/lib/rate-limiter`

**Canonical example:** `src/app/api/community/contact/route.ts`

### Key Pattern

```typescript
export async function POST(req: Request) {
  const { currentTeamId, session } = await getTeamContext();

  // After auth, before business logic
  const limited = await checkRateLimit(currentTeamId, "contact-form", 5); // 5 per minute
  if (limited) return createRateLimitResponse();

  // Business logic here
}
```

### Key Points

- **Call checkRateLimit AFTER auth, BEFORE expensive operations**
- **Use semantic keys** like "contact-form", "export-csv" (not generic names)
- **Default window: 1 minute** — can be customized
- **403 Forbidden on limit hit** — never expose actual rate-limit headers to user (security)

---

## 5. Add a Plan Gate to a Route

**When to use:** Restricting features to specific subscription tiers

**Files involved:** `src/app/api/[route]/route.ts`

**Key imports:** `check*DetailedAccessDetailed` or `check*LimitDetailed`, `createPlanLimitResponse`

**Canonical example:** `src/app/api/ai/bio-optimizer/route.ts`

### Key Pattern

```typescript
// Feature gate (boolean: allowed or not)
const gateResult = await checkBioOptimizerAccessDetailed(userId);
if (!gateResult.allowed) return createPlanLimitResponse(gateResult);

// Quota gate (numeric: how many left)
const quotaResult = await checkPostLimitDetailed(userId, 3); // Want to create 3 posts
if (!quotaResult.allowed) return createPlanLimitResponse(quotaResult);
```

### Key Points

- **Never call `getPlanLimits()` in route handlers** — only in services
- **Feature gates return boolean**, quota gates return `{ allowed, limit, used, reset_at }`
- **createPlanLimitResponse()** returns 402 with upgrade_url + suggested_plan
- **Check gates AFTER auth, BEFORE expensive operations** (AI calls, DB writes)
- **All gates** in `src/lib/middleware/require-plan.ts`

---

## 6. Create a Form with Validation

**When to use:** User-facing forms with client-side React + server-side API validation

**Files involved:** `src/components/[feature]/[form].tsx`, `src/app/api/[route]/route.ts`

**Key imports:** `useState`, `FormData` API, shadcn/ui components

**Canonical example:** `src/components/dashboard/settings/contact-form.tsx` or `src/components/auth/login-form.tsx`

### Key Pattern

```typescript
"use client"; // Required for useState + form handlers

async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);

  const res = await fetch("/api/...", {
    method: "POST",
    body: JSON.stringify(Object.fromEntries(fd)),
  });

  const data = await res.json();

  // Handle: 429 (rate limit), 400 (validation), 402 (plan limit), 200 (success)
  if (!res.ok) {
    // Show field errors from data.details or data.error
  }
}
```

### Key Points

- **FormData API** works with all input types (text, file, checkbox, etc.)
- **Always handle 429, 400, 402 separately** from 200 (success)
- **Show field-level errors** from `data.details` object
- **Use disabled submit button** during `isSubmitting` state
- **Accessibility:** each input needs `<label htmlFor="id">` + aria attributes

---

## 7. Write a Test for an API Route

**When to use:** Unit testing route handlers, services, or middleware

**Files involved:** `src/app/api/[route]/__tests__/route.test.ts`

**Key imports:** `describe`, `it`, `beforeEach`, `vi` from vitest, `NextRequest`

**Canonical examples:**

- Route with mocked dependencies: `src/app/api/auth/__tests__/route.test.ts`
- AI endpoint tests: `src/app/api/ai/bio-optimizer/__tests__/route.test.ts`
- Queue tests: `src/lib/queue/__tests__/processors.integration.test.ts`

### Key Pattern

```typescript
// 1. Hoist vi.fn() BEFORE vi.mock()
const mockFn = vi.hoisted(() => ({ fn: vi.fn() }));

// 2. Mock external deps
vi.mock("@/lib/db", () => ({ db: { ... } }));

describe("Route Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Reset mocks before each test
    // Set default return values
  });

  it("should succeed with valid input", async () => {
    const req = new NextRequest("http://localhost/api/...", {
      method: "POST",
      body: JSON.stringify({ ... }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
```

### Key Points

- **Use vi.hoisted()** before vi.mock() to capture mock functions
- **vi.clearAllMocks()** in beforeEach to prevent test pollution
- **Arrange-Act-Assert pattern** for test structure
- **Mock NextRequest** for request testing (method, body, headers)
- **Test both success AND error paths** (400, 401, 403, 402, 500, etc.)

---

## 8. Add Database Indexes

**When to use:** Improving query performance on frequently filtered/sorted columns

**Files involved:** `src/lib/schema.ts`

**Key imports:** `index()` from drizzle-orm

**Canonical example:** `src/lib/schema.ts` (see user table, posts table indexes)

### Key Pattern

```typescript
export const posts = pgTable(
  "posts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    status: text("status").default("draft"),
  },
  (table) => ({
    userIdIdx: index("posts_user_id_idx").on(table.userId),
    createdAtIdx: index("posts_created_at_idx").on(table.createdAt),
    compositeIdx: index("posts_user_status_idx").on(table.userId, table.status),
  })
);
```

### Key Points

- **Index columns used in WHERE, ORDER BY, JOIN** conditions
- **Composite indexes** for queries filtering on multiple columns
- **After adding index:** run `pnpm db:migrate` to apply to database
- **Check Postgres EXPLAIN** to verify index usage
- **Don't over-index** — each index slows writes slightly

---

## 9. Record AI Usage for Billing

**When to use:** Tracking token consumption for quota + billing calculations

**Files involved:** `src/lib/services/ai-quota.ts`, any AI route handler

**Key imports:** `recordAiUsage` from `@/lib/services/ai-quota`

**Canonical example:** `src/app/api/ai/bio-optimizer/route.ts` (around line 85)

### Key Pattern

```typescript
// After AI generation succeeds
const { object, usage } = await generateObject({ ... });

// Record tokens for quota + billing
await recordAiUsage(
  session.user.id,       // User who triggered it
  "feature_name",         // e.g., "bio_optimizer", "thread_generator"
  usage.totalTokens ?? 0, // Tokens consumed
  prompt,                 // Prompt sent (for auditing)
  object,                 // Response (optional, for context)
  language                // Any extra context
);
```

### Key Points

- **Fire-and-forget** — don't await, place after successful generation
- **Feature name** must match quota gate names (e.g., `checkBioOptimizerAccessDetailed`)
- **Always pass totalTokens** (fallback to 0 if missing)
- **Usage is tied to user + feature** — enables per-feature quota limits
- **Billing runs nightly** (cron job sums daily usage per plan)

---

## 10. Handle Errors in API Routes

**When to use:** Catching and returning errors from failed operations

**Files involved:** Any route handler

**Key imports:** `ApiError`, `logger`, proper HTTP status codes

**Canonical example:** `src/app/api/posts/route.ts` (try-catch blocks)

### Error Response Format

All errors follow this structure:

```json
{
  "error": "Human-readable message",
  "details": [{ "path": "fieldName", "message": "Validation failed" }]
}
```

### Key Pattern

```typescript
// ❌ WRONG
if (!isValid) return new Response(JSON.stringify({ error: "..." }), { status: 400 });

// ✅ RIGHT
if (!isValid) return ApiError.badRequest("Invalid input");

// For validation details:
return ApiError.badRequest(zodError.issues);
```

### Logging Pattern

```typescript
logger.info("event_name", {
  correlationId,
  userId,
  postId,
  status: "success",
});

logger.error("event_failed", {
  correlationId,
  userId,
  error: err.message,
  stack: err.stack, // Only for errors
});
```

### Key Points

- **Use ApiError.\*() methods** — never raw Response/NextResponse.json()
- **Include correlationId in every log** — links API logs to queue jobs
- **Never expose stack traces to clients** — return generic message
- **Validate BEFORE expensive operations** — fail fast on 400
- **Return appropriate HTTP codes** — 400, 401, 403, 404, 409, 422, 500
- **Log all errors** — structured fields (userId, resourceId, etc.)

---

_For the complete 9-step API route checklist, see CLAUDE.md. For complex patterns, search the codebase or check rule files in `.claude/rules/`._
