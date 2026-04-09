import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return ApiError.unauthorized();
  }

  try {
    await db.update(user).set({ onboardingCompleted: true }).where(eq(user.id, session.user.id));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to complete onboarding:", error);
    return ApiError.internal("Failed to complete onboarding");
  }
}
