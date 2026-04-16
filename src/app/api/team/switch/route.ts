import { cookies, headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamMembers } from "@/lib/schema";
import { signTeamCookie, TEAM_COOKIE_NAME, TEAM_COOKIE_MAX_AGE } from "@/lib/team-cookie";

const bodySchema = z.object({
  /** UUID of the team (or the user's own ID for the personal workspace). */
  teamId: z.string().uuid(),
});

/**
 * POST /api/team/switch
 *
 * Switches the active workspace for the current session.
 * - If teamId === session.user.id  → deletes the team cookie (personal workspace)
 * - Otherwise                      → verifies membership, then sets a signed
 *                                    HttpOnly cookie bound to the current user
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid teamId" }, { status: 400 });
  }

  const { teamId } = parsed.data;
  const cookieStore = await cookies();

  // ── Personal workspace ────────────────────────────────────────────────────
  if (teamId === session.user.id) {
    // Clear any existing team cookie — personal workspace is the default.
    cookieStore.delete(TEAM_COOKIE_NAME);
    return Response.json({ success: true });
  }

  // ── Team workspace ────────────────────────────────────────────────────────
  // Verify the requesting user is actually a member of the requested team.
  const membership = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, session.user.id)),
  });

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Sign the cookie with the user's ID so it cannot be replayed cross-user.
  const signedValue = signTeamCookie(session.user.id, teamId);

  cookieStore.set(TEAM_COOKIE_NAME, signedValue, {
    path: "/",
    maxAge: TEAM_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return Response.json({ success: true });
}
