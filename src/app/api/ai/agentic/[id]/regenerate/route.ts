import { headers } from "next/headers";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { VERSION } from "@/lib/ai/agentic-prompts";
import type { AgenticTweet, ResearchBrief, ContentPlan } from "@/lib/ai/agentic-types";
import { getArabicInstructions } from "@/lib/ai/arabic-prompt";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  checkAiLimitDetailed,
  checkAiQuotaDetailed,
  createPlanLimitResponse,
} from "@/lib/middleware/require-plan";
import type { ImageModel } from "@/lib/plan-limits";
import { agenticPosts } from "@/lib/schema";
import { startImageGeneration, checkImagePrediction } from "@/lib/services/ai-image";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";

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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const correlationId = getCorrelationId(req);
  const { id } = await params;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return ApiError.unauthorized();

    // Quota checks — regeneration burns the same quota as a fresh generation
    const aiAccess = await checkAiLimitDetailed(session.user.id);
    if (!aiAccess.allowed) return createPlanLimitResponse(aiAccess);
    const aiQuota = await checkAiQuotaDetailed(session.user.id);
    if (!aiQuota.allowed) return createPlanLimitResponse(aiQuota);

    const json = (await req.json()) as unknown;
    const parsed = regenerateSchema.safeParse(json);
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { tweetIndex, regenerateImage } = parsed.data;

    const agenticPost = await db.query.agenticPosts.findFirst({
      where: and(eq(agenticPosts.id, id), eq(agenticPosts.userId, session.user.id)),
      with: {
        user: {
          columns: { language: true },
        },
      },
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

    // Get user's language preference
    const userLanguage = agenticPost.user?.language || "en";
    const langInstruction = getArabicInstructions(userLanguage);

    const model = openrouter(process.env.OPENROUTER_MODEL!);

    // Regenerate tweet text
    const prompt = `You are an expert social media copywriter.
${langInstruction}

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

    const modelName = process.env.OPENROUTER_MODEL!;
    const t0 = performance.now();
    const result = await generateText({ model, prompt });
    const latencyMs = Math.round(performance.now() - t0);

    // Record text generation usage
    // Phase 2: uses new options-object signature
    await recordAiUsage({
      userId: session.user.id,
      type: "agentic_regenerate",
      model: modelName,
      subFeature: "agentic.regenerate",
      tokensIn: result.usage?.inputTokens ?? 0,
      tokensOut: result.usage?.outputTokens ?? 0,
      costEstimateCents: estimateCost(
        modelName,
        result.usage?.inputTokens ?? 0,
        result.usage?.outputTokens ?? 0
      ),
      promptVersion: VERSION,
      latencyMs,
      fallbackUsed: false,
      inputPrompt: `regenerate:tweet-${tweetIndex}`,
      outputContent: { tweetIndex, tweetText: result.text.slice(0, 100) },
      language: userLanguage,
    });

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
        if (imageUrl) {
          updatedTweet.imageUrl = imageUrl;
          // Record image generation usage (no LLM tokens, so tokensIn/Out are 0)
          // Phase 2: uses new options-object signature
          await recordAiUsage({
            userId: session.user.id,
            type: "image",
            model: "replicate",
            subFeature: "agentic.image",
            tokensIn: 0,
            tokensOut: 0,
            costEstimateCents: 0,
            promptVersion: VERSION,
            latencyMs: 0,
            fallbackUsed: false,
            inputPrompt: `agentic-regen-image:tweet-${tweetIndex}`,
            outputContent: { tweetIndex, imagePrompt: updatedTweet.imagePrompt },
            language: userLanguage,
          });
        }
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

    await db.update(agenticPosts).set({ tweets: updatedTweets }).where(eq(agenticPosts.id, id));

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
