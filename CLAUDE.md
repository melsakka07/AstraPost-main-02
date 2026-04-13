# AstraPost - AI Social Media Manager for X (Twitter)

**MENA-focused** SaaS for scheduling tweets/threads, publishing via BullMQ worker, analytics, and AI content generation. Primary language: Arabic.

## Tech Stack

Next.js 16 (App Router), React 19, TypeScript, PostgreSQL 18 (pgvector), Drizzle ORM, BullMQ + Redis, shadcn/ui + Tailwind CSS 4, Better Auth (X OAuth 2.0 only), Stripe, Vercel AI SDK 5 + OpenRouter, Google Gemini, Replicate API

## First Steps

- Check `docs/0-MY-LATEST-UPDATES.md` for recent changes before starting work
- `pnpm run check` — lint + typecheck (run after ALL changes)
- `pnpm test` — Vitest unit tests
- Package manager: **pnpm** (not npm)

## Hard Rules (Never Break)

1. **Run `pnpm run check` before considering any task complete**
2. **Use OpenRouter, NOT OpenAI** — `import { openrouter } from "@openrouter/ai-sdk-provider"`
3. **Never hardcode AI model names** — env vars only: `OPENROUTER_MODEL!`, `REPLICATE_MODEL_FAST!`, `REPLICATE_MODEL_PRO!`, `REPLICATE_MODEL_FALLBACK!`
4. **Use `ApiError` from `@/lib/api/errors`** for all error responses — never inline `new Response(JSON.stringify(...))` or `NextResponse.json()`. Use `createPlanLimitResponse()` specifically for 402 plan-limit responses.
5. **Multi-table writes MUST use `db.transaction()`** — prevents orphaned records
6. **Never call `getPlanLimits()` in route handlers** — use `require-plan.ts` gate helpers only
7. **Every AI endpoint must call `recordAiUsage()`** for billing tracking
8. **Shared Zod schemas** go in `src/lib/schemas/common.ts`; shared enums in `src/lib/constants.ts`
9. **`exactOptionalPropertyTypes` is ON** — use `{...(val !== undefined && { prop: val })}` pattern, never `prop={maybeUndefined}`
10. **Polling `useEffect` MUST use `AbortController` + timeout + cleanup abort** — prevents connection leaks:
    ```typescript
    useEffect(() => {
      let active = true;
      const abortRef = { current: new AbortController() };
      const poll = async () => {
        abortRef.current.abort();
        abortRef.current = new AbortController();
        const timeout = setTimeout(() => abortRef.current.abort(), 8000);
        try {
          await fetchData({ signal: abortRef.current.signal });
        } finally {
          clearTimeout(timeout);
        }
        if (active) intervalRef.current = setTimeout(poll, 5000);
      };
      poll();
      return () => {
        active = false;
        abortRef.current.abort();
      };
    }, []);
    ```
11. **Never use `console.log` or `console.error`** — use `import { logger } from "@/lib/logger"` with structured fields
12. **Never use `NextResponse.json()`** — use `Response.json()` in route handlers
13. **Queue jobs must be enqueued AFTER `db.transaction()` commits** — never call `queue.add()` inside a transaction block

## Anti-Patterns (Never Do)

```typescript
// ✗ Raw Response with JSON
return new Response(JSON.stringify({ error: "..." }), { status: 400 });

// ✗ NextResponse
return NextResponse.json({ error: "..." }, { status: 400 });

// ✗ console in production code
console.log("debug:", data);

// ✗ Hardcoded model names
const model = openrouter("anthropic/claude-3.5-sonnet");

// ✗ getPlanLimits() in route handlers
const limits = getPlanLimits(user.plan);
if (data.length >= limits.maxPosts) { ... }

// ✗ Queue job inside transaction
await db.transaction(async (tx) => {
  await tx.insert(posts).values(row);
  await scheduleQueue.add("publish-post", { ... }); // WRONG — leaks if tx rolls back
});

// ✗ Manual type redeclaration
type Post = { id: string; content: string; ... };

// ✓ Correct equivalents
return ApiError.badRequest("Invalid input");
return createPlanLimitResponse(gateResult);  // 402 only
logger.info("event_name", { userId, postId });
const model = openrouter(process.env.OPENROUTER_MODEL!);
const gate = await checkPostLimitDetailed(userId, count);
if (!gate.allowed) return createPlanLimitResponse(gate);
// Queue AFTER transaction:
await db.transaction(async (tx) => { await tx.insert(posts).values(row); });
await scheduleQueue.add("publish-post", { ... });
type Post = typeof posts.$inferSelect;
```

