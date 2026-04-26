import * as cheerio from "cheerio";
import { logger } from "@/lib/logger";

/** Regex of private/internal IP ranges to block SSRF attacks */
export const BLOCKED_HOSTS =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1$|0\.0\.0\.0)/i;

export interface ArticleFetchResult {
  text: string;
  title: string;
}

/**
 * Fetches a public HTTPS URL and extracts the article text and title.
 * Strips noise elements (scripts, ads, nav, etc.) and limits output to ~4000 chars.
 *
 * Throws on network failure or non-OK HTTP status — callers should catch and
 * surface a user-friendly error (e.g. ApiError.badRequest).
 *
 * NOTE: URL validation (scheme + SSRF blocklist) is the caller's responsibility.
 */
export async function fetchArticleText(
  url: string,
  options?: { locale?: string }
): Promise<ArticleFetchResult> {
  const locale = options?.locale || "en";
  const acceptLanguage = locale === "ar" ? "ar,en;q=0.5" : "en-US,en;q=0.9";

  logger.info("article_fetch_start", { url, locale });

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": acceptLanguage,
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Upgrade-Insecure-Requests": "1",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    logger.warn("article_fetch_failed", { url, status: res.status });
    throw new Error(`Failed to fetch URL: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // Remove noise
  $("script, style, nav, footer, header, aside, .ad, [class*='ad-'], [id*='ad-']").remove();

  const title = $("meta[property='og:title']").attr("content") || $("title").text() || "";

  // Prefer article/main content
  const content = $("article").text() || $("main").text() || $("body").text();

  // Normalize whitespace and limit to ~4000 chars to stay in context
  const text = content.replace(/\s+/g, " ").trim().slice(0, 4000);

  logger.info("article_fetch_success", { url, textLength: text.length });

  return { text, title: title.trim() };
}
