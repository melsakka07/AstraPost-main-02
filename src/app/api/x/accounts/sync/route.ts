import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAccountLimitDetailed, createPlanLimitResponse } from "@/lib/middleware/require-plan";
import { account, xAccounts } from "@/lib/schema";
import { decryptToken, encryptToken, isEncryptedToken } from "@/lib/security/token-encryption";
import { XApiService } from "@/lib/services/x-api";
import { getTeamContext } from "@/lib/team-context";

export async function POST() {
  const ctx = await getTeamContext();
  if (!ctx) return ApiError.unauthorized();

  // Only the team owner can sync accounts
  if (!ctx.isOwner) {
    return ApiError.forbidden("Only team owner can sync accounts");
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  const linked = await db.query.account.findMany({
    where: and(eq(account.userId, session.user.id), eq(account.providerId, "twitter")),
  });

  for (const la of linked) {
    if (!la.accessToken) continue;

    let profile: { username?: string; name?: string; profile_image_url?: string } = {};
    try {
      // Better Auth encrypts tokens via databaseHooks before persisting them.
      // We must decrypt before passing to XApiService which expects a raw Bearer token.
      const rawToken = isEncryptedToken(la.accessToken)
        ? decryptToken(la.accessToken)
        : la.accessToken;
      const svc = new XApiService(rawToken);
      const me = await svc.getUser();
      profile = {
        username: (me as any)?.data?.username,
        name: (me as any)?.data?.name,
        profile_image_url: (me as any)?.data?.profile_image_url,
      };
    } catch {}

    const existing = await db.query.xAccounts.findFirst({
      where: eq(xAccounts.xUserId, la.accountId),
    });

    if (!existing) {
      const accountLimit = await checkAccountLimitDetailed(session.user.id);
      if (!accountLimit.allowed) {
        return createPlanLimitResponse(accountLimit);
      }

      // Better Auth already encrypts tokens via databaseHooks. Store them as-is
      // to avoid double-encryption. For legacy plaintext tokens, encrypt once.
      const encAccessToken = isEncryptedToken(la.accessToken)
        ? la.accessToken
        : encryptToken(la.accessToken);
      const encRefreshToken = la.refreshToken
        ? isEncryptedToken(la.refreshToken)
          ? la.refreshToken
          : encryptToken(la.refreshToken)
        : null;

      await db.insert(xAccounts).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        xUserId: la.accountId,
        xUsername: profile.username || session.user.name || "twitter_user",
        xDisplayName: profile.name || session.user.name || "Twitter User",
        xAvatarUrl: profile.profile_image_url || session.user.image,
        accessTokenEnc: encAccessToken,
        refreshTokenEnc: encRefreshToken,
        tokenExpiresAt: la.accessTokenExpiresAt,
        isActive: true,
      });
    } else {
      const encAccessToken = isEncryptedToken(la.accessToken)
        ? la.accessToken
        : encryptToken(la.accessToken);
      const encRefreshToken = la.refreshToken
        ? isEncryptedToken(la.refreshToken)
          ? la.refreshToken
          : encryptToken(la.refreshToken)
        : null;

      await db
        .update(xAccounts)
        .set({
          xUsername: profile.username || existing.xUsername,
          xDisplayName: profile.name || existing.xDisplayName,
          xAvatarUrl: profile.profile_image_url || existing.xAvatarUrl,
          accessTokenEnc: encAccessToken,
          refreshTokenEnc: encRefreshToken ?? existing.refreshTokenEnc,
          tokenExpiresAt: la.accessTokenExpiresAt,
          isActive: true,
        })
        .where(eq(xAccounts.id, existing.id));
    }
  }

  return Response.json({ success: true });
}
