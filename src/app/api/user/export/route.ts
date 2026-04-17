import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

export async function GET(_req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return ApiError.unauthorized();
  }

  const userId = session.user.id;

  // Fetch all user data
  const userData = await db.query.user.findFirst({
    where: eq(user.id, userId),
    with: {
      xAccounts: true,
      posts: {
        with: {
          tweets: {
            with: {
              media: true,
            },
          },
        },
      },
      affiliateLinks: true,
      aiGenerations: true,
      templates: true,
      teamMemberships: true,
      ownedTeamMembers: true,
    },
  });

  if (!userData) {
    return new Response("User not found", { status: 404 });
  }

  // Create a JSON response
  const json = JSON.stringify(userData, null, 2);

  return new Response(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="astrapost-data-${userId}.json"`,
    },
  });
}
