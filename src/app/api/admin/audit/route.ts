import { desc, and, gte, lte, eq, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { adminAuditLog, user } from "@/lib/schema";

// ── Zod schema ───────────────────────────────────────────────────────────────

const exportRequestSchema = z.object({
  action: z.enum(["export"]),
  filters: z
    .object({
      action: z.string().optional(),
      adminId: z.string().optional(),
      targetType: z.string().optional(),
      search: z.string().optional(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
    })
    .optional(),
});

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

// ── Helper: Generate CSV for audit logs ──────────────────────────────────────

function generateAuditCsv(
  rows: Array<{
    id: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    details: unknown;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    adminId: string;
  }>
): string {
  const headers = [
    "id",
    "adminId",
    "action",
    "targetType",
    "targetId",
    "details",
    "ipAddress",
    "userAgent",
    "createdAt",
  ];

  const csvRows = [
    headers.join(","),
    ...rows.map((row) => {
      const escapeQuotes = (str: string) => `"${str.replace(/"/g, '""')}"`;
      return [
        escapeQuotes(row.id),
        escapeQuotes(row.adminId),
        row.action,
        row.targetType ?? "",
        row.targetId ? escapeQuotes(row.targetId) : "",
        escapeQuotes(JSON.stringify(row.details ?? {})),
        row.ipAddress ? escapeQuotes(row.ipAddress) : "",
        row.userAgent ? escapeQuotes(row.userAgent) : "",
        row.createdAt.toISOString(),
      ].join(",");
    }),
  ];

  return csvRows.join("\n");
}

// ── GET /api/admin/audit ───────────────────────────────────────────────────────

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  const { searchParams } = new URL(request.url);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 25));
  const offset = (page - 1) * limit;

  const action = searchParams.get("action") || undefined;
  const adminId = searchParams.get("adminId") || undefined;
  const targetType = searchParams.get("targetType") || undefined;
  const search = searchParams.get("search") || undefined;
  const fromDate = searchParams.get("fromDate") || undefined;
  const toDate = searchParams.get("toDate") || undefined;

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
}

// ── POST /api/admin/audit ───────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  const body = await request.json().catch(() => null);
  if (!body) return ApiError.badRequest("Invalid JSON body");

  const parsed = exportRequestSchema.safeParse(body);
  if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

  if (parsed.data.action === "export") {
    return handleAuditExport(parsed.data.filters);
  }

  return ApiError.badRequest("Unknown action");
}

// ── Handler: Export audit logs ──────────────────────────────────────────────

async function handleAuditExport(filters?: {
  action?: string | undefined;
  adminId?: string | undefined;
  targetType?: string | undefined;
  search?: string | undefined;
  fromDate?: string | undefined;
  toDate?: string | undefined;
}): Promise<Response> {
  try {
    const whereClause = buildWhereClause(filters);

    // Fetch all audit logs matching filters (no pagination for export)
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
      })
      .from(adminAuditLog)
      .where(whereClause)
      .orderBy(desc(adminAuditLog.createdAt));

    const csv = generateAuditCsv(
      logs.map((row) => ({
        id: row.id,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        details: row.details,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
        adminId: row.adminId,
      }))
    );

    return Response.json({
      success: true,
      data: csv,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[AUDIT_EXPORT] Error:", error);
    return ApiError.internal(errorMessage);
  }
}
