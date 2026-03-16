import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { instagramAccounts } from "@/lib/schema";
import { encryptToken } from "@/lib/security/token-encryption";

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`;

/** Redirect to a settings page URL and always clear the OAuth state cookie. */
function settingsRedirect(req: NextRequest, query: string): NextResponse {
  const res = NextResponse.redirect(new URL(`/dashboard/settings?${query}`, req.url));
  res.cookies.delete("instagram_oauth_state");
  return res;
}

export async function GET(req: NextRequest) {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const searchParams = req.nextUrl.searchParams;

  // ── 2. OAuth CSRF state validation ────────────────────────────────────────
  // Validate BEFORE touching the authorization code — an invalid state means
  // the request was not initiated by this user's browser (CSRF / account hijack).
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("instagram_oauth_state")?.value;

  if (!state || !expectedState || state !== expectedState) {
    console.error("[INSTAGRAM_OAUTH_CSRF] state mismatch or missing — possible CSRF attempt");
    return settingsRedirect(req, "error=oauth_state_mismatch");
  }

  // ── 3. OAuth error / missing code ─────────────────────────────────────────
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError || !code) {
    console.error("[INSTAGRAM_AUTH_ERROR]", oauthError);
    return settingsRedirect(req, "error=instagram_auth_failed");
  }

  // ── 4. Token exchange & account persistence ───────────────────────────────
  try {
    // Exchange for short-lived user access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token` +
        `?client_id=${FACEBOOK_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&client_secret=${FACEBOOK_APP_SECRET}` +
        `&code=${code}`
    );
    if (!tokenRes.ok) throw new Error("Failed to exchange authorization code");
    const tokenData = (await tokenRes.json()) as { access_token: string };
    const shortLivedToken = tokenData.access_token;

    // Exchange for long-lived user access token (60 days)
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token` +
        `?grant_type=fb_exchange_token` +
        `&client_id=${FACEBOOK_APP_ID}` +
        `&client_secret=${FACEBOOK_APP_SECRET}` +
        `&fb_exchange_token=${shortLivedToken}`
    );
    if (!longLivedRes.ok) throw new Error("Failed to obtain long-lived token");
    const longLivedData = (await longLivedRes.json()) as {
      access_token: string;
      expires_in: number;
    };
    const { access_token: accessToken, expires_in: expiresIn } = longLivedData;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Discover connected Instagram Business Account via Facebook Pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
    );
    const pagesData = (await pagesRes.json()) as { data?: { id: string }[] };

    if (!pagesData.data || pagesData.data.length === 0) {
      return settingsRedirect(req, "error=no_facebook_pages");
    }

    let igAccountId: string | null = null;
    let igUsername: string | null = null;
    let igProfilePic: string | null = null;

    for (const page of pagesData.data) {
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/${page.id}` +
          `?fields=instagram_business_account&access_token=${accessToken}`
      );
      const igData = (await igRes.json()) as {
        instagram_business_account?: { id: string };
      };

      if (igData.instagram_business_account) {
        igAccountId = igData.instagram_business_account.id;

        const detailsRes = await fetch(
          `https://graph.facebook.com/v19.0/${igAccountId}` +
            `?fields=username,name,profile_picture_url&access_token=${accessToken}`
        );
        const details = (await detailsRes.json()) as {
          username?: string;
          profile_picture_url?: string;
        };

        igUsername = details.username ?? null;
        igProfilePic = details.profile_picture_url ?? null;
        break;
      }
    }

    // Both are required — instagramUsername is NOT NULL in the schema
    if (!igAccountId || !igUsername) {
      return settingsRedirect(req, "error=no_instagram_business_account");
    }

    const existing = await db.query.instagramAccounts.findFirst({
      where: eq(instagramAccounts.instagramUserId, igAccountId),
    });

    if (existing) {
      await db
        .update(instagramAccounts)
        .set({
          accessToken: encryptToken(accessToken),
          tokenExpiresAt: expiresAt,
          instagramUsername: igUsername,
          instagramAvatarUrl: igProfilePic,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(instagramAccounts.id, existing.id));
    } else {
      await db.insert(instagramAccounts).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        instagramUserId: igAccountId,
        instagramUsername: igUsername,
        instagramAvatarUrl: igProfilePic,
        accessToken: encryptToken(accessToken),
        tokenExpiresAt: expiresAt,
        isActive: true,
      });
    }

    return settingsRedirect(req, "success=instagram_connected");
  } catch (err) {
    console.error("[INSTAGRAM_CALLBACK_ERROR]", err);
    return settingsRedirect(req, "error=instagram_connection_failed");
  }
}
