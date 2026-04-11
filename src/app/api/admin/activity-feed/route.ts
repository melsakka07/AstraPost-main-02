import { desc, eq, and, sql, type SQL } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { adminAuditLog, user } from "@/lib/schema";

/**
 * GET /api/admin/activity-feed
 *
 * Returns paginated admin activity feed with recent actions.
 * Used for real-time activity monitoring in the admin dashboard.
 *
 * Query params:
 *   - limit: number (1-100, default 10)
 *   - offset: number (default 0)
 *   - action: string (optional filter by action type)
 */
export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Parse and validate query params
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "10")), 100);
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"));
    const action = searchParams.get("action") || undefined;

    // Build where clause with optional action filter
    const conditions: SQL<unknown>[] = [];
    if (action) {
      conditions.push(sql`${adminAuditLog.action} = ${action}`);
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch activities in parallel with total count
    const [activities, totalResult] = await Promise.all([
      db
        .select({
          id: adminAuditLog.id,
          adminId: adminAuditLog.adminId,
          action: adminAuditLog.action,
          targetType: adminAuditLog.targetType,
          targetId: adminAuditLog.targetId,
          details: adminAuditLog.details,
          createdAt: adminAuditLog.createdAt,
          adminName: user.name,
          adminEmail: user.email,
        })
        .from(adminAuditLog)
        .leftJoin(user, eq(adminAuditLog.adminId, user.id))
        .where(whereClause)
        .orderBy(desc(adminAuditLog.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(adminAuditLog)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.total ?? 0;

    return Response.json({
      data: activities,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[ACTIVITY_FEED] Error:", error);
    return ApiError.internal(errorMessage);
  }
}
