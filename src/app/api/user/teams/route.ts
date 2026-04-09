import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teamMembers } from "@/lib/schema";

export async function GET(_req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 1. Get teams where the user is a member
  const memberships = await db.query.teamMembers.findMany({
    where: eq(teamMembers.userId, session.user.id),
    with: {
      team: {
        // This is the relations name in schema.ts "team" -> references user (owner)
        columns: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  // 2. Format the response
  // Include personal workspace (the user themselves)
  const personalTeam = {
    id: session.user.id,
    name: "Personal Workspace", // or session.user.name + "'s Workspace"
    image: session.user.image,
    role: "owner",
    isPersonal: true,
  };

  const teams = memberships.map((m) => ({
    id: m.teamId,
    name: m.team.name + "'s Team",
    image: m.team.image,
    role: m.role,
    isPersonal: false,
  }));

  return NextResponse.json([personalTeam, ...teams]);
}
