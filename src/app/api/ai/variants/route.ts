import { generateObject } from "ai";
import { z } from "zod";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { LANGUAGE_ENUM } from "@/lib/constants";
import { checkVariantGeneratorAccessDetailed } from "@/lib/middleware/require-plan";
import { recordAiUsage } from "@/lib/services/ai-quota";

const requestSchema = z.object({
  tweet: z.string().min(1).max(1000),
  language: LANGUAGE_ENUM.default("en"),
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
    const preamble = await aiPreamble({ featureGate: checkVariantGeneratorAccessDetailed });
    if (preamble instanceof Response) return preamble;
    const { session, model } = preamble;

    const json = await req.json();
    const result = requestSchema.safeParse(json);
    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: result.error }), {
        status: 400,
      });
    }

    const { tweet, language } = result.data;

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
