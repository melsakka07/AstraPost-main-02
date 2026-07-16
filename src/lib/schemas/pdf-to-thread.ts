import { z } from "zod";

/**
 * Validation schema for the PDF → Thread generation request.
 *
 * Generation params (`language`, `tweetCount`, `tone`) are persisted on the
 * `pdfThreadJobs` row at upload time and used as fallbacks. Clients can
 * override any of them here — useful when the picker UI lives post-upload.
 */
export const pdfToThreadGenerateSchema = z.object({
  jobId: z.string().uuid(),
  language: z.enum(["ar", "en"]).optional(),
  tweetCount: z.number().int().min(3).max(15).optional(),
  tone: z.string().min(1).max(40).optional(),
});

export type PdfToThreadGenerateInput = z.infer<typeof pdfToThreadGenerateSchema>;

// ── Generation output schema (shared by sync route + async processor) ──

export const pdfThreadOutputSchema = z.object({
  tweets: z.array(z.string().max(25_000)),
  title: z.string(),
  sourceLanguage: z.string(),
});

export type PdfThreadOutput = z.infer<typeof pdfThreadOutputSchema>;
