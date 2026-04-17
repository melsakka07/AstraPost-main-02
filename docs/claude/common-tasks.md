# Common Task Patterns

## 1. Create an AI Endpoint

**When to use:** Building a new AI generation feature (bio, threads, hashtags, etc.)

**Files involved:** `src/app/api/ai/[feature]/route.ts`, `src/lib/schemas/common.ts` (for shared Zod schemas)

**Key imports:** `aiPreamble`, `recordAiUsage`, `generateObject` or `streamText` from `ai`, `getCorrelationId`

### Code Example

```typescript
import { headers } from "next/headers";
import { generateObject } from "ai"; // or streamText for streaming
import { z } from "zod";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { checkBioOptimizerAccessDetailed } from "@/lib/middleware/require-plan";
import { recordAiUsage } from "@/lib/services/ai-quota";

const requestSchema = z.object({
  topic: z.string().min(1).max(500),
  language: z.string().default("en"),
});

const outputSchema = z.object({
  variants: z.array(
    z.object({
      text: z.string(),
      rationale: z.string(),
    })
  ),
});

export async function POST(req: Request) {
  try {
    // 1. Get correlation ID for tracing
    const correlationId = getCorrelationId(req);

    // 2. Run aiPreamble() — handles session, plan check, rate limit, quota, model instantiation
    const preamble = await aiPreamble({ featureGate: checkBioOptimizerAccessDetailed });
    if (preamble instanceof Response) return preamble; // Early return on auth/plan/quota failures
    const { session, model } = preamble;

    // 3. Parse and validate request
    const json = await req.json();
    const result = requestSchema.safeParse(json);
    if (!result.success) {
      return ApiError.badRequest(result.error.issues);
    }

    const { topic, language } = result.data;

    // 4. Build prompt and generate with AI
    const prompt = `Generate 3 variants for: ${topic}. Language: ${language}`;
    let object, usage;
    try {
      const gen = await generateObject({
        model,
        schema: outputSchema,
        prompt,
      });
      object = gen.object;
      usage = gen.usage;
    } catch (err: any) {
      // Fallback to cheaper model if primary is rate-limited
      if (err?.statusCode === 429 && preamble.fallbackModel) {
        logger.warn("ai_primary_model_rate_limited", { fallback: true, userId: session.user.id });
        const gen = await generateObject({
          model: preamble.fallbackModel,
          schema: outputSchema,
          prompt,
        });
        object = gen.object;
        usage = gen.usage;
      } else {
        throw err;
      }
    }

    // 5. Record usage for billing
    await recordAiUsage(
      session.user.id,
      "bio_optimizer",
      usage?.totalTokens ?? 0,
      prompt,
      object,
      language
    );

    // 6. Return response with correlation ID
    const res = Response.json(object);
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("bio_generation_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to generate variants");
  }
}
```

### Key Points

- **aiPreamble() runs checks in order**: session → user → rate-limit → feature-gate → AI quota → model instantiation
- **Always call recordAiUsage()** after generation for billing tracking (fire-and-forget)
- **Use correlation ID** in logs and response headers for tracing across systems
- **Fallback model handling** prevents timeouts when primary model is overloaded
- **Never hardcode model names** — use `process.env.OPENROUTER_MODEL!` via aiPreamble
- **Error handling** uses `ApiError.*()`, never raw `Response` or `NextResponse.json()`

### Related Tasks

- Add a Plan Gate to a Route (step 2 above uses feature gates)
- Record AI Usage for Billing (step 5 above)
- Handle Errors in API Routes

---

## 2. Create an Admin Page

**When to use:** Building a dashboard page for admin-only features (stats, queue monitoring, user management)

**Files involved:** `src/app/admin/[page]/page.tsx`, `src/components/dashboard/sidebar.tsx`

**Key imports:** `requireAdmin` from `@/lib/admin`, admin-specific UI components

### Code Example

