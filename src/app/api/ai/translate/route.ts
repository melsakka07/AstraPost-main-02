import { headers } from "next/headers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAiLimit } from "@/lib/middleware/require-plan";
import { checkRateLimit } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";
import { checkAiQuota, recordAiUsage } from "@/lib/services/ai-quota";

const requestSchema = z.object({
  tweets: z.array(z.string().min(1).max(280)).min(1).max(15),
  targetLanguage: z.enum(["ar", "en"]),
});

const responseSchema = z.object({
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

    const canUseAi = await checkAiLimit(session.user.id);
    if (!canUseAi) {
      return new Response(JSON.stringify({ error: "upgrade_required" }), { status: 402 });
    }

    const hasQuota = await checkAiQuota(session.user.id);
    if (!hasQuota) {
       return new Response(JSON.stringify({ error: "quota_exceeded" }), { status: 402 });
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

    const openrouter = createOpenRouter({ apiKey });
    const model = openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4o");

    const { tweets, targetLanguage } = parsed.data;

    const prompt = `Translate this X thread into ${
      targetLanguage === "ar" ? "Arabic" : "English"
    }.

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
        object
    );

    return Response.json(object);
  } catch {
    return new Response(JSON.stringify({ error: "Translation failed" }), {
      status: 500,
    });
  }
}

