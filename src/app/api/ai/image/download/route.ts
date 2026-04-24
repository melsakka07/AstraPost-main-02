import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

const TRUSTED_HOSTNAME_SUFFIXES = [
  "replicate.delivery",
  "replicate.com",
  "pbxt.replicate.delivery",
  "vercel-storage.com",
  "public.blob.vercel-storage.com",
];

function isTrustedUrl(urlString: string): boolean {
  try {
    const { hostname } = new URL(urlString);
    return TRUSTED_HOSTNAME_SUFFIXES.some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`)
    );
  } catch {
    return false;
  }
}

function getExtensionFromContentType(contentType: string): string {
  if (contentType.includes("image/png")) return ".png";
  if (contentType.includes("image/jpeg") || contentType.includes("image/jpg")) return ".jpg";
  return ".webp";
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return ApiError.badRequest("url parameter is required");
  }

  // Resolve relative URLs (local storage mode in dev: /uploads/...) to absolute
  const absoluteUrl = url.startsWith("/") ? `${req.nextUrl.origin}${url}` : url;

  // Allow same-origin relative URLs; otherwise check trusted hostname allowlist
  const isSameOrigin = url.startsWith("/");
  if (!isSameOrigin && !isTrustedUrl(absoluteUrl)) {
    return ApiError.badRequest("Invalid image URL");
  }

  const upstream = await fetch(absoluteUrl);
  if (!upstream.ok) {
    return ApiError.internal("Failed to fetch image");
  }

  const contentType = upstream.headers.get("Content-Type") ?? "image/webp";
  const ext = getExtensionFromContentType(contentType);
  const filename = `astrapost-image-${Date.now()}${ext}`;

  logger.info("image_download_proxied", { userId: session.user.id, url: absoluteUrl });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
