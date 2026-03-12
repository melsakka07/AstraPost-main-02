/**
 * AI Image Generation API Endpoint
 * POST /api/ai/image
 *
 * Generates AI images using multiple providers (Nano Banana 2, Banana Pro, Gemini Imagen 4)
 */

import { NextRequest, NextResponse } from "next/server";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { and, eq, gte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlanLimits, normalizePlan } from "@/lib/plan-limits";
import { checkRateLimit } from "@/lib/rate-limiter";
import { aiGenerations } from "@/lib/schema";
import {
  generateImage,
  downloadImage,
  type ImageModel,
  type AspectRatio,
  type ImageStyle,
  validateModelForPlan,
} from "@/lib/services/ai-image";
import { upload } from "@/lib/storage";

// ============================================================================
// Schema Validation
// ============================================================================

const ImageGenRequestSchema = z.object({
  prompt: z.string().max(1000).optional(),
  tweetContent: z.string().max(5000).optional(),
  model: z.enum(["nano-banana-2", "banana-pro", "gemini-imagen4"]).default("nano-banana-2"),
  aspectRatio: z.enum(["1:1", "16:9", "4:3", "9:16"]).default("1:1"),
  style: z.enum(["photorealistic", "illustration", "minimalist", "abstract", "infographic", "meme"]).optional(),
});

const ImageGenResponseSchema = z.object({
  imageUrl: z.string(),
  width: z.number(),
  height: z.number(),
  model: z.string(),
  prompt: z.string(),
});

// ============================================================================
// Auto-Prompt Generation
// ============================================================================

/**
 * Generate an image prompt from tweet content using AI
 */
async function generateImagePromptFromTweet(
  tweetContent: string
): Promise<string> {
  try {
    const { text } = await generateText({
      model: openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4o"),
      system: `You are an expert at creating vivid, specific image prompts for social media content.
Generate a visual prompt that captures the essence of the tweet.
Keep the prompt under 200 words. Focus on visual elements, composition, mood, and style.
Do not include text overlays in the image unless specifically requested.
Return ONLY the prompt, no explanation or additional text.`,
      prompt: `Generate an image prompt for this social media post:\n\n${tweetContent}`,
    });

    return text.trim();
  } catch (error) {
    console.error("Failed to generate image prompt:", error);
    // Fallback to a basic prompt based on tweet content
    return `Visual representation of: ${tweetContent.slice(0, 100)}`;
  }
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse and validate request
    const body = await req.json();
    const validationResult = ImageGenRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { prompt, tweetContent, model, aspectRatio, style } =
      validationResult.data;

    // 3. Get user and plan info
    const userId = session.user.id;
    const userRecord = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const plan = normalizePlan(userRecord.plan);
    const planLimits = getPlanLimits(plan);

    // 4. Validate model availability for plan
    const modelValidation = validateModelForPlan(
      model as ImageModel,
      planLimits.availableImageModels
    );

    if (!modelValidation.valid) {
      console.log(`[AI Image] 403: Invalid model ${model} for plan ${plan}`);
      return NextResponse.json(
        { error: modelValidation.error },
        { status: 403 }
      );
    }

    // 5. Check rate limit
    const rateLimitResult = await checkRateLimit(userId, plan, "ai_image");

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          reset: rateLimitResult.reset,
          remaining: rateLimitResult.remaining,
        },
        { status: 429 }
      );
    }

    // 6. Check AI image quota (monthly limit)
    if (planLimits.aiImagesPerMonth > 0) {
      // -1 means unlimited
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const monthlyCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(aiGenerations)
        .where(
          and(
            eq(aiGenerations.userId, userId),
            eq(aiGenerations.type, "image"),
            gte(aiGenerations.createdAt, currentMonth)
          )
        );

      const imagesUsed = monthlyCount[0]?.count || 0;

      if (imagesUsed >= planLimits.aiImagesPerMonth) {
        console.log(`[AI Image] 403: Quota exceeded. Used: ${imagesUsed}, Limit: ${planLimits.aiImagesPerMonth}`);
        return NextResponse.json(
          {
            error: "Monthly AI image quota exceeded",
            limit: planLimits.aiImagesPerMonth,
            used: imagesUsed,
          },
          { status: 403 }
        );
      }
    }

    // 7. Generate or use provided prompt
    let finalPrompt = prompt;

    if (!finalPrompt && tweetContent) {
      // Auto-generate prompt from tweet content
      finalPrompt = await generateImagePromptFromTweet(tweetContent);
    }

    if (!finalPrompt) {
      return NextResponse.json(
        { error: "Either prompt or tweetContent must be provided" },
        { status: 400 }
      );
    }

    // 8. Generate image
    const genParams: {
      prompt: string;
      aspectRatio: AspectRatio;
      model: ImageModel;
      style?: ImageStyle;
    } = {
      prompt: finalPrompt,
      aspectRatio: aspectRatio as AspectRatio,
      model: model as ImageModel,
    };

    if (style) {
      genParams.style = style as ImageStyle;
    }

    const imageResult = await generateImage(genParams);

    // 9. Download and store image
    let imageBuffer: Buffer;
    try {
      imageBuffer = await downloadImage(imageResult.imageUrl);
    } catch (downloadError) {
      console.error("Failed to download generated image:", downloadError);
      // If download fails, return the base64 data URL directly
      return NextResponse.json(ImageGenResponseSchema.parse(imageResult));
    }

    // 10. Upload to storage (local or Vercel Blob)
    const filename = `ai-image-${nanoid()}.png`;
    const uploadResult = await upload(imageBuffer, filename, "ai-images");

    if (!uploadResult.url) {
      throw new Error("Failed to upload image to storage");
    }

    // 11. Record usage in aiGenerations table
    await db.insert(aiGenerations).values({
      id: nanoid(),
      userId,
      type: "image",
      inputPrompt: finalPrompt,
      outputContent: {
        model,
        aspectRatio,
        style,
        imageUrl: uploadResult.url,
        width: imageResult.width,
        height: imageResult.height,
      },
      createdAt: new Date(),
    });

    // 12. Return result with stored URL
    return NextResponse.json({
      imageUrl: uploadResult.url,
      width: imageResult.width,
      height: imageResult.height,
      model: imageResult.model,
      prompt: imageResult.prompt,
    });
  } catch (error) {
    console.error("AI image generation error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate image",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Imports (needed for the query above)
// ============================================================================

