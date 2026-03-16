import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkLinkedinAccessDetailed } from "@/lib/middleware/require-plan";
import { linkedinAccounts } from "@/lib/schema";
import { encryptToken } from "@/lib/security/token-encryption";
import { LinkedInApiService } from "@/lib/services/linkedin-api";

/** Redirect to a settings page URL and always clear the OAuth state cookie. */
function settingsRedirect(req: NextRequest, query: string): NextResponse {
  const res = NextResponse.redirect(new URL(`/dashboard/settings?${query}`, req.url));
  res.cookies.delete("linkedin_oauth_state");
  return res;
}

export async function GET(req: NextRequest) {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ── 2. Plan gate ──────────────────────────────────────────────────────────
  const planCheck = await checkLinkedinAccessDetailed(session.user.id);
  if (!planCheck.allowed) {
    return settingsRedirect(req, "error=linkedin_plan_limit");
  }

  const searchParams = req.nextUrl.searchParams;

  // ── 3. OAuth CSRF state validation ────────────────────────────────────────
  // Validate BEFORE touching the authorization code — an invalid state means
  // the request was not initiated by this user's browser (CSRF / account hijack).
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("linkedin_oauth_state")?.value;

  if (!state || !expectedState || state !== expectedState) {
    console.error("[LINKEDIN_OAUTH_CSRF] state mismatch or missing — possible CSRF attempt");
    return settingsRedirect(req, "error=oauth_state_mismatch");
  }

  // ── 4. OAuth error / missing code ─────────────────────────────────────────
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (oauthError || !code) {
    console.error("[LINKEDIN_AUTH_ERROR]", oauthError);
    return settingsRedirect(req, "error=linkedin_auth_failed");
  }

  // ── 5. Token exchange & account persistence ───────────────────────────────
  try {
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    });

    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams,
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("[LINKEDIN_TOKEN_ERROR]", errorText);
      return settingsRedirect(req, "error=linkedin_token_exchange_failed");
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
    const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } =
      tokenData;

    const tempService = new LinkedInApiService(accessToken, "unknown");
    const userInfo = await tempService.getUser();

    const accountData = {
      userId: session.user.id,
      linkedinUserId: userInfo.id,
      linkedinName: userInfo.name,
      linkedinAvatarUrl: userInfo.avatarUrl ?? null,
      accessToken: encryptToken(accessToken),
      refreshTokenEnc: refreshToken ? encryptToken(refreshToken) : null,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      isActive: true,
      updatedAt: new Date(),
    };

    const existingAccount = await db.query.linkedinAccounts.findFirst({
      where: eq(linkedinAccounts.linkedinUserId, userInfo.id),
    });

    if (existingAccount) {
      await db
        .update(linkedinAccounts)
        .set(accountData)
        .where(eq(linkedinAccounts.id, existingAccount.id));
    } else {
      await db.insert(linkedinAccounts).values({ id: crypto.randomUUID(), ...accountData });
    }

    return settingsRedirect(req, "success=linkedin_connected");
  } catch (err) {
    console.error("[LINKEDIN_CALLBACK_ERROR]", err);
    return settingsRedirect(req, "error=linkedin_connection_failed");
  }
}
