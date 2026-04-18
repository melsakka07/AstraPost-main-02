import { NextRequest, NextResponse } from "next/server";

/**
 * API versioning middleware.
 * Rewrites `/api/v1/*` → `/api/*` internally while preserving request/response contract.
 * Future versions (v2, v3, etc.) can use separate handlers or transformation logic.
 */
export async function apiVersionMiddleware(req: NextRequest) {
  const url = new URL(req.url);

  // Extract version from path: /api/v1/posts → v1, /api/posts → null
  const pathMatch = url.pathname.match(/^\/api\/(v\d+)\//);
  const version = pathMatch ? pathMatch[1] : null;

  if (!version) {
    // No version specified — use default (v1 behavior for now)
    return null; // Allow request to proceed unmodified
  }

  if (version === "v1") {
    // Rewrite /api/v1/* to /api/*
    // Example: /api/v1/posts?foo=bar → /api/posts?foo=bar
    const newPath = url.pathname.replace(/\/api\/v1\//, "/api/");
    const newUrl = new URL(newPath + url.search, url);

    // Clone request with new URL
    const newReq = new NextRequest(newUrl, req);
    return newReq;
  }

  // Future versions (v2, v3, etc.) go here
  return new NextResponse("API version not supported", { status: 400 });
}
