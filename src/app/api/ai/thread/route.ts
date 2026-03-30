import { streamText } from "ai";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getLengthPrompt, getLengthMaxChars, THREAD_MODE_PROMPT } from "@/lib/ai/length-prompts";
import { buildVoiceInstructions } from "@/lib/ai/voice-profile";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM, LANGUAGES } from "@/lib/constants";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { xAccounts } from "@/lib/schema";
import { aiLengthOptionEnum, type XSubscriptionTier } from "@/lib/schemas/common";
import { recordAiUsage } from "@/lib/services/ai-quota";
import { XApiService } from "@/lib/services/x-api";
import { canPostLongContent } from "@/lib/services/x-subscription";

// Delimiter used to separate tweets in the streamed AI output (thread mode only)
const TWEET_DELIMITER = "===TWEET===";

/** How stale the cached tier can be before we refresh inline (24 hours). */
const TIER_STALENESS_MS = 24 * 60 * 60 * 1_000;

const threadRequestSchema = z.object({
  topic: z.string().min(1).max(500),
  tone: z.enum(["professional", "casual", "educational", "inspirational", "humorous", "viral", "controversial"]).default("professional"),
  tweetCount: z.number().min(3).max(15).optional().default(5),
  language: LANGUAGE_ENUM.optional().default("en"),
  mode: z.enum(["thread", "single"]).default("thread"),
  lengthOption: aiLengthOptionEnum.default("short"),
  targetAccountId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const preamble = await aiPreamble();
    if (preamble instanceof Response) return preamble;
    const { session, dbUser, model } = preamble;

    const json = await req.json();
    const parsed = threadRequestSchema.safeParse(json);

    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    const { topic, tone, tweetCount, language, mode, lengthOption, targetAccountId } = parsed.data;

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
    const langLabel = LANGUAGES.find((l) => l.code === language)?.label || "English";

    // ── Build prompt based on mode ────────────────────────────────────────────
    let prompt: string;

    if (mode === "single") {
      const lengthGuidance = getLengthPrompt(lengthOption);
      const maxChars = getLengthMaxChars(lengthOption);

      prompt = `You are an expert social media content writer for X (Twitter).
Write exactly ONE post about "${topic}".
Tone: ${tone}.
Language: ${langLabel}.
${voiceInstructions}

${lengthGuidance}

Requirements:
- Output ONLY the post text. No headers, explanations, quotes, or extra text.
- Count characters carefully — NEVER exceed ${maxChars} characters.
- Ensure correct grammar and modern style.
- Make it engaging and optimized for the platform.`;
    } else {
      // Thread mode (existing behavior)
      prompt = `You are an expert social media content writer for X (Twitter).
Write exactly ${tweetCount} tweets about "${topic}".
Tone: ${tone}.
Language: ${langLabel}.
${voiceInstructions}

Requirements:
${THREAD_MODE_PROMPT}

Format: Output each tweet as plain text. Separate tweets with this exact delimiter on its own line:
${TWEET_DELIMITER}

Example format:
First tweet content goes here.
${TWEET_DELIMITER}
Second tweet content goes here.
${TWEET_DELIMITER}
Third tweet content goes here.

Output exactly ${tweetCount} tweets. No headers, explanations, or extra text.`;
    }

    const streamResult = streamText({ model, prompt });

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

            controller.close();

            // Record AI usage
            try {
              const usage = await streamResult.usage;
              await recordAiUsage(userId, "thread", usage?.totalTokens ?? 0, prompt, null, language);
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
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
          ...(accumulated.length > getLengthMaxChars(lengthOption)
            ? { "X-Content-Overflow": "true" }
            : {}),
        },
      });
    }

    // ── Thread mode (existing SSE streaming) ──────────────────────────────────
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
    logger.error("ai_thread_streaming_error", { error });
    return ApiError.internal("Failed to generate content");
  }
}
