import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { aiGenerations, user } from "@/lib/schema";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return ApiError.unauthorized();

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { plan: true },
  });

  const rateLimit = await checkRateLimit(session.user.id, dbUser?.plan || "free", "ai");
  if (!rateLimit.success) return createRateLimitResponse(rateLimit);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const item = await db.query.aiGenerations.findFirst({
      where: eq(aiGenerations.id, id),
    });
    if (item && item.userId !== session.user.id) return ApiError.forbidden();
    return Response.json({ item });
  }

  const history = await db.query.aiGenerations.findMany({
    where: eq(aiGenerations.userId, session.user.id),
    orderBy: [desc(aiGenerations.createdAt)],
    limit: 50,
  });

  return Response.json({ history });
}
