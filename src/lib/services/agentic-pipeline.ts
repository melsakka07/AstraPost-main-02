import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import {
  buildResearchPrompt,
  buildStrategyPrompt,
  buildWritingPrompt,
  buildReviewPrompt,
} from "@/lib/ai/agentic-prompts";
import type {
  AgenticPost,
  AgenticTweet,
  ContentPlan,
  PipelineProgressEvent,
  PipelineStep,
  ResearchBrief,
  StepStatus,
} from "@/lib/ai/agentic-types";
import { buildVoiceInstructions } from "@/lib/ai/voice-profile";
import { logger } from "@/lib/logger";
import type { XSubscriptionTier } from "@/lib/schemas/common";
import { generateAgenticImage } from "@/lib/services/ai-image";
import { recordAiUsage } from "@/lib/services/ai-quota";
import { canPostLongContent } from "@/lib/services/x-subscription";

export type { AgenticPost, AgenticTweet, ContentPlan, ResearchBrief };

interface RunAgenticPipelineParams {
  topic: string;
  xAccountId: string;
  xSubscriptionTier: XSubscriptionTier;
  voiceProfile: unknown;
  language: string;
  userId: string;
  correlationId: string;
  agenticPostId: string;
  preferences?:
    | {
        tone?: string | undefined;
        includeImages?: boolean | undefined;
        audience?: string | undefined;
      }
    | undefined;
  onProgress: (event: PipelineProgressEvent) => void;
}

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch =
      text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    const raw = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text;
    return JSON.parse(raw.trim()) as T;
  } catch {
    return fallback;
  }
}

