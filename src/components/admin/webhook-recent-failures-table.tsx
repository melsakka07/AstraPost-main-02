interface RecentFailure {
  id: string;
  stripeEventId: string;
  eventType: string | null;
  retryCount: number;
  errorMessage: string | null;
}

interface WebhookRecentFailuresTableProps {
  entries: RecentFailure[];
}

export function WebhookRecentFailuresTable({ entries }: WebhookRecentFailuresTableProps) {
  return (
    <div className="mt-4 rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="p-2 text-start">Event ID</th>
            <th className="p-2 text-start">Type</th>
            <th className="p-2 text-start">Retries</th>
            <th className="p-2 text-start">Error</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b">
              <td className="p-2 font-mono">{e.stripeEventId}</td>
              <td className="p-2">{e.eventType}</td>
              <td className="p-2">{e.retryCount}</td>
              <td className="text-destructive p-2">{e.errorMessage}</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={4} className="text-muted-foreground p-4 text-center">
                No recent failures
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
