import { nanoid } from "nanoid";
import { requireAdminApi } from "@/lib/admin";
import { db } from "@/lib/db";
import { DEFAULT_FLAGS } from "@/lib/feature-flags";
import { featureFlags } from "@/lib/schema";

// ── GET /api/admin/feature-flags ──────────────────────────────────────────────

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  // Auto-seed defaults if table is empty
  const existing = await db.select().from(featureFlags);

  if (existing.length === 0) {
    await db.insert(featureFlags).values(
      DEFAULT_FLAGS.map((f) => ({
        id: nanoid(),
        key: f.key,
        description: f.description,
        enabled: f.enabled,
      }))
    );
    const seeded = await db.select().from(featureFlags);
    return Response.json({ data: seeded });
  }

  // Upsert any missing defaults (in case new defaults were added)
  const existingKeys = new Set(existing.map((f) => f.key));
  const missing = DEFAULT_FLAGS.filter((f) => !existingKeys.has(f.key));
  if (missing.length > 0) {
    await db.insert(featureFlags).values(
      missing.map((f) => ({
        id: nanoid(),
        key: f.key,
        description: f.description,
        enabled: f.enabled,
      }))
    );
    const updated = await db.select().from(featureFlags);
    return Response.json({ data: updated });
  }

  return Response.json({ data: existing });
}
