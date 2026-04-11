"use client";

import { FileDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface BulkActionToolbarProps {
  selectedCount: number;
  loading: boolean;
  onClearSelection: () => void;
  onBan: () => void;
  onUnban: () => void;
  onChangePlan: () => void;
  onDelete: () => void;
  onExport: () => void;
  hasBannedUsers: boolean;
}

export function BulkActionToolbar({
  selectedCount,
  loading,
  onClearSelection,
  onBan,
  onUnban,
  onChangePlan,
  onDelete,
  onExport,
  hasBannedUsers,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-muted/50 border-primary/20 rounded-lg border px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {loading && <Spinner className="h-4 w-4" />}
          <span className="text-sm font-medium">
            {selectedCount} selected
            {loading && <span className="text-muted-foreground ml-1">(processing…)</span>}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBan}
            disabled={loading}
            className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
          >
            Ban
          </Button>

          {hasBannedUsers && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUnban}
              disabled={loading}
              className="text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
            >
              Unban
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={onChangePlan} disabled={loading}>
            Change Plan
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={loading}
            className="text-destructive hover:bg-destructive/10"
          >
            Delete
          </Button>

          <Button variant="outline" size="sm" onClick={onExport} disabled={loading}>
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear selection</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
