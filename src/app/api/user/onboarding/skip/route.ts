import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { user } from "@/lib/schema";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return ApiError.unauthorized();
  }

  try {
    // Mark onboarding as skipped (not completed) — user can resume later
    await db.update(user).set({ onboardingCompleted: false }).where(eq(user.id, session.user.id));

    return Response.json({ success: true });
  } catch (error) {
    logger.error("Failed to skip onboarding", { error });
    return ApiError.internal("Failed to skip onboarding");
  }
}
