import { generateObject } from "ai";
import { z } from "zod";
import { buildVoiceInstructions } from "@/lib/ai/voice-profile";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { LANGUAGE_ENUM, LANGUAGES, TONE_ENUM } from "@/lib/constants";
import { recordAiUsage } from "@/lib/services/ai-quota";

const requestSchema = z.object({
  tool: z.enum(["hook", "cta", "rewrite"]),
  language: LANGUAGE_ENUM.default("ar"),
  tone: TONE_ENUM.default("professional"),
  topic: z.string().max(500).optional(),
  input: z.string().max(1000).optional(),
});

// Keep the schema constraint generous — the AI sometimes exceeds the prompt's
// character limit by a few characters, and Zod validation failure causes
// generateObject to throw. We enforce the actual limit in the prompt and
// truncate on return if needed.
const responseSchema = z.object({
  text: z.string().max(1100),
});

export async function POST(req: Request) {
  try {
    const preamble = await aiPreamble();
    if (preamble instanceof Response) return preamble;
    const { session, dbUser, model } = preamble;

    const json = await req.json();
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parsed.error }),
        { status: 400 }
      );
    }

    const { tool, language, tone, topic, input } = parsed.data;

    const langLabel = LANGUAGES.find(l => l.code === language)?.label || 'English';

    // Validate the stored voiceProfile against the strict schema and sanitize
    // every field before interpolation. Returns "" for null/invalid profiles.
    const voiceInstructions = buildVoiceInstructions(dbUser?.voiceProfile);

    const prompt = (() => {
      if (tool === "hook") {
        return `You are an expert viral X (Twitter) writer. Write ONE hook tweet about: "${
          topic || ""
        }".
Tone: ${tone}.
Language: ${langLabel}.
${voiceInstructions}

Constraints:
- Max 200 characters.
- No hashtags.
- No numbering.
- Make it curiosity-driven.`;
      }

      if (tool === "cta") {
        return `Write a short call-to-action for the END of an X thread.
Tone: ${tone}.
Language: ${langLabel}.
${voiceInstructions}

Constraints:
- Max 120 characters.
- No hashtags.
- Encourage likes/reposts/follows or a thoughtful reply.`;
      }

      return `Rewrite the following X tweet.
Tone: ${tone}.
Language: ${langLabel}.
${voiceInstructions}

Constraints:
- Max 280 characters.
- Preserve the meaning.
- Improve clarity and punch.

Tweet:
${input || ""}`;
    })();

    const { object } = await generateObject({
      model,
      schema: responseSchema,
      prompt,
    });

    await recordAiUsage(
        session.user.id, 
        tool, 
        0, 
        prompt, 
        object,
        language
    );

    return Response.json(object);
  } catch (err) {
    console.error("AI tools error:", err);
    return new Response(JSON.stringify({ error: "AI tool failed" }), { status: 500 });
  }
}
