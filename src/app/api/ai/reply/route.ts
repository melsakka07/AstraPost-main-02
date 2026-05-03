import { generateObject } from "ai";
import { z } from "zod";
import { getArabicInstructions, getArabicToneGuidance } from "@/lib/ai/arabic-prompt";
import { wrapUntrusted } from "@/lib/ai/untrusted";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM, TONE_ENUM } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { checkReplyGeneratorAccessDetailed } from "@/lib/middleware/require-plan";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";
import { importTweet } from "@/lib/services/tweet-importer";

const requestSchema = z.object({
  tweetUrl: z.string().url(),
  language: LANGUAGE_ENUM.default("en"),
  tone: TONE_ENUM.default("casual"),
  includeAuthor: z.boolean().default(false),
});

const repliesSchema = z.object({
  replies: z
    .array(
      z.object({
        text: z.string().max(1100),
        type: z.enum(["agree", "counter", "funny"]),
      })
    )
    .length(3),
});

export async function POST(req: Request) {
  try {
    const correlationId = getCorrelationId(req);
    const preamble = await aiPreamble({ featureGate: checkReplyGeneratorAccessDetailed });
    if (preamble instanceof Response) return preamble;
    const { session, dbUser, model, checkModeration } = preamble;

    const json = await req.json();
    const result = requestSchema.safeParse(json);
    if (!result.success) {
      return ApiError.badRequest(result.error.issues);
    }

    const { tweetUrl, language: clientLanguage, tone, includeAuthor } = result.data;

    // Fetch target tweet
    let tweetText = "";
    let tweetAuthor = "";
    const context = await importTweet(tweetUrl);
    if ("error" in context) {
      return ApiError.badRequest(
        "Could not fetch the tweet. Make sure the URL is valid and the account is public."
      );
    }
    tweetText = context.originalTweet.text.replace(/@\w+/g, "").replace(/\s+/g, " ").trim();
    tweetAuthor = `@${context.originalTweet.author.username}`;

    // Get language: prefer client-sent language, fall back to user's DB preference
    const userLanguage = clientLanguage || dbUser.language || "en";

    const langInstruction = getArabicInstructions(userLanguage);
    const toneGuidance = userLanguage === "ar" ? getArabicToneGuidance(tone) : `Tone: ${tone}`;

    const authorContext = includeAuthor ? ` from ${tweetAuthor}` : "";

    const prompt = `You are an expert social media engagement writer.
Generate exactly 3 replies to the following tweet${authorContext}, one for each type below.
${wrapUntrusted("ORIGINAL TWEET", tweetText, 2_000)}

Reply types (generate exactly one of each):
- agree: amplify and support the original tweet's message
- counter: respectfully challenge or offer an alternative perspective
- funny: be witty, humorous, or playfully engaging

Requirements:
- ${langInstruction}
- ${toneGuidance}
- Each reply must be genuinely engaging and contextually relevant
- Keep replies under 280 characters ideally (hard max: 800 chars)
- Do NOT start with "Great tweet!" or generic openers

For each reply include:
- text: the reply text
- type: one of "agree", "counter", or "funny" (exactly one each across the 3 replies)`;

    const modelId = process.env.OPENROUTER_MODEL!;

    const t0 = performance.now();
    const { object, usage } = await generateObject({
      model,
      schema: repliesSchema,
      prompt,
    });
    const latencyMs = Math.round(performance.now() - t0);

    // Phase 2: uses new options-object signature
    await recordAiUsage({
      userId: session.user.id,
      type: "reply_generator",
      model: modelId,
      subFeature: "reply.generate",
      tokensIn: usage?.inputTokens ?? 0,
      tokensOut: usage?.outputTokens ?? 0,
      costEstimateCents: estimateCost(modelId, usage?.inputTokens ?? 0, usage?.outputTokens ?? 0),
      promptVersion: "reply:v3",
      latencyMs,
      fallbackUsed: false,
      inputPrompt: prompt,
      outputContent: object,
      language: userLanguage,
    });

    // Moderation check on generated replies
    const modResult = await checkModeration(object.replies.map((r) => r.text).join("\n"));
    if (modResult) return modResult;

    const sanitized = {
      tweetText,
      tweetAuthor,
      replies: object.replies.map((r) => ({
        text: r.text.length > 1000 ? r.text.slice(0, 997) + "..." : r.text,
        type: r.type,
      })),
    };

    const res = Response.json(sanitized);
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("reply_generation_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to generate replies");
  }
}
