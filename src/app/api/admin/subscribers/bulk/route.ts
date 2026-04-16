import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { planChangeLog, session, user } from "@/lib/schema";

// ── Zod schema ───────────────────────────────────────────────────────────────

const bulkSubscriberSchema = z.object({
  userIds: z.string().array().min(1).max(100),
  action: z.enum(["ban", "unban", "changePlan", "delete", "export"]),
  details: z
    .object({
      plan: z.enum(["free", "pro_monthly", "pro_annual", "agency"]).optional(),
    })
    .optional(),
});

// ── Response type ───────────────────────────────────────────────────────────

interface BulkActionResponse {
  success: boolean;
  action: string;
  processed: number;
  skipped: number;
  errors: string[];
  data: string | null; // For export action: CSV string
}

// ── Helper: Generate CSV for export ──────────────────────────────────────────

function generateCsv(
  rows: Array<{
    id: string;
    name: string;
    email: string;
    plan: string;
    createdAt: Date;
    lastLogin: Date | null;
    bannedAt: Date | null;
  }>
): string {
  const headers = ["id", "name", "email", "plan", "createdAt", "lastLogin", "bannedAt"];
  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      [
        `"${row.id.replace(/"/g, '""')}"`,
        `"${row.name.replace(/"/g, '""')}"`,
        `"${row.email.replace(/"/g, '""')}"`,
        row.plan,
        row.createdAt.toISOString(),
        row.lastLogin?.toISOString() ?? "",
        row.bannedAt?.toISOString() ?? "",
      ].join(",")
    ),
  ];
  return csvRows.join("\n");
}

// ── POST /api/admin/subscribers/bulk ─────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  // Rate limit: destructive actions use "destructive", export uses "read"
  const rl = await checkAdminRateLimit("destructive");
  if (rl) return rl;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return ApiError.badRequest("Invalid JSON body");

    const parsed = bulkSubscriberSchema.safeParse(body);
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { userIds, action, details } = parsed.data;

    // Validate changePlan requires plan
    if (action === "changePlan" && !details?.plan) {
      return ApiError.badRequest("plan is required for changePlan action");
    }

    const response: BulkActionResponse = {
      success: true,
      action,
      processed: 0,
      skipped: 0,
      errors: [],
      data: null,
    };

    try {
      if (action === "ban") {
        const result = await handleBulkBan(userIds, auth.session.user.id);
        response.processed = result.processed;
        response.skipped = result.skipped;
        response.errors = result.errors;
      } else if (action === "unban") {
        const result = await handleBulkUnban(userIds, auth.session.user.id);
        response.processed = result.processed;
        response.skipped = result.skipped;
        response.errors = result.errors;
      } else if (action === "changePlan") {
        const result = await handleBulkChangePlan(userIds, details!.plan!, auth.session.user.id);
        response.processed = result.processed;
        response.skipped = result.skipped;
        response.errors = result.errors;
      } else if (action === "delete") {
        const result = await handleBulkDelete(userIds, auth.session.user.id);
        response.processed = result.processed;
        response.skipped = result.skipped;
        response.errors = result.errors;
      } else if (action === "export") {
        const result = await handleBulkExport(userIds);
        response.processed = result.rows.length;
        response.skipped = userIds.length - result.rows.length;
        response.data = result.csv;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      response.errors.push(errorMessage);
      logger.error("[BULK_SUBSCRIBERS] Error", { error });
    }

    return Response.json(response);
  } catch (err) {
    logger.error("[BULK_SUBSCRIBERS] Error", { error: err });
    return ApiError.internal("Failed to perform bulk action");
  }
}

// ── Result type ─────────────────────────────────────────────────────────────

interface BulkOperationResult {
  processed: number;
  skipped: number;
  errors: string[];
}

// ── Handler: Bulk Ban ────────────────────────────────────────────────────────

