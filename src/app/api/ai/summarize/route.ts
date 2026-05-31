import * as Sentry from "@sentry/nextjs";
import { generateObject } from "ai";
import { z } from "zod";
import { INPUT_LIMITS, truncate } from "@/lib/ai/input-limits";
import { redactPII } from "@/lib/ai/pii";
import { buildSummarizePrompt, SUMMARIZE_PROMPT_VERSION } from "@/lib/ai/summarize-prompts";
import { aiPreamble } from "@/lib/api/ai-preamble";
import { ApiError } from "@/lib/api/errors";
import { LANGUAGE_ENUM, TONE_ENUM } from "@/lib/constants";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import { checkUrlToThreadAccessDetailed } from "@/lib/middleware/require-plan";
import { recordAiUsage, estimateCost } from "@/lib/services/ai-quota";
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
      await releaseQuota();
      return ApiError.badRequest(result.error.issues);
    }

    const { url, language: clientLanguage, tweetCount, tone } = result.data;

    // Validate URL and check for SSRF attacks
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      await releaseQuota();
      return ApiError.badRequest("Invalid URL");
    }

    if (parsedUrl.protocol !== "https:") {
      await releaseQuota();
      return ApiError.badRequest("URL scheme not allowed. Only HTTPS is allowed.");
    }

    if (BLOCKED_HOSTS.test(parsedUrl.hostname)) {
      await releaseQuota();
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
      await releaseQuota();
      return ApiError.badRequest("Could not fetch the URL. Make sure it is publicly accessible.");
    }

    if (articleText.length < 100) {
      await releaseQuota();
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

    const { system, prompt } = buildSummarizePrompt({
      variant: "article",
      language: userLanguage as "ar" | "en",
      tone,
      tweetCount,
      title: cleanTitle,
      body: cleanBody,
      bodyMaxChars: INPUT_LIMITS.summarizeBody,
    });

    const modelId = process.env.OPENROUTER_MODEL!;

    const t0 = performance.now();
    const { object, usage } = await generateObject({
      model,
      schema: threadSchema,
      system,
      prompt,
    });
    const latencyMs = Math.round(performance.now() - t0);

    // Phase 2: uses new options-object signature
    await recordAiUsage({
      userId: session.user.id,
      type: "url_to_thread",
      model: modelId,
      subFeature: "summarize.text",
      tokensIn: usage?.inputTokens ?? 0,
      tokensOut: usage?.outputTokens ?? 0,
      costEstimateCents: estimateCost(modelId, usage?.inputTokens ?? 0, usage?.outputTokens ?? 0),
      promptVersion: SUMMARIZE_PROMPT_VERSION,
      latencyMs,
      fallbackUsed: false,
      inputPrompt: JSON.stringify({ system, prompt }),
      outputContent: object,
      language: userLanguage,
    });

    const sanitized = {
      ...object,
      tweets: object.tweets.map((t) => (t.length > 1000 ? t.slice(0, 997) + "..." : t)),
    };

    // Moderation check on generated thread text
    const modResult = await checkModeration(sanitized.tweets.join("\n"));
    if (modResult) {
      await releaseQuota();
      return modResult;
    }

    const res = Response.json({
      ...sanitized,
      redactions: allRedactions.length > 0 ? allRedactions : undefined,
    });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    await releaseQuota();
    logger.error("ai_stream_failed", {
      route: "summarize",
      userId: session.user.id,
      correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
    Sentry.captureException(error, {
      tags: { route: "summarize", userId: session.user.id, correlationId },
    });
    return ApiError.internal("Failed to generate thread from URL");
  }
}
