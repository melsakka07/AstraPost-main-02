import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { apiVersionMiddleware } from "@/lib/api/version-middleware";

/**
 * Next.js 16 Proxy for auth protection and API versioning.
 * Uses cookie-based checks for fast, optimistic redirects.
 *
 * Note: Auth only checks for cookie existence, not validity.
 * Full session validation should be done in each protected page/route.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);

  // API versioning
  if (pathname.startsWith("/api/")) {
    const versionedReq = await apiVersionMiddleware(request);
    if (versionedReq) {
      return NextResponse.rewrite(versionedReq.url);
    }
    return NextResponse.next();
  }

  // Set pathname header for server layouts
  requestHeaders.set("x-pathname", pathname);

  // Auth protection for protected routes
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAdminRoute = pathname.startsWith("/admin");
  const isChatRoute = pathname.startsWith("/chat");
  const isProfileRoute = pathname.startsWith("/profile");

  if (isDashboardRoute || isAdminRoute || isChatRoute || isProfileRoute) {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Set language from cookie for components to use
  const language = request.cookies.get("language")?.value || "en";
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
    headers: {
      "x-locale": language,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
