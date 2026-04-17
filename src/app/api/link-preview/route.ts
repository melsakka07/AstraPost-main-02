import { headers } from "next/headers";
import { getLinkPreview } from "link-preview-js";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * Regex matching private/internal IP ranges that must never be fetched:
 * - Loopback:        127.x.x.x, ::1
 * - Link-local:      169.254.x.x (AWS/GCP instance metadata)
 * - RFC 1918:        10.x, 172.16–31.x, 192.168.x
 * - Unspecified:     0.0.0.0
 */
const BLOCKED_HOSTS =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1$|0\.0\.0\.0)/i;

export async function POST(req: Request) {
  // ── 1. Authentication ─────────────────────────────────────────────────────
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return ApiError.unauthorized();
  }

  // ── 2. Input parsing ──────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return ApiError.badRequest("Invalid JSON");
  }

  const url =
    body !== null && typeof body === "object" && "url" in body
      ? (body as Record<string, unknown>).url
      : undefined;

  if (!url || typeof url !== "string") {
    return ApiError.badRequest("URL required");
  }

  // ── 3. URL validation & SSRF blocklist ────────────────────────────────────
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return ApiError.badRequest("Invalid URL");
  }

  // Only allow plain HTTP(S) — reject file://, ftp://, data://, etc.
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return ApiError.badRequest("URL scheme not allowed");
  }

  // Block internal/private hosts
  if (BLOCKED_HOSTS.test(parsed.hostname)) {
    return ApiError.forbidden("URL not allowed");
  }

  // ── 4. Fetch preview ──────────────────────────────────────────────────────
  try {
    const data = await getLinkPreview(url, {
      followRedirects: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
      timeout: 5000,
    });

    return Response.json(data);
  } catch (error) {
    // External fetch failed (timeout, unreachable, etc.) — not a client error
    logger.warn("Link preview fetch failed", {
      error: error instanceof Error ? error.message : error,
    });
    return Response.json({ preview: null });
  }
}
