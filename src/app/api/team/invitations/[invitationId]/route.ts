import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
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

    if (!ctx) return ApiError.unauthorized();

    if (!ctx.isOwner && ctx.role !== "admin") {
      return ApiError.forbidden("Only owners and admins can revoke invitations");
    }

    const deleted = await db
      .delete(teamInvitations)
      .where(
        and(eq(teamInvitations.id, invitationId), eq(teamInvitations.teamId, ctx.currentTeamId))
      )
      .returning();

    if (deleted.length === 0) {
      return ApiError.notFound("Invitation");
    }

    return Response.json({ success: true, message: "Invitation revoked" });
  } catch (error) {
    logger.error("Revoke Invitation Error", { error });
    return ApiError.internal("Internal Server Error");
  }
}
