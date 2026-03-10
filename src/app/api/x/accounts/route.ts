import { headers } from "next/headers";
import { and, asc, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAccountLimit } from "@/lib/middleware/require-plan";
import { xAccounts } from "@/lib/schema";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const canAdd = await checkAccountLimit(session.user.id);
  if (!canAdd) {
    return new Response(JSON.stringify({ error: "upgrade_required" }), { status: 402 });
  }

  // This route is actually for LISTING accounts. 
  // The actual connection happens via BetterAuth OAuth callback which we can't easily intercept here.
  // Wait, `src/app/api/posts/route.ts` creates xAccounts on the fly from linked accounts.
  // We need to enforce this limit where accounts are created or synced.
  // BetterAuth handles OAuth, but we sync to `xAccounts` table in `api/posts` or via a sync endpoint.
  // Let's check `api/x/accounts/sync/route.ts` if it exists.
  
  return new Response("Not Implemented", { status: 501 });
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const accounts = await db.query.xAccounts.findMany({
    where: and(eq(xAccounts.userId, session.user.id), eq(xAccounts.isActive, true)),
    orderBy: [desc(xAccounts.isDefault), asc(xAccounts.createdAt)],
  });

  return Response.json({
    accounts: accounts.map((a) => ({
      id: a.id,
      xUsername: a.xUsername,
      xDisplayName: a.xDisplayName,
      xAvatarUrl: a.xAvatarUrl,
      isDefault: a.isDefault,
    })),
  });
}

