import { headers } from "next/headers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkViralScoreAccessDetailed, createPlanLimitResponse } from "@/lib/middleware/require-plan";
import { checkRateLimit } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";

const scoreRequestSchema = z.object({
  content: z.string().min(1).max(5000), // Allow thread content
});

const scoreResponseSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.array(z.string()),
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
    
    // Rate limit: using "ai" type for now, but arguably could be its own type if usage is high
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

    const access = await checkViralScoreAccessDetailed(session.user.id);
    if (!access.allowed) {
      return createPlanLimitResponse(access);
    }

    // We do NOT check AI quota (checkAiQuotaDetailed) because scoring should be unlimited for Pro users
    // and we don't want to burn their generation credits on scoring.

    const json = await req.json();
    const result = scoreRequestSchema.safeParse(json);
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: result.error }), { status: 400 });
    }

    const { content } = result.data;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: "AI Service not configured" }), { status: 500 });
    }

    const openrouter = createOpenRouter({ apiKey });
    const model = openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4o");

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

    return Response.json(object);
  } catch (error) {
    console.error("AI Scoring Error:", error);
    return new Response(JSON.stringify({ error: "Failed to score content" }), { status: 500 });
  }
}