## Definition of Done

1. `pnpm run check` passes (lint + typecheck)
2. `pnpm test` passes (unit tests)
3. New files follow existing patterns in the same directory
4. No new `any` types or `@ts-ignore` comments

## Auth & Session Patterns

Three patterns — choose based on context:

```typescript
// 1. User-facing routes → getTeamContext() (wraps session + team membership + role)
import { getTeamContext } from "@/lib/team-context";
const ctx = await getTeamContext();
if (!ctx) return new Response("Unauthorized", { status: 401 });
// ctx.currentTeamId  — workspace owner ID (use as userId for plan checks)
// ctx.role           — "owner" | "admin" | "editor" | "viewer"
// ctx.isOwner        — true if acting in personal workspace
// ctx.session        — full BetterAuth session
if (ctx.role === "viewer") return ApiError.forbidden("Viewers cannot create posts");

// 2. Admin API routes → requireAdminApi()
import { requireAdminApi } from "@/lib/admin";
const admin = await requireAdminApi();
if (!admin.ok) return admin.response; // 401 or 403 Response already built

// 3. Admin pages (RSC, redirects) → requireAdmin()
import { requireAdmin } from "@/lib/admin";
const session = await requireAdmin(); // redirects to /login or /dashboard

// 4. AI routes → use aiPreamble() which handles everything (see AI section)
```

**Plan info:** `user.plan` column (manual override, wins) + `subscriptions` table (Stripe). Trial users get Pro Monthly limits for 14 days — no special handling needed, plan gates handle it automatically.

## API Route Checklist

Standard flow — implement in this order:

```typescript
export async function POST(req: Request) {
  // 1. Auth
  const ctx = await getTeamContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  // 2. Role check (when mutation requires editor+)
  if (ctx.role === "viewer") return ApiError.forbidden("Viewers cannot perform this action");

  // 3. Correlation ID (for routes that enqueue jobs or touch AI)
  const correlationId = getCorrelationId(req);
  logger.info("posts_create", { correlationId, userId: ctx.currentTeamId });

  // 4. Parse + validate body
  const json = await req.json();
  const parsed = mySchema.safeParse(json);
  if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

  // 5. Rate limit (plan-aware, before expensive ops)
  const rl = await checkRateLimit(ctx.currentTeamId, dbUser?.plan ?? "free", "posts");
  if (!rl.success) return createRateLimitResponse(rl);

  // 6. Plan gate (quota or feature)
  const gate = await checkPostLimitDetailed(ctx.currentTeamId, parsed.data.count);
  if (!gate.allowed) return createPlanLimitResponse(gate);

  // 7. Business logic + db.transaction() for multi-table writes
  await db.transaction(async (tx) => { ... });

  // 8. Enqueue jobs AFTER transaction
  await scheduleQueue.add("publish-post", { postId, correlationId }, SCHEDULE_JOB_OPTIONS);

  // 9. Return response (set correlation ID header when relevant)
  const res = Response.json({ success: true });
  res.headers.set("x-correlation-id", correlationId);
  return res;
}
```

## Plan Gates Reference

**Import path:** `@/lib/middleware/require-plan`

