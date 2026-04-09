# AI Features Reference

## 1. AI Thread Writer

- `POST /api/ai/thread` — Generate 3-15 tweet threads
- Tones: professional, casual, educational, inspirational, humorous, viral, controversial
- Languages: ar, en, fr, de, es, it, pt, tr, ru, hi

## 2. AI Image Generation

- `POST /api/ai/image` — Replicate API (Flux models)
- Styles: Photorealistic, Anime, Digital Art, etc.
- Aspect ratios: 1:1, 16:9, 9:16
- MENA regional optimization

## 3. AI Hashtag Generator

- Component: `src/components/ai/hashtag-generator.tsx`
- Language-aware, regional prioritization (MENA for Arabic)

## 4. AI Inspiration

- `POST /api/ai/inspire` — Google Gemini API
- Actions: rephrase, change tone, expand, add takeaway, translate, counter-point

## 5. Tweet Import (Inspiration)

- `POST /api/x/tweet-lookup` — Import public tweets
- Full context (parent tweets, top replies), similarity checking, bookmarks

## 6. Viral Content Analyzer

- `GET /api/analytics/viral?days=90` — Analyze top tweets
- Dimensions: hashtags, keywords, length, timing, content types

## 7. Agentic Posting (Pro/Agency)

- Route: `/dashboard/ai/agentic`
- 5-step pipeline: Research → Strategy → Write → Images → Review
- SSE streaming, session recovery, too-broad topic detection
- DB table: `agenticPosts` (migration `0038_tiny_rocket_raccoon.sql`)
- Gate: `checkAgenticPostingAccessDetailed` via `aiPreamble`
