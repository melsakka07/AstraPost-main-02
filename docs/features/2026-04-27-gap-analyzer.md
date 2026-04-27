# X AI Content Gap Analyzer — Refined Implementation Plan

**Date:** 2026-04-27  
**Feature:** Identify untapped content gaps by analyzing competitor posts, generate ready-to-publish posts via the existing Agentic Posting pipeline.  
**Target:** Pro / Agency users (`canUseGapAnalyzer` gate). Free users see the upgrade prompt.  
**Route:** `/dashboard/analytics/gap-analyzer`

---

## Audit: What the Original Plan Got Wrong

These are confirmed bugs/deviations from the actual codebase — not opinions:

| #   | Original Claim                                                        | Actual Reality                                                                    | Impact                                                  |
| --- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | `XApiService.fetchUserTweets()` exists                                | Method **does not exist**                                                         | Must add `fetchUserTimeline()`                          |
| 2   | `runAgenticPipeline()` writes to `agentic_posts`                      | It does **not** — the route handler writes                                        | Generate route must do the DB insert + update           |
| 3   | Use `getTeamContext()` for AI route auth                              | All AI routes use `aiPreamble()` not `getTeamContext()`                           | Fix auth pattern in both routes                         |
| 4   | `id: varchar(36)` for new table                                       | `database.md` convention is `text("id").primaryKey()`                             | Use `text` for `gap_analyses.id`                        |
| 5   | `GET /api/ai/gap-analyzer/:id` and `POST /:gapId/generate` naming     | `:gapId` is ambiguous — it's the **analysis** ID with a **gap index**             | Rename to `[id]/generate` + body `gapIndex`             |
| 6   | i18n in separate namespace files                                      | Messages are in a **monolithic** `src/i18n/messages/en.json`                      | Add `ai_gap_analyzer` section to existing files         |
| 7   | `"gap_analyzer"` already in `aiGenerationTypeEnum`                    | Enum has no such value — **must add it** (DB migration)                           | New enum value + migration                              |
| 8   | Redirect to `/dashboard/ai/agentic/review?id=...` as a standalone URL | Review screen is **internal state** of `AgenticPostingClient`, not a routable URL | Use redirect with `?topic=` param + `initialTopic` prop |
| 9   | Free users see 1 gap read-only                                        | Adds AI cost for free users with no conversion                                    | Gate the whole feature at Pro+ (no free tier preview)   |
| 10  | No `recordAiUsage()` call mentioned for Agent 1                       | **Every AI call must call `recordAiUsage()`** (hard rule)                         | Add `recordAiUsage(..., "gap_analyzer", ...)`           |

---

## Architecture (Corrected)

### Data Flow

```
User Input (handles + xAccountId)
  │
  ▼
POST /api/ai/gap-analyzer
  ├─ aiPreamble({ featureGate: checkGapAnalyzerAccessDetailed })
  ├─ Fetch competitor timelines via XApiService.fetchUserTimeline() [user's OAuth]
  ├─ Agent 1: generateObject() → ContentGap[] (OpenRouter)
  ├─ recordAiUsage(userId, "gap_analyzer", tokens, ...)
  ├─ db.insert(gapAnalyses) → { id, gaps, status: "ready" }
  └─ Return { id, gaps }

Gap List UI → user clicks "Generate Post" for a gap
  │
  ▼
Client-side navigate to:
  /dashboard/ai/agentic?topic=<suggestedAngle>&fromGapId=<analysisId>-<gapIndex>

Existing Agentic Posting page reads ?topic param
  → pre-fills topic input
  → full SSE pipeline runs as normal
  → review screen shows with "← Back to Gap Analysis" link using fromGapId param
```

### Why This Architecture

- **No new SSE infrastructure** — reuses 100% of the existing agentic pipeline and review screen
- **No generate API route** — the redirect IS the generation trigger
- **Minimal changes to `AgenticPostingClient`** — just add `initialTopic?: string` prop + read `fromGapId` query param for the back link
- **`gapAnalysisId` on `agenticPosts`** not needed — it's surfaced via query params, not a DB join

---

