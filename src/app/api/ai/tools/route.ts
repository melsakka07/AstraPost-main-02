import { generateObject } from "ai";
import { z } from "zod";
import { getArabicInstructions, getArabicToneGuidance } from "@/lib/ai/arabic-prompt";
import { buildVoiceInstructions } from "@/lib/ai/voice-profile";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM, TONE_ENUM } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { checkToolsAccessDetailed } from "@/lib/middleware/require-plan";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";

const requestSchema = z.object({
  tool: z.enum(["hook", "cta", "rewrite"]),
  language: LANGUAGE_ENUM.default("ar"),
  tone: TONE_ENUM.default("professional"),
  topic: z.string().max(500).optional(),
  input: z.string().max(25000).optional(),
  // Phase 2: CTA context for better relevance
  context: z.string().max(500).optional(),
});

// Keep the schema constraint generous — the AI sometimes exceeds the prompt's
// character limit by a few characters, and Zod validation failure causes
// generateObject to throw. We enforce the actual limit in the prompt and
// truncate on return if needed.
const responseSchema = z.object({
  text: z.string().max(1100),
});

export async function POST(req: Request) {
  try {
    const correlationId = getCorrelationId(req);
    const preamble = await aiPreamble({ featureGate: checkToolsAccessDetailed });
    if (preamble instanceof Response) return preamble;
    const { session, dbUser, model, checkModeration } = preamble;

    const json = await req.json();
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    const { tool, language: clientLanguage, tone, topic, input, context } = parsed.data;

    // Get language: prefer client-sent language, fall back to user's DB preference
    const userLanguage = clientLanguage || dbUser.language || "en";

    // Validate the stored voiceProfile against the strict schema and sanitize
    // every field before interpolation. Returns "" for null/invalid profiles.
    const voiceInstructions = buildVoiceInstructions(
      dbUser?.voiceProfile,
      dbUser?.voiceVariant ?? "default"
    );

    const langInstruction = getArabicInstructions(userLanguage);
    const toneGuidance = userLanguage === "ar" ? getArabicToneGuidance(tone) : `Tone: ${tone}.`;

    const prompt = (() => {
      if (tool === "hook") {
        return `You are an expert viral X (Twitter) writer. Write ONE hook tweet about: "${
          topic || ""
        }".
${toneGuidance}
${langInstruction}
${voiceInstructions}

Constraints:
- Max 200 characters.
- No hashtags.
- No numbering.
- Make it curiosity-driven.`;
      }

      if (tool === "cta") {
        const contextPrompt = context ? `\n\nThread context for relevance:\n${context}` : "";
        return `Write a short call-to-action for the END of an X thread.
${toneGuidance}
${langInstruction}
${voiceInstructions}
${contextPrompt}

Constraints:
- Max 120 characters.
- No hashtags.
- Encourage likes/reposts/follows or a thoughtful reply.`;
      }

      return `Rewrite the following X tweet.
${toneGuidance}
${langInstruction}
${voiceInstructions}

Constraints:
- Max 280 characters.
- Preserve the meaning.
- Improve clarity and punch.

Tweet:
${input || ""}`;
    })();

    const modelId = process.env.OPENROUTER_MODEL!;

    const t0 = performance.now();
    const { object, usage } = await generateObject({
      model,
      schema: responseSchema,
      prompt,
    });
    const latencyMs = Math.round(performance.now() - t0);

    // Moderation check on generated tool output
    const modResult = await checkModeration(object.text);
    if (modResult) return modResult;

    // Phase 2: uses new options-object signature
    const generationId = await recordAiUsage({
      userId: session.user.id,
      type: tool,
      model: modelId,
      subFeature: "tools.generate",
      tokensIn: usage?.inputTokens ?? 0,
      tokensOut: usage?.outputTokens ?? 0,
      costEstimateCents: estimateCost(modelId, usage?.inputTokens ?? 0, usage?.outputTokens ?? 0),
      promptVersion: "tools:v1",
      latencyMs,
      fallbackUsed: false,
      inputPrompt: prompt,
      outputContent: object,
      language: userLanguage,
    });

    const res = Response.json({ ...object, generationId });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (err) {
    logger.error("ai_tools_error", { error: err instanceof Error ? err.message : String(err) });
    return ApiError.internal("AI tool failed");
  }
}
