import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { getUnreadCount } from "@/lib/services/inbox";
import { getTeamContext } from "@/lib/team-context";

// ── GET /api/inbox/unread-count — Lightweight badge polling (no rate limit, no plan gate)

const querySchema = z.object({
  accountId: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    // 1. Auth
    const ctx = await getTeamContext();
    if (!ctx) {
      return ApiError.unauthorized();
    }

    // 2. Role check — viewers allowed (badge is informational)

    // 3. Parse query params
    const url = new URL(req.url);
    const rawParams: Record<string, string | undefined> = {};
    url.searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });
    const parsed = querySchema.safeParse(rawParams);
    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    // 4. Business logic — no rate limit, no plan gate (lightweight polling endpoint)
    const count = await getUnreadCount(ctx.currentTeamId, parsed.data.accountId);

    return Response.json({ count });
  } catch (error) {
    logger.error("inbox_unread_count_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to fetch unread count");
  }
}
