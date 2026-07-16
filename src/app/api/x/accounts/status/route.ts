import { eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { cachedQuery } from "@/lib/cache";
import { db } from "@/lib/db";
import { xAccounts } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

export async function GET() {
  const ctx = await getTeamContext();
  if (!ctx) return ApiError.unauthorized();

  const now = new Date();

  const accounts = await cachedQuery(
    `x:accounts:status:${ctx.session.user.id}`,
    async () => {
      const rows = await db.query.xAccounts.findMany({
        where: eq(xAccounts.userId, ctx.session.user.id),
      });

      return rows.map((a) => {
        const isTokenExpired = a.tokenExpiresAt ? a.tokenExpiresAt < now : false;
        const expiresInHours = a.tokenExpiresAt
          ? (a.tokenExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)
          : null;

        return {
          id: a.id,
          xUsername: a.xUsername,
          isActive: a.isActive,
          isTokenExpired,
          tokenExpiresAt: a.tokenExpiresAt?.toISOString() ?? null,
          expiresInHours,
          refreshFailureReason: a.refreshFailureReason,
        };
      });
    },
    120 // 2-minute TTL
  );

  const hasExpiredAccount = accounts.some((a) => a.isTokenExpired);
  const hasActiveAccount = accounts.some((a) => a.isActive && !a.isTokenExpired);

  return Response.json({
    accounts,
    hasExpiredAccount,
    hasActiveAccount,
  });
}
