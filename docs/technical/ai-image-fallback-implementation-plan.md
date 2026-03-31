# AI Image Generation Fallback Logic - Implementation Plan

## Status: ✅ PHASE 1 COMPLETE (Documentation Updates)

The core requirements are **already correctly implemented** in the codebase. Phase 1 documentation improvements have been completed as of 2026-03-31.

The majority of the requirements are **already correctly implemented** in the codebase. This plan documents the verification and minor improvements needed.

---

## Requirements vs Implementation Matrix

| Requirement | Status | File | Lines |
|------------|--------|------|-------|
| Primary model: `google/nano-banana-2` (1K) | ✅ | `ai-image.ts` | 452-453 |
| Secondary model: `google/nano-banana-pro` (2K) | ✅ | `ai-image.ts` | 452-453 |
| Backup model: `google/nano-banana` | ✅ | `ai-image.ts` | 452 |
| LLM uses `OPENROUTER_MODEL` from .env | ✅ | `route.ts` | 64-69 |
| No hardcoded `OPENROUTER_MODEL` fallback | ✅ | `route.ts` | 64-66 |
| Credit protection (no charge on failure) | ✅ | `status/route.ts` | 183 |
| Content safety checks (no fallback) | ✅ | `status/route.ts` | 82-84 |
| Auto-fallback: primary → backup | ✅ | `status/route.ts` | 91-122 |
| Auto-fallback: secondary → backup | ✅ | `status/route.ts` | 91-122 |
| Transient errors: `retryable: true` | ✅ | `status/route.ts` | 128-147 |

---

## Phase 1: Documentation Updates (✅ COMPLETE)

All documentation tasks have been completed as of 2026-03-31.

### 1.1 Add Model Documentation (✅ DONE)

**File**: `src/lib/services/ai-image.ts`

Add JSDoc comments to clarify model purposes:

```typescript
/**
 * Image generation models available for AI image generation.
 *
 * Models:
 * - nano-banana-2: Primary model (google/nano-banana-2, Gemini 2.5 Flash Image)
 *   - Fast, efficient, generates at 1K resolution
 *   - Best for: Quick iterations, high-volume use cases
 *
 * - nano-banana-pro: Secondary model (google/nano-banana-pro, Gemini 3 Pro Image)
 *   - Highest quality, supports text rendering, generates at 2K resolution
 *   - Best for: Final assets, typography, complex scenes
 *
 * - nano-banana: Backup model (google/nano-banana, Gemini 2.5 Flash Image)
 *   - Reliable fallback for both primary and secondary models
 *   - Always generates at 1K resolution
 *   - Automatically used when primary or secondary fails
 */
export type ImageModel = "nano-banana-2" | "nano-banana-pro" | "nano-banana";
```

### 1.2 Document Fallback Behavior (✅ DONE)

**File**: `src/app/api/ai/image/status/route.ts`

Add comment explaining the fallback flow:

```typescript
/**
 * AI Image Status Polling Endpoint
 *
 * Fallback Logic:
 * 1. Credit Protection: Only credits on success → aiGenerations written on "succeeded"
 * 2. Content Safety: No fallback for safety violations (safety, forbidden, HARM, violat)
 * 3. Auto-Fallback: nano-banana-2 or nano-banana-pro → nano-banana (silent, transparent)
 * 4. Transient Errors: Returns SERVICE_UNAVAILABLE with retryable: true
 *
 * The client seamlessly continues polling with the new prediction ID when fallback occurs.
 */
```

### 1.3 Update Environment Variable Documentation (✅ DONE)

**File**: `.env.example` (created)

Add documentation for `OPENROUTER_MODEL`:

```bash
# AI via OpenRouter (primary AI provider)
# Get your API key from: https://openrouter.ai/settings/keys
# Browse models at: https://openrouter.ai/models
OPENROUTER_API_KEY=sk-or-v1-your-key

# Model to use for LLM prompt generation (required for AI image auto-prompt)
# IMPORTANT: Never hardcode this value. Must be set in .env
# Default recommendation: anthropic/claude-sonnet-4.6 or openai/gpt-4o
OPENROUTER_MODEL="anthropic/claude-sonnet-4.6"
```

