import { generateObject } from "ai";
import { z } from "zod";
import { getArabicInstructions } from "@/lib/ai/arabic-prompt";
import { wrapUntrusted } from "@/lib/ai/untrusted";
import { sanitizeForPrompt } from "@/lib/ai/voice-profile";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { checkViralScoreAccessDetailed } from "@/lib/middleware/require-plan";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";

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
    const { model, session, dbUser, checkModeration } = preamble;

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
      ${wrapUntrusted("CONTENT", sanitizedContent, 5_000)}

      Scoring Criteria:
      - Hooks (first line/tweet)
      - Value proposition
      - Call to action (CTA)
      - Formatting/readability
      - Emotional trigger

      Feedback should be short and direct (e.g., "Strong hook", "Add a question", "Use more spacing").
    `;

    const modelId = process.env.OPENROUTER_MODEL!;

    const t0 = performance.now();
    const { object, usage } = await generateObject({
      model,
      schema: scoreResponseSchema,
      prompt,
    });
    const latencyMs = Math.round(performance.now() - t0);

    // Moderation check on generated feedback
    const modResult = await checkModeration(object.feedback.join("\n"));
    if (modResult) return modResult;

    // Phase 2: uses new options-object signature
    await recordAiUsage({
      userId: session.user.id,
      type: "viral_score",
      model: modelId,
      subFeature: "score.analyze",
      tokensIn: usage?.inputTokens ?? 0,
      tokensOut: usage?.outputTokens ?? 0,
      costEstimateCents: estimateCost(modelId, usage?.inputTokens ?? 0, usage?.outputTokens ?? 0),
      promptVersion: "score:v2",
      latencyMs,
      fallbackUsed: false,
      inputPrompt: content,
      outputContent: object.feedback.join("\n"),
      language: userLanguage,
    });

    // Clamp score to 0-100 in case the model returns out-of-range values
    const clamped = Math.min(100, Math.max(0, object.score));
    const tier = clamped <= 25 ? "Weak" : clamped <= 50 ? "OK" : clamped <= 75 ? "Strong" : "Viral";

    const res = Response.json({ score: clamped, tier, feedback: object.feedback });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("ai_scoring_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to score content");
  }
}
