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

export type ImageModel = "nano-banana-2" | "nano-banana-pro" | "nano-banana";

export type AspectRatio = "1:1" | "16:9" | "4:3" | "9:16";

export type ImageStyle =
  | "photorealistic"
  | "illustration"
  | "minimalist"
  | "abstract"
  | "infographic"
  | "meme";

export interface ImageGenParams {
  prompt: string;
  aspectRatio: AspectRatio;
  style?: ImageStyle;
  model?: ImageModel;
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
export function getDimensionsFromAspectRatio(
  aspectRatio: AspectRatio
): { width: number; height: number } {
  const baseSize = 1024;

  switch (aspectRatio) {
    case "1:1":
      return { width: baseSize, height: baseSize };
    case "16:9":
      return { width: 1344, height: 768 };
    case "4:3":
      return { width: 1024, height: 768 };
    case "9:16":
      return { width: 768, height: 1344 };
    default:
      return { width: baseSize, height: baseSize };
  }
}

/**
 * Build an enhanced prompt with style modifiers
 */
export function buildStyledPrompt(
  basePrompt: string,
  style?: ImageStyle
): string {
  if (!style) return basePrompt;

  const styleModifiers: Record<ImageStyle, string> = {
    photorealistic:
      ", photorealistic, highly detailed, 8k, professional photography, cinematic lighting",
    illustration:
      ", digital illustration, vibrant colors, clean lines, modern art style",
    minimalist: ", minimalist design, clean composition, ample white space, simple",
    abstract:
      ", abstract art, artistic interpretation, creative, non-representational",
    infographic: ", infographic style, clear typography, data visualization, educational",
    meme: ", meme format, humorous, bold text overlay, internet meme style",
  };

  return basePrompt + (styleModifiers[style] || "");
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
 * Convert aspect ratio to Replicate format for Nano Banana models
 */
function convertAspectRatioToReplicate(aspectRatio: AspectRatio): string {
  switch (aspectRatio) {
    case "1:1":
      return "1:1";
    case "16:9":
      return "16:9";
    case "4:3":
      return "4:3";
    case "9:16":
      return "9:16";
    default:
      return "1:1";
  }
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
// DEPRECATED — Synchronous blocking path (DO NOT USE in production)
//
// The functions, classes, and factory below use a synchronous polling loop
// that blocks for up to 2 minutes waiting for a Replicate prediction to
// complete. In serverless environments (Vercel, AWS Lambda) this hits the
// ~60-second function timeout and silently fails.
//
// The active production path is:
//   startImageGeneration()   — fire-and-forget prediction creation
//   checkImagePrediction()   — single-poll status check (client-driven)
//
// These synchronous symbols are retained only to avoid breaking existing
// unit tests. No new production code should call them.
// ============================================================================

/**
 * @deprecated Use `startImageGeneration()` + `checkImagePrediction()` for
 * non-blocking operation. This synchronous path blocks for up to 2 minutes
 * and will time out in serverless environments.
 *
 * Polls a Replicate prediction until it reaches a terminal state. Retries
 * every second for up to 120 seconds before throwing "Prediction timed out".
 */
async function pollPrediction(
  predictionId: string,
  token: string
): Promise<ReplicatePrediction> {
  const maxAttempts = 120; // 2 minutes max
  const pollInterval = 1000; // 1 second

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.statusText}`);
    }

    const prediction: ReplicatePrediction = await response.json();

    if (prediction.status === "succeeded") {
      return prediction;
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(
        prediction.error || `Prediction ${prediction.status}`
      );
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error("Prediction timed out");
}

/**
 * @deprecated Use `startImageGeneration()` for non-blocking prediction
 * creation. This function creates a prediction then immediately blocks
 * in `pollPrediction()` for up to 2 minutes — it will time out in
 * serverless environments.
 */
async function createPrediction(
  version: string,
  input: Record<string, string | number | boolean | string[] | null>,
  token: string
): Promise<ReplicatePrediction> {
  const createResponse = await fetch(
    `https://api.replicate.com/v1/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ version, input }),
    }
  );

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(
      `Failed to create prediction: ${createResponse.statusText} - ${errorText}`
    );
  }

  const prediction: ReplicatePrediction = await createResponse.json();

  // Poll for result — blocks for up to 2 minutes
  return pollPrediction(prediction.id, token);
}

// ============================================================================
// DEPRECATED — Synchronous provider implementations
// ============================================================================

/**
 * @deprecated Use `startImageGeneration({ model: "nano-banana-2", ... })` for
 * non-blocking operation. This provider's `generate()` method calls
 * `createPrediction()` which blocks for up to 2 minutes and will time out
 * in serverless environments.
 *
 * Nano Banana 2 Provider (fast, efficient)
 * Model: google/nano-banana-2 (Gemini 2.5 Flash Image)
 */
class NanoBanana2Provider implements ImageGenerationProvider {
  name = "nano-banana-2" as const;
  private version = "google/nano-banana-2";

  async generate(params: ImageGenParams): Promise<ImageGenResult> {
    const { width, height } = getDimensionsFromAspectRatio(params.aspectRatio);
    const prompt = buildStyledPrompt(params.prompt, params.style);

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw new Error("REPLICATE_API_TOKEN environment variable is not set");
    }

