import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { promoCodes } from "@/lib/schema";

const patchSchema = z.object({
  description: z.string().max(500).optional(),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  discountValue: z.number().positive().max(100_000).optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validTo: z.string().datetime().nullable().optional(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  applicablePlans: z.array(z.enum(["free", "pro_monthly", "pro_annual", "agency"])).optional(),
  isActive: z.boolean().optional(),
});

// ── PATCH /api/admin/promo-codes/[id] ─────────────────────────────────────────

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("write");
  if (rl) return rl;

  const { id } = await params;

  const [existing] = await db
    .select({ id: promoCodes.id, deletedAt: promoCodes.deletedAt })
    .from(promoCodes)
    .where(eq(promoCodes.id, id))
    .limit(1);

  if (!existing) return ApiError.notFound("Promo code");
  if (existing.deletedAt) return ApiError.badRequest("Cannot edit a deleted promo code");

  const body = await request.json().catch(() => null);
  if (!body) return ApiError.badRequest("Invalid JSON body");

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

  const data = parsed.data;
  if (Object.keys(data).length === 0) return ApiError.badRequest("No fields to update");

  // Build update payload — convert dates and numbers
  const updatePayload: Record<string, unknown> = {};
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.discountType !== undefined) updatePayload.discountType = data.discountType;
  if (data.discountValue !== undefined) updatePayload.discountValue = String(data.discountValue);
  if (data.validFrom !== undefined)
    updatePayload.validFrom = data.validFrom ? new Date(data.validFrom) : null;
  if (data.validTo !== undefined)
    updatePayload.validTo = data.validTo ? new Date(data.validTo) : null;
  if (data.maxRedemptions !== undefined) updatePayload.maxRedemptions = data.maxRedemptions;
  if (data.applicablePlans !== undefined) updatePayload.applicablePlans = data.applicablePlans;
  if (data.isActive !== undefined) updatePayload.isActive = data.isActive;

  const [updated] = await db
    .update(promoCodes)
    .set(updatePayload)
    .where(eq(promoCodes.id, id))
    .returning();

  logAdminAction({
    adminId: auth.session.user.id,
    action: "promo_update",
    targetType: "promo_code",
    targetId: id,
    details: data,
  });

  return Response.json({ data: updated });
}

// ── DELETE /api/admin/promo-codes/[id] ────────────────────────────────────────

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("destructive");
  if (rl) return rl;

  const { id } = await params;

  const [existing] = await db
    .select({ id: promoCodes.id, deletedAt: promoCodes.deletedAt, code: promoCodes.code })
    .from(promoCodes)
    .where(eq(promoCodes.id, id))
    .limit(1);

  if (!existing) return ApiError.notFound("Promo code");
  if (existing.deletedAt) return ApiError.conflict("Promo code is already deleted");

  // Soft-delete: mark inactive + set deletedAt
  await db
    .update(promoCodes)
    .set({ deletedAt: new Date(), isActive: false })
    .where(eq(promoCodes.id, id));

  logAdminAction({
    adminId: auth.session.user.id,
    action: "promo_delete",
    targetType: "promo_code",
    targetId: id,
    details: { code: existing.code },
  });

  return Response.json({ success: true });
}
