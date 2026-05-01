import { formatDateToLocaleString } from "@/lib/date-utils";

interface DeliveryLogEntry {
  id: string;
  stripeEventId: string;
  eventType: string | null;
  status: string;
  processedAt: Date;
}

interface WebhookDeliveryLogTableProps {
  entries: DeliveryLogEntry[];
}

export function WebhookDeliveryLogTable({ entries }: WebhookDeliveryLogTableProps) {
  return (
    <div className="mt-4 rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="p-2 text-start">Time</th>
            <th className="p-2 text-start">Event ID</th>
            <th className="p-2 text-start">Type</th>
            <th className="p-2 text-start">Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b">
              <td className="p-2">{formatDateToLocaleString(e.processedAt)}</td>
              <td className="p-2 font-mono">{e.stripeEventId}</td>
              <td className="p-2">{e.eventType}</td>
              <td className="p-2">
                {e.status === "success" ? "✅" : "❌"} {e.status}
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={4} className="text-muted-foreground p-4 text-center">
                No logs
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
