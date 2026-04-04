import { generateObject } from "ai";
import { z } from "zod";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { LANGUAGE_ENUM, LANGUAGES } from "@/lib/constants";
import { recordAiUsage } from "@/lib/services/ai-quota";


const requestSchema = z.object({
  tweets: z.array(z.string()).min(1).max(15),
  targetLanguage: LANGUAGE_ENUM,
});

const responseSchema = z.object({
  tweets: z.array(z.string().max(1000)),
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

    const emptyTweets = tweets.filter((t) => !t.trim());
    if (emptyTweets.length > 0) {
      return new Response(
        JSON.stringify({ error: "Cannot translate empty tweets. Please add content first." }),
        { status: 400 }
      );
    }

    const prompt = `Translate this X thread into ${LANGUAGES.find(l => l.code === targetLanguage)?.label || 'English'}.

Constraints:
- Keep each translated tweet under 280 characters. If a translation would exceed 280 characters, split it into multiple shorter tweets to stay within the limit.
- Preserve meaning, tone, and style as closely as possible.
- Output at least as many tweets as the input (more is OK when splitting long translations).
- Keep numbering prefixes like "1/5" if the original tweet already has them, but do NOT add any new numbering or bracket labels.

Thread:
${tweets.map((t, i) => `--- Tweet ${i + 1} ---\n${t}`).join("\n\n")}`;

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
  } catch (error) {
    console.error("Translation error:", error);
    const message = error instanceof Error ? error.message : "Translation failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
    });
  }
}
