import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define protected routes
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAdminRoute = pathname.startsWith("/admin");

  if (isDashboardRoute || isAdminRoute) {
    // Check for session cookie
    // Better Auth uses "better-auth.session_token" by default, 
    // or "better-auth.session_token.secure" in production (https)
    const sessionToken = request.cookies.get("better-auth.session_token") || 
                         request.cookies.get("__Secure-better-auth.session_token");

    if (!sessionToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
  ],
};
