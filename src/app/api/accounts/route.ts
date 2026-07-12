import { and, asc, desc, eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { xAccounts, linkedinAccounts, instagramAccounts } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

export async function GET() {
  const ctx = await getTeamContext();
  if (!ctx) return ApiError.unauthorized();

  const twitterAccounts = await db.query.xAccounts.findMany({
    where: and(eq(xAccounts.userId, ctx.currentTeamId), eq(xAccounts.isActive, true)),
    orderBy: [desc(xAccounts.isDefault), asc(xAccounts.createdAt)],
  });

  // Separately query inactive X accounts so the frontend can surface
  // a "Reconnect" prompt without the user being bounced to /login.
  const inactiveTwitterAccounts = await db.query.xAccounts.findMany({
    where: and(eq(xAccounts.userId, ctx.currentTeamId), eq(xAccounts.isActive, false)),
    columns: {
      id: true,
      xUsername: true,
      xDisplayName: true,
      xAvatarUrl: true,
      refreshFailureReason: true,
      lastRefreshFailureAt: true,
    },
    orderBy: [desc(xAccounts.lastRefreshFailureAt)],
  });

  const linkedInAccounts = await db.query.linkedinAccounts.findMany({
    where: and(eq(linkedinAccounts.userId, ctx.currentTeamId), eq(linkedinAccounts.isActive, true)),
    orderBy: [asc(linkedinAccounts.createdAt)],
  });

  const igAccounts = await db.query.instagramAccounts.findMany({
    where: and(
      eq(instagramAccounts.userId, ctx.currentTeamId),
      eq(instagramAccounts.isActive, true)
    ),
    orderBy: [asc(instagramAccounts.createdAt)],
  });

  const accounts = [
    ...twitterAccounts.map((a) => ({
      id: `twitter:${a.id}`,
      platform: "twitter" as const,
      username: a.xUsername,
      displayName: a.xDisplayName,
      avatarUrl: a.xAvatarUrl,
      isDefault: a.isDefault,
      isActive: true,
      reconnectRequired: false,
      xSubscriptionTier: a.xSubscriptionTier,
    })),
    ...linkedInAccounts.map((a) => ({
      id: `linkedin:${a.id}`,
      platform: "linkedin",
      username: a.linkedinName,
      displayName: a.linkedinName,
      avatarUrl: a.linkedinAvatarUrl,
      isDefault: false,
      isActive: true,
      reconnectRequired: false,
    })),
    ...igAccounts.map((a) => ({
      id: `instagram:${a.id}`,
      platform: "instagram",
      username: a.instagramUsername,
      displayName: a.instagramUsername,
      avatarUrl: a.instagramAvatarUrl,
      isDefault: false,
      isActive: true,
      reconnectRequired: false,
    })),
    // Surface inactive accounts so the frontend can prompt reconnection
    ...inactiveTwitterAccounts.map((a) => ({
      id: `twitter:${a.id}`,
      platform: "twitter" as const,
      username: a.xUsername,
      displayName: a.xDisplayName,
      avatarUrl: a.xAvatarUrl,
      isDefault: false,
      isActive: false,
      reconnectRequired: true,
    })),
  ];

  return Response.json({ accounts });
}
