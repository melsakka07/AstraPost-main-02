import { count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { teamMembers, teamInvitations, user } from "@/lib/schema";

// ── Query params schema ───────────────────────────────────────────────────────

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  tab: z.enum(["teams", "invitations"]).default("teams"),
});

// ── GET /api/admin/teams ───────────────────────────────────────────────────────

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    const { page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    // Run all summary queries in parallel
    const [[totalTeamsRow], [totalMembersRow], [pendingInvitesRow], [expiredInvitesRow]] =
      await Promise.all([
        // Total teams = distinct teamId where role = 'admin' (team owners)
        db
          .select({ value: sql<number>`count(distinct ${teamMembers.teamId})` })
          .from(teamMembers)
          .where(eq(teamMembers.role, "admin")),
        // Total team members = count all teamMembers
        db.select({ value: count() }).from(teamMembers),
        // Pending invitations
        db
          .select({ value: count() })
          .from(teamInvitations)
          .where(eq(teamInvitations.status, "pending")),
        // Expired invitations
        db
          .select({ value: count() })
          .from(teamInvitations)
          .where(eq(teamInvitations.status, "expired")),
      ]);

    const summary = {
      totalTeams: Number(totalTeamsRow?.value ?? 0),
      totalMembers: Number(totalMembersRow?.value ?? 0),
      pendingInvitations: Number(pendingInvitesRow?.value ?? 0),
      expiredInvitations: Number(expiredInvitesRow?.value ?? 0),
    };

    // Fetch teams list (paginated)
    // Each team: owner name/email, member count, plan
    const teamsCountResult = await db
      .select({ teamId: teamMembers.teamId, memberCount: count() })
      .from(teamMembers)
      .where(eq(teamMembers.role, "admin"))
      .groupBy(teamMembers.teamId);

    const totalTeams = teamsCountResult.length;
    const teamsPaginated = teamsCountResult
      .sort((a, b) => Number(b.memberCount) - Number(a.memberCount))
      .slice(offset, offset + limit);

    const teamsData = await Promise.all(
      teamsPaginated.map(async (t) => {
        const [owner] = await db
          .select({ id: user.id, name: user.name, email: user.email, plan: user.plan })
          .from(user)
          .where(eq(user.id, t.teamId))
          .limit(1);

        return {
          teamId: t.teamId,
          owner: owner?.name ?? "Unknown",
          ownerEmail: owner?.email ?? "Unknown",
          plan: owner?.plan ?? "free",
          memberCount: Number(t.memberCount),
        };
      })
    );

    // Fetch pending invitations (paginated)
    const pendingInvitesCountResult = await db
      .select({ value: count() })
      .from(teamInvitations)
      .where(eq(teamInvitations.status, "pending"));

    const totalPendingInvites = Number(pendingInvitesCountResult[0]?.value ?? 0);

    const invitationsRaw = await db
      .select({
        id: teamInvitations.id,
        email: teamInvitations.email,
        role: teamInvitations.role,
        teamId: teamInvitations.teamId,
        expiresAt: teamInvitations.expiresAt,
        createdAt: teamInvitations.createdAt,
        status: teamInvitations.status,
      })
      .from(teamInvitations)
      .orderBy(desc(teamInvitations.createdAt))
      .limit(limit)
      .offset(offset);

    const invitationsData = await Promise.all(
      invitationsRaw.map(async (inv) => {
        const [owner] = await db
          .select({ name: user.name, email: user.email })
          .from(user)
          .where(eq(user.id, inv.teamId))
          .limit(1);

        return {
          id: inv.id,
          email: inv.email,
          role: inv.role,
          teamOwner: owner?.name ?? "Unknown",
          teamOwnerEmail: owner?.email ?? "Unknown",
          expiresAt: inv.expiresAt.toISOString(),
          createdAt: inv.createdAt.toISOString(),
          status: inv.status,
        };
      })
    );

    return Response.json({
      summary,
      teams: {
        data: teamsData,
        pagination: {
          page,
          limit,
          total: totalTeams,
          totalPages: Math.ceil(totalTeams / limit),
        },
      },
      invitations: {
        data: invitationsData,
        pagination: {
          page,
          limit,
          total: totalPendingInvites,
          totalPages: Math.ceil(totalPendingInvites / limit),
        },
      },
    });
  } catch (err) {
    logger.error("[teams] Error", { error: err });
    return ApiError.internal("Failed to load team analytics");
  }
}
