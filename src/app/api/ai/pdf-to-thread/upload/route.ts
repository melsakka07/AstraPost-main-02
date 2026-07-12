import "server-only";

import { PDFParse } from "pdf-parse";
import { withTimeout } from "@/lib/ai/with-timeout";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  checkPdfToThreadAccessDetailed,
  createPlanLimitResponse,
  getUserPlanType,
} from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import type { NewPdfThreadJob } from "@/lib/schema";
import { pdfThreadJobs } from "@/lib/schema";
import { sanitizeFilename, upload, deleteFile } from "@/lib/storage";
import { getTeamContext } from "@/lib/team-context";

// ── Constants ────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_PAGES = 200;
const MIN_CHAR_COUNT = 200;
const SYNC_ELIGIBLE_CHARS = 30_000;
const PARSE_TIMEOUT_MS = 15_000;

// ── Magic-bytes detection ───────────────────────────────────────────

function isPdfByMagicBytes(buffer: Buffer): boolean {
  // PDF header: %PDF- → 25 50 44 46 2D
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  );
}

// ── Route handler ───────────────────────────────────────────────────

export async function POST(req: Request) {
  // Step 1: Auth
  const ctx = await getTeamContext();
  if (!ctx) {
    return ApiError.unauthorized();
  }

  // Step 2: Role check
  if (ctx.role === "viewer") {
    return ApiError.forbidden("Viewers cannot upload PDFs");
  }

  // Step 3: Correlation ID
  const correlationId = getCorrelationId(req);

  // Step 4: Rate limit (before plan gate — lighter Redis check first)
  const plan = await getUserPlanType(ctx.currentTeamId);
  const rlResult = await checkRateLimit(ctx.currentTeamId, plan, "media");
  if (!rlResult.success) return createRateLimitResponse(rlResult);

  // Step 5: Plan gate
  const planGate = await checkPdfToThreadAccessDetailed(ctx.currentTeamId);
  if (!planGate.allowed) return createPlanLimitResponse(planGate);

  let blobUrl: string | null = null;

  try {
    // Step 6: Parse FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return ApiError.badRequest("No file uploaded. Expected a 'file' field with a PDF.");
    }

    const languageRaw = formData.get("language") as string | null;
    const tweetCountRaw = formData.get("tweetCount") as string | null;
    const toneRaw = formData.get("tone") as string | null;
    const attestation = formData.get("attestation") as string | null;

    // ── Validate language ──────────────────────────────────────
    if (!languageRaw || !["ar", "en"].includes(languageRaw)) {
      return ApiError.badRequest("Missing or invalid 'language' field. Must be 'ar' or 'en'.");
    }
    const language = languageRaw as "ar" | "en";

    // ── Validate tweetCount ─────────────────────────────────────
    const tweetCount = tweetCountRaw ? parseInt(tweetCountRaw, 10) : 7;
    if (isNaN(tweetCount) || tweetCount < 3 || tweetCount > 15) {
      return ApiError.badRequest("Invalid 'tweetCount'. Must be an integer between 3 and 15.");
    }

    // ── Validate tone ───────────────────────────────────────────
    const tone =
      toneRaw && toneRaw.length >= 1 && toneRaw.length <= 40 ? toneRaw.trim() : "professional";
    if (!tone) {
      return ApiError.badRequest("Invalid 'tone'. Must be a non-empty string (max 40 chars).");
    }

    // ── Validate attestation ────────────────────────────────────
    if (attestation !== "true") {
      return ApiError.badRequest("Attestation required", "ATTESTATION_REQUIRED");
    }

    // Step 7: Magic-byte validation
    const buffer = Buffer.from(await file.arrayBuffer());

    if (!isPdfByMagicBytes(buffer)) {
      return ApiError.badRequest("The uploaded file is not a valid PDF.", "NOT_A_PDF");
    }

    // Step 8: Size check
    if (buffer.length > MAX_FILE_BYTES) {
      return ApiError.badRequest("File too large. Maximum allowed size is 50 MB.");
    }

    // Step 9: Sanitize filename and upload
    const originalFileName = (file.name || "upload.pdf").slice(0, 255);
    const safeFilename = sanitizeFilename(originalFileName);

    const uploadResult = await upload(buffer, safeFilename, "pdf-uploads");
    blobUrl = uploadResult.url;

    // Step 10: Extract text with pdf-parse (15s timeout)
    let text: string;
    let numpages: number;

    try {
      const pdf = new PDFParse({ data: buffer });
      const textResult = await withTimeout(pdf.getText(), PARSE_TIMEOUT_MS);
      text = textResult.text;
      numpages = textResult.total;
      void pdf.destroy();
    } catch (parseError) {
      // Clean up blob on parse failure
      if (blobUrl) await deleteFile(blobUrl);
      logger.error(
        `pdf_parse_failed: ${(parseError instanceof Error ? parseError.message : String(parseError)).slice(0, 200)}`,
        {
          correlationId,
          fileName: safeFilename,
          error: parseError instanceof Error ? parseError.message : String(parseError),
        }
      );
      return ApiError.badRequest("Could not extract text from the PDF.", "PDF_PARSE_FAILED");
    }

    const charCount = text.length;

    // Step 11: Page count validation
    if (numpages > MAX_PAGES) {
      if (blobUrl) await deleteFile(blobUrl);
      return ApiError.badRequest(
        `PDF has ${numpages} pages. Maximum allowed is ${MAX_PAGES} pages.`,
        "PDF_TOO_MANY_PAGES"
      );
    }

    // Step 12: Empty text check
    if (charCount < MIN_CHAR_COUNT) {
      if (blobUrl) await deleteFile(blobUrl);
      return ApiError.badRequest(
        `Extracted text is only ${charCount} characters. Minimum is ${MIN_CHAR_COUNT}.`,
        "PDF_NO_TEXT_LAYER"
      );
    }

    // Step 13: Insert pdfThreadJobs row
    const syncEligible = charCount <= SYNC_ELIGIBLE_CHARS;

    const jobRow: NewPdfThreadJob = {
      id: crypto.randomUUID(),
      userId: ctx.session.user.id,
      correlationId,
      status: "extracting",
      fileUrl: blobUrl,
      fileName: originalFileName,
      fileSizeBytes: buffer.length,
      pageCount: numpages,
      charCount,
      extractedText: text,
      language,
      tweetCount,
      tone,
      attestationAt: new Date(),
      quotaConsumed: syncEligible ? 5 : 0,
    };

    await db.insert(pdfThreadJobs).values(jobRow);

    logger.info("pdf_upload_success", {
      correlationId,
      jobId: jobRow.id,
      userId: ctx.currentTeamId,
      pageCount: numpages,
      charCount,
      syncEligible,
    });

    // Step 14: Return
    const res = Response.json({
      jobId: jobRow.id,
      charCount,
      pageCount: numpages,
      syncEligible,
      fileName: originalFileName,
    });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    // Clean up blob on any unhandled error
    if (blobUrl) {
      try {
        await deleteFile(blobUrl);
      } catch {
        // Best-effort cleanup
      }
    }
    logger.error(
      `pdf_upload_error: ${(error instanceof Error ? error.message : String(error)).slice(0, 200)}`,
      {
        correlationId,
        userId: ctx.currentTeamId,
        error: error instanceof Error ? error.message : String(error),
      }
    );
    return ApiError.internal("Failed to upload and process PDF.");
  }
}
