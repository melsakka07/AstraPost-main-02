import { headers } from "next/headers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject, type LanguageModel } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { voiceProfileSchema as vpSchema } from "@/lib/ai/voice-profile";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkAiLimitDetailed, createPlanLimitResponse } from "@/lib/middleware/require-plan";
import { user } from "@/lib/schema";
import { recordAiUsage } from "@/lib/services/ai-quota";

const analyzeRequestSchema = z.object({
  // Cap each tweet sample to prevent prompt-stuffing via the analysis endpoint.
  // 560 chars = 2× max tweet length; generous enough for threads while
  // preventing multi-KB injection payloads from reaching the LLM prompt.
  tweets: z.array(z.string().min(10).max(560)).min(3).max(10),
});

const voiceProfileSchema = z.object({
  tone: z
    .string()
    .describe("The general emotional tone (e.g., sarcastic, professional, enthusiastic)"),
  styleKeywords: z.array(z.string()).describe("3-5 keywords describing the writing style"),
  emojiUsage: z.string().describe("How emojis are used (frequency, placement, types)"),
  sentenceStructure: z.string().describe("Analysis of sentence length and variety"),
  vocabularyLevel: z.string().describe("Complexity of words used"),
  formattingHabits: z.string().describe("Use of line breaks, lists, or special characters"),
  doAndDonts: z.array(z.string()).describe("3-5 rules to mimic this style"),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return ApiError.unauthorized();
    }

    // Analyzing voice is a Pro feature
    const aiAccess = await checkAiLimitDetailed(session.user.id);
    if (!aiAccess.allowed && aiAccess.plan === "free") {
      // Voice profile creation is strictly Pro
      return createPlanLimitResponse({
        allowed: false,
        error: "upgrade_required",
        message: "Voice Profile is a Pro feature",
        feature: "voice_profile",
        plan: "free",
        limit: 0,
        used: 1,
        suggestedPlan: "pro_monthly",
        trialActive: false,
        resetAt: null,
      });
    }

    const json = await req.json();
    const result = analyzeRequestSchema.safeParse(json);

    if (!result.success) {
      return ApiError.badRequest(result.error.issues);
    }

    const { tweets } = result.data;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return ApiError.internal("AI Service not configured");
    }

    const openrouter = createOpenRouter({ apiKey });
    const model = openrouter(process.env.OPENROUTER_MODEL!, {
      provider: { data_collection: "deny" as const },
    }) as unknown as LanguageModel;

    const prompt = `
      You are an expert linguistic analyst.
      Analyze the following sample tweets to create a comprehensive "Voice Profile" that captures the user's unique writing style.
      
      Sample Tweets:
      ${tweets.map((t, i) => `${i + 1}. "${t}"`).join("\n")}
      
      Your goal is to extract specific patterns so another AI can perfectly mimic this user.
      Focus on:
      - Tone (e.g., authoritative vs. humble)
      - Structure (e.g., short punchy sentences vs. flowery prose)
      - Formatting (e.g., heavy use of line breaks, lowercase only)
      - Vocabulary (e.g., technical jargon vs. simple English)
    `;

    const { object } = await generateObject({
      model,
      schema: voiceProfileSchema,
      prompt,
    });

    // Re-validate the AI output against our strict application schema before
    // persisting. generateObject constrains the shape but does not enforce our
    // field-length limits; a model that ignores length hints could still return
    // oversized strings that later cause prompt injection when interpolated.
    const validated = vpSchema.safeParse(object);
    if (!validated.success) {
      return ApiError.internal("AI returned an invalid voice profile shape");
    }

    // Save to DB
    await db.update(user).set({ voiceProfile: validated.data }).where(eq(user.id, session.user.id));

    // Record AI usage
    await recordAiUsage(
      session.user.id,
      "voice_profile",
      0,
      `voice-profile:${tweets.length}-tweets`,
      validated.data,
      "en"
    );

    return Response.json(object);
  } catch (error) {
    logger.error("Voice Profile Analysis Error:", { error });
    return ApiError.internal("Failed to analyze voice profile");
  }
}

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return ApiError.unauthorized();
    }

    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { voiceProfile: true },
    });

    return Response.json({ voiceProfile: dbUser?.voiceProfile || null });
  } catch (error) {
    logger.error("Voice Profile Fetch Error:", { error });
    return ApiError.internal("Failed to fetch voice profile");
  }
}

export async function DELETE() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return ApiError.unauthorized();
    }

    await db.update(user).set({ voiceProfile: null }).where(eq(user.id, session.user.id));

    return Response.json({ success: true });
  } catch (error) {
    logger.error("Voice Profile Delete Error:", { error });
    return ApiError.internal("Failed to delete voice profile");
  }
}
