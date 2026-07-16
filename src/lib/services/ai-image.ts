import { recordAiUsage } from "@/lib/services/ai-quota";
import { upload } from "@/lib/storage";

/**
 * AI Image Generation Service (Replicate API - Nano Banana Models)
 * Provider-agnostic abstraction for AI image generation using Replicate
 *
 * ## Available Models
 *
 * ### Primary Model: `nano-banana-2` (google/nano-banana-2)
 * - **Description**: Gemini 2.5 Flash Image - Fast, efficient generation
 * - **Resolution**: 1K (1024px base)
 * - **Use Case**: Quick iterations, high-volume use cases, real-time previews
 * - **Availability**: All plans (Free, Pro, Agency)
 *
 * ### Secondary Model: `nano-banana-pro` (google/nano-banana-pro)
 * - **Description**: Gemini 3 Pro Image - Highest quality with advanced features
 * - **Resolution**: 2K (2048px base)
 * - **Features**: Text rendering, multi-image blending, Google Search integration
 * - **Use Case**: Final assets, typography, complex scenes, professional output
 * - **Availability**: Pro and Agency plans only
 *
 * ### Backup Model: `nano-banana` (google/nano-banana)
 * - **Description**: Gemini 2.5 Flash Image - Reliable fallback
 * - **Resolution**: 1K (1024px base)
 * - **Purpose**: Automatic fallback when primary or secondary model fails
 * - **Availability**: All plans (Free, Pro, Agency)
 *
 * ## Fallback Behavior
 *
 * When either `nano-banana-2` or `nano-banana-pro` fails for any reason (except content
 * safety violations), the system automatically retries with `nano-banana`. This is
 * transparent to the user - the polling endpoint returns a new predictionId and the
 * client seamlessly continues polling without interrupting the user experience.
 *
 * Content safety violations (errors containing "safety", "forbidden", "HARM", "violat")
 * are permanent errors - no fallback is attempted and the user must adjust their prompt.
 *
 * ## Credit Protection
 *
 * Credits are NEVER consumed on failed generations. The `aiGenerations` table is only
 * written when an image generation explicitly returns a "succeeded" status. This ensures
 * users are not charged for model failures or transient errors.
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export type ImageModel = "gpt-image-2";

export type AspectRatio = "1:1" | "3:2" | "2:3";

export type ImageStyle =
  | "photorealistic"
  | "illustration"
  | "minimalist"
  | "abstract"
  | "infographic"
  | "meme"
  | "editorial";

export interface ImageGenParams {
  prompt: string;
  aspectRatio: AspectRatio;
  style?: ImageStyle;
  model?: ImageModel;
  customModelId?: string; // Allows overriding the resolved Replicate model ID
}

export interface ImageGenResult {
  imageUrl: string;
  width: number;
  height: number;
  model: string;
  prompt: string;
}

export interface ImageGenerationProvider {
  name: string;
  generate(params: ImageGenParams): Promise<ImageGenResult>;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate image dimensions based on aspect ratio
 * Uses a base size of 1024px for the shorter dimension
 */
export function getDimensionsFromAspectRatio(aspectRatio: AspectRatio): {
  width: number;
  height: number;
} {
  switch (aspectRatio) {
    case "1:1":
      return { width: 1024, height: 1024 };
    case "3:2":
      return { width: 1536, height: 1024 };
    case "2:3":
      return { width: 1024, height: 1536 };
    default:
      return { width: 1024, height: 1024 };
  }
}

/**
 * Build an enhanced prompt with style modifiers
 */
export function buildStyledPrompt(basePrompt: string, style?: ImageStyle): string {
  if (!style) return basePrompt;

  switch (style) {
    case "photorealistic":
      return `Professional photography of ${basePrompt}. Photorealistic, highly detailed, shot with cinematic lighting, 8k resolution.`;
    case "illustration":
      return `Digital illustration of ${basePrompt}. Vibrant colors, clean linework, modern art style, high detail.`;
    case "minimalist":
      return `Minimalist composition: ${basePrompt}. Clean design, ample negative space, simple and elegant, high contrast.`;
    case "abstract":
      return `Abstract artistic interpretation of ${basePrompt}. Creative, non-representational, expressive, gallery-quality.`;
    case "infographic":
      return `Infographic design: ${basePrompt}. Clear typography, data visualization layout, educational, professional presentation.`;
    case "meme":
      return `Meme-style image: ${basePrompt}. Bold text overlay, humorous, internet culture aesthetic, shareable format.`;
    default:
      return basePrompt;
  }
}

/**
 * Validate that the user's plan allows the requested model
 */
export function validateModelForPlan(
  model: ImageModel,
  availableModels: ImageModel[]
): { valid: boolean; error?: string } {
  if (!availableModels.includes(model)) {
    return {
      valid: false,
      error: `Model "${model}" is not available in your current plan. Available models: ${availableModels.join(", ")}`,
    };
  }
  return { valid: true };
}

/**
 * Convert aspect ratio for gpt-image-2 (all three ratios are supported natively).
 */
function convertAspectRatioForGptImage2(aspectRatio: AspectRatio): string {
  return aspectRatio;
}

// ============================================================================
// Replicate API Helper Functions
// ============================================================================

interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[];
  error?: string;
  logs?: string;
}

// ============================================================================
// DEPRECATED — Factory and synchronous top-level API

