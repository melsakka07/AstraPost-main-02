import * as Sentry from "@sentry/nextjs";
import { generateObject } from "ai";
import { z } from "zod";
import { getArabicInstructions, getArabicToneGuidance } from "@/lib/ai/arabic-prompt";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM, TONE_ENUM } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { checkContentCalendarAccessDetailed } from "@/lib/middleware/require-plan";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";

const requestSchema = z.object({
  niche: z.string().min(1).max(300),
  language: LANGUAGE_ENUM.default("en"),
  postsPerWeek: z.number().min(1).max(14).default(3),
  weeks: z.number().min(1).max(4).default(1),
  tone: TONE_ENUM.default("professional"),
});

const calendarItemSchema = z.object({
  day: z.string(),
  time: z.string(),
  topic: z.string(),
  tweetType: z.enum(["tweet", "thread", "poll", "question"]),
  tone: TONE_ENUM,
  // Ready-to-publish post text. One entry for tweet/poll/question; multiple
  // entries (a true thread) when tweetType is "thread".
  tweets: z.array(z.string().min(1)).min(1),
});

const calendarSchema = z.object({
  items: z.array(calendarItemSchema),
});

export async function POST(req: Request) {
  let releaseQuota: () => Promise<void> = async () => {};
  const correlationId = getCorrelationId(req);
  let userId: string | undefined;

  try {
    const preamble = await aiPreamble({ featureGate: checkContentCalendarAccessDetailed });
    if (preamble instanceof Response) return preamble;
    const {
      session,
      dbUser,
      model,
      releaseQuota: preambleReleaseQuota,
      checkModeration,
    } = preamble;
    releaseQuota = preambleReleaseQuota ?? releaseQuota;
    userId = session.user.id;

    const json = await req.json();
    const result = requestSchema.safeParse(json);
    if (!result.success) {
      await releaseQuota();
      return ApiError.badRequest(result.error.issues);
    }

    const { niche, language: clientLanguage, postsPerWeek, weeks, tone } = result.data;

    // Get language: prefer client-sent language, fall back to user's DB preference
    const userLanguage = clientLanguage || dbUser.language || "en";
    const totalPosts = postsPerWeek * weeks;

    const langInstruction = getArabicInstructions(userLanguage);
    const toneGuidance =
      userLanguage === "ar" ? getArabicToneGuidance(tone) : `Default tone: ${tone}.`;

    const toneOptions = [
      "professional",
      "casual",
      "educational",
      "inspirational",
      "humorous",
      "viral",
      "controversial",
    ];
    const system = `You are a social media strategist for X (Twitter).
${langInstruction} ${toneGuidance}

For each post return:
- day: day of week (Monday, Tuesday, etc.)
- time: suggested posting time in Arabia Standard Time (e.g., "9:00 AM AST")
- topic: a short 3–6 word label naming the angle (used only as a calendar header — NOT the post itself)
- tweetType: one of tweet / thread / poll / question
- tone: MUST be one of: ${toneOptions.join(", ")}. Pick the closest match.
- tweets: an array of the ACTUAL ready-to-publish post text — write the real words exactly as they should appear when published, NOT a description or instruction. Never output meta-guidance like "Pose a question…" or "Create a thread…".
  - For tweetType tweet / poll / question: exactly ONE string, a finished post ≤280 characters.
  - For tweetType thread: 3–6 strings, each a complete standalone tweet ≤280 characters, forming one cohesive thread — a strong hook in the first tweet, one idea per tweet, a natural close in the last. Do NOT prefix with "1/", "2/" numbering; the platform threads them in order.
  Match the requested tone and language.

Vary tweetType and tone across the calendar. Prioritize high-engagement times (Sun-Wed mornings 7-10am AST for Arabic audiences).
Return exactly ${totalPosts} items.`;

    const prompt = `Create a content calendar for ${weeks} week(s) with ${postsPerWeek} posts per week (${totalPosts} total) for a creator in the "${niche}" niche.`;

    const modelId = process.env.OPENROUTER_MODEL!;

    const t0 = performance.now();
    const { object, usage } = await generateObject({
      model,
      schema: calendarSchema,
      system,
      prompt,
    });
    const latencyMs = Math.round(performance.now() - t0);

    // Moderation check on generated calendar items
    const modResult = await checkModeration(
      object.items.map((i) => `${i.topic}: ${i.tweets.join(" ")}`).join("\n")
    );
    if (modResult) {
      await releaseQuota();
      return modResult;
    }

    // Phase 2: uses new options-object signature
    await recordAiUsage({
      userId: session.user.id,
      type: "content_calendar",
      model: modelId,
      subFeature: "calendar.generate",
      tokensIn: usage?.inputTokens ?? 0,
      tokensOut: usage?.outputTokens ?? 0,
      costEstimateCents: estimateCost(modelId, usage?.inputTokens ?? 0, usage?.outputTokens ?? 0),
      promptVersion: "calendar:v3",
      latencyMs,
      fallbackUsed: false,
      inputPrompt: prompt,
      outputContent: object,
      language: userLanguage,
    });

    const res = Response.json(object);
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    await releaseQuota();
    logger.error(
      `ai_stream_failed: ${(error instanceof Error ? error.message : String(error)).slice(0, 200)}`,
      {
        route: "calendar",
        userId,
        correlationId,
      }
    );
    Sentry.captureException(error, {
      tags: { route: "calendar", userId, correlationId },
    });
    return ApiError.internal("Failed to generate calendar");
  }
}
