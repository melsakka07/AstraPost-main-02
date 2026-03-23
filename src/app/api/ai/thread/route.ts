import { headers } from "next/headers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { buildVoiceInstructions } from "@/lib/ai/voice-profile";
import { auth } from "@/lib/auth";
import { LANGUAGES } from "@/lib/constants";
import { db } from "@/lib/db";
import { checkAiLimitDetailed, checkAiQuotaDetailed, createPlanLimitResponse } from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";
import { recordAiUsage } from "@/lib/services/ai-quota";

// Delimiter used to separate tweets in the streamed AI output
const TWEET_DELIMITER = "===TWEET===";

const threadRequestSchema = z.object({
  topic: z.string().min(1).max(500),
  tone: z.enum(["professional", "casual", "educational", "inspirational", "humorous", "viral", "controversial"]).default("professional"),
  tweetCount: z.number().min(3).max(15).optional().default(5),
  language: z.enum(["ar", "en", "fr", "de", "es", "it", "pt", "tr", "ru", "hi"]).optional().default("en"),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { plan: true, voiceProfile: true },
    });

    const rlResult = await checkRateLimit(session.user.id, dbUser?.plan || "free", "ai");
    if (!rlResult.success) return createRateLimitResponse(rlResult);

    const aiAccess = await checkAiLimitDetailed(session.user.id);
    if (!aiAccess.allowed) return createPlanLimitResponse(aiAccess);

    const aiQuota = await checkAiQuotaDetailed(session.user.id);
    if (!aiQuota.allowed) return createPlanLimitResponse(aiQuota);

    const json = await req.json();
    const parsed = threadRequestSchema.safeParse(json);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: parsed.error }), { status: 400 });
    }

    const { topic, tone, tweetCount, language } = parsed.data;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI Service not configured" }), { status: 500 });
    }

    const openrouter = createOpenRouter({ apiKey });
    const model = openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4o");

    const voiceInstructions = buildVoiceInstructions(dbUser?.voiceProfile);

    const prompt = `You are an expert social media content writer for X (Twitter).
Write exactly ${tweetCount} tweets about "${topic}".
Tone: ${tone}.
Language: ${LANGUAGES.find((l) => l.code === language)?.label || "English"}.
${voiceInstructions}

Requirements:
- Each tweet MUST be strictly under 800 characters. Count carefully — this is a hard limit.
- Do not include numbering (1/5, etc) in the tweet text.
- Make tweets engaging and viral-worthy.
- Ensure correct grammar and modern style.

Format: Output each tweet as plain text. Separate tweets with this exact delimiter on its own line:
${TWEET_DELIMITER}

Example format:
First tweet content goes here.
${TWEET_DELIMITER}
Second tweet content goes here.
${TWEET_DELIMITER}
Third tweet content goes here.

Output exactly ${tweetCount} tweets. No headers, explanations, or extra text.`;

    const streamResult = streamText({ model, prompt });

    const encoder = new TextEncoder();
    const userId = session.user.id;
    let buffer = "";
    let tweetIndex = 0;

    const sseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResult.textStream) {
            buffer += chunk;

            // Emit each completed tweet as soon as we see the delimiter
            let delimIdx: number;
            while ((delimIdx = buffer.indexOf(TWEET_DELIMITER)) !== -1) {
              const tweetText = buffer.slice(0, delimIdx).trim();
              buffer = buffer.slice(delimIdx + TWEET_DELIMITER.length);

              if (tweetText.length > 0) {
                const content = tweetText.length > 1000 ? tweetText.slice(0, 997) + "..." : tweetText;
                const event = JSON.stringify({ index: tweetIndex, tweet: content });
                controller.enqueue(encoder.encode(`data: ${event}\n\n`));
                tweetIndex++;
              }
            }
          }

          // Flush the last tweet (no trailing delimiter)
          const remaining = buffer.trim();
          if (remaining.length > 0) {
            const content = remaining.length > 1000 ? remaining.slice(0, 997) + "..." : remaining;
            const event = JSON.stringify({ index: tweetIndex, tweet: content });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          }

          // Signal completion to the client before recording usage
          controller.enqueue(encoder.encode(`data: {"done":true}\n\n`));

          // Record AI usage (non-critical — fire after responding)
          try {
            const usage = await streamResult.usage;
            await recordAiUsage(userId, "thread", usage?.totalTokens ?? 0, prompt, null, language);
          } catch {
            // Usage recording failure should not affect the user
          }

          controller.close();
        } catch {
          const errEvent = JSON.stringify({ error: "Generation failed" });
          controller.enqueue(encoder.encode(`data: ${errEvent}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("AI Thread Streaming Error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate thread" }), { status: 500 });
  }
}
