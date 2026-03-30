import { generateObject } from "ai";
import * as cheerio from "cheerio";
import { nanoid } from "nanoid";
import { z } from "zod";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { LANGUAGE_ENUM_LIMITED } from "@/lib/constants";
import { db } from "@/lib/db";
import { affiliateLinks } from "@/lib/schema";
import { recordAiUsage } from "@/lib/services/ai-quota";

const affiliateRequestSchema = z.object({
  url: z.string().url(),
  affiliateTag: z.string().optional(),
  language: LANGUAGE_ENUM_LIMITED.default("ar"),
  platform: z.enum(["amazon", "noon", "aliexpress", "other"]).default("amazon"),
});

const tweetSchema = z.object({
  tweet: z.string().max(1100),
  hashtags: z.array(z.string()),
});

export async function POST(req: Request) {
  try {
    const preamble = await aiPreamble();
    if (preamble instanceof Response) return preamble;
    const { session, model } = preamble;

    const json = await req.json();
    const result = affiliateRequestSchema.safeParse(json);

    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: result.error }), { status: 400 });
    }

    const { url, affiliateTag, language, platform } = result.data;

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
    const prompt = `
      You are an expert affiliate marketer on X (Twitter).
      Write a compelling, high-converting tweet to promote this product:
      
      Product Title: ${productTitle}
      URL: ${url}
      Platform: ${platform}
      Affiliate Tag/Coupon: ${affiliateTag || "None"}
      
      Language: ${language === 'ar' ? 'Arabic' : 'English'}.
      
      Constraints:
      - Max 280 characters.
      - Include engaging hook.
      - Do NOT include the URL in the output text (it will be attached as a card).
      - Include 2-3 relevant hashtags.
      - If a coupon code (Affiliate Tag) is provided, explicitly mention it in the tweet (e.g., "Use code XYZ for discount").
    `;

    const { object } = await generateObject({
      model,
      schema: tweetSchema,
      prompt,
    });

    // 3. Construct Affiliate URL
    let affiliateUrl = url;
    if (affiliateTag) {
        try {
            const urlObj = new URL(url);
            if (platform === 'amazon') {
                urlObj.searchParams.set("tag", affiliateTag);
            } else if (platform === 'noon') {
                // For Noon, often the tag is a coupon code, but we can append it as a ref if applicable.
                // We'll assume generic ref for now or just rely on the tweet text for the code.
                // urlObj.searchParams.set("ref", affiliateTag); 
            }
            affiliateUrl = urlObj.toString();
        } catch (e) {
            console.error("Invalid URL construction", e);
        }
    }
    
    const shortCode = nanoid(10);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const shortLink = `${appUrl}/go/${shortCode}`;

    const output = {
      tweet: object.tweet,
      hashtags: object.hashtags,
      productTitle,
      productImage,
      affiliateUrl: shortLink,
      originalAffiliateUrl: affiliateUrl
    };

    // Save to affiliateLinks table
    await db.insert(affiliateLinks).values({
      id: nanoid(),
      userId: session.user.id,
      destinationUrl: affiliateUrl,
      shortCode,
      platform,
      clicks: 0,
      productTitle: productTitle || "Unknown Product",
      productImageUrl: productImage || null,
      affiliateTag: affiliateTag || null,
      generatedTweet: `${object.tweet}\n\n${object.hashtags.join(" ")}`,
      wasScheduled: false,
    });

    await recordAiUsage(
        session.user.id, 
        "affiliate", 
        0, 
        prompt, 
        output,
        language
    );

    return Response.json(output);

  } catch (error) {
    console.error("Affiliate Generation Error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate affiliate tweet" }), { status: 500 });
  }
}
