
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamMembers } from "@/lib/schema";

// DELETE: Remove a member
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

  // Ensure the current user is the owner of the team
  // The member ID passed is the `teamMembers.id` (pk), not userId
  const memberRecord = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.id, id),
  });

  if (!memberRecord) {
    return new NextResponse("Member not found", { status: 404 });
  }

  if (memberRecord.teamId !== session.user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  await db.delete(teamMembers).where(eq(teamMembers.id, id));

  return NextResponse.json({ success: true });
}

const updateRoleSchema = z.object({
  role: z.enum(["admin", "editor", "viewer"]),
});

// PATCH: Update member role
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const validation = updateRoleSchema.safeParse(body);

  if (!validation.success) {
    return new NextResponse("Invalid request", { status: 400 });
  }

  const { role } = validation.data;

  // Ensure owner
  const memberRecord = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.id, id),
  });

  if (!memberRecord) {
    return new NextResponse("Member not found", { status: 404 });
  }

  if (memberRecord.teamId !== session.user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  await db
    .update(teamMembers)
    .set({ role })
    .where(eq(teamMembers.id, id));

  return NextResponse.json({ success: true });
}