## Files — Complete Change List

### New Files

| File                                                | Description                                               |
| --------------------------------------------------- | --------------------------------------------------------- |
| `src/lib/ai/gap-analyzer-types.ts`                  | `ContentGap` interface + Zod schemas + `GapAnalysis` type |
| `src/lib/ai/gap-analyzer-prompts.ts`                | Gap detection system prompt (supports AR/EN)              |
| `src/app/api/ai/gap-analyzer/route.ts`              | `POST` — run gap analysis                                 |
| `src/app/api/ai/gap-analyzer/[id]/route.ts`         | `GET` — fetch analysis by ID                              |
| `src/app/dashboard/analytics/gap-analyzer/page.tsx` | RSC page                                                  |
| `src/components/ai/gap-analyzer-client.tsx`         | Client component (input + gap cards)                      |

### Modified Files

| File                                           | Change                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/lib/schema.ts`                            | Add `gapAnalyses` table + `"gap_analyzer"` to `aiGenerationTypeEnum`         |
| `src/lib/plan-limits.ts`                       | Add `canUseGapAnalyzer: boolean`, `maxGapsPerAnalysis: number`               |
| `src/lib/middleware/require-plan.ts`           | Add `"gap_analyzer"` to `GatedFeature`, add `checkGapAnalyzerAccessDetailed` |
| `src/lib/services/x-api.ts`                    | Add `fetchUserTimeline(targetHandle, limit)` instance method                 |
| `src/components/dashboard/sidebar-nav-data.ts` | Add "Gap Analyzer" entry under Analytics                                     |
| `src/app/dashboard/ai/agentic/page.tsx`        | Read `?topic` + `?fromGapId` search params, pass to client                   |
| `src/components/ai/agentic-posting-client.tsx` | Add `initialTopic?: string`, `fromGapId?: string` props                      |
| `src/i18n/messages/en.json`                    | Add `ai_gap_analyzer` section                                                |
| `src/i18n/messages/ar.json`                    | Add `ai_gap_analyzer` section (Arabic)                                       |

---

## Phase 0 — Database Migrations

**Agent:** `db-migrator`  
**Files:** `src/lib/schema.ts` only  
**Must complete before any other phase**

### 1. Add `"gap_analyzer"` to `aiGenerationTypeEnum` (line ~110)

```typescript
export const aiGenerationTypeEnum = pgEnum("ai_generation_type", [
  // ...existing values...
  "gap_analyzer", // ← ADD THIS
]);
```

### 2. Add `gapAnalyses` table

```typescript
export const gapAnalyses = pgTable("gap_analyses", {
  id: text("id").primaryKey(), // text per database.md convention
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  xAccountId: text("x_account_id")
    .notNull()
    .references(() => xAccounts.id, { onDelete: "cascade" }),
  inputType: varchar("input_type", { length: 20 }).notNull(), // "handles" | "topic" (topic = phase 2)
  competitors: text("competitors").array().notNull(), // usernames without @
  gaps: jsonb("gaps").$type<ContentGap[]>().notNull().default([]),
  status: varchar("status", { length: 20 }).notNull().default("processing"), // "processing" | "ready" | "failed"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type GapAnalysis = typeof gapAnalyses.$inferSelect;
export type InsertGapAnalysis = typeof gapAnalyses.$inferInsert;
```

Note: `ContentGap` type will be imported from `src/lib/ai/gap-analyzer-types.ts`. Use `jsonb("gaps").$type<ContentGap[]>()` to ensure type safety.

Note: No `gapAnalysisId` column on `agenticPosts` — not needed with the redirect approach.

### 3. Run Migrations

```bash
pnpm db:generate
pnpm db:migrate
```

---

## Phase 1 — Plan Limits & Gates

**Agent:** `backend-dev`  
**Depends on:** Phase 0 complete  
**Parallel with:** Phase 2

### `src/lib/plan-limits.ts`

Add to `PlanLimits` interface:

```typescript
canUseGapAnalyzer: boolean;
maxGapsPerAnalysis: number;
```

Set values per plan object:

```typescript
// free
canUseGapAnalyzer: false,
maxGapsPerAnalysis: 0,

// pro_monthly + pro_annual
canUseGapAnalyzer: true,
maxGapsPerAnalysis: 5,

// agency
canUseGapAnalyzer: true,
maxGapsPerAnalysis: 10,
```

### `src/lib/middleware/require-plan.ts`

1. Add `"gap_analyzer"` to the `GatedFeature` union type (lines ~15–34).
2. Add gate using the factory (after `checkAgenticPostingAccessDetailed`):

```typescript
export const checkGapAnalyzerAccessDetailed = makeFeatureGate(
  "gap_analyzer",
  "canUseGapAnalyzer",
  "Content Gap Analyzer is a Pro feature."
);
```

---

## Phase 2 — AI Types & Prompts

**Agent:** `ai-specialist`  
**Parallel with:** Phase 1

### `src/lib/ai/gap-analyzer-types.ts` (new)

```typescript
import { z } from "zod";

export const ContentGapSchema = z.object({
  title: z.string(),
  description: z.string(),
  evidence: z.array(z.string()).max(3),
  suggestedAngle: z.string(),
  competitionLevel: z.enum(["low", "medium", "high"]),
});

export type ContentGap = z.infer<typeof ContentGapSchema>;

export const GapAnalysisOutputSchema = z.object({
  gaps: z.array(ContentGapSchema).min(1).max(10),
});

export type GapAnalysisOutput = z.infer<typeof GapAnalysisOutputSchema>;
```

### `src/lib/ai/gap-analyzer-prompts.ts` (new)

Build bilingual system prompt that:

- Accepts the language (`"ar"` | `"en"`)
- Accepts up to 3 competitor handles and their tweet texts
- Instructs the model to identify content gaps (topics competitors cover little/poorly)
- Returns structured JSON matching `GapAnalysisOutputSchema`
- Supports Arabic analysis when `language === "ar"`

Key prompt principles:

- Emphasize: a "gap" = high audience relevance + low competitor coverage
- Ask for specific evidence quotes from the tweets provided
- Return `competitionLevel` based on how many competitors touched the topic

---

## Phase 3 — XApiService Extension

**Agent:** `backend-dev`  
**Parallel with:** Phases 1 & 2  
**File:** `src/lib/services/x-api.ts`

Add as a public instance method (after `getTweetsPublicMetrics`):

```typescript
async fetchUserTimeline(
  targetHandle: string,
  limit = 50
): Promise<{ id: string; text: string }[]> {
  // Resolve handle → user ID
  const userRes = await this.jsonRequest(
    "GET",
    `/2/users/by/username/${encodeURIComponent(targetHandle)}`
  ) as { data?: { id: string } };

  const targetUserId = userRes.data?.id;
  if (!targetUserId) return [];

  // Fetch recent tweets (exclude RTs and replies)
  const tweetsRes = await this.jsonRequest(
    "GET",
    `/2/users/${targetUserId}/tweets`,
    undefined,
    {
      max_results: String(Math.min(limit, 100)),
      exclude: "retweets,replies",
      "tweet.fields": "text,created_at",
    }
  ) as { data?: { id: string; text: string }[] };

  return (tweetsRes.data ?? []).map((t) => ({ id: t.id, text: t.text }));
}
```

Notes:

- Uses the instance's existing OAuth credentials (the requesting user's connected X account)
- `jsonRequest` is private but accessible within the class
- Returns empty array (not throws) when handle not found — the route handles this gracefully
- Rate limits: `GET /2/users/by/username` is 300 req/15min; `GET /2/users/{id}/tweets` is 900 req/15min per app — well within budget for this use case

---

## Phase 4 — API Routes

**Agent:** `ai-specialist`  
**Depends on:** Phases 0, 1, 2, 3 complete

### `POST /api/ai/gap-analyzer` — `src/app/api/ai/gap-analyzer/route.ts`

Full 9-step implementation:

```typescript
const requestSchema = z.object({
  competitors: z.array(z.string().min(1).max(50)).min(1).max(3),
  xAccountId: z.string().min(1),
  language: z.string().default("en"),
  // "handles" only in Phase 1; "topic" deferred to Phase 2
  inputType: z.enum(["handles"]),
});
```

Route handler flow:

1. `getCorrelationId(req)` — first line
2. `aiPreamble({ featureGate: checkGapAnalyzerAccessDetailed })` — handles session + plan gate + quota
3. Parse + Zod validate
4. Verify `xAccountId` ownership (query `xAccounts` table for `userId === session.user.id`)
5. Get plan limits to enforce `maxGapsPerAnalysis` cap
6. Create `XApiService` client for the user's account via `XApiService.getClientForAccountId(xAccountId)`
7. Fetch competitor timelines in parallel: `Promise.all(competitors.map(h => client.fetchUserTimeline(h, 50)))`
8. If no tweets found for any competitor, return `ApiError.badRequest("No tweets found for the provided handles")`
9. Build prompt using `buildGapDetectionPrompt(language, competitorData)`
10. Call `generateObject({ model, schema: GapAnalysisOutputSchema, prompt })` (Vercel AI SDK)
11. Cap gaps to `maxGapsPerAnalysis`
12. `recordAiUsage(session.user.id, "gap_analyzer", tokens, prompt, output.gaps, language)`
13. `db.insert(gapAnalyses).values({ id: nanoid(), userId: session.user.id, xAccountId, inputType: "handles", competitors, gaps: output.gaps, status: "ready" })`
14. Return `Response.json({ id, gaps }, headers: { "x-correlation-id": correlationId })`

Error handling:

- OpenRouter call failure: log `gap_analyzer_ai_error`, set status to `"failed"`, return `ApiError.internal()`
- All competitors return 0 tweets: `ApiError.badRequest("...")`

### `GET /api/ai/gap-analyzer/[id]` — `src/app/api/ai/gap-analyzer/[id]/route.ts`

```typescript
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const preamble = await aiPreamble({ skipQuotaCheck: true });
  if (preamble instanceof Response) return preamble;
  const { session } = preamble;

  const { id } = await params;
  const analysis = await db.query.gapAnalyses.findFirst({
    where: and(eq(gapAnalyses.id, id), eq(gapAnalyses.userId, session.user.id)),
  });
  if (!analysis) return ApiError.notFound("Gap analysis");
  return Response.json(analysis);
}
```

Note: `params` is a `Promise` in Next.js 16 App Router — must `await params` before accessing.

---

## Phase 5 — Frontend

**Agents:** `frontend-dev` + `i18n-dev` in parallel  
**Depends on:** Phase 4 complete (for API shape)

### `src/app/dashboard/analytics/gap-analyzer/page.tsx` (RSC)

```typescript
export default async function GapAnalyzerPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const t = await getTranslations("ai_gap_analyzer");
  const { id } = await searchParams;

  const [dbUser, accounts] = await Promise.all([
    db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { plan: true, language: true },
    }),
    db.query.xAccounts.findMany({
      where: eq(xAccounts.userId, session.user.id),
      columns: { id: true, username: true },
    }),
  ]);

  const limits = getPlanLimits(dbUser?.plan);
  const isLocked = !limits.canUseGapAnalyzer;

  // Pre-load existing analysis if ID in URL
  let initialAnalysis: GapAnalysis | null = null;
  if (id) {
    initialAnalysis = await db.query.gapAnalyses.findFirst({
      where: and(eq(gapAnalyses.id, id), eq(gapAnalyses.userId, session.user.id)),
    }) ?? null;
  }

  return (
    <DashboardPageWrapper
      icon={Telescope}
      title={t("title")}
      description={t("description")}
    >
      <GapAnalyzerClient
        xAccounts={accounts}
        isLocked={isLocked}
        maxGaps={limits.maxGapsPerAnalysis}
        userLanguage={dbUser?.language ?? "en"}
        initialAnalysis={initialAnalysis}
      />
    </DashboardPageWrapper>
  );
}
```

### `src/components/ai/gap-analyzer-client.tsx` (Client Component)

Three internal views controlled by `view` state:

#### View 1 — Input Form

- `isLocked` → show `<UpgradeCTA>` over the form (same pattern as other locked features)
- Radio group: `"handles"` (Phase 1 only; `"topic"` shown but disabled with "Coming soon" badge)
- Textarea: competitor handles, one per line OR comma-separated, max 3
- X account selector (same as agentic posting)
- "Analyze" button → calls `POST /api/ai/gap-analyzer`, shows loading spinner
- Loading copy uses i18n key `ai_gap_analyzer.analyzing` ("Analyzing {count} competitor tweets...")

#### View 2 — Gap Cards

- Responsive grid: 1 col mobile, 2 cols md+
- Each `GapCard` component:
  ```
  [Title]
  [Description]
  Evidence: "..." — @handle
  Competition: [LOW|MEDIUM|HIGH badge]
  [ ✨ Generate Post ]
  ```
- "Generate Post" button → `router.push('/dashboard/ai/agentic?topic=${encodeURIComponent(gap.suggestedAngle)}&fromGapId=${analysisId}-${index}')`
- "Run New Analysis" link → resets to View 1
- Analysis ID stored in URL: `router.push('/dashboard/analytics/gap-analyzer?id=${id}')`

#### Accessibility

- `role="status"` live region for loading state
- `aria-label` on Generate buttons (distinct per gap title)
- Competition level badge with accessible color contrast

### Sidebar Nav — `src/components/dashboard/sidebar-nav-data.ts`

Add after the Competitor entry (line ~112):

```typescript
{ icon: Telescope, label: "Gap Analyzer", href: "/dashboard/analytics/gap-analyzer", isPro: true },
```

Import `Telescope` from `lucide-react` at the top of the file.

### Agentic Page Modifications

#### `src/app/dashboard/ai/agentic/page.tsx`

```typescript
export default async function AgenticPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; fromGapId?: string }>;
}) {
  // ... existing auth + data loading ...
  const { topic, fromGapId } = await searchParams;

  return (
    <DashboardPageWrapper ...>
      <AgenticPostingClient
        xAccounts={accounts}
        hasVoiceProfile={hasVoiceProfile}
        isLocked={isLocked}
        initialTopic={topic}
        fromGapId={fromGapId}
      />
    </DashboardPageWrapper>
  );
}
```

#### `src/components/ai/agentic-posting-client.tsx`

Add to `AgenticPostingClientProps`:

```typescript
initialTopic?: string;
fromGapId?: string;
```

In the component body:

- Pre-fill topic input `useState` with `initialTopic` if provided
- In the review screen footer (after the approve actions): if `fromGapId` is truthy, render:
  ```tsx
  <Link href={`/dashboard/analytics/gap-analyzer?id=${fromGapId.split("-")[0]}`}>
    ← {t("review_screen.back_to_gap_analysis")}
  </Link>
  ```
  Note: `fromGapId` format is `<analysisId>-<gapIndex>`, so split on the last `-` to get the analysis ID.

---

## Phase 6 — i18n (AR + EN)

**Agent:** `i18n-dev`  
**Parallel with:** Phase 5

Add `ai_gap_analyzer` section to `src/i18n/messages/en.json`:

```json
"ai_gap_analyzer": {
  "title": "Content Gap Analyzer",
  "description": "Discover topics your competitors are missing. Generate posts that fill the gap.",
  "pro_feature": "Content Gap Analyzer is a Pro feature",
  "pro_description": "Upgrade to Pro to identify and capitalize on content gaps in your niche.",
  "input_screen": {
    "input_type_label": "Analysis Type",
    "handles_option": "Competitor Handles",
    "topic_option": "Topic / Hashtag",
    "topic_coming_soon": "Coming soon",
    "handles_label": "Competitor Handles",
    "handles_placeholder": "OpenAI, AnthropicAI, elonmusk",
    "handles_hint": "Enter up to 3 handles (without @), comma-separated",
    "account_label": "Post from account",
    "max_gaps_label": "Maximum gaps to find",
    "submit_button": "Analyze Competitors",
    "no_accounts": "Connect an X account in Settings to use this feature"
  },
  "processing_screen": {
    "title": "Analyzing...",
    "fetching": "Fetching competitor tweets",
    "detecting": "Detecting content gaps"
  },
  "results_screen": {
    "title": "Content Gaps Found",
    "gaps_found": "{count} gaps detected",
    "new_analysis": "Run New Analysis",
    "generate_button": "Generate Post",
    "evidence_label": "Evidence",
    "competition_low": "Low Competition",
    "competition_medium": "Medium Competition",
    "competition_high": "High Competition",
    "upgrade_tooltip": "Upgrade to Pro to generate posts from gaps"
  },
  "errors": {
    "no_tweets_found": "No tweets found for the provided handles. Make sure the handles are correct and public.",
    "analysis_failed": "Analysis failed. Please try again.",
    "invalid_handles": "Please enter at least one valid competitor handle"
  }
}
```

Add `ai_gap_analyzer` section to `src/i18n/messages/ar.json`:

```json
"ai_gap_analyzer": {
  "title": "محلل الفجوات في المحتوى",
  "description": "اكتشف المواضيع التي يفتقدها منافسوك وأنشئ منشورات تملأ هذه الفجوة.",
  "pro_feature": "محلل الفجوات ميزة Pro",
  "pro_description": "قم بالترقية إلى Pro للكشف عن فجوات المحتوى والاستفادة منها.",
  "input_screen": {
    "input_type_label": "نوع التحليل",
    "handles_option": "حسابات المنافسين",
    "topic_option": "موضوع / هاشتاق",
    "topic_coming_soon": "قريباً",
    "handles_label": "حسابات المنافسين",
    "handles_placeholder": "OpenAI, AnthropicAI, elonmusk",
    "handles_hint": "أدخل حتى 3 حسابات (بدون @) مفصولة بفواصل",
    "account_label": "النشر من حساب",
    "max_gaps_label": "الحد الأقصى للفجوات",
    "submit_button": "تحليل المنافسين",
    "no_accounts": "ربط حساب X في الإعدادات لاستخدام هذه الميزة"
  },
  "processing_screen": {
    "title": "جارٍ التحليل...",
    "fetching": "جلب تغريدات المنافسين",
    "detecting": "اكتشاف فجوات المحتوى"
  },
  "results_screen": {
    "title": "فجوات المحتوى المكتشفة",
    "gaps_found": "تم اكتشاف {count} فجوة",
    "new_analysis": "تحليل جديد",
    "generate_button": "إنشاء منشور",
    "evidence_label": "الدليل",
    "competition_low": "منافسة منخفضة",
    "competition_medium": "منافسة متوسطة",
    "competition_high": "منافسة عالية",
    "upgrade_tooltip": "قم بالترقية إلى Pro لإنشاء منشورات من الفجوات"
  },
  "errors": {
    "no_tweets_found": "لم يتم العثور على تغريدات للحسابات المدخلة. تأكد من صحة الحسابات وأنها عامة.",
    "analysis_failed": "فشل التحليل. يرجى المحاولة مرة أخرى.",
    "invalid_handles": "يرجى إدخال حساب منافس واحد على الأقل"
  }
}
```

Also add the back-link key to the existing `ai_agentic.review_screen` section:

```json
// In en.json, inside ai_agentic.review_screen:
"back_to_gap_analysis": "Back to Gap Analysis"

