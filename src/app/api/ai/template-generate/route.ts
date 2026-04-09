import { streamText } from "ai";
import { z } from "zod";
import { getTemplatePrompt, type OutputFormat } from "@/lib/ai/template-prompts";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { LANGUAGE_ENUM, TONE_ENUM, LANGUAGES } from "@/lib/constants";
import { recordAiUsage } from "@/lib/services/ai-quota";

// Re-export the delimiter so the frontend can share it
export const TWEET_DELIMITER = "===TWEET===";

const OUTPUT_FORMAT_ENUM = z.enum(["single", "thread-short", "thread-long"]);

const requestSchema = z.object({
  templateId: z.string().min(1),
  topic: z.string().min(3, "Topic must be at least 3 characters").max(500),
  tone: TONE_ENUM.optional(),
  language: LANGUAGE_ENUM.optional().default("en"),
  outputFormat: OUTPUT_FORMAT_ENUM.optional(),
});

export async function POST(req: Request) {
  try {
    const preamble = await aiPreamble();
    if (preamble instanceof Response) return preamble;
    const { session, model } = preamble;

    const json = await req.json();
    const parsed = requestSchema.safeParse(json);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: parsed.error }), {
        status: 400,
      });
    }

    const { templateId, topic, language } = parsed.data;

    const config = getTemplatePrompt(templateId);
    if (!config) {
      return new Response(JSON.stringify({ error: `Unknown template: ${templateId}` }), {
        status: 400,
      });
    }

    const tone = parsed.data.tone ?? config.defaultTone;
    const format: OutputFormat = parsed.data.outputFormat ?? config.defaultFormat;

    const prompt = config.buildPrompt(topic, tone, language, format);

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

            let delimIdx: number;
            while ((delimIdx = buffer.indexOf(TWEET_DELIMITER)) !== -1) {
              const tweetText = buffer.slice(0, delimIdx).trim();
              buffer = buffer.slice(delimIdx + TWEET_DELIMITER.length);

              if (tweetText.length > 0) {
                const content =
                  tweetText.length > 1000 ? tweetText.slice(0, 997) + "..." : tweetText;
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ index: tweetIndex, tweet: content })}\n\n`
                  )
                );
                tweetIndex++;
              }
            }
          }

          // Flush the last tweet (no trailing delimiter)
          const remaining = buffer.trim();
          if (remaining.length > 0) {
            const content = remaining.length > 1000 ? remaining.slice(0, 997) + "..." : remaining;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ index: tweetIndex, tweet: content })}\n\n`)
            );
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));

          // Record usage — non-critical, fire after responding
          try {
            const usage = await streamResult.usage;
            const langLabel = LANGUAGES.find((l) => l.code === language)?.label ?? language;
            await recordAiUsage(
              userId,
              "template",
              usage?.totalTokens ?? 0,
              prompt,
              null,
              langLabel
            );
          } catch {
            // Usage recording failure must not affect the user
          }

          controller.close();
        } catch {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("AI Template Generate Error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate template content" }), {
      status: 500,
    });
  }
}
