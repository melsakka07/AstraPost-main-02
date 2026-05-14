import { headers } from "next/headers";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { getCorrelationId } from "@/lib/correlation";
import { getUserPlanType } from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { getMonthlyAiUsage } from "@/lib/services/ai-quota";

export async function GET(req: Request) {
  const correlationId = getCorrelationId(req);
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return ApiError.unauthorized();
  }

  const rateLimit = await checkRateLimit(
    session.user.id,
    await getUserPlanType(session.user.id),
    "ai"
  );
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
