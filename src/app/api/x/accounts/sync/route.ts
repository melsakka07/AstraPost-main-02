import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAccountLimit } from "@/lib/middleware/require-plan";
import { account, xAccounts } from "@/lib/schema";
import { encryptToken } from "@/lib/security/token-encryption";
import { XApiService } from "@/lib/services/x-api";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const linked = await db.query.account.findMany({
    where: and(eq(account.userId, session.user.id), eq(account.providerId, "twitter")),
  });

  for (const la of linked) {
    if (!la.accessToken) continue;

    let profile: { username?: string; name?: string; profile_image_url?: string } = {};
    try {
      const svc = new XApiService(la.accessToken);
      const me = await svc.getUser();
      profile = {
        username: (me as any)?.data?.username,
        name: (me as any)?.data?.name,
        profile_image_url: (me as any)?.data?.profile_image_url,
      };
    } catch {
    }

    const existing = await db.query.xAccounts.findFirst({
      where: eq(xAccounts.xUserId, la.accountId),
    });

    if (!existing) {
      const canAdd = await checkAccountLimit(session.user.id);
      if (!canAdd) {
        // Skip adding if limit reached, but continue loop or return error
        // Since this is a sync, returning error might break UI. 
        // We'll skip and maybe log a warning, or return a partial success.
        // For strict enforcement, we should stop and return 402.
        return new Response(JSON.stringify({ error: "upgrade_required" }), { status: 402 });
      }

      await db.insert(xAccounts).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        xUserId: la.accountId,
        xUsername: profile.username || session.user.name || "twitter_user",
        xDisplayName: profile.name || session.user.name || "Twitter User",
        xAvatarUrl: profile.profile_image_url || session.user.image,
          accessToken: encryptToken(la.accessToken),
        refreshTokenEnc: la.refreshToken ? encryptToken(la.refreshToken) : null,
        refreshToken: null,
        tokenExpiresAt: la.accessTokenExpiresAt,
        isActive: true,
      });
    } else {
      await db
        .update(xAccounts)
        .set({
          xUsername: profile.username || existing.xUsername,
          xDisplayName: profile.name || existing.xDisplayName,
          xAvatarUrl: profile.profile_image_url || existing.xAvatarUrl,
            accessToken: encryptToken(la.accessToken),
          refreshTokenEnc: la.refreshToken ? encryptToken(la.refreshToken) : existing.refreshTokenEnc,
          refreshToken: null,
          tokenExpiresAt: la.accessTokenExpiresAt,
          isActive: true,
        })
        .where(eq(xAccounts.id, existing.id));
    }
  }

  return Response.json({ success: true });
}
