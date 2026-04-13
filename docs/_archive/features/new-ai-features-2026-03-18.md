# New AI Features — Implementation Reference (2026-03-18)

## Overview

7 new Pro/Agency-only AI features were added to AstraPost, expanding the platform from a scheduler into a full content strategy suite for Arabic-speaking creators in the MENA region.

---

## Feature Map

| #   | Feature                | Route                            | Page                              | Plan       |
| --- | ---------------------- | -------------------------------- | --------------------------------- | ---------- |
| 1   | AI Content Calendar    | `POST /api/ai/calendar`          | `/dashboard/ai/calendar`          | Pro/Agency |
| 2   | URL → Thread Converter | `POST /api/ai/summarize`         | `/dashboard/ai` (URL tab)         | Pro/Agency |
| 3   | A/B Variant Generator  | `POST /api/ai/variants`          | `/dashboard/ai` (Variants tab)    | Pro/Agency |
| 4   | Best Posting Time      | `GET /api/analytics/best-time`   | (API only — widget use)           | Pro/Agency |
| 5   | Competitor Analyzer    | `POST /api/analytics/competitor` | `/dashboard/analytics/competitor` | Pro/Agency |
| 6   | Reply Suggester        | `POST /api/ai/reply`             | `/dashboard/ai/reply`             | Pro/Agency |
| 7   | Bio Optimizer          | `POST /api/ai/bio`               | `/dashboard/ai/bio`               | Pro/Agency |

All features count against the user's monthly AI quota (`aiGenerationsPerMonth`) and are blocked for free-plan users with a 402 upgrade response.

---

## 1. AI Content Calendar

**File:** `src/app/api/ai/calendar/route.ts`
**Page:** `src/app/dashboard/ai/calendar/page.tsx`

### API Contract

```http
POST /api/ai/calendar
Content-Type: application/json

{
  "niche": "Islamic finance",          // required, 1–300 chars
  "language": "ar",                    // ar|en|fr|de|es|it|pt|tr|ru|hi — default "en"
  "postsPerWeek": 3,                   // 1–14 — default 3
  "weeks": 1,                          // 1–4 — default 1
  "tone": "educational"                // professional|casual|educational|inspirational|humorous|viral
}
```

### Response

```json
{
  "items": [
    {
      "day": "Monday",
      "time": "9:00 AM AST",
      "topic": "5 myths about halal investing debunked",
      "tweetType": "thread",
      "tone": "educational",
      "brief": "Write a 5-tweet thread busting common misconceptions..."
    }
  ]
}
```

### UI Features

- Items grouped by day of week
- Click chevron → opens `/dashboard/compose?prefill=...&type=thread`
- Tone badge + time chip per item
- Color-coded tweet type badges (tweet/thread/poll/question)

---

## 2. URL → Thread Converter

**File:** `src/app/api/ai/summarize/route.ts`
**UI:** New "URL" tab in `/dashboard/ai`

### API Contract

```http
POST /api/ai/summarize
Content-Type: application/json

{
  "url": "https://example.com/article",   // required, valid URL
  "language": "ar",                        // output language
  "tweetCount": 5,                         // 3–12
  "tone": "educational"
}
```

### Response

```json
{
  "tweets": ["Hook tweet...", "Point 2...", "..."],
  "title": "Article Title Extracted",
  "sourceLanguage": "English"
}
```

### How It Works

1. Fetches URL with Googlebot user-agent (avoids blocking)
2. Strips `<script>`, `<nav>`, `<footer>`, ads via Cheerio
3. Prefers `<article>` / `<main>` content, falls back to `<body>`
4. Truncates to 4,000 chars before sending to OpenRouter
5. Returns translated thread if output language differs from source

### Error Conditions

- `422` — URL unreachable or < 100 chars of content found
- `400` — invalid URL format

---

## 3. A/B Variant Generator

**File:** `src/app/api/ai/variants/route.ts`
**UI:** New "Variants" tab in `/dashboard/ai`

### API Contract

```http
POST /api/ai/variants
Content-Type: application/json

{
  "tweet": "Original tweet text here",
  "language": "en"
}
```

### Response

```json
{
  "variants": [
    {
      "text": "Emotional version...",
      "angle": "emotional",
      "rationale": "Connects through personal story..."
    },
    {
      "text": "Data-driven version...",
      "angle": "factual",
      "rationale": "Uses specific numbers..."
    },
    {
      "text": "Question version...",
      "angle": "question",
      "rationale": "Invites engagement..."
    }
  ]
}
```

Always returns exactly 3 variants. UI has "Copy" and "Use" (loads back into editor) buttons per variant.

---

## 4. Best Posting Time Predictor

**File:** `src/app/api/analytics/best-time/route.ts`

### API Contract

```http
GET /api/analytics/best-time
```

### Response

```json
{
  "insufficientData": false,
  "dataPoints": 45,
  "slots": [
    {
      "day": "Tuesday",
      "hour": 8,
      "label": "Tuesday at 8:00 AM",
      "confidence": 67,
      "avgEngagement": 4.32
    }
  ]
}
```

Returns `insufficientData: true` when fewer than 5 published tweets with analytics exist. Top 3 time slots returned.

### Algorithm

- Scans last 90 days of `tweet_analytics` joined to `posts`
- Posts in the last 30 days weighted 2× (recency bias)
- Aggregates engagement rate by `(day, hour)` bucket
- Normalizes and sorts; returns top 3

