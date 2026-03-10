import { headers } from "next/headers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import * as cheerio from "cheerio";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAiLimit } from "@/lib/middleware/require-plan";
import { checkRateLimit } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";
import { checkAiQuota, recordAiUsage } from "@/lib/services/ai-quota";

const affiliateRequestSchema = z.object({
  url: z.string().url(),
  affiliateTag: z.string().optional(),
  language: z.enum(["ar", "en"]).default("ar"),
});

const tweetSchema = z.object({
  tweet: z.string().max(280),
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

    const canUseAi = await checkAiLimit(session.user.id);
    if (!canUseAi) {
      return new Response(JSON.stringify({ error: "upgrade_required" }), { status: 402 });
    }

    const hasQuota = await checkAiQuota(session.user.id);
    if (!hasQuota) {
       return new Response(JSON.stringify({ error: "quota_exceeded" }), { status: 402 });
    }

    const json = await req.json();
    const result = affiliateRequestSchema.safeParse(json);
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: result.error }), { status: 400 });
    }

    const { url, affiliateTag, language } = result.data;

    // 1. Fetch Product Metadata
    let productTitle = "";
    let productImage = "";
    
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        },
      });
      const html = await res.text();
      const $ = cheerio.load(html);
      
      productTitle = $('meta[property="og:title"]').attr("content") || $("title").text() || "Product";
      productImage = $('meta[property="og:image"]').attr("content") || "";
    } catch (e) {
      console.error("Failed to fetch product metadata", e);
      // Continue without metadata if fetch fails, AI will rely on URL context if possible or generic
    }

    // 2. Generate Tweet with AI
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: "AI Service not configured" }), { status: 500 });
    }

    const openrouter = createOpenRouter({ apiKey });
    const model = openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4o");

    const prompt = `
      You are an expert affiliate marketer on X (Twitter).
      Write a compelling, high-converting tweet to promote this product:
      
      Product Title: ${productTitle}
      URL: ${url}
      
      Language: ${language === 'ar' ? 'Arabic' : 'English'}.
      
      Constraints:
      - Max 280 characters.
      - Include engaging hook.
      - Do NOT include the URL in the output text (it will be attached as a card).
      - Include 2-3 relevant hashtags.
    `;

    const { object } = await generateObject({
      model,
      schema: tweetSchema,
      prompt,
    });

    // 3. Construct Affiliate URL (Basic implementation)
    let affiliateUrl = url;
    if (affiliateTag) {
        const urlObj = new URL(url);
        urlObj.searchParams.set("tag", affiliateTag);
        affiliateUrl = urlObj.toString();
    }

    const output = {
      tweet: object.tweet,
      hashtags: object.hashtags,
      productTitle,
      productImage,
      affiliateUrl
    };

    await recordAiUsage(
        session.user.id, 
        "affiliate", 
        0, 
        prompt, 
        output
    );

    return Response.json(output);

  } catch (error) {
    console.error("Affiliate Generation Error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate affiliate tweet" }), { status: 500 });
  }
}
