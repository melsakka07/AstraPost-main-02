import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { inboxItems } from "@/lib/schema";
import { bulkMarkAsRead, bulkArchiveItems } from "@/lib/services/inbox";
import { getTeamContext } from "@/lib/team-context";

// ── PATCH /api/inbox/bulk — Bulk mark-read or archive

const bulkSchema = z
  .object({
    ids: z.array(z.string()).optional(),
    all: z.boolean().optional(),
    action: z.enum(["read", "archive"]),
  })
  .refine((data) => data.ids || data.all, {
    message: "Either 'ids' or 'all' must be provided",
  });

export async function PATCH(req: Request) {
  try {
    // 1. Auth
    const ctx = await getTeamContext();
    if (!ctx) {
      return ApiError.unauthorized();
    }

    // 2. Role check — viewers cannot mutate
    if (ctx.role === "viewer") {
      return ApiError.forbidden("Viewers cannot perform bulk actions");
    }

    // 3. Parse + validate body
    const json = await req.json();
    const parsed = bulkSchema.safeParse(json);
    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    const { ids, all, action } = parsed.data;

    // 4. Business logic — no rate limit, no plan gate (free-tier feature)

    if (all) {
      // "All" — operate on all unread (for read action) or all non-archived items
      if (action === "read") {
        const unreadItems = await db.query.inboxItems.findMany({
          where: and(eq(inboxItems.userId, ctx.currentTeamId), eq(inboxItems.isRead, false)),
          columns: { id: true },
        });
        const allIds = unreadItems.map((item) => item.id);
        await bulkMarkAsRead(allIds, ctx.currentTeamId);
        return Response.json({ updated: allIds.length });
      } else {
        // archive all
        const nonArchivedItems = await db.query.inboxItems.findMany({
          where: and(eq(inboxItems.userId, ctx.currentTeamId), eq(inboxItems.isArchived, false)),
          columns: { id: true },
        });
        const allIds = nonArchivedItems.map((item) => item.id);
        await bulkArchiveItems(allIds, ctx.currentTeamId);
        return Response.json({ updated: allIds.length });
      }
    }

    // Specific IDs
    if (ids && ids.length > 0) {
      if (action === "read") {
        await bulkMarkAsRead(ids, ctx.currentTeamId);
      } else {
        await bulkArchiveItems(ids, ctx.currentTeamId);
      }
      return Response.json({ updated: ids.length });
    }

    return Response.json({ updated: 0 });
  } catch (error) {
    logger.error("inbox_bulk_action_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiError.internal("Failed to perform bulk action");
  }
}
