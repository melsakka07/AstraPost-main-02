import { headers } from "next/headers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { LANGUAGES } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  checkAiLimitDetailed,
  checkAiQuotaDetailed,
  checkContentCalendarAccessDetailed,
  createPlanLimitResponse,
} from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";
import { recordAiUsage } from "@/lib/services/ai-quota";

const requestSchema = z.object({
  niche: z.string().min(1).max(300),
  language: z.enum(["ar", "en", "fr", "de", "es", "it", "pt", "tr", "ru", "hi"]).default("en"),
  postsPerWeek: z.number().min(1).max(14).default(3),
  weeks: z.number().min(1).max(4).default(1),
  tone: z
    .enum(["professional", "casual", "educational", "inspirational", "humorous", "viral"])
    .default("professional"),
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
  items: z.array(calendarItemSchema).max(60),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return new Response("Unauthorized", { status: 401 });

    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { plan: true },
    });

    const rlResult = await checkRateLimit(session.user.id, dbUser?.plan || "free", "ai");
    if (!rlResult.success) return createRateLimitResponse(rlResult);

    const calendarAccess = await checkContentCalendarAccessDetailed(session.user.id);
    if (!calendarAccess.allowed) return createPlanLimitResponse(calendarAccess);

    const aiAccess = await checkAiLimitDetailed(session.user.id);
    if (!aiAccess.allowed) return createPlanLimitResponse(aiAccess);

    const aiQuota = await checkAiQuotaDetailed(session.user.id);
    if (!aiQuota.allowed) return createPlanLimitResponse(aiQuota);

    const json = await req.json();
    const result = requestSchema.safeParse(json);
    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: result.error }), {
        status: 400,
      });
    }

    const { niche, language, postsPerWeek, weeks, tone } = result.data;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500 });
    }

    const openrouter = createOpenRouter({ apiKey });
    const model = openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4o");
    const langLabel = LANGUAGES.find((l) => l.code === language)?.label || "English";

    const totalPosts = postsPerWeek * weeks;

    const prompt = `You are a social media strategist for X (Twitter).
Create a content calendar for ${weeks} week(s) with ${postsPerWeek} posts per week (${totalPosts} total) for a creator in the "${niche}" niche.
Language: ${langLabel}. Default tone: ${tone}.

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
      language
    );

    return Response.json(object);
  } catch (error) {
    console.error("Calendar generation error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate calendar" }), { status: 500 });
  }
}