```typescript
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { count } from "drizzle-orm";

// Server Component with requireAdmin guard (redirects to /login if not admin)
export default async function AdminStatsPage() {
  await requireAdmin(); // Throws redirect if unauthorized

  // Now safe to fetch admin-only data
  const [totalUsersResult] = await db
    .select({ value: count(user.id) })
    .from(user);

  const totalUsers = totalUsersResult?.value ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Stats</h1>
        <p className="text-muted-foreground">Platform metrics and monitoring</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### Adding to Sidebar

Edit `src/components/dashboard/sidebar.tsx`:

```typescript
const navigationItems = [
  {
    section: "Admin",
    items: [
      { icon: BarChart3, label: "Stats", href: "/admin/stats", isAdmin: true },
      { icon: ListChecks, label: "Jobs", href: "/admin/jobs", isAdmin: true },
    ],
    // isAdmin: true on section shows only for admin users
  },
];
```

### Key Points

- **requireAdmin()** is a Server Component guard that redirects unauthorized users to `/login`
- **Never use `"use client"`** on admin pages — they're Server Components
- **Must add sidebar entry** with `isAdmin: true` so it only shows for admins
- For **API routes**, use `requireAdminApi()` instead which returns a response object
- Admin pages redirect automatically; API routes must check `admin.ok` and return `admin.response`

### Related Tasks

- Adding a new dashboard page (similar pattern, but without `isAdmin` guard)

---

## 3. Enqueue a Queue Job

**When to use:** Publishing posts, processing analytics, or other async background work after saving to database

**Files involved:** `src/app/api/[route]/route.ts`, `src/lib/queue/client.ts`

**Key imports:** `scheduleQueue`, `analyticsQueue`, `SCHEDULE_JOB_OPTIONS` from `@/lib/queue/client`

### Code Example

```typescript
import { db } from "@/lib/db";
import { posts } from "@/lib/schema";
import { scheduleQueue, SCHEDULE_JOB_OPTIONS } from "@/lib/queue/client";
import { getCorrelationId } from "@/lib/correlation";

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);

  // 1. Perform all database writes inside a transaction
  const createdPostIds: string[] = [];
  await db.transaction(async (tx) => {
    // Multi-table insert — use transaction to prevent orphaned records
    const result = await tx
      .insert(posts)
      .values([
        {
          id: "post-1",
          userId: "user-1",
          status: "scheduled",
          scheduledAt: new Date(),
          // ... other fields
        },
      ])
      .returning({ id: posts.id });
    createdPostIds.push(...result.map((r) => r.id));
  });

  // 2. Enqueue jobs AFTER transaction commits (never inside)
  // Jobs are fire-and-forget; if Redis fails, posts still exist and can be retried
  const queueJobs = createdPostIds.map((postId) =>
    scheduleQueue.add(
      "publish-post", // job name
      {
        postId,
        userId: "user-1",
        correlationId, // Always include for end-to-end tracing
      },
      {
        ...SCHEDULE_JOB_OPTIONS, // Built-in: attempts:5, exponential backoff
        delay: 0, // milliseconds until job runs (0 = ASAP)
        jobId: postId, // Idempotency: same jobId prevents duplicates
      }
    )
  );

  try {
    await Promise.all(queueJobs);
  } catch (error) {
    // Log Redis error but don't fail the request — posts are already saved
    logger.error("queue_enqueue_failed", {
      postIds: createdPostIds,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return Response.json({ success: true, postIds: createdPostIds });
}
```

### Key Points

- **ALWAYS enqueue AFTER db.transaction()** — never inside the transaction block
- **Job payload must include correlationId** for tracing across systems
- **Include jobId for idempotency** — prevents duplicate queue entries if request retries
- **Use SCHEDULE_JOB_OPTIONS** — never inline retry config or BackoffStrategy
- **Wrap enqueue in try/catch** so Redis outages don't discard already-saved data
- **Correlation ID** ties together API request → database write → queue job → worker processing

### Related Tasks

- Record AI Usage for Billing (similar pattern, but fire-and-forget with no await)

---

## 4. Add a Route-Level Rate Limit

**When to use:** Protecting expensive endpoints from abuse (AI generation, bulk operations, auth attempts)

**Files involved:** `src/app/api/[route]/route.ts`

**Key imports:** `checkRateLimit`, `createRateLimitResponse` from `@/lib/rate-limiter`

### Code Example

```typescript
import { getTeamContext } from "@/lib/team-context";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

export async function POST(req: Request) {
  const ctx = await getTeamContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  // 1. Fetch user's plan from database
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, ctx.currentTeamId),
    columns: { plan: true },
  });

  // 2. Check rate limit BEFORE expensive operations
  const rlResult = await checkRateLimit(
    ctx.currentTeamId, // User ID (scoped per user)
    dbUser?.plan || "free", // Plan tier (free/pro/agency)
    "ai_image" // Type: ai | ai_image | posts | media | auth | tweet_lookup | contact
  );

  if (!rlResult.success) {
    // Returns 429 with Retry-After header
    return createRateLimitResponse(rlResult);
  }

  // 3. Safe to proceed with expensive operation
  // ... process the request ...

  return Response.json({ success: true });
}
```

### Rate Limit Tiers

Limits are plan-based and defined in `src/lib/rate-limiter.ts`:

```typescript
RATE_LIMITS = {
  free: { ai: { limit: 20, window: 3600 }, ai_image: { limit: 10, window: 60 } },
  pro: { ai: { limit: 200, window: 3600 }, ai_image: { limit: 30, window: 60 } },
  agency: { ai: { limit: 1000, window: 3600 }, ai_image: { limit: 60, window: 60 } },
};
```

### Key Points

- **Check BEFORE expensive operations** — after validation, before AI/API calls
- **Cost-sensitive endpoints** (ai, ai_image, tweet_lookup) fail CLOSED if Redis is unavailable (safer than allowing unbounded API charges)
- **Low-cost endpoints** (posts, media) fail OPEN during Redis outages so core scheduling isn't blocked
- **Rate limit is per-user, per-type** — same user has independent limits for "ai" vs "posts"
- **Retry-After header** is automatically set by `createRateLimitResponse()`

### Related Tasks

- Create an API Route with Auth Checks (rate limit is step 5)

---

## 5. Add a Plan Gate to a Route

**When to use:** Restricting features to specific plan tiers (e.g., AI only for Pro+, viral score for Agency)

**Files involved:** `src/app/api/[route]/route.ts`

**Key imports:** `checkPostLimitDetailed`, `checkAiQuotaDetailed`, etc. from `@/lib/middleware/require-plan`

### Code Example

```typescript
import { checkPostLimitDetailed, createPlanLimitResponse } from "@/lib/middleware/require-plan";
import { ApiError } from "@/lib/api/errors";
import { getTeamContext } from "@/lib/team-context";

