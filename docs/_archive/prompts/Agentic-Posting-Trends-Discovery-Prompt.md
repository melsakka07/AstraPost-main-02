# Prompt: Add Trending Topics Discovery to Agentic Posting Page

> **Objective:** Add a "Trending on X" discovery panel to the Agentic Posting input screen that lets users browse trending topics by category (Technology, Business, Lifestyle, Sports, News, Entertainment) and launch an agentic post from any trend with one tap. This is powered by AI web research via OpenRouter — not by the X Trends API (which requires $5,000/month Pro tier or X Premium for the user).

---

## Context

You are working on **AstraPost**. The Agentic Posting feature is already implemented at `/dashboard/ai/agentic` with a three-screen flow (Input → Processing → Review). Study the attached `README.md` and `CLAUDE.md` for codebase conventions.

**Why AI-powered trends instead of the X API:**

The X API v2 has two trends endpoints:

- **Personalized Trends** (`/2/users/personalized_trends`) — only returns data for X Premium subscribers; returns "Unknown" for Free users
- **Trends by Location** (`/2/trends/by/woeid/:woeid`) — requires the X API Pro tier ($5,000/month)

Neither is practical. Instead, we use OpenRouter (already integrated) with a model that has web search capability (e.g., `perplexity/llama-3.1-sonar-large-128k-online` or the default model) to ask the AI what's currently trending on X by category. This approach costs pennies per request, works for all users, and supports category filtering that the native API doesn't even offer.

---

## Implementation — 3 Phases

### Phase 1: Trends API Route

**File:** `src/app/api/ai/trends/route.ts`

Create a new endpoint:

```
GET /api/ai/trends?category=technology
```

**Query parameters:**

- `category` — one of: `technology`, `business`, `lifestyle`, `sports`, `news`, `entertainment`, `all`
- Default: `all`

**Implementation:**

1. Authenticate via session. Gate behind Pro/Agency plans using `require-plan.ts` (same gate as Agentic Posting — if you can use Agentic Posting, you can use trends).
2. **Check Redis cache first.** Cache key: `trends:${category}`. TTL: **30 minutes**. Trends don't change every second — 30 minutes is fresh enough and avoids burning AI credits on repeated requests. Use the existing Redis connection from the project.
3. If cache miss, call OpenRouter with a structured prompt:

```typescript
const systemPrompt = `You are a social media trends analyst. Research what is currently trending on X (Twitter) right now in the "${category}" category.

Return EXACTLY 5 trending topics as a JSON array. For each topic, include:
- "title": the trending topic or hashtag name (as it appears on X)
- "description": a one-sentence explanation of why it's trending (15-25 words max)
- "postCount": estimated engagement level ("High", "Medium", or "Trending")
- "category": "${category}"
- "suggestedAngle": a one-sentence content angle a creator could use for a post about this trend

Focus on topics that are genuinely trending RIGHT NOW on X/Twitter, not general evergreen topics. Prioritize topics with high engagement and conversation volume.

Return ONLY valid JSON. No markdown, no explanation, no preamble.
Format: [{ "title": "...", "description": "...", "postCount": "...", "category": "...", "suggestedAngle": "..." }]`;
```

4. Parse the AI response. Validate with Zod. If parsing fails, return a graceful error — don't crash.
5. Store the result in Redis with 30-minute TTL.
6. Return the trends array.

**Response shape:**

```json
{
  "trends": [
    {
      "title": "#AIAgents",
      "description": "OpenAI's new agent framework sparks debate about autonomous AI coding tools",
      "postCount": "High",
      "category": "technology",
      "suggestedAngle": "Compare the top 3 AI agent frameworks and which one developers should learn first"
    }
  ],
  "category": "technology",
  "cachedAt": "2026-04-05T12:00:00Z",
  "expiresAt": "2026-04-05T12:30:00Z"
}
```

**Use `ApiError`** for all error responses. Log via structured logger. Count toward AI quota.

