import { headers } from "next/headers";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { followerSnapshots } from "@/lib/schema";

const schema = z.object({
  xAccountId: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const parsed = schema.safeParse({
    xAccountId: url.searchParams.get("xAccountId"),
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
  });
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }

  const from = parsed.data.from
    ? new Date(parsed.data.from)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = parsed.data.to ? new Date(parsed.data.to) : new Date();

  const points = await db.query.followerSnapshots.findMany({
    where: and(
      eq(followerSnapshots.userId, session.user.id),
      eq(followerSnapshots.xAccountId, parsed.data.xAccountId),
      gte(followerSnapshots.capturedAt, from),
      lte(followerSnapshots.capturedAt, to)
    ),
    orderBy: [asc(followerSnapshots.capturedAt)],
    limit: 500,
  });

  const latest = points.length > 0 ? points[points.length - 1] : null;

  return Response.json({
    xAccountId: parsed.data.xAccountId,
    points: points.map((p) => ({
      capturedAt: p.capturedAt.toISOString(),
      followersCount: p.followersCount,
    })),
    latest: latest
      ? { capturedAt: latest.capturedAt.toISOString(), followersCount: latest.followersCount }
      : null,
  });
}