export async function POST(req: Request) {
  const ctx = await getTeamContext();
  if (!ctx) return ApiError.unauthorized();

  // 1. Parse request first
  const json = await req.json();
  const result = createPostSchema.safeParse(json);
  if (!result.success) return ApiError.badRequest(result.error.issues);

  const { accounts, content } = result.data;

  // 2. Check plan gate AFTER parsing, BEFORE expensive operations
  const postLimit = await checkPostLimitDetailed(
    ctx.currentTeamId, // User ID
    accounts.length // Count of resources being created
  );

  if (!postLimit.allowed) {
    // Returns 402 Payment Required with upgrade_url, suggested_plan, etc.
    return createPlanLimitResponse(postLimit);
  }

  // 3. Safe to proceed — user has sufficient quota for this action
  // ... save posts to database ...

  return Response.json({ success: true });
}
```

### Available Gate Helpers

All return `{ allowed: true } | PlanGateFailure`:

- **Feature gates**: `checkAgenticPostingAccessDetailed()`, `checkViralScoreAccessDetailed()`, `checkVariantGeneratorAccessDetailed()`
- **Quota gates**: `checkPostLimitDetailed(userId, count)`, `checkAiQuotaDetailed(userId)`, `checkAiImageQuotaDetailed(userId)`

### 402 Response Structure

When gate fails, `createPlanLimitResponse()` returns:

```json
{
  "error": "Feature not available on your plan",
  "upgrade_url": "https://astrapost.com/billing",
  "suggested_plan": "pro_monthly",
  "trial_active": false,
  "reset_at": "2026-05-01T00:00:00Z"
}
```

### Key Points

- **Never call getPlanLimits() directly** in route handlers — use gate helpers from `require-plan.ts` only
- **Gates check both feature availability AND quota** (e.g., "Pro users get 500 posts/hour, and you've used 480")
- **Return 402, not 403** when a feature is gated — tells client to upgrade, not just "forbidden"
- **Include reset_at** so client knows when quota resets (useful for UX messaging)
- **Trial users automatically get Pro limits** for 14 days — no special handling needed

### Related Tasks

- Create an AI Endpoint (uses plan gates within `aiPreamble()`)
- Add a Route-Level Rate Limit (complementary: rate limit is about request frequency, plan gates are about feature access)

---

## 6. Create a Form with Validation

**When to use:** Building user-facing forms with client-side React and server-side API validation

**Files involved:** `src/components/[feature]/[form-name].tsx`, `src/app/api/[route]/route.ts`

**Key imports:** `useState`, `FormData`, `aria-*` for accessibility

### Code Example

```typescript
"use client"; // Required — uses useState and event handlers

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormState = "idle" | "submitting" | "success" | "error";

