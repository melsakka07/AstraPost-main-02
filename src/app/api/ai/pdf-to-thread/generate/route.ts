import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { INPUT_LIMITS } from "@/lib/ai/input-limits";
import { redactPII } from "@/lib/ai/pii";
import { buildSummarizePrompt } from "@/lib/ai/summarize-prompts";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkPdfToThreadAccessDetailed } from "@/lib/middleware/require-plan";
import { pdfThreadJobs } from "@/lib/schema";
import { pdfToThreadGenerateSchema, pdfThreadOutputSchema } from "@/lib/schemas/pdf-to-thread";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";

// ── Route handler ─────────────────────────────────────────────────────

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);

  const preamble = await aiPreamble({
    featureGate: checkPdfToThreadAccessDetailed,
    quotaWeight: 5,
    correlationId,
    promptVersion: "pdf_to_thread:v1",
  });
  if (preamble instanceof Response) return preamble;
  const { session, releaseQuota, checkModeration } = preamble;

  const modelId = process.env.OPENROUTER_MODEL_PDF_TO_THREAD ?? process.env.OPENROUTER_MODEL!;
  const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY! });
  const model = openrouter(modelId);

  let jobId: string | null = null;

  try {
    const json = await req.json();
    const parsed = pdfToThreadGenerateSchema.safeParse(json);
    if (!parsed.success) {
      await releaseQuota();
      return ApiError.badRequest(parsed.error.issues);
    }

    jobId = parsed.data.jobId;

    // ── Load job row ──────────────────────────────────────────────────
    const job = await db.query.pdfThreadJobs.findFirst({
      where: eq(pdfThreadJobs.id, jobId),
    });

    if (!job) {
      await releaseQuota();
      return ApiError.notFound("PDF job");
    }

    // ── Ownership check ───────────────────────────────────────────────
    if (job.userId !== session.user.id) {
      await releaseQuota();
      return ApiError.forbidden("You do not own this PDF job.");
    }

    // ── Status check ──────────────────────────────────────────────────
    if (job.status !== "extracting") {
      await releaseQuota();
      return ApiError.badRequest(`Job is in status "${job.status}". Expected "extracting".`);
    }

    // ── Generation params — body overrides take priority, job row as fallback ──
    const language = parsed.data.language ?? job.language;
    const tweetCount = parsed.data.tweetCount ?? job.tweetCount;
    const tone = parsed.data.tone ?? job.tone;

    // ── charCount > 30_000 → async path required ──────────────────────
    const charCount = job.charCount ?? 0;
    if (charCount > 30_000) {
      await releaseQuota();
      return ApiError.conflict(
        "This PDF is too large for synchronous processing. Please use background generation instead.",
        "USE_ASYNC_PATH"
      );
    }

    // ── Load extracted text ───────────────────────────────────────────
    const text = job.extractedText;
    if (!text) {
      await releaseQuota();
      return ApiError.badRequest("No extracted text found for this job.");
    }

    // ── PII redaction ─────────────────────────────────────────────────
    const { cleaned: cleanBody, redactions } = redactPII(text);
    if (redactions.length > 0) {
      logger.info("pii_redacted", {
        correlationId,
        jobId,
        type: "pdf_to_thread",
        redactions,
      });
    }

    // ── Build prompt ──────────────────────────────────────────────────
    const prompt = buildSummarizePrompt({
      variant: "report",
      language,
      tone,
      tweetCount,
      title: job.fileName,
      body: cleanBody,
      bodyMaxChars: INPUT_LIMITS.pdfReportBody,
    });

    // ── Generate thread with AI ───────────────────────────────────────

    let object: z.infer<typeof pdfThreadOutputSchema>;
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const t0 = performance.now();
      const result = await generateObject({
        model,
        schema: pdfThreadOutputSchema,
        prompt,
      });
      object = result.object;
      inputTokens = result.usage?.inputTokens ?? 0;
      outputTokens = result.usage?.outputTokens ?? 0;
      const latencyMs = Math.round(performance.now() - t0);

      // ── Map tweets to schema format ───────────────────────────────────
      const threadTweets = object.tweets.map((t) => ({
        text: t,
        charCount: t.length,
      }));

      // ── Record AI usage + update job in a single transaction ──────
      // Usage tracking failure is less critical than job state inconsistency,
      // so we commit both writes atomically.
      // At this point jobId is guaranteed non-null (validated by ownership + status checks above).
      const finalJobId = jobId!;
      await db.transaction(async (tx) => {
        await recordAiUsage({
          userId: session.user.id,
          type: "pdf_to_thread",
          model: modelId,
          subFeature: "summarize.sync",
          tokensIn: inputTokens,
          tokensOut: outputTokens,
          costEstimateCents: estimateCost(modelId, inputTokens, outputTokens),
          promptVersion: "pdf_to_thread:v1",
          latencyMs,
          fallbackUsed: false,
          inputPrompt: prompt,
          outputContent: object,
          language,
          tx,
        });

        await tx
          .update(pdfThreadJobs)
          .set({
            status: "ready",
            threadResult: {
              tweets: threadTweets,
              title: object.title,
              sourceLanguage: object.sourceLanguage as "ar" | "en",
            },
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(pdfThreadJobs.id, finalJobId));
      });
    } catch (generationError) {
      logger.error("pdf_thread_generation_error", {
        correlationId,
        jobId,
        userId: session.user.id,
        error: generationError instanceof Error ? generationError.message : String(generationError),
      });

      // Update job to failed — store sanitized error, not raw provider message
      await db
        .update(pdfThreadJobs)
        .set({
          status: "failed",
          error: "generation_failed",
          updatedAt: new Date(),
        })
        .where(eq(pdfThreadJobs.id, jobId));

      throw generationError;
    }

    // ── Moderation check ──────────────────────────────────────────────
    const modResult = await checkModeration(object.tweets.join("\n"));
    if (modResult) {
      await releaseQuota();
      // Update job to failed on moderation flag
      await db
        .update(pdfThreadJobs)
        .set({
          status: "failed",
          error: "Content moderation flagged the generated thread.",
          updatedAt: new Date(),
        })
        .where(eq(pdfThreadJobs.id, jobId));

      return modResult;
    }

    logger.info("pdf_to_thread_generated", {
      correlationId,
      jobId,
      userId: session.user.id,
      tweetCount: object.tweets.length,
      redactions: redactions.length,
    });

    // ── Return ────────────────────────────────────────────────────────
    const res = Response.json({
      jobId,
      tweets: object.tweets,
      title: object.title,
      redactions: redactions.length > 0 ? redactions : undefined,
      sourceLanguage: object.sourceLanguage,
    });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    await releaseQuota();
    if (jobId) {
      await db
        .update(pdfThreadJobs)
        .set({ quotaReleased: true, updatedAt: new Date() })
        .where(eq(pdfThreadJobs.id, jobId));
    }
    logger.error("pdf_to_thread_generate_error", {
      correlationId,
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to generate thread from PDF.");
  }
}
