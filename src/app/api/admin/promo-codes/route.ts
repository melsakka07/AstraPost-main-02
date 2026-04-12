import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { promoCodes } from "@/lib/schema";
import { stripe } from "@/lib/stripe";

const createSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(50)
    .toUpperCase()
    .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase letters, numbers, hyphens, or underscores"),
  description: z.string().max(500).optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().positive().max(100_000),
  validFrom: z.string().datetime({ offset: true, local: true }).optional(),
  validTo: z.string().datetime({ offset: true, local: true }).optional(),
  maxRedemptions: z.number().int().positive().optional(),
  applicablePlans: z.array(z.enum(["free", "pro_monthly", "pro_annual", "agency"])).default([]),
  isActive: z.boolean().default(true),
});

// ── GET /api/admin/promo-codes ────────────────────────────────────────────────

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    const rows = await db
      .select()
      .from(promoCodes)
      .where(isNull(promoCodes.deletedAt))
      .orderBy(desc(promoCodes.createdAt));

    return Response.json({ data: rows });
  } catch (err) {
    console.error("[promo-codes] Error:", err);
    return ApiError.internal("Failed to load promo codes");
  }
}

// ── POST /api/admin/promo-codes ───────────────────────────────────────────────

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return ApiError.badRequest("Invalid JSON body");

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const data = parsed.data;

    // Check for duplicate code
    const existing = await db
      .select({ id: promoCodes.id })
      .from(promoCodes)
      .where(and(eq(promoCodes.code, data.code), isNull(promoCodes.deletedAt)))
      .limit(1);

    if (existing.length > 0) return ApiError.conflict(`Promo code "${data.code}" already exists`);

    // Create Stripe coupon if Stripe is configured
    let stripeCouponId: string | null = null;
    if (stripe) {
      try {
        const coupon = await stripe.coupons.create({
          id: `ASTRAPOST_${data.code}`,
          name: data.code,
          ...(data.discountType === "percentage"
            ? { percent_off: data.discountValue }
            : { amount_off: Math.round(data.discountValue * 100), currency: "usd" }),
          ...(data.validTo
            ? { redeem_by: Math.floor(new Date(data.validTo).getTime() / 1000) }
            : {}),
          ...(data.maxRedemptions ? { max_redemptions: data.maxRedemptions } : {}),
          metadata: { source: "astrapost_admin", code: data.code },
        });
        stripeCouponId = coupon.id;
      } catch (err: unknown) {
        // Coupon with that ID may already exist in Stripe — attempt to retrieve it
        if ((err as { code?: string }).code === "resource_already_exists") {
          stripeCouponId = `ASTRAPOST_${data.code}`;
        } else {
          console.error("[promo-codes] Stripe coupon creation failed", err);
          // Don't block DB creation — Stripe coupon can be created manually
        }
      }
    }

    const [created] = await db
      .insert(promoCodes)
      .values({
        id: crypto.randomUUID(),
        code: data.code,
        description: data.description ?? null,
        discountType: data.discountType,
        discountValue: String(data.discountValue),
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
        maxRedemptions: data.maxRedemptions ?? null,
        applicablePlans: data.applicablePlans,
        isActive: data.isActive,
        stripeCouponId,
        createdBy: auth.session.user.id,
      })
      .returning();

    logAdminAction({
      adminId: auth.session.user.id,
      action: "promo_create",
      targetType: "promo_code",
      targetId: created!.id,
      details: {
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
      },
    });

    return Response.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error("[promo-codes] Error:", err);
    return ApiError.internal("Failed to create promo code");
  }
}
