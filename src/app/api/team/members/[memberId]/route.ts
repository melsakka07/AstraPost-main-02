import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { teamMembers } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

const updateRoleSchema = z.object({
  role: z.enum(["admin", "editor", "viewer"]),
});

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const ctx = await getTeamContext();

    if (!ctx) return ApiError.unauthorized();
    if (!ctx.isOwner && ctx.role !== "admin") {
      return ApiError.forbidden("Only owners and admins can remove members");
    }

    // Get the member to remove
    const memberToRemove = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, ctx.currentTeamId)),
    });

    if (!memberToRemove) {
      return ApiError.notFound("Member not found");
    }

    // Owners cannot be removed
    if (memberToRemove.userId === ctx.currentTeamId) {
      return ApiError.forbidden("Cannot remove the team owner");
    }

    // Admins can only remove editors/viewers, not other admins (unless they are owner)
    if (ctx.role === "admin" && memberToRemove.role === "admin") {
      return ApiError.forbidden("Admins cannot remove other admins");
    }

    await db.delete(teamMembers).where(eq(teamMembers.id, memberId));

    return Response.json({ success: true, message: "Member removed" });
  } catch (error) {
    logger.error("Remove Member Error", { error });
    return ApiError.internal("Internal Server Error");
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const ctx = await getTeamContext();

    if (!ctx) return ApiError.unauthorized();
    if (!ctx.isOwner) {
      // Only owners can change roles for now to keep it simple
      return ApiError.forbidden("Only the team owner can change roles");
    }

    const json = await req.json();
    const { role } = updateRoleSchema.parse(json);

    const memberToUpdate = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, ctx.currentTeamId)),
    });

    if (!memberToUpdate) {
      return ApiError.notFound("Member not found");
    }

    // Cannot change owner's role
    if (memberToUpdate.userId === ctx.currentTeamId) {
      return ApiError.forbidden("Cannot change the team owner's role");
    }

    await db
      .update(teamMembers)
      .set({ role, updatedAt: new Date() })
      .where(eq(teamMembers.id, memberId));

    return Response.json({ success: true, message: "Role updated" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiError.badRequest(error.issues);
    }
    logger.error("Update Role Error", { error });
    return ApiError.internal("Internal Server Error");
  }
}
