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
  checkReplyGeneratorAccessDetailed,
  createPlanLimitResponse,
} from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";
import { recordAiUsage } from "@/lib/services/ai-quota";
import { importTweet } from "@/lib/services/tweet-importer";

const requestSchema = z.object({
  tweetUrl: z.string().url(),
  language: z.enum(["ar", "en", "fr", "de", "es", "it", "pt", "tr", "ru", "hi"]).default("en"),
  tone: z
    .enum(["professional", "casual", "educational", "inspirational", "humorous"])
    .default("casual"),
  goal: z.enum(["agree", "add", "counter", "funny", "question"]).default("add"),
});

const repliesSchema = z.object({
  replies: z.array(
    z.object({
      text: z.string().max(1100),
      style: z.string().max(100),
    })
  ).min(3).max(5),
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
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return new Response("Unauthorized", { status: 401 });

    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { plan: true },
    });

    const rlResult = await checkRateLimit(session.user.id, dbUser?.plan || "free", "ai");
    if (!rlResult.success) return createRateLimitResponse(rlResult);

    const access = await checkReplyGeneratorAccessDetailed(session.user.id);
    if (!access.allowed) return createPlanLimitResponse(access);

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

    const { tweetUrl, language, tone, goal } = result.data;

    // Fetch the target tweet
    let tweetText = "";
    let tweetAuthor = "";
    const context = await importTweet(tweetUrl);
    if ("error" in context) {
      return new Response(
        JSON.stringify({
          error: "Could not fetch the tweet. Make sure the URL is valid and the account is public.",
        }),
        { status: 422 }
      );
    }
    tweetText = context.originalTweet.text;
    tweetAuthor = `@${context.originalTweet.author.username}`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500 });
    }

    const openrouter = createOpenRouter({ apiKey });
    const model = openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4o");
    const langLabel = LANGUAGES.find((l) => l.code === language)?.label || "English";
    const goalLabel = GOAL_LABELS[goal] || "add value";

    const prompt = `You are an expert social media engagement writer.
Generate 5 high-quality replies to the following tweet from ${tweetAuthor}.

ORIGINAL TWEET:
"${tweetText}"

Requirements:
- Language: ${langLabel}
- Tone: ${tone}
- Goal: ${goalLabel}
- Each reply should be genuinely engaging and contextually relevant
- Keep replies under 280 characters ideally (hard max: 800 chars)
- Vary the style across the 5 replies
- Do NOT start with "Great tweet!" or generic openers
- Be culturally appropriate for Arabic/MENA audiences if language is Arabic

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
      language
    );

    const sanitized = {
      tweetText,
      tweetAuthor,
      replies: object.replies.map((r) => ({
        ...r,
        text: r.text.length > 1000 ? r.text.slice(0, 997) + "..." : r.text,
      })),
    };

    return Response.json(sanitized);
  } catch (error) {
    console.error("Reply generation error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate replies" }), { status: 500 });
  }
}
