import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { invalidateFeatureFlag } from "@/lib/feature-flags";
import { featureFlags } from "@/lib/schema";

const patchSchema = z.object({
  enabled: z.boolean(),
});

// ── PATCH /api/admin/feature-flags/[key] ─────────────────────────────────────

export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

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

  const [updated] = await db
    .update(featureFlags)
    .set({ enabled: parsed.data.enabled })
    .where(eq(featureFlags.key, key))
    .returning();

  // Bust the in-process cache so the change is reflected immediately
  invalidateFeatureFlag(key);

  return Response.json({ data: updated });
}
