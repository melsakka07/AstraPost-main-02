import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { instagramAccounts } from "@/lib/schema";
import { encryptToken } from "@/lib/security/token-encryption";

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/callback`;

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    console.error("[INSTAGRAM_AUTH_ERROR]", error);
    return redirect("/dashboard/settings?error=instagram_auth_failed");
  }

  try {
    // 1. Exchange code for short-lived User Access Token
    const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`);
    
    if (!tokenRes.ok) {
        throw new Error("Failed to exchange code");
    }
    
    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;

    // 2. Exchange for Long-Lived User Access Token (60 days)
    const longLivedRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&fb_exchange_token=${shortLivedToken}`);
    
    if (!longLivedRes.ok) throw new Error("Failed to get long-lived token");
    
    const longLivedData = await longLivedRes.json();
    const accessToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in; // seconds
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // 3. Get Pages and connected Instagram Accounts
    const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`);
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
        return redirect("/dashboard/settings?error=no_facebook_pages");
    }

    // Find the first Page with a connected Instagram Business Account
    let igAccountId: string | null = null;
    let igUsername: string | null = null;
    let igProfilePic: string | null = null;

    // We need to fetch IG info for each page
    for (const page of pagesData.data) {
        const igRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`);
        const igData = await igRes.json();

        if (igData.instagram_business_account) {
            igAccountId = igData.instagram_business_account.id;
            
            // Fetch IG details
            const detailsRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}?fields=username,name,profile_picture_url&access_token=${accessToken}`);
            const details = await detailsRes.json();
            
            igUsername = details.username;
            igProfilePic = details.profile_picture_url;
            break; // Found one
        }
    }

    if (!igAccountId) {
        return redirect("/dashboard/settings?error=no_instagram_business_account");
    }

    // 4. Save to DB
    const existing = await db.query.instagramAccounts.findFirst({
        where: eq(instagramAccounts.instagramUserId, igAccountId)
    });

    if (existing) {
        await db.update(instagramAccounts).set({
            accessToken: encryptToken(accessToken),
            tokenExpiresAt: expiresAt,
            instagramUsername: igUsername!,
            instagramAvatarUrl: igProfilePic,
            isActive: true,
            updatedAt: new Date()
        }).where(eq(instagramAccounts.id, existing.id));
    } else {
        await db.insert(instagramAccounts).values({
            id: crypto.randomUUID(),
            userId: session.user.id,
            instagramUserId: igAccountId!,
            instagramUsername: igUsername!,
            instagramAvatarUrl: igProfilePic,
            accessToken: encryptToken(accessToken),
            tokenExpiresAt: expiresAt,
            isActive: true
        });
    }

    return redirect("/dashboard/settings?success=instagram_connected");

  } catch (error) {
    console.error("Instagram Callback Error:", error);
    return redirect("/dashboard/settings?error=instagram_connection_failed");
  }
}