// In ar.json, inside ai_agentic.review_screen:
"back_to_gap_analysis": "العودة إلى تحليل الفجوات"
```

---

## Phase 7 — Verification

**Agents:** `convention-enforcer` + `security-reviewer` in parallel → then `test-runner`

### Convention Enforcer Checks

- All AI routes use `aiPreamble()` not `getTeamContext()`
- `recordAiUsage()` called in the POST route
- `ApiError.*` used for all error responses (never `NextResponse.json()`)
- `db.transaction()` not required here (single-table write) — verify this is correct
- `logger.info` at route entry with `correlationId`
- No `console.log` / `console.error`
- `exactOptionalPropertyTypes` — verify spread patterns for optional props
- `params` awaited before destructuring (Next.js 16)

### Security Reviewer Checks

- `xAccountId` ownership verified before use (prevents accessing other users' X credentials)
- Competitors array validated (max 3, each string sanitized before X API call)
- Gap analysis only returned to the user who created it (GET route checks `userId === session.user.id`)
- No raw competitor tweet content stored without sanitization (JSON column, safe)

### Test Runner

```bash
pnpm run check  # lint + typecheck — must pass
pnpm test       # unit tests
```

---

## Implementation Order with Agent Assignments

```
Phase 0: db-migrator
  └─ schema.ts changes + migration
  └─ WAIT FOR COMPLETION