```typescript
import {
  checkPostLimitDetailed,
  checkAiQuotaDetailed,
  checkAiImageQuotaDetailed,
  checkAccountLimitDetailed,
  checkBookmarkLimitDetailed,
  checkAnalyticsExportLimitDetailed,
  checkViralScoreAccessDetailed,
  checkBestTimesAccessDetailed,
  checkVoiceProfileAccessDetailed,
  checkContentCalendarAccessDetailed,
  checkUrlToThreadAccessDetailed,
  checkVariantGeneratorAccessDetailed,
  checkCompetitorAnalyzerAccessDetailed,
  checkReplyGeneratorAccessDetailed,
  checkBioOptimizerAccessDetailed,
  checkAgenticPostingAccessDetailed,
  checkInspirationAccessDetailed,
  checkLinkedinAccessDetailed,
  checkImageModelAccessDetailed,
  createPlanLimitResponse,
  type PlanGateResult,
} from "@/lib/middleware/require-plan";

// Boolean feature gate (Pro-only feature):
const access = await checkAgenticPostingAccessDetailed(userId);
if (!access.allowed) return createPlanLimitResponse(access); // 402

// Quota gate (monthly limit):
const gate = await checkPostLimitDetailed(userId, count);
if (!gate.allowed) return createPlanLimitResponse(gate); // 402

// createPlanLimitResponse() returns 402 with JSON:
// { error, code, feature, message, plan, limit, used, remaining,
//   upgrade_url, suggested_plan, trial_active, reset_at }
```

**Never call `getPlanLimits()` directly in route handlers** — only in services that already have the plan string and need the limits object for computation.

## Logging & Correlation IDs

```typescript
import { logger } from "@/lib/logger";
import { getCorrelationId } from "@/lib/correlation";

// logger API: debug | info | warn | error — always structured fields, no string concat
logger.info("posts_create_started", { userId, postCount: tweets.length, correlationId });
logger.error("queue_enqueue_failed", { error: err.message, postId, correlationId });

// getCorrelationId: reads "x-correlation-id" header or generates UUID
const correlationId = getCorrelationId(req);

// Flow: API → job payload → job_runs table
await scheduleQueue.add("publish-post", { postId, userId, correlationId }, SCHEDULE_JOB_OPTIONS);
// job_runs.correlationId stores it for observability

// Always return in response header for client-side tracing
res.headers.set("x-correlation-id", correlationId);
```

**Ban:** `console.log`, `console.warn`, `console.error` — all replaced by `logger.*`.  
**Exception:** `console.warn` for Resend/email not-configured degradation path in `services/email.ts`.

## AI Routes & Providers

### Providers

- **OpenRouter** (`@openrouter/ai-sdk-provider`): thread, translate, tools, affiliate, agentic, chat — model via `process.env.OPENROUTER_MODEL!`
- **Google Gemini** (`@ai-sdk/google`): inspiration — needs `GEMINI_API_KEY`
- **Replicate**: image generation — models via env vars
- Model mapping: `src/lib/services/ai-image.ts` → `startImageGeneration()`

### aiPreamble() — required for all AI generation routes

```typescript
import { aiPreamble } from "@/lib/api/ai-preamble";

// Standard AI route (quota-consuming):
const preamble = await aiPreamble();
if (preamble instanceof Response) return preamble;
const { session, dbUser, model } = preamble;

// Pro-only AI feature (e.g., variants, calendar, reply, bio):
const preamble = await aiPreamble({ featureGate: checkVariantGeneratorAccessDetailed });
if (preamble instanceof Response) return preamble;

// Custom access check, skip quota (e.g., viral score):
const preamble = await aiPreamble({
  customAiAccess: checkViralScoreAccessDetailed,
  skipQuotaCheck: true,
});
if (preamble instanceof Response) return preamble;
```

`aiPreamble()` runs: session → dbUser (plan + voiceProfile) → rate-limit → optional feature gate → AI access check → optional quota check → API key guard → model instantiation. Returns `Response` on any failure (caller returns it immediately).

### SSE Streaming

```typescript
const encoder = new TextEncoder();
const stream = new ReadableStream({
  async start(controller) {
    const send = (event: ProgressEvent) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    };
    try {
      await runPipeline({ onProgress: send });
      send({ step: "done", status: "complete", data: result });
    } catch (err) {
      send({ step: "done", status: "failed", data: { error: err.message } });
    } finally {
      controller.close();
    }
  },
});
return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Correlation-Id": correlationId,
  },
});
```

### AI Usage Recording (mandatory after every generation)

