import { desc } from "drizzle-orm";
import { Webhook } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { WebhookDeliveryLogTable } from "@/components/admin/webhook-delivery-log-table";
import { WebhookDLQTable } from "@/components/admin/webhook-dlq-table";
import { WebhookRecentFailuresTable } from "@/components/admin/webhook-recent-failures-table";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { webhookDeadLetterQueue, webhookDeliveryLog, processedWebhookEvents } from "@/lib/schema";

export const metadata = { title: "Webhooks — Admin" };

export default async function AdminWebhooksPage() {
  await requireAdmin();
  const t = await getTranslations("admin");

  // Fetch data with error handling — any single query failure returns empty
  // arrays instead of crashing the whole page.
  let dlqEntries: Awaited<ReturnType<typeof db.query.webhookDeadLetterQueue.findMany>> = [];
  let deliveryLogs: Awaited<ReturnType<typeof db.query.webhookDeliveryLog.findMany>> = [];
  let recentFailures: Awaited<ReturnType<typeof db.query.processedWebhookEvents.findMany>> = [];

  try {
    [dlqEntries, deliveryLogs, recentFailures] = await Promise.all([
      db.query.webhookDeadLetterQueue.findMany({
        orderBy: [desc(webhookDeadLetterQueue.movedToDlqAt)],
        limit: 50,
      }),
      db.query.webhookDeliveryLog.findMany({
        orderBy: [desc(webhookDeliveryLog.processedAt)],
        limit: 100,
      }),
      db.query.processedWebhookEvents.findMany({
        where: (table, { gt }) => gt(table.retryCount, 0),
        orderBy: [desc(processedWebhookEvents.processedAt)],
        limit: 20,
      }),
    ]);
  } catch {
    // All three arrays stay as [] — page renders with empty tables
  }

  return (
    <AdminPageWrapper
      icon={Webhook}
      title={t("pages.webhooks.title")}
      description={t("pages.webhooks.description")}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Dead-Letter Queue</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Webhooks that failed after 5 retries. Click &ldquo;Replay&rdquo; to re-invoke the same
            handlers as the main webhook processor.
          </p>
          <WebhookDLQTable entries={dlqEntries} />
        </div>

        <div>
          <h2 className="text-lg font-semibold">Recent Failures (1-4 retries)</h2>
          <WebhookRecentFailuresTable entries={recentFailures} />
        </div>

        <div>
          <h2 className="text-lg font-semibold">Delivery Log (Last 100)</h2>
          <WebhookDeliveryLogTable entries={deliveryLogs} />
        </div>
      </div>
    </AdminPageWrapper>
  );
}
