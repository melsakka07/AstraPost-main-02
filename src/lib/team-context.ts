import { headers, cookies } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { teamMembers } from "@/lib/schema";
import { TEAM_COOKIE_NAME, verifyTeamCookie } from "@/lib/team-cookie";

/** The non-null session returned by BetterAuth. */
export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export type TeamContext = {
  currentTeamId: string; // The ID of the user whose workspace we are accessing (could be self)
  role: "owner" | "admin" | "editor" | "viewer";
  isOwner: boolean;
  /** The authenticated session — available to callers so they don't need a second getSession() call. */
  session: AuthSession;
};

/**
 * Resolves the current team context based on the session and request headers/cookies.
 * If no specific team is requested, it defaults to the user's personal workspace.
 */
export async function getTeamContext(): Promise<TeamContext | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(TEAM_COOKIE_NAME)?.value;

  // Verify HMAC signature — an absent or tampered cookie falls back to
  // the personal workspace.  We log a warning on tampering so ops can spot
  // cookie-manipulation probing in the logs.
  let requestedTeamId: string | null = null;
  if (rawCookie) {
    requestedTeamId = verifyTeamCookie(rawCookie, session.user.id);
    if (!requestedTeamId) {
      logger.warn("team_cookie_invalid", {
        userId: session.user.id,
        hint: "HMAC verification failed — falling back to personal workspace",
      });
    }
  }

  // Default to personal workspace
  if (!requestedTeamId || requestedTeamId === session.user.id) {
    return {
      currentTeamId: session.user.id,
      role: "owner",
      isOwner: true,
      session,
    };
  }

  // Check membership
  const membership = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, requestedTeamId), eq(teamMembers.userId, session.user.id)),
  });

  if (!membership) {
    // Fallback to personal workspace if access denied or invalid team
    return {
      currentTeamId: session.user.id,
      role: "owner",
      isOwner: true,
      session,
    };
  }

  return {
    currentTeamId: requestedTeamId,
    role: membership.role as "owner" | "admin" | "editor" | "viewer",
    isOwner: false,
    session,
  };
}
