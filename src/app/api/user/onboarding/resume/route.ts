import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getUserPlanType } from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return ApiError.unauthorized();
  }

  const rateLimit = await checkRateLimit(
    session.user.id,
    await getUserPlanType(session.user.id),
    "auth"
  );
  if (!rateLimit.success) return createRateLimitResponse(rateLimit);

  try {
    await db
      .update(user)
      .set({ onboardingCompleted: false, onboardingSkippedAt: null })
      .where(eq(user.id, session.user.id));
    return Response.json({ success: true });
  } catch (error) {
    logger.error("Failed to resume onboarding", { error });
    return ApiError.internal("Failed to resume onboarding");
  }
}
