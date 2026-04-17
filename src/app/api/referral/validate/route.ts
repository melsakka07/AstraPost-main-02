import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { connection as redis } from "@/lib/queue/client";
import { validateReferralCode } from "@/lib/referral/utils";

// IP-based rate limit: 5 attempts per minute per IP (lightweight lookup)
async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const key = `rl:referral-validate:${ip}`;
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, 60);
    return current <= 5;
  } catch {
    return true;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code } = body;

    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return ApiError.tooManyRequests("Too many requests. Please try again later.");
    }

    if (!code) {
      return ApiError.badRequest("Code is required");
    }

    const referrer = await validateReferralCode(code);

    if (!referrer) {
      return ApiError.notFound("Invalid referral code");
    }

    return Response.json({
      valid: true,
      referrerId: referrer.id,
      referrerName: referrer.name,
    });
  } catch (error) {
    logger.error("Referral validation error", { error });
    return ApiError.internal();
  }
}
