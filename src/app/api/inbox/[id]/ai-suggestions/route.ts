import * as Sentry from "@sentry/nextjs";
import { generateObject } from "ai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getArabicInstructions } from "@/lib/ai/arabic-prompt";
import { wrapUntrusted } from "@/lib/ai/untrusted";
import { buildVoiceInstructions } from "@/lib/ai/voice-profile";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkReplyGeneratorAccessDetailed } from "@/lib/middleware/require-plan";
import { inboxItems } from "@/lib/schema";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";

const repliesSchema = z.object({
  replies: z
    .array(
      z.object({
        text: z.string().max(1100),
        type: z.enum(["agree", "counter", "funny"]),
      })
    )
    .length(3),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let releaseQuota: () => Promise<void> = async () => {};
  const correlationId = getCorrelationId(req);
  let userId: string | undefined;

  try {
    // 1. AI preamble — handles session, plan gate (Pro-gated reply generator),
    //    rate-limit, and quota consumption in one call.
    const preamble = await aiPreamble({
      featureGate: checkReplyGeneratorAccessDetailed,
      quotaWeight: 1,
    });
    if (preamble instanceof Response) return preamble;

    const {
      session,
      dbUser,
      model,
      releaseQuota: preambleReleaseQuota,
      checkModeration,
    } = preamble;
    releaseQuota = preambleReleaseQuota ?? releaseQuota;
    userId = session.user.id;

    // 2. Parse the inbox item ID from dynamic route params
    const { id } = await params;

    // 3. Load the inbox item — verify it belongs to the user
    const [item] = await db
      .select({
        sourceText: inboxItems.sourceText,
        sourceAuthorHandle: inboxItems.sourceAuthorHandle,
        yourTweetText: inboxItems.yourTweetText,
      })
      .from(inboxItems)
      .where(and(eq(inboxItems.id, id), eq(inboxItems.userId, userId)));

    if (!item) {
      await releaseQuota();
      return ApiError.notFound("Inbox item");
    }

    const { sourceText, sourceAuthorHandle, yourTweetText } = item;

    // 4. Build voice profile instructions
    const voiceProfile = dbUser.voiceProfile ?? null;
    const voiceVariant = dbUser.voiceVariant ?? "default";
    const voiceInstructions = buildVoiceInstructions(voiceProfile, voiceVariant);
    const voiceProfileUsed = voiceInstructions.length > 0;

    // 5. Language: prefer user's DB preference
    const userLanguage = dbUser.language ?? "en";
    const langInstruction = getArabicInstructions(userLanguage);

    // 6. Construct the system prompt
    const system = `You are an expert social media engagement writer.
${langInstruction}

${voiceInstructions}

You are crafting replies to @${sourceAuthorHandle} who said:
${wrapUntrusted("ENGAGEMENT TEXT", sourceText, 2_000)}
${yourTweetText ? `\nThey are replying to your tweet:\n${wrapUntrusted("YOUR TWEET", yourTweetText, 2_000)}` : ""}

Reply types (generate exactly one of each):
- agree: amplify and support the original engagement, showing alignment and building rapport
- counter: respectfully challenge or offer an alternative perspective, sparking thoughtful discussion
- funny: be witty, humorous, or playfully engaging without being dismissive

Requirements:
- Each reply must be genuinely engaging and contextually relevant to what @${sourceAuthorHandle} said
- Keep replies under 280 characters ideally (hard max: 800 chars)
- Do NOT start with "Great tweet!" or generic openers
- Adapt to the context: if the engagement is a reply to your tweet, acknowledge that connection naturally

For each reply include:
- text: the reply text
- type: one of "agree", "counter", or "funny" (exactly one each across the 3 replies)`;

    const prompt = `Generate exactly 3 replies to @${sourceAuthorHandle}'s engagement.`;

    // 7. Call OpenRouter via the model from preamble
    const modelId = process.env.OPENROUTER_MODEL!;

    const t0 = performance.now();
    const { object, usage } = await generateObject({
      model,
      schema: repliesSchema,
      system,
      prompt,
    });
    const latencyMs = Math.round(performance.now() - t0);

    // 8. Record AI usage for billing — type "reply_generator" with subFeature "inbox_reply"
    await recordAiUsage({
      userId: session.user.id,
      type: "reply_generator",
      model: modelId,
      subFeature: "inbox_reply",
      tokensIn: usage?.inputTokens ?? 0,
      tokensOut: usage?.outputTokens ?? 0,
      costEstimateCents: estimateCost(modelId, usage?.inputTokens ?? 0, usage?.outputTokens ?? 0),
      promptVersion: "inbox_reply:v1",
      latencyMs,
      fallbackUsed: false,
      inputPrompt: JSON.stringify({ system, prompt }),
      outputContent: object,
      language: userLanguage,
    });

    // 9. Moderation check on generated replies
    const modResult = await checkModeration(object.replies.map((r) => r.text).join("\n"));
    if (modResult) {
      await releaseQuota();
      return modResult;
    }

    // 10. Return sanitized suggestions
    const suggestions = object.replies.map((r) => ({
      text: r.text.length > 1000 ? r.text.slice(0, 997) + "..." : r.text,
      type: r.type,
    }));

    const res = Response.json({ suggestions, voiceProfileUsed });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    await releaseQuota();
    logger.error("ai_stream_failed", {
      route: "inbox-ai-suggestions",
      userId,
      correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
    Sentry.captureException(error, {
      tags: { route: "inbox-ai-suggestions", userId, correlationId },
    });
    return ApiError.internal("Failed to generate reply suggestions");
  }
}
