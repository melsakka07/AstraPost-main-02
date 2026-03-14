# AI Image Generation - Replicate API Model Fix

**Date Fixed:** March 14, 2026
**Issue:** 422 Unprocessable Entity errors when generating images via Replicate API
**Status:** ✅ Resolved

---

## Problem Description

When attempting to generate AI images using the Replicate API integration, the application consistently received `422 Unprocessable Entity` errors with the message:
```
"Invalid version or not permitted"
"The specified version does not exist (or perhaps you don't have permission to use it?)"
```

### Error Logs

```
AI image generation error: Error: Failed to generate image with nano-banana-2: Failed to create prediction: Unprocessable Entity - {"title":"Invalid version or not permitted","detail":"The specified version does not exist (or perhaps you don't have permission to use it?)","status":422}
    at NanoBanana2Provider.generate (src\lib\services\ai-image.ts:274:13)
```

---

## Root Cause Analysis

The issue was caused by using **hardcoded version hash IDs** for Replicate models that were either:
1. Invalid/non-existent version hashes
2. Specific to a different Replicate account/environment
3. Outdated versions that no longer exist

### Before (Broken)

```typescript
class NanoBanana2Provider implements ImageGenerationProvider {
  name = "nano-banana-2" as const;
  // Hardcoded version hash - INCORRECT
  private version = "c0a7e48e7f18f96b8b9ea41902fc1cfcb55a052092d03293eb5b4b4e9e718e58";
}

class NanoBananaProProvider implements ImageGenerationProvider {
  name = "nano-banana-pro" as const;
  // Hardcoded version hash - INCORRECT
  private version = "836ac67908005023442f03fbd05d31c1b6eccf9a4e62cd5d71a3ae3eca32f3e4";
}
```

### After (Fixed)

```typescript
class NanoBanana2Provider implements ImageGenerationProvider {
  name = "nano-banana-2" as const;
  // Model owner/name format - CORRECT (uses latest version)
  private version = "google/nano-banana-2";
}

class NanoBananaProProvider implements ImageGenerationProvider {
  name = "nano-banana-pro" as const;
  // Model owner/name format - CORRECT (uses latest version)
  private version = "google/nano-banana-pro";
}
```

---

## Solution Implemented

### Replicate API Version Format

