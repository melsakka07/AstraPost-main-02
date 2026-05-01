import { desc } from "drizzle-orm";
import { Webhook } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { WebhookDeliveryLogTable } from "@/components/admin/webhook-delivery-log-table";
import { WebhookDLQTable } from "@/components/admin/webhook-dlq-table";
import { WebhookRecentFailuresTable } from "@/components/admin/webhook-recent-failures-table";
import { db } from "@/lib/db";
import { webhookDeadLetterQueue, webhookDeliveryLog, processedWebhookEvents } from "@/lib/schema";

export const metadata = { title: "Webhooks — Admin" };

export default async function AdminWebhooksPage() {
  // Fetch data
  const [dlqEntries, deliveryLogs, recentFailures] = await Promise.all([
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

  return (
    <AdminPageWrapper
      icon={Webhook}
      title="Webhooks"
      description="Stripe webhook status and dead-letter queue"
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Dead-Letter Queue</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Webhooks that failed after 5 retries. Click "Replay" to re-invoke the same handlers as
            the main webhook processor.
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
