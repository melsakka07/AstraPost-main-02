/**
 * AI Image Generation Service (Replicate API - Nano Banana Models)
 * Provider-agnostic abstraction for AI image generation using Replicate
 * Models: google/nano-banana-2, google/nano-banana-pro
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export type ImageModel = "nano-banana-2" | "nano-banana-pro";

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

/**
 * Poll a Replicate prediction until completion
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
 * Create and wait for a Replicate prediction
 */
async function createPrediction(
  version: string,
  input: Record<string, any>,
  token: string
): Promise<ReplicatePrediction> {
  // Create prediction
  const createResponse = await fetch(
    `https://api.replicate.com/v1/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version,
        input,
      }),
    }
  );

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(
      `Failed to create prediction: ${createResponse.statusText} - ${errorText}`
    );
  }

  const prediction: ReplicatePrediction = await createResponse.json();

  // Poll for result
  return pollPrediction(prediction.id, token);
}

// ============================================================================
// Provider Implementations using Replicate API (Nano Banana Models)
// ============================================================================

/**
 * Nano Banana 2 Provider (fast, efficient)
 * Model: google/nano-banana-2 (Gemini 2.5 Flash Image)
 */
class NanoBanana2Provider implements ImageGenerationProvider {
  name = "nano-banana-2" as const;
  // Use model owner/name format for latest version
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
          image_input: [],
        },
        token
      );

      if (!result.output) {
        throw new Error("No image data returned from Replicate API");
      }

      // Nano Banana models return a single string URL
      const imageUrl = typeof result.output === "string"
        ? result.output
        : result.output[0]!;

      return {
        imageUrl,
        width,
        height,
        model: this.name,
        prompt,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate image with ${this.name}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

/**
 * Nano Banana Pro Provider (highest quality, advanced features)
 * Model: google/nano-banana-pro (Gemini 3 Pro Image)
 * Features: Text rendering, multi-image blending, Google Search integration, 4K support
 */
class NanoBananaProProvider implements ImageGenerationProvider {
  name = "nano-banana-pro" as const;
  // Use model owner/name format for latest version
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
          resolution: "2K", // Higher resolution for Pro
          output_format: "png",
          safety_filter_level: "block_only_high",
          image_input: [],
        },
        token
      );

      if (!result.output) {
        throw new Error("No image data returned from Replicate API");
      }

      // Nano Banana Pro returns a single string URL
      const imageUrl = typeof result.output === "string"
        ? result.output
        : result.output[0]!;

      return {
        imageUrl,
        width,
        height,
        model: this.name,
        prompt,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate image with ${this.name}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

// ============================================================================
// Factory and Service Functions
// ============================================================================

/**
 * Provider factory - returns the appropriate provider instance
 */
export function createImageProvider(
  model: ImageModel
): ImageGenerationProvider {
  switch (model) {
    case "nano-banana-2":
      return new NanoBanana2Provider();
    case "nano-banana-pro":
      return new NanoBananaProProvider();
    default:
      throw new Error(`Unknown image model: ${model}`);
  }
}

/**
 * Generate an image using the specified model
 */
export async function generateImage(
  params: ImageGenParams
): Promise<ImageGenResult> {
  const model = params.model || "nano-banana-2";
  const provider = createImageProvider(model);
  return provider.generate(params);
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
