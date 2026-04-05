import { headers } from "next/headers";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { AgenticTweet, ResearchBrief, ContentPlan } from "@/lib/ai/agentic-types";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { ImageModel } from "@/lib/plan-limits";
import { agenticPosts } from "@/lib/schema";
import { startImageGeneration, checkImagePrediction } from "@/lib/services/ai-image";

const regenerateSchema = z.object({
  tweetIndex: z.number().int().min(0),
  regenerateImage: z.boolean().default(false),
});

const MAX_IMAGE_POLL_MS = 60_000;
const IMAGE_POLL_INTERVAL_MS = 2_000;

async function pollImage(predictionId: string): Promise<string | null> {
  const deadline = Date.now() + MAX_IMAGE_POLL_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, IMAGE_POLL_INTERVAL_MS));
    try {
      const result = await checkImagePrediction(predictionId);
      if (result.status === "succeeded" && result.output) {
        return Array.isArray(result.output)
          ? (result.output[0] as string)
          : (result.output as string);
      }
      if (result.status === "failed" || result.status === "canceled") return null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const correlationId = getCorrelationId(req);
  const { id } = await params;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return ApiError.unauthorized();

    const json = await req.json() as unknown;
    const parsed = regenerateSchema.safeParse(json);
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { tweetIndex, regenerateImage } = parsed.data;

    const agenticPost = await db.query.agenticPosts.findFirst({
      where: and(eq(agenticPosts.id, id), eq(agenticPosts.userId, session.user.id)),
    });
    if (!agenticPost) return ApiError.notFound("Agentic post");
    if (agenticPost.status !== "ready") {
      return ApiError.badRequest(`Cannot regenerate a tweet for status '${agenticPost.status}'`);
    }

    const currentTweets = (agenticPost.tweets as AgenticTweet[]) ?? [];
    const tweetToRegen = currentTweets[tweetIndex];
    if (!tweetToRegen) return ApiError.notFound("Tweet at that index");

    const research = agenticPost.researchBrief as ResearchBrief;
    const plan = agenticPost.contentPlan as ContentPlan;

    const model = openrouter(process.env.OPENROUTER_MODEL!);

    // Regenerate tweet text
    const prompt = `You are an expert social media copywriter.

Research Brief: ${JSON.stringify(research)}
Content Plan: ${JSON.stringify(plan)}
Current tweet at position ${tweetIndex}: "${tweetToRegen.text}"

Write ONE improved alternative tweet for position ${tweetIndex}.
Context: ${plan.structure}
${tweetIndex === 0 ? "This is the HOOK — make it compelling and attention-grabbing." : ""}
${tweetIndex === currentTweets.length - 1 ? "This is the CTA — end with a clear call to action." : ""}

Return ONLY a valid JSON object (no markdown):
{
  "text": "the new tweet text",
  "hashtags": ["tag1"],
  "hasImage": ${tweetToRegen.hasImage},
  "imagePrompt": "${tweetToRegen.hasImage ? "detailed image generation prompt" : ""}",
  "charCount": 0
}`;

    const result = await generateText({ model, prompt });

    let newTweet: Partial<AgenticTweet> = {};
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      newTweet = JSON.parse(jsonMatch?.[0] ?? result.text) as Partial<AgenticTweet>;
    } catch {
      newTweet = {
        text: result.text.slice(0, 280),
        hashtags: [],
        hasImage: tweetToRegen.hasImage,
      };
    }

    const resolvedImagePrompt = newTweet.imagePrompt ?? tweetToRegen.imagePrompt;
    const updatedTweet: AgenticTweet = {
      ...tweetToRegen,
      text: newTweet.text ?? tweetToRegen.text,
      hashtags: newTweet.hashtags ?? tweetToRegen.hashtags,
      charCount: newTweet.text?.length ?? tweetToRegen.charCount,
      ...(resolvedImagePrompt !== undefined && { imagePrompt: resolvedImagePrompt }),
    };

    // Optionally regenerate image
    if (regenerateImage && updatedTweet.hasImage && updatedTweet.imagePrompt) {
      try {
        const prediction = await startImageGeneration({
          prompt: updatedTweet.imagePrompt,
          model: process.env.REPLICATE_MODEL_FAST! as ImageModel,
          aspectRatio: "16:9",
        });
        const imageUrl = await pollImage(prediction.predictionId);
        if (imageUrl) updatedTweet.imageUrl = imageUrl;
      } catch (err) {
        logger.warn("agentic_regen_image_failed", {
          error: err instanceof Error ? err.message : String(err),
          correlationId,
        });
      }
    }

    // Update tweets array in DB
    const updatedTweets = [...currentTweets];
    updatedTweets[tweetIndex] = updatedTweet;

    await db
      .update(agenticPosts)
      .set({ tweets: updatedTweets })
      .where(eq(agenticPosts.id, id));

    logger.info("agentic_tweet_regenerated", {
      agenticPostId: id,
      tweetIndex,
      correlationId,
    });

    return Response.json({ tweet: updatedTweet, tweetIndex });
  } catch (err) {
    logger.error("agentic_regenerate_error", {
      error: err instanceof Error ? err.message : String(err),
      correlationId,
    });
    return ApiError.internal();
  }
}
