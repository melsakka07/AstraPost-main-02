"use client";

import { useCallback, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { clientLogger } from "@/lib/client-logger";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface InboxBulkActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  /** Called after successful bulk action to refresh the list */
  onActionComplete?: () => void;
}

/**
 * Bulk action bar — appears when one or more inbox items are selected.
 * Supports "Mark read" and "Archive" bulk operations via PATCH /api/inbox/bulk.
 */
export function InboxBulkActions({
  selectedIds,
  onClearSelection,
  onActionComplete,
}: InboxBulkActionsProps) {
  const t = useTranslations("inbox");
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const isBusy = isMarkingRead || isArchiving;

  const handleAction = useCallback(
    async (action: "read" | "archive") => {
      const setLoading = action === "read" ? setIsMarkingRead : setIsArchiving;
      setLoading(true);
      try {
        const res = await fetchWithAuth("/api/inbox/bulk", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds, action }),
        });
        if (!res.ok) {
          throw new Error(`Bulk ${action} failed: ${res.status}`);
        }
        onClearSelection();
        onActionComplete?.();
      } catch (error) {
        clientLogger.error("inbox_bulk_action_failed", {
          action,
          count: selectedIds.length,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setLoading(false);
      }
    },
    [selectedIds, onClearSelection, onActionComplete]
  );

  if (selectedIds.length === 0) return null;

  return (
    <div className="bg-muted/50 border-border flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      <span className="text-muted-foreground font-medium">
        {t("bulk.selected", { count: selectedIds.length })}
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={isBusy}
        onClick={() => handleAction("read")}
        className="h-8 text-xs"
      >
        {isMarkingRead ? "..." : t("bulk.markRead")}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={isBusy}
        onClick={() => handleAction("archive")}
        className="h-8 text-xs"
      >
        {isArchiving ? "..." : t("bulk.archiveSelected")}
      </Button>
      <button
        type="button"
        onClick={onClearSelection}
        disabled={isBusy}
        className="text-muted-foreground hover:text-foreground ms-auto inline-flex items-center gap-1 text-xs transition-colors"
        aria-label={t("bulk.clearSelection")}
      >
        <X className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("bulk.clearSelection")}</span>
      </button>
    </div>
  );
}
