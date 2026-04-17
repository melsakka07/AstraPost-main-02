import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";
import { getMonthlyAiUsage } from "@/lib/services/ai-quota";

export async function GET(req: Request) {
  const correlationId = getCorrelationId(req);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return ApiError.unauthorized();
  }

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { plan: true },
  });

  const rateLimit = await checkRateLimit(session.user.id, dbUser?.plan || "free", "ai");
  if (!rateLimit.success) return createRateLimitResponse(rateLimit);

  try {
    const usage = await getMonthlyAiUsage(session.user.id);
    const res = Response.json(usage);
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch {
    return ApiError.internal("Failed to fetch AI usage");
  }
}