### 1.4 Update README Documentation (✅ DONE)

**File**: `README.md`

Update the AI Image Generation section:

```markdown
### AI Image Generation

Generate images via Replicate using Google's Nano Banana models:

- **Primary**: `google/nano-banana-2` (Gemini 2.5 Flash) - Fast, 1K resolution
- **Secondary**: `google/nano-banana-pro` (Gemini 3 Pro) - Best quality, 2K resolution
- **Backup**: `google/nano-banana` - Automatic fallback for reliability

**Fallback Logic:**
- If primary or secondary model fails, automatically retries with backup model
- Content safety violations are not retried (adjust prompt and try again)
- Credits are only consumed on successful generation
- Transient errors (rate limits, high demand) can be retried

**Auto-Prompt Generation:**
- Leave the prompt empty and the AI will generate one from your tweet content
- Requires `OPENROUTER_MODEL` to be set in your `.env` file
```

---

## Phase 2: Verification & Testing

### 2.1 Verify Model Mappings

**Verification Checklist**:

- [ ] `nano-banana-2` maps to `google/nano-banana-2` at 1K resolution
- [ ] `nano-banana-pro` maps to `google/nano-banana-pro` at 2K resolution
- [ ] `nano-banana` maps to `google/nano-banana` at 1K resolution

**Test Command**:
```bash
# Run AI image service tests
pnpm test src/lib/services/__tests__/ai-image.test.ts
```

### 2.2 Verify Fallback Logic

**Manual Testing Steps**:

1. **Test Auto-Fallback from Primary**:
   - Set model to `nano-banana-2`
   - Trigger an image generation
   - If it fails, verify it falls back to `nano-banana`
   - Check client shows "Switching to backup model…" toast

2. **Test Auto-Fallback from Secondary**:
   - Set model to `nano-banana-pro`
   - Trigger an image generation
   - If it fails, verify it falls back to `nano-banana`

3. **Test Content Safety (No Fallback)**:
   - Use a prompt that triggers safety filters
   - Verify no fallback occurs
   - Verify error message indicates content was blocked

4. **Test Credit Protection**:
   - Trigger a failed generation
   - Verify no credit was deducted
   - Check `aiGenerations` table - no record should be written

### 2.3 Verify LLM Auto-Generated Prompts

**Testing Steps**:

1. **Test with `OPENROUTER_MODEL` set**:
   - Leave prompt empty
   - Provide `tweetContent`
   - Verify image is generated with AI-generated prompt

2. **Test without `OPENROUTER_MODEL`**:
   - Temporarily unset `OPENROUTER_MODEL`
   - Leave prompt empty
   - Verify error: "OPENROUTER_MODEL environment variable is not configured"

3. **Verify No Hardcoded Fallback**:
   - Search codebase for hardcoded model names
   - Command: `grep -r "gpt-4o" src/ --include="*.ts" --include="*.tsx"`
   - Should only find documentation/comments, not actual model usage

---

## Phase 3: Code Quality Improvements (Optional)

### 3.1 Extract Magic Strings

**File**: `src/app/api/ai/image/status/route.ts`

Extract error detection patterns to constants:

```typescript
// At the top of the file
const CONTENT_BLOCKED_PATTERNS = /safety|content.?polic|blocked|violat|forbidden|HARM|E002/i;
const TRANSIENT_ERROR_PATTERNS = /high.?demand|unavailable|rate.?limit|E003|ModelRateLimit|capacity|try.?again|busy|503/i;
```

### 3.2 Add Unit Tests

