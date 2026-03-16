import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  // Generate a cryptographically random CSRF state token.
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`,
    state,
    scope: "w_member_social profile email openid",
  });

  // Store state in a HttpOnly, SameSite=lax cookie so it survives the
  // cross-origin redirect back from LinkedIn without being accessible to JS.
  const response = NextResponse.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  );
  response.cookies.set("linkedin_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",          // Required: allows cookie on top-level cross-site GET
    path: "/api/linkedin/callback", // Scope to callback only
    maxAge: 600,              // 10 minutes — more than enough for the OAuth round-trip
  });
  return response;
}
