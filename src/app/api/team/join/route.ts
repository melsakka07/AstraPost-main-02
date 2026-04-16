import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { teamInvitations, teamMembers } from "@/lib/schema";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { token } = await req.json();

    if (!token) {
      return new Response("Token is required", { status: 400 });
    }

    const invitation = await db.query.teamInvitations.findFirst({
      where: eq(teamInvitations.token, token),
    });

    if (!invitation) {
      return new Response("Invalid invitation token", { status: 404 });
    }

    if (invitation.status !== "pending") {
      return new Response("Invitation is no longer valid", { status: 400 });
    }

    if (new Date() > invitation.expiresAt) {
      return new Response("Invitation has expired", { status: 400 });
    }

    // Optional: Enforce email match
    // if (invitation.email !== session.user.email) {
    //   return new Response("This invitation was sent to a different email address.", { status: 403 });
    // }

    // Check if already a member
    const existingMember = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, invitation.teamId),
        eq(teamMembers.userId, session.user.id)
      ),
    });

    if (existingMember) {
      // Already a member, just clean up invite
      await db
        .update(teamInvitations)
        .set({ status: "accepted" })
        .where(eq(teamInvitations.id, invitation.id));

      return Response.json({ success: true, message: "You are already a member of this team." });
    }

    // Add to team
    await db.insert(teamMembers).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      teamId: invitation.teamId,
      role: invitation.role,
    });

    // Update invitation status
    await db
      .update(teamInvitations)
      .set({ status: "accepted" })
      .where(eq(teamInvitations.id, invitation.id));

    return Response.json({ success: true, message: "Joined team successfully" });
  } catch (error) {
    logger.error("Join Team Error", { error });
    return new Response("Internal Server Error", { status: 500 });
  }
}