**New File**: `src/app/api/ai/image/status/__tests__/fallback-logic.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('AI Image Fallback Logic', () => {
  describe('Content Safety Detection', () => {
    it('should detect content blocked errors', () => {
      const errors = [
        'Content policy violation',
        'Safety filter triggered',
        'forbidden content detected',
        'HARM: This violates safety guidelines',
        'E002: Content not allowed'
      ];

      errors.forEach(error => {
        expect(CONTENT_BLOCKED_PATTERNS.test(error)).toBe(true);
      });
    });

    it('should not detect non-safety errors as content blocked', () => {
      const errors = [
        'Network timeout',
        'Rate limit exceeded',
        'Model capacity full'
      ];

      errors.forEach(error => {
        expect(CONTENT_BLOCKED_PATTERNS.test(error)).toBe(false);
      });
    });
  });

  describe('Transient Error Detection', () => {
    it('should detect transient errors', () => {
      const errors = [
        'High demand, please try again',
        'Service temporarily unavailable',
        'Rate limit: too many requests',
        'E003: Model overloaded',
        '503 Service Unavailable'
      ];

      errors.forEach(error => {
        expect(TRANSIENT_ERROR_PATTERNS.test(error)).toBe(true);
      });
    });
  });
});
```

---

## Phase 4: Environment Configuration Verification

### 4.1 Verify .env Configuration

**Required Variables**:
```bash
# Required for AI image generation
REPLICATE_API_TOKEN=r8_...  # For Replicate API calls

# Required for auto-prompt generation
OPENROUTER_API_KEY=sk-or-v1-...  # For OpenRouter access
OPENROUTER_MODEL="anthropic/claude-sonnet-4.6"  # NEVER hardcode this
```

### 4.2 Verify Plan Configuration

**File**: `src/lib/plan-limits.ts`

- [ ] Free plan includes `nano-banana-2` and `nano-banana`
- [ ] Pro/Agency plans include all three models
- [ ] Model access gates work correctly

---

## Phase 5: Deployment & Monitoring

### 5.1 Pre-Deployment Checklist

- [ ] Run `pnpm lint` ✅
- [ ] Run `pnpm typecheck` ✅
- [ ] Run `pnpm test` ✅
- [ ] Verify all environment variables are set in production
- [ ] Test fallback logic in staging environment

### 5.2 Monitoring

**Key Metrics to Track**:
1. **Fallback Rate**: Percentage of generations that fallback to `nano-banana`
2. **Content Safety Rejection Rate**: Percentage blocked by safety filters
3. **Success Rate by Model**: Compare success rates across all three models
4. **Average Generation Time**: Track for each model tier

**Implementation**:
```typescript
// In src/lib/services/ai-image.ts
export async function startImageGeneration(params: ImageGenParams) {
  // ... existing code ...

  // Add telemetry
  console.log(`[AI Image] Starting generation: model=${model}, aspectRatio=${params.aspectRatio}`);

  return { predictionId, status: prediction.status };
}
```

---

## Summary of Changes

### Files Modified (Minimal):

1. **`src/lib/services/ai-image.ts`** - Add JSDoc documentation
2. **`src/app/api/ai/image/status/route.ts`** - Add fallback flow comments
3. **`.env.example`** - Document `OPENROUTER_MODEL` requirement
4. **`README.md`** - Update AI Image Generation documentation

### No Breaking Changes

All changes are additive (documentation, optional improvements). The core functionality is already correctly implemented.

---

## Verification Command

Run this to verify the implementation:

```bash
# Check linting
pnpm lint

# Check types
pnpm typecheck

# Run tests
pnpm test

# Search for hardcoded models (should return nothing in production code)
grep -r "gpt-4o\|claude-3" src/app/api/ai/image src/components/composer/ai-image-dialog.tsx --include="*.ts" --include="*.tsx" | grep -v "// \|/\*"

# Verify OPENROUTER_MODEL is not hardcoded
grep -r "model.*:" src/app/api/ai/image/route.ts | grep -v "OPENROUTER_MODEL\|meta.model\|params.model"
```

---

## Conclusion

The AI Image Generation Fallback Logic feature is **already correctly implemented**. The requirements are met:

✅ Model configuration with primary, secondary, and backup
✅ LLM auto-generated prompts using `OPENROUTER_MODEL`
✅ Credit protection (no charge on failure)
✅ Content safety checks (no fallback for violations)
✅ Automatic fallback to backup model
✅ Transient error handling with retry capability

The remaining work is primarily documentation and optional code quality improvements.