interface FieldErrors {
  [key: string]: string[] | undefined;
}

export function ContactForm() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState("submitting");
    setFieldErrors({});
    setErrorMessage(null);

    // 1. Extract form data using FormData API (works with any input type)
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      message: fd.get("message") as string,
    };

    try {
      // 2. Send to API endpoint
      const res = await fetch("/api/community/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        details?: FieldErrors;
      };

      // 3. Handle rate limit (429)
      if (res.status === 429) {
        setErrorMessage("Too many submissions. Please wait before trying again.");
        setFormState("error");
        return;
      }

      // 4. Handle validation errors (400) and other failures
      if (!res.ok || !data.success) {
        if (data.details) setFieldErrors(data.details);
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        setFormState("error");
        return;
      }

      // 5. Success
      setFormState("success");
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
      setFormState("error");
    }
  }

  const isSubmitting = formState === "submitting";

  if (formState === "success") {
    return (
      <div className="text-center">
        <h3 className="text-xl font-semibold">Message sent!</h3>
        <p className="text-muted-foreground text-sm">We'll reply within 1-2 business days.</p>
        <Button onClick={() => setFormState("idle")}>Send another message</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Name field with error display and accessibility */}
      <div className="space-y-2">
        <Label htmlFor="form-name">Your name</Label>
        <Input
          id="form-name"
          name="name"
          required
          minLength={2}
          maxLength={100}
          disabled={isSubmitting}
          aria-describedby={fieldErrors.name ? "form-name-error" : undefined}
          aria-invalid={!!fieldErrors.name}
        />
        {fieldErrors.name && (
          <p id="form-name-error" role="alert" className="text-destructive text-xs">
            {fieldErrors.name[0]}
          </p>
        )}
      </div>

      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="form-email">Email</Label>
        <Input
          id="form-email"
          name="email"
          type="email"
          required
          disabled={isSubmitting}
          aria-describedby={fieldErrors.email ? "form-email-error" : undefined}
          aria-invalid={!!fieldErrors.email}
        />
        {fieldErrors.email && (
          <p id="form-email-error" role="alert" className="text-destructive text-xs">
            {fieldErrors.email[0]}
          </p>
        )}
      </div>

      {/* Message field */}
      <div className="space-y-2">
        <Label htmlFor="form-message">Message</Label>
        <Textarea
          id="form-message"
          name="message"
          required
          minLength={20}
          maxLength={2000}
          rows={5}
          disabled={isSubmitting}
          aria-describedby={fieldErrors.message ? "form-message-error" : undefined}
          aria-invalid={!!fieldErrors.message}
        />
        {fieldErrors.message && (
          <p id="form-message-error" role="alert" className="text-destructive text-xs">
            {fieldErrors.message[0]}
          </p>
        )}
      </div>

      {/* Global error message */}
      {errorMessage && (
        <p role="alert" aria-live="polite" className="text-destructive text-sm">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Send Message
          </>
        )}
      </Button>
    </form>
  );
}
```

### Server-Side Validation (API Route)

```typescript
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  message: z.string().min(20).max(2000),
});

