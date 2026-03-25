import { generateObject } from "ai";
import { z } from "zod";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { LANGUAGE_ENUM, LANGUAGES, TONE_ENUM } from "@/lib/constants";
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
    const preamble = await aiPreamble({ featureGate: checkReplyGeneratorAccessDetailed });
    if (preamble instanceof Response) return preamble;
    const { session, model } = preamble;

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