```typescript
import { recordAiUsage } from "@/lib/services/ai-quota";

await recordAiUsage(
  session.user.id,
  "thread", // type: "thread"|"bio"|"hashtags"|"translate"|"inspire"|"variant_generator"|"image"|...
  usage?.totalTokens ?? 0,
  prompt, // input string
  outputObject, // any output (will be JSON-serialized)
  language // optional: "en"|"ar"|...
);
```

## Database & Drizzle ORM Patterns

### Query Patterns

```typescript
import { db } from "@/lib/db";
import { eq, and, gte, ne, isNotNull, desc, asc, sql } from "drizzle-orm";
import { posts, tweets, user, xAccounts } from "@/lib/schema";

// Single record with relations
const post = await db.query.posts.findFirst({
  where: eq(posts.id, postId),
  with: {
    tweets: { orderBy: (t, { asc }) => [asc(t.position)], with: { media: true } },
    xAccount: true,
  },
  columns: { id: true, status: true, userId: true },  // Projection — always use when possible
});

// Multiple records
const accounts = await db.query.xAccounts.findMany({
  where: and(eq(xAccounts.userId, userId), eq(xAccounts.isActive, true)),
  orderBy: [desc(xAccounts.isDefault), asc(xAccounts.createdAt)],
});

// Aggregation
const [row] = await db
  .select({ count: sql<number>`count(*)` })
  .from(aiGenerations)
  .where(and(eq(aiGenerations.userId, userId), gte(aiGenerations.createdAt, startDate)));
const used = Number(row?.count ?? 0);  // Always cast sql<number> with Number()

// Upsert
await db.insert(tweetAnalytics)
  .values({ id: crypto.randomUUID(), tweetId, impressions, ... })
  .onConflictDoUpdate({ target: tweetAnalytics.tweetId, set: { impressions, updatedAt: new Date() } });

// Batch insert
await db.insert(tweets).values(tweetRows);  // tweetRows: InsertTweet[]
```

### Schema Conventions

```typescript
// IDs: always text (Better Auth uses text PKs)
id: text("id").primaryKey(),
userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),

// Enums: pgEnum + export
export const postStatusEnum = pgEnum("post_status", ["draft", "scheduled", "published", "failed"]);
status: postStatusEnum("status").notNull().default("draft"),

// Timestamps: defaultNow + $onUpdate on updatedAt
createdAt: timestamp("created_at").defaultNow().notNull(),
updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),

// JSON blobs
voiceProfile: jsonb("voice_profile"),

// Indexes
uniqueIndex("accounts_user_platform_unique").on(table.userId, table.platform),
index("posts_user_id_idx").on(table.userId),
```

### Inferred Types (never redeclare manually)

```typescript
// Export from schema.ts alongside the table:
export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;
export type Tweet = typeof tweets.$inferSelect;

// Use in services and route handlers:
function processPost(post: Post): void { ... }
const row: InsertPost = { id: crypto.randomUUID(), userId, content, ... };
```

## Service Layer Conventions

Services live in `src/lib/services/*.ts`. They are pure functions — no HTTP, no `Request`, no `Response`.

```typescript
// ✓ Correct service structure
export async function getMonthlyAiUsage(userId: string): Promise<MonthlyAiUsage> {
  // Only db queries + business logic here
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(aiGenerations).where(...);
  return { used: Number(row?.count ?? 0), limit, resetDate };
}

// ✓ Route handler owns HTTP concerns
// In route.ts:
try {
  const usage = await getMonthlyAiUsage(userId);
  return Response.json({ usage });
} catch (err) {
  logger.error("ai_usage_fetch_failed", { error: err instanceof Error ? err.message : String(err), userId });
  return ApiError.internal("Failed to fetch usage");
}
```

**Rules:**

- Always declare explicit return types: `Promise<MyType>`, `Promise<void>`
- Throw errors; never return `{ error: string }` shapes — routes catch and format
- Never import from `next/headers`, `next/navigation`, or `@/lib/api/errors` in services
- Never call `createPlanLimitResponse()` or `ApiError.*` in services

## TypeScript Strictness

Active flags: `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`.

