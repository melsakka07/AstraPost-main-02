import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { cache } from "@/lib/cache";
import { db } from "@/lib/db";
import { invalidateFeatureFlag } from "@/lib/feature-flags";
import { featureFlags } from "@/lib/schema";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
});

// ── PATCH /api/admin/feature-flags/[key] ─────────────────────────────────────

export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("write");
  if (rl) return rl;

  const { key } = await params;

  const [flag] = await db
    .select({ id: featureFlags.id })
    .from(featureFlags)
    .where(eq(featureFlags.key, key))
    .limit(1);

  if (!flag) return ApiError.notFound("Feature flag");

  const body = await request.json().catch(() => null);
  if (!body) return ApiError.badRequest("Invalid JSON body");

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

  // Build update object with only provided fields
  const updateData: { enabled?: boolean; rolloutPercentage?: number } = {};
  if (parsed.data.enabled !== undefined) {
    updateData.enabled = parsed.data.enabled;
  }
  if (parsed.data.rolloutPercentage !== undefined) {
    updateData.rolloutPercentage = parsed.data.rolloutPercentage;
  }

  const [updated] = await db
    .update(featureFlags)
    .set(updateData)
    .where(eq(featureFlags.key, key))
    .returning();

  // Bust the in-process cache so the change is reflected immediately
  invalidateFeatureFlag(key);

  // Invalidate Redis cache for all users and global flag cache
  await Promise.all([cache.deletePattern("feature-flags:*"), cache.delete("feature-flags:all")]);

  logAdminAction({
    adminId: auth.session.user.id,
    action: "feature_flag_toggle",
    targetType: "feature_flag",
    targetId: key,
    details: {
      ...(parsed.data.enabled !== undefined && { enabled: parsed.data.enabled }),
      ...(parsed.data.rolloutPercentage !== undefined && {
        rolloutPercentage: parsed.data.rolloutPercentage,
      }),
    },
  });

  return Response.json({ data: updated });
}
