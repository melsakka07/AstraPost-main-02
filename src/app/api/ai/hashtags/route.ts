import { generateObject } from "ai";
import { z } from "zod";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { LANGUAGE_ENUM, LANGUAGES } from "@/lib/constants";
import { recordAiUsage } from "@/lib/services/ai-quota";


const hashtagRequestSchema = z.object({
  content: z.string().min(1),
  language: LANGUAGE_ENUM,
});

const hashtagResponseSchema = z.object({
  hashtags: z.array(z.string()),
});

export async function POST(req: Request) {
  try {
    const preamble = await aiPreamble();
    if (preamble instanceof Response) return preamble;
    const { session, model } = preamble;

    const json = await req.json();
    const result = hashtagRequestSchema.safeParse(json);

    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: result.error }), { status: 400 });
    }

    const { content, language } = result.data;

    const prompt = `
      You are a social media growth expert for X (Twitter).
      Suggest 5-10 highly relevant and trending hashtags for the following tweet content.
      Language: ${LANGUAGES.find(l => l.code === language)?.label || 'English'}.
      
      Content:
      "${content}"
      
      Constraints:
      - If language is Arabic, prioritize hashtags popular in MENA.
      - If other language, prioritize hashtags popular in that region.
      - Mix broad hashtags and niche ones.
      - Return only the hashtags in an array.
      - Do not include the # symbol in the string values if the schema doesn't require it, but here we want the full tag e.g. "#growth".
    `;

    const { object } = await generateObject({
      model,
      schema: hashtagResponseSchema,
      prompt,
    });

    await recordAiUsage(
        session.user.id, 
        "tools", // using "tools" type for now
        0, 
        prompt, 
        JSON.stringify(object),
        language
    );

    return Response.json(object);
  } catch (error) {
    console.error("AI Hashtag Error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate hashtags" }), { status: 500 });
  }
}