Phase 1 + Phase 2 + Phase 3 (parallel after Phase 0):
  ├─ backend-dev: plan-limits.ts + require-plan.ts + x-api.ts
  └─ ai-specialist: gap-analyzer-types.ts + gap-analyzer-prompts.ts

Phase 4 (after Phases 1+2+3):
  └─ ai-specialist: all API routes

Phase 5 + Phase 6 (parallel after Phase 4):
  ├─ frontend-dev: page + client component + sidebar + agentic modifications
  └─ i18n-dev: en.json + ar.json additions

Phase 7 (after Phases 5+6):
  ├─ convention-enforcer (parallel)
  ├─ security-reviewer (parallel)
  └─ test-runner (after both reviewers pass)
```

---

## Edge Cases to Handle

| Scenario                           | Handling                                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Competitor handle doesn't exist    | `fetchUserTimeline` returns `[]`; aggregate then check: if ALL handles return 0 tweets, `ApiError.badRequest()`             |
| X API rate limit hit during fetch  | Catch the error, log `gap_analyzer_x_api_rate_limit`, return `ApiError.tooManyRequests()`                                   |
| No X account connected             | Check `accounts.length === 0` in frontend, show "Connect X account" prompt; backend validates `xAccountId` ownership anyway |
| OpenRouter returns malformed JSON  | Zod `.safeParse()` on the AI output; on failure store `status: "failed"` + `ApiError.internal()`                            |
| User navigates away during loading | Frontend cancels fetch with `AbortController` (follow polling/fetch cancel pattern per CLAUDE.md)                           |
| Competitor writes tweets in Arabic | The gap detection prompt handles multilingual input; `language` param drives the output language                            |

---

## Out of Scope (Phase 2 / Future)

- Topic / hashtag input type (requires X API Basic tier or OpenRouter web search provider)
- Schedule All gaps in one click
- Periodic re-analysis cron
- Export gaps as CSV
- Gap analysis history page (list past analyses)
- Multi-account aggregation (analyze from multiple connected X accounts)

---

## Deliverables Checklist

- [ ] `pnpm db:generate && pnpm db:migrate` applied (enum + table)
- [ ] `plan-limits.ts` — `canUseGapAnalyzer` + `maxGapsPerAnalysis`
- [ ] `require-plan.ts` — `GatedFeature` union + `checkGapAnalyzerAccessDetailed`
- [ ] `x-api.ts` — `fetchUserTimeline()` method
- [ ] `gap-analyzer-types.ts` — `ContentGap` + `GapAnalysisOutput` Zod schemas
- [ ] `gap-analyzer-prompts.ts` — bilingual prompt builder
- [ ] `POST /api/ai/gap-analyzer` — full 9-step route
- [ ] `GET /api/ai/gap-analyzer/[id]` — ownership-gated fetch
- [ ] `gap-analyzer/page.tsx` — RSC with auth, data loading, isLocked
- [ ] `gap-analyzer-client.tsx` — input + gap cards + generate redirect
- [ ] `sidebar-nav-data.ts` — Analytics section entry
- [ ] `agentic/page.tsx` — `searchParams.topic` + `searchParams.fromGapId` forwarding
- [ ] `agentic-posting-client.tsx` — `initialTopic` + `fromGapId` back-link
- [ ] `en.json` + `ar.json` — `ai_gap_analyzer` section + `back_to_gap_analysis` key
- [ ] `pnpm run check` passes
- [ ] Manual test: real competitor handle (e.g., `OpenAI`) → gap list → generate post → review screen → back link works
