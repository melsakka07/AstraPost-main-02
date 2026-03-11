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


const hashtagRequestSchema = z.object({
  content: z.string().min(1),
  language: z.enum(["ar", "en", "fr", "de", "es", "it", "pt", "tr", "ru", "hi"]),
});

const hashtagResponseSchema = z.object({
  hashtags: z.array(z.string()),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const dbUser = await db.query.user.findFirst({
        where: eq(user.id, session.user.id),
        columns: { plan: true }
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
    const result = hashtagRequestSchema.safeParse(json);
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: result.error }), { status: 400 });
    }

    const { content, language } = result.data;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: "AI Service not configured" }), { status: 500 });
    }

    const openrouter = createOpenRouter({ apiKey });
    const model = openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4o");

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
