import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateReferralCode, REFERRAL_TRIAL_DAYS } from "@/lib/referral/utils";
import { user } from "@/lib/schema";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return ApiError.unauthorized();

    const body = await req.json();
    const { referralCode } = body as { referralCode?: string };

    if (!referralCode) return ApiError.badRequest("Referral code is required");

    const referrer = await validateReferralCode(referralCode);
    if (!referrer) return ApiError.badRequest("Invalid referral code");

    if (session.user.id === referrer.id) return ApiError.badRequest("Cannot refer yourself");

    // Only set if not already set
    const currentUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { referredBy: true, trialEndsAt: true },
    });

    if (currentUser?.referredBy) return ApiError.badRequest("Referrer already set");

    // Set referrer and optionally extend trial to 21 days
    const updates: Record<string, unknown> = { referredBy: referrer.id };

    if (currentUser?.trialEndsAt && new Date(currentUser.trialEndsAt) > new Date()) {
      const extendedTrial = new Date();
      extendedTrial.setDate(extendedTrial.getDate() + REFERRAL_TRIAL_DAYS);
      updates.trialEndsAt = extendedTrial;
    }

    await db.update(user).set(updates).where(eq(user.id, session.user.id));

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Set referrer error:", error);
    return ApiError.internal();
  }
}