async function handleBulkBan(userIds: string[], adminId: string): Promise<BulkOperationResult> {
  const result: BulkOperationResult = { processed: 0, skipped: 0, errors: [] };

  // Fetch all users to check status
  const existingUsers = await db
    .select({ id: user.id, bannedAt: user.bannedAt, deletedAt: user.deletedAt })
    .from(user)
    .where(inArray(user.id, userIds));

  const userMap = new Map(existingUsers.map((u) => [u.id, u]));
  const toBan: string[] = [];

  for (const userId of userIds) {
    const existing = userMap.get(userId);
    if (!existing) {
      result.errors.push(`User ${userId} not found`);
      result.skipped += 1;
    } else if (existing.deletedAt) {
      result.errors.push(`User ${userId} is deleted (cannot ban)`);
      result.skipped += 1;
    } else if (existing.bannedAt) {
      result.errors.push(`User ${userId} is already banned`);
      result.skipped += 1;
    } else {
      toBan.push(userId);
    }
  }

  if (toBan.length > 0) {
    try {
      await db.transaction(async (tx) => {
        const timestamp = new Date();

        // Ban all users: set bannedAt + suspend + invalidate sessions
        await tx
          .update(user)
          .set({ bannedAt: timestamp, isSuspended: true })
          .where(inArray(user.id, toBan));

        // Delete sessions for all banned users
        await tx.delete(session).where(inArray(session.userId, toBan));
      });

      result.processed = toBan.length;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Transaction failed";
      result.errors.push(`Ban transaction failed: ${msg}`);
      result.processed = 0; // Rollback means no users were banned
    }
  }

  // Log single audit entry for bulk operation
  if (result.processed > 0) {
    logAdminAction({
      adminId,
      action: "bulk_operation",
      targetType: "user",
      details: {
        bulkAction: "ban",
        count: result.processed,
        userIds: toBan,
      },
    });
  }

  return result;
}

// ── Handler: Bulk Unban ──────────────────────────────────────────────────────

async function handleBulkUnban(userIds: string[], adminId: string): Promise<BulkOperationResult> {
  const result: BulkOperationResult = { processed: 0, skipped: 0, errors: [] };

  // Fetch all users to check status
  const existingUsers = await db
    .select({ id: user.id, bannedAt: user.bannedAt, deletedAt: user.deletedAt })
    .from(user)
    .where(inArray(user.id, userIds));

  const userMap = new Map(existingUsers.map((u) => [u.id, u]));
  const toUnban: string[] = [];

  for (const userId of userIds) {
    const existing = userMap.get(userId);
    if (!existing) {
      result.errors.push(`User ${userId} not found`);
      result.skipped += 1;
    } else if (existing.deletedAt) {
      result.errors.push(`User ${userId} is deleted (cannot unban)`);
      result.skipped += 1;
    } else if (!existing.bannedAt) {
      result.errors.push(`User ${userId} is not banned`);
      result.skipped += 1;
    } else {
      toUnban.push(userId);
    }
  }

  if (toUnban.length > 0) {
    try {
      await db.transaction(async (tx) => {
        await tx
          .update(user)
          .set({ bannedAt: null, isSuspended: false })
          .where(inArray(user.id, toUnban));
      });

      result.processed = toUnban.length;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Transaction failed";
      result.errors.push(`Unban transaction failed: ${msg}`);
      result.processed = 0;
    }
  }

  if (result.processed > 0) {
    logAdminAction({
      adminId,
      action: "bulk_operation",
      targetType: "user",
      details: {
        bulkAction: "unban",
        count: result.processed,
        userIds: toUnban,
      },
    });
  }

  return result;
}

// ── Handler: Bulk Change Plan ────────────────────────────────────────────────

async function handleBulkChangePlan(
  userIds: string[],
  newPlan: "free" | "pro_monthly" | "pro_annual" | "agency",
  adminId: string
): Promise<BulkOperationResult> {
  const result: BulkOperationResult = { processed: 0, skipped: 0, errors: [] };

  // Fetch all users to check status
  const existingUsers = await db
    .select({ id: user.id, plan: user.plan, deletedAt: user.deletedAt })
    .from(user)
    .where(inArray(user.id, userIds));

  const userMap = new Map(existingUsers.map((u) => [u.id, u]));
  const toChangePlan: Array<{ userId: string; oldPlan: typeof user.$inferSelect.plan }> = [];

  for (const userId of userIds) {
    const existing = userMap.get(userId);
    if (!existing) {
      result.errors.push(`User ${userId} not found`);
      result.skipped += 1;
    } else if (existing.deletedAt) {
      result.errors.push(`User ${userId} is deleted (cannot change plan)`);
      result.skipped += 1;
    } else if (existing.plan === newPlan) {
      result.errors.push(`User ${userId} already has plan ${newPlan}`);
      result.skipped += 1;
    } else {
      toChangePlan.push({ userId, oldPlan: existing.plan });
    }
  }

  if (toChangePlan.length > 0) {
    try {
      await db.transaction(async (tx) => {
        const userIdsToUpdate = toChangePlan.map((x) => x.userId);

        // Update user plan
        await tx.update(user).set({ plan: newPlan }).where(inArray(user.id, userIdsToUpdate));

        // Log plan changes
        await tx.insert(planChangeLog).values(
          toChangePlan.map((x) => ({
            id: crypto.randomUUID(),
            userId: x.userId,
            oldPlan: x.oldPlan,
            newPlan,
            reason: "admin",
          }))
        );
      });

      result.processed = toChangePlan.length;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Transaction failed";
      result.errors.push(`Plan change transaction failed: ${msg}`);
      result.processed = 0;
    }
  }

  if (result.processed > 0) {
    logAdminAction({
      adminId,
      action: "bulk_operation",
      targetType: "user",
      details: {
        bulkAction: "changePlan",
        newPlan,
        count: result.processed,
        userIds: toChangePlan.map((x) => x.userId),
      },
    });
  }

  return result;
}

