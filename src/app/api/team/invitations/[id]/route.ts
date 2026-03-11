
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamInvitations } from "@/lib/schema";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const invitation = await db.query.teamInvitations.findFirst({
    where: eq(teamInvitations.id, id),
  });

  if (!invitation) {
    return new NextResponse("Invitation not found", { status: 404 });
  }

  if (invitation.teamId !== session.user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  await db.delete(teamInvitations).where(eq(teamInvitations.id, id));

  return NextResponse.json({ success: true });
}
