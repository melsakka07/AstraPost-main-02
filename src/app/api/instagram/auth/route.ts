import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`;

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!FACEBOOK_APP_ID) {
    return NextResponse.json({ error: "FACEBOOK_APP_ID not configured" }, { status: 500 });
  }

  const scope =
    "instagram_basic,instagram_content_publish,instagram_manage_insights,pages_show_list,pages_read_engagement";

  // Generate a cryptographically random CSRF state token.
  const state = crypto.randomUUID();

  const authUrl =
    `https://www.facebook.com/v19.0/dialog/oauth` +
    `?client_id=${FACEBOOK_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&state=${state}` +
    `&scope=${scope}`;

  // Store state in a HttpOnly, SameSite=lax cookie so it survives the
  // cross-origin redirect back from Facebook/Instagram without being accessible to JS.
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("instagram_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",           // Required: allows cookie on top-level cross-site GET
    path: "/api/instagram/callback", // Scope to callback only
    maxAge: 600,               // 10 minutes — more than enough for the OAuth round-trip
  });
  return response;
}