export async function runAgenticPipeline(params: RunAgenticPipelineParams): Promise<AgenticPost> {
  const {
    topic,
    xAccountId,
    xSubscriptionTier,
    voiceProfile,
    language,
    userId,
    correlationId,
    agenticPostId,
    preferences,
    onProgress,
  } = params;

  const log = (event: string, data?: Record<string, unknown>) =>
    logger.info(event, { correlationId, agenticPostId, userId, ...data });

  const emit = (step: PipelineStep, status: StepStatus, data?: unknown) =>
    onProgress({ step, status, ...(data !== undefined && { data }) });

  // Use dedicated agentic model if configured, otherwise fall back to the default model.
  const modelId = process.env.OPENROUTER_MODEL_AGENTIC ?? process.env.OPENROUTER_MODEL!;
  const model = openrouter(modelId);
  const canUseLong = canPostLongContent(xSubscriptionTier);
  const toneHint = preferences?.tone ?? "professional";
  const audienceHint = preferences?.audience ?? "general audience";
  const includeImages = preferences?.includeImages !== false;

  // ── Step 1: Research ────────────────────────────────────────────────────────
  emit("research", "in_progress");
  log("agentic_research_start");

  let research: ResearchBrief;
  try {
    const researchPrompt = buildResearchPrompt(topic, language, audienceHint);
    const researchResult = await generateText({
      model,
      prompt: researchPrompt,
      maxOutputTokens: 1200,
      abortSignal: AbortSignal.timeout(45_000),
    });
    research = safeJsonParse<ResearchBrief>(researchResult.text, {
      topic,
      angles: [{ title: "General Overview", description: topic, viralPotential: "medium" }],
      trendingHashtags: [],
      keyFacts: [],
      recommendedAngle: "General Overview",
    });
  } catch (err) {
    // Re-throw TOPIC_TOO_BROAD as-is; wrap all other errors
    if (err instanceof Error && err.message === "TOPIC_TOO_BROAD") throw err;
    emit("research", "failed");
    logger.error("agentic_research_failed", {
      error: err instanceof Error ? err.message : String(err),
      correlationId,
    });
    throw err;
  }

  // 4A: Broad topic detection — pause pipeline and ask user to narrow
  if (research.too_broad && research.broadSuggestions?.length) {
    emit("research", "needs_input", {
      suggestions: research.broadSuggestions,
      message: "Your topic is quite broad. Pick a specific angle to get better content:",
    });
    // Store partial state and throw a special error so the API route can update DB to "needs_input"
    const err = new Error("TOPIC_TOO_BROAD");
    (err as Error & { suggestions: string[] }).suggestions = research.broadSuggestions;
    throw err;
  }

  emit("research", "complete", {
    angles: research.angles,
    recommendedAngle: research.recommendedAngle,
  });
  log("agentic_research_done", { angleCount: research.angles.length });

  // ── Step 2: Strategy ────────────────────────────────────────────────────────
  emit("strategy", "in_progress");
  log("agentic_strategy_start");

  let plan: ContentPlan;
  try {
    const strategyPrompt = buildStrategyPrompt(research, xSubscriptionTier, language, {
      tone: preferences?.tone,
      audience: preferences?.audience,
      includeImages: preferences?.includeImages,
    });
    const strategyResult = await generateText({
      model,
      prompt: strategyPrompt,
      maxOutputTokens: 400,
      abortSignal: AbortSignal.timeout(30_000),
    });
    plan = safeJsonParse<ContentPlan>(strategyResult.text, {
      format: "thread",
      lengthOption: "short",
      tweetCount: 5,
      tone: toneHint,
      structure: "hook → value points → CTA",
      imageSlots: [],
      rationale: "Thread format for comprehensive coverage",
    });
  } catch (err) {
    emit("strategy", "failed");
    logger.error("agentic_strategy_failed", {
      error: err instanceof Error ? err.message : String(err),
      correlationId,
    });
    throw err;
  }

  // Safety: free accounts cannot use medium/long
  if (!canUseLong) {
    plan.lengthOption = "short";
  }

  emit("strategy", "complete", { format: plan.format, tweetCount: plan.tweetCount });
  log("agentic_strategy_done", { format: plan.format, tweetCount: plan.tweetCount });

  // ── Step 3: Write ────────────────────────────────────────────────────────────
  emit("writing", "in_progress");
  log("agentic_write_start");

  let tweets: AgenticTweet[];
  try {
    const voiceBlock = buildVoiceInstructions(voiceProfile);
    const writePrompt = buildWritingPrompt(research, plan, voiceBlock ?? null, language);
    const writeResult = await generateText({
      model,
      prompt: writePrompt,
      maxOutputTokens: 3000,
      abortSignal: AbortSignal.timeout(90_000),
    });
    tweets = safeJsonParse<AgenticTweet[]>(writeResult.text, []);
  } catch (err) {
    emit("writing", "failed");
    logger.error("agentic_writing_failed", {
      error: err instanceof Error ? err.message : String(err),
      correlationId,
    });
    throw err;
  }

  // Ensure position and charCount are set.
  // charCount must match how approve/route.ts assembles content:
  //   content = text + " " + "#tag1 #tag2"
  // so we include hashtag length to prevent silent TIER_LIMIT_EXCEEDED at publish time.
  tweets = tweets.map((t, i) => {
    const hashtagStr = t.hashtags?.length ? " " + t.hashtags.map((h) => `#${h}`).join(" ") : "";
    const combined = (t.text ?? "") + hashtagStr;
    return {
      ...t,
      position: t.position ?? i,
      charCount: combined.length,
    };
  });

  emit("writing", "complete", tweets);
  log("agentic_write_done", { tweetCount: tweets.length });

  // ── Step 4: Images ────────────────────────────────────────────────────────────
  if (includeImages && tweets.some((t) => t.hasImage && t.imagePrompt)) {
    const imageTweets = tweets.filter((t) => t.hasImage && t.imagePrompt);
    emit("images", "in_progress", { total: imageTweets.length });
    log("agentic_images_start", { count: imageTweets.length });

    let completed = 0;

    const imageResults = await Promise.allSettled(
      imageTweets.map(async (tweet) => {
        const result = await generateAgenticImage({
          prompt: tweet.imagePrompt!,
          style: "editorial",
          aspectRatio: "16:9",
        });

        completed++;
        onProgress({ step: "images", status: "progress", completed, total: imageTweets.length });

        if ("error" in result) {
          logger.warn("agentic_image_generation_failed", {
            position: tweet.position,
            error: result.error,
            correlationId,
          });
          return { position: tweet.position, imageUrl: null };
        }

        return { position: tweet.position, imageUrl: result.url };
      })
    );

    // Attach image URLs to tweets
    for (const result of imageResults) {
      if (result.status === "fulfilled" && result.value.imageUrl) {
        const idx = tweets.findIndex((t) => t.position === result.value.position);
        if (idx !== -1) {
          tweets[idx] = { ...tweets[idx]!, imageUrl: result.value.imageUrl };
        }
      }
    }

    emit("images", "complete", tweets);
    log("agentic_images_done");
  }

  // ── Step 5: Review ────────────────────────────────────────────────────────────
  emit("review", "in_progress");
  log("agentic_review_start");

  const reviewPrompt = buildReviewPrompt(research, tweets, plan);

  const reviewResult = await generateText({
    model,
    prompt: reviewPrompt,
    maxOutputTokens: 400,
    abortSignal: AbortSignal.timeout(30_000),
  });
  const review = safeJsonParse<{
    qualityScore: number;
    summary: string;
    issues: string[];
    passed: boolean;
  }>(reviewResult.text, {
    qualityScore: 7,
    summary: `AI-generated content about ${topic}`,
    issues: [],
    passed: true,
  });

  emit("review", "complete", { qualityScore: review.qualityScore, summary: review.summary });
  log("agentic_review_done", { qualityScore: review.qualityScore });

  // ── Record AI quota usage ────────────────────────────────────────────────────
  try {
    await recordAiUsage(userId, "agentic_pipeline", 0, topic, review.summary, language);
  } catch (err) {
    logger.warn("agentic_quota_record_failed", {
      error: err instanceof Error ? err.message : String(err),
      correlationId,
    });
  }

  const agenticPost: AgenticPost = {
    id: agenticPostId,
    topic,
    research,
    plan,
    tweets,
    qualityScore: review.qualityScore,
    summary: review.summary,
    createdAt: new Date().toISOString(),
    xAccountId,
    xSubscriptionTier,
  };

  // NOTE: "done" is intentionally NOT emitted here.
  // The route handler sends it *after* updating the DB row to "ready",
  // ensuring the approve route never sees status "generating" on first click.
  log("agentic_pipeline_done", { qualityScore: review.qualityScore, tweetCount: tweets.length });

  return agenticPost;
}
