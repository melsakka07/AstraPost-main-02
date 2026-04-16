import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { teamInvitations } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const { invitationId } = await params;
    const ctx = await getTeamContext();

    if (!ctx) return new Response("Unauthorized", { status: 401 });

    if (!ctx.isOwner && ctx.role !== "admin") {
      return new Response("Forbidden: Only owners and admins can revoke invitations", {
        status: 403,
      });
    }

    const deleted = await db
      .delete(teamInvitations)
      .where(
        and(eq(teamInvitations.id, invitationId), eq(teamInvitations.teamId, ctx.currentTeamId))
      )
      .returning();

    if (deleted.length === 0) {
      return new Response("Invitation not found", { status: 404 });
    }

    return Response.json({ success: true, message: "Invitation revoked" });
  } catch (error) {
    logger.error("Revoke Invitation Error", { error });
    return new Response("Internal Server Error", { status: 500 });
  }
}
