import { generateObject } from "ai";
import * as cheerio from "cheerio";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getArabicInstructions } from "@/lib/ai/arabic-prompt";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { affiliateLinks } from "@/lib/schema";
import { recordAiUsage } from "@/lib/services/ai-quota";

const BLOCKED_HOSTS =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1$|0\.0\.0\.0)/i;

const affiliateRequestSchema = z.object({
  url: z.string().url(),
  affiliateTag: z.string().optional(),
  language: LANGUAGE_ENUM.default("ar"),
  platform: z.enum(["amazon", "noon", "aliexpress", "other"]).default("amazon"),
});

const tweetSchema = z.object({
  tweet: z.string().max(1100),
  hashtags: z.array(z.string()),
});

export async function POST(req: Request) {
  try {
    const correlationId = getCorrelationId(req);
    const preamble = await aiPreamble();
    if (preamble instanceof Response) return preamble;
    const { session, dbUser, model } = preamble;

    const json = await req.json();
    const result = affiliateRequestSchema.safeParse(json);

    if (!result.success) {
      return ApiError.badRequest(result.error.issues);
    }

    const { url, affiliateTag, language: clientLanguage, platform } = result.data;

    // Get language: prefer client-sent language, fall back to user's DB preference
    const userLanguage = clientLanguage || dbUser.language || "en";

    // Validate URL and check for SSRF attacks
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return ApiError.badRequest("Invalid URL");
    }

    if (parsedUrl.protocol !== "https:") {
      return ApiError.badRequest("URL scheme not allowed. Only HTTPS is allowed.");
    }

    if (BLOCKED_HOSTS.test(parsedUrl.hostname)) {
      return ApiError.forbidden("URL not allowed");
    }

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

      productTitle =
        $('meta[property="og:title"]').attr("content") || $("title").text() || "Product";
      productImage = $('meta[property="og:image"]').attr("content") || "";
    } catch (e) {
      logger.error("affiliate_product_fetch_failed", {
        error: e instanceof Error ? e.message : String(e),
      });
      // Continue without metadata if fetch fails, AI will rely on URL context if possible or generic
    }

    // 2. Generate Tweet with AI
    const langInstruction = getArabicInstructions(userLanguage);

    const prompt = `
      You are an expert affiliate marketer on X (Twitter).
      Write a compelling, high-converting tweet to promote this product:

      Product Title: ${productTitle}
      URL: ${url}
      Platform: ${platform}
      Affiliate Tag/Coupon: ${affiliateTag || "None"}

      ${langInstruction}

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
        if (platform === "amazon") {
          urlObj.searchParams.set("tag", affiliateTag);
        } else if (platform === "noon") {
          // For Noon, often the tag is a coupon code, but we can append it as a ref if applicable.
          // We'll assume generic ref for now or just rely on the tweet text for the code.
          // urlObj.searchParams.set("ref", affiliateTag);
        }
        affiliateUrl = urlObj.toString();
      } catch (e) {
        logger.error("affiliate_url_construction_failed", {
          error: e instanceof Error ? e.message : String(e),
          url,
        });
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
      originalAffiliateUrl: affiliateUrl,
    };

    // Save to affiliateLinks table and record AI usage atomically
    await db.transaction(async (tx) => {
      await tx.insert(affiliateLinks).values({
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

      await recordAiUsage(session.user.id, "affiliate", 0, prompt, output, userLanguage, tx);
    });

    const res = Response.json(output);
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("affiliate_generation_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to generate affiliate tweet");
  }
}
