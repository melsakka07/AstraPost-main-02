
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamMembers, user, teamInvitations } from "@/lib/schema";
import { sendEmail } from "@/lib/services/email";

export async function GET(_req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Get members of the team owned by the current user
  const members = await db.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, session.user.id),
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
  });

  // Get pending invitations
  const invitations = await db.query.teamInvitations.findMany({
    where: eq(teamInvitations.teamId, session.user.id),
  });

  return NextResponse.json({ members, invitations });
}

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Check if user is on Agency plan (Logic commented out for now as per requirement)
  // const currentUser = await db.query.user.findFirst({
  //   where: eq(user.id, session.user.id),
  //   columns: { plan: true },
  // });

  // Strict enforcement for Agency plan
  // if (currentUser?.plan !== "agency" && currentUser?.plan !== "agency_annual") {
  //    return new NextResponse("Upgrade to Agency plan to invite team members", { status: 403 });
  // }

  const body = await req.json();
  const validation = inviteSchema.safeParse(body);

  if (!validation.success) {
    return new NextResponse("Invalid request", { status: 400 });
  }

  const { email, role } = validation.data;

  // Find user by email to see if they are already a member
  const targetUser = await db.query.user.findFirst({
      where: eq(user.email, email)
  });

  if (targetUser) {
      // Check if trying to invite yourself
      if (targetUser.id === session.user.id) {
          return new NextResponse("You cannot invite yourself", { status: 400 });
      }

      const isMember = await db.query.teamMembers.findFirst({
          where: and(
              eq(teamMembers.teamId, session.user.id),
              eq(teamMembers.userId, targetUser.id)
          )
      });
      if (isMember) {
          return new NextResponse("User is already a member", { status: 409 });
      }
  }

  // Check if invitation already exists
  const existingInvite = await db.query.teamInvitations.findFirst({
    where: and(
      eq(teamInvitations.teamId, session.user.id),
      eq(teamInvitations.email, email),
      eq(teamInvitations.status, "pending")
    ),
  });

  if (existingInvite) {
    return new NextResponse("Invitation already pending", { status: 409 });
  }

  // Create invitation
  const token = nanoid(32);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  await db.insert(teamInvitations).values({
    id: nanoid(),
    teamId: session.user.id,
    email,
    role,
    token,
    expiresAt: expiresAt,
    status: "pending",
  });

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;
  
  await sendEmail({
    to: email,
    subject: `You've been invited to join ${session.user.name}'s team on AstroPost`,
    text: `You have been invited to join the team. Click here to accept: ${inviteLink}`,
    html: `<p>You have been invited to join <strong>${session.user.name}</strong>'s team on AstroPost.</p><p><a href="${inviteLink}">Click here to accept invitation</a></p>`,
  });

  return NextResponse.json({ success: true, message: "Invitation sent" });
}