/**
 * @deprecated Use `startImageGeneration()` instead. This factory instantiates
 * synchronous blocking providers that will time out in serverless environments.
 *
 * Provider factory — returns a provider instance for the given model.
 */
export function createImageProvider(_model: ImageModel): ImageGenerationProvider {
  throw new Error(
    "Synchronous provider factory is deprecated. Use startImageGeneration() instead."
  );
}

/**
 * @deprecated Use `startImageGeneration()` + `checkImagePrediction()` for
 * non-blocking operation. This function delegates to a synchronous blocking
 * provider and will time out in serverless environments after ~60 seconds.
 *
 * Generate an image using the specified model (synchronous, blocking).
 */
export async function generateImage(_params: ImageGenParams): Promise<ImageGenResult> {
  throw new Error("generateImage is deprecated. Use startImageGeneration() instead.");
}

// ============================================================================
// Async Prediction API (for client-side polling pattern)
// ============================================================================

/**
 * Start an image generation prediction without waiting for it to complete.
 * Returns the Replicate prediction ID so the caller can poll for the result
 * via a separate status endpoint — avoids blocking serverless functions.
 */
export async function startImageGeneration(
  params: ImageGenParams
): Promise<{ predictionId: string; status: string }> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN environment variable is not set");

  const prompt = buildStyledPrompt(params.prompt, params.style);
  const modelName = params.customModelId ?? process.env.REPLICATE_MODEL_ADVANCED!;

  // Use the model name endpoint — /v1/models/{model_owner}/{model_name}/predictions
  // This endpoint always runs the latest deployment and does not require a version hash.
  // We MUST NOT send the "model" or "version" parameter in the body for this endpoint.
  const createResponse = await fetch(
    `https://api.replicate.com/v1/models/${modelName}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio: convertAspectRatioForGptImage2(params.aspectRatio),
          quality: "low",
          output_format: "webp",
          output_compression: 90,
          moderation: "low",
        },
      }),
    }
  );

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create prediction: ${createResponse.statusText} - ${errorText}`);
  }

  const prediction: ReplicatePrediction = await createResponse.json();
  return { predictionId: prediction.id, status: prediction.status };
}

/**
 * Check the current status of a Replicate prediction (single poll, no waiting).
 * The caller is responsible for retrying at an appropriate interval.
 */
export async function checkImagePrediction(predictionId: string): Promise<ReplicatePrediction> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN environment variable is not set");

  const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Replicate API error: ${response.statusText}`);
  }

  return response.json() as Promise<ReplicatePrediction>;
}

/**
 * Download image from URL and return as buffer
 */
export async function downloadImage(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith("data:")) {
    // Handle base64 data URL
    const parts = imageUrl.split(",");
    if (parts.length < 2) {
      throw new Error("Invalid data URL format");
    }
    const base64Data = parts[1];
    if (!base64Data) {
      throw new Error("Invalid data URL: no base64 data found");
    }
    return Buffer.from(base64Data, "base64");
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * High-level image generation wrapper for the Agentic Posting pipeline.
 *
 * Wraps the full lifecycle:
 *   1. Enhances the prompt with a quality prefix
 *   2. Starts a Replicate prediction via startImageGeneration()
 *   3. Polls until complete (60s timeout, 2s interval)
 *   4. Downloads the image buffer
 *   5. Persists to storage via upload() (Vercel Blob in prod, local in dev)
 *   6. Returns the stored URL
 *
 * Never throws — returns { error } on any failure so the pipeline can
 * continue with the remaining tweets.
 */
export async function generateAgenticImage(params: {
  userId: string;
  prompt: string;
  style?: "photorealistic" | "digital-art" | "infographic" | "editorial";
  aspectRatio?: AspectRatio;
}): Promise<{ url: string } | { error: string }> {
  const aspectRatio = params.aspectRatio ?? "3:2";
  const style: ImageStyle =
    params.style === "digital-art" ? "illustration" : (params.style ?? "editorial");

  // Prepend quality prefix for editorial-grade output
  const enhancedPrompt = `Professional social media image, high quality, modern design: ${params.prompt}`;

  const MAX_POLL_MS = 60_000;
  const POLL_INTERVAL_MS = 2_000;

  try {
    const { predictionId } = await startImageGeneration({
      prompt: enhancedPrompt,
      model: "gpt-image-2",
      ...(process.env.REPLICATE_MODEL_AGENTIC !== undefined && {
        customModelId: process.env.REPLICATE_MODEL_AGENTIC,
      }),
      aspectRatio,
      style,
    });

    // Poll until done
    const deadline = Date.now() + MAX_POLL_MS;
    let replicateUrl: string | null = null;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const result = await checkImagePrediction(predictionId);

      if (result.status === "succeeded" && result.output) {
        replicateUrl = Array.isArray(result.output)
          ? (result.output[0] as string)
          : (result.output as string);
        break;
      }

      if (result.status === "failed" || result.status === "canceled") {
        return { error: result.error ?? `Image generation ${result.status}` };
      }
    }

    if (!replicateUrl) {
      return { error: "Image generation timed out after 60s" };
    }

    // Download and persist to storage
    const buffer = await downloadImage(replicateUrl);
    const filename = `agentic-${Date.now()}.png`;
    const stored = await upload(buffer, filename, "agentic-images");

    // Record image usage so it counts toward the monthly image quota.
    await recordAiUsage(params.userId, "image", 0, params.prompt, { imageUrl: stored.url }).catch(
      () => void 0
    );

    return { url: stored.url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown image generation error" };
  }
}
