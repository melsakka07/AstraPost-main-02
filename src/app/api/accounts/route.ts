import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { xAccounts, linkedinAccounts, instagramAccounts } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

export async function GET() {
  const ctx = await getTeamContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const twitterAccounts = await db.query.xAccounts.findMany({
    where: and(eq(xAccounts.userId, ctx.currentTeamId), eq(xAccounts.isActive, true)),
    orderBy: [desc(xAccounts.isDefault), asc(xAccounts.createdAt)],
  });

  const linkedInAccounts = await db.query.linkedinAccounts.findMany({
    where: and(eq(linkedinAccounts.userId, ctx.currentTeamId), eq(linkedinAccounts.isActive, true)),
    orderBy: [asc(linkedinAccounts.createdAt)],
  });

  const igAccounts = await db.query.instagramAccounts.findMany({
    where: and(eq(instagramAccounts.userId, ctx.currentTeamId), eq(instagramAccounts.isActive, true)),
    orderBy: [asc(instagramAccounts.createdAt)],
  });

  const accounts = [
      ...twitterAccounts.map(a => ({
          id: `twitter:${a.id}`,
          platform: 'twitter' as const,
          username: a.xUsername,
          displayName: a.xDisplayName,
          avatarUrl: a.xAvatarUrl,
          isDefault: a.isDefault,
          xSubscriptionTier: a.xSubscriptionTier
      })),
      ...linkedInAccounts.map(a => ({
          id: `linkedin:${a.id}`,
          platform: 'linkedin',
          username: a.linkedinName,
          displayName: a.linkedinName,
          avatarUrl: a.linkedinAvatarUrl,
          isDefault: false
      })),
      ...igAccounts.map(a => ({
          id: `instagram:${a.id}`,
          platform: 'instagram',
          username: a.instagramUsername,
          displayName: a.instagramUsername,
          avatarUrl: a.instagramAvatarUrl,
          isDefault: false
      }))
  ];

  return Response.json({ accounts });
}
