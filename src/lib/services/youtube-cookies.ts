import "server-only";

import { logger } from "@/lib/logger";

/**
 * Parse a Netscape-format YouTube cookies file (loaded from YOUTUBE_COOKIES_BASE64)
 * into a single `name=value; name=value; ...` Cookie-header string.
 *
 * Filters to cookies whose domain is on `.youtube.com` or `.google.com` (the only
 * domains relevant to innertube + watch-page requests). Expired cookies are skipped.
 *
 * Returns "" when the env var is unset, the decoded content is empty, or no
 * applicable cookies remain — callers must treat empty string as "no header to send".
 *
 * The result is cached in module memory; the cache is keyed on the raw env value so
 * a redeploy with a refreshed cookies blob picks up automatically.
 */
let _cache: { raw: string; header: string } | undefined;

export function getYouTubeCookieHeader(): string {
  const encoded = process.env.YOUTUBE_COOKIES_BASE64;
  if (!encoded) return "";
  if (_cache && _cache.raw === encoded) return _cache.header;

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf-8");
  } catch {
    logger.warn("youtube_cookie_header_decode_failed");
    _cache = { raw: encoded, header: "" };
    return "";
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const pairs: string[] = [];
  const seen = new Set<string>();

  for (const rawLine of decoded.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const cols = line.split("\t");
    if (cols.length < 7) continue;
    const [domain, , , , expiresStr, name, value] = cols as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];
    if (!name || !value) continue;
    if (!/(^|\.)(youtube|google)\.com$/i.test(domain)) continue;
    const expires = Number(expiresStr);
    if (Number.isFinite(expires) && expires > 0 && expires < nowSec) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    pairs.push(`${name}=${value}`);
  }

  const header = pairs.join("; ");
  _cache = { raw: encoded, header };
  if (header) {
    logger.info("youtube_cookie_header_loaded", { cookieCount: pairs.length });
  } else {
    logger.warn("youtube_cookie_header_empty");
  }
  return header;
}
