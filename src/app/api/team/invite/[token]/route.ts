import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamInvitations, teamMembers } from "@/lib/schema";

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { token } = await params;

  // 1. Validate token
  const invitation = await db.query.teamInvitations.findFirst({
    where: and(eq(teamInvitations.token, token), eq(teamInvitations.status, "pending")),
  });

  if (!invitation) {
    return new NextResponse("Invalid or expired invitation", { status: 404 });
  }

  if (new Date() > invitation.expiresAt) {
    return new NextResponse("Invitation expired", { status: 400 });
  }

  // 2. Check if user email matches (optional security check, usually good practice)
  if (session.user.email !== invitation.email) {
    return new NextResponse("This invitation was sent to a different email address", {
      status: 403,
    });
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

  return NextResponse.json({ success: true, teamId: invitation.teamId });
}
