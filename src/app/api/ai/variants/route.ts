import { headers } from "next/headers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  checkAiLimitDetailed,
  checkAiQuotaDetailed,
  checkVariantGeneratorAccessDetailed,
  createPlanLimitResponse,
} from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";
import { recordAiUsage } from "@/lib/services/ai-quota";

const requestSchema = z.object({
  tweet: z.string().min(1).max(1000),
  language: z.enum(["ar", "en", "fr", "de", "es", "it", "pt", "tr", "ru", "hi"]).default("en"),
});

const variantSchema = z.object({
  variants: z.array(
    z.object({
      text: z.string().max(1100),
      angle: z.enum(["emotional", "factual", "question", "story", "list"]),
      rationale: z.string().max(200),
    })
  ).min(3).max(3),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return new Response("Unauthorized", { status: 401 });

    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { plan: true },
    });

    const rlResult = await checkRateLimit(session.user.id, dbUser?.plan || "free", "ai");
    if (!rlResult.success) return createRateLimitResponse(rlResult);

    const access = await checkVariantGeneratorAccessDetailed(session.user.id);
    if (!access.allowed) return createPlanLimitResponse(access);

    const aiAccess = await checkAiLimitDetailed(session.user.id);
    if (!aiAccess.allowed) return createPlanLimitResponse(aiAccess);

    const aiQuota = await checkAiQuotaDetailed(session.user.id);
    if (!aiQuota.allowed) return createPlanLimitResponse(aiQuota);

    const json = await req.json();
    const result = requestSchema.safeParse(json);
    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: result.error }), {
        status: 400,
      });
    }

    const { tweet, language } = result.data;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500 });
    }

    const openrouter = createOpenRouter({ apiKey });
    const model = openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4o");

    const prompt = `You are an expert social media copywriter.
Given the following tweet, generate exactly 3 alternative versions using different angles.
Keep the same language as the original tweet (language hint: ${language}).

ORIGINAL TWEET:
${tweet}

Generate exactly 3 variants:
1. emotional — appeals to feelings, personal story, or empathy
2. factual — data-driven, numbers, specific claims
3. question — turns the message into an engaging question or hook

For each variant:
- text: the rewritten tweet (under 280 chars ideal, hard max 800 chars)
- angle: one of emotional / factual / question / story / list
- rationale: 1 sentence explaining why this angle works (under 200 chars)`;

    const { object, usage } = await generateObject({
      model,
      schema: variantSchema,
      prompt,
    });

    await recordAiUsage(
      session.user.id,
      "variant_generator",
      usage?.totalTokens ?? 0,
      prompt,
      object,
      language
    );

    const sanitized = {
      variants: object.variants.map((v) => ({
        ...v,
        text: v.text.length > 1000 ? v.text.slice(0, 997) + "..." : v.text,
      })),
    };

    return Response.json(sanitized);
  } catch (error) {
    console.error("Variant generation error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate variants" }), { status: 500 });
  }
}