    try {
      const result = await createPrediction(
        this.version,
        {
          prompt,
          aspect_ratio: convertAspectRatioToReplicate(params.aspectRatio),
          resolution: "1K",
          output_format: "png",
          safety_filter_level: "block_only_high",
        },
        token
      );

      if (!result.output) {
        throw new Error("No image data returned from Replicate API");
      }

      const imageUrl = typeof result.output === "string"
        ? result.output
        : result.output[0]!;

      return { imageUrl, width, height, model: this.name, prompt };
    } catch (error) {
      throw new Error(
        `Failed to generate image with ${this.name}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

/**
 * @deprecated Use `startImageGeneration({ model: "nano-banana-pro", ... })` for
 * non-blocking operation. This provider's `generate()` method calls
 * `createPrediction()` which blocks for up to 2 minutes and will time out
 * in serverless environments.
 *
 * Nano Banana Pro Provider (highest quality, advanced features)
 * Model: google/nano-banana-pro (Gemini 3 Pro Image)
 * Features: Text rendering, multi-image blending, Google Search integration, 4K support
 */
class NanaBananaProProvider implements ImageGenerationProvider {
  name = "nano-banana-pro" as const;
  private version = "google/nano-banana-pro";

  async generate(params: ImageGenParams): Promise<ImageGenResult> {
    const { width, height } = getDimensionsFromAspectRatio(params.aspectRatio);
    const prompt = buildStyledPrompt(params.prompt, params.style);

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw new Error("REPLICATE_API_TOKEN environment variable is not set");
    }

    try {
      const result = await createPrediction(
        this.version,
        {
          prompt,
          aspect_ratio: convertAspectRatioToReplicate(params.aspectRatio),
          resolution: "2K",
          output_format: "png",
          safety_filter_level: "block_only_high",
        },
        token
      );

      if (!result.output) {
        throw new Error("No image data returned from Replicate API");
      }

      const imageUrl = typeof result.output === "string"
        ? result.output
        : result.output[0]!;

      return { imageUrl, width, height, model: this.name, prompt };
    } catch (error) {
      throw new Error(
        `Failed to generate image with ${this.name}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

// ============================================================================
// DEPRECATED — Factory and synchronous top-level API
// ============================================================================

class NanoBananaProvider implements ImageGenerationProvider {
  name = "nano-banana" as const;
  private version = "google/nano-banana";

  async generate(params: ImageGenParams): Promise<ImageGenResult> {
    const { width, height } = getDimensionsFromAspectRatio(params.aspectRatio);
    const prompt = buildStyledPrompt(params.prompt, params.style);

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw new Error("REPLICATE_API_TOKEN environment variable is not set");
    }

    try {
      const result = await createPrediction(
        this.version,
        {
          prompt,
          aspect_ratio: convertAspectRatioToReplicate(params.aspectRatio),
          resolution: "1K",
          output_format: "png",
          safety_filter_level: "block_only_high",
        },
        token
      );

      if (!result.output) {
        throw new Error("No image data returned from Replicate API");
      }

      const imageUrl = typeof result.output === "string"
        ? result.output
        : result.output[0]!;

      return { imageUrl, width, height, model: this.name, prompt };
    } catch (error) {
      throw new Error(
        `Failed to generate image with ${this.name}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

/**
 * @deprecated Use `startImageGeneration()` instead. This factory instantiates
 * synchronous blocking providers that will time out in serverless environments.
 *
 * Provider factory — returns a provider instance for the given model.
 */
export function createImageProvider(
  model: ImageModel
): ImageGenerationProvider {
  switch (model) {
    case "nano-banana":
      return new NanoBananaProvider();
    case "nano-banana-2":
      return new NanoBanana2Provider();
    case "nano-banana-pro":
      return new NanaBananaProProvider();
    default:
      throw new Error(`Unknown image model: ${model}`);
  }
}

/**
 * @deprecated Use `startImageGeneration()` + `checkImagePrediction()` for
 * non-blocking operation. This function delegates to a synchronous blocking
 * provider and will time out in serverless environments after ~60 seconds.
 *
 * Generate an image using the specified model (synchronous, blocking).
 */
export async function generateImage(
  params: ImageGenParams
): Promise<ImageGenResult> {
  const model = params.model || "nano-banana-2";
  const provider = createImageProvider(model);
  return provider.generate(params);
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
  params: ImageGenParams,
): Promise<{ predictionId: string; status: string }> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN environment variable is not set");

  const model = params.model ?? "nano-banana-2";
  const prompt = buildStyledPrompt(params.prompt, params.style);
  const modelName =
    model === "nano-banana-pro" ? "google/nano-banana-pro" :
    model === "nano-banana" ? "google/nano-banana" : "google/nano-banana-2";
  const resolution = model === "nano-banana-pro" ? "2K" : "1K";

  // Use the model name endpoint — /v1/models/{model_owner}/{model_name}/predictions
  // This endpoint always runs the latest deployment and does not require a version hash.
  // We MUST NOT send the "model" or "version" parameter in the body for this endpoint.
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
      },
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(
      `Failed to create prediction: ${createResponse.statusText} - ${errorText}`,
    );
  }

  const prediction: ReplicatePrediction = await createResponse.json();
  return { predictionId: prediction.id, status: prediction.status };
}

/**
 * Check the current status of a Replicate prediction (single poll, no waiting).
 * The caller is responsible for retrying at an appropriate interval.
 */
export async function checkImagePrediction(
  predictionId: string,
): Promise<ReplicatePrediction> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN environment variable is not set");

  const response = await fetch(
    `https://api.replicate.com/v1/predictions/${predictionId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

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
