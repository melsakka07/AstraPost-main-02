import { headers } from "next/headers";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import * as cheerio from "cheerio";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { LANGUAGES } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  checkAiLimitDetailed,
  checkAiQuotaDetailed,
  checkUrlToThreadAccessDetailed,
  createPlanLimitResponse,
} from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";
import { recordAiUsage } from "@/lib/services/ai-quota";

const requestSchema = z.object({
  url: z.string().url(),
  language: z.enum(["ar", "en", "fr", "de", "es", "it", "pt", "tr", "ru", "hi"]).default("en"),
  tweetCount: z.number().min(3).max(15).default(5),
  tone: z
    .enum(["professional", "casual", "educational", "inspirational", "humorous", "viral"])
    .default("educational"),
});

const threadSchema = z.object({
  tweets: z.array(z.string().max(1100)),
  title: z.string(),
  sourceLanguage: z.string(),
});

async function fetchArticleText(url: string): Promise<{ text: string; title: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  // Remove noise
  $("script, style, nav, footer, header, aside, .ad, [class*='ad-'], [id*='ad-']").remove();

  const title =
    $("meta[property='og:title']").attr("content") ||
    $("title").text() ||
    "";

  // Prefer article/main content
  const content =
    $("article").text() ||
    $("main").text() ||
    $("body").text();

  // Normalize whitespace and limit to ~4000 chars to stay in context
  const text = content
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);

  return { text, title: title.trim() };
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return new Response("Unauthorized", { status: 401 });

    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { plan: true },
    });

    const rlResult = await checkRateLimit(session.user.id, dbUser?.plan || "free", "ai");
    if (!rlResult.success) return createRateLimitResponse(rlResult);

    const access = await checkUrlToThreadAccessDetailed(session.user.id);
    if (!access.allowed) return createPlanLimitResponse(access);

    const aiAccess = await checkAiLimitDetailed(session.user.id);
    if (!aiAccess.allowed) return createPlanLimitResponse(aiAccess);

    const aiQuota = await checkAiQuotaDetailed(session.user.id);
    if (!aiQuota.allowed) return createPlanLimitResponse(aiQuota);

    const json = await req.json();
    const result = requestSchema.safeParse(json);
    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid request", details: result.error }), {
        status: 400,
      });
    }

    const { url, language, tweetCount, tone } = result.data;

    // Fetch and extract article text
    let articleText: string;
    let articleTitle: string;
    try {
      const fetched = await fetchArticleText(url);
      articleText = fetched.text;
      articleTitle = fetched.title;
    } catch {
      return new Response(
        JSON.stringify({ error: "Could not fetch the URL. Make sure it is publicly accessible." }),
        { status: 422 }
      );
    }

    if (articleText.length < 100) {
      return new Response(
        JSON.stringify({ error: "Not enough content found at this URL." }),
        { status: 422 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500 });
    }

    const openrouter = createOpenRouter({ apiKey });
    const model = openrouter(process.env.OPENROUTER_MODEL || "openai/gpt-4o");
    const langLabel = LANGUAGES.find((l) => l.code === language)?.label || "English";

    const prompt = `You are an expert social media writer for X (Twitter).
Read the following article and write a ${tweetCount}-tweet thread that summarizes or comments on it.
Output language: ${langLabel}. Tone: ${tone}.
Auto-detect the source language and note it in sourceLanguage.

ARTICLE TITLE: ${articleTitle}
ARTICLE TEXT:
${articleText}

Constraints:
- Each tweet MUST be strictly under 800 characters.
- Do NOT include tweet numbering in the text.
- Make the thread engaging, informative, and shareable.
- Start with a hook tweet that grabs attention.
- End with a takeaway or call-to-action tweet.`;

    const { object, usage } = await generateObject({
      model,
      schema: threadSchema,
      prompt,
    });

    await recordAiUsage(
      session.user.id,
      "url_to_thread",
      usage?.totalTokens ?? 0,
      prompt,
      object,
      language
    );

    const sanitized = {
      ...object,
      tweets: object.tweets.map((t) => (t.length > 1000 ? t.slice(0, 997) + "..." : t)),
    };

    return Response.json(sanitized);
  } catch (error) {
    console.error("URL summarize error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate thread from URL" }), {
      status: 500,
    });
  }
}