export async function POST(req: Request) {
  const json = await req.json();
  const result = contactSchema.safeParse(json);

  if (!result.success) {
    // Return validation errors in a format the form can display
    return Response.json(
      {
        success: false,
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  // ... process submission ...
  return Response.json({ success: true });
}
```

### Key Points

- **"use client" is required** — component uses `useState` and form event handlers
- **Use FormData API** — works with all input types and is standard HTML
- **aria-\* attributes** — screen readers announce field validity and error messages
- **Display field errors** with `details: result.error.flatten().fieldErrors` from server
- **Handle rate limits** (429) separately from validation errors (400)
- **Disable submit button while submitting** — prevents duplicate submissions
- **Success state** shows confirmation message with option to submit again

### Related Tasks

- Add a Route-Level Rate Limit (handles 429 responses)
- Handle Errors in API Routes (validation error handling)

---

## 7. Write a Test for an API Route

**When to use:** Testing API routes with mocked database, auth, and services

**Files involved:** `src/app/api/[route]/__tests__/route.test.ts` or `__tests__/` directory

**Key imports:** `describe`, `it`, `beforeEach`, `vi` from `vitest`, NextRequest mock

### Code Example

```typescript
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { recordAiUsage } from "@/lib/services/ai-quota";
import { POST } from "../route"; // Import the route handler

// 1. Mock external dependencies
// Use vi.hoisted() BEFORE vi.mock() to capture values at module init time
const { mockFindFirst } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
}));

vi.mock("@/lib/api/ai-preamble", () => ({
  aiPreamble: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      xAccounts: {
        findFirst: mockFindFirst,
      },
    },
  },
}));

vi.mock("@/lib/services/ai-quota", () => ({
  recordAiUsage: vi.fn(),
}));

vi.mock("ai", () => ({
  generateObject: vi.fn().mockResolvedValue({
    object: { variants: [{ text: "Test bio", rationale: "Concise" }] },
    usage: { totalTokens: 10 },
  }),
}));

