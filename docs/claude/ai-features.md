# AI Features Reference

This document maps all backend AI generation and processing endpoints to their respective responsibilities.

## 1. Core Generation

### `POST /api/ai/thread`

- **Purpose**: Generates multi-tweet threads from a starting topic or prompt.
- **Support**: Tones (professional, casual, educational, etc.), Languages (ar, en, fr, de, etc.).

### `POST /api/ai/tools`

- **Purpose**: General AI writing tools applied to a single tweet.
- **Actions**: Hooks, CTAs, Rewrite.

### `POST /api/ai/hashtags`

- **Purpose**: AI Hashtag Generator (Component: `src/components/ai/hashtag-generator.tsx`).
- **Details**: Language-aware, regional prioritization (MENA for Arabic).

### `POST /api/ai/translate`

- **Purpose**: Translates a tweet into a selected target language.

### `POST /api/ai/reply`

- **Purpose**: Reply Generator.

## 2. Agentic Posting (Pro/Agency)

### `POST /api/ai/agentic`

- **Purpose**: Initiates the 5-step Agentic Posting pipeline via SSE streaming.
- **Pipeline**: Research → Strategy → Write → Images → Review.
- **Database**: `agenticPosts` table.

### `POST /api/ai/agentic/[id]/regenerate`

- **Purpose**: Single-tweet regeneration within an existing agentic pipeline context.

### `POST /api/ai/agentic/[id]/approve`

- **Purpose**: Approves the generated agentic post content to be drafted, posted immediately, or scheduled.

## 3. Media & Assets

### `POST /api/ai/image`

- **Purpose**: Image generation via Replicate (Nano Banana models).
- **Details**: Supports styles (Photorealistic, Anime, etc.) and aspect ratios (1:1, 16:9, 9:16). Auto-generates prompt from tweet if not provided.

### `GET /api/ai/image/status`

- **Purpose**: Polling endpoint to check Replicate generation status and cache the final result.

## 4. Advanced Creators

### `POST /api/ai/calendar`

- **Purpose**: Generates a weekly Content Calendar strategy based on tone and topic.

### `POST /api/ai/template-generate`

- **Purpose**: Fills out a saved template format using user-provided input parameters.

### `POST /api/ai/variants`

- **Purpose**: Variant Generator to A/B test different phrasing of the same concept.

### `POST /api/ai/affiliate`

- **Purpose**: Generates promotional tweets for Amazon affiliate links.

### `POST /api/ai/summarize`

- **Purpose**: Summarizes long-form content or articles into concise posts.

## 5. Evaluation & Inspiration

### `POST /api/ai/score`

- **Purpose**: Viral Score evaluator.
- **Details**: Scores content 0-100 based on hooks, value prop, CTA, readability, and emotion. Does not consume user quota.

### `POST /api/ai/inspire`

- **Purpose**: Content Inspiration (Google Gemini).
- **Actions**: Rephrase, change tone, expand, add takeaway, translate, counter-point.

### `POST /api/ai/inspiration`

- **Purpose**: Fetches trending inspiration topics by niche. Cached for 6 hours.

### `POST /api/ai/enhance-topic`

- **Purpose**: Enhances a raw topic string into a more robust prompt.

## 6. Quota & Tracking

### `GET /api/ai/quota`

- **Purpose**: Retrieves the user's monthly AI usage counts.

### `GET /api/ai/image/quota`

- **Purpose**: Retrieves the user's monthly AI image generation counts and available models.

### `GET /api/ai/history`

- **Purpose**: Retrieves the user's historical AI generation log (`aiGenerations` table).
