### 3.8 AI-Powered Image Tweet Creator (Multi-Model Image Generation)

**Current State**: The Composer (`src/components/composer/composer.tsx`) supports manual media uploads via `/api/media/upload` (images, videos, GIFs stored locally in `public/uploads`). Users must source or create images externally, download them, and then upload them into the composer. There is **no AI image generation capability** anywhere in the platform. The existing AI features (thread writer, hook, CTA, rewrite, translate, affiliate) are all text-only, powered by OpenRouter's LLM models. The `media` table schema (`src/lib/schema.ts`) stores `fileUrl`, `fileType`, `fileSize`, and `xMediaId`, and the `scheduleProcessor` (`src/lib/queue/processors.ts`) already handles uploading media buffers to X via `XApiService.uploadMedia()` — meaning the publish pipeline is fully media-ready.

**Proposed Implementation**:

#### 3.8.1 Multi-Model AI Image Generation Engine

- New backend service: `src/lib/services/ai-image.ts` — a provider-agnostic image generation abstraction.
- Supported AI image models (user-selectable):

| Model | Provider | Strengths | Best For |
|-------|----------|-----------|----------|
| **Nano Banana 2** | Gemini Nano | Fast, efficient, advanced reasoning, multi-image fusion | High-volume daily posting, quick iterations |
| **Banana Pro** | Gemini Nano Pro | State-of-the-art generation + editing, character/style consistency | Premium visual content, brand consistency |
| **Google Gemini (Imagen 4)** | Google | Highest quality, latest model | Hero images, marketing visuals |

- Each provider implementation wraps its respective API endpoint and returns a standardized `{ imageUrl: string, width: number, height: number, model: string }` response.
- Model selection stored in user preferences (`user.preferredImageModel text` column) with a per-generation override in the UI.
- Image generation quota tied to plan limits:

| Plan | AI Images/Month | Available Models |
|------|----------------|------------------|
| Free | 3 | Nano Banana 2 only |
| Pro ($29/mo) | 50 | All models |
| Agency ($99/mo) | Unlimited | All models + priority queue |

#### 3.8.2 Composer Integration — "Generate Image" Flow

- New **"AI Image"** button added to each tweet card's footer in the Composer (alongside the existing media upload and AI rewrite buttons).
- Clicking opens a `<Dialog>` component (`src/components/composer/ai-image-dialog.tsx`) with:
  - **Auto-populated prompt**: Derived from the tweet's text content. The system sends the tweet text to the AI with a meta-prompt: *"Generate a vivid, specific image prompt that visually represents this tweet's message, suitable for social media."*
  - **Manual prompt override**: Users can edit or replace the auto-generated prompt.
  - **Model selector**: Dropdown to choose between Nano Banana 2, Banana Pro, or Google Gemini (Imagen 4). Defaults to user's preferred model.
  - **Aspect ratio selector**: 1:1 (square — ideal for X cards), 16:9 (landscape), 4:3 (standard).
  - **Style presets**: Photorealistic, Illustration, Minimalist, Abstract, Infographic, Meme-style.
  - **"Generate" button** with real-time progress indicator.
- On successful generation:
  - Image is saved to the platform's storage (local `public/uploads` or Vercel Blob via the existing `src/lib/storage.ts` abstraction).
  - Automatically attached to the tweet's media array (same flow as manual upload — reuses `addTweetMedia()`).
  - Preview rendered inline in the tweet card and in the Mobile Preview panel.
  - Toast notification: "Image generated and attached!".
- On failure: Toast error with retry option and fallback to manual upload.

#### 3.8.3 API Endpoint

- New `POST /api/ai/image` route (`src/app/api/ai/image/route.ts`):
  - **Request schema** (Zod validated):
    ```
    {
      prompt: string (max 1000 chars),
      tweetContent: string (optional — used for auto-prompt if prompt is empty),
      model: "nano-banana-2" | "banana-pro" | "gemini-imagen4",
      aspectRatio: "1:1" | "16:9" | "4:3" | "9:16",
      style: "photorealistic" | "illustration" | "minimalist" | "abstract" | "infographic" | "meme"
    }
    ```
  - **Auth + Plan gating**: Uses existing `checkAiLimit()` and `checkAiQuota()` from `src/lib/middleware/require-plan.ts` and `src/lib/services/ai-quota.ts`.
  - **Rate limiting**: Uses existing `checkRateLimit()` from `src/lib/rate-limiter.ts` with category `"ai_image"`.
  - **Usage recording**: Inserts into `aiGenerations` table with `type: "image"` for quota tracking.
  - **Response**: `{ imageUrl: string, width: number, height: number, model: string, prompt: string }`.

