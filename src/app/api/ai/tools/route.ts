import { headers } from "next/headers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { LANGUAGES } from "@/lib/constants";
import { db } from "@/lib/db";
import { checkAiLimitDetailed, checkAiQuotaDetailed, createPlanLimitResponse } from "@/lib/middleware/require-plan";
import { checkRateLimit } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";
import { recordAiUsage } from "@/lib/services/ai-quota";

const requestSchema = z.object({
  tool: z.enum(["hook", "cta", "rewrite"]),
  language: z.enum(["ar", "en", "fr", "de", "es", "it", "pt", "tr", "ru", "hi"]).default("ar"),
  tone: z
    .enum(["professional", "casual", "educational", "inspirational", "funny", "viral"])
    .default("professional"),
  topic: z.string().optional(),
  input: z.string().optional(),
});

const responseSchema = z.object({
  text: z.string().max(280),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const dbUser = await db.query.user.findFirst({
        where: eq(user.id, session.user.id),
        columns: { plan: true, voiceProfile: true }
    });
    
    const { success, reset } = await checkRateLimit(session.user.id, dbUser?.plan || "free", "ai");
    if (!success) {
        return new Response(JSON.stringify({ 
            error: "Too many requests", 
            retryAfter: Math.ceil((reset - Date.now()) / 1000) 
        }), { 
            status: 429,
            headers: { "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString() }
        });
    }

    const aiAccess = await checkAiLimitDetailed(session.user.id);
    if (!aiAccess.allowed) {
      return createPlanLimitResponse(aiAccess);
    }

    const aiQuota = await checkAiQuotaDetailed(session.user.id);
    if (!aiQuota.allowed) {
      return createPlanLimitResponse(aiQuota);
    }

    const json = await req.json();
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parsed.error }),
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI Service not configured" }), {
        status: 500,
      });
    }

    const { tool, language, tone, topic, input } = parsed.data;
    const openrouter = createOpenRouter({ apiKey });
    const model = openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4o");

    const langLabel = LANGUAGES.find(l => l.code === language)?.label || 'English';

    let voiceInstructions = "";
    if (dbUser?.voiceProfile) {
        const vp = dbUser.voiceProfile as any;
        if (vp.tone && vp.styleKeywords) {
             voiceInstructions = `
            Voice Profile Instructions:
            - Tone: ${vp.tone}
            - Style: ${Array.isArray(vp.styleKeywords) ? vp.styleKeywords.join(", ") : vp.styleKeywords}
            - Structure: ${vp.sentenceStructure}
            - Vocabulary: ${vp.vocabularyLevel}
            - Emoji Usage: ${vp.emojiUsage}
            - Formatting: ${vp.formattingHabits}
            - Rules: ${Array.isArray(vp.doAndDonts) ? vp.doAndDonts.join("; ") : vp.doAndDonts}
            
            ADHERE STRICTLY TO THIS WRITING STYLE.
            `;
        } else if (typeof vp === 'string') {
             voiceInstructions = `Voice Profile Instructions:\n${vp}\nAdhere strictly to this writing style.`;
        }
    }

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
  } catch {
    return new Response(JSON.stringify({ error: "AI tool failed" }), { status: 500 });
  }
}
