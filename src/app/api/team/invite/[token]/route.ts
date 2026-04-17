import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamInvitations, teamMembers } from "@/lib/schema";

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return ApiError.unauthorized();
  }

  const { token } = await params;

  // 1. Validate token
  const invitation = await db.query.teamInvitations.findFirst({
    where: and(eq(teamInvitations.token, token), eq(teamInvitations.status, "pending")),
  });

  if (!invitation) {
    return ApiError.notFound("Invitation");
  }

  if (new Date() > invitation.expiresAt) {
    return ApiError.badRequest("Invitation expired");
  }

  // 2. Check if user email matches (optional security check, usually good practice)
  if (session.user.email !== invitation.email) {
    return ApiError.forbidden("This invitation was sent to a different email address");
  }

  // 3. Create membership
  // Check if already member
  const existingMember = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, invitation.teamId), eq(teamMembers.userId, session.user.id)),
  });

  if (!existingMember) {
    await db.insert(teamMembers).values({
      id: nanoid(),
      userId: session.user.id,
      teamId: invitation.teamId,
      role: invitation.role,
      joinedAt: new Date(),
    });
  }

  // 4. Delete/Update invitation
  await db.delete(teamInvitations).where(eq(teamInvitations.id, invitation.id));

  return Response.json({ success: true, teamId: invitation.teamId });
}