```typescript
// exactOptionalPropertyTypes — spread pattern for optional props
const update = {
  ...(name !== undefined && { name }),
  ...(bio !== undefined && { bio }),
};

// noUncheckedIndexedAccess — always guard array access
const first = items[0]?.id; // optional chaining
const head = items[0]!; // non-null assertion (only when proven non-empty)
const [item] = items; // destructuring — preferred

// Nullable Drizzle fields
const plan = dbUser?.plan ?? "free"; // coalesce to default

// Unknown payloads — narrow explicitly, never cast to any
function processWebhook(body: unknown) {
  if (typeof body !== "object" || body === null) throw new Error("Invalid body");
  const b = body as Record<string, unknown>;
  const id = typeof b.id === "string" ? b.id : null;
}

// Union type narrowing — use discriminants
type Result = { ok: true; data: Post } | { ok: false; error: string };
```

## Frontend Conventions

### "use client" Policy

Add `"use client"` directive **only** when the component uses:

- `useState`, `useReducer`, `useEffect`, `useLayoutEffect`
- Event handlers that run in browser (`onClick`, `onChange`, `onSubmit`)
- Browser-only APIs: `window`, `document`, `localStorage`
- Client-side hooks: `useRouter`, `useSearchParams`, `usePathname`, `useMediaQuery`
- React context that itself uses client state
- Zustand stores

Do **not** add `"use client"` to: pure presentational components, data-fetching server components, layout wrappers, `DashboardPageWrapper`.

### Dashboard Pages (MANDATORY)

- Every `/dashboard/*` page MUST have a sidebar entry in `src/components/dashboard/sidebar.tsx`
- Every dashboard page MUST use `<DashboardPageWrapper icon={...} title="..." description="...">`
- Every admin page MUST use `<AdminPageWrapper>` (in `src/components/admin/`)
- Sidebar is the single source of truth for navigation

```typescript
// Async server component page pattern
export default async function MyPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  // Parallel data fetching
  const [usage, accounts] = await Promise.all([
    getMonthlyAiUsage(session.user.id),
    getUserAccounts(session.user.id),
  ]);

  return (
    <DashboardPageWrapper icon={SomeIcon} title="Page Title" description="...">
      <MyClientComponent initialUsage={usage} accounts={accounts} />
    </DashboardPageWrapper>
  );
}
```

### React Hook Form + Zod

```typescript
"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const schema = z.object({ name: z.string().min(1), type: z.enum(["a", "b"]) });
type FormValues = z.infer<typeof schema>;

const form = useForm<FormValues, unknown, FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { name: "", type: "a" },
});

// In JSX:
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField control={form.control} name="name" render={({ field }) => (
      <FormItem>
        <FormLabel>Name</FormLabel>
        <FormControl><Input {...field} /></FormControl>
        <FormMessage />   {/* Auto-displays field.error.message */}
      </FormItem>
    )} />
  </form>
</Form>
```

### Zustand Stores

```typescript
import { create } from "zustand";

interface MyStore {
  isOpen: boolean;
  data: SomeData | null;
  open: (data: SomeData) => void;
  close: () => void;
}

export const useMyStore = create<MyStore>((set) => ({
  isOpen: false,
  data: null,
  open: (data) => set({ isOpen: true, data }),
  close: () => set({ isOpen: false, data: null }),
}));
// Usage: const { isOpen, open, close } = useMyStore();
```

### Components: CVA + cn()

```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-lg border", {
  variants: {
    variant: { default: "bg-card", highlight: "bg-primary/5 border-primary/20" },
    size: { sm: "p-3", md: "p-4 md:p-6" },
  },
  defaultVariants: { variant: "default", size: "md" },
});

// Always use cn() for className merging — prevents Tailwind conflicts
className={cn(cardVariants({ variant, size }), "mt-4", className)}
```

### Custom Hooks

- Filename: `use-my-hook.ts` (kebab-case with `use-` prefix)
- Always `"use client"` directive
- SSR-safe initial state: `useState(false)` not `useState(typeof window !== "undefined" && ...)`
- Cleanup: return cleanup function from `useEffect`

## BullMQ & Background Jobs