// ── Handler: Bulk Delete ─────────────────────────────────────────────────────

async function handleBulkDelete(userIds: string[], adminId: string): Promise<BulkOperationResult> {
  const result: BulkOperationResult = { processed: 0, skipped: 0, errors: [] };

  // Fetch all users to check status
  const existingUsers = await db
    .select({ id: user.id, deletedAt: user.deletedAt })
    .from(user)
    .where(inArray(user.id, userIds));

  const userMap = new Map(existingUsers.map((u) => [u.id, u]));
  const toDelete: string[] = [];

  for (const userId of userIds) {
    if (userId === adminId) {
      result.errors.push(`Cannot delete your own account (${userId})`);
      result.skipped += 1;
    } else {
      const existing = userMap.get(userId);
      if (!existing) {
        result.errors.push(`User ${userId} not found`);
        result.skipped += 1;
      } else if (existing.deletedAt) {
        result.errors.push(`User ${userId} is already deleted`);
        result.skipped += 1;
      } else {
        toDelete.push(userId);
      }
    }
  }

  if (toDelete.length > 0) {
    try {
      await db.transaction(async (tx) => {
        const timestamp = new Date();

        // Soft-delete + anonymise PII
        await tx
          .update(user)
          .set({
            deletedAt: timestamp,
            email: user.id, // Will be overwritten in individual updates for safety
            name: "Deleted User",
            image: null,
            isSuspended: true,
          })
          .where(inArray(user.id, toDelete));

        // Now update email individually to use the user's ID
        for (const userId of toDelete) {
          const anonymisedEmail = `deleted_${userId}@removed.invalid`;
          await tx.update(user).set({ email: anonymisedEmail }).where(eq(user.id, userId));
        }

        // Invalidate all sessions
        await tx.delete(session).where(inArray(session.userId, toDelete));
      });

      result.processed = toDelete.length;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Transaction failed";
      result.errors.push(`Delete transaction failed: ${msg}`);
      result.processed = 0;
    }
  }

  if (result.processed > 0) {
    logAdminAction({
      adminId,
      action: "bulk_operation",
      targetType: "user",
      details: {
        bulkAction: "delete",
        count: result.processed,
        userIds: toDelete,
      },
    });
  }

  return result;
}

// ── Handler: Bulk Export ─────────────────────────────────────────────────────

interface ExportResult {
  rows: Array<{
    id: string;
    name: string;
    email: string;
    plan: string;
    createdAt: Date;
    lastLogin: Date | null;
    bannedAt: Date | null;
  }>;
  csv: string;
}

async function handleBulkExport(userIds: string[]): Promise<ExportResult> {
  // Fetch all requested users (including deleted)
  const existingUsers = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      createdAt: user.createdAt,
      lastLogin: user.updatedAt, // Using updatedAt as lastLogin proxy
      bannedAt: user.bannedAt,
    })
    .from(user)
    .where(inArray(user.id, userIds));

  const userMap = new Map(
    existingUsers.map((u) => [
      u.id,
      {
        id: u.id,
        name: u.name,
        email: u.email,
        plan: u.plan ?? "free",
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        bannedAt: u.bannedAt,
      },
    ])
  );
  const rows = userIds
    .map((userId) => userMap.get(userId))
    .filter((u): u is NonNullable<typeof u> => u !== undefined);

  const csv = generateCsv(rows);

  return { rows, csv };
}
