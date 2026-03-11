
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAccountLimitDetailed, createPlanLimitResponse } from "@/lib/middleware/require-plan";
import { account, xAccounts } from "@/lib/schema";
import { encryptToken } from "@/lib/security/token-encryption";
import { XApiService } from "@/lib/services/x-api";
import { getTeamContext } from "@/lib/team-context";

export async function POST() {
  const ctx = await getTeamContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  // Only the team owner can sync accounts
  if (!ctx.isOwner) {
    return new Response("Forbidden: Only team owner can sync accounts", { status: 403 });
  }

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
      const accountLimit = await checkAccountLimitDetailed(session.user.id);
      if (!accountLimit.allowed) {
        return createPlanLimitResponse(accountLimit);
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
