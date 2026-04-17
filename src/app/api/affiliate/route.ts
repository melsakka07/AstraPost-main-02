import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { affiliateLinks, user } from "@/lib/schema";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return ApiError.unauthorized();
    }

    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { plan: true },
    });

    const rateLimit = await checkRateLimit(session.user.id, dbUser?.plan || "free", "auth");
    if (!rateLimit.success) return createRateLimitResponse(rateLimit);

    const links = await db.query.affiliateLinks.findMany({
      where: eq(affiliateLinks.userId, session.user.id),
      orderBy: [desc(affiliateLinks.createdAt)],
      limit: 50,
    });

    return Response.json(links);
  } catch (error) {
    logger.error("Failed to fetch affiliate links", { error });
    return ApiError.internal("Failed to fetch affiliate history");
  }
}
