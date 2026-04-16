import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { analyticsRefreshRuns, user } from "@/lib/schema";

const schema = z.object({
  xAccountId: z.string(),
});

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { plan: true },
  });
  const rlResult = await checkRateLimit(session.user.id, dbUser?.plan || "free", "posts");
  if (!rlResult.success) return createRateLimitResponse(rlResult);

  const url = new URL(req.url);
  const parsed = schema.safeParse({ xAccountId: url.searchParams.get("xAccountId") });
  if (!parsed.success) {
    return ApiError.badRequest("Invalid request");
  }

  const runs = await db.query.analyticsRefreshRuns.findMany({
    where: and(
      eq(analyticsRefreshRuns.userId, session.user.id),
      eq(analyticsRefreshRuns.xAccountId, parsed.data.xAccountId)
    ),
    orderBy: [desc(analyticsRefreshRuns.startedAt)],
    limit: 25,
  });

  return Response.json({
    runs: runs.map((r) => ({
      id: r.id,
      status: r.status,
      error: r.error,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
    })),
  });
}
