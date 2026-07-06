import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { archiveItem } from "@/lib/services/inbox";
import { getTeamContext } from "@/lib/team-context";

// ── PATCH /api/inbox/[id]/archive — Archive a single inbox item

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_req: Request, context: RouteContext) {
  try {
    // 1. Auth
    const ctx = await getTeamContext();
    if (!ctx) {
      return ApiError.unauthorized();
    }

    // 2. Role check — viewers cannot mutate
    if (ctx.role === "viewer") {
      return ApiError.forbidden("Viewers cannot archive items");
    }

    // 3. Parse params
    const { id } = await context.params;

    // 4. Business logic — no rate limit, no plan gate (free-tier feature)
    await archiveItem(id, ctx.currentTeamId);

    return new Response(null, { status: 200 });
  } catch (error) {
    logger.error("inbox_archive_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to archive item");
  }
}
