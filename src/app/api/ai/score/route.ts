import { generateObject } from "ai";
import { z } from "zod";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { checkViralScoreAccessDetailed } from "@/lib/middleware/require-plan";

const scoreRequestSchema = z.object({
  content: z.string().min(1).max(5000), // Allow thread content
});

// Azure/Claude via OpenRouter rejects `minimum`/`maximum` in JSON Schema for number fields.
// Remove the constraints from the schema and clamp/validate after generation.
const scoreResponseSchema = z.object({
  score: z.number(),
  feedback: z.array(z.string()),
});

export async function POST(req: Request) {
  try {
    // Score route uses viral-score access check instead of the standard AI access check,
    // and skips quota consumption since scoring doesn't burn generation credits.
    const preamble = await aiPreamble({
      customAiAccess: checkViralScoreAccessDetailed,
      skipQuotaCheck: true,
    });
    if (preamble instanceof Response) return preamble;
    const { model } = preamble;

    const json = await req.json();
    const result = scoreRequestSchema.safeParse(json);

    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: result.error }), {
        status: 400,
      });
    }

    const { content } = result.data;

    const prompt = `
      You are an expert social media analyst for X (Twitter).
      Analyze the following tweet/thread content and provide a viral potential score (0-100) and 3 specific, actionable feedback points to improve it.
      
      Content:
      "${content}"
      
      Scoring Criteria:
      - Hooks (first line/tweet)
      - Value proposition
      - Call to action (CTA)
      - Formatting/readability
      - Emotional trigger
      
      Feedback should be short and direct (e.g., "Strong hook", "Add a question", "Use more spacing").
    `;

    const { object } = await generateObject({
      model,
      schema: scoreResponseSchema,
      prompt,
    });

    // Clamp score to 0-100 in case the model returns out-of-range values
    return Response.json({ ...object, score: Math.min(100, Math.max(0, object.score)) });
  } catch (error) {
    console.error("AI Scoring Error:", error);
    return new Response(JSON.stringify({ error: "Failed to score content" }), { status: 500 });
  }
}
