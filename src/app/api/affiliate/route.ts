import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { affiliateLinks } from "@/lib/schema";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const links = await db.query.affiliateLinks.findMany({
      where: eq(affiliateLinks.userId, session.user.id),
      orderBy: [desc(affiliateLinks.createdAt)],
      limit: 50,
    });

    return Response.json(links);
  } catch (error) {
    console.error("Failed to fetch affiliate links:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch affiliate history" }), { status: 500 });
  }
}
