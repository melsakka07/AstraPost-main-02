import { streamText } from "ai";
import { z } from "zod";
import {
  getTemplatePrompt,
  makeTweetDelimiter,
  VERSION,
  type OutputFormat,
} from "@/lib/ai/template-prompts";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM, TONE_ENUM } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";

// Re-export for frontend backwards compatibility
export {
  LEGACY_TWEET_DELIMITER as TWEET_DELIMITER,
  makeTweetDelimiter,
} from "@/lib/ai/template-prompts";

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

    // Per-request nonce for delimiter hardening
    const nonce = crypto.randomUUID();
    const delimiter = makeTweetDelimiter(nonce);
    const prompt = config.buildPrompt(topic, tone, userLanguage, format, nonce);

    const modelId = process.env.OPENROUTER_MODEL!;
    const t0 = performance.now();
    const streamResult = streamText({ model, prompt });

    const encoder = new TextEncoder();
    const userId = session.user.id;
    let buffer = "";
    let tweetIndex = 0;
    const tweetTexts: string[] = []; // Accumulate for moderation

    const sseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResult.textStream) {
            buffer += chunk;

            let delimIdx: number;
            while ((delimIdx = buffer.indexOf(delimiter)) !== -1) {
              const tweetText = buffer.slice(0, delimIdx).trim();
              buffer = buffer.slice(delimIdx + delimiter.length);

              if (tweetText.length > 0) {
                tweetTexts.push(tweetText);
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
            tweetTexts.push(remaining);
            const content = remaining.length > 1000 ? remaining.slice(0, 997) + "..." : remaining;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ index: tweetIndex, tweet: content })}\n\n`)
            );
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
              inputPrompt: prompt,
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
