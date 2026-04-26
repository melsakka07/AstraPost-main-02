import { generateObject } from "ai";
import { z } from "zod";
import { getArabicInstructions, getArabicToneGuidance } from "@/lib/ai/arabic-prompt";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM, TONE_ENUM } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { checkContentCalendarAccessDetailed } from "@/lib/middleware/require-plan";
import { recordAiUsage } from "@/lib/services/ai-quota";

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
  tone: z.string(),
  brief: z.string(),
});

const calendarSchema = z.object({
  items: z.array(calendarItemSchema),
});

export async function POST(req: Request) {
  try {
    const correlationId = getCorrelationId(req);
    const preamble = await aiPreamble({ featureGate: checkContentCalendarAccessDetailed });
    if (preamble instanceof Response) return preamble;
    const { session, dbUser, model } = preamble;

    const json = await req.json();
    const result = requestSchema.safeParse(json);
    if (!result.success) {
      return ApiError.badRequest(result.error.issues);
    }

    const { niche, language: clientLanguage, postsPerWeek, weeks, tone } = result.data;

    // Get language: prefer client-sent language, fall back to user's DB preference
    const userLanguage = clientLanguage || dbUser.language || "en";
    const totalPosts = postsPerWeek * weeks;

    const langInstruction = getArabicInstructions(userLanguage);
    const toneGuidance =
      userLanguage === "ar" ? getArabicToneGuidance(tone) : `Default tone: ${tone}.`;

    const prompt = `You are a social media strategist for X (Twitter).
Create a content calendar for ${weeks} week(s) with ${postsPerWeek} posts per week (${totalPosts} total) for a creator in the "${niche}" niche.
${langInstruction} ${toneGuidance}

For each post return:
- day: day of week (Monday, Tuesday, etc.)
- time: suggested posting time in Arabia Standard Time (e.g., "9:00 AM AST")
- topic: specific topic or angle (1 sentence, be concrete)
- tweetType: one of tweet / thread / poll / question
- tone: the tone for that specific post
- brief: 1–2 sentence content brief describing exactly what to write

Vary tweetType and tone across the calendar. Prioritize high-engagement times (Sun-Wed mornings 7-10am AST for Arabic audiences).
Return exactly ${totalPosts} items.`;

    const { object, usage } = await generateObject({
      model,
      schema: calendarSchema,
      prompt,
    });

    await recordAiUsage(
      session.user.id,
      "content_calendar",
      usage?.totalTokens ?? 0,
      prompt,
      object,
      userLanguage
    );

    const res = Response.json(object);
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("calendar_generation_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to generate calendar");
  }
}
