# AI Image Generation - Replicate API Model Fix

**Date Fixed:** March 16, 2026
**Issue:** 422 Unprocessable Entity errors when generating images via Replicate API ("Additional property model is not allowed")
**Status:** ✅ Resolved

---

## Problem Description

When attempting to generate AI images using the Replicate API integration, the application received `422 Unprocessable Entity` errors with the message:

```
{"detail":"- version is required\n- Additional property model is not allowed\n","status":422,"title":"Input validation failed","invalid_fields":[{"type":"required","field":"","description":"version is required"},{"type":"additional_property_not_allowed","field":"","description":"Additional property model is not allowed"}]}
```

### Error Logs

```
AI image generation error: Error: Failed to create prediction: Unprocessable Entity - {"detail":"- version is required\n- Additional property model is not allowed\n"...}
    at startImageGeneration (src\lib\services\ai-image.ts:433:11)
```

---

## Root Cause Analysis

The issue was caused by sending the `model` parameter in the request body to the generic `/v1/predictions` endpoint.

1. The `/v1/predictions` endpoint **requires** a `version` parameter in the body and does **not** support `model`.
2. To run a model by name (always using the latest version), the correct endpoint is `POST /v1/models/{model_owner}/{model_name}/predictions`.

The previous implementation attempted to use `model` in the body with the generic endpoint, which led to the API rejecting the request.

### Before (Broken)

```typescript
// URL: https://api.replicate.com/v1/predictions
const body = {
  model: "google/nano-banana-pro", // ❌ Not allowed here
  input: { ... }
}
```

### After (Fixed)

```typescript
// URL: https://api.replicate.com/v1/models/google/nano-banana-pro/predictions
const body = {
  // No "model" or "version" here
  input: { ... }
}
```

---

## Solution Implemented

### Updated API Endpoint

Modified `src/lib/services/ai-image.ts` to use the model-specific endpoint:

```typescript
const createResponse = await fetch(`https://api.replicate.com/v1/models/${modelName}/predictions`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "wait",
  },
  body: JSON.stringify({
    input: {
      prompt,
      aspect_ratio: convertAspectRatioToReplicate(params.aspectRatio),
      resolution,
      output_format: "png",
      safety_filter_level: "block_only_high",
      image_input: [],
    },
  }),
});
```

---

## Model Specifications

### Nano Banana 2 (`google/nano-banana-2`)

- **Base Model:** Gemini 2.5 Flash Image
- **Use Case:** Fast, efficient image generation
- **Resolution:** 1K (default)

### Nano Banana Pro (`google/nano-banana-pro`)

- **Base Model:** Gemini 3 Pro Image
- **Use Case:** Highest quality, advanced features
- **Resolution:** 2K (default)

---

## Verification

### Success Criteria

- The API request uses the correct endpoint: `https://api.replicate.com/v1/models/.../predictions`
- The request body only contains `input` (and other valid options like `stream`), but NOT `model` or `version`.
- Replicate accepts the request and returns 201 Created (or 200 OK with `Prefer: wait`).

### Unit Tests

Ran `pnpm test src/lib/services/__tests__/ai-image.test.ts` to verify the service logic still holds.

---

## Related Files

- `src/lib/services/ai-image.ts` - AI image generation service
- `src/app/api/ai/image/route.ts` - API endpoint for image generation
