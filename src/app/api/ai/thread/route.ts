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


const threadRequestSchema = z.object({
  topic: z.string(),
  tone: z.enum(["professional", "casual", "educational", "inspirational", "funny", "viral"]),
  tweetCount: z.number().min(3).max(15),
  language: z.enum(["ar", "en", "fr", "de", "es", "it", "pt", "tr", "ru", "hi"]),
});

const tweetSchema = z.object({
  tweets: z.array(z.string().max(280)),
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
    const result = threadRequestSchema.safeParse(json);
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: result.error }), { status: 400 });
    }

    const { topic, tone, tweetCount, language } = result.data;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: "AI Service not configured" }), { status: 500 });
    }

    const openrouter = createOpenRouter({ apiKey });
    // Use a capable model for structured output
    const model = openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4o");

    let voiceInstructions = "";
    if (dbUser?.voiceProfile) {
        const vp = dbUser.voiceProfile as any;
        // Check if it's the structured object format we expect
        if (vp.tone && vp.styleKeywords) {
             voiceInstructions = `
            Voice Profile Instructions:
            - Tone: ${vp.tone}
            - Style Keywords: ${Array.isArray(vp.styleKeywords) ? vp.styleKeywords.join(", ") : vp.styleKeywords}
            - Sentence Structure: ${vp.sentenceStructure}
            - Vocabulary: ${vp.vocabularyLevel}
            - Emoji Usage: ${vp.emojiUsage}
            - Formatting: ${vp.formattingHabits}
            - Rules: ${Array.isArray(vp.doAndDonts) ? vp.doAndDonts.join("; ") : vp.doAndDonts}
            
            ADHERE STRICTLY TO THIS WRITING STYLE. mimic the user's voice perfectly.
            `;
        } else if (typeof vp === 'string') {
             // Fallback for legacy text profiles
             voiceInstructions = `Voice Profile Instructions:\n${vp}\nAdhere strictly to this writing style.`;
        }
    }

    const prompt = `
      You are an expert social media content writer for X (Twitter).
      Write a ${tweetCount}-tweet thread about "${topic}".
      Tone: ${tone}.
      Language: ${LANGUAGES.find(l => l.code === language)?.label || 'English'}.
      ${voiceInstructions}
      
      Constraints:
      - Each tweet must be under 260 characters (leaving room for numbering).
      - Do not include numbering (1/5, etc) in the output text, I will add it myself.
      - Make it engaging and viral-worthy.
      - Ensure correct grammar and modern style.
    `;

    const { object } = await generateObject({
      model,
      schema: tweetSchema,
      prompt,
    });

    await recordAiUsage(
        session.user.id, 
        "thread", 
        0, // tokens not available from generateObject directly yet
        prompt, 
        object,
        language
    );

    return Response.json(object);
  } catch (error) {
    console.error("AI Generation Error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate thread" }), { status: 500 });
  }
}
