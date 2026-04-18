import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { promoCodes, promoCodeRedemptions } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

const validateSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
});

// ── POST /api/billing/promo-code/validate ───────────────────────────────────
/**
 * Validate a promo code and check if the user can apply it.
 *
 * Returns:
 * - 200 { valid: true, discount: {...}, appliesTo: [...] } if code is valid
 * - 400 if code is expired, max redemptions reached, or user already used it
 * - 404 if code doesn't exist
 */
export async function POST(request: Request) {
  const ctx = await getTeamContext();
  if (!ctx) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body) return ApiError.badRequest("Invalid JSON body");

    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { code } = parsed.data;

    // 1. Check if code exists
    const promoCode = await db.query.promoCodes.findFirst({
      where: and(eq(promoCodes.code, code), isNull(promoCodes.deletedAt)),
      columns: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
        validFrom: true,
        validTo: true,
        maxRedemptions: true,
        redemptionsCount: true,
        applicablePlans: true,
        isActive: true,
      },
    });

    if (!promoCode) {
      return ApiError.notFound("Promo code");
    }

    // 2. Check if code is active
    if (!promoCode.isActive) {
      return ApiError.badRequest("This promo code is no longer active");
    }

    // 3. Check if code is expired
    const now = new Date();
    if (promoCode.validFrom && promoCode.validFrom > now) {
      return ApiError.badRequest("This promo code is not yet valid");
    }
    if (promoCode.validTo && promoCode.validTo < now) {
      return ApiError.badRequest("This promo code has expired");
    }

    // 4. Check if max redemptions exceeded
    if (promoCode.maxRedemptions && promoCode.redemptionsCount >= promoCode.maxRedemptions) {
      return ApiError.badRequest("This promo code has reached its redemption limit");
    }

    // 5. Check if user already used this code
    const previousRedemption = await db.query.promoCodeRedemptions.findFirst({
      where: and(
        eq(promoCodeRedemptions.promoCodeId, promoCode.id),
        eq(promoCodeRedemptions.userId, ctx.currentTeamId)
      ),
      columns: { id: true },
    });

    if (previousRedemption) {
      return ApiError.badRequest("You have already used this promo code");
    }

    return Response.json({
      valid: true,
      code: {
        id: promoCode.id,
        code: promoCode.code,
        discount: {
          type: promoCode.discountType,
          value: parseFloat(promoCode.discountValue),
        },
        appliesTo:
          !promoCode.applicablePlans || promoCode.applicablePlans.length === 0
            ? "all"
            : promoCode.applicablePlans,
      },
    });
  } catch (err) {
    logger.error("[promo-code-validate] Error", { error: err });
    return ApiError.internal("Failed to validate promo code");
  }
}
