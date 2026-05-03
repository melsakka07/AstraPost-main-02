import "server-only";

import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sanitizeForPrompt } from "@/lib/ai/voice-profile";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { aiGenerations } from "@/lib/schema";

const refineRequestSchema = z.object({
  generationId: z.string().min(1, "generationId is required"),
  feedback: z.string().min(1, "feedback is required").max(2000),
  focus: z.enum(["tone", "length", "hook", "hashtags"]).optional(),
});

const refineResponseSchema = z.object({
  output: z.string(),
});

const FOCUS_INSTRUCTIONS: Record<string, string> = {
  tone: "Focus ONLY on adjusting the tone/voice of the output. Do not change the content or length.",
  length:
    "Focus ONLY on adjusting the length of the output. Make it shorter or longer as the feedback implies. Keep the content and tone the same.",
  hook: "Focus ONLY on improving the hook/opening. Make it more attention-grabbing. Keep everything else the same.",
  hashtags:
    "Focus ONLY on improving the hashtag selection. Choose more relevant or trending hashtags. Keep the content unchanged.",
};

export async function POST(req: Request) {
  try {
    // Step 1: Correlation ID
    const correlationId = getCorrelationId(req);

    logger.info("ai.refine_request", { correlationId });

    // Step 2: AI Preamble — refinement costs 1 quota unit (cheaper than fresh gen)
    const preamble = await aiPreamble({ quotaWeight: 1 });
    if (preamble instanceof Response) return preamble;
    const { session, model, checkModeration } = preamble;

    // Step 3: Parse + validate body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return ApiError.badRequest("Invalid JSON body");
    }

    const parsed = refineRequestSchema.safeParse(body);
    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    const { generationId, feedback, focus } = parsed.data;

    // Step 4: Load original generation + ownership check
    const generation = await db.query.aiGenerations.findFirst({
      where: eq(aiGenerations.id, generationId),
      columns: {
        id: true,
        userId: true,
        inputPrompt: true,
        outputContent: true,
        type: true,
        language: true,
      },
    });

    if (!generation) {
      return ApiError.notFound("Generation");
    }

    if (generation.userId !== session.user.id) {
      return ApiError.forbidden("This generation does not belong to your account");
    }

    if (!generation.outputContent) {
      return ApiError.badRequest(
        "This generation has no output to refine. Please regenerate first."
      );
    }

    // Step 5: Build the refinement prompt
    const originalRequest = generation.inputPrompt ?? "No original request recorded.";
    const originalOutput =
      typeof generation.outputContent === "string"
        ? generation.outputContent
        : JSON.stringify(generation.outputContent, null, 2);

    const focusInstruction = focus ? `\n\nFOCUS AREA: ${FOCUS_INSTRUCTIONS[focus]}` : "";
    const sanitizedFeedback = sanitizeForPrompt(feedback, 2000);

    const prompt = `You are an expert content refiner. Your task is to revise AI-generated content based on user feedback.

Here is the original request:
---
${originalRequest}
---

Here is the generated output:
---
${originalOutput}
---

Here is the user's feedback:
---
${sanitizedFeedback}
---${focusInstruction}

CRITICAL RULES:
- Change ONLY what the feedback addresses. Keep everything else the same.
- Preserve the original structure, language, and formatting.
- If the feedback asks for a specific change, make that change precisely.
- Do NOT add new content that wasn't requested.
- Do NOT remove or alter content the feedback didn't mention.
- Return the FULL revised output — not just the changed parts.`;

    // Step 6: Run the refinement generation
    const t0 = performance.now();
    const { object, usage } = await generateObject({
      model,
      schema: refineResponseSchema,
      prompt,
    });
    const latencyMs = Math.round(performance.now() - t0);

    // Step 7: Moderation check
    const modResult = await checkModeration(object.output);
    if (modResult) return modResult;

    // Step 8: Log telemetry via preamble's recordTelemetry (does NOT consume quota)
    await preamble.recordTelemetry({
      tokensIn: usage?.inputTokens ?? 0,
      tokensOut: usage?.outputTokens ?? 0,
      subFeature: "refine",
      latencyMs,
      inputPrompt: prompt,
      outputContent: object,
      ...(generation.language != null ? { language: generation.language } : {}),
    });

    logger.info("ai.refine_completed", {
      correlationId,
      generationId,
      userId: session.user.id,
      focus: focus ?? null,
      tokensIn: usage?.inputTokens ?? 0,
      tokensOut: usage?.outputTokens ?? 0,
      latencyMs,
    });

    // Step 9: Return refined output
    const res = Response.json(object);
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("ai.refine_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : "Refinement failed";
    return ApiError.serviceUnavailable(message);
  }
}
