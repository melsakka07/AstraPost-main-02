import { headers } from "next/headers";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getArabicInstructions } from "@/lib/ai/arabic-prompt";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { LANGUAGE_ENUM } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkBioOptimizerAccessDetailed } from "@/lib/middleware/require-plan";
import { xAccounts } from "@/lib/schema";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";

const requestSchema = z.object({
  currentBio: z.string().max(500).optional().default(""),
  goal: z
    .enum(["gain_followers", "attract_clients", "build_authority", "general"])
    .default("general"),
  language: LANGUAGE_ENUM.default("en"),
  niche: z.string().max(100).optional().default(""),
});

const bioSchema = z.object({
  variants: z.array(
    z.object({
      text: z.string().max(160),
      goal: z.string(),
      rationale: z.string().max(300),
    })
  ),
});

const GOAL_LABELS: Record<string, string> = {
  gain_followers: "attract more followers in your niche",
  attract_clients: "attract potential clients or customers",
  build_authority: "establish thought leadership and credibility",
  general: "optimize for engagement and discoverability",
};

export async function GET(_req: Request) {
  // Returns the connected account's username for display
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return ApiError.unauthorized();

    const account = await db.query.xAccounts.findFirst({
      where: eq(xAccounts.userId, session.user.id),
      columns: { xUsername: true },
    });

    return Response.json({
      username: account?.xUsername ?? "",
    });
  } catch (error) {
    logger.error("bio_fetch_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to fetch account");
  }
}

export async function POST(req: Request) {
  try {
    const correlationId = getCorrelationId(req);
    const preamble = await aiPreamble({ featureGate: checkBioOptimizerAccessDetailed });
    if (preamble instanceof Response) return preamble;
    const { session, dbUser, model, checkModeration } = preamble;

    const json = await req.json();
    const result = requestSchema.safeParse(json);
    if (!result.success) {
      return ApiError.badRequest(result.error.issues);
    }

    const { currentBio, goal, language: clientLanguage, niche } = result.data;

    // Get language: prefer client-sent language, fall back to user's DB preference
    const userLanguage = clientLanguage || dbUser.language || "en";
    const goalLabel = GOAL_LABELS[goal] || GOAL_LABELS.general;

    const currentBioSection = currentBio
      ? `\nCURRENT BIO: "${currentBio}"`
      : "\nNo existing bio provided.";

    const nicheSection = niche ? `\nNICHE: ${niche}` : "";

    const prompt = `You are an expert X (Twitter) profile strategist.
Generate exactly 3 improved bio variants for a content creator.
${currentBioSection}${nicheSection}

GOAL: ${goalLabel}
${getArabicInstructions(userLanguage)}

Rules:
- Each bio MUST be under 160 characters (X's limit)
- Be concise, specific, and compelling
- Use the specified language
- Avoid generic buzzwords like "passionate" or "guru"
- Include relevant keywords for discoverability
- Each variant should have a distinct approach

For each variant provide:
- text: the bio text (max 160 chars)
- goal: a short label for this variant's strategy (e.g., "Authority-focused", "Client-attraction", "Personality-driven")
- rationale: why this version works (under 300 chars)`;

    const modelId = process.env.OPENROUTER_MODEL!;

    let object, usage;
    let fallbackUsed = false;
    const t0 = performance.now();
    try {
      const gen = await generateObject({
        model,
        schema: bioSchema,
        prompt,
      });
      object = gen.object;
      usage = gen.usage;
    } catch (err: any) {
      if (err?.statusCode === 429 && preamble.fallbackModel) {
        logger.warn("ai_primary_model_rate_limited", { fallback: true, userId: session.user.id });
        fallbackUsed = true;
        const gen = await generateObject({
          model: preamble.fallbackModel,
          schema: bioSchema,
          prompt,
        });
        object = gen.object;
        usage = gen.usage;
      } else {
        throw err;
      }
    }
    const latencyMs = Math.round(performance.now() - t0);

    // Moderation check on generated bio variants
    const modResult = await checkModeration(object.variants.map((v) => v.text).join("\n"));
    if (modResult) return modResult;

    // Phase 2: uses new options-object signature
    await recordAiUsage({
      userId: session.user.id,
      type: "bio_optimizer",
      model: modelId,
      subFeature: "bio.generate",
      tokensIn: usage?.inputTokens ?? 0,
      tokensOut: usage?.outputTokens ?? 0,
      costEstimateCents: estimateCost(modelId, usage?.inputTokens ?? 0, usage?.outputTokens ?? 0),
      promptVersion: "bio:v1",
      latencyMs,
      fallbackUsed,
      inputPrompt: prompt,
      outputContent: object,
      language: userLanguage,
    });

    const res = Response.json(object);
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("bio_generation_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to generate bio variants");
  }
}
