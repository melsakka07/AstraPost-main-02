import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { markAsRead } from "@/lib/services/inbox";
import { getTeamContext } from "@/lib/team-context";

// ── PATCH /api/inbox/[id]/read — Mark a single inbox item as read

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
      return ApiError.forbidden("Viewers cannot mark items as read");
    }

    // 3. Parse params
    const { id } = await context.params;

    // 4. Business logic — no rate limit, no plan gate (free-tier feature)
    await markAsRead(id, ctx.currentTeamId);

    return new Response(null, { status: 200 });
  } catch (error) {
    logger.error("inbox_mark_read_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to mark item as read");
  }
}
