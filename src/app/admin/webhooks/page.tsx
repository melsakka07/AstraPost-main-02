import { desc } from "drizzle-orm";
import { Webhook } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { WebhookDLQTable } from "@/components/admin/webhook-dlq-table";
import { formatDateToLocaleString } from "@/lib/date-utils";
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
          <div className="mt-4 rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-2 text-left">Event ID</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Retries</th>
                  <th className="p-2 text-left">Error</th>
                </tr>
              </thead>
              <tbody>
                {recentFailures.map((e) => (
                  <tr key={e.id} className="border-b">
                    <td className="p-2 font-mono">{e.stripeEventId}</td>
                    <td className="p-2">{e.eventType}</td>
                    <td className="p-2">{e.retryCount}</td>
                    <td className="p-2 text-red-500">{e.errorMessage}</td>
                  </tr>
                ))}
                {recentFailures.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-muted-foreground p-4 text-center">
                      No recent failures
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Delivery Log (Last 100)</h2>
          <div className="mt-4 rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-2 text-left">Time</th>
                  <th className="p-2 text-left">Event ID</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {deliveryLogs.map((e) => (
                  <tr key={e.id} className="border-b">
                    <td className="p-2">{formatDateToLocaleString(e.processedAt)}</td>
                    <td className="p-2 font-mono">{e.stripeEventId}</td>
                    <td className="p-2">{e.eventType}</td>
                    <td className="p-2">
                      {e.status === "success" ? "✅" : "❌"} {e.status}
                    </td>
                  </tr>
                ))}
                {deliveryLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-muted-foreground p-4 text-center">
                      No logs
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
