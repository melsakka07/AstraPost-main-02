import { generateObject } from "ai";
import { z } from "zod";
import { getArabicInstructions } from "@/lib/ai/arabic-prompt";
import { sanitizeForPrompt } from "@/lib/ai/voice-profile";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { checkViralScoreAccessDetailed } from "@/lib/middleware/require-plan";
import { recordAiUsage } from "@/lib/services/ai-quota";

const scoreRequestSchema = z.object({
  content: z.string().min(1).max(5000), // Allow thread content
});

// Azure/Claude via OpenRouter rejects `minimum`/`maximum` in JSON Schema for number fields.
// Remove the constraints from the schema and clamp/validate after generation.
const scoreResponseSchema = z.object({
  score: z.number(),
  feedback: z.array(z.string()),
});

export async function POST(req: Request) {
  try {
    const correlationId = getCorrelationId(req);
    // Score route uses viral-score access check instead of the standard AI access check,
    // and skips quota consumption since scoring doesn't burn generation credits.
    const preamble = await aiPreamble({
      customAiAccess: checkViralScoreAccessDetailed,
      skipQuotaCheck: true,
    });
    if (preamble instanceof Response) return preamble;
    const { model, session, dbUser } = preamble;

    const json = await req.json();
    const result = scoreRequestSchema.safeParse(json);

    if (!result.success) {
      return ApiError.badRequest(result.error.issues);
    }

    const { content } = result.data;
    const sanitizedContent = sanitizeForPrompt(content, 5000);

    // Get language: prefer user's DB preference (score doesn't accept language param)
    const userLanguage = dbUser.language || "en";
    const langInstruction = getArabicInstructions(userLanguage);

    const prompt = `
      You are an expert social media analyst for X (Twitter).
      Analyze the following tweet/thread content and provide a viral potential score (0-100) and 3 specific, actionable feedback points to improve it.
      ${langInstruction}

      Content:
      "${sanitizedContent}"

      Scoring Criteria:
      - Hooks (first line/tweet)
      - Value proposition
      - Call to action (CTA)
      - Formatting/readability
      - Emotional trigger

      Feedback should be short and direct (e.g., "Strong hook", "Add a question", "Use more spacing").
    `;

    const { object } = await generateObject({
      model,
      schema: scoreResponseSchema,
      prompt,
    });

    await recordAiUsage(
      session.user.id,
      "viral_score",
      0,
      content,
      object.feedback.join("\n"),
      userLanguage
    );

    // Clamp score to 0-100 in case the model returns out-of-range values
    const res = Response.json({ ...object, score: Math.min(100, Math.max(0, object.score)) });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("ai_scoring_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to score content");
  }
}