**For the AI model:** Use a model with web search/real-time knowledge if available via OpenRouter (like `perplexity/llama-3.1-sonar-large-128k-online`). If that model isn't configured, use the default `OPENROUTER_MODEL` — it won't have real-time data but can still surface well-known trending patterns. Add a comment noting that a web-search-capable model produces significantly better results for this endpoint.

### Phase 2: Trends Discovery Panel — Frontend Component

**File:** `src/components/ai/agentic-trends-panel.tsx`

Create a new `"use client"` component that renders a trending topics discovery panel on the Agentic Posting input screen.

**Layout — positioned BELOW the suggestion chips and ABOVE the Advanced options:**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                ✨ What should we post about?                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  e.g., AI coding tools, sustainable fashion...       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [ AI coding tools ] [ Web3 gaming ] [ MENA startups ]      │
│                                                              │
│  ──────────────── Trending on X ─────────────────────────   │
│                                                              │
│  [ Technology ] [ Business ] [ News ] [ Lifestyle ] ...     │ ← category tabs
│                                                              │
│  ┌─ #AIAgents ─────────────────────────────── High ───┐    │
│  │  OpenAI's new agent framework sparks debate about   │    │
│  │  autonomous AI coding tools                         │    │
│  │                                        [✨ Post]    │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─ #CursorAI ────────────────────────── Trending ────┐    │
│  │  Developers share productivity gains after switching │    │
│  │  to AI-powered code editors                         │    │
│  │                                        [✨ Post]    │    │
│  └─────────────────────────────────────────────────────┘    │
│  ... (3 more)                                                │
│                                                              │
│  ▾ Advanced options                                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Component design:**

**Section header:**

```
<div className="flex items-center gap-2 mt-8 mb-4">
  <TrendingUp className="h-4 w-4 text-primary" />
  <span className="text-sm font-medium text-foreground">Trending on X</span>
  <span className="text-xs text-muted-foreground">· Updated {timeAgo}</span>
</div>
```

**Category tabs** — horizontal scrollable row using shadcn/ui `ToggleGroup` or custom tabs:

```
<div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
  {categories.map(cat => (
    <button
      className={cn(
        "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
        selected === cat.id
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {cat.label}
    </button>
  ))}
</div>
```

Categories: `All`, `Technology`, `Business`, `News`, `Lifestyle`, `Sports`, `Entertainment`

**Trend cards** — compact, tappable cards:

```
<div className="space-y-2 mt-3">
  {trends.map(trend => (
    <div className="group flex items-start justify-between gap-3 rounded-lg border border-border
      p-3.5 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => fillTopicAndGenerate(trend.title)}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {trend.title}
          </span>
          <span className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
            trend.postCount === "High"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}>
            {trend.postCount}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
          {trend.description}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 opacity-0 group-hover:opacity-100 sm:opacity-0
          transition-opacity h-8 px-3 text-xs gap-1.5"
        onClick={(e) => { e.stopPropagation(); fillTopicAndGenerate(trend.suggestedAngle); }}
      >
        <Sparkles className="h-3 w-3" /> Post
      </Button>
    </div>
  ))}
</div>
```

**Behavior:**

1. **On mount:** Fetch trends for the `"all"` category. Show skeleton loaders (5 × `<Skeleton className="h-16 w-full rounded-lg" />`) while loading.
2. **On category tap:** Fetch trends for the selected category. Show skeletons during fetch. If cached server-side (Redis), this returns instantly.
3. **On trend card click:** Fill the topic input with `trend.title` AND start the agentic pipeline immediately (same behavior as suggestion chips).
4. **On "Post" button click:** Fill the topic input with `trend.suggestedAngle` (the more specific content angle) and start the pipeline.
5. **On mobile:** The "Post" button is always visible (no hover state on touch). The category tabs scroll horizontally.
6. **Error state:** If the trends API fails, show a muted message: `"Couldn't load trends right now"` with a small "Retry" link. Don't break the page — the topic input and suggestion chips remain fully functional.
7. **Empty state:** If no trends are returned, don't render the panel at all — silently hide it.
8. **Collapsed by default on mobile:** On screens < 640px, the trends panel is collapsed behind a `"Show trending topics"` toggle to keep the input screen focused. On desktop, it's expanded by default.

