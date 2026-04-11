import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { adminAuditLog } from "@/lib/schema";
import type { adminAuditActionEnum } from "@/lib/schema";

export type AdminAuditAction = (typeof adminAuditActionEnum.enumValues)[number];

interface LogAdminActionInput {
  adminId: string;
  action: AdminAuditAction;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
}

/**
 * Records an admin action in the audit log.
 *
 * This is fire-and-forget — errors are logged but never thrown so that
 * a failing audit write does not break the primary admin operation.
 * IP and User-Agent are extracted from the current request headers.
 */
export async function logAdminAction(input: LogAdminActionInput): Promise<void> {
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? null;
    const ua = headersList.get("user-agent") ?? null;

    await db.insert(adminAuditLog).values({
      id: nanoid(),
      adminId: input.adminId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      details: input.details,
      ipAddress: ip,
      userAgent: ua,
    });
  } catch (error) {
    // Never let audit logging break the primary operation
    console.error("[ADMIN_AUDIT] Failed to log action:", error);
  }
}
