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
import { recordAiUsage } from "@/lib/services/ai-quota";
import { importTweet } from "@/lib/services/tweet-importer";

const requestSchema = z.object({
  tweetUrl: z.string().url(),
  language: LANGUAGE_ENUM.default("en"),
  tone: TONE_ENUM.default("casual"),
  goal: z.enum(["agree", "add", "counter", "funny", "question"]).default("add"),
});

const repliesSchema = z.object({
  replies: z.array(
    z.object({
      text: z.string().max(1100),
      style: z.string().max(100),
    })
  ),
});

const GOAL_LABELS: Record<string, string> = {
  agree: "agree with and amplify the original tweet",
  add: "add valuable information or insight",
  counter: "respectfully challenge or offer a counter-perspective",
  funny: "be witty or humorous",
  question: "ask a thoughtful follow-up question",
};

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

    const { tweetUrl, language: clientLanguage, tone, goal } = result.data;

    // Fetch target tweet
    let tweetText = "";
    let tweetAuthor = "";
    const context = await importTweet(tweetUrl);
    if ("error" in context) {
      return ApiError.badRequest(
        "Could not fetch the tweet. Make sure the URL is valid and the account is public."
      );
    }
    tweetText = context.originalTweet.text;
    tweetAuthor = `@${context.originalTweet.author.username}`;

    // Get language: prefer client-sent language, fall back to user's DB preference
    const userLanguage = clientLanguage || dbUser.language || "en";

    const langInstruction = getArabicInstructions(userLanguage);
    const toneGuidance = userLanguage === "ar" ? getArabicToneGuidance(tone) : `Tone: ${tone}`;
    const goalLabel = GOAL_LABELS[goal] || "add value";

    const prompt = `You are an expert social media engagement writer.
Generate 5 high-quality replies to the following tweet from ${tweetAuthor}.
${wrapUntrusted("ORIGINAL TWEET", tweetText, 2_000)}

Requirements:
- ${langInstruction}
- ${toneGuidance}
- Goal: ${goalLabel}
- Each reply should be genuinely engaging and contextually relevant
- Keep replies under 280 characters ideally (hard max: 800 chars)
- Vary the style across the 5 replies
- Do NOT start with "Great tweet!" or generic openers

For each reply include:
- text: the reply text
- style: one-word style label (e.g., "insightful", "witty", "empathetic", "provocative", "analytical")`;

    const { object, usage } = await generateObject({
      model,
      schema: repliesSchema,
      prompt,
    });

    await recordAiUsage(
      session.user.id,
      "reply_generator",
      usage?.totalTokens ?? 0,
      prompt,
      object,
      userLanguage
    );

    // Moderation check on generated replies
    const modResult = await checkModeration(object.replies.map((r) => r.text).join("\n"));
    if (modResult) return modResult;

    const sanitized = {
      tweetText,
      tweetAuthor,
      replies: object.replies.map((r) => ({
        ...r,
        text: r.text.length > 1000 ? r.text.slice(0, 997) + "..." : r.text,
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
