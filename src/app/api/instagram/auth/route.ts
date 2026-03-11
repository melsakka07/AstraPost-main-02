import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`;

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!FACEBOOK_APP_ID) {
    return NextResponse.json({ error: "FACEBOOK_APP_ID not configured" }, { status: 500 });
  }

  // Scopes needed for Instagram Graph API
  // instagram_basic: Basic metadata
  // instagram_content_publish: Publishing posts
  // instagram_manage_comments: Managing comments (optional)
  // instagram_manage_insights: Analytics
  // pages_show_list: To list Pages
  // pages_read_engagement: To read Page content
  const scope = "instagram_basic,instagram_content_publish,instagram_manage_insights,pages_show_list,pages_read_engagement";
  
  const state = crypto.randomUUID(); // Should store this for CSRF protection

  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}&scope=${scope}`;

  return NextResponse.redirect(url);
}
