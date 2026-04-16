import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { featureFlags } from "@/lib/schema";

const ANNOUNCEMENT_KEY = "_announcement";

const putSchema = z.object({
  text: z.string().min(1).max(500),
  type: z.enum(["info", "warning", "success"]),
  enabled: z.boolean(),
});

export type AnnouncementConfig = z.infer<typeof putSchema>;

async function getAnnouncementFlag() {
  return db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, ANNOUNCEMENT_KEY))
    .limit(1)
    .then((r) => r[0] ?? null);
}

// ── GET /api/admin/announcement ───────────────────────────────────────────────

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    const flag = await getAnnouncementFlag();
    if (!flag) {
      return Response.json({ data: { text: "", type: "info", enabled: false } });
    }

    let config: AnnouncementConfig = { text: "", type: "info", enabled: false };
    try {
      config = { ...JSON.parse(flag.description ?? "{}"), enabled: flag.enabled };
    } catch {
      config = { text: flag.description ?? "", type: "info", enabled: flag.enabled };
    }

    return Response.json({ data: config });
  } catch (err) {
    logger.error("[announcement] GET Error", { error: err });
    return ApiError.internal("Failed to load announcement");
  }
}

// ── PUT /api/admin/announcement ───────────────────────────────────────────────

export async function PUT(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("write");
  if (rl) return rl;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return ApiError.badRequest("Invalid JSON body");

    const parsed = putSchema.safeParse(body);
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { text, type, enabled } = parsed.data;
    const description = JSON.stringify({ text, type });

    const flag = await getAnnouncementFlag();

    if (flag) {
      await db
        .update(featureFlags)
        .set({ description, enabled })
        .where(eq(featureFlags.key, ANNOUNCEMENT_KEY));
    } else {
      await db.insert(featureFlags).values({
        id: nanoid(),
        key: ANNOUNCEMENT_KEY,
        description,
        enabled,
      });
    }

    logAdminAction({
      adminId: auth.session.user.id,
      action: "announcement_update",
      targetType: "feature_flag",
      targetId: ANNOUNCEMENT_KEY,
      details: { text, type, enabled },
    });

    return Response.json({ data: { text, type, enabled } });
  } catch (err) {
    logger.error("[announcement] PUT Error", { error: err });
    return ApiError.internal("Failed to update announcement");
  }
}
