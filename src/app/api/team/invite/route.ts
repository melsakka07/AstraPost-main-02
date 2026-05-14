import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  checkTeamMemberLimitDetailed,
  createPlanLimitResponse,
} from "@/lib/middleware/require-plan";
import { teamInvitations, user } from "@/lib/schema";
import { sendTeamInvitationEmail } from "@/lib/services/email";
import { getTeamContext } from "@/lib/team-context";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]).default("viewer"),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTeamContext();
    if (!ctx) return ApiError.unauthorized();

    if (!ctx.isOwner && ctx.role !== "admin") {
      return ApiError.forbidden("Only owners and admins can invite members");
    }

    // Parse and validate body
    const json = await req.json();
    const parsed = inviteSchema.safeParse(json);

    if (!parsed.success) {
      logger.info("team_invite_validation_failed", {
        userId: ctx.session.user.id,
        teamId: ctx.currentTeamId,
        errors: parsed.error.issues,
      });
      return ApiError.badRequest(parsed.error.issues);
    }

    const { email, role } = parsed.data;

    // Plan gate — team members require Agency plan + under limit
    const teamGate = await checkTeamMemberLimitDetailed(ctx.currentTeamId);
    if (!teamGate.allowed) return createPlanLimitResponse(teamGate);

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

    // Fetch owner name for email and invitee's language preference
    const [ownerRow, invitee] = await Promise.all([
      db.query.user.findFirst({
        where: eq(user.id, ctx.currentTeamId),
        columns: { name: true },
      }),
      db.query.user.findFirst({
        where: eq(user.email, email),
        columns: { language: true },
      }),
    ]);

    // Send email
    await sendTeamInvitationEmail(
      email,
      token,
      ownerRow?.name || "AstraPost Team",
      invitee?.language || "en"
    );

    logger.info("team_invite_created", {
      userId: ctx.session.user.id,
      teamId: ctx.currentTeamId,
      invitedEmail: email,
      role,
    });

    return Response.json({ success: true, message: "Invitation sent" });
  } catch (error: any) {
    logger.error("team_invite_error", { error });
    return ApiError.internal("Internal Server Error");
  }
}
