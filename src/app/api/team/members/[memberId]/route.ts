import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
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

    if (!ctx) return new Response("Unauthorized", { status: 401 });
    if (!ctx.isOwner && ctx.role !== "admin") {
      return new Response("Forbidden: Only owners and admins can remove members", { status: 403 });
    }

    // Get the member to remove
    const memberToRemove = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, ctx.currentTeamId)),
    });

    if (!memberToRemove) {
      return new Response("Member not found", { status: 404 });
    }

    // Owners cannot be removed
    if (memberToRemove.userId === ctx.currentTeamId) {
      return new Response("Cannot remove the team owner", { status: 403 });
    }

    // Admins can only remove editors/viewers, not other admins (unless they are owner)
    if (ctx.role === "admin" && memberToRemove.role === "admin") {
      return new Response("Forbidden: Admins cannot remove other admins", { status: 403 });
    }

    await db.delete(teamMembers).where(eq(teamMembers.id, memberId));

    return Response.json({ success: true, message: "Member removed" });
  } catch (error) {
    logger.error("Remove Member Error", { error });
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const ctx = await getTeamContext();

    if (!ctx) return new Response("Unauthorized", { status: 401 });
    if (!ctx.isOwner) {
      // Only owners can change roles for now to keep it simple
      return new Response("Forbidden: Only the team owner can change roles", { status: 403 });
    }

    const json = await req.json();
    const { role } = updateRoleSchema.parse(json);

    const memberToUpdate = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, ctx.currentTeamId)),
    });

    if (!memberToUpdate) {
      return new Response("Member not found", { status: 404 });
    }

    // Cannot change owner's role
    if (memberToUpdate.userId === ctx.currentTeamId) {
      return new Response("Cannot change the team owner's role", { status: 403 });
    }

    await db
      .update(teamMembers)
      .set({ role, updatedAt: new Date() })
      .where(eq(teamMembers.id, memberId));

    return Response.json({ success: true, message: "Role updated" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    logger.error("Update Role Error", { error });
    return new Response("Internal Server Error", { status: 500 });
  }
}