### Queue Job Patterns

```typescript
import { scheduleQueue, SCHEDULE_JOB_OPTIONS } from "@/lib/queue/client";

// Enqueue AFTER transaction commits — never inside db.transaction()
await scheduleQueue.add(
  "publish-post",
  { postId, userId, correlationId }, // Always include correlationId
  { ...SCHEDULE_JOB_OPTIONS, delay: msUntilScheduledAt, jobId: postId }
);

// SCHEDULE_JOB_OPTIONS = {
//   attempts: 5, backoff: { type: "exponential", delay: 60_000 },
//   removeOnComplete: { count: 1_000, age: 86_400 },
//   removeOnFail: { age: 7 * 24 * 60 * 60 }
// }
// Never inline retry config — always import SCHEDULE_JOB_OPTIONS
```

### Job Processor Error Handling

```typescript
import { Job, UnrecoverableError, DelayedError } from "bullmq";

// UnrecoverableError — permanent failure, no retry (wrong tier, deleted resource)
throw new UnrecoverableError("Content exceeds tier character limit");

// DelayedError — re-queue for later (paused account, waiting for reconnect)
if (job.token) await job.moveToDelayed(Date.now() + 60 * 60 * 1000, job.token);
throw new DelayedError();

// Regular throw — triggers exponential backoff retry (normal transient failure)
throw new Error("X API rate limited");
```

### job_runs Table Flow

```typescript
// 1. Upsert at job start (idempotent for retries)
await db
  .insert(jobRuns)
  .values({
    id: crypto.randomUUID(),
    userId,
    queueName: job.queueName,
    jobId: String(job.id),
    correlationId: correlationId ?? `${job.queueName}:${job.id}`,
    postId,
    status: "running",
    attempts: job.opts?.attempts,
    attemptsMade: job.attemptsMade,
    startedAt: new Date(),
  })
  .onConflictDoUpdate({
    target: [jobRuns.queueName, jobRuns.jobId],
    set: { status: "running", attemptsMade: job.attemptsMade, startedAt: new Date() },
  });

// 2. Update on success/failure in finally block
await db
  .update(jobRuns)
  .set({ status: "success", finishedAt: new Date() })
  .where(and(eq(jobRuns.queueName, job.queueName), eq(jobRuns.jobId, String(job.id))));
```

## Testing

- **Framework**: Vitest — tests co-located with source (`*.test.ts`) or in `__tests__/` directories
- **Run tests**: `pnpm test` (unit), `pnpm test:e2e:ui` (Playwright)
- **When to add tests**: API routes, services with business logic, middleware — skip trivial UI components
- **Integration test**: Only `processors.integration.test.ts` — requires Redis; don't add more without discussion

### Mock Pattern (exact)

```typescript
// vi.hoisted() must run before vi.mock() captures the value
const { mockFindFirst, mockSelect } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockSelect: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: { user: { findFirst: mockFindFirst }, posts: { findFirst: mockFindFirst } },
    select: mockSelect,
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoUpdate: vi.fn() })) })),
  },
}));

describe("MyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue(null); // Default: no record
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ count: "0" }]),
    });
  });

  it("should return allowed when under quota", async () => {
    mockFindFirst.mockResolvedValue({ plan: "pro_monthly", trialEndsAt: null });
    const result = await checkAiQuotaDetailed("user-1");
    expect(result.allowed).toBe(true);
  });
});
```

## Security Patterns

### Token Encryption

```typescript
import { encryptToken, decryptToken, isEncryptedToken } from "@/lib/security/token-encryption";

// Always check before encrypting — prevents double-encryption
const stored = isEncryptedToken(token) ? token : encryptToken(token);

// Always check before decrypting — safe even if token is plaintext
const raw = isEncryptedToken(stored) ? decryptToken(stored) : stored;

// Format: "v1:kid:iv.ciphertext.tag" (AES-256-GCM)
// Key rotation: TOKEN_ENCRYPTION_KEYS env var (comma-separated 32-byte hex/base64 keys)
```

### Storage

