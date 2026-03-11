
import { headers, cookies } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamMembers } from "@/lib/schema";

export type TeamContext = {
  currentTeamId: string; // The ID of the user whose workspace we are accessing (could be self)
  role: "owner" | "admin" | "editor" | "viewer";
  isOwner: boolean;
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
  const requestedTeamId = cookieStore.get("current-team-id")?.value;

  // Default to personal workspace
  if (!requestedTeamId || requestedTeamId === session.user.id) {
    return {
      currentTeamId: session.user.id,
      role: "owner",
      isOwner: true,
    };
  }

  // Check membership
  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, requestedTeamId),
      eq(teamMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    // Fallback to personal workspace if access denied or invalid team
    return {
      currentTeamId: session.user.id,
      role: "owner",
      isOwner: true,
    };
  }

  return {
    currentTeamId: requestedTeamId,
    role: membership.role as "owner" | "admin" | "editor" | "viewer",
    isOwner: false,
  };
}
