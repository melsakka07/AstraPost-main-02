import { generateObject } from "ai";
import { z } from "zod";
import { getArabicInstructions, getArabicToneGuidance } from "@/lib/ai/arabic-prompt";
import { INPUT_LIMITS, truncate } from "@/lib/ai/input-limits";
import { redactPII } from "@/lib/ai/pii";
import { wrapUntrusted } from "@/lib/ai/untrusted";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM, TONE_ENUM } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { checkUrlToThreadAccessDetailed } from "@/lib/middleware/require-plan";
import { recordAiUsage } from "@/lib/services/ai-quota";
import { BLOCKED_HOSTS, fetchArticleText } from "@/lib/services/article-fetcher";

const requestSchema = z.object({
  url: z.string().url(),
  language: LANGUAGE_ENUM.default("en"),
  tweetCount: z.number().min(3).max(15).default(5),
  tone: TONE_ENUM.default("educational"),
});

const threadSchema = z.object({
  tweets: z.array(z.string().max(1100)),
  title: z.string(),
  sourceLanguage: z.string(),
});

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);

  const preamble = await aiPreamble({ featureGate: checkUrlToThreadAccessDetailed });
  if (preamble instanceof Response) return preamble;
  const { session, dbUser, model, releaseQuota, checkModeration } = preamble;

  try {
    const json = await req.json();
    const result = requestSchema.safeParse(json);
    if (!result.success) {
      return ApiError.badRequest(result.error.issues);
    }

    const { url, language: clientLanguage, tweetCount, tone } = result.data;

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

    // Get language: prefer client-sent language, fall back to user's DB preference
    const userLanguage = clientLanguage || dbUser.language || "en";

    // Fetch and extract article text
    let articleText: string;
    let articleTitle: string;
    try {
      const fetched = await fetchArticleText(url, { locale: userLanguage });
      articleText = fetched.text;
      articleTitle = fetched.title;
    } catch {
      return ApiError.badRequest("Could not fetch the URL. Make sure it is publicly accessible.");
    }

    if (articleText.length < 100) {
      return ApiError.badRequest("Not enough content found at this URL.");
    }

    // Truncate article body to protect against excessive token consumption
    const safeText = truncate(articleText, INPUT_LIMITS.summarizeBody);

    // Redact PII from fetched content before embedding in prompt
    const { cleaned: cleanTitle, redactions: titleRedactions } = redactPII(articleTitle);
    const { cleaned: cleanBody, redactions: bodyRedactions } = redactPII(safeText);
    const allRedactions = [...titleRedactions, ...bodyRedactions];
    if (allRedactions.length > 0) {
      logger.info("pii_redacted", { correlationId, type: "summarize", redactions: allRedactions });
    }

    const langInstruction = getArabicInstructions(userLanguage);
    const toneGuidance = userLanguage === "ar" ? getArabicToneGuidance(tone) : `Tone: ${tone}.`;

    const prompt = `You are an expert social media writer for X (Twitter).
Read the following article and write a ${tweetCount}-tweet thread that summarizes or comments on it.
${langInstruction} ${toneGuidance}
Auto-detect the source language and note it in sourceLanguage.

ARTICLE TITLE: ${cleanTitle}
${wrapUntrusted("ARTICLE TEXT", cleanBody, 30_000)}

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
      userLanguage
    );

    const sanitized = {
      ...object,
      tweets: object.tweets.map((t) => (t.length > 1000 ? t.slice(0, 997) + "..." : t)),
    };

    // Moderation check on generated thread text
    const modResult = await checkModeration(sanitized.tweets.join("\n"));
    if (modResult) return modResult;

    const res = Response.json({
      ...sanitized,
      redactions: allRedactions.length > 0 ? allRedactions : undefined,
    });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    await releaseQuota();
    logger.error("url_summarize_error", {
      correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to generate thread from URL");
  }
}
