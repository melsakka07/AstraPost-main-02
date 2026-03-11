import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkLinkedinAccessDetailed } from "@/lib/middleware/require-plan";
import { linkedinAccounts } from "@/lib/schema";
import { encryptToken } from "@/lib/security/token-encryption";
import { LinkedInApiService } from "@/lib/services/linkedin-api";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const planCheck = await checkLinkedinAccessDetailed(session.user.id);
  if (!planCheck.allowed) {
    return redirect("/dashboard/settings?error=linkedin_plan_limit");
  }

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    console.error("[LINKEDIN_AUTH_ERROR]", error);
    return redirect("/dashboard/settings?error=linkedin_auth_failed");
  }

  try {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/linkedin/callback`,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    });

    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("[LINKEDIN_TOKEN_ERROR]", errorText);
      return redirect("/dashboard/settings?error=linkedin_token_exchange_failed");
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token; // May be undefined for 2-legged flow but usually present for 3-legged
    const expiresIn = tokenData.expires_in; // seconds

    // 2. Get User Info using the new token
    // We instantiate the service to reuse the getUser logic
    const tempService = new LinkedInApiService(accessToken, "unknown");
    const userInfo = await tempService.getUser();

    // 3. Save to Database
    const existingAccount = await db.query.linkedinAccounts.findFirst({
      where: eq(linkedinAccounts.linkedinUserId, userInfo.id),
    });

    const accountData = {
      userId: session.user.id,
      linkedinUserId: userInfo.id,
      linkedinName: userInfo.name,
      linkedinAvatarUrl: userInfo.avatarUrl,
      accessToken: encryptToken(accessToken),
      refreshTokenEnc: refreshToken ? encryptToken(refreshToken) : null,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      isActive: true,
      updatedAt: new Date(),
    };

    if (existingAccount) {
      await db
        .update(linkedinAccounts)
        .set(accountData)
        .where(eq(linkedinAccounts.id, existingAccount.id));
    } else {
      await db.insert(linkedinAccounts).values({
        id: crypto.randomUUID(),
        ...accountData,
      });
    }

    return redirect("/dashboard/settings?success=linkedin_connected");
  } catch (error) {
    console.error("[LINKEDIN_CALLBACK_ERROR]", error);
    return redirect("/dashboard/settings?error=linkedin_connection_failed");
  }
}
