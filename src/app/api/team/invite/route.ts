import { NextRequest } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getPlanLimits, normalizePlan } from "@/lib/plan-limits";
import { teamInvitations, teamMembers, user } from "@/lib/schema";
import { sendTeamInvitationEmail } from "@/lib/services/email";
import { getTeamContext } from "@/lib/team-context";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]).default("viewer"),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTeamContext();
    if (!ctx) return new Response("Unauthorized", { status: 401 });

    if (!ctx.isOwner && ctx.role !== "admin") {
      return ApiError.forbidden("Only owners and admins can invite members");
    }

    // Parse body
    const json = await req.json();
    const { email, role } = inviteSchema.parse(json);

    // Check plan limits
    const owner = await db.query.user.findFirst({
      where: eq(user.id, ctx.currentTeamId),
      columns: { plan: true, name: true },
    });

    const plan = normalizePlan(owner?.plan);
    const limits = getPlanLimits(plan);

    if (limits.maxTeamMembers === null) {
      return ApiError.forbidden("Team members are only available on the Agency plan.");
    }

    // Count current members + pending invitations
    const membersCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, ctx.currentTeamId));

    const invitesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(teamInvitations)
      .where(
        and(eq(teamInvitations.teamId, ctx.currentTeamId), eq(teamInvitations.status, "pending"))
      );

    const totalUsed = Number(membersCount[0]?.count ?? 0) + Number(invitesCount[0]?.count ?? 0);

    if (totalUsed >= limits.maxTeamMembers) {
      return ApiError.forbidden(
        `You have reached the maximum of ${limits.maxTeamMembers} team members.`
      );
    }

    // Check if invitation exists
    const existingInvite = await db.query.teamInvitations.findFirst({
      where: and(
        eq(teamInvitations.teamId, ctx.currentTeamId),
        eq(teamInvitations.email, email),
        eq(teamInvitations.status, "pending")
      ),
    });

    if (existingInvite) {
      return ApiError.conflict("Invitation already pending for this email");
    }

    // Create invitation
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    await db.insert(teamInvitations).values({
      id: crypto.randomUUID(),
      teamId: ctx.currentTeamId,
      email,
      role,
      token,
      expiresAt,
      status: "pending",
    });

    // Send email
    await sendTeamInvitationEmail(email, token, owner?.name || "AstraPost Team");

    return Response.json({ success: true, message: "Invitation sent" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }

    logger.error("Invite Error", { error });
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
