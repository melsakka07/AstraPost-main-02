import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { subscriptions, user } from "@/lib/schema";

// ── Zod schema ───────────────────────────────────────────────────────────────

const exportRequestSchema = z.object({
  action: z.enum(["export"]),
});

// ── Helper: Generate CSV for transactions ────────────────────────────────────

function generateTransactionsCsv(
  rows: Array<{
    id: string;
    userId: string;
    stripeSubscriptionId: string;
    status: string;
    plan: string;
    stripePriceId: string | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    createdAt: Date;
    updatedAt: Date | null;
  }>
): string {
  const headers = [
    "id",
    "userId",
    "stripeSubscriptionId",
    "status",
    "plan",
    "stripePriceId",
    "currentPeriodStart",
    "currentPeriodEnd",
    "createdAt",
    "updatedAt",
  ];

  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      [
        `"${row.id.replace(/"/g, '""')}"`,
        `"${row.userId.replace(/"/g, '""')}"`,
        `"${row.stripeSubscriptionId.replace(/"/g, '""')}"`,
        row.status,
        row.plan,
        row.stripePriceId ? `"${row.stripePriceId.replace(/"/g, '""')}"` : "",
        row.currentPeriodStart?.toISOString() ?? "",
        row.currentPeriodEnd?.toISOString() ?? "",
        row.createdAt.toISOString(),
        row.updatedAt?.toISOString() ?? "",
      ].join(",")
    ),
  ];

  return csvRows.join("\n");
}

// ── GET /api/admin/billing/transactions ────────────────────────────────────

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    // Last 20 subscription records, newest first, with subscriber name/email
    const rows = await db
      .select({
        id: subscriptions.id,
        plan: subscriptions.plan,
        status: subscriptions.status,
        stripePriceId: subscriptions.stripePriceId,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        cancelledAt: subscriptions.cancelledAt,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
        userId: subscriptions.userId,
        userName: user.name,
        userEmail: user.email,
      })
      .from(subscriptions)
      .leftJoin(user, eq(subscriptions.userId, user.id))
      .orderBy(desc(subscriptions.updatedAt))
      .limit(20);

    return Response.json({ data: rows });
  } catch (err) {
    console.error("[billing/transactions] Error:", err);
    return ApiError.internal("Failed to load transactions");
  }
}

// ── POST /api/admin/billing/transactions ───────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    const body = await request.json().catch(() => null);
    if (!body) return ApiError.badRequest("Invalid JSON body");

    const parsed = exportRequestSchema.safeParse(body);
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    if (parsed.data.action === "export") {
      return handleTransactionExport();
    }

    return ApiError.badRequest("Unknown action");
  } catch (err) {
    console.error("[billing/transactions] Error:", err);
    return ApiError.internal("Failed to process transaction request");
  }
}

// ── Handler: Export all transactions ───────────────────────────────────────

async function handleTransactionExport(): Promise<Response> {
  try {
    // Fetch all subscription records (no pagination for export)
    const rows = await db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        status: subscriptions.status,
        plan: subscriptions.plan,
        stripePriceId: subscriptions.stripePriceId,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
      })
      .from(subscriptions)
      .orderBy(desc(subscriptions.updatedAt));

    const csv = generateTransactionsCsv(rows);

    return Response.json({
      success: true,
      data: csv,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[TRANSACTIONS_EXPORT] Error:", error);
    return ApiError.internal(errorMessage);
  }
}
