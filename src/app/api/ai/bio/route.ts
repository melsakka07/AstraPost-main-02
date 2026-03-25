import { headers } from "next/headers";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { auth } from "@/lib/auth";
import { LANGUAGE_ENUM, LANGUAGES } from "@/lib/constants";
import { db } from "@/lib/db";
import { checkBioOptimizerAccessDetailed } from "@/lib/middleware/require-plan";
import { xAccounts } from "@/lib/schema";
import { recordAiUsage } from "@/lib/services/ai-quota";

const requestSchema = z.object({
  currentBio: z.string().max(500).optional().default(""),
  goal: z.enum(["gain_followers", "attract_clients", "build_authority", "general"]).default("general"),
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
  ).min(3).max(3),
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
    if (!session) return new Response("Unauthorized", { status: 401 });

    const account = await db.query.xAccounts.findFirst({
      where: eq(xAccounts.userId, session.user.id),
      columns: { xUsername: true },
    });

    return Response.json({
      username: account?.xUsername ?? "",
    });
  } catch (error) {
    console.error("Bio fetch error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch account" }), { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const preamble = await aiPreamble({ featureGate: checkBioOptimizerAccessDetailed });
    if (preamble instanceof Response) return preamble;
    const { session, model } = preamble;

    const json = await req.json();
    const result = requestSchema.safeParse(json);
    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: result.error }), {
        status: 400,
      });
    }

    const { currentBio, goal, language, niche } = result.data;
    const langLabel = LANGUAGES.find((l) => l.code === language)?.label || "English";
    const goalLabel = GOAL_LABELS[goal] || GOAL_LABELS.general;

    const currentBioSection = currentBio
      ? `\nCURRENT BIO: "${currentBio}"`
      : "\nNo existing bio provided.";

    const nicheSection = niche ? `\nNICHE: ${niche}` : "";

    const prompt = `You are an expert X (Twitter) profile strategist.
Generate exactly 3 improved bio variants for a content creator.
${currentBioSection}${nicheSection}

GOAL: ${goalLabel}
LANGUAGE: ${langLabel}

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

    const { object, usage } = await generateObject({
      model,
      schema: bioSchema,
      prompt,
    });

    await recordAiUsage(
      session.user.id,
      "bio_optimizer",
      usage?.totalTokens ?? 0,
      prompt,
      object,
      language
    );

    return Response.json(object);
  } catch (error) {
    console.error("Bio generation error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate bio variants" }), {
      status: 500,
    });
  }
}
