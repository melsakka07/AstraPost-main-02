import { NextRequest } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { teamInvitations, teamMembers } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

export async function GET(_req: NextRequest) {
  try {
    const ctx = await getTeamContext();
    if (!ctx) return new Response("Unauthorized", { status: 401 });

    // Fetch members with user details
    const members = await db.query.teamMembers.findMany({
      where: eq(teamMembers.teamId, ctx.currentTeamId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: desc(teamMembers.joinedAt),
    });

    // Fetch pending invitations
    const invitations = await db.query.teamInvitations.findMany({
      where: and(
        eq(teamInvitations.teamId, ctx.currentTeamId),
        eq(teamInvitations.status, "pending")
      ),
      orderBy: desc(teamInvitations.createdAt),
    });

    return Response.json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      invitations: invitations.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        status: i.status,
        createdAt: i.createdAt,
      })),
    });
  } catch (error) {
    logger.error("Fetch Members Error", { error });
    return new Response("Internal Server Error", { status: 500 });
  }
}