#### 3.8.4 One-Click "Generate & Post" Workflow

- After image generation, the Composer's submit flow (`handleSubmit`) already handles media in the `tweets[].media` array — **no changes needed** to the post creation API (`/api/posts`) or the BullMQ `scheduleProcessor`.
- The processor's existing `loadMediaBuffer()` → `xService.uploadMedia()` → `xService.postTweet(text, mediaIds)` pipeline handles AI-generated images identically to manually uploaded ones.
- This means the full flow is: **Write tweet → Generate AI image → Preview → Schedule/Post → Image uploaded to X automatically**.

#### 3.8.5 Image Regeneration & Editing

- "Regenerate" button on generated images (keeps same prompt, produces a new image).
- "Edit prompt" option to refine without starting over.
- Image history panel: last 5 generated images for the current tweet, allowing users to pick the best one.
- "Use for all tweets" option in threads — apply the same image style/prompt pattern across all thread tweets.

**Schema Changes**:
- Add `preferredImageModel text` column to `user` table (default: `"nano-banana-2"`).
- Add new rate limit category `"ai_image"` to `src/lib/rate-limiter.ts`.
- Extend `aiGenerations.type` enum to include `"image"`.

**Files Involved**:
- New `src/lib/services/ai-image.ts` (provider abstraction + model implementations)
- New `src/app/api/ai/image/route.ts` (API endpoint)
- New `src/components/composer/ai-image-dialog.tsx` (generation UI dialog)
- Modified `src/components/composer/composer.tsx` (add AI Image button, wire dialog)
- Modified `src/lib/schema.ts` (add `preferredImageModel` to user table)
- Modified `src/lib/plan-limits.ts` (add image generation quotas)
- Modified `src/lib/rate-limiter.ts` (add `ai_image` rate limit category)
- Modified `src/app/dashboard/settings/page.tsx` (preferred model selector)

**Revenue Impact**: Very High — AI image generation is a premium, high-perceived-value feature that no competing X scheduling tool offers natively. It transforms AstraPost from a text scheduling tool into a full content creation suite. The model tiering (Free: basic model only, Pro: all models) creates a strong upgrade incentive. Estimated conversion lift: 15-25% among users who try the feature.

**UX Impact**: Very High — eliminates the #1 friction point in visual content creation: leaving the platform to create/find images. Users can go from idea to published visual tweet in under 60 seconds.

**Effort**: Large | **Priority**: High

---

### 3.9 Inspiration — Influencer Tweet Import & AI-Assisted Adaptation

**Current State**: The platform has no mechanism for users to import, reference, or draw inspiration from existing content on X. The existing `3.4 AI Content Inspiration Feed` generates AI topic suggestions from scratch — it does **not** pull real tweets. Users who want to riff on a trending tweet or influencer post must manually copy the text, switch to the AstraPost Composer, paste it, and then manually rewrite it. There is no tweet URL parsing, no context retrieval (subtweets, replies), and no guided adaptation workflow. The existing `/api/ai/tools` route supports a `"rewrite"` tool, but it operates on raw text with no source attribution or ethical guardrails.

**Proposed Implementation**:

#### 3.9.1 Tweet URL Import Engine

- New backend service: `src/lib/services/tweet-importer.ts`.
- Accepts an X tweet URL in any supported format:
  - `https://x.com/{username}/status/{tweetId}`
  - `https://twitter.com/{username}/status/{tweetId}`
  - `https://x.com/i/web/status/{tweetId}`
