import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import * as Sentry from "@sentry/nextjs";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { buildLanguageBlock } from "@/lib/ai/language";
import { openrouterFallbackBody } from "@/lib/ai/openrouter-fallback";
import { JAILBREAK_GUARD, wrapUntrusted } from "@/lib/ai/untrusted";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkYoutubeToThreadAccessDetailed } from "@/lib/middleware/require-plan";
import { youtubeThreadJobs } from "@/lib/schema";
import { youtubeThreadOutputSchema } from "@/lib/schemas/youtube-to-thread";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";

// ── Local constants ──────────────────────────────────────────────────────

const TONE_LABELS: Record<string, string> = {
  professional: "concise and professional",
  educational: "informative and educational",
  casual: "natural and conversational",
  formal: "formal and authoritative",
  enthusiastic: "energetic and enthusiastic",
};

// ── Request schema ───────────────────────────────────────────────────────

const youtubeThreadGenerateSchema = z.object({
  jobId: z.string().min(1),
  language: z.enum(["ar", "en"]),
  tweetCount: z.number().int().min(3).max(15),
  tone: z.enum(["professional", "educational", "casual", "formal", "enthusiastic"]),
});

// ── Route handler ────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);

  const preamble = await aiPreamble({
    featureGate: checkYoutubeToThreadAccessDetailed,
    quotaWeight: 5,
    correlationId,
    promptVersion: "youtube_to_thread:v1",
  });
  if (preamble instanceof Response) return preamble;
  const { session, releaseQuota, checkModeration } = preamble;

  const modelId = process.env.OPENROUTER_MODEL_YOUTUBE_TO_THREAD ?? process.env.OPENROUTER_MODEL!;
  const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! });
  const fallbackBody = openrouterFallbackBody(
    process.env.OPENROUTER_MODEL_YOUTUBE_TO_THREAD,
    process.env.OPENROUTER_MODEL
  );
  const model = openrouter(modelId, {
    ...(fallbackBody && { extraBody: fallbackBody }),
  });

  let jobId: string | null = null;
  let language: "ar" | "en" | undefined;
  let safeTranscript: string | undefined;

  try {
    const json = await req.json();
    const parsed = youtubeThreadGenerateSchema.safeParse(json);
    if (!parsed.success) {
      await releaseQuota();
      return ApiError.badRequest(parsed.error.issues);
    }

    jobId = parsed.data.jobId;

    // ── Load job row ────────────────────────────────────────────────────
    const job = await db.query.youtubeThreadJobs.findFirst({
      where: eq(youtubeThreadJobs.id, jobId),
    });

    if (!job) {
      await releaseQuota();
      return ApiError.notFound("YouTube job");
    }

    // ── Ownership check ─────────────────────────────────────────────────
    if (job.userId !== session.user.id) {
      await releaseQuota();
      return ApiError.forbidden("You do not own this YouTube job.");
    }

    // ── Generation params from body ─────────────────────────────────────
    language = parsed.data.language;
    const { tweetCount, tone } = parsed.data;

    // ── Read transcript ─────────────────────────────────────────────────
    const transcript = job.transcript;
    if (!transcript) {
      await releaseQuota();
      return ApiError.badRequest(
        "No transcript available. Please wait for the job to finish transcribing."
      );
    }

    // ── Build prompt ────────────────────────────────────────────────────
    const langBlock = buildLanguageBlock(language, "social");

    const systemPrompt =
      `You are a social media expert who converts video transcripts into engaging X (Twitter) threads.\n\n` +
      `REQUIREMENTS:\n` +
      `- Write EXACTLY ${tweetCount} tweets (no more, no less)\n` +
      `- Each tweet MUST be 280 characters or less\n` +
      `- Make the thread engaging and easy to read\n` +
      `- Use a ${TONE_LABELS[tone] ?? TONE_LABELS.casual} tone\n` +
      `- Break down complex ideas into digestible tweets\n` +
      `- The first tweet should hook the reader\n` +
      `- The last tweet should include a call-to-action or takeaway\n\n` +
      `${langBlock}\n\n` +
      `${JAILBREAK_GUARD}`;

    safeTranscript = wrapUntrusted("VIDEO TRANSCRIPT", transcript, 50_000);

    // ── Generate thread with AI ─────────────────────────────────────────

    let object: z.infer<typeof youtubeThreadOutputSchema>;
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const t0 = performance.now();
      const result = await generateObject({
        model,
        schema: youtubeThreadOutputSchema,
        system: systemPrompt,
        prompt: `Video transcript:\n\n${safeTranscript}`,
      });
      object = result.object;
      inputTokens = result.usage?.inputTokens ?? 0;
      outputTokens = result.usage?.outputTokens ?? 0;
      const latencyMs = Math.round(performance.now() - t0);

      // ── Enforce tweet count + 280-char cap ───────────────────────────
      const trimmedTweets = object.tweets
        .map((t: string) => (t.length > 280 ? t.slice(0, 280) : t))
        .filter((t: string) => t.trim().length > 0)
        .slice(0, tweetCount);

      if (trimmedTweets.length === 0) {
        throw new Error("Model returned no tweets");
      }

      const threadTweets = trimmedTweets.map((t: string) => ({
        text: t,
        charCount: t.length,
      }));

      // ── Record AI usage + update job in a single transaction ─────────
      const finalJobId = jobId!;
      await db.transaction(async (tx) => {
        await recordAiUsage({
          userId: session.user.id,
          type: "youtube_to_thread",
          model: modelId,
          subFeature: "regenerate",
          tokensIn: inputTokens,
          tokensOut: outputTokens,
          costEstimateCents: estimateCost(modelId, inputTokens, outputTokens),
          promptVersion: "youtube_to_thread:v1",
          latencyMs,
          fallbackUsed: false,
          inputPrompt: `Video transcript:\n\n${safeTranscript}`,
          outputContent: { tweets: trimmedTweets, title: object.title },
          ...(language !== undefined && { language }),
          tx,
        });

        await tx
          .update(youtubeThreadJobs)
          .set({
            status: "ready",
            threadResult: {
              tweets: threadTweets,
              title: object.title,
              videoUrl: job.youtubeUrl,
            },
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(youtubeThreadJobs.id, finalJobId));
      });
    } catch (generationError) {
      logger.error(
        `youtube_thread_regenerate_generation_error: ${(generationError instanceof Error ? generationError.message : String(generationError)).slice(0, 200)}`,
        {
          correlationId,
          jobId,
          userId: session.user.id,
        }
      );

      // Best-effort: if AI tokens were consumed before the transaction
      // failed, record them so billing isn't lost.
      if (inputTokens > 0 || outputTokens > 0) {
        try {
          await recordAiUsage({
            userId: session.user.id,
            type: "youtube_to_thread",
            model: modelId,
            subFeature: "regenerate",
            tokensIn: inputTokens,
            tokensOut: outputTokens,
            costEstimateCents: estimateCost(modelId, inputTokens, outputTokens),
            promptVersion: "youtube_to_thread:v1",
            latencyMs: 0,
            fallbackUsed: false,
            inputPrompt: safeTranscript ?? "(transcript unavailable)",
            outputContent: { error: "post_generation_failure" },
            ...(language !== undefined && { language }),
          });
        } catch {
          // Swallow — don't compound the error with a usage-recording failure
        }
      }

      // Update job to failed
      await db
        .update(youtubeThreadJobs)
        .set({
          status: "failed",
          error: "generation_failed",
          updatedAt: new Date(),
        })
        .where(eq(youtubeThreadJobs.id, jobId));

      throw generationError;
    }

    // ── Moderation check ──────────────────────────────────────────────
    const modResult = await checkModeration(object.tweets.join("\n"));
    if (modResult) {
      await releaseQuota();
      // Update job to failed on moderation flag
      await db
        .update(youtubeThreadJobs)
        .set({
          status: "failed",
          error: "Content moderation flagged the generated thread.",
          quotaReleased: true,
          updatedAt: new Date(),
        })
        .where(eq(youtubeThreadJobs.id, jobId));

      return modResult;
    }

    logger.info("youtube_thread_regenerated", {
      correlationId,
      jobId,
      userId: session.user.id,
      tweetCount: object.tweets.length,
      language,
      tone,
    });

    // ── Return ─────────────────────────────────────────────────────────
    const res = Response.json({
      jobId,
      tweets: object.tweets,
      title: object.title,
      videoUrl: job.youtubeUrl,
    });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    await releaseQuota();
    if (jobId) {
      await db
        .update(youtubeThreadJobs)
        .set({ quotaReleased: true, updatedAt: new Date() })
        .where(eq(youtubeThreadJobs.id, jobId));
    }
    logger.error(
      `ai_stream_failed: ${(error instanceof Error ? error.message : String(error)).slice(0, 200)}`,
      {
        route: "youtube-to-thread/generate",
        userId: session.user.id,
        correlationId,
        jobId,
      }
    );
    Sentry.captureException(error, {
      tags: {
        route: "youtube-to-thread/generate",
        userId: session.user.id,
        correlationId,
      },
    });
    return ApiError.internal("Failed to generate thread from YouTube video.");
  }
}