### Phase 3: Integration & Data Flow

**File:** `src/components/ai/agentic-posting-client.tsx` (modify existing)

1. **Import and render** `<AgenticTrendsPanel>` on Screen 1 (Input), positioned between the suggestion chips and the Advanced options toggle.

2. **Pass the `onSelectTrend` callback** to the panel. When a trend is selected:

   ```typescript
   const handleSelectTrend = (topicText: string) => {
     setTopic(topicText);
     // Immediately start the agentic pipeline — same as clicking Generate
     handleGenerate(topicText);
   };
   ```

3. **Zod schema** — add to `src/lib/schemas/common.ts`:

   ```typescript
   export const trendCategoryEnum = z.enum([
     "all",
     "technology",
     "business",
     "news",
     "lifestyle",
     "sports",
     "entertainment",
   ]);
   export type TrendCategory = z.infer<typeof trendCategoryEnum>;

   export const trendItemSchema = z.object({
     title: z.string(),
     description: z.string(),
     postCount: z.string(),
     category: z.string(),
     suggestedAngle: z.string(),
   });
   ```

4. **Redis caching** — in the API route, use the existing Redis connection:

   ```typescript
   import { redis } from "@/lib/rate-limiter"; // or wherever Redis is imported from

   const cacheKey = `trends:${category}`;
   const cached = await redis.get(cacheKey);
   if (cached) return Response.json(JSON.parse(cached));

   // ... AI call ...

   await redis.setex(cacheKey, 1800, JSON.stringify(result)); // 30 min TTL
   ```

   Check the existing codebase for how Redis is imported and used (the tweet importer uses Redis caching with 1-hour TTL — follow that same pattern).

Run `pnpm lint && pnpm typecheck`.

---

## Architectural Rules

1. **`ApiError`** for all error responses in the route
2. **OpenRouter** for AI — import from `@openrouter/ai-sdk-provider`
3. **Plan gate** — reuse the existing `checkAgenticPosting()` gate (or create `checkTrendDiscovery()` if you want separate gating)
4. **Structured logger** — `@/lib/logger`, not `console.log`
5. **AI quota** — count the trends lookup toward the user's AI usage
6. **shadcn/ui color tokens** — dark mode support on all new UI
7. **No new packages** — Redis, OpenRouter, Zod, lucide-react, sonner are all already available
8. **`exactOptionalPropertyTypes`** — conditional spread for optional props
9. Run **`pnpm lint && pnpm typecheck`** after each phase

---

## What NOT To Do

- **Do NOT use the X API Trends endpoints.** They require Pro tier ($5,000/month) or X Premium for the authenticated user. The AI-powered approach is cheaper, more flexible, and works for all users.
- **Do NOT poll for trends automatically.** Trends are fetched on-demand when the user opens the page or switches categories. The 30-minute Redis cache prevents redundant AI calls.
- **Do NOT make the trends panel mandatory.** If it fails to load, the page works perfectly without it — the topic input, suggestion chips, and manual entry are all independent of trends.
- **Do NOT create a separate page for trends.** It lives inline on the Agentic Posting input screen as a discovery enhancement, not a standalone feature.

---

## Deliverables

- [ ] **`GET /api/ai/trends`** route — AI-powered, Redis-cached, plan-gated, Zod-validated
- [ ] **`AgenticTrendsPanel` component** — category tabs, trend cards, loading/error states
- [ ] **Integrated into Agentic Posting input screen** — positioned between chips and advanced options
- [ ] **One-tap flow** — tapping a trend fills the input and starts the pipeline
- [ ] **Redis caching** — 30-minute TTL per category
- [ ] **Mobile responsive** — collapsed by default on small screens, horizontal-scroll category tabs
- [ ] **Dark mode** — shadcn/ui tokens only, no hardcoded colors
- [ ] **`pnpm lint && pnpm typecheck`** — passes cleanly
