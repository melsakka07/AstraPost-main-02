import { streamObject } from "ai";
import { z } from "zod";
import { getTemplatePrompt, VERSION, type OutputFormat } from "@/lib/ai/template-prompts";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM, TONE_ENUM } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";

const OUTPUT_FORMAT_ENUM = z.enum(["single", "thread-short", "thread-long"]);

const requestSchema = z.object({
  templateId: z.string().min(1),
  topic: z.string().min(3, "Topic must be at least 3 characters").max(500),
  tone: TONE_ENUM.optional(),
  language: LANGUAGE_ENUM.optional().default("en"),
  outputFormat: OUTPUT_FORMAT_ENUM.optional(),
});

const ThreadSchema = z.object({
  tweets: z
    .array(z.object({ text: z.string().max(280) }))
    .min(1)
    .max(25),
});

export async function POST(req: Request) {
  try {
    const correlationId = getCorrelationId(req);
    const preamble = await aiPreamble();
    if (preamble instanceof Response) return preamble;
    const { session, dbUser, model, checkModeration } = preamble;

    const json = await req.json();
    const parsed = requestSchema.safeParse(json);

    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    const { templateId, topic, language: clientLanguage } = parsed.data;

    // Get language: prefer client-sent language, fall back to user's DB preference
    const userLanguage = clientLanguage || dbUser.language || "en";

    const config = getTemplatePrompt(templateId);
    if (!config) {
      return ApiError.badRequest(`Unknown template: ${templateId}`);
    }

    const tone = parsed.data.tone ?? config.defaultTone;
    const format: OutputFormat = parsed.data.outputFormat ?? config.defaultFormat;

    const { system, messages } = config.buildPrompt(topic, tone, userLanguage, format);

    const modelId = process.env.OPENROUTER_MODEL!;
    const t0 = performance.now();
    const streamResult = streamObject({
      model,
      system,
      messages,
      schema: ThreadSchema,
    });

    const encoder = new TextEncoder();
    const userId = session.user.id;
    const tweetTexts: string[] = []; // Accumulate for moderation
    let lastEmittedIndex = -1;

    const sseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const partial of streamResult.partialObjectStream) {
            const tweets = partial.tweets ?? [];

            // Emit any newly completed tweets
            for (let i = lastEmittedIndex + 1; i < tweets.length; i++) {
              const tweetText = tweets[i]?.text;
              if (tweetText && tweetText.length > 0) {
                tweetTexts.push(tweetText);
                const content =
                  tweetText.length > 1000 ? tweetText.slice(0, 997) + "..." : tweetText;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ index: i, tweet: content })}\n\n`)
                );
                lastEmittedIndex = i;
              }
            }
          }

          // Wait for the final validated object and emit any remaining tweets
          const finalObject = await streamResult.object;
          const finalTweets = finalObject.tweets ?? [];

          for (let i = lastEmittedIndex + 1; i < finalTweets.length; i++) {
            const tweetText = finalTweets[i]?.text;
            if (tweetText && tweetText.length > 0) {
              tweetTexts.push(tweetText);
              const content = tweetText.length > 1000 ? tweetText.slice(0, 997) + "..." : tweetText;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ index: i, tweet: content })}\n\n`)
              );
            }
          }

          // Phase 1 moderation: check the full generated text at end of stream
          const fullText = tweetTexts.join("\n");
          const modResult = await checkModeration(fullText);
          if (modResult) {
            logger.warn("moderation_flagged_stream", {
              userId,
              correlationId,
              mode: "template",
              textLength: fullText.length,
              tweetCount: tweetTexts.length,
            });
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ moderation_flagged: true, message: "Content moderated — please rephrase your request" })}\n\n`
              )
            );
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));

          // Record usage — non-critical, fire after responding
          try {
            const usage = await streamResult.usage;
            const latency = Math.round(performance.now() - t0);
            // Phase 2: uses new options-object signature
            await recordAiUsage({
              userId,
              type: "template",
              model: modelId,
              subFeature: "template.generate",
              tokensIn: usage?.inputTokens ?? 0,
              tokensOut: usage?.outputTokens ?? 0,
              costEstimateCents: estimateCost(
                modelId,
                usage?.inputTokens ?? 0,
                usage?.outputTokens ?? 0
              ),
              promptVersion: VERSION,
              latencyMs: latency,
              fallbackUsed: false,
              inputPrompt: `${system}\n\n${messages.map((m) => m.content).join("\n\n")}`,
              outputContent: null,
              language: userLanguage,
            });
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
        "x-correlation-id": correlationId,
      },
    });
  } catch (error) {
    logger.error("ai_template_generate_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to generate template content");
  }
}
