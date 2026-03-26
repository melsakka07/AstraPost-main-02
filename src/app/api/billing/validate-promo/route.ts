import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { redis } from "@/lib/rate-limiter";
import { promoCodes } from "@/lib/schema";

const schema = z.object({
  code: z.string().min(1).max(50),
  plan: z.enum(["free", "pro_monthly", "pro_annual", "agency", "agency_monthly", "agency_annual"]).optional(),
});

// Simple IP-based rate limit: 20 attempts per minute
async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const key = `rl:validate-promo:${ip}`;
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, 60);
    return current <= 20;
  } catch {
    return true; // fail open if Redis is unavailable
  }
}

// ── POST /api/billing/validate-promo ─────────────────────────────────────────

export async function POST(request: Request) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return ApiError.badRequest("Invalid JSON body");

  const parsed = schema.safeParse(body);
  if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

  const { code, plan } = parsed.data;
  const upperCode = code.toUpperCase();

  // Look up the promo code
  const [promo] = await db
    .select()
    .from(promoCodes)
    .where(and(eq(promoCodes.code, upperCode), isNull(promoCodes.deletedAt)))
    .limit(1);

  if (!promo) return ApiError.notFound("Promo code");

  const now = new Date();

  // Validity checks
  if (!promo.isActive) {
    return Response.json({ valid: false, reason: "This promo code is no longer active" }, { status: 200 });
  }
  if (promo.validFrom && new Date(promo.validFrom) > now) {
    return Response.json({ valid: false, reason: "This promo code is not yet valid" }, { status: 200 });
  }
  if (promo.validTo && new Date(promo.validTo) < now) {
    return Response.json({ valid: false, reason: "This promo code has expired" }, { status: 200 });
  }
  if (promo.maxRedemptions !== null && promo.redemptionsCount >= promo.maxRedemptions) {
    return Response.json({ valid: false, reason: "This promo code has reached its maximum redemptions" }, { status: 200 });
  }

  // Check plan applicability (empty array = all plans)
  const applicable = promo.applicablePlans as string[];
  if (applicable.length > 0 && plan) {
    // Normalise agency variants
    const normPlan = plan === "agency_monthly" || plan === "agency_annual" ? "agency" : plan;
    if (!applicable.includes(normPlan)) {
      return Response.json({ valid: false, reason: "This promo code is not valid for the selected plan" }, { status: 200 });
    }
  }

  return Response.json({
    valid: true,
    code: promo.code,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    stripeCouponId: promo.stripeCouponId,
    description: promo.description,
  });
}