```typescript
import { upload, validateFile, sanitizeFilename, deleteFile } from "@/lib/storage";

// Validate before processing
const check = validateFile(buffer, filename); // checks size (5MB default) + ext whitelist
if (!check.valid) return ApiError.badRequest(check.error);

// Upload (auto-routes to Vercel Blob or local /public/uploads/)
const { url, pathname } = await upload(buffer, sanitizeFilename(filename), "media");

// Delete
await deleteFile(url);
```

### Environment Variables

Access directly from `process.env` — validated at startup by `src/lib/env.ts`. Never construct runtime config from env in route handlers; read env values at module level or inline at call site.

## Git & Commits

- **Branch from `main`** — use `feature/*` or `fix/*` prefix (e.g. `feature/billing-upgrade`, `fix/polling-leak`)
- **Commit style**: conventional commits — `type(scope): description`
  - Types: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`
  - Scopes match the area: `composer`, `billing`, `ai-quota`, `ui`, etc.
- **CI**: GitHub Actions runs lint → typecheck → build on every push/PR to main
- **Don't force-push to main**

## Agent Orchestration

Use sub-agents for multi-file tasks. Split by concern, run independent work in parallel.

**When to use agents:** 3+ file changes, independent subtasks, research + implementation, verification.

**Rules:**

- Never run independent work sequentially when parallelized agents work
- Each agent gets scoped file boundaries — no overlapping writes
- Wait for dependent agent output before spawning the next — never use placeholders
- Always run verification (lint + typecheck + test) as parallel agents as the final step
- Use Claude Haiku 4.5 (subagent model) for exploration, Claude Sonnet 4.6 (subagent model) for implementation, GLM-5.1 (opus) for architecture

**Custom agents:** `.claude/agents/` — backend-dev, frontend-dev, ai-specialist, db-migrator, test-runner, researcher, code-reviewer
**Orchestration rules:** `.claude/rules/agent-orchestration.md`
**Team patterns:** `docs/claude/agent-patterns.md`

## Plans

When creating plans in Plan Mode, always rename the plan file from the auto-generated name to a descriptive name following this format: `YYYY-MM-DD-<short-kebab-case-description>.md`. Examples:

- `2026-04-11-add-user-authentication.md`
- `2026-04-11-refactor-payment-processing.md`
- `2026-04-11-fix-session-timeout-bug.md`

Do not leave plan files with auto-generated random names like `calm-silver-fox.md`.

## Key File Locations

- DB: `src/lib/db.ts` (client), `src/lib/schema.ts` (schema)
- Auth: `src/lib/auth.ts` (server), `src/lib/auth-client.ts` (client)
- Team context: `src/lib/team-context.ts` (multi-account auth wrapper)
- Admin auth: `src/lib/admin.ts` (`requireAdmin`, `requireAdminApi`)
- Queue: `src/lib/queue/client.ts` (client + job types + `SCHEDULE_JOB_OPTIONS`), `src/lib/queue/processors.ts` (processors)
- Storage: `src/lib/storage.ts` (local/Vercel Blob auto-switch)
- Encryption: `src/lib/security/token-encryption.ts`
- Plan gates: `src/lib/middleware/require-plan.ts`
- Plan limits: `src/lib/plan-limits.ts`
- Errors: `src/lib/api/errors.ts`
- Rate limiter: `src/lib/rate-limiter.ts`
- AI preamble: `src/lib/api/ai-preamble.ts` (shared AI route setup)
- Logger: `src/lib/logger.ts` (structured JSON logger)
- Correlation IDs: `src/lib/correlation.ts`
- Utils (cn): `src/lib/utils.ts`
- Billing cron: `src/app/api/cron/billing-cleanup/route.ts` (webhook cleanup + grace period enforcement)

## Reference Docs (read on demand when needed)

- **Project structure & file map**: `docs/claude/architecture.md`
- **Environment variables**: `docs/claude/env-vars.md`
- **AI features & endpoints**: `docs/claude/ai-features.md`
- **Recent fixes & known issues**: `docs/claude/recent-changes.md`
- **Common task patterns**: `docs/claude/common-tasks.md`
- **Available scripts**: `docs/claude/scripts.md`
