import { desc, and, gte, lte, eq, sql, type SQLWrapper } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { adminAuditLog, user } from "@/lib/schema";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApi();
    if (!auth.ok) return auth.response;

    const rl = await checkAdminRateLimit("read");
    if (rl) return rl;

    const { searchParams } = new URL(request.url);

    const action = searchParams.get("action") || undefined;
    const adminId = searchParams.get("adminId") || undefined;
    const targetType = searchParams.get("targetType") || undefined;
    const search = searchParams.get("search") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;

    // Build where clause
    const conditions: SQLWrapper[] = [];

    if (action) {
      conditions.push(sql`${adminAuditLog.action} = ${action}`);
    }

    if (adminId) {
      conditions.push(sql`${adminAuditLog.adminId} = ${adminId}`);
    }

    if (targetType) {
      conditions.push(sql`${adminAuditLog.targetType} = ${targetType}`);
    }

    if (search) {
      const safeSearch = search.replace(/[%_\\]/g, "\\$&");
      conditions.push(sql`${adminAuditLog.targetId} ILIKE ${`%${safeSearch}%`}`);
    }

    if (fromDate) {
      conditions.push(gte(adminAuditLog.createdAt, new Date(fromDate)));
    }

    if (toDate) {
      conditions.push(lte(adminAuditLog.createdAt, new Date(toDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch all matching audit logs (limit to 10k for performance)
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
      .limit(10000);

    // Convert to CSV
    const headers = [
      "ID",
      "Timestamp",
      "Admin Name",
      "Admin Email",
      "Admin ID",
      "Action",
      "Target Type",
      "Target ID",
      "Details",
      "IP Address",
      "User Agent",
    ];

    const csvRows = logs.map((log) => [
      escapeCSV(log.id),
      formatDate(log.createdAt),
      escapeCSV(log.adminName || ""),
      escapeCSV(log.adminEmail || ""),
      escapeCSV(log.adminId),
      escapeCSV(log.action),
      escapeCSV(log.targetType || ""),
      escapeCSV(log.targetId || ""),
      escapeCSV(JSON.stringify(log.details || {})),
      escapeCSV(log.ipAddress || ""),
      escapeCSV(log.userAgent || ""),
    ]);

    const csvContent = [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": "attachment;filename=audit-log.csv",
      },
    });
  } catch (err) {
    console.error("[audit/export] Error:", err);
    return ApiError.internal("Failed to export audit log");
  }
}

function escapeCSV(value: string): string {
  if (!value) return '""';
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString();
}
