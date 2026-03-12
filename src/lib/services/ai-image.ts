/**
 * AI Image Generation Service (Google Gemini Only)
 * Provider-agnostic abstraction for AI image generation using Google Gemini API
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export type ImageModel = "nano-banana-2" | "banana-pro" | "gemini-imagen4";

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
 * Convert aspect ratio to Gemini format
 */
function convertAspectRatioToGemini(aspectRatio: AspectRatio): string {
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
// Provider Implementations using Google Gemini API
// ============================================================================

/**
 * Gemini Nano (Nano Banana 2) Provider
 * Fast, efficient using Gemini 2.5 Flash Image
 */
class GeminiNanoProvider implements ImageGenerationProvider {
  name = "nano-banana-2" as const;

  async generate(params: ImageGenParams): Promise<ImageGenResult> {
    const { width, height } = getDimensionsFromAspectRatio(params.aspectRatio);
    const prompt = buildStyledPrompt(params.prompt, params.style);

    // Dynamic import for @google/genai
    const { GoogleGenAI } = await import("@google/genai");

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY or GOOGLE_AI_API_KEY environment variable is not set");
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: convertAspectRatioToGemini(params.aspectRatio),
            imageSize: "1K",
          },
        },
      } as any); // Using any to bypass TypeScript type limitations

      // Extract image from response - gemini-2.5-flash-exp returns response.candidates
      const candidate = (response as any).candidates?.[0];
      const imagePart = candidate?.content?.parts?.find(
        (part: any) => part.inlineData?.data
      );

      if (!imagePart) {
        throw new Error("No image data returned from Gemini API");
      }

      const base64Data = imagePart.inlineData.data;
      const imageUrl = `data:image/png;base64,${base64Data}`;

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
 * Gemini Nano Pro (Banana Pro) Provider
 * High quality using Gemini 3 Pro Image
 */
class GeminiNanoProProvider implements ImageGenerationProvider {
  name = "banana-pro" as const;

  async generate(params: ImageGenParams): Promise<ImageGenResult> {
    const { width, height } = getDimensionsFromAspectRatio(params.aspectRatio);
    const prompt = buildStyledPrompt(params.prompt, params.style);

    // Dynamic import for @google/genai
    const { GoogleGenAI } = await import("@google/genai");

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY or GOOGLE_AI_API_KEY environment variable is not set");
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Use the correct config format for gemini-3-pro-image-preview
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: convertAspectRatioToGemini(params.aspectRatio),
            imageSize: "1K",
          },
        },
      } as any); // Using any to bypass TypeScript type limitations

      // Extract image from response - gemini-3-pro-image-preview returns response.candidates directly
      const candidate = (response as any).candidates?.[0];
      const imagePart = candidate?.content?.parts?.find(
        (part: any) => part.inlineData?.data
      );

      if (!imagePart) {
        throw new Error("No image data returned from Gemini API");
      }

      const base64Data = imagePart.inlineData.data;
      const imageUrl = `data:image/png;base64,${base64Data}`;

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
 * Google Gemini Imagen 4 Provider
 * Highest quality, latest model
 */
class GeminiImagen4Provider implements ImageGenerationProvider {
  name = "gemini-imagen4" as const;

  async generate(params: ImageGenParams): Promise<ImageGenResult> {
    const { width, height } = getDimensionsFromAspectRatio(params.aspectRatio);
    const prompt = buildStyledPrompt(params.prompt, params.style) + ", masterpiece, best quality, ultra detailed";

    // Dynamic import for @google/genai
    const { GoogleGenAI } = await import("@google/genai");

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY or GOOGLE_AI_API_KEY environment variable is not set");
    }

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Use the correct config format for gemini-3-pro-image-preview with higher resolution
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: convertAspectRatioToGemini(params.aspectRatio),
            imageSize: "2K", // Higher resolution for Imagen4
          },
        },
      } as any); // Using any to bypass TypeScript type limitations

      // Extract image from response - gemini-3-pro-image-preview returns response.candidates directly
      const candidate = (response as any).candidates?.[0];
      const imagePart = candidate?.content?.parts?.find(
        (part: any) => part.inlineData?.data
      );

      if (!imagePart) {
        throw new Error("No image data returned from Gemini API");
      }

      const base64Data = imagePart.inlineData.data;
      const imageUrl = `data:image/png;base64,${base64Data}`;

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
      return new GeminiNanoProvider();
    case "banana-pro":
      return new GeminiNanoProProvider();
    case "gemini-imagen4":
      return new GeminiImagen4Provider();
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
