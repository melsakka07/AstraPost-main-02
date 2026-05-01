import { desc, and, gte, lte, eq, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { adminAuditLog, user } from "@/lib/schema";

// ── Helper: Build where clause from filters ──────────────────────────────────

function buildWhereClause(filters?: {
  action?: string | undefined;
  adminId?: string | undefined;
  targetType?: string | undefined;
  search?: string | undefined;
  fromDate?: string | undefined;
  toDate?: string | undefined;
}): SQL<unknown> | undefined {
  const conditions: SQL<unknown>[] = [];

  if (filters?.action) {
    conditions.push(sql`${adminAuditLog.action} = ${filters.action}`);
  }

  if (filters?.adminId) {
    conditions.push(sql`${adminAuditLog.adminId} = ${filters.adminId}`);
  }

  if (filters?.targetType) {
    conditions.push(sql`${adminAuditLog.targetType} = ${filters.targetType}`);
  }

  if (filters?.search) {
    conditions.push(sql`${adminAuditLog.targetId} ILIKE ${`%${filters.search}%`}`);
  }

  if (filters?.fromDate) {
    conditions.push(gte(adminAuditLog.createdAt, new Date(filters.fromDate)));
  }

  if (filters?.toDate) {
    conditions.push(lte(adminAuditLog.createdAt, new Date(filters.toDate)));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

// ── GET /api/admin/audit ───────────────────────────────────────────────────────

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  const { searchParams } = new URL(request.url);

  const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    action: z.string().optional(),
    adminId: z.string().optional(),
    targetType: z.string().optional(),
    search: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  });

  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

  const { page, limit, action, adminId, targetType, search, fromDate, toDate } = parsed.data;
  const offset = (page - 1) * limit;

  try {
    const whereClause = buildWhereClause({
      action,
      adminId,
      targetType,
      search,
      fromDate,
      toDate,
    });

    // Get total count for pagination
    const countResult = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(adminAuditLog)
      .where(whereClause);

    const totalCount = countResult[0]?.value ?? 0;

    // Fetch audit logs with admin details
    const logs = await db
      .select({
        id: adminAuditLog.id,
        action: adminAuditLog.action,
        targetType: adminAuditLog.targetType,
        targetId: adminAuditLog.targetId,
        details: adminAuditLog.details,
        ipAddress: adminAuditLog.ipAddress,
        userAgent: adminAuditLog.userAgent,
        createdAt: adminAuditLog.createdAt,
        adminId: adminAuditLog.adminId,
        adminName: user.name,
        adminEmail: user.email,
      })
      .from(adminAuditLog)
      .leftJoin(user, eq(adminAuditLog.adminId, user.id))
      .where(whereClause)
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(totalCount / limit);

    return Response.json({
      data: logs,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages,
      },
    });
  } catch (err) {
    logger.error("[admin/audit] Error", { error: err });
    return ApiError.internal("Failed to fetch audit logs");
  }
}
