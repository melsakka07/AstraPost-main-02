import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkPdfToThreadAccessDetailed } from "@/lib/middleware/require-plan";
import { pdfThreadQueue, PDF_THREAD_JOB_OPTIONS } from "@/lib/queue/client";
import { pdfThreadJobs } from "@/lib/schema";

// ── Request body schema ──────────────────────────────────────────────────────

const enqueueBodySchema = z.object({
  jobId: z.string().min(1),
});

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);

  // Step 1-5: Auth, rate limit, feature gate, quota consumption via aiPreamble
  const preamble = await aiPreamble({
    featureGate: checkPdfToThreadAccessDetailed,
    quotaWeight: 5,
    correlationId,
    promptVersion: "pdf_to_thread:v1",
  });
  if (preamble instanceof Response) return preamble;
  const { session, releaseQuota } = preamble;

  let jobId: string | null = null;

  try {
    // Step 6: Parse and validate body
    const json = await req.json();
    const parsed = enqueueBodySchema.safeParse(json);
    if (!parsed.success) {
      await releaseQuota();
      return ApiError.badRequest(parsed.error.issues);
    }

    jobId = parsed.data.jobId;

    // Step 7: Load job row
    const job = await db.query.pdfThreadJobs.findFirst({
      where: eq(pdfThreadJobs.id, jobId),
    });

    if (!job) {
      await releaseQuota();
      return ApiError.notFound("PDF job");
    }

    // Step 8: Ownership check
    if (job.userId !== session.user.id) {
      await releaseQuota();
      return ApiError.forbidden("You do not own this PDF job.");
    }

    // Step 9: Status check — must be "extracting" (async-eligible PDF)
    if (job.status !== "extracting") {
      await releaseQuota();
      return ApiError.badRequest(`Job is in status "${job.status}". Expected "extracting".`);
    }

    // Step 9b: Verify the job qualifies for async (charCount > 30,000)
    const charCount = job.charCount ?? 0;
    if (charCount <= 30_000) {
      await releaseQuota();
      return ApiError.badRequest(
        "This PDF is small enough for synchronous processing. Use the sync generate endpoint instead."
      );
    }

    // Step 10: db.transaction() — update status to "queued" and set quotaConsumed
    // Capture jobId as const so TypeScript narrows through the async callback
    const safeJobId = jobId;
    await db.transaction(async (tx) => {
      await tx
        .update(pdfThreadJobs)
        .set({
          status: "queued",
          quotaConsumed: 5,
          updatedAt: new Date(),
        })
        .where(eq(pdfThreadJobs.id, safeJobId));
    });

    // Step 11: Enqueue to BullMQ AFTER transaction commits (hard rule #13)
    await pdfThreadQueue.add(
      "pdfThread",
      { jobId, userId: session.user.id, correlationId },
      { jobId, ...PDF_THREAD_JOB_OPTIONS }
    );

    logger.info("pdf_thread_enqueued", {
      correlationId,
      jobId,
      userId: session.user.id,
    });

    // Step 12: Return
    const res = Response.json({ jobId, status: "queued" });
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
    logger.error("pdf_thread_enqueue_error", {
      correlationId,
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to enqueue PDF thread job.");
  }
}