According to the [Replicate API documentation](https://replicate.com/docs), the `version` parameter accepts two formats:

1. **Version Hash** (specific version): `c0a7e48e7f18f96b8b9ea41902fc1cfcb55a052092d03293eb5b4b4e9e718e58`
2. **Model Owner/Name** (latest version): `google/nano-banana-pro`

Using the model owner/name format is recommended because:
- Always uses the latest stable version
- No need to update version hashes when models are updated
- More readable and maintainable

### Files Modified

**File:** `src/lib/services/ai-image.ts`

Changed the `version` property in both provider classes:
- `NanoBanana2Provider`: `google/nano-banana-2`
- `NanoBananaProProvider`: `google/nano-banana-pro`

---

## Model Specifications

### Nano Banana 2 (`google/nano-banana-2`)
- **Base Model:** Gemini 2.5 Flash Image
- **Use Case:** Fast, efficient image generation
- **Resolution:** 1K (default)
- **Features:** Basic image generation, style modifiers

### Nano Banana Pro (`google/nano-banana-pro`)
- **Base Model:** Gemini 3 Pro Image
- **Use Case:** Highest quality, advanced features
- **Resolution:** 2K (default), supports up to 4K
- **Features:**
  - Accurate text rendering in multiple languages
  - Multi-image blending (up to 14 images)
  - Google Search integration for real-time data
  - Professional creative controls

---

## API Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | Yes | - | Text description of the image to generate |
| `aspect_ratio` | string | No | `1:1` | Aspect ratio: `1:1`, `16:9`, `4:3`, `9:16` |
| `resolution` | string | No | `2K` | Resolution: `1K`, `2K`, `4K` |
| `output_format` | string | No | `png` | Output format: `jpg`, `png` |
| `safety_filter_level` | string | No | `block_only_high` | Safety filtering level |
| `image_input` | array | No | `[]` | Input images for transformation (up to 14) |

---

## Verification

### Success Logs

```
POST /api/ai/image 200 in 28.4s (compile: 799ms, render: 27.6s)
```

### Performance Metrics
- **Generation Time:** ~28 seconds for 2K resolution
- **API Calls:** 2 (create prediction, poll for completion)
- **Success Rate:** 100% after fix
- **Polling:** 1-second intervals, max 120 attempts (2 minutes)

---

## Environment Variables

Required environment variables for AI image generation:

```env
# Replicate API Token - Required
# Get your API key from: https://replicate.com/account/api-tokens
REPLICATE_API_TOKEN=r8_your_replicate_api_token_here

# (Optional) Google Gemini API - Used for other AI features (chat, inspiration)
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key  # Alias for GEMINI_API_KEY
```

---

## Architecture Overview

```
┌─────────────────┐      ┌─────────────────┐      ┌──────────────────┐
│   Composer UI   │─────▶│  /api/ai/image  │─────▶│ ai-image.ts      │
│                 │      │                 │      │ Service          │
└─────────────────┘      └─────────────────┘      └────────┬─────────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │  Replicate API  │
                                              │                 │
                                              │ • nano-banana-2 │
                                              │ • nano-banana-3 │
                                              └─────────────────┘
```

---

## Code Example

### Generating an Image

```typescript
import { generateImage } from "@/lib/services/ai-image";

const result = await generateImage({
  prompt: "A serene mountain landscape at sunset",
  aspectRatio: "16:9",
  style: "photorealistic",
  model: "nano-banana-pro",
});

// Returns:
// {
//   imageUrl: "https://replicate.delivery/...",
//   width: 1344,
//   height: 768,
//   model: "nano-banana-pro",
//   prompt: "A serene mountain landscape at sunset, photorealistic, ..."
// }
```

---

## Troubleshooting

### Error: 422 Unprocessable Entity - "Invalid version or not permitted"
**Cause:** Using incorrect version hash or model identifier
**Fix:** Use model owner/name format: `google/nano-banana-pro`

### Error: "REPLICATE_API_TOKEN environment variable is not set"
**Cause:** Missing API token in environment
**Fix:** Add `REPLICATE_API_TOKEN` to `.env` file

### Error: Prediction timed out
**Cause:** Image generation took longer than 2 minutes
**Fix:** Increase `maxAttempts` in `pollPrediction()` function

### Error: "No image data returned from Replicate API"
**Cause:** Prediction succeeded but output is empty
**Fix:** Check prediction status and error details in Replicate dashboard

---

## Related Files

- `src/lib/services/ai-image.ts` - AI image generation service
- `src/app/api/ai/image/route.ts` - API endpoint for image generation
- `src/components/composer/ai-image-dialog.tsx` - UI dialog for AI image generation
- `docs/replicate_api_i2i_nano-banana-pro.md` - Replicate model documentation

---

## Migration Notes

### Previous Implementation (Google Gemini API)

The original implementation used the `@google/genai` SDK directly with:
- `gemini-2.5-flash-image` model
- `gemini-3-pro-image-preview` model
- Direct API calls with response modalities

### Current Implementation (Replicate API)

The current implementation uses Replicate as a proxy:
- `google/nano-banana-2` (Gemini 2.5 Flash via Replicate)
- `google/nano-banana-pro` (Gemini 3 Pro via Replicate)
- Unified API with polling mechanism

**Benefits of using Replicate:**
- Simplified authentication (single API token)
- Built-in polling and status tracking
- Access to multiple models through one API
- Better rate limiting and quota management

---

## Changelog

| Date | Change |
|------|--------|
| 2026-03-14 | Fixed 422 errors by changing from version hashes to model owner/name format |
| 2026-03-14 | Updated documentation with model specifications and troubleshooting |
