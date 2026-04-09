import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiGenerations } from "@/lib/schema";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const item = await db.query.aiGenerations.findFirst({
      where: eq(aiGenerations.id, id),
    });
    if (item && item.userId !== session.user.id) return new Response("Forbidden", { status: 403 });
    return Response.json({ item });
  }

  const history = await db.query.aiGenerations.findMany({
    where: eq(aiGenerations.userId, session.user.id),
    orderBy: [desc(aiGenerations.createdAt)],
    limit: 50,
  });

  return Response.json({ history });
}
