"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import type { webhookDeadLetterQueue } from "@/lib/schema";

type WebhookDLQEntry = typeof webhookDeadLetterQueue.$inferSelect;

interface WebhookDLQTableProps {
  entries: WebhookDLQEntry[];
  onReplayComplete?: () => void;
}

export function WebhookDLQTable({ entries, onReplayComplete }: WebhookDLQTableProps) {
  const [replaying, setReplaying] = useState<string | null>(null);
  const [replayResults, setReplayResults] = useState<Record<string, string>>({});

  const handleReplay = async (eventId: string) => {
    setReplaying(eventId);
    try {
      const response = await fetch("/api/admin/webhooks/replay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripeEventId: eventId }),
      });

      if (response.ok) {
        const result = await response.json();
        setReplayResults((prev) => ({
          ...prev,
          [eventId]: `✅ Success: ${result.message}`,
        }));
        logger.info("webhook_replay_success_ui", {
          eventId,
          eventType: result.eventType,
        });
        onReplayComplete?.();
      } else {
        const error = await response.json();
        setReplayResults((prev) => ({
          ...prev,
          [eventId]: `❌ Failed: ${error.error || "Unknown error"}`,
        }));
        logger.error("webhook_replay_failed_ui", {
          eventId,
          error: error.error,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      setReplayResults((prev) => ({
        ...prev,
        [eventId]: `❌ Error: ${message}`,
      }));
      logger.error("webhook_replay_error_ui", {
        eventId,
        error: message,
      });
    } finally {
      setReplaying(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="p-2 text-left">Event ID</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Error</th>
              <th className="p-2 text-left">Failures</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b">
                <td className="p-2 font-mono text-xs">{e.stripeEventId}</td>
                <td className="p-2">{e.eventType}</td>
                <td className="p-2 text-xs text-red-500">{e.errorMessage?.substring(0, 100)}</td>
                <td className="p-2">{e.failureCount}</td>
                <td className="p-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReplay(e.stripeEventId)}
                    disabled={replaying === e.stripeEventId}
                    className="text-xs"
                  >
                    {replaying === e.stripeEventId ? "Replaying..." : "Replay"}
                  </Button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted-foreground p-4 text-center">
                  No DLQ entries
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {Object.entries(replayResults).length > 0 && (
        <div className="bg-muted space-y-2 rounded-md p-3">
          <p className="text-sm font-semibold">Replay Results:</p>
          {Object.entries(replayResults).map(([eventId, result]) => (
            <div key={eventId} className="font-mono text-xs">
              {eventId}: {result}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