- Extracts the `tweetId` via regex, then uses `XApiService` to fetch the tweet via the X API v2 (`GET /2/tweets/:id`).
- Retrieves the **full context** including:
  - Original tweet text, author name, handle, avatar, and verified status.
  - Media attachments (images, videos) — displayed for reference only, not copied.
  - Public metrics (likes, retweets, replies, impressions) to show the tweet's performance.
  - Conversation thread context: fetches up to 5 parent tweets (if it's a reply) and up to 10 direct replies using the X API v2 conversation lookup (`conversation_id` field).
  - Quote tweet content (if the source tweet is a quote tweet).
- Returns a structured `ImportedTweetContext` object:
  ```
  {
    originalTweet: { id, text, authorName, authorHandle, authorAvatar, metrics, media, createdAt },
    parentTweets: [...],     // thread context above
    topReplies: [...],       // popular replies below
    quotedTweet: { ... },    // if applicable
    conversationId: string
  }
  ```

#### 3.9.2 "Inspiration" Dashboard Page

- New page: `src/app/dashboard/inspiration/page.tsx` — accessible from the sidebar navigation.
- **URL Input Section**:
  - Prominent input field with placeholder: *"Paste a tweet URL to get inspired..."*
  - "Import" button that triggers the fetch.
  - URL validation with immediate feedback (invalid format, private account, deleted tweet).
  - Loading skeleton while the tweet is being fetched.
- **Imported Tweet Display**:
  - Renders the original tweet in a styled card that mirrors X's visual format (avatar, name, handle, verified badge, timestamp, text, media thumbnails, metrics bar).
  - If thread context exists: expandable "View Thread" accordion showing parent tweets above and replies below.
  - Metrics badges: Likes, Retweets, Replies, Impressions — to help users understand why this tweet performed well.
- **Two-Path Content Creation Panel** (side-by-side with the imported tweet):

  **Path A — Manual Refinement:**
  - "Use as Starting Point" button pre-fills a Composer-style textarea with the original tweet text.
  - Full editing capabilities: modify text, change tone, add/remove content.
  - Character counter (280 limit) with real-time feedback.
  - "Send to Composer" button transfers the refined text to the main Composer page (via URL params or React context) for scheduling, account selection, and media attachment.

  **Path B — AI-Assisted Enhancement:**
  - "Enhance with AI" button opens an AI adaptation panel with multiple options:

  | AI Action | Description | API Endpoint |
  |-----------|-------------|-------------|
  | **Rephrase** | Rewrite in different words while preserving the core message | `POST /api/ai/inspire` |
  | **Change Tone** | Adapt to a different tone (professional → casual, etc.) | `POST /api/ai/inspire` |
  | **Expand to Thread** | Turn a single tweet into a multi-tweet thread elaborating on the idea | `POST /api/ai/inspire` |
  | **Add Personal Take** | Inject the user's perspective/opinion onto the original idea | `POST /api/ai/inspire` |
  | **Translate & Adapt** | Translate to another language while adapting cultural references | `POST /api/ai/inspire` |
  | **Create Counter-Point** | Generate a respectful counter-argument or alternative viewpoint | `POST /api/ai/inspire` |

  - Each action uses the full imported context (original tweet + thread + replies) as input to produce more contextually aware output.
  - Tone selector (professional, casual, humorous, educational, inspirational, viral) — shared with existing AI tools.
  - Language selector (Arabic/English + future multi-language from feature 3.6).
  - Generated result appears in an editable preview area. Users can iterate: "Regenerate", "Try Different Tone", or manually edit.
  - "Send to Composer" button transfers the final adapted content.

#### 3.9.3 API Endpoints

- **`POST /api/ai/inspire`** (`src/app/api/ai/inspire/route.ts`):
  - **Request schema** (Zod validated):
    ```
    {
      originalTweet: string (the source tweet text),
      threadContext: string[] (optional — surrounding tweets for context),
      action: "rephrase" | "change_tone" | "expand_thread" | "add_take" | "translate" | "counter_point",
      tone: "professional" | "casual" | "humorous" | "educational" | "inspirational" | "viral",
      language: "ar" | "en",
      userContext: string (optional — user's personal angle or brand voice)
    }
    ```
  - Uses existing OpenRouter integration (`@openrouter/ai-sdk-provider`) with model from `OPENROUTER_MODEL` env var.
  - AI system prompt includes ethical guardrails: *"You are helping a user create original content inspired by an existing tweet. Never plagiarize — always produce substantially different text that adds new value, perspective, or creative expression. The output should be the user's own voice, not a copy."*
  - Returns `{ tweets: string[], action: string, sourceTweetId: string }` — single tweet or thread array.
  - Auth + plan gating + rate limiting + quota recording via existing middleware stack.

- **`POST /api/x/tweet-lookup`** (`src/app/api/x/tweet-lookup/route.ts`):
  - Accepts `{ tweetUrl: string }`, extracts tweet ID, fetches via X API v2.
  - Returns the full `ImportedTweetContext` object.
  - Rate limited: 20 lookups/hour (Free), 100/hour (Pro), 200/hour (Agency).
  - Caches results in Redis (TTL: 1 hour) to avoid redundant X API calls.

#### 3.9.4 Sidebar Navigation Integration

- Add "Inspiration" item to `src/components/dashboard/sidebar.tsx` navigation array:
  - Icon: `Lightbulb` from lucide-react.
  - Label: "Inspiration".
  - Href: `/dashboard/inspiration`.
  - Position: after "AI Writer", before "Affiliate".

#### 3.9.5 Inspiration History & Bookmarks

- New `inspiration_bookmarks` table:
  ```
  id, userId, sourceTweetId, sourceTweetUrl, sourceAuthorHandle,
  sourceText, adaptedText, action, tone, language, createdAt
  ```
- "Save Inspiration" button bookmarks an imported tweet for later use.
- "History" tab on the Inspiration page showing past imports and adaptations.
- "Re-adapt" button on history items to generate fresh variations.
- Pro feature: unlimited bookmarks. Free: last 5 only.

#### 3.9.6 Ethical Content Creation Guardrails

- **No direct copy**: The "Send to Composer" button is disabled if the text matches the original tweet by more than 80% (Levenshtein similarity check in the frontend).
- **Attribution suggestion**: When adapted content is close to the source, suggest adding "Inspired by @{handle}" or a quote-tweet format.
- **Source tracking**: The `posts` table can optionally store `inspiredByTweetId text` to maintain provenance (not displayed publicly, for internal analytics only).
- **Content policy notice**: Small disclaimer on the Inspiration page: *"Create original content inspired by trending ideas. Always add your unique perspective."*

**Schema Changes**:
- New `inspiration_bookmarks` table in `src/lib/schema.ts`.
- Add optional `inspiredByTweetId text` column to `posts` table.
- Add `"inspiration"` and `"inspire"` to `aiGenerations.type` values.
- Add `"tweet_lookup"` rate limit category to `src/lib/rate-limiter.ts`.

**Files Involved**:
- New `src/lib/services/tweet-importer.ts` (tweet URL parsing + X API fetch + context retrieval)
- New `src/app/api/x/tweet-lookup/route.ts` (tweet import API endpoint)
- New `src/app/api/ai/inspire/route.ts` (AI adaptation API endpoint)
- New `src/app/dashboard/inspiration/page.tsx` (Inspiration page UI)
- New `src/components/inspiration/imported-tweet-card.tsx` (tweet display component)
- New `src/components/inspiration/adaptation-panel.tsx` (AI adaptation UI)
- New `src/components/inspiration/manual-editor.tsx` (manual refinement textarea)
- Modified `src/components/dashboard/sidebar.tsx` (add Inspiration nav item)
- Modified `src/lib/schema.ts` (new table + posts column)
- Modified `src/lib/rate-limiter.ts` (add `tweet_lookup` category)
- Modified `src/lib/plan-limits.ts` (add inspiration quotas)

**Revenue Impact**: Very High — the Inspiration feature addresses one of the most common content creation workflows ("I saw a great tweet, I want to make something similar") and provides a legitimate, AI-enhanced path from inspiration to publication. The AI adaptation tools (expand to thread, change tone, translate) are natural Pro-plan differentiators. The tweet performance metrics (showing why an influencer's tweet went viral) add educational value that increases platform stickiness. Estimated impact: 10-20% increase in daily active usage, 8-15% improvement in free-to-paid conversion among users who use the feature.

**UX Impact**: Very High — transforms the content creation workflow from "stare at blank page" to "see what's working → adapt → publish". Reduces average time-to-post by an estimated 40-60% for users who draw inspiration from existing content. The two-path approach (manual vs AI) respects both power users who want full control and casual users who prefer AI assistance.

**Effort**: Large | **Priority**: High

---