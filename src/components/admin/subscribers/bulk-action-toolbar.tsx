"use client";

import { FileDown, X } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations();
  if (selectedCount === 0) return null;

  return (
    <div className="bg-muted/50 border-primary/20 rounded-lg border px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {loading && <Spinner className="h-4 w-4" />}
          <span className="text-sm font-medium">
            {t("admin.subscribers.bulk.selected", { N: selectedCount })}
            {loading && (
              <span className="text-muted-foreground ms-1">
                {t("admin.subscribers.bulk.processing")}
              </span>
            )}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBan}
            disabled={loading}
            className="text-warning-11 hover:bg-warning-3"
          >
            {t("admin.subscribers.ban")}
          </Button>

          {hasBannedUsers && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUnban}
              disabled={loading}
              className="text-success-11 hover:bg-success-3"
            >
              {t("admin.subscribers.unban")}
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={onChangePlan} disabled={loading}>
            {t("admin.subscribers.bulk.changePlanButton")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={loading}
            className="text-destructive hover:bg-destructive/10"
          >
            {t("admin.common.delete")}
          </Button>

          <Button variant="outline" size="sm" onClick={onExport} disabled={loading}>
            <FileDown className="me-2 h-4 w-4" />
            {t("admin.subscribers.bulk.export")}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{t("admin.subscribers.bulk.clearSelection")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
