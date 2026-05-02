import { streamText } from "ai";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getArabicInstructions, getArabicToneGuidance } from "@/lib/ai/arabic-prompt";
import { getLengthPrompt, getLengthMaxChars, THREAD_MODE_PROMPT } from "@/lib/ai/length-prompts";
import { JAILBREAK_GUARD, wrapUntrusted } from "@/lib/ai/untrusted";
import { buildVoiceInstructions } from "@/lib/ai/voice-profile";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { xAccounts } from "@/lib/schema";
import { aiLengthOptionEnum, type XSubscriptionTier } from "@/lib/schemas/common";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";
import { RequestDedup } from "@/lib/services/request-dedup";
import { XApiService } from "@/lib/services/x-api";
import { canPostLongContent } from "@/lib/services/x-subscription";

function makeThreadDelimiter(nonce: string): string {
  return `===TWEET-${nonce}===`;
}

/** How stale the cached tier can be before we refresh inline (24 hours). */
const TIER_STALENESS_MS = 24 * 60 * 60 * 1_000;

const threadRequestSchema = z.object({
  topic: z.string().min(1).max(500),
  hook: z.string().max(1000).optional(),
  tone: z
    .enum([
      "professional",
      "casual",
      "educational",
      "inspirational",
      "humorous",
      "viral",
      "controversial",
    ])
    .default("professional"),
  tweetCount: z.number().min(3).max(15).optional().default(5),
  language: LANGUAGE_ENUM.optional().default("en"),
  mode: z.enum(["thread", "single"]).default("thread"),
  lengthOption: aiLengthOptionEnum.default("short"),
  targetAccountId: z
    .string()
    .optional()
    .transform((v) => v?.replace(/^twitter:/, "")),
});

