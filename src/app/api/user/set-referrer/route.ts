import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";
import { connection as redis } from "@/lib/queue/client";
import { validateReferralCode, REFERRAL_TRIAL_DAYS } from "@/lib/referral/utils";
import { user } from "@/lib/schema";
import { notifyBillingEvent } from "@/lib/services/notifications";

// IP-based rate limit: 10 attempts per minute per IP
async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const key = `rl:set-referrer:${ip}`;
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, 60);
    return current <= 10;
  } catch {
    return true;
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return ApiError.unauthorized();

    const referralsEnabled = await isFeatureEnabled("referral_program");
    if (!referralsEnabled) return ApiError.badRequest("Referral program is not active");

    const body = await req.json();
    const { referralCode } = body as { referralCode?: string };

    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return Response.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

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

    // Set referrer and extend trial to 21 days from now
    const updates: Record<string, unknown> = { referredBy: referrer.id };

    const extendedTrial = new Date();
    extendedTrial.setDate(extendedTrial.getDate() + REFERRAL_TRIAL_DAYS);
    updates.trialEndsAt = extendedTrial;

    await db.update(user).set(updates).where(eq(user.id, session.user.id));

    await notifyBillingEvent({
      userId: session.user.id,
      type: "referral_trial_extended",
      title: "Extended trial activated!",
      message: `Your referral code gave you ${REFERRAL_TRIAL_DAYS} days of Pro trial. Enjoy!`,
      metadata: { referrerId: referrer.id, referrerName: referrer.name },
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    logger.error("Set referrer error", { error });
    return ApiError.internal();
  }
}