describe("Bio Optimizer API", () => {
  beforeEach(() => {
    // 2. Reset all mocks before each test
    vi.clearAllMocks();

    // 3. Set default mock return values
    (aiPreamble as any).mockResolvedValue({
      session: { user: { id: "user-1", email: "test@example.com" } },
      dbUser: { plan: "pro_monthly" },
      model: {}, // Mock model
    });
    mockFindFirst.mockResolvedValue({ xUsername: "testuser" });
  });

  describe("POST /api/ai/bio", () => {
    it("should generate bio variants for pro users", async () => {
      // Arrange
      const req = new NextRequest("http://localhost/api/ai/bio", {
        method: "POST",
        body: JSON.stringify({
          currentBio: "Software developer",
          goal: "gain_followers",
          language: "en",
        }),
      });

      // Act
      const res = await POST(req);
      const data = await res.json();

      // Assert
      expect(res.status).toBe(200);
      expect(data.variants).toHaveLength(1);
      expect(recordAiUsage).toHaveBeenCalledWith(
        "user-1",
        "bio_optimizer",
        10,
        expect.any(String),
        expect.any(Object),
        "en"
      );
    });

    it("should return 400 for invalid input", async () => {
      const req = new NextRequest("http://localhost/api/ai/bio", {
        method: "POST",
        body: JSON.stringify({ currentBio: "" }), // Missing required fields
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(res.headers.get("content-type")).toContain("application/json");
    });

    it("should return 402 if user exceeds quota", async () => {
      // 4. Override default mock for this specific test
      (aiPreamble as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Quota exceeded" }), { status: 402 })
      );

      const req = new NextRequest("http://localhost/api/ai/bio", {
        method: "POST",
        body: JSON.stringify({ currentBio: "Test", goal: "general" }),
      });

      const res = await POST(req);

      expect(res.status).toBe(402);
    });

    it("should return 401 if aiPreamble fails auth", async () => {
      (aiPreamble as any).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      );

      const req = new NextRequest("http://localhost/api/ai/bio", {
        method: "POST",
        body: JSON.stringify({ currentBio: "Test", goal: "general" }),
      });

      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });
});
```

### Test Structure

```typescript
describe("Route Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Reset before each test
  });

  it("should [specific behavior]", async () => {
    // Arrange: set up test data and mocks
    const req = new NextRequest("http://localhost/api/endpoint", {
      method: "POST",
      body: JSON.stringify({
        /* test data */
      }),
    });

    // Act: call the route handler
    const res = await handler(req);

    // Assert: verify response status, body, and mock calls
    expect(res.status).toBe(200);
    expect(mockFunction).toHaveBeenCalledWith(expectedArgs);
  });
});
```

### Key Points

- **vi.hoisted() must come before vi.mock()** — order matters
- **vi.clearAllMocks() in beforeEach** — prevents test pollution
- **Mock database queries** — never hit real database in unit tests
- **Mock external services** — aiPreamble, recordAiUsage, AI generation (ai/generateObject)
- **Test both success and error paths** — 200, 400, 401, 402, 500, etc.
- **Use NextRequest** — Next.js's native request object for route handlers
- **Mock return values with .mockResolvedValue()** for async functions

### Related Tasks

- Create an API Route with Auth Checks (tests follow this pattern)
- Handle Errors in API Routes (tests validate error responses)

---

## 8. Add Database Indexes

**When to use:** Optimizing slow queries after identifying performance bottlenecks with `EXPLAIN ANALYZE`

**Files involved:** `src/lib/schema.ts`, `drizzle/migrations/*.sql`

**Key imports:** `.index()` from `drizzle-orm`

### Code Example

In `src/lib/schema.ts`, add indexes to frequently-queried columns:

```typescript
import { index, text, timestamp, boolean, pgTable } from "drizzle-orm/pg-core";

export const posts = pgTable(
  "posts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    status: text("status").notNull(), // "draft" | "scheduled" | "published"
    scheduledAt: timestamp("scheduled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    // ... other columns
  },
  (table) => ({
    // Single-column index: frequently filtered by userId
    userIdIdx: index("posts_user_id_idx").on(table.userId),

    // Composite index: find user's published posts scheduled after a date
    // Helps queries with WHERE userId = ? AND status = 'published' AND scheduledAt > ?
    userStatusScheduledIdx: index("posts_user_status_scheduled_idx")
      .on(table.userId, table.status, table.scheduledAt)
      .where(eq(table.status, "scheduled")), // Partial index: only scheduled posts

    // Composite index for sorting + filtering
    userCreatedIdx: index("posts_user_created_idx").on(table.userId, table.createdAt),
  })
);
```

### Generating Migration

```bash
pnpm db:generate
```

This creates a migration file in `drizzle/migrations/` with:

```sql
CREATE INDEX "posts_user_id_idx" ON "posts" ("user_id");
CREATE INDEX "posts_user_status_scheduled_idx" ON "posts" ("user_id", "status", "scheduled_at")
  WHERE "status" = 'scheduled';
CREATE INDEX "posts_user_created_idx" ON "posts" ("user_id", "created_at");
```

### Testing Index Performance

Before applying:

```sql
EXPLAIN ANALYZE
SELECT * FROM posts WHERE user_id = 'user-1' AND status = 'scheduled' AND scheduled_at > NOW();
```

After applying (should use IndexScan instead of SeqScan):

```
Index Scan using posts_user_status_scheduled_idx on posts
  Index Cond: (user_id = 'user-1'::text)
  Filter: (scheduled_at > now())
  Actual rows: 15
```

### Index Design Rules

- **Single-column indexes** for simple WHERE clauses: `WHERE userId = ?`
- **Composite indexes** for multi-column filtering: `WHERE userId = ? AND status = ?`
- **Column order matters** — most selective first (e.g., `userId` before `status` before `scheduledAt`)
- **Partial indexes** for filtered data: `.where(eq(table.status, 'scheduled'))` only indexes relevant rows
- **Avoid over-indexing** — each index slows writes; typically 3-5 per table is enough

### Key Points

- **Index creation doesn't require migration runs** — Drizzle applies to schema; SQL migrations go to production
- **Test before/after with EXPLAIN ANALYZE** — verify index actually improves query time
- **Monitor slow query logs** — use `pg_stat_statements` to find bottlenecks
- **Composite indexes replace single-column ones** — `(userId, status)` helps both `WHERE userId = ?` and `WHERE userId = ? AND status = ?`

### Related Tasks

- Database schema changes (indexes are part of schema.ts)

---

## 9. Record AI Usage for Billing

**When to use:** Tracking token consumption after AI generation for accurate billing (every AI endpoint must call this)

**Files involved:** `src/app/api/ai/[feature]/route.ts`

**Key imports:** `recordAiUsage` from `@/lib/services/ai-quota`

### Code Example

```typescript
import { recordAiUsage } from "@/lib/services/ai-quota";
import { generateObject } from "ai";

export async function POST(req: Request) {
  const { session, model } = await aiPreamble();

  // ... generate content ...
  const { object, usage } = await generateObject({
    model,
    schema: outputSchema,
    prompt,
  });

  // MANDATORY: Record usage after every generation
  // Fire-and-forget (no await) — non-blocking, but ensure it's queued
  recordAiUsage(
    session.user.id, // User ID for billing attribution
    "bio_optimizer", // Feature name: "thread", "bio", "hashtags", "translate", "inspire", "variant_generator", "image", etc.
    usage?.totalTokens ?? 0, // Total tokens consumed (input + output)
    prompt, // Prompt sent to model (logged for auditing)
    object, // Generated response (logged for auditing)
    language // Optional: language used (if applicable)
  );

  return Response.json(object);
}
```

### Fire-and-Forget Pattern (Non-Blocking)

```typescript
// ❌ WRONG: Awaiting recordAiUsage blocks response
await recordAiUsage(session.user.id, "bio_optimizer", usage.totalTokens, prompt, object);
return Response.json(object);

// ✅ RIGHT: Fire-and-forget (function enqueues async job, returns immediately)
recordAiUsage(session.user.id, "bio_optimizer", usage.totalTokens, prompt, object);
return Response.json(object);
```

### Usage Tracking Function Signature

```typescript
async function recordAiUsage(
  userId: string,
  feature: string,
  totalTokens: number,
  prompt: string,
  output: any,
  language?: string
): Promise<void>;
```

### Feature Names (Standard Enum)

Common feature names for categorizing usage:

```
"thread", "bio", "hashtags", "translate", "inspire",
"variant_generator", "image", "affiliate", "tools", "chat", "agentic"
```

### Key Points

- **ALWAYS call recordAiUsage()** after generation — missing this breaks billing tracking
- **Don't await — fire-and-forget pattern** — keeps API response fast
- **Include totalTokens** — used to calculate cost per user
- **Prompt and output are logged** — useful for auditing and replay
- **Feature name is standardized** — used to categorize costs per feature
- **Language is optional** — but include it for multi-language features to track usage by language

### Related Tasks

- Create an AI Endpoint (includes recordAiUsage call in step 5)

---

## 10. Handle Errors in API Routes

**When to use:** Returning consistent, structured error responses across all API endpoints

**Files involved:** `src/app/api/[route]/route.ts`

**Key imports:** `ApiError` from `@/lib/api/errors`, `logger` from `@/lib/logger`

### Code Example

```typescript
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { getCorrelationId } from "@/lib/correlation";

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);

  try {
    const ctx = await getTeamContext();
    if (!ctx) {
      // 1. Unauthorized — missing or invalid session
      return ApiError.unauthorized();
    }

    // 2. Forbidden — user lacks permission (e.g., viewers cannot create)
    if (ctx.role === "viewer") {
      return ApiError.forbidden("Viewers cannot create posts");
    }

    const json = await req.json();
    const result = createPostSchema.safeParse(json);

    // 3. Bad request — validation failed
    if (!result.success) {
      return ApiError.badRequest(result.error.issues);
    }

    // 4. Not found — resource doesn't exist
    const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (!post) {
      return ApiError.notFound("Post not found");
    }

    // 5. Conflict — state conflict (e.g., can't publish draft that's already published)
    if (post.status === "published") {
      return ApiError.conflict("This post is already published");
    }

    // ... business logic ...

    // 6. Internal server error — unexpected exception
    return Response.json({ success: true });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // 7. Log all errors with correlation ID for tracing
    logger.error("api_error", {
      route: "/api/posts",
      method: "POST",
      correlationId,
      userId: ctx?.currentTeamId,
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // 8. Return generic error to client (never expose stack traces)
    return ApiError.internal("An unexpected error occurred");
  }
}
```

### ApiError Methods Reference

All return a `Response` object with appropriate status code:

```typescript
// 400 Bad Request — validation/format errors
ApiError.badRequest("Invalid email format");
ApiError.badRequest(zodIssues); // Pass Zod validation issues directly

// 401 Unauthorized — missing/invalid session
ApiError.unauthorized();

// 403 Forbidden — user lacks permission
ApiError.forbidden("Editors cannot delete posts");

// 404 Not Found — resource doesn't exist
ApiError.notFound("Post #123 not found");

// 409 Conflict — state conflict
ApiError.conflict("This post is already published");

// 422 Unprocessable Entity — business logic error
ApiError.unprocessableEntity("Cannot schedule posts in the past");

// 429 Too Many Requests — rate limited (use createRateLimitResponse instead)

// 500 Internal Server Error — unexpected server error
ApiError.internal("Failed to process request");
```

### Never Use Raw Response

```typescript
// ❌ WRONG: Raw Response/NextResponse
return new Response(JSON.stringify({ error: "Invalid" }), { status: 400 });
return NextResponse.json({ error: "Invalid" }, { status: 400 });
return Response.json({ error: "Invalid" }, { status: 400 }); // No JSON structure!

// ✅ RIGHT: Use ApiError
return ApiError.badRequest("Invalid input");
```

### Logging Pattern

```typescript
logger.info("event_name", {
  correlationId, // For tracing across systems
  userId, // User performing action
  postId, // Resource ID (if applicable)
  status: "success",
});

logger.warn("event_name", {
  correlationId,
  userId,
  warning: "Post is old and may have reduced engagement",
});

logger.error("event_name", {
  correlationId,
  userId,
  error: errorMsg,
  stack: error.stack, // Only for errors
});
```

### Error Response Format

All errors follow this structure:

```json
{
  "error": "Validation failed",
  "details": [{ "path": "email", "message": "Invalid email format" }]
}
```

### Key Points

- **Use ApiError.\* methods** — never raw Response/NextResponse
- **Include correlationId in logs** — links API logs to queue jobs and AI processing
- **Never expose stack traces to clients** — return generic "An unexpected error occurred" message
- **Log all errors** — structured logging with context (userId, resourceId, etc.)
- **Validate BEFORE expensive operations** — bad request should fail fast
- **Return appropriate HTTP status codes** — 400, 401, 403, 404, 409, 422, 500, etc.

### Related Tasks

- Create a Form with Validation (validation error handling)
- Create an AI Endpoint (error handling in try/catch)

---

## Quick Reference: Standard API Route Flow

1. **Auth** — `getTeamContext()` → check session
2. **Role check** — reject viewers on mutations
3. **Correlation ID** — `getCorrelationId(req)` for job-enqueuing or AI routes
4. **Parse + validate** — Zod `.safeParse()`, `ApiError.badRequest()` on failure
5. **Rate limit** — `checkRateLimit()` → `createRateLimitResponse()` on failure
6. **Plan gate** — `check*Detailed()` → `createPlanLimitResponse()` on failure (402)
7. **Business logic** — `db.transaction()` for multi-table writes
8. **Enqueue jobs** — AFTER transaction commits, never inside
9. **Return** — `Response.json({...})`, set `x-correlation-id` header when relevant

See `src/app/api/posts/route.ts` for canonical example.