---

## 5. Competitor / Account Analyzer

**File:** `src/app/api/analytics/competitor/route.ts`
**Page:** `src/app/dashboard/analytics/competitor/page.tsx`

**Requires:** `TWITTER_BEARER_TOKEN` environment variable.

### API Contract

```http
POST /api/analytics/competitor
Content-Type: application/json

{
  "username": "elonmusk",       // without @, alphanumeric + underscore only
  "language": "en"              // "ar" or "en" for the analysis output
}
```

### Response

```json
{
  "username": "elonmusk",
  "displayName": "Elon Musk",
  "followerCount": 180000000,
  "tweetCount": 87,
  "analysis": {
    "topTopics": ["Tesla", "SpaceX", "AI", "..."],
    "postingFrequency": "~15 posts/week",
    "preferredContentTypes": ["replies", "questions", "controversial"],
    "toneProfile": "Casual and provocative...",
    "topHashtags": ["#Tesla", "#AI"],
    "bestPostingTimes": "Evenings, often after 6pm EST",
    "keyStrengths": ["..."],
    "differentiationOpportunities": ["..."],
    "summary": "Strategic 3-4 sentence overview..."
  }
}
```

### Flow

1. Twitter v2 API: `GET /2/users/by/username/{username}` → resolve user ID
2. Twitter v2 API: `GET /2/users/{id}/tweets?max_results=100` (excludes retweets/replies)
3. Feeds tweet digest (first 50 tweets, truncated) to OpenRouter for AI pattern analysis

---

## 6. Reply & Engagement Suggester

**File:** `src/app/api/ai/reply/route.ts`
**Page:** `src/app/dashboard/ai/reply/page.tsx`

**Requires:** `TWITTER_BEARER_TOKEN` (used by `tweet-importer.ts`)

### API Contract

```http
POST /api/ai/reply
Content-Type: application/json

{
  "tweetUrl": "https://x.com/username/status/123",
  "language": "ar",
  "tone": "casual",
  "goal": "add"     // agree|add|counter|funny|question
}
```

### Response

```json
{
  "tweetText": "Original tweet content...",
  "tweetAuthor": "@username",
  "replies": [
    { "text": "Reply option 1...", "style": "insightful" },
    { "text": "Reply option 2...", "style": "witty" },
    ...
  ]
}
```

Returns 3–5 reply options. UI has Copy + "Send to Composer" (→ `/dashboard/compose?prefill=...`) buttons.

---

## 7. AI Profile Bio Optimizer

**File:** `src/app/api/ai/bio/route.ts`
**Page:** `src/app/dashboard/ai/bio/page.tsx`

### API Contract

```http
# Fetch connected username
GET /api/ai/bio

# Generate bio variants
POST /api/ai/bio
Content-Type: application/json

{
  "currentBio": "Current bio text (optional)",
  "goal": "attract_clients",     // general|gain_followers|attract_clients|build_authority
  "language": "ar",
  "niche": "Islamic finance"
}
```

### Response

```json
{
  "variants": [
    {
      "text": "Bio text under 160 chars...",
      "goal": "Authority-focused",
      "rationale": "Why this version works..."
    },
    ...
  ]
}
```

Always returns exactly 3 variants. Each bio is validated to stay under 160 chars (X's limit). UI shows char count and a one-click copy button per variant.

---

## Plan Gating

All 7 features are controlled by new boolean flags added to `src/lib/plan-limits.ts`:

```typescript
canUseContentCalendar: boolean;
canUseUrlToThread: boolean;
canUseVariantGenerator: boolean;
canUseCompetitorAnalyzer: boolean;
canUseReplyGenerator: boolean;
canUseBioOptimizer: boolean;
```

Free plan: all `false`. Pro Monthly, Pro Annual, Agency: all `true`.

New check functions in `src/lib/middleware/require-plan.ts`:

- `checkContentCalendarAccessDetailed(userId)`
- `checkUrlToThreadAccessDetailed(userId)`
- `checkVariantGeneratorAccessDetailed(userId)`
- `checkCompetitorAnalyzerAccessDetailed(userId)`
- `checkReplyGeneratorAccessDetailed(userId)`
- `checkBioOptimizerAccessDetailed(userId)`

All return a 402 with `upgrade_url: "/pricing"` and `suggested_plan: "pro_monthly"` when blocked.

---

## Sidebar Navigation

Added to `src/components/dashboard/sidebar.tsx`:

**AI Tools section:**

- Content Calendar → `/dashboard/ai/calendar`
- Reply Suggester → `/dashboard/ai/reply`
- Bio Optimizer → `/dashboard/ai/bio`

**Analytics section:**

- Competitor → `/dashboard/analytics/competitor`

**AI Writer page** (`/dashboard/ai`) now has 4 tabs:

1. Thread Writer (existing)
2. URL → Thread (new)
3. Variants (new)
4. Hashtags (existing)

---

## Environment Variables Required

| Feature             | Required Env Var               |
| ------------------- | ------------------------------ |
| All AI features     | `OPENROUTER_API_KEY`           |
| Competitor Analyzer | `TWITTER_BEARER_TOKEN`         |
| Reply Suggester     | `TWITTER_BEARER_TOKEN`         |
| URL → Thread        | None extra (uses public fetch) |

No new database migrations were required. All features use existing tables (`ai_generations` for quota tracking, `tweet_analytics` + `posts` for Best Time).