export async function POST(req: Request) {
  try {
    const correlationId = getCorrelationId(req);
    const preamble = await aiPreamble();
    if (preamble instanceof Response) return preamble;
    const { session, dbUser, model, checkModeration } = preamble;

    const json = await req.json();
    const parsed = threadRequestSchema.safeParse(json);

    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    const {
      topic,
      hook,
      tone,
      tweetCount,
      language: clientLanguage,
      mode,
      lengthOption,
      targetAccountId,
    } = parsed.data;

    // Get language: prefer client-sent language, fall back to user's DB preference
    const userLanguage = clientLanguage || dbUser.language || "en";
    const langInstruction = getArabicInstructions(userLanguage);
    const toneGuidance = userLanguage === "ar" ? getArabicToneGuidance(tone) : `Tone: ${tone}.`;

    const dedupKey = RequestDedup.generateKey(session.user.id, "ai_thread", {
      topic,
      hook,
      tone,
      tweetCount,
      language: userLanguage,
      mode,
      lengthOption,
      targetAccountId,
    });
    const cachedResult = await RequestDedup.check(dedupKey); // check cache
    if (cachedResult) {
      // Note: we can reconstruct a basic ai stream response if we cached the text
      // ai stream format requires specific format, but returning json works if client supports both
      // actually, AI sdk handles strings if returning Response.json is not enough.
      // We will wrap the cached text in the format expected by the client.
      // Next.js AI SDK clients expect `0:"chunk"\n` format.
      const text = cachedResult.text || "";
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(text)}\n`));
          controller.close();
        },
      });
      const response = new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
      response.headers.set("x-correlation-id", correlationId);
      return response;
    }

    // ── Tier validation for single-post mode ──────────────────────────────────
    if (mode === "single" && lengthOption !== "short" && targetAccountId) {
      const account = await db.query.xAccounts.findFirst({
        where: and(eq(xAccounts.id, targetAccountId), eq(xAccounts.userId, session.user.id)),
        columns: {
          id: true,
          xUsername: true,
          xSubscriptionTier: true,
          xSubscriptionTierUpdatedAt: true,
        },
      });

      if (!account) {
        return ApiError.notFound("X account");
      }

      let tier = account.xSubscriptionTier as XSubscriptionTier | null;

      // Staleness check — refresh if older than 24 hours
      const updatedAt = account.xSubscriptionTierUpdatedAt;
      if (!updatedAt || Date.now() - updatedAt.getTime() > TIER_STALENESS_MS) {
        try {
          const freshTier = await XApiService.fetchXSubscriptionTier(targetAccountId);
          tier = freshTier as XSubscriptionTier;
          logger.info("tier_refreshed_inline", { accountId: targetAccountId, tier: freshTier });
        } catch (err) {
          logger.warn("tier_refresh_inline_failed", {
            accountId: targetAccountId,
            error: err instanceof Error ? err.message : "Unknown",
          });
          // Fall through with cached tier — better to use stale data than block
        }
      }

      if (!canPostLongContent(tier)) {
        return ApiError.forbidden(
          "Medium and Long post options require an X Premium subscription. Your connected X account is on the Free tier."
        );
      }
    }

    const voiceInstructions = buildVoiceInstructions(dbUser?.voiceProfile);
    const wrappedVoice = voiceInstructions ? wrapUntrusted("VOICE PROFILE", voiceInstructions) : "";

    // Per-request nonce for delimiter hardening
    const delimiterNonce = crypto.randomUUID();
    const threadDelimiter = makeThreadDelimiter(delimiterNonce);

    // ── Build system + messages based on mode ───────────────────────────────────
    const systemIntro = `You are an expert social media content writer for X (Twitter).
${toneGuidance}
${langInstruction}
${wrappedVoice}

${JAILBREAK_GUARD}`;

    let system: string;
    let messages: Array<{ role: "user"; content: string }>;
    let promptSnapshot: string; // for recordAiUsage logging

    if (mode === "single") {
      const lengthGuidance = getLengthPrompt(lengthOption);
      const maxChars = getLengthMaxChars(lengthOption);

      system = systemIntro;

      const userContent = `Write exactly ONE post about the topic below.
${wrapUntrusted("TOPIC", topic)}${hook ? `${wrapUntrusted("CREATIVE DIRECTION", hook)}(Use the above as inspiration for tone and angle, but adapt freely.)\n` : ""}
${lengthGuidance}

Requirements:
- Output ONLY the post text. No headers, explanations, quotes, or extra text.
- Count characters carefully — NEVER exceed ${maxChars} characters.
- Ensure correct grammar and modern style.
- Make it engaging and optimized for the platform.`;

      messages = [{ role: "user", content: userContent }];
      promptSnapshot = `${system}\n\n${userContent}`;
    } else {
      // Thread mode (existing behavior)
      system = `${systemIntro}
${THREAD_MODE_PROMPT}`;

      const userContent = `Write exactly ${tweetCount} tweets about the topic below.
${wrapUntrusted("TOPIC", topic)}${hook ? `${wrapUntrusted("CREATIVE DIRECTION", hook)}(Use the above as inspiration for the tone and angle of the first tweet, but adapt freely.)\n` : ""}

Format: Output each tweet as plain text. Separate tweets with this exact delimiter on its own line:
${threadDelimiter}

Example format:
First tweet content goes here.
${threadDelimiter}
Second tweet content goes here.
${threadDelimiter}
Third tweet content goes here.

Output exactly ${tweetCount} tweets. No headers, explanations, or extra text.`;

      messages = [{ role: "user", content: userContent }];
      promptSnapshot = `${system}\n\n${userContent}`;
    }

    const modelId = process.env.OPENROUTER_MODEL!;
    let streamResult;
    let fallbackUsed = false;
    const t0 = performance.now();
    try {
      streamResult = streamText({ model, system, messages });
    } catch (err: any) {
      if (err?.statusCode === 429 && preamble.fallbackModel) {
        logger.warn("ai_primary_model_rate_limited", { fallback: true, userId: session.user.id });
        fallbackUsed = true;
        streamResult = streamText({ model: preamble.fallbackModel, system, messages });
      } else {
        throw err;
      }
    }

    const encoder = new TextEncoder();
    const userId = session.user.id;

    if (mode === "single") {
      // Single-post mode: stream as plain text with truncation guard
      const maxChars = getLengthMaxChars(lengthOption);
      let accumulated = "";

      const singleStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamResult.textStream) {
              accumulated += chunk;
              controller.enqueue(encoder.encode(chunk));
            }

            // Truncation guard — if AI overshot, we already streamed it but
            // at least signal the client about the overflow so the UI can
            // truncate on its end.
            if (accumulated.length > maxChars) {
              logger.warn("ai_single_post_exceeded_limit", {
                length: accumulated.length,
                max: maxChars,
                option: lengthOption,
              });
            }

            // Phase 1 moderation: buffer the full text and check at end of stream
            const modResult = await checkModeration(accumulated);
            if (modResult) {
              logger.warn("moderation_flagged_stream", {
                userId,
                correlationId,
                mode: "single",
                textLength: accumulated.length,
              });
              controller.enqueue(
                encoder.encode("\n\n[Content moderated — please rephrase your request]")
              );
            }

            controller.close();

            // Record AI usage
            try {
              const usage = await streamResult.usage;
              const latency = Math.round(performance.now() - t0);
              // Phase 2: uses new options-object signature
              await recordAiUsage({
                userId,
                type: "thread",
                model: modelId,
                subFeature: "thread.generate",
                tokensIn: usage?.inputTokens ?? 0,
                tokensOut: usage?.outputTokens ?? 0,
                costEstimateCents: estimateCost(
                  modelId,
                  usage?.inputTokens ?? 0,
                  usage?.outputTokens ?? 0
                ),
                promptVersion: "thread:v1",
                latencyMs: latency,
                fallbackUsed,
                inputPrompt: promptSnapshot,
                outputContent: null,
                language: userLanguage,
              });
            } catch {
              // Usage recording failure should not affect the user
            }
          } catch {
            controller.enqueue(encoder.encode("\n\n[Generation failed]"));
            controller.close();
          }
        },
      });

      return new Response(singleStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
          "x-correlation-id": correlationId,
          ...(accumulated.length > getLengthMaxChars(lengthOption)
            ? { "X-Content-Overflow": "true" }
            : {}),
        },
      });
    }

    // ── Thread mode (existing SSE streaming) ──────────────────────────────────
    let buffer = "";
    let tweetIndex = 0;
    const tweetTexts: string[] = []; // Accumulate for moderation

    const sseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResult.textStream) {
            buffer += chunk;

            // Emit each completed tweet as soon as we see the delimiter
            let delimIdx: number;
            while ((delimIdx = buffer.indexOf(threadDelimiter)) !== -1) {
              const tweetText = buffer.slice(0, delimIdx).trim();
              buffer = buffer.slice(delimIdx + threadDelimiter.length);

              if (tweetText.length > 0) {
                tweetTexts.push(tweetText);
                const content =
                  tweetText.length > 1000 ? tweetText.slice(0, 997) + "..." : tweetText;
                const event = JSON.stringify({ index: tweetIndex, tweet: content });
                controller.enqueue(encoder.encode(`data: ${event}\n\n`));
                tweetIndex++;
              }
            }
          }

          // Flush the last tweet (no trailing delimiter)
          const remaining = buffer.trim();
          if (remaining.length > 0) {
            tweetTexts.push(remaining);
            const content = remaining.length > 1000 ? remaining.slice(0, 997) + "..." : remaining;
            const event = JSON.stringify({ index: tweetIndex, tweet: content });
            controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          }

          // Phase 1 moderation: check the full thread text at end of stream
          const fullText = tweetTexts.join("\n");
          const modResult = await checkModeration(fullText);
          if (modResult) {
            logger.warn("moderation_flagged_stream", {
              userId,
              correlationId,
              mode: "thread",
              textLength: fullText.length,
              tweetCount: tweetTexts.length,
            });
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ moderation_flagged: true, message: "Content moderated — please rephrase your request" })}\n\n`
              )
            );
          }

          // Signal completion to the client before recording usage
          controller.enqueue(encoder.encode(`data: {"done":true}\n\n`));

          // Record AI usage (non-critical — fire after responding)
          try {
            const usage = await streamResult.usage;
            const latency = Math.round(performance.now() - t0);
            // Phase 2: uses new options-object signature
            await recordAiUsage({
              userId,
              type: "thread",
              model: modelId,
              subFeature: "thread.generate",
              tokensIn: usage?.inputTokens ?? 0,
              tokensOut: usage?.outputTokens ?? 0,
              costEstimateCents: estimateCost(
                modelId,
                usage?.inputTokens ?? 0,
                usage?.outputTokens ?? 0
              ),
              promptVersion: "thread:v1",
              latencyMs: latency,
              fallbackUsed,
              inputPrompt: promptSnapshot,
              outputContent: null,
              language: userLanguage,
            });
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
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "x-correlation-id": correlationId,
      },
    });
  } catch (error) {
    logger.error("ai_thread_streaming_error", { error });
    return ApiError.internal("Failed to generate content");
  }
}
