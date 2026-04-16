import { desc, eq } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { subscriptions, user } from "@/lib/schema";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    // Fetch all subscription records (limit to last 10k for performance)
    const rows = await db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        userName: user.name,
        userEmail: user.email,
        plan: subscriptions.plan,
        status: subscriptions.status,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        stripePriceId: subscriptions.stripePriceId,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        cancelledAt: subscriptions.cancelledAt,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
      })
      .from(subscriptions)
      .leftJoin(user, eq(subscriptions.userId, user.id))
      .orderBy(desc(subscriptions.updatedAt))
      .limit(10000);

    // Convert to CSV
    const headers = [
      "ID",
      "User ID",
      "Name",
      "Email",
      "Plan",
      "Status",
      "Stripe Subscription ID",
      "Stripe Price ID",
      "Current Period Start",
      "Current Period End",
      "Cancel At Period End",
      "Cancelled At",
      "Created At",
      "Updated At",
    ];

    const csvRows = rows.map((row) => [
      escapeCSV(row.id),
      escapeCSV(row.userId),
      escapeCSV(row.userName || ""),
      escapeCSV(row.userEmail || ""),
      escapeCSV(row.plan || ""),
      escapeCSV(row.status || ""),
      escapeCSV(row.stripeSubscriptionId || ""),
      escapeCSV(row.stripePriceId || ""),
      formatDate(row.currentPeriodStart),
      formatDate(row.currentPeriodEnd),
      row.cancelAtPeriodEnd ? "Yes" : "No",
      formatDate(row.cancelledAt),
      formatDate(row.createdAt),
      formatDate(row.updatedAt),
    ]);

    const csvContent = [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": "attachment;filename=transactions.csv",
      },
    });
  } catch (err) {
    logger.error("[billing/transactions/export] Error", { error: err });
    return ApiError.internal("Failed to export transactions");
  }
}

function escapeCSV(value: string): string {
  if (!value) return '""';
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "";
  const isoString = new Date(date).toISOString();
  return isoString.split("T")[0] ?? "";
}
