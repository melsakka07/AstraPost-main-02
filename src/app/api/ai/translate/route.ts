import { generateObject } from "ai";
import { z } from "zod";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { LANGUAGE_ENUM, LANGUAGES } from "@/lib/constants";
import { recordAiUsage } from "@/lib/services/ai-quota";


const requestSchema = z.object({
  tweets: z.array(z.string().min(1).max(280)).min(1).max(15),
  targetLanguage: LANGUAGE_ENUM,
});

const responseSchema = z.object({
  tweets: z.array(z.string().max(280)),
});

export async function POST(req: Request) {
  try {
    const preamble = await aiPreamble();
    if (preamble instanceof Response) return preamble;
    const { session, model } = preamble;

    const json = await req.json();
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parsed.error }),
        { status: 400 }
      );
    }

    const { tweets, targetLanguage } = parsed.data;

    const prompt = `Translate this X thread into ${LANGUAGES.find(l => l.code === targetLanguage)?.label || 'English'}.

Constraints:
- Keep numbering prefixes like "1/5" if present.
- Keep each tweet under 280 characters.
- Preserve meaning and style.
- Output the same number of tweets.

Thread:
${tweets.map((t, i) => `[${i + 1}] ${t}`).join("\n")}`;

    const { object } = await generateObject({
      model,
      schema: responseSchema,
      prompt,
    });

    await recordAiUsage(
        session.user.id, 
        "translate", 
        0, 
        prompt, 
        object,
        targetLanguage
    );

    return Response.json(object);
  } catch {
    return new Response(JSON.stringify({ error: "Translation failed" }), {
      status: 500,
    });
  }
}
